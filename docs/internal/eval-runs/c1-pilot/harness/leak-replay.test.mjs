import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { loadCases } from './leak.mjs';

const SCRIPT = fileURLToPath(new URL('./leak-replay.mjs', import.meta.url));
const ORDER = [
  ['migration-risk-review', 'toolkit'], ['migration-risk-review', 'skill-creator'],
  ['postmortem-from-notes', 'skill-creator'], ['postmortem-from-notes', 'toolkit'],
  ['acceptance-criteria-writer', 'toolkit'], ['acceptance-criteria-writer', 'skill-creator'],
];
const entry = (type, content, ts) => JSON.stringify({ type, timestamp: ts, message: { content } });

// A run whose one hit is a copy of a held-out prompt: authored by the model in one fixture, read from a
// tool result in the other. The provenance rule must keep the first and count the second.
function fixture(readCase) {
  const dir = mkdtempSync(join(tmpdir(), 'leak-replay-'));
  const prompt = loadCases()[0].prompt;
  for (const [brief, arm] of ORDER) {
    const run = join(dir, `real-${brief}-${arm}`);
    mkdirSync(run, { recursive: true });
    const lines = [entry('user', 'Build the skill.', '2026-11-14T00:00:00Z')];
    if (brief === 'migration-risk-review' && arm === 'skill-creator') {
      lines.push(readCase
        ? entry('user', [{ type: 'tool_result', content: prompt }], '2026-11-14T00:00:01Z')
        : entry('assistant', [{ type: 'text', text: prompt }], '2026-11-14T00:00:01Z'));
    }
    writeFileSync(join(run, 'stream.jsonl'), `${lines.join('\n')}\n`);
  }
  return dir;
}

function replay(dir) {
  const out = join(dir, 'out.json');
  const r = spawnSync('node', [SCRIPT, dir, out], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(readFileSync(out, 'utf8'));
}

test('the provenance rule ignores a copy the model wrote itself, which the fixed rule voids', () => {
  const dir = fixture(false);
  try {
    const { perRun, rules } = replay(dir);
    const run = perRun['real-migration-risk-review-skill-creator'];
    assert.ok(run.fixed > 0, 'the fixed rule should hit an authored copy');
    assert.equal(run.provenance, 0);
    assert.equal(rules.provenance.builds['migration-risk-review/skill-creator'], 'first attempt kept');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the provenance rule counts a copy that arrived in a tool result', () => {
  const dir = fixture(true);
  try {
    const { perRun, rules } = replay(dir);
    assert.ok(perRun['real-migration-risk-review-skill-creator'].provenance > 0);
    assert.equal(rules.provenance.builds['migration-risk-review/skill-creator'], 'voided, but no rebuild was run under this rule');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
