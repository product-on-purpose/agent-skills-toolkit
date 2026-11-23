import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVerdict, majority, judgePrompt, candidates, NEAREST } from './judge.mjs';
import { splitPrompts } from './split.mjs';

test('the verdict is the last VERDICT line, so an echoed instruction cannot decide it', () => {
  assert.equal(parseVerdict('Reason. VERDICT: NEAR-COPY or VERDICT: DIFFERENT\nThey differ.\nVERDICT: DIFFERENT'), 'different');
  assert.equal(parseVerdict('Same statement.\n**VERDICT: NEAR-COPY**'), 'near-copy');
  assert.equal(parseVerdict('NEAR-COPY or DIFFERENT: DIFFERENT'), 'unparsed');
});

test('the majority ignores unusable calls, and a tie or no vote is not a near-copy', () => {
  assert.equal(majority(['near-copy', 'different', 'near-copy']), 'near-copy');
  assert.equal(majority(['near-copy', 'different', 'unparsed']), 'different');
  assert.equal(majority(['unparsed', 'error', 'unparsed']), 'unparsed');
});

test('the judge prompt carries the case, its substance checks and the practice prompt', () => {
  const p = judgePrompt('CASE TEXT', ['check one', 'check two'], 'PRACTICE TEXT');
  for (const s of ['CASE TEXT', '- check one', '- check two', 'PRACTICE TEXT', 'VERDICT: NEAR-COPY']) assert.ok(p.includes(s), s);
});

test('candidates are the nearest prompts plus any prompt sharing a 5-word run', () => {
  const caseText = 'please alter the gasket torque table before the friday audit begins';
  const prompts = [
    ...Array.from({ length: 6 }, (_, i) => ({ text: `gasket torque audit friday table note ${i}` })),
    { text: 'unrelated words then alter the gasket torque table and more' },
  ];
  const got = candidates(caseText, prompts).map((r) => r.p.text);
  assert.ok(got.length >= NEAREST + 1);
  assert.ok(got.includes(prompts[6].text), 'the shared-run prompt is included even if not nearest');
});

test('splitPrompts cuts numbered prompts, ignores numbered pasted lines, and accepts a bare number line', () => {
  const text = '1.\nfirst ask\n\n2. second ask with a list:\n1. pasted step\n2. pasted step\n\n3.\nthird ask';
  const got = splitPrompts(text);
  assert.equal(got.length, 3);
  assert.match(got[1], /pasted step/);
});
