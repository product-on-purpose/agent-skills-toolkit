// Runs experiment B's six real builds in the order section 6 fixes, and applies two rebuild rules.
//
//   node run-builds.mjs
//
// Section 6: a build whose record does not show the arm's method ran is rebuilt once in a new container,
// and a second miss is a failed build. Section 8 step 8: a leak-check hit voids a build, which is rebuilt
// once, and a second hit is a failed build. This driver applies both after each build, so a rebuild comes
// straight after the build it replaces. It stops early if the first two builds both fail, because that
// points to a harness fault rather than to either arm.

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIndex, loadCases, briefText, checkRun } from './leak.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PILOT = resolve(HERE, '..');
const LOCAL = process.env.C1_LOCAL ?? join(resolve(PILOT, '../../../..'), '_local', 'c1-pilot');

// "The toolkit arm builds first on briefs A and C, and skill-creator builds first on brief B."
export const ORDER = [
  ['migration-risk-review', 'toolkit'],
  ['migration-risk-review', 'skill-creator'],
  ['postmortem-from-notes', 'skill-creator'],
  ['postmortem-from-notes', 'toolkit'],
  ['acceptance-criteria-writer', 'toolkit'],
  ['acceptance-criteria-writer', 'skill-creator'],
];

function leakIndex() {
  const prereg = readFileSync(join(PILOT, '..', 'prereg_experiment-b-c1-pilot-20261105.md'), 'utf8');
  const fixed = JSON.parse(readFileSync(join(HERE, 'leak-tokens.json'), 'utf8'));
  return buildIndex(loadCases(), briefText(prereg), new Set(), fixed);
}

/** Judge one finished build: did its method run, did it finish a skill, and did it leak? */
export function judge(record, leak) {
  const reasons = [];
  if (!record) reasons.push('no build record');
  else {
    if (!record.methodRan) reasons.push('the method did not run');
    if (!record.skillFinished) reasons.push('no finished skill');
  }
  if (leak.hits.length > 0) reasons.push(`leak: ${leak.hits.map((h) => `${h.kind} ${h.case ?? ''}`.trim()).join('; ')}`);
  return { ok: reasons.length === 0, reasons };
}

function buildOnce(brief, arm, id) {
  const started = new Date().toISOString();
  const result = spawnSync('node', [join(HERE, 'harness.mjs'), 'build', arm, brief, id], { encoding: 'utf8', maxBuffer: 1 << 28, env: process.env });
  const recordPath = join(LOCAL, 'runs', id, 'build-record.json');
  const record = existsSync(recordPath) ? JSON.parse(readFileSync(recordPath, 'utf8')) : null;
  const leak = checkRun(join(LOCAL, 'runs', id), leakIndex());
  const verdict = judge(record, leak);
  return {
    id, brief, arm, started, exit: result.status, ...verdict,
    stderrTail: result.status === 0 ? null : result.stderr.slice(-600),
    cost: record?.totalEstimateUsd ?? null, minutes: record?.wallClockMinutes ?? null,
    createOnly: record?.createOnly ?? null, stoppedBy: record?.stoppedBy ?? null,
  };
}

function main() {
  const summaryPath = join(LOCAL, 'builds-summary.json');
  const summary = existsSync(summaryPath) ? JSON.parse(readFileSync(summaryPath, 'utf8')) : { builds: [] };
  const save = () => writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  for (const [brief, arm] of ORDER) {
    if (summary.builds.some((b) => b.brief === brief && b.arm === arm && b.final)) continue;
    const attempts = [];
    for (const suffix of ['', '-rebuild']) {
      const attempt = buildOnce(brief, arm, `real-${brief}-${arm}${suffix}`);
      attempts.push(attempt);
      console.log(JSON.stringify(attempt));
      if (attempt.ok) break;
    }
    const last = attempts[attempts.length - 1];
    summary.builds.push({ brief, arm, final: last.ok ? last.id : 'failed', attempts });
    save();
    const finished = summary.builds.filter((b) => b.final);
    if (finished.length === 2 && finished.every((b) => b.final === 'failed')) {
      console.log('Stopping: the first two builds both failed, which points to a harness fault.');
      return;
    }
  }
  console.log('All six builds are recorded in builds-summary.json.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
