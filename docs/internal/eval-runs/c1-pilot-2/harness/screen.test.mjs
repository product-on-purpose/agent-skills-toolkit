import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadBriefs, screenPrompt, matchScreen } from './screen.mjs';

test('loadBriefs reads the four briefs in file order, without the quote markers', () => {
  const briefs = loadBriefs();
  assert.deepEqual(briefs.map((b) => b.name), ['lease-clause-review', 'shift-handover-note', 'customer-release-notes', 'catering-recipe-scaler']);
  for (const b of briefs) {
    assert.match(b.text, /^Build a skill named `/);
    assert.doesNotMatch(b.text, /^>/m);
  }
});

test('the screen prompt carries the brief and the count, and names no arm or plugin', () => {
  const p = screenPrompt('Build a skill named `x`.', 20);
  assert.match(p, /Write 20 realistic practice prompts/);
  assert.match(p, /Build a skill named `x`\./);
  assert.doesNotMatch(p, /askit|skill-creator|toolkit/i);
});

test('matchScreen flags a case reproduced by the screen and leaves an unrelated case clean', () => {
  const cases = [
    { id: 'b/case-01', prompt: 'the walk-in freezer at the Harrowgate depot tripped twice during the overnight count of pallets' },
    { id: 'b/case-02', prompt: 'please summarise the quarterly figures for the board meeting next tuesday afternoon' },
  ];
  const briefs = [{ name: 'b', text: 'Build a skill named `b`.' }];
  const screen = [{ brief: 'b', session: 's1', text: 'Prompt 3: the walk-in freezer at the Harrowgate depot tripped twice during the night.' }];
  const report = matchScreen(cases, briefs, screen, new Set());
  assert.ok(report['b/case-01'].hits.length > 0);
  assert.equal(report['b/case-02'].hits.length, 0);
});
