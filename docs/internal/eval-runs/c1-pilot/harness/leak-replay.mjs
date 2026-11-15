// Replays experiment B's nine real build attempts under alternative leak rules, so the outcome record can
// say what each rule would have decided, and checks which programs the builds' shell commands ran.
//
//   node leak-replay.mjs <runs-dir> <out.json>
//
// Rules replayed, all over the same files `leak.mjs` searches:
//   run-only    - the pre-registered 8-word verbatim-run rule alone, with no token rule
//   fixed       - what the real run used: 8-word runs plus the tokens fixed in leak-tokens.json (fact 23)
//   literal     - 8-word runs plus tokens read without fact 23's background filter: a word of at least four
//                 letters in one case's prompt, in no other case's prompt and nowhere in the briefs
//   provenance  - the rule drafted for experiment B2, section 3.3: a "fixed" hit counts only when some piece
//                 of its evidence first appears, across ALL of the build's transcripts ordered by timestamp,
//                 in a tool result or in a session's opening prompt. Text the model wrote first is convergence
//
// For each rule it applies section 6 and section 8's rebuild rule to the recorded attempts: an attempt with
// a hit is voided, the rebuild is used if there is one, and a second hit is a failed build. A brief is
// invalid if either arm failed. The replay can only use attempts that exist, so where a rule would have kept
// a first attempt, the rebuild that was actually run is ignored.

import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIndex, loadCases, briefText, checkRun } from './leak.mjs';
import { parseEntries, classify } from './leak-trace.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PREREG = resolve(HERE, '..', '..', 'prereg_experiment-b-c1-pilot-20261105.md');
const ORDER = [
  ['migration-risk-review', 'toolkit'], ['migration-risk-review', 'skill-creator'],
  ['postmortem-from-notes', 'skill-creator'], ['postmortem-from-notes', 'toolkit'],
  ['acceptance-criteria-writer', 'toolkit'], ['acceptance-criteria-writer', 'skill-creator'],
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

/** Every transcript entry in a run, across all .jsonl files, in timestamp order. */
function timeline(runDir) {
  const all = [];
  for (const path of walk(runDir).filter((p) => p.endsWith('.jsonl'))) {
    const isParent = resolve(path) === resolve(join(runDir, 'stream.jsonl'));
    const list = parseEntries(readFileSync(path, 'utf8'));
    list.forEach(({ i, e, raw }) => {
      const kind = classify(e);
      if (!kind) return;
      // The parent's first user turn is the harness's build prompt; every other opening prompt was not
      // written by the harness, so under section 3.3 it is a hit unless the model wrote the text earlier.
      const harnessPrompt = isParent && kind === 'prompt' && i === list.findIndex((x) => classify(x.e) === 'prompt');
      all.push({ ts: Date.parse(e.timestamp ?? '') || null, file: path.slice(runDir.length + 1), i, kind: harnessPrompt ? 'harness-prompt' : kind, raw });
    });
  }
  // Entries without a timestamp keep file order and sort after timestamped ones; count them for the record.
  all.sort((a, b) => (a.ts ?? Infinity) - (b.ts ?? Infinity) || a.file.localeCompare(b.file) || a.i - b.i);
  return all;
}

function provenanceHits(runDir, fixedHits) {
  const line = timeline(runDir);
  const untimed = line.filter((x) => x.ts === null).length;
  const counted = [];
  for (const h of fixedHits) {
    const pieces = h.kind === 'tokens' ? h.evidence.split(', ') : [h.evidence];
    const origins = pieces.map((p) => {
      const first = line.find((x) => x.raw.includes(p));
      return { piece: p, kind: first?.kind ?? 'unresolved', file: first?.file ?? null };
    });
    const counts = origins.some((o) => o.kind === 'read' || o.kind === 'prompt' || o.kind === 'unresolved');
    if (counts) counted.push({ ...h, origins });
  }
  return { hits: counted, untimed };
}

// Programs a shell command could fetch with. Broader than leak-trace.mjs's NETWORK pattern on purpose.
const NET_EXTRA = /\b(httpx|http\.request|https\.request|urlopen|socket\.(socket|create_connection)|\/dev\/tcp|aiohttp|axios|undici|nc|ncat|telnet|ftp|scp|rsync)\b/i;

function programs(runDir) {
  const seen = {};
  const extra = [];
  for (const path of walk(runDir).filter((p) => p.endsWith('.jsonl'))) {
    for (const { e } of parseEntries(readFileSync(path, 'utf8'))) {
      if (e.type !== 'assistant' || !Array.isArray(e.message?.content)) continue;
      for (const c of e.message.content) {
        if (c.type !== 'tool_use' || c.name !== 'Bash') continue;
        const cmd = String(c.input?.command ?? '');
        // Drop heredoc bodies, which are file contents rather than commands.
        const code = cmd.replace(/<<-?\s*['"]?(\w+)['"]?[^\n]*\n[\s\S]*?\n\s*\1\b/g, '');
        for (const seg of code.split(/\n|;|&&|\|\||\||\$\(|`/)) {
          const parts = seg.trim().split(/\s+/).filter((w) => !/^\w+=/.test(w));
          let prog = parts[0];
          if (!prog || /^[#)}\]'"]/.test(prog)) continue;
          if (['sudo', 'timeout', 'env', 'nohup', 'time'].includes(prog)) prog = parts.find((w, k) => k > 0 && !/^-/.test(w) && !/^\d/.test(w)) ?? prog;
          prog = prog.replace(/^.*\//, '');
          seen[prog] = (seen[prog] ?? 0) + 1;
        }
        const m = code.match(NET_EXTRA);
        if (m) extra.push({ matched: m[0], context: code.slice(Math.max(0, m.index - 60), m.index + 60).replace(/\s+/g, ' ') });
      }
    }
  }
  return { programs: seen, networkLike: extra };
}

function decide(attemptHits) {
  // attemptHits: { [brief/arm]: [hitsOnFirstAttempt, hitsOnRebuild | undefined] }
  const builds = {};
  for (const [brief, arm] of ORDER) {
    const [first, rebuild] = attemptHits[`${brief}/${arm}`];
    if (first === 0) builds[`${brief}/${arm}`] = 'first attempt kept';
    else if (rebuild === undefined) builds[`${brief}/${arm}`] = 'voided, but no rebuild was run under this rule';
    else builds[`${brief}/${arm}`] = rebuild === 0 ? 'rebuild kept' : 'failed build';
  }
  const briefs = {};
  for (const brief of new Set(ORDER.map(([b]) => b))) {
    briefs[brief] = ['toolkit', 'skill-creator'].some((a) => builds[`${brief}/${a}`] === 'failed build') ? 'invalid' : 'valid (unscored)';
  }
  const valid = Object.values(briefs).filter((v) => v.startsWith('valid')).length;
  return { builds, briefs, outcome: valid < 2 ? 'R3 void' : 'scorable' };
}

function main() {
  const [runsDir, outPath] = process.argv.slice(2);
  if (!runsDir || !outPath) throw new Error('usage: node leak-replay.mjs <runs-dir> <out.json>');
  const cases = loadCases();
  const briefs = briefText(readFileSync(PREREG, 'utf8'));
  const fixed = JSON.parse(readFileSync(join(HERE, 'leak-tokens.json'), 'utf8'));
  const fixedIndex = buildIndex(cases, briefs, new Set(), fixed);
  const literalIndex = buildIndex(cases, briefs, new Set(), null);
  const runOnlyIndex = fixedIndex.map((e) => ({ ...e, tokens: [] }));

  const perRun = {};
  for (const [brief, arm] of ORDER) {
    for (const suffix of ['', '-rebuild']) {
      const id = `real-${brief}-${arm}${suffix}`;
      const dir = join(runsDir, id);
      if (!existsSync(dir)) continue;
      const fixedHits = checkRun(dir, fixedIndex).hits;
      const prov = provenanceHits(dir, fixedHits);
      perRun[id] = {
        runOnly: checkRun(dir, runOnlyIndex).hits.length,
        fixed: fixedHits.length,
        literal: checkRun(dir, literalIndex).hits.length,
        provenance: prov.hits.length,
        provenanceHits: prov.hits,
        untimedEntries: prov.untimed,
        ...programs(dir),
      };
    }
  }
  const rules = {};
  for (const rule of ['runOnly', 'fixed', 'literal', 'provenance']) {
    const attemptHits = {};
    for (const [brief, arm] of ORDER) {
      const first = perRun[`real-${brief}-${arm}`]?.[rule];
      const rebuild = perRun[`real-${brief}-${arm}-rebuild`]?.[rule];
      attemptHits[`${brief}/${arm}`] = [first, rebuild];
    }
    rules[rule] = decide(attemptHits);
  }
  const literalTokens = Object.fromEntries(literalIndex.map((e) => [e.id, e.tokens.length]));
  writeFileSync(outPath, `${JSON.stringify({ perRun, rules, literalTokenCounts: literalTokens }, null, 2)}\n`);

  for (const [id, r] of Object.entries(perRun)) {
    console.log(`${id}: run-only ${r.runOnly}, fixed ${r.fixed}, literal ${r.literal}, provenance ${r.provenance}, untimed entries ${r.untimedEntries}, network-like ${r.networkLike.length}`);
    for (const h of r.provenanceHits) console.log(`    provenance hit ${h.kind} ${h.case}: ${JSON.stringify(h.origins)}`);
    for (const n of r.networkLike) console.log(`    network-like "${n.matched}": ...${n.context}...`);
  }
  for (const [rule, d] of Object.entries(rules)) console.log(`\n${rule}: ${d.outcome} | ${JSON.stringify(d.briefs)}\n  ${JSON.stringify(d.builds)}`);
  const progs = {};
  for (const r of Object.values(perRun)) for (const [p, n] of Object.entries(r.programs)) progs[p] = (progs[p] ?? 0) + n;
  console.log(`\nDistinct programs across all Bash calls (${Object.keys(progs).length}):\n  ${Object.entries(progs).sort((a, b) => b[1] - a[1]).map(([p, n]) => `${p}:${n}`).join(' ')}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
