import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { runGate } from "../../scripts/check.mjs";
import { computeTierReport } from "../../scripts/tier-report.mjs";
import { mkdtempSync, writeFileSync, rmSync, cpSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";

// Round-2 adversarial review, high severity: "S4 warn-first findings can be promoted back to
// errors." resolveFindings (scripts/lib/resolve-config.mjs) applied a consumer's askit.config.json
// rules override with HIGHER precedence than the severity chain-contract.mjs emitted, so a plugin
// with `rules.S4 = "error"` could turn the ADR 0041 warn-first string-shaped chain findings back
// into a gate-failing error, from config alone, with zero change to the plugin. This file proves
// the fix: a finding-level migration cap (`migration: { capAt, until, reason }`, emitted only for
// the two string-derived S4 branches) survives resolveFindings as a ceiling on effectiveSeverity
// that no override, profile, or precedence chain can raise past `warn` until Standard 0.13. Every
// test here runs the FULL runGate resolution path (not just resolveFindings in isolation), per the
// finding's explicit ask for end-to-end coverage.

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const MISSING_CONTRACT_ROOT = path.join(FIXTURES, "anti/chain-string-no-contract-rules-error");
const ORPHAN_ROOT = path.join(FIXTURES, "anti/chain-string-orphan-rules-error");

// Both fixtures ship askit.config.json with { profile: "plain-plugin", rules: { S4: "error" } }.
// plain-plugin turns every OTHER house check off, so the S4 finding is the only thing that can gate
// - isolating exactly the variable under test, the same way the reviewer's own reproduction did.
//
// ADR 0044 CHANGED WHAT MAKES THE CAP APPLY, and both fixtures gained `"standard": "0.12"` for it.
// The cap used to be unconditional; it is now one cause of a pin-relative ceiling, active while
// `migration.until` is after the plugin's pin. An UNPINNED plugin therefore has no migration window at
// all - which is not an oversight but ADR 0027's existing back-compat rule, and one of this release's
// four enumerated red-ward paths: a plugin that never declared which contract it adopted cannot be
// graded against the one it adopted. The last test in this file measures exactly that, so the property
// is covered rather than merely asserted in a plan.

test("E2E: string-shaped missing-contract finding, rules.S4 = error: exitCode 0, tier unchanged from the no-override baseline", () => {
  const ctx = loadPlugin(MISSING_CONTRACT_ROOT);
  const withOverride = runGate(MISSING_CONTRACT_ROOT, ctx);
  assert.equal(withOverride.exitCode, 0, "the migration cap must hold the string-shaped finding at warn despite rules.S4 = error");
  assert.equal(withOverride.errorCount, 0);
  const s4 = withOverride.findings.find((f) => f.reqId === "S4");
  assert.ok(s4, "expected an S4 finding");
  assert.equal(s4.effectiveSeverity, "warn", "capped at warn, not the overridden error");
  assert.ok(s4.migrationNotice, "the cap must be surfaced, not silent");

  // "tier unchanged": the SAME fixture, SAME plain-plugin profile, with the S4 override removed -
  // must compute to the identical tier as the run above. If the cap ever leaked, the override run
  // would earn a LOWER tier than this baseline.
  const dir = mkdtempSync(path.join(tmpdir(), "askit-migration-cap-baseline-"));
  try {
    writeFileSync(path.join(dir, "askit.config.json"), JSON.stringify({ profile: "plain-plugin" }));
    const noOverride = runGate(dir, ctx);
    assert.equal(noOverride.exitCode, 0);
    assert.equal(
      computeTierReport(MISSING_CONTRACT_ROOT, ctx, withOverride.findings).tier,
      computeTierReport(dir, ctx, noOverride.findings).tier,
      "the tier earned with rules.S4 = error must equal the tier earned with no S4 override at all"
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E2E: string-shaped orphan finding, rules.S4 = error: exitCode 0", () => {
  const ctx = loadPlugin(ORPHAN_ROOT);
  const r = runGate(ORPHAN_ROOT, ctx);
  assert.equal(r.exitCode, 0, "the migration cap must hold the string-shaped orphan at warn despite rules.S4 = error");
  assert.equal(r.errorCount, 0);
  const s4 = r.findings.find((f) => f.reqId === "S4");
  assert.ok(s4, "expected an S4 orphan finding");
  assert.equal(s4.effectiveSeverity, "warn");
  assert.ok(s4.migrationNotice);
});

test("E2E: the array-shaped equivalent of the missing-contract case still gates at exitCode 1 (the cap does not leak into the untouched array path)", () => {
  const ctx = loadPlugin(MISSING_CONTRACT_ROOT);
  // Mutate the same in-memory ctx from string to array shape - the untouched path per ADR 0041.
  ctx.skills[0].frontmatter.metadata.chain = ["cx-callee"];
  const r = runGate(MISSING_CONTRACT_ROOT, ctx);
  assert.equal(r.exitCode, 1, "an array-shaped declaration was already ERROR before ADR 0041 and must still gate");
  const s4 = r.findings.find((f) => f.reqId === "S4");
  assert.ok(s4);
  assert.equal(s4.effectiveSeverity, "error");
  assert.equal(s4.migrationNotice, null, "the array-shaped path must carry no migration metadata at all");
});

test("E2E: the array-shaped equivalent of the orphan case still gates at exitCode 1 (the cap does not leak into the untouched array path)", () => {
  const ctx = loadPlugin(ORPHAN_ROOT);
  ctx.skills[0].frontmatter.metadata.chain = ["cso-worker"];
  const r = runGate(ORPHAN_ROOT, ctx);
  assert.equal(r.exitCode, 1);
  const s4 = r.findings.find((f) => f.reqId === "S4");
  assert.ok(s4);
  assert.equal(s4.effectiveSeverity, "error");
  assert.equal(s4.migrationNotice, null);
});

// --- ADR 0044: the cap is pin-relative, so an unpinned plugin has no migration window ---------------

test("an UNPINNED plugin gets no migration cap at all, so rules.S4 = error stands and gates", () => {
  // The cap was unconditional before ADR 0044, which meant an unpinned plugin - one that never declared
  // which contract it adopted - silently received a migration window sized for plugins that had. This is
  // a red-ward path and it is deliberate: `isAfter` returns false for a missing pin, so no constraint is
  // active, and the consumer's own `rules.S4 = "error"` is honoured exactly as written.
  const dir = mkdtempSync(path.join(tmpdir(), "askit-unpinned-cap-"));
  try {
    cpSync(MISSING_CONTRACT_ROOT, dir, { recursive: true });
    const libPath = path.join(dir, "library.json");
    const lib = JSON.parse(readFileSync(libPath, "utf8"));
    delete lib.standard;
    writeFileSync(libPath, JSON.stringify(lib, null, 2));

    const r = runGate(dir);
    const s4 = r.findings.find((f) => f.reqId === "S4");
    assert.ok(s4, "expected an S4 finding");
    assert.equal(s4.effectiveSeverity, "error", "no pin means no migration window; the override stands");
    assert.equal(s4.migrationNotice, null, "nothing was capped, so nothing is reported as capped");
    assert.equal(s4.ceiling, null, "no constraint is active, so there is no ceiling to record");
    assert.equal(r.exitCode, 1, "the un-capped error gates");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a pin at or above the cap's `until` LIFTS it, which is what makes the graduation real", () => {
  // The mirror of the test above, and the one that would have caught the inert-graduation defect: at a
  // pin of 0.13 the `until: "0.13"` constraint is no longer active, so the cap lifts and the declared
  // severity (raised by the consumer's own override here) stands.
  const dir = mkdtempSync(path.join(tmpdir(), "askit-lifted-cap-"));
  try {
    cpSync(MISSING_CONTRACT_ROOT, dir, { recursive: true });
    const libPath = path.join(dir, "library.json");
    const lib = JSON.parse(readFileSync(libPath, "utf8"));
    lib.standard = "0.13";
    writeFileSync(libPath, JSON.stringify(lib, null, 2));

    const r = runGate(dir);
    const s4 = r.findings.find((f) => f.reqId === "S4");
    assert.equal(s4.effectiveSeverity, "error", "at pin 0.13 the cap has lifted");
    assert.equal(s4.ceiling, null, "a lifted constraint is not a ceiling");
    assert.equal(r.exitCode, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
