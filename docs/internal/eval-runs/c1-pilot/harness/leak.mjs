// The leak check from section 8 step 8 of the pre-registration.
//
//   node leak.mjs <run-dir> [<run-dir> ...] [--json]
//
// A run directory is what `harness.mjs build` writes: `stream.jsonl`, `claude-home/` and `work/`.
// The check searches the transcript, the copied session files and the built skill. A hit is any of:
//   1. the pre-registration's file name;
//   2. a verbatim run of eight or more words from one held-out prompt;
//   3. three distinct tokens from one held-out case.
//
// The pre-registration defines a token as "a word that appears in that case's prompt and nowhere in the
// briefs, such as a specific table name". Read literally, ordinary words such as "deploy" or "Thursday"
// qualify, and any long transcript would hit. So this check also requires a token to be at least four
// characters long and to appear in no other held-out prompt. That keeps the words specific to one case,
// such as table names, personal names and ticket numbers. This reading was fixed before any real build,
// and it was checked against the dry-run builds, which never saw a held-out case (harness README fact 23).

import { readFileSync, readdirSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PILOT = resolve(HERE, '..');
export const PREREG_NAME = 'prereg_experiment-b-c1-pilot-20261105';
const PREREG = join(PILOT, '..', `${PREREG_NAME}.md`);
const RUN_WORDS = 8;
const TOKENS_FOR_HIT = 3;
const MIN_TOKEN_LENGTH = 4;

/** Lower-case words. JSON escapes such as `\n` are turned into spaces first, so they do not join words. */
export function words(text) {
  return text
    .replace(/\\[nrt"\\/]/g, ' ')
    .replace(/\\u[0-9a-fA-F]{4}/g, ' ')
    .toLowerCase()
    .match(/[a-z0-9_]+/g) ?? [];
}

/** The text of section 3's blockquotes: the three briefs as the builders receive them. */
export function briefText(preregText) {
  const start = preregText.indexOf('## 3.');
  const end = preregText.indexOf('## 4.');
  return preregText
    .slice(start, end)
    .split('\n')
    .filter((line) => line.startsWith('>'))
    .join('\n');
}

/** A prompt's body, without its frontmatter. */
export function promptBody(text) {
  const match = text.replace(/\r\n/g, '\n').match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  return match ? match[1] : text;
}

/**
 * Build the search index: for each case, its eight-word runs and its tokens.
 * `cases` is an array of { id, prompt } where prompt is the body text.
 */
export function buildIndex(cases, briefs, background = new Set(), fixedTokens = null) {
  const briefWords = new Set(words(briefs));
  const wordSets = cases.map((c) => new Set(words(c.prompt)));
  return cases.map((c, i) => {
    const promptWords = words(c.prompt);
    const runs = new Set();
    for (let j = 0; j + RUN_WORDS <= promptWords.length; j += 1) runs.add(promptWords.slice(j, j + RUN_WORDS).join(' '));
    const tokens = fixedTokens?.[c.id] ?? [...wordSets[i]].filter(
      (w) =>
        w.length >= MIN_TOKEN_LENGTH &&
        !briefWords.has(w) &&
        !background.has(w) &&
        wordSets.every((other, k) => k === i || !other.has(w)),
    );
    return { id: c.id, runs, tokens };
  });
}

/** Search one text. Returns the hits, each with its kind, case and evidence. */
export function findLeaks(text, index) {
  const hits = [];
  if (text.toLowerCase().includes(PREREG_NAME)) hits.push({ kind: 'file-name', evidence: PREREG_NAME });
  const textWords = words(text);
  const present = new Set(textWords);
  const textRuns = new Set();
  for (let j = 0; j + RUN_WORDS <= textWords.length; j += 1) textRuns.add(textWords.slice(j, j + RUN_WORDS).join(' '));
  for (const entry of index) {
    const run = [...entry.runs].find((r) => textRuns.has(r));
    if (run) hits.push({ kind: 'verbatim-run', case: entry.id, evidence: run });
    const found = entry.tokens.filter((t) => present.has(t));
    if (found.length >= TOKENS_FOR_HIT) hits.push({ kind: 'tokens', case: entry.id, evidence: found.join(', ') });
  }
  return hits;
}

/** Load the 30 held-out prompts. */
export function loadCases(heldOut = join(PILOT, 'held-out')) {
  const cases = [];
  for (const brief of readdirSync(heldOut).sort()) {
    for (const name of readdirSync(join(heldOut, brief)).sort()) {
      const path = join(heldOut, brief, name, 'prompt.md');
      if (existsSync(path)) cases.push({ id: `${brief}/${name}`, prompt: promptBody(readFileSync(path, 'utf8')) });
    }
  }
  return cases;
}

function filesUnder(dir, found = []) {
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) filesUnder(path, found);
    else found.push(path);
  }
  return found;
}

/** The texts a build produced: its transcript, its session files and its built skill. */
export function runTexts(runDir) {
  const paths = [join(runDir, 'stream.jsonl'), ...filesUnder(join(runDir, 'claude-home')), ...filesUnder(join(runDir, 'work', 'skills'))];
  return paths.filter((p) => existsSync(p)).map((path) => ({ path, text: readFileSync(path, 'utf8') }));
}

export function checkRun(runDir, index) {
  const hits = [];
  for (const { path, text } of runTexts(runDir)) {
    for (const hit of findLeaks(text, index)) hits.push({ ...hit, file: path.slice(runDir.length + 1) });
  }
  return { run: runDir, hits };
}

const TOKENS_FILE = join(HERE, 'leak-tokens.json');
const TEXT_FILE = /\.(md|mjs|js|cjs|json|jsonl|py|ya?ml|txt|html|sh)$/i;

/** Every word in the text files under some folders, skipping installed packages. */
export function backgroundWords(dirs) {
  const found = new Set();
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        if (entry !== 'node_modules' && entry !== '.git') walk(path);
      } else if (TEXT_FILE.test(entry) && statSync(path).size < 2e7) {
        for (const w of words(readFileSync(path, 'utf8'))) found.add(w);
      }
    }
  };
  for (const dir of dirs) if (existsSync(dir)) walk(dir);
  return found;
}

/**
 * `node leak.mjs tokens <background-dir> ...` fixes each case's tokens once and writes leak-tokens.json.
 * The background is text a builder sees in an ordinary build that never met a held-out case: both arms'
 * plugins, and dry-run builds, which include Claude Code's own system prompt. A word found there is
 * ordinary build vocabulary, so it cannot be evidence that a case leaked.
 */
function writeTokens(dirs) {
  const index = buildIndex(loadCases(), briefText(readFileSync(PREREG, 'utf8')), backgroundWords(dirs));
  const tokens = Object.fromEntries(index.map((e) => [e.id, e.tokens.sort()]));
  writeFileSync(TOKENS_FILE, `${JSON.stringify(tokens, null, 2)}\n`);
  console.log(`Wrote ${TOKENS_FILE}: ${index.map((e) => e.tokens.length).join(' ')} tokens per case`);
}

function main(argv) {
  if (argv[0] === 'tokens') return writeTokens(argv.slice(1));
  const dirs = argv.filter((a) => !a.startsWith('--'));
  if (!existsSync(TOKENS_FILE)) throw new Error('leak-tokens.json is missing. Run `node leak.mjs tokens <background-dir> ...` first.');
  const fixed = JSON.parse(readFileSync(TOKENS_FILE, 'utf8'));
  const index = buildIndex(loadCases(), briefText(readFileSync(PREREG, 'utf8')), new Set(), fixed);
  const reports = dirs.map((dir) => checkRun(resolve(dir), index));
  if (argv.includes('--json')) {
    console.log(JSON.stringify(reports, null, 2));
  } else {
    for (const r of reports) {
      console.log(`${r.run}: ${r.hits.length === 0 ? 'no hits' : `${r.hits.length} hit(s)`}`);
      for (const h of r.hits) console.log(`  ${h.kind} ${h.case ?? ''} in ${h.file}: ${h.evidence}`);
    }
  }
  process.exitCode = reports.some((r) => r.hits.length > 0) ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main(process.argv.slice(2));
