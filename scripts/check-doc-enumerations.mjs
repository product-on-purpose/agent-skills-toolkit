#!/usr/bin/env node
// what-it-is:   the guard for a COMPLETENESS claim about the check spine made in prose
// what-it-does: expands every reqId range list in the governed public docs and compares the
//               expansion against scripts/lib/registry.mjs, the one place the spine is real
// why:          v1.15.0 fixed docs/reference/universal-checks.md, which "had stopped at U13,
//               missing four checks across two releases", and shipped that fix WITHOUT a guard
//               and WITHOUT a sweep. By v1.16.0 the identical staleness was live in seven more
//               public files, README.md among them - where line 219 said the correct
//               "34 checks (U1-U9, U11-U17, S1-S8, G1-G10)" and line 225, six lines later in the
//               same section, said "Bronze - Universal (U1-U9, U11-U13, 12 checks)". The count
//               and its range list AGREED WITH EACH OTHER (9 + 3 = 12), so internal consistency
//               is what hid it; nothing compared either one to the registry. The existing guard,
//               check-readme-version.mjs, could not have caught it: that script scopes itself to
//               README's "## Status" section, and every stale claim sat outside it.
// used-by:      npm test, tests/unit/doc-enumerations.test.mjs
// no-opt-out:   there is deliberately NO per-line exemption marker. Prose that ILLUSTRATES the
//               range syntax will trip this guard - the first draft of scripts/README.md's own
//               inventory entry for this file did exactly that. The fix is to reword the prose,
//               not to add an escape hatch: a false positive here is loud, costs one edit, and
//               fails in CI where someone sees it, whereas an exemption marker is a silent-miss
//               surface that would let a genuinely stale claim be annotated quiet and stay wrong.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { CHECKS } from "./lib/registry.mjs";

const ROOT = process.argv[2] || ".";

// Truth, derived - never a literal. A spine change moves this with no doc edit required.
const TRUTH = { U: new Set(), S: new Set(), G: new Set() };
for (const c of CHECKS) TRUTH[c.meta.reqId[0]].add(Number(c.meta.reqId.slice(1)));
const TIER_NAME = { U: "Universal", S: "Convergent", G: "Advanced" };
const fmt = (s) => [...s].sort((a, b) => a - b).join(",");

// History is append-only and CORRECTLY states the numbers of its own day. A blockquote in these
// docs is a dated version note (STANDARD.md's "> v0.13: ..." lines) and is history too.
const HISTORY_FILES = new Set(["CHANGELOG.md", "RELEASE-NOTES.md"]);
const isHistoryLine = (line) => line.trimStart().startsWith(">");

function governedDocs() {
  const out = execFileSync("git", ["ls-files", "*.md"], { cwd: ROOT, encoding: "utf8" });
  return out.split("\n").map((s) => s.trim()).filter(Boolean).filter((f) =>
    !f.startsWith("docs/internal/") && !f.startsWith("tests/") &&
    !f.startsWith("skills/") && !f.startsWith("templates/") &&
    !HISTORY_FILES.has(f));
}

// Two spellings, because prose uses both. The hyphen form may drop the repeated tier letter
// ("`U1-U9`"); the word form must repeat it, so that "U1 to 5 files" cannot be read as a range.
// A guard that knows only one spelling passes on the other while looking like it checked - the
// glossary said "backed by checks `U1` through `U12`" and the hyphen-only first draft of this
// file reported it clean.
const RANGES = [
  /`?([USG])(\d+)`?\s*-\s*`?[USG]?(\d+)`?/g,
  /`?([USG])(\d+)`?\s+(?:through|to)\s+`?\1(\d+)`?/gi,
];
const COUNT = /(\d+)[- ]check|\b(\d+)\s+checks\b/i;
const COMPLETE = /\bfull\b|\bevery\b|\ball\b/i;

export function scanLine(line) {
  const found = { U: new Set(), S: new Set(), G: new Set() };
  const spans = { U: 0, S: 0, G: 0 };
  let any = false;
  for (const re of RANGES) {
    for (const m of line.matchAll(re)) {
      const [t, a, b] = [m[1].toUpperCase(), Number(m[2]), Number(m[3])];
      if (a > b || b > 40) continue;
      for (let i = a; i <= b; i++) found[t].add(i);
      spans[t] += 1;
      any = true;
    }
  }
  if (!any) return null;
  const tiers = "USG".split("").filter((t) => found[t].size);
  const cm = line.match(COUNT);
  const claimed = cm ? Number(cm[1] ?? cm[2]) : null;

  // Shape 0 - a range that names a reqId the registry does not ship. This needs no guess about
  // whether the author MEANT to be complete: `U10` was retired in Standard v0.11, so no correct
  // Universal range spans it, and "backed by checks `U1` through `U12`" is wrong on its face.
  // Intent-shaped rules (a count, two spans) all missed that line because it is a single span
  // with no number attached; existence catches it, and keeps catching the same mistake after any
  // future retirement without this file being touched.
  const ghosts = [];
  for (const t of tiers) for (const n of found[t]) if (!TRUTH[t].has(n)) ghosts.push(`${t}${n}`);
  if (ghosts.length) {
    return `names ${ghosts.length} check(s) the registry does not ship: ${ghosts.join(", ")}` +
      (ghosts.includes("U10") ? " (U10 was retired in Standard v0.11, so a Universal range may not span it)" : "");
  }

  // Shape 1 - a full-spine list: ranges for all three tiers on one line.
  if (tiers.length === 3) {
    const bad = "USG".split("").filter((t) => fmt(found[t]) !== fmt(TRUTH[t]));
    const total = tiers.reduce((n, t) => n + found[t].size, 0);
    const truth = "USG".split("").reduce((n, t) => n + TRUTH[t].size, 0);
    if (bad.length) {
      return `full-spine list is stale: ${bad.map((t) =>
        `${TIER_NAME[t]} names ${t}${fmt(found[t])} but the registry ships ${t}${fmt(TRUTH[t])}`).join("; ")}` +
        (claimed !== null ? ` (the line claims ${claimed}, its own list expands to ${total}, the registry has ${truth})` : "");
    }
    return null;
  }

  // Shape 2 - a single-tier list that claims to be complete. Completeness is read from the
  // SHAPE the author used, not from English: an author writes two spans for one tier
  // ("`U1-U9`, `U11-U13`") only when spelling out a whole set that has a hole in it - the hole
  // being retired U10. One span ("`U11-U13` - well-formed MCP entries") is a subset by
  // construction and is deliberately not flagged. An earlier draft of this guard tested the line
  // for the words "full"/"every"/"all" instead, and fired on README.md:242 and :252, where
  // "every shipped skill" and "every component" are ordinary prose about the checks' SUBJECT.
  if (tiers.length === 1 && (claimed !== null || spans[tiers[0]] >= 2)) {
    const t = tiers[0];
    if (fmt(found[t]) !== fmt(TRUTH[t])) {
      return `${TIER_NAME[t]} set is stale: names ${t}${fmt(found[t])}, registry ships ${t}${fmt(TRUTH[t])}` +
        (claimed !== null && claimed !== TRUTH[t].size ? `; the line also claims ${claimed} checks, the true count is ${TRUTH[t].size}` : "");
    }
    if (claimed !== null && claimed !== TRUTH[t].size) {
      return `${TIER_NAME[t]} count is stale: claims ${claimed}, registry ships ${TRUTH[t].size}`;
    }
  }
  return null;
}

export function findStaleEnumerations(root = ".") {
  const failures = [];
  for (const rel of governedDocs()) {
    let text;
    try { text = readFileSync(path.join(root, rel), "utf8"); } catch { continue; }
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (isHistoryLine(lines[i])) continue;
      const problem = scanLine(lines[i]);
      if (problem) failures.push(`${rel}:${i + 1}  ${problem}`);
    }
  }
  return failures;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("check-doc-enumerations.mjs")) {
  const failures = findStaleEnumerations(ROOT);
  if (failures.length) {
    process.stderr.write(`check-doc-enumerations: ${failures.length} stale spine claim(s)\n`);
    for (const f of failures) process.stderr.write(`  ${f}\n`);
    process.exit(1);
  }
  process.stdout.write("check-doc-enumerations: every spine claim in the public docs matches the registry.\n");
}
