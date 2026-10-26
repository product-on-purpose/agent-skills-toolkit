// what-it-is:   the ADV3 security screen (advisory layer, ADR 0063)
// what-it-does: a deterministic, data-driven pattern screen over the content the runtime loads into an
//               agent's context or executes - skills/** (SKILL.md and its bundled files), agents/*.md,
//               commands/*.md, hooks/** - for three classes of catalogued pattern: pipe-to-shell
//               installers, dangerous commands, and prompt-injection phrases. No scoring, no judgment,
//               no model: every pattern is a plain RegExp compiled from scripts/advisory/security-
//               patterns.json, which carries each pattern's id, class, matcher, cited source and known-
//               limits note. It is a screen, not a safety review, and every finding message says so.
// why:          RS-E4 (docs/internal/roadmap.md), formerly E6 (docs/internal/backlog/enhancements.md),
//               ships as advisory finding ADV3 per ADR 0063 (docs/internal/decisions/0063-...). It is the
//               "objective" row: a pattern whose only basis is this repository's own preference is house
//               provenance and may not enter this catalogue (ADR 0063 sec 2). The scope rule is
//               deliberately narrower than "everything in the repo": docs/ and README files are OUT of
//               scope, because nothing in Claude Code or Codex loads them into an agent's context or
//               executes them - see the ADV3 heading in scripts/advisory/README.md for the committed
//               negative fixture that exercises exactly that exclusion, and the scope-widening mutant
//               that shows the exclusion is load-bearing, not accidental.
// used-by:      registered as advisoryId "ADV3" in scripts/lib/advisory-registry.mjs's ADVISORY_MODULES
//               (once the measured false-positive rate clears the ceiling pre-registered in
//               scripts/advisory/README.md); tests/unit/adv3-security.test.mjs and the fixtures under
//               tests/fixtures/advisory/

import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { finding, SEVERITY } from "../lib/findings.mjs";
import { walkFiles, relPath, SKIP_DIRS } from "../lib/fs-utils.mjs";

export const meta = { advisoryId: "ADV3" };

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CATALOGUE_PATH = path.join(HERE, "security-patterns.json");

// The four fixed scope roots the ADR names (scripts/advisory/README.md's ADV3 heading repeats the same
// rule for a human reader). `opts.scopeRoots` below is NOT an alternative to this list - it is an
// EXTRA set of plugin-root-relative directories walked IN ADDITION, used only by the scope-widening
// mutant test that proves the docs/README exclusion is load-bearing (ADR 0063's RS-E4 criterion 3:
// "you must show it failing under a mutant that widens the scope or loosens the pattern").
const DEFAULT_MAX_BYTES = 1_000_000; // a file larger than this is skipped, never scanned (and never counted)
const MAX_LINE = 4000; // mirrors source-doc.mjs's MAX_LINE: bounds a single pathological line before matching

let cachedCatalogue = null;

/** Load and parse scripts/advisory/security-patterns.json. Cached; `opts.catalogue` on check()/
 * listScanTargets() below bypasses the cache entirely (the injection point the mutation tests use). */
export function loadCatalogue() {
  if (cachedCatalogue) return cachedCatalogue;
  const raw = readFileSync(CATALOGUE_PATH, "utf8");
  cachedCatalogue = JSON.parse(raw);
  return cachedCatalogue;
}

/** Compile one catalogue entry's { source, flags } into a RegExp. Never 'g' or 'y': this module always
 * calls .test() fresh per line, so a stateful flag would only invite a lastIndex bug for no benefit. */
function compile(pattern) {
  const flags = pattern.matcher.flags ?? "";
  if (flags.includes("g") || flags.includes("y")) {
    throw new Error(`ADV3 pattern "${pattern.id}" declares a stateful flag ("${flags}"); only non-stateful flags are allowed.`);
  }
  return new RegExp(pattern.matcher.source, flags);
}

/** True if `abs` (an absolute path known to be inside `root`) has a SKIP_DIRS basename anywhere in its
 * path between `root` and the file - the same generated/dependency/scratch exclusion every other repo-
 * wide content scanner in this toolkit applies (fs-utils.mjs's shared SKIP_DIRS). `walkFiles` itself
 * does not apply this filter (fs-utils.mjs's own docblock: it "knows no plugin root of its own"), so
 * every caller that wants it applies it here. */
function underSkipDir(root, abs) {
  const rel = relPath(root, abs);
  return rel.split("/").some((seg) => SKIP_DIRS.has(seg));
}

/**
 * Read `abs` as a scan candidate, or return null when it fails the deterministic text filter this
 * module's denominator is defined against (scripts/advisory/README.md's ADV3 heading): larger than
 * `maxBytes`, or carrying a NUL byte in its first 8 KiB (the same binary heuristic the Standard's own
 * structure-shaped checks use elsewhere in the field - a null byte never appears in valid UTF-8 text).
 * A file that fails this filter is not scanned and is not counted in the false-positive-rate
 * denominator; it was never a candidate the screen claims to cover.
 */
function readTextCandidate(abs, maxBytes) {
  let buf;
  try {
    if (!statSync(abs).isFile()) return null;
    buf = readFileSync(abs);
  } catch {
    return null;
  }
  if (buf.length > maxBytes) return null;
  const head = buf.subarray(0, 8192);
  if (head.includes(0)) return null;
  return buf.toString("utf8");
}

/**
 * Every in-scope scan target as { abs, rel, content }, deduplicated by absolute path. This is the
 * single source of truth for BOTH what check() scans and what the false-positive-rate denominator
 * counts (scripts/advisory/README.md's ADV3 heading): a measurement script or test that wants "how
 * many files did ADV3 look at" calls this, never a separate glob, so the two numbers cannot drift.
 *
 * Default scope (ADR 0063's ADV3 row, "content the runtime loads into an agent's context or executes"):
 *   - skills/**        every file under each loaded skill's directory (SKILL.md + bundled files)
 *   - agents/*.md      ctx.agentDocs - the RUNTIME-loaded list (recursive, includes README.md and
 *                       underscore-prefixed files - see fs-utils.mjs's listRuntimeAgentDocsNamed),
 *                       never ctx.subagents (the narrower REGISTERED list), because a file the runtime
 *                       loads and executes is in scope regardless of whether the plugin registers it
 *   - commands/*.md    ctx.commands
 *   - hooks/**         every file under hooks/ (hooks.json and any hook script it references)
 *
 * `opts.scopeRoots`: extra plugin-root-relative directories walked IN ADDITION to the four above, with
 * no filtering beyond the same text-candidate check. Never used by the shipped check() default; it
 * exists only for the scope-widening mutant in tests/unit/adv3-security.test.mjs, which widens scope to
 * `docs` to prove the negative-docs fixture's zero findings come from the scope rule and not from a
 * pattern that happens not to match.
 */
export function listScanTargets(ctx, opts = {}) {
  const root = ctx.root;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const out = [];
  const seen = new Set();

  const addFromDisk = (abs) => {
    if (seen.has(abs) || underSkipDir(root, abs)) return;
    seen.add(abs);
    const content = readTextCandidate(abs, maxBytes);
    if (content === null) return;
    out.push({ abs, rel: relPath(root, abs), content });
  };
  const addLoaded = (abs, raw) => {
    if (seen.has(abs) || raw == null) return;
    seen.add(abs);
    out.push({ abs, rel: relPath(root, abs), content: raw });
  };

  for (const skill of ctx.skills ?? []) {
    if (!skill?.dir || !existsSync(skill.dir)) continue;
    for (const abs of walkFiles(skill.dir)) addFromDisk(abs);
  }
  for (const doc of ctx.agentDocs ?? []) addLoaded(doc.file, doc.raw);
  for (const cmd of ctx.commands ?? []) addLoaded(cmd.file, cmd.raw);
  const hooksRoot = path.join(root, "hooks");
  if (existsSync(hooksRoot)) for (const abs of walkFiles(hooksRoot)) addFromDisk(abs);

  for (const extra of opts.scopeRoots ?? []) {
    const dir = path.join(root, extra);
    if (existsSync(dir)) for (const abs of walkFiles(dir)) addFromDisk(abs);
  }

  return out;
}

function buildMessage(pattern, rel) {
  return (
    `deterministic security screen (this is a screen, not a safety review): pattern "${pattern.id}" ` +
    `(class: ${pattern.class}) matched in ${rel}. A screen reports presence of the construct, not intent - ` +
    `see scripts/advisory/security-patterns.json for the matcher, its cited source, and the pattern's ` +
    `known limits.`
  );
}

/**
 * ADV3 (RS-E4): run the catalogue's patterns, line by line, over every in-scope scan target.
 * `opts.catalogue` overrides the shipped catalogue (the mutation tests' injection point: remove one
 * pattern, assert its own seeded fixture stops firing). `opts.scopeRoots` is listScanTargets' own
 * injection point (the scope-widening mutant). Neither is ever set by scripts/lib/advisory-registry.mjs,
 * which calls `mod.check(ctx)` with no second argument - the shipped behaviour always uses the real
 * catalogue and the real (narrower) scope.
 */
export function check(ctx, opts = {}) {
  const catalogue = opts.catalogue ?? loadCatalogue();
  const compiled = catalogue.patterns.map((p) => ({ pattern: p, re: compile(p) }));
  const targets = listScanTargets(ctx, opts);
  const out = [];
  for (const target of targets) {
    const lines = target.content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].length > MAX_LINE ? lines[i].slice(0, MAX_LINE) : lines[i];
      for (const { pattern, re } of compiled) {
        if (re.test(line)) {
          out.push(
            finding("adv3-security-screen", SEVERITY.WARN, buildMessage(pattern, target.rel), {
              file: target.rel,
              line: i + 1,
              key: pattern.id,
            })
          );
        }
      }
    }
  }
  return out;
}
