#!/usr/bin/env node
// what-it-is:   the documentation style report
// what-it-does: measures every published page against the per-quadrant anatomy and the measurable floor in skills/askit-build-docs/references/style-contract.md
// why:          style drifts between sessions and between people unless the checkable part of it is counted; this is that part
// used-by:      run by hand as `npm run doc-style`; deliberately NOT wired into the gate
//
// REPORT-ONLY, ON PURPOSE. This never gates and always exits 0 unless asked to
// --fail-on-breach. Every signal here has a legitimate false-positive surface: three
// separator forms had to be exempted before the counts meant anything, and a style
// guard that blocks a release on a judgment-adjacent signal is exactly what this
// repository's gate has always refused to be.

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import {
  measureText,
  plainnessDebt,
  bodyLines,
  opensWithProse,
  sectionsWithoutOrientation,
} from './lib/prose-metrics.mjs';

/** The measurable floor, by Diataxis quadrant. Sourced from the style contract. */
const THRESHOLDS = {
  explanation: { stackedPct: 8, longParagraphs: 2, heavyParens: 5 },
  tutorials: { stackedPct: 8, longParagraphs: 2, heavyParens: 5 },
  'how-to': { stackedPct: 12, longParagraphs: 1, heavyParens: 4 },
  reference: { stackedPct: 15, longParagraphs: 2, heavyParens: 4 },
  root: { stackedPct: 12, longParagraphs: 2, heavyParens: 5 },
};

/** Quadrants whose sections must orient before they specify (style contract, layer 1). */
const ORIENTATION_QUADRANTS = new Set(['explanation', 'tutorials']);



function quadrantOf(rel) {
  const parts = rel.split('/');
  if (parts[0] !== 'docs') return 'root';
  return THRESHOLDS[parts[1]] ? parts[1] : 'root';
}

/* --------------------------------------------- layer 3: deterministic vocabulary */

// A "every page that uses a coined word must link the glossary" rule was written here
// and then removed. It contradicted a decision already taken on 2026-08-23: the
// measurement then said 74 of 81 pages never link the glossary, and the ruling was that
// adding 74 links would be noise, because the real gap was that site navigation buried
// the glossary twelve pages deep. That was fixed in navigation and is not reopened here.
//
// It was also a bad signal on its own terms. The glossary bolds ordinary words such as
// "check" and "component", so the rule fired on 82 of 88 pages and said nothing.
//
// Rule 3 of the writing rules stands as prose guidance: define a coined word in the
// sentence that first uses it. Whether a sentence defines a word is judgment, and the
// style contract marks it as such rather than pretending a script can tell.

/* ------------------------------------------------------------------- reporting */

function analyse(root, rel) {
  const src = readFileSync(path.join(root, rel), 'utf8');
  const m = measureText(src);
  const lines = bodyLines(src);
  const quadrant = quadrantOf(rel);
  const limit = THRESHOLDS[quadrant];

  const breaches = [];
  if (m.stackedPct > limit.stackedPct) breaches.push(`stacked ${m.stackedPct}% > ${limit.stackedPct}%`);
  if (m.longParagraphs > limit.longParagraphs) breaches.push(`longParagraphs ${m.longParagraphs} > ${limit.longParagraphs}`);
  if (m.heavyParens > limit.heavyParens) breaches.push(`heavyParens ${m.heavyParens} > ${limit.heavyParens}`);
  if (m.planningVocab > 0) breaches.push(`planning vocabulary x${m.planningVocab}`);
  if (m.bareIds > 0) breaches.push(`bare reference id x${m.bareIds}`);

  const anatomy = [];
  if (!opensWithProse(lines)) anatomy.push('does not open with prose');
  if (ORIENTATION_QUADRANTS.has(quadrant)) {
    for (const s of sectionsWithoutOrientation(lines)) anatomy.push(`section specifies before it orients: "${s}"`);
  }

  return { path: rel, quadrant, debt: plainnessDebt(m), metrics: m, breaches, anatomy };
}

function trackedDocs(root) {
  const out = execFileSync(
    'git',
    ['ls-files', 'docs/tutorials/*.md', 'docs/how-to/*.md', 'docs/reference/*.md', 'docs/explanation/*.md',
      'README.md', 'QUICKSTART.md', 'AGENTS.md'],
    { cwd: root, encoding: 'utf8' },
  );
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

const root = path.resolve(process.argv.find((a) => !a.startsWith('-') && a !== process.argv[0] && a !== process.argv[1]) || '.');
const asJson = process.argv.includes('--json');
const failOnBreach = process.argv.includes('--fail-on-breach');

const rows = trackedDocs(root).map((rel) => analyse(root, rel));

rows.sort((a, b) => b.debt - a.debt);
const breaching = rows.filter((r) => r.breaches.length || r.anatomy.length);

if (asJson) {
  console.log(JSON.stringify({ thresholds: THRESHOLDS, rows }, null, 2));
} else {
  console.log('doc-style-report: measured against skills/askit-build-docs/references/style-contract.md');
  console.log(`${rows.length} published pages, ${breaching.length} with something to look at.\n`);
  for (const r of breaching.slice(0, 40)) {
    console.log(`${String(r.debt).padStart(4)}  ${r.path}  [${r.quadrant}]`);
    for (const b of r.breaches) console.log(`        floor:   ${b}`);
    for (const a of r.anatomy) console.log(`        anatomy: ${a}`);
  }
  const clean = rows.length - breaching.length;
  console.log(`\n${clean} page(s) already meet the contract.`);
  console.log('This report gates nothing. It ranks where prose work is worth doing.');
}

process.exit(failOnBreach && breaching.length ? 1 : 0);
