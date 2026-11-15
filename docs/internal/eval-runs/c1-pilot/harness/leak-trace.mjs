// Traces every leak-check hit in experiment B's real builds to where its evidence first appeared, and
// measures what the leak review needs to know about each build.
//
//   node leak-trace.mjs <runs-dir> <out.json>
//
// For each hit and each piece of evidence (the 8-word run, or each token), it finds the first transcript
// entry containing it and classifies who produced that entry:
//   authored - the model wrote it: assistant text, or the input of a tool call it composed
//   read     - it arrived in a tool result: a file the build read, or a command's output
//   prompt   - the user turn that opened a session: the build prompt, or a nested session's query
// A hit is evidence of access only if some piece first arrives as "read". For a hit found in a nested
// session file, the parent transcript is searched too, because a nested prompt is built from the parent.
//
// It also scans EVERY .jsonl in each run folder (parent, subagents and nested sessions) for tool calls that
// could reach the network, and it counts each build's practice prompts and model-authored characters, so
// the claim that one arm writes more practice text than the other is measured rather than asserted.

import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIndex, loadCases, briefText, checkRun } from './leak.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PREREG = resolve(HERE, '..', '..', 'prereg_experiment-b-c1-pilot-20261105.md');

// Clients and tools that could fetch a file from outside the container. "requests" needs a following "."
// and a word, so the English word at the end of a sentence does not match.
export const NETWORK = /\b(curl|wget|git\s+(clone|fetch|pull|ls-remote)|gh\s+(api|repo|pr|issue)|npm\s+(view|install|i)\b|npx\s|pip3?\s+install|requests\.(get|post)|urllib|fetch\(|https?\.get|WebFetch|WebSearch|\bnc\s|ssh\s)/i;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

export function parseEntries(text) {
  return text.split('\n').filter(Boolean).map((line, i) => {
    try { return { i, e: JSON.parse(line), raw: line.toLowerCase() }; } catch { return null; }
  }).filter(Boolean);
}

export function classify(e) {
  if (e.type === 'assistant') return 'authored';
  if (e.type === 'user') {
    const c = e.message?.content;
    return Array.isArray(c) && c.some((x) => x.type === 'tool_result') ? 'read' : 'prompt';
  }
  return null; // system and result entries echo earlier text, so they are not origins
}

export function firstOrigin(list, needle) {
  for (const { i, e, raw } of list) {
    if (!raw.includes(needle)) continue;
    const kind = classify(e);
    if (kind) return { line: i, kind };
  }
  return null;
}

/** Every tool call in a transcript, as "Name: input", with Bash shown as its command. */
export function toolCalls(list) {
  const calls = [];
  for (const { e } of list) {
    if (e.type !== 'assistant' || !Array.isArray(e.message?.content)) continue;
    for (const c of e.message.content) {
      if (c.type !== 'tool_use') continue;
      calls.push({ name: c.name, text: c.name === 'Bash' ? String(c.input?.command ?? '') : JSON.stringify(c.input ?? {}) });
    }
  }
  return calls;
}

function authoredChars(list) {
  let n = 0;
  for (const { e } of list) {
    if (e.type !== 'assistant' || !Array.isArray(e.message?.content)) continue;
    for (const c of e.message.content) {
      if (c.type === 'text') n += c.text.length;
      if (c.type === 'tool_use') n += JSON.stringify(c.input ?? {}).length;
    }
  }
  return n;
}

function practicePrompts(workDir) {
  if (!existsSync(workDir)) return { files: 0, evalCases: 0, triggerQueries: 0 };
  let evalCases = 0, triggerQueries = 0, files = 0;
  for (const p of walk(workDir)) {
    const rel = relative(workDir, p).replace(/\\/g, '/');
    if (/(^|\/)evals\/[^/]+\/prompt\.md$/.test(rel)) { evalCases += 1; files += 1; }
    if (rel.endsWith('evals/evals.json')) {
      files += 1;
      try { const j = JSON.parse(readFileSync(p, 'utf8')); evalCases += (j.evals ?? j).length ?? 0; } catch { /* unreadable */ }
    }
    if (rel.endsWith('trigger_eval.json')) {
      files += 1;
      try { triggerQueries += JSON.parse(readFileSync(p, 'utf8')).length ?? 0; } catch { /* unreadable */ }
    }
  }
  return { files, evalCases, triggerQueries };
}

export function traceRun(runDir, index) {
  const { hits } = checkRun(runDir, index);
  const transcripts = walk(runDir).filter((p) => p.endsWith('.jsonl'));
  const parentPath = join(runDir, 'stream.jsonl');
  const parent = existsSync(parentPath) ? parseEntries(readFileSync(parentPath, 'utf8')) : [];
  const network = [];
  const callCounts = {};
  let chars = 0;
  for (const path of transcripts) {
    const list = parseEntries(readFileSync(path, 'utf8'));
    chars += authoredChars(list);
    for (const call of toolCalls(list)) {
      callCounts[call.name] = (callCounts[call.name] ?? 0) + 1;
      const m = call.text.match(NETWORK);
      if (m) network.push({ file: relative(runDir, path), tool: call.name, matched: m[0], context: call.text.slice(Math.max(0, m.index - 80), m.index + 80).replace(/\s+/g, ' ') });
    }
  }
  const traced = hits.map((h) => {
    const list = parseEntries(readFileSync(join(runDir, h.file), 'utf8'));
    const pieces = h.kind === 'tokens' ? h.evidence.split(', ') : [h.evidence];
    const origins = pieces.map((piece) => ({
      piece,
      inFile: firstOrigin(list, piece),
      inParent: h.file === 'stream.jsonl' ? null : firstOrigin(parent, piece),
    }));
    const access = origins.some((o) => o.inFile?.kind === 'read' || o.inParent?.kind === 'read');
    return { kind: h.kind, case: h.case, file: h.file.replace(/\\/g, '/'), evidence: h.evidence, origins, access };
  });
  return {
    transcripts: transcripts.length, toolCalls: callCounts, networkCalls: network,
    authoredChars: chars, practice: practicePrompts(join(runDir, 'work')), hits: traced,
  };
}

function main() {
  const [runsDir, outPath] = process.argv.slice(2);
  if (!runsDir || !outPath) throw new Error('usage: node leak-trace.mjs <runs-dir> <out.json>');
  const fixed = JSON.parse(readFileSync(join(HERE, 'leak-tokens.json'), 'utf8'));
  const index = buildIndex(loadCases(), briefText(readFileSync(PREREG, 'utf8')), new Set(), fixed);
  const report = {};
  for (const id of readdirSync(runsDir).filter((d) => d.startsWith('real-')).sort()) report[id] = traceRun(join(runsDir, id), index);
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  for (const [id, r] of Object.entries(report)) {
    const pieces = r.hits.flatMap((h) => h.origins);
    const kinds = pieces.reduce((a, o) => ({ ...a, [o.inFile?.kind ?? 'none']: (a[o.inFile?.kind ?? 'none'] ?? 0) + 1 }), {});
    console.log(`${id}: transcripts ${r.transcripts}, authored chars ${r.authoredChars}, practice ${JSON.stringify(r.practice)}, network calls ${r.networkCalls.length}, hits ${r.hits.length}, access ${r.hits.filter((h) => h.access).length}, evidence origins ${JSON.stringify(kinds)}`);
    for (const n of r.networkCalls) console.log(`    network? ${n.tool} "${n.matched}" in ${n.file}: ...${n.context}...`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
