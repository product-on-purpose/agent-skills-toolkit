// Experiment B2's convergence screen (design section 3.5).
//
//   node screen.mjs run [--sessions 5] [--prompts 20] [--brief <name>]
//   node screen.mjs match [--out <file.json>]
//
// `run` starts fresh Claude sessions with no plugin, in the same container image experiment B used. Each
// session sees only one brief and is asked to write practice prompts for testing the skill, which is what a
// builder of either arm does first. Neither arm's method is involved. The outputs go to
// _local/c1-pilot-2/screen/<brief>/session-NN.txt.
//
// `match` is the first, lexical pass: experiment B's leak.mjs matcher over whole sessions. It is kept so the
// design's 2026-11-22 amendment can be reproduced, but it does not decide anything. It flagged ordinary
// domain vocabulary and boilerplate. judge.mjs decides which cases are near-copied.

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { buildIndex, findLeaks, loadCases, backgroundWords, words } from '../../c1-pilot/harness/leak.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PILOT2 = resolve(HERE, '..');
const REPO = resolve(PILOT2, '../../../..');
const LOCAL = process.env.C1_LOCAL2 ?? join(REPO, '_local', 'c1-pilot-2');
const LOCAL_B = process.env.C1_LOCAL ?? join(REPO, '_local', 'c1-pilot');
const IMAGE = 'localhost/c1-pilot:1';
const TOKEN_FILE = join(homedir(), '.c1-pilot.env');

/** The four briefs from briefs.md, as { name, text }, in file order. */
export function loadBriefs(path = join(PILOT2, 'briefs.md')) {
  const md = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  return [...md.matchAll(/### [^\n]*`([^`]+)`[^\n]*\n\n((?:>[^\n]*\n?)+)/g)].map(([, name, quote]) => ({
    name,
    text: quote.trimEnd().split('\n').map((l) => l.replace(/^> ?/, '')).join('\n'),
  }));
}

export function screenPrompt(briefText, count) {
  return [
    'Someone is about to build a Claude skill from the brief below. Before building it, they need practice prompts to test it with.',
    `Write ${count} realistic practice prompts that a person might send when they need this skill. Include any pasted material a prompt needs, in full.`,
    'Vary the situations, the length and the phrasing. Number them 1 to ' + count + '. Output only the prompts.',
    '',
    'The brief:',
    '',
    briefText,
  ].join('\n');
}

function arg(argv, flag, fallback) {
  return argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : fallback;
}

function runScreen(argv) {
  if (!existsSync(TOKEN_FILE)) throw new Error(`No token file at ${TOKEN_FILE}`);
  const sessions = Number(arg(argv, '--sessions', 5));
  const prompts = Number(arg(argv, '--prompts', 20));
  const only = arg(argv, '--brief', null);
  const ledger = [];
  for (const brief of loadBriefs()) {
    if (only && brief.name !== only) continue;
    const dir = join(LOCAL, 'screen', brief.name);
    mkdirSync(dir, { recursive: true });
    for (let s = 1; s <= sessions; s += 1) {
      const file = join(dir, `session-${String(s).padStart(2, '0')}.txt`);
      if (existsSync(file)) continue;
      const r = spawnSync('podman', ['run', '--rm', '-i', '--env-file', TOKEN_FILE, IMAGE,
        'claude', '-p', '--model', 'sonnet', '--max-budget-usd', '2', '--output-format', 'json'],
      { input: screenPrompt(brief.text, prompts), encoding: 'utf8', maxBuffer: 1 << 26 });
      let out;
      try { out = JSON.parse(r.stdout); } catch { throw new Error(`${brief.name} session ${s}: no JSON (exit ${r.status}) ${r.stderr.slice(-400)}`); }
      if (out.is_error) throw new Error(`${brief.name} session ${s}: ${String(out.result).slice(0, 300)}`);
      writeFileSync(file, `${out.result}\n`);
      ledger.push({ brief: brief.name, session: s, costUsd: out.total_cost_usd ?? null });
      console.log(JSON.stringify(ledger[ledger.length - 1]));
    }
  }
  const path = join(LOCAL, 'screen', 'ledger.json');
  const prior = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : [];
  writeFileSync(path, `${JSON.stringify([...prior, ...ledger], null, 2)}\n`);
}

/** Ordinary build vocabulary: experiment B's plugin exports and build transcripts. */
export function background() {
  const runs = join(LOCAL_B, 'runs');
  const dirs = [join(LOCAL_B, 'plugins', 'toolkit'), join(LOCAL_B, 'plugins', 'skill-creator')];
  if (existsSync(runs)) for (const d of readdirSync(runs)) dirs.push(join(runs, d, 'stream.jsonl').replace(/stream\.jsonl$/, ''));
  return backgroundWords(dirs);
}

export function matchScreen(cases, briefs, screenTexts, bg) {
  const briefWords = briefs.map((b) => b.text).join('\n');
  const index = buildIndex(cases, briefWords, bg);
  const report = {};
  for (const c of cases) report[c.id] = { tokens: index.find((e) => e.id === c.id).tokens, hits: [] };
  for (const { brief, session, text } of screenTexts) {
    for (const hit of findLeaks(text, index)) {
      if (!hit.case) continue;
      report[hit.case].hits.push({ brief, session, kind: hit.kind, evidence: hit.evidence });
    }
  }
  return report;
}

function match(argv) {
  const cases = loadCases(join(LOCAL, 'cases'));
  const briefs = loadBriefs();
  const screenTexts = [];
  for (const b of briefs) {
    const dir = join(LOCAL, 'screen', b.name);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).sort()) screenTexts.push({ brief: b.name, session: f, text: readFileSync(join(dir, f), 'utf8') });
  }
  const report = matchScreen(cases, briefs, screenTexts, background());
  const out = arg(argv, '--out', join(LOCAL, 'screen', 'match.json'));
  writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  const converged = Object.entries(report).filter(([, r]) => r.hits.length > 0);
  for (const [id, r] of Object.entries(report)) {
    const kinds = [...new Set(r.hits.map((h) => `${h.kind}: ${h.evidence}`))];
    console.log(`${id}: ${r.tokens.length} tokens, ${r.hits.length ? 'CONVERGED ' + kinds.join(' | ') : 'clean'}`);
  }
  console.log(`\n${converged.length} of ${cases.length} cases converged. Screen output: ${screenTexts.length} sessions, ${screenTexts.reduce((n, t) => n + words(t.text).length, 0)} words.`);
}

function main(argv) {
  const [command, ...rest] = argv.slice(2);
  if (command === 'run') return runScreen(rest);
  if (command === 'match') return match(rest);
  console.error('usage: node screen.mjs run|match');
  process.exitCode = 2;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv);
