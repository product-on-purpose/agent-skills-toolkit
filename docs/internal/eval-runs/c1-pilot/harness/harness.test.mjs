import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { blockquoteAfter, builderPrompt } from './harness.mjs';

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
