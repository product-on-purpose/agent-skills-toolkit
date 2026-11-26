// Chooses experiment B2's convergence rule on closed material: experiment B's nine build attempts and its
// thirty held-out cases, whose outcome can no longer move.
//
//   node rule-testbed.mjs pairs <out.json>          list every (practice prompt, same-brief case) pair with its features
//   node rule-testbed.mjs score <labels.json>       score candidate rules against hand labels
//
// A practice prompt is what a builder wrote to test its own skill: a toolkit build's evals/<name>/prompt.md,
// a skill-creator build's evals/evals.json prompts, and its optimiser's trigger_eval.json queries.

import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { words, promptBody, loadCases } from '../../c1-pilot/harness/leak.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../../../../..');
const RUNS = process.env.C1_LOCAL ? join(process.env.C1_LOCAL, 'runs') : join(REPO, '_local', 'c1-pilot', 'runs');
const B_PREREG = resolve(HERE, '../../prereg_experiment-b-c1-pilot-20261105.md');

export function practicePrompts(runsDir = RUNS) {
  const out = [];
  for (const id of readdirSync(runsDir).filter((d) => d.startsWith('real-')).sort()) {
    const brief = ['migration-risk-review', 'postmortem-from-notes', 'acceptance-criteria-writer'].find((b) => id.includes(b));
    const work = join(runsDir, id, 'work');
    const evals = join(work, 'evals');
    if (existsSync(evals)) {
      for (const name of readdirSync(evals)) {
        const p = join(evals, name, 'prompt.md');
        if (existsSync(p)) out.push({ build: id, brief, source: `evals/${name}`, text: promptBody(readFileSync(p, 'utf8')) });
      }
    }
    const ej = join(work, 'skills', brief, 'evals', 'evals.json');
    if (existsSync(ej)) {
      const j = JSON.parse(readFileSync(ej, 'utf8'));
      (j.evals ?? j).forEach((e, i) => out.push({ build: id, brief, source: `evals.json#${e.id ?? i}`, text: String(e.prompt ?? '') }));
    }
    const tj = join(work, `${brief}-workspace`, 'desc', 'trigger_eval.json');
    if (existsSync(tj)) JSON.parse(readFileSync(tj, 'utf8')).forEach((q, i) => out.push({ build: id, brief, source: `trigger#${i}`, text: String(q.query ?? '') }));
  }
  return out;
}

const STOP = new Set('the a an and or of to in on for with is are was were be been it this that at by from as if not no but so do does did can could will would should i you we they he she my our your their me us them its into than then there here what which who when where how all any some more most just also very about over under after before up down out off only own same such too each few both other'.split(' '));

export function contentWords(text) {
  return new Set(words(text).filter((w) => w.length >= 3 && !STOP.has(w)));
}

/** Words of at least 4 letters in the case that appear in no other case of any brief, and not in the briefs. */
export function caseTokens(cases, briefText) {
  const briefWords = new Set(words(briefText));
  const sets = cases.map((c) => new Set(words(c.prompt)));
  return cases.map((c, i) => [...sets[i]].filter((w) => w.length >= 4 && !briefWords.has(w) && sets.every((s, k) => k === i || !s.has(w))));
}

function runs8(text) {
  const w = words(text);
  const s = new Set();
  for (let j = 0; j + 8 <= w.length; j += 1) s.add(w.slice(j, j + 8).join(' '));
  return s;
}

export function features(practice, kase, tokens) {
  const pw = new Set(words(practice.text));
  const shared = tokens.filter((t) => pw.has(t));
  const a = contentWords(practice.text);
  const b = contentWords(kase.prompt);
  const inter = [...a].filter((w) => b.has(w)).length;
  const r8 = runs8(kase.prompt);
  const run = [...runs8(practice.text)].find((r) => r8.has(r)) ?? null;
  const digits = shared.filter((t) => /\d/.test(t));
  return {
    tokens: shared.length, tokenList: shared, digitTokens: digits.length,
    jaccard: Number((inter / (a.size + b.size - inter || 1)).toFixed(3)),
    overlapOfCase: Number((inter / (b.size || 1)).toFixed(3)), run8: run,
  };
}

function briefTextB() {
  const md = readFileSync(B_PREREG, 'utf8').replace(/\r\n/g, '\n');
  return [...md.matchAll(/^> ?(.*)$/gm)].map((m) => m[1]).join('\n');
}

function pairs(outPath) {
  const cases = loadCases();
  const tokens = caseTokens(cases, briefTextB());
  const prompts = practicePrompts();
  const rows = [];
  for (const p of prompts) {
    cases.forEach((c, i) => {
      if (!c.id.startsWith(`${p.brief}/`)) return;
      rows.push({ build: p.build, source: p.source, case: c.id, ...features(p, c, tokens[i]) });
    });
  }
  rows.sort((x, y) => y.jaccard - x.jaccard);
  writeFileSync(outPath, `${JSON.stringify({ practicePrompts: prompts.length, pairs: rows.length, rows }, null, 2)}\n`);
  console.log(`${prompts.length} practice prompts, ${rows.length} same-brief pairs`);
  for (const r of rows.slice(0, 40)) console.log(`${r.jaccard.toFixed(3)} ov ${r.overlapOfCase.toFixed(2)} tok ${r.tokens} dig ${r.digitTokens} run ${r.run8 ? 'Y' : '-'} | ${r.case} <- ${r.build.replace('real-', '')} ${r.source}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, a] = process.argv.slice(2);
  if (cmd === 'pairs') pairs(a);
  else { console.error('usage: node rule-testbed.mjs pairs <out.json>'); process.exitCode = 2; }
}
