import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ORDER, judge } from './run-builds.mjs';

test('the order is section 6: toolkit first on briefs A and C, skill-creator first on brief B', () => {
  assert.deepEqual(ORDER.map(([brief, arm]) => `${brief.split('-')[0]}:${arm}`), [
    'migration:toolkit', 'migration:skill-creator',
    'postmortem:skill-creator', 'postmortem:toolkit',
    'acceptance:toolkit', 'acceptance:skill-creator',
  ]);
});

test('judge passes a build whose method ran, with a skill and no leak, and names each failure', () => {
  const clean = { hits: [] };
  assert.equal(judge({ methodRan: true, skillFinished: true }, clean).ok, true);
  assert.deepEqual(judge({ methodRan: false, skillFinished: true }, clean).reasons, ['the method did not run']);
  assert.deepEqual(judge(null, clean).reasons, ['no build record']);
  const leaked = judge({ methodRan: true, skillFinished: true }, { hits: [{ kind: 'verbatim-run', case: 'b/case-01' }] });
  assert.equal(leaked.ok, false);
  assert.match(leaked.reasons[0], /leak: verbatim-run b\/case-01/);
});
