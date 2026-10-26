// what-it-is:   coverage for ADV2 (preload cap), ADR 0063 sec 2; backlog E87
// what-it-does: proves the screen fires at 33 distinct skill names, stays silent at exactly 32 and at
//               33 entries holding one duplicate, reads the RUNTIME agent list (not the registration
//               list), still runs under --profile plain-plugin, and that the firing test can go red
// why:          RS-E4's criterion 2, reused by ADR 0063: "a pattern removed from the catalog stops its
//               fixture firing". A guard that cannot fail is not a guard
// used-by:      npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { check, meta, PRELOAD_CAP, distinctPreloadNames } from "../../scripts/advisory/adv2-preload-cap.mjs";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { computeAdvisoryLayer } from "../../scripts/check.mjs";
import { ADVISORY_MODULES } from "../../scripts/lib/advisory-registry.mjs";

const names = (n) => Array.from({ length: n }, (_, i) => `skill-${i}`);
const yamlList = (arr) => arr.map((n) => `  - ${n}`).join("\n");

function withAgent(skillsYaml, fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-adv2-"));
  try {
    mkdirSync(path.join(dir, "agents"), { recursive: true });
    writeFileSync(
      path.join(dir, "library.json"),
      JSON.stringify({ name: "t", version: "0.1.0", description: "ADV2 fixture.", standard: "0.17", tier: "universal" }, null, 2)
    );
    writeFileSync(
      path.join(dir, "agents", "worker.md"),
      `---\nname: worker\ndescription: An agent preloading skills.\nskills:\n${skillsYaml}\n---\n\nbody\n`
    );
    fn(loadPlugin(dir));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("meta declares ADV2, vendor-cited", () => {
  assert.equal(meta.advisoryId, "ADV2");
  assert.equal(meta.provenance, "vendor-cited");
});

test("PRELOAD_CAP is the vendor's 32", () => {
  assert.equal(PRELOAD_CAP, 32);
});

test("fires at 33 distinct names, naming the count and the names past the 32nd in list order", () => {
  withAgent(yamlList(names(33)), (ctx) => {
    const found = check(ctx);
    assert.equal(found.length, 1);
    assert.match(found[0].message, /33 distinct skills/);
    assert.match(found[0].message, /`skill-32`/, "the 33rd name (0-indexed past the 32nd) is named");
    assert.doesNotMatch(found[0].message, /`skill-31`/, "the 32nd name, which IS preloaded, is not named as overflow");
    assert.equal(found[0].severity, "warn");
  });
});

test("silent at exactly 32 distinct names", () => {
  withAgent(yamlList(names(32)), (ctx) => assert.deepEqual(check(ctx), []));
});

test("silent at 33 ENTRIES with one duplicate (32 distinct names)", () => {
  const thirtyThreeEntriesOneDup = [...names(32), "skill-0"];
  withAgent(yamlList(thirtyThreeEntriesOneDup), (ctx) => assert.deepEqual(check(ctx), []));
});

test("reads the RUNTIME agent list (agentDocs), not only registered subagents - same reason U14 does", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "askit-adv2-runtime-"));
  try {
    mkdirSync(path.join(dir, "agents"), { recursive: true });
    writeFileSync(path.join(dir, "library.json"), JSON.stringify({ name: "t", version: "0.1.0", description: "fixture", standard: "0.17", tier: "universal" }, null, 2));
    writeFileSync(path.join(dir, "agents", "_unsafe.md"), `---\nname: sneaky\ndescription: Hidden behind an underscore prefix.\nskills:\n${yamlList(names(33))}\n---\n\nbody\n`);
    const ctx = loadPlugin(dir);
    assert.deepEqual(ctx.subagents.map((a) => a.name), [], "not registered - the trap U14 also closes");
    const found = check(ctx);
    assert.equal(found.length, 1, "but it IS loaded at runtime, so ADV2 still catches it");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("ADV2 still runs under --profile plain-plugin: it is vendor-cited, not house (ADR 0063 sec 1)", () => {
  withAgent(yamlList(names(33)), (ctx) => {
    const { advisoryFindings } = computeAdvisoryLayer(ctx, { profile: "plain-plugin", advisoryModules: ADVISORY_MODULES });
    assert.ok(advisoryFindings.some((f) => f.advisoryId === "ADV2"), "plain-plugin must not silence a vendor-cited screen");
  });
});

// --- distinctPreloadNames: a value this screen cannot parse must produce no finding, never a crash ---

test("distinctPreloadNames: no skills field, or a non-object frontmatter, is null (not 0)", () => {
  assert.equal(distinctPreloadNames({ name: "a" }), null);
  assert.equal(distinctPreloadNames(null), null);
  assert.equal(distinctPreloadNames("not an object"), null);
});

test("distinctPreloadNames: a non-list `skills` value (the documented shape is a list) is null, not a crash", () => {
  assert.equal(distinctPreloadNames({ skills: "a, b, c" }), null);
  assert.equal(distinctPreloadNames({ skills: { a: true } }), null);
});

test("distinctPreloadNames: a non-string entry is dropped, not treated as a parse failure for the whole field", () => {
  assert.deepEqual(distinctPreloadNames({ skills: ["a", 7, "b", null, "a"] }), ["a", "b"]);
});

test("an unparseable agent frontmatter is another check's finding, not this one's", () => {
  assert.deepEqual(check({ root: "/x", agentDocs: [{ name: "a", file: "/x/agents/a.md", parseError: "bad yaml", frontmatter: null }] }), []);
});

/* ----------------------------------------------------------------------
 * MUTATION PROOF, recorded per RS-E4's criterion 2 ("proven able to fail").
 *
 * Mutant applied to scripts/advisory/adv2-preload-cap.mjs: `distinct.length <= PRELOAD_CAP` changed to
 * `distinct.length < PRELOAD_CAP` (an off-by-one widening the silent range by one), then this file was
 * re-run alone.
 *
 *   BEFORE (correct code): 11 tests, 11 pass, 0 fail.
 *   AFTER  (mutant):       11 tests,  9 pass, 2 fail -
 *     "silent at exactly 32 distinct names" (the fixture that must be silent at the boundary now fired,
 *       because `< 32` treats exactly 32 as already over the cap)
 *     "silent at 33 ENTRIES with one duplicate (32 distinct names)" (33 entries deduplicate to exactly
 *       32 distinct names, the same boundary, so this fixture fired too)
 *
 * The mutant was reverted immediately after capturing this result; `git diff` on
 * scripts/advisory/adv2-preload-cap.mjs is clean.
 * ---------------------------------------------------------------------- */
