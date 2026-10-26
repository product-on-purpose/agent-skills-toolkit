import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin, looksLikePlugin } from "../../scripts/lib/load-plugin.mjs";
import { runGate } from "../../scripts/check.mjs";
import { computeTierReport } from "../../scripts/tier-report.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
// `tests/fixtures/golden/root-skill-plugin/`: a SKILL.md at the plugin root plus `.claude-plugin/
// plugin.json`, nothing else - no `skills/` directory and no `skills` key. The vendor's own manifest
// and CLI references (read 2026-10-23) say this shape loads as a single skill at runtime, and that
// `claude plugin validate` does not check a root-level SKILL.md at all (confirmed live: validation
// passes with only the unrelated author/icon warnings, never mentioning the skill).
const ROOT = path.join(FIXTURES, "golden/root-skill-plugin");

// E88 (root-level SKILL.md plugin shape that `claude plugin validate` skips): this toolkit's own
// loader has the SAME gap as the vendor's validator, for the same reason - `listSkillDirs` in
// `scripts/lib/fs-utils.mjs` reads only `skills/<name>/SKILL.md`. These tests PIN the current,
// known-wrong behaviour rather than fix it (E88 is filed as "measurement needed" before any code
// change). A future fix that teaches the loader this shape must flip every assertion below
// deliberately, not accidentally.
test("E88: a root-level SKILL.md plugin is not recognised as holding a skill", () => {
  const ctx = loadPlugin(ROOT);
  // The runtime loads one skill here; this loader finds zero. That gap is the entry's whole point.
  assert.equal(ctx.skills.length, 0);
});

test("E88: the root-level-SKILL.md shape does not even register as plugin-shaped", () => {
  // looksLikePlugin() asks for library.json, AGENTS.md, or a skills/ directory (Standard sec 3.1
  // layout assumptions). None of the three is present here, so a plugin a real user could install
  // and run is, by this toolkit's own shape test, not a plugin at all.
  assert.equal(looksLikePlugin(ROOT), false);
});

test("E88: the full gate grades this fixture as if it had zero skills and no library.json", () => {
  const ctx = loadPlugin(ROOT);
  const gate = runGate(ROOT, ctx);
  const tier = computeTierReport(ROOT, ctx, gate.findings).tier;
  // Without library.json (this fixture deliberately has none - E88's shape is root SKILL.md + a
  // native manifest only) the gate falls back to grading it as an askit library against the full
  // Universal ladder, which is why U1 (library.json missing) and U2 (AGENTS.md missing) both fire
  // as errors here. That is the CURRENT behaviour being pinned, not the recommended one.
  assert.equal(tier, "none");
  assert.ok(gate.errorCount >= 2, `expected at least 2 errors (U1, U2), got ${gate.errorCount}`);
  const reqIds = gate.findings.filter((f) => f.severity === "error").map((f) => f.reqId);
  assert.ok(reqIds.includes("U1"), "library-json (U1) should fire: no library.json at the root");
  assert.ok(reqIds.includes("U2"), "anatomy (U2) should fire: no AGENTS.md at the root");
});
