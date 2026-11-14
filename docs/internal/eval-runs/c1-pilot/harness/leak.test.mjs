import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { words, briefText, promptBody, buildIndex, findLeaks, loadCases, PREREG_NAME } from './leak.mjs';

const cases = [
  { id: 'a/case-01', prompt: 'We run ALTER TABLE ledger_entries on Postgres; Priya owns ticket OPS-4471 and the shard is eu_west_7.' },
  { id: 'a/case-02', prompt: 'Our team wants to run ALTER TABLE on Postgres today, before the release.' },
];
const briefs = '> Build a skill that reviews ALTER TABLE statements on Postgres.';

test('words splits JSON escapes so they do not join words', () => {
  assert.deepEqual(words('one\\ntwo\\"three'), ['one', 'two', 'three']);
});

test('promptBody drops the frontmatter', () => {
  assert.equal(promptBody('---\nmax_turns: 10\n---\nHello there').trim(), 'Hello there');
});

test('tokens are case-specific words of four or more letters outside the briefs and the other prompts', () => {
  const [first, second] = buildIndex(cases, briefs);
  for (const t of ['ledger_entries', 'priya', 'shard', 'eu_west_7', '4471']) assert.ok(first.tokens.includes(t), `${t} is a token`);
  assert.ok(!first.tokens.includes('ops'), 'a word under four characters is never a token');
  assert.ok(!first.tokens.includes('table'), 'a word in another prompt is never a token');
  assert.ok(!first.tokens.includes('postgres'), 'a brief word is never a token');
  assert.ok(!first.tokens.includes('alter'), 'a brief word is never a token');
  assert.ok(second.tokens.every((t) => !first.tokens.includes(t)));
});

test('a verbatim eight-word run is a hit, and seven words are not', () => {
  const index = buildIndex(cases, briefs);
  const eight = 'notes: our team wants to run alter table on postgres';
  assert.ok(findLeaks(eight, index).some((h) => h.kind === 'verbatim-run' && h.case === 'a/case-02'));
  assert.ok(!findLeaks('our team wants to run alter table', index).some((h) => h.kind === 'verbatim-run'));
});

test('three distinct case tokens are a hit, and two are not', () => {
  const index = buildIndex(cases, briefs);
  assert.ok(findLeaks('example: priya, the ledger_entries table, shard', index).some((h) => h.kind === 'tokens' && h.case === 'a/case-01'));
  assert.ok(!findLeaks('example: priya and the ledger_entries table', index).some((h) => h.kind === 'tokens'));
});

test('the pre-registration file name is a hit', () => {
  assert.ok(findLeaks(`read ${PREREG_NAME}.md`, buildIndex(cases, briefs)).some((h) => h.kind === 'file-name'));
});

test('the real held-out set builds an index with no empty case, and its own prompts hit', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const real = loadCases();
  assert.equal(real.length, 30);
  const index = buildIndex(real, briefText(readFileSync(join(here, '..', '..', `${PREREG_NAME}.md`), 'utf8')));
  for (const entry of index) assert.ok(entry.runs.size > 0, `${entry.id} has eight-word runs`);
  for (const c of real) assert.ok(findLeaks(c.prompt, index).some((h) => h.case === c.id), `${c.id} finds itself`);
});
