import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { usageCost, tallySessions, toolCalls, finalResult, buildRecord } from './build-record.mjs';

const line = (object) => JSON.stringify(object);
const use = (id, name, input) => line({ message: { content: [{ type: 'tool_use', id, name, input }] } });
const done = (id, isError = false) => line({ message: { content: [{ type: 'tool_result', tool_use_id: id, is_error: isError, content: 'ok' }] } });

test('usageCost prices each token class', () => {
  const dollars = usageCost(
    { input_tokens: 1e6, output_tokens: 1e6, cache_read_input_tokens: 1e6, cache_creation_input_tokens: 1e6 },
    'claude-sonnet-5-5',
  );
  assert.ok(Math.abs(dollars - (3 + 15 + 0.3 + 3.75)) < 1e-9);
  assert.equal(usageCost({ output_tokens: 1e6 }, 'claude-haiku-5-5'), 5);
});

test('tallySessions counts a repeated message once and skips junk lines', () => {
  const message = { message: { id: 'm1', model: 'sonnet', usage: { output_tokens: 1000 } } };
  const text = [line(message), line(message), 'not json', '{broken'].join('\n');
  const tally = tallySessions(text);
  assert.equal(tally.messages, 1);
  assert.equal(tally.tokens.output, 1000);
});

test('toolCalls joins a call to its result', () => {
  const calls = toolCalls([use('a', 'Bash', { command: 'ls' }), done('a', true), use('b', 'Read', {})].join('\n'));
  assert.equal(calls[0].isError, true);
  assert.equal(calls[1].isError, null);
});

test('finalResult reads the last result line', () => {
  const text = line({ type: 'result', subtype: 'success', is_error: false, total_cost_usd: 1.5, num_turns: 9 });
  assert.equal(finalResult(text).costUsd, 1.5);
  assert.equal(finalResult('nothing here'), null);
});

function workDir(files) {
  const dir = mkdtempSync(join(tmpdir(), 'c1-record-'));
  for (const [path, content] of Object.entries(files)) {
    const full = join(dir, path);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, content);
  }
  return dir;
}

test('the toolkit build record needs the builder and a finished nested eval, and labels create-only', () => {
  const dir = workDir({
    'skills/x/SKILL.md': 'x',
    'evals/results/1/aggregate-result.json': line({ costUsd: 2 }),
  });
  try {
    const stream = [use('a', 'Skill', { skill: 'askit-build-skill', args: 'create' }), done('a')].join('\n');
    const record = buildRecord({ arm: 'toolkit', streamText: stream, workDir: dir, skillName: 'x' });
    assert.equal(record.methodRan, true);
    assert.equal(record.createOnly, true);
    assert.equal(record.nestedEvalSpendUsd, 2);
    const improved = [stream, use('b', 'Skill', { skill: 'agent-skills-toolkit:askit-build-skill', args: 'improve x' }), done('b')].join('\n');
    assert.equal(buildRecord({ arm: 'toolkit', streamText: improved, workDir: dir, skillName: 'x' }).createOnly, false);
    assert.equal(buildRecord({ arm: 'toolkit', streamText: '', workDir: dir, skillName: 'x' }).methodRan, false);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('a nested eval counts from the transcript even after its files are deleted, and a failed sign-in does not', () => {
  const dir = workDir({ 'skills/x/SKILL.md': 'x' });
  const evalCall = (id, output) => [
    use(id, 'Bash', { command: 'claude plugin eval . --runs 3 | tail -4' }),
    line({ message: { content: [{ type: 'tool_result', tool_use_id: id, is_error: false, content: output }] } }),
  ];
  try {
    const builder = [use('a', 'Skill', { skill: 'askit-build-skill', args: 'create x' }), done('a')];
    const good = [...builder, ...evalCall('b', '5 case(s) · 310s · $1.25 · 4 passed')].join('\n');
    const record = buildRecord({ arm: 'toolkit', streamText: good, workDir: dir, skillName: 'x' });
    assert.equal(record.methodRan, true);
    assert.equal(record.nestedEvalSpendFromTranscriptUsd, 1.25);
    assert.equal(record.nestedEvalSpendBestUsd, 1.25, 'the transcript counts when the result files are gone');
    const refused = [...builder, ...evalCall('b', '1 case(s) · 0s · $0.00 · ⚠ partial (stopped: authentication failed)')].join('\n');
    assert.equal(buildRecord({ arm: 'toolkit', streamText: refused, workDir: dir, skillName: 'x' }).methodRan, false);
    const help = [...builder, use('c', 'Bash', { command: 'claude plugin eval --help' }), done('c')].join('\n');
    assert.equal(buildRecord({ arm: 'toolkit', streamText: help, workDir: dir, skillName: 'x' }).nestedEvalCommands, 0);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('the skill-creator build record needs the skill, a benchmark and the optimiser', () => {
  const dir = workDir({ 'skills/x/SKILL.md': 'x', 'workspace/iteration-1/benchmark.json': '{}' });
  try {
    const builder = [use('a', 'Skill', { skill: 'skill-creator' }), done('a')];
    const noOptimiser = buildRecord({ arm: 'skill-creator', streamText: builder.join('\n'), workDir: dir, skillName: 'x' });
    assert.equal(noOptimiser.methodRan, false);
    const failed = [...builder, use('b', 'Bash', { command: 'python -m scripts.run_loop --x' }), done('b', true)].join('\n');
    assert.equal(buildRecord({ arm: 'skill-creator', streamText: failed, workDir: dir, skillName: 'x' }).methodRan, false);
    const ran = [...builder, use('b', 'Bash', { command: 'python -m scripts.run_loop --x' }), done('b')].join('\n');
    // From dry-skill-creator on 2026-11-10: every query broke on a read-only folder, and recall stayed at 0.
    const broken = [
      "Warning: query failed: [Errno 30] Read-only file system: '/plugin/skills/skill-creator/.claude'\n".repeat(60),
      'Train: 24/39 correct, precision=100% recall=0% accuracy=62% (0.1s)',
      'Test : 12/21 correct, precision=100% recall=0% accuracy=57% (0.0s)',
    ].join('\n');
    writeFileSync(join(dir, 'workspace', 'optimize.log'), broken);
    const unmeasured = buildRecord({ arm: 'skill-creator', streamText: ran, workDir: dir, skillName: 'x' });
    assert.equal(unmeasured.optimiser.failures, 60);
    assert.equal(unmeasured.methodRan, false, 'an optimiser whose every query failed did not run the method');
    writeFileSync(join(dir, 'workspace', 'optimize.log'), 'Train: 30/39 correct, precision=90% recall=70% accuracy=77% (41.2s)\n');
    assert.equal(buildRecord({ arm: 'skill-creator', streamText: ran, workDir: dir, skillName: 'x' }).methodRan, true);
  } finally {
    rmSync(dir, { recursive: true });
  }
});
