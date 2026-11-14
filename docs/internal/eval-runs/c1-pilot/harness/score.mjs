// The scorer for experiment B. It computes section 7 of the pre-registration and nothing else.
//
//   node score.mjs <results-dir> [--json]
//
// <results-dir> holds <brief>/<arm>/aggregate-result.json, where <arm> is toolkit or skill-creator.
// Scores are compared as whole numbers of 1/24, because the pooled baseline is a multiple of 1/24.
// A number that is not such a multiple marks its case malformed. It is never silently rounded.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const ARMS = ['toolkit', 'skill-creator'];
export const WIN_MARGIN_24THS = 6; // 0.25 of a score, strictly exceeded
export const INVALID_BASELINE_24THS = 18; // 0.75 of a score, reached or exceeded
export const MIN_VALID_CASES = 8;
export const BRIEF_MARGIN = 2;
export const BRIEFS_TO_PASS = 2;

/** Convert a score to whole 1/24ths. Returns null when the value is not a multiple of 1/24. */
export function to24ths(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const scaled = value * 24;
  const rounded = Math.round(scaled);
  return Math.abs(scaled - rounded) < 1e-6 ? rounded : null;
}

function runsAreClean(aggregateCase) {
  for (const arm of ['with', 'without']) {
    const runs = aggregateCase.arms?.[arm];
    if (!Array.isArray(runs) || runs.length === 0) return false;
    if (runs.some((run) => run.error !== null && run.error !== undefined)) return false;
  }
  return true;
}

/** Score one brief from the two arms' aggregate results. A missing result means a failed build. */
export function scoreBrief(results) {
  const missingArm = ARMS.find((arm) => !results[arm]);
  if (missingArm) {
    return { valid: false, reason: `no result for arm ${missingArm}`, cases: [], validCases: 0, wins: { toolkit: 0, 'skill-creator': 0 }, winner: null };
  }
  const byName = (arm) => new Map(results[arm].cases.map((c) => [c.name, c]));
  const toolkit = byName('toolkit');
  const skillCreator = byName('skill-creator');
  const names = [...new Set([...toolkit.keys(), ...skillCreator.keys()])].sort();
  const anyPartial = ARMS.some((arm) => results[arm].partial === true);

  const cases = names.map((name) => {
    const t = toolkit.get(name);
    const s = skillCreator.get(name);
    if (!t || !s) return { name, valid: false, reason: 'case missing from one arm' };
    if (anyPartial) return { name, valid: false, reason: 'partial suite' };
    if (!runsAreClean(t) || !runsAreClean(s)) return { name, valid: false, reason: 'a run has an error' };

    const scoreT = to24ths(t.aggregates?.score);
    const scoreS = to24ths(s.aggregates?.score);
    const withoutT = to24ths(t.aggregates?.scoreWithout);
    const withoutS = to24ths(s.aggregates?.scoreWithout);
    if ([scoreT, scoreS, withoutT, withoutS].includes(null)) {
      return { name, valid: false, reason: 'malformed score: not a multiple of 1/24' };
    }
    // The mean of two 1/24 values is a 1/48 value in general. Doubling keeps every comparison exact.
    const baselineDoubled = withoutT + withoutS;
    if (baselineDoubled >= INVALID_BASELINE_24THS * 2) {
      return { name, valid: false, reason: 'pooled baseline at or above 0.75', baseline: baselineDoubled / 48 };
    }
    return {
      name,
      valid: true,
      baseline: baselineDoubled / 48,
      score: { toolkit: scoreT / 24, 'skill-creator': scoreS / 24 },
      win: {
        toolkit: scoreT * 2 - baselineDoubled > WIN_MARGIN_24THS * 2,
        'skill-creator': scoreS * 2 - baselineDoubled > WIN_MARGIN_24THS * 2,
      },
    };
  });

  const validCases = cases.filter((c) => c.valid);
  const wins = {
    toolkit: validCases.filter((c) => c.win.toolkit).length,
    'skill-creator': validCases.filter((c) => c.win['skill-creator']).length,
  };
  const valid = validCases.length >= MIN_VALID_CASES;
  let winner = null;
  if (valid) {
    if (wins.toolkit - wins['skill-creator'] >= BRIEF_MARGIN) winner = 'toolkit';
    else if (wins['skill-creator'] - wins.toolkit >= BRIEF_MARGIN) winner = 'skill-creator';
    else winner = 'tie';
  }
  return {
    valid,
    reason: valid ? null : `only ${validCases.length} valid cases, and ${MIN_VALID_CASES} are needed`,
    cases,
    validCases: validCases.length,
    wins,
    winner,
  };
}

/** Apply R1, R2 and R3 from section 9. R4 needs mean deltas, reported per arm below. */
export function outcome(briefs) {
  const scored = Object.values(briefs);
  const validBriefs = scored.filter((b) => b.valid);
  const toolkitWins = validBriefs.filter((b) => b.winner === 'toolkit').length;
  const skillCreatorWins = validBriefs.filter((b) => b.winner === 'skill-creator').length;
  let result;
  if (toolkitWins >= BRIEFS_TO_PASS) result = 'R1';
  else if (validBriefs.length < BRIEFS_TO_PASS) result = 'R3';
  else result = 'R2';
  return { result, validBriefs: validBriefs.length, toolkitWins, skillCreatorWins };
}

/** R4 applies when a built skill's mean delta against the pooled baseline is at or below zero. */
export function meanDeltas(brief) {
  const valid = brief.cases.filter((c) => c.valid);
  if (valid.length === 0) return null;
  const mean = (arm) => valid.reduce((sum, c) => sum + (c.score[arm] - c.baseline), 0) / valid.length;
  return { toolkit: mean('toolkit'), 'skill-creator': mean('skill-creator') };
}

function main(argv) {
  const dir = argv[2];
  if (!dir) {
    console.error('usage: node score.mjs <results-dir> [--json]');
    return 2;
  }
  const briefs = {};
  for (const brief of readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()) {
    const results = {};
    for (const arm of ARMS) {
      const path = join(dir, brief, arm, 'aggregate-result.json');
      if (existsSync(path)) results[arm] = JSON.parse(readFileSync(path, 'utf8'));
    }
    briefs[brief] = scoreBrief(results);
    briefs[brief].meanDelta = meanDeltas(briefs[brief]);
  }
  const summary = { outcome: outcome(briefs), briefs };
  if (argv.includes('--json')) {
    console.log(JSON.stringify(summary, null, 2));
    return 0;
  }
  console.log(`Outcome: ${summary.outcome.result}. Valid briefs: ${summary.outcome.validBriefs}. Toolkit wins: ${summary.outcome.toolkitWins}. skill-creator wins: ${summary.outcome.skillCreatorWins}.`);
  for (const [name, b] of Object.entries(briefs)) {
    console.log(`${name}: valid=${b.valid} validCases=${b.validCases} toolkit=${b.wins.toolkit} skill-creator=${b.wins['skill-creator']} winner=${b.winner}${b.reason ? ` (${b.reason})` : ''}`);
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv);
}
