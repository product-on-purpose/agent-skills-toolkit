import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { blockquoteAfter, builderPrompt, scoringPlugin } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const prereg = readFileSync(join(HERE, '..', '..', 'prereg_experiment-b-c1-pilot-20261105.md'), 'utf8');

test('blockquoteAfter cuts the quote and refuses a missing marker', () => {
  assert.equal(blockquoteAfter('# a\n\n> one\n>\n> two\n\nthree', '# a'), 'one\n\ntwo');
  assert.throws(() => blockquoteAfter('nothing', '# a'));
});

test('each real brief reaches its builder whole, with the right arm instruction', () => {
  for (const brief of ['migration-risk-review', 'postmortem-from-notes', 'acceptance-criteria-writer']) {
    const toolkit = builderPrompt(prereg, 'toolkit', brief);
    const creator = builderPrompt(prereg, 'skill-creator', brief);
    assert.match(toolkit, new RegExp(`^Build a skill named \`${brief}\``));
    assert.match(toolkit, /People ask for this in many ways/);
    assert.match(toolkit, /No human is available/);
    assert.match(toolkit, /askit-build-skill/);
    assert.doesNotMatch(toolkit, /skill-creator/);
    assert.match(creator, /skill-creator/);
    assert.doesNotMatch(creator, /askit/);
    assert.doesNotMatch(creator, /(^|\n)>/);
  }
});

test('the dry run uses the harness-only brief', () => {
  assert.match(builderPrompt(prereg, 'toolkit', 'standup-summary'), /^Build a skill named `standup-summary`/);
});

test('scoringPlugin copies only the skill and that brief\'s cases, firing graders included', () => {
  const base = mkdtempSync(join(tmpdir(), 'c1-scoring-'));
  try {
    const skill = join(base, 'build', 'skills', 'postmortem-from-notes');
    mkdirSync(join(skill, 'references'), { recursive: true });
    writeFileSync(join(skill, 'SKILL.md'), '---\nname: postmortem-from-notes\n---\n');
    writeFileSync(join(skill, 'references', 'r.md'), 'r');
    writeFileSync(join(base, 'build', 'stray.md'), 'not copied');
    const target = join(base, 'plugin');
    scoringPlugin(target, 'postmortem-from-notes', skill);
    assert.deepEqual(readdirSync(target).sort(), ['.claude-plugin', 'evals', 'out', 'skills']);
    assert.match(readFileSync(join(target, '.claude-plugin', 'plugin.json'), 'utf8'), /"name": "c1-pilot"/);
    assert.ok(existsSync(join(target, 'skills', 'postmortem-from-notes', 'references', 'r.md')));
    assert.equal(readdirSync(join(target, 'evals')).length, 10);
    assert.ok(existsSync(join(target, 'evals', 'case-01', 'graders', 'fired.md')));
    scoringPlugin(target, 'postmortem-from-notes', skill, ['case-01']);
    assert.deepEqual(readdirSync(join(target, 'evals')), ['case-01']);
    assert.throws(() => scoringPlugin(target, 'postmortem-from-notes', join(base, 'missing')), /No built skill/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
