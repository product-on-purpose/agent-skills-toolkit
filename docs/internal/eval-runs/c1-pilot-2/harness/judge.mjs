// Experiment B2's convergence judge (design section 3.5, as amended 2026-11-22).
//
//   node judge.mjs testbed <out.json>    prove the judge on experiment B's labelled pairs (closed material)
//   node judge.mjs screen <out.json>     judge each B2 case against its nearest same-brief screen prompts
//
// Word matching cannot tell a reinvented case from stock vocabulary or boilerplate (measured on experiment
// B's builds and on B2's screen). So a cheap lexical ranking picks, for each case, the few practice prompts
// closest to it, and a Sonnet judge decides whether each is a near-copy: essentially the same specific
// situation, so that the case's substance graders would apply to it nearly unchanged. The judge runs in the
// experiment's container image with the scoring token, with no plugin and no tools.

import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { words, loadCases } from '../../c1-pilot/harness/leak.mjs';
import { practicePrompts, contentWords } from './rule-testbed.mjs';
import { splitPrompts } from './split.mjs';
import { loadBriefs } from './screen.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../../../../..');
const LOCAL2 = process.env.C1_LOCAL2 ?? join(REPO, '_local', 'c1-pilot-2');
const LOCAL_B = process.env.C1_LOCAL ?? join(REPO, '_local', 'c1-pilot');
const IMAGE = 'localhost/c1-pilot:1';
const TOKEN_FILE = join(homedir(), '.c1-pilot.env');
export const NEAREST = 3;

export function judgePrompt(caseText, substance, practiceText) {
  return [
    'You are checking whether a practice prompt, written by someone building a skill, is a near-copy of a hidden test case.',
    'A near-copy describes essentially the same specific situation: the same particular items, facts, figures or statements, so that the test case\'s substance checks would apply to the practice prompt nearly unchanged.',
    'These are NOT a near-copy: sharing the task type, sharing a common hazard or mistake, sharing standard legal, technical or culinary boilerplate, or sharing general vocabulary of the domain.',
    'If the practice prompt concerns a different table, system, product, organisation, person, document or set of figures, it is DIFFERENT, even when its structure and its hazard match the test case.',
    'If the practice prompt contains the test case\'s specific situation inside a larger one, for example the same statement among several others, it is a NEAR-COPY.',
    '',
    'TEST CASE PROMPT:',
    caseText,
    '',
    'TEST CASE SUBSTANCE CHECKS:',
    ...substance.map((s) => `- ${s}`),
    '',
    'PRACTICE PROMPT:',
    practiceText,
    '',
    'Give one sentence of reasoning, then end with a line that reads either "VERDICT: NEAR-COPY" or "VERDICT: DIFFERENT".',
  ].join('\n');
}

/** The verdict is the last "VERDICT: <word>" line, so an echoed instruction cannot decide it. */
export function parseVerdict(text) {
  const found = [...String(text).toUpperCase().matchAll(/VERDICT:\s*\**\s*(NEAR-COPY|DIFFERENT)\b/g)];
  if (!found.length) return 'unparsed';
  return found[found.length - 1][1] === 'NEAR-COPY' ? 'near-copy' : 'different';
}

export const VOTES = 3;

/** Majority of VOTES judge calls; an unusable call counts as no vote. */
export function majority(verdicts) {
  const near = verdicts.filter((v) => v === 'near-copy').length;
  const diff = verdicts.filter((v) => v === 'different').length;
  if (near + diff === 0) return 'unparsed';
  return near > diff ? 'near-copy' : 'different';
}

function callJudge(prompt) {
  return new Promise((resolveP) => {
    const p = spawn('podman', ['run', '--rm', '-i', '--env-file', TOKEN_FILE, IMAGE,
      'claude', '-p', '--model', 'sonnet', '--max-budget-usd', '0.5', '--output-format', 'json', '--tools', '']);
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => {
      try {
        const j = JSON.parse(out);
        resolveP({ verdict: parseVerdict(j.result), reason: String(j.result).replace(/\s+/g, ' ').trim(), costUsd: j.total_cost_usd ?? null });
      } catch { resolveP({ verdict: 'error', reason: `exit ${code}: ${err.slice(-200)}`, costUsd: null }); }
    });
    p.stdin.end(prompt);
  });
}

/** Judge every pair VOTES times, and keep the majority with each call's verdict and summed cost. */
async function judgeAll(pairs) {
  const calls = pairs.flatMap((x, i) => Array.from({ length: VOTES }, () => ({ i, prompt: judgePrompt(x.caseText, x.substance, x.practice) })));
  const results = await pool(calls, 4, (c) => callJudge(c.prompt));
  return pairs.map((_, i) => {
    const mine = results.filter((_, k) => calls[k].i === i);
    return {
      verdict: majority(mine.map((r) => r.verdict)), votes: mine.map((r) => r.verdict),
      reason: mine.find((r) => r.verdict === majority(mine.map((m) => m.verdict)))?.reason ?? mine[0].reason,
      costUsd: mine.reduce((n, r) => n + (r.costUsd ?? 0), 0),
    };
  });
}

async function pool(items, size, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (next < items.length) { const i = next; next += 1; out[i] = await fn(items[i], i); }
  }));
  return out;
}

function substanceOf(caseDir) {
  const g = join(caseDir, 'graders');
  return readdirSync(g).filter((f) => f.startsWith('substance')).sort().map((f) => readFileSync(join(g, f), 'utf8').replace(/^---[\s\S]*?---\s*/, '').trim());
}

export const RUN_WORDS = 5;

function grams(text, k = RUN_WORDS) {
  const w = words(text);
  const s = new Set();
  for (let j = 0; j + k <= w.length; j += 1) s.add(w.slice(j, j + k).join(' '));
  return s;
}

/**
 * The practice prompts the judge reads for one case: the NEAREST closest by shared content words, plus every
 * prompt that shares a RUN_WORDS-word run with the case. The second set catches a copied statement inside an
 * otherwise different prompt, which word overlap ranks low.
 */
export function candidates(caseText, prompts) {
  const ranked = prompts.map((p) => ({ p, s: closeness(caseText, p.text) })).sort((a, b) => b.s - a.s);
  const cg = grams(caseText);
  return ranked.filter((r, i) => i < NEAREST || [...grams(r.p.text)].some((g) => cg.has(g)));
}

/** Lexical closeness used only to choose which pairs the judge reads. */
export function closeness(a, b) {
  const x = contentWords(a);
  const y = contentWords(b);
  const inter = [...x].filter((w) => y.has(w)).length;
  return inter / (x.size + y.size - inter || 1);
}

async function testbed(outPath) {
  const heldOut = resolve(HERE, '../../c1-pilot/held-out');
  const cases = loadCases(heldOut);
  const prompts = practicePrompts(join(LOCAL_B, 'runs'));
  // The four near-copies, labelled by reading on 2026-11-22 before the judge existed.
  const POS = new Set([
    'migration-risk-review/case-03|real-migration-risk-review-skill-creator|evals.json#5',
    'migration-risk-review/case-02|real-migration-risk-review-skill-creator|evals.json#5',
    'migration-risk-review/case-05|real-migration-risk-review-toolkit|evals/type-change-vague',
    'migration-risk-review/case-04|real-migration-risk-review-toolkit|evals/drop-column',
  ]);
  const pairs = [];
  for (const c of cases) {
    const brief = c.id.split('/')[0];
    for (const { p, s } of candidates(c.prompt, prompts.filter((p) => p.brief === brief))) pairs.push({ case: c.id, build: p.build, source: p.source, closeness: Number(s.toFixed(3)), label: POS.has(`${c.id}|${p.build}|${p.source}`) ? 'near-copy' : 'different', caseText: c.prompt, substance: substanceOf(join(heldOut, c.id)), practice: p.text });
  }
  for (const key of POS) if (!pairs.some((x) => `${x.case}|${x.build}|${x.source}` === key)) console.log(`note: labelled near-copy not among the candidates: ${key}`);
  const verdicts = await judgeAll(pairs);
  const rows = pairs.map((x, i) => ({ case: x.case, build: x.build, source: x.source, closeness: x.closeness, label: x.label, ...verdicts[i] }));
  writeFileSync(outPath, `${JSON.stringify(rows, null, 2)}\n`);
  const agree = rows.filter((r) => r.verdict === r.label).length;
  console.log(`testbed: ${rows.length} pairs judged, agreement ${agree}/${rows.length}`);
  for (const r of rows.filter((r) => r.verdict !== r.label || r.label === 'near-copy')) console.log(`  ${r.label} -> ${r.verdict}: ${r.case} <- ${r.build.replace('real-', '')} ${r.source} | ${r.reason}`);
  console.log(`cost about $${rows.reduce((n, r) => n + (r.costUsd ?? 0), 0).toFixed(2)}`);
}

async function screen(outPath) {
  const cases = loadCases(join(LOCAL2, 'cases'));
  const screenPrompts = [];
  for (const b of loadBriefs()) {
    const dir = join(LOCAL2, 'screen', b.name);
    for (const f of readdirSync(dir).sort()) splitPrompts(readFileSync(join(dir, f), 'utf8')).forEach((t, i) => screenPrompts.push({ brief: b.name, id: `${f}#${i + 1}`, text: t }));
  }
  const pairs = [];
  for (const c of cases) {
    const brief = c.id.split('/')[0];
    for (const { p, s } of candidates(c.prompt, screenPrompts.filter((p) => p.brief === brief))) pairs.push({ case: c.id, prompt: p.id, closeness: Number(s.toFixed(3)), caseText: c.prompt, substance: substanceOf(join(LOCAL2, 'cases', c.id)), practice: p.text });
  }
  const verdicts = await judgeAll(pairs);
  const rows = pairs.map((x, i) => ({ case: x.case, prompt: x.prompt, closeness: x.closeness, ...verdicts[i] }));
  writeFileSync(outPath, `${JSON.stringify(rows, null, 2)}\n`);
  const converged = [...new Set(rows.filter((r) => r.verdict === 'near-copy').map((r) => r.case))];
  const bad = rows.filter((r) => r.verdict === 'error' || r.verdict === 'unparsed').length;
  const byBrief = {};
  for (const id of converged) { const b = id.split('/')[0]; byBrief[b] = (byBrief[b] ?? 0) + 1; }
  // Counts only: case text stays local (design section 3.2).
  console.log(`screen: ${rows.length} pairs judged, ${bad} unusable; ${converged.length} of ${cases.length} cases judged near-copied; by brief ${JSON.stringify(byBrief)}`);
  console.log(`cost about $${rows.reduce((n, r) => n + (r.costUsd ?? 0), 0).toFixed(2)}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!existsSync(TOKEN_FILE)) throw new Error(`No token file at ${TOKEN_FILE}`);
  const [cmd, out] = process.argv.slice(2);
  if (cmd === 'testbed') await testbed(out);
  else if (cmd === 'screen') await screen(out);
  else { console.error('usage: node judge.mjs testbed|screen <out.json>'); process.exitCode = 2; }
}
