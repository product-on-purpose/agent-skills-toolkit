import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, cpSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SINCE_BY_REQ, applyStandardDowngrade } from "../../scripts/lib/standard-gate.mjs";
import { runGate, gateExitFromFindings } from "../../scripts/check.mjs";
import { CHECKS } from "../../scripts/lib/registry.mjs";

// Proves the ADR 0027 standard-aware downgrade (scripts/lib/standard-gate.mjs) end to end:
// SINCE_BY_REQ matches the spine; applyStandardDowngrade rewrites only post-pin errors to warn and only
// ever error->warn (never the reverse, so it can never turn a passing plugin into a failing one); the
// downgrade composes with the declared-tier ceiling so the gate exit flips with the pin; the toolkit's
// own gate is unchanged (it pins current, so nothing downgrades); and a real plugin tree pinned below a
// check's `since` passes with a warn where it would otherwise gate-fail.

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FIXTURES = path.join(REPO_ROOT, "tests/fixtures");
const f = (severity, reqId, extra = {}) => ({ check: "x", severity, message: "m", file: null, reqId, ...extra });

test("SINCE_BY_REQ covers every spine reqId; the five ADR 0024 checks are 0.10, the rest baseline", () => {
  assert.equal(Object.keys(SINCE_BY_REQ).length, 29);
  for (const r of ["U12", "G7", "G8", "G9", "G10"]) assert.equal(SINCE_BY_REQ[r], "0.10", `${r} should be 0.10`);
  for (const r of ["U1", "U8", "S1", "G1", "G6"]) assert.equal(SINCE_BY_REQ[r], "0.x", `${r} should be baseline`);
});

test("applyStandardDowngrade leaves a baseline (0.x) error alone for any pin", () => {
  const [out] = applyStandardDowngrade([f("error", "U1")], "0.9");
  assert.equal(out.severity, "error");
  assert.equal(out.downgraded, undefined);
});

test("applyStandardDowngrade rewrites a post-pin error to warn and stamps provenance", () => {
  const input = [f("error", "G10")];
  const [out] = applyStandardDowngrade(input, "0.9");
  assert.equal(out.severity, "warn");
  assert.equal(out.downgraded, true);
  assert.equal(out.since, "0.10");
  assert.equal(out.pinned, "0.9");
  assert.equal(input[0].severity, "error", "must not mutate the input array");
});

test("applyStandardDowngrade does NOT downgrade when the pin equals the check's since (boundary)", () => {
  const [out] = applyStandardDowngrade([f("error", "G10")], "0.10");
  assert.equal(out.severity, "error"); // 0.10 is not AFTER 0.10
});

test("applyStandardDowngrade does NOT downgrade with no pin or a forward pin (back-compat / full strength)", () => {
  assert.equal(applyStandardDowngrade([f("error", "G10")], undefined)[0].severity, "error");
  assert.equal(applyStandardDowngrade([f("error", "G10")], "0.11")[0].severity, "error");
  assert.equal(applyStandardDowngrade([f("error", "G10")], "latest")[0].severity, "error"); // garbage pin
});

test("applyStandardDowngrade never touches a warn (it only ever relaxes error->warn)", () => {
  const [out] = applyStandardDowngrade([f("warn", "G10")], "0.9");
  assert.equal(out.severity, "warn");
  assert.equal(out.downgraded, undefined);
});

test("pinning the BASELINE sentinel '0.x' in library.json is not a back door: a 0.10 error still gates", () => {
  const [out] = applyStandardDowngrade([f("error", "G10")], "0.x");
  assert.equal(out.severity, "error", "the '0.x' sentinel is not a real pin; grade at full strength");
  assert.equal(out.downgraded, undefined);
});

test("downgrade composes with the tier ceiling: the gate exit flips with the pin (synthetic)", () => {
  // An advanced (G10) error: gates at advanced when pinned current, drops out when pinned below its since.
  const adv = [f("error", "G10")];
  assert.equal(gateExitFromFindings(applyStandardDowngrade(adv, "0.11"), "advanced").exitCode, 1);
  assert.equal(gateExitFromFindings(applyStandardDowngrade(adv, "0.9"), "advanced").exitCode, 0);
  // A universal (U12) error: gates at every tier when pinned current, drops out when pinned below its since.
  const uni = [f("error", "U12")];
  assert.equal(gateExitFromFindings(applyStandardDowngrade(uni, "0.11"), "universal").exitCode, 1);
  assert.equal(gateExitFromFindings(applyStandardDowngrade(uni, "0.9"), "universal").exitCode, 0);
});

test("the toolkit's own gate is unchanged: Advanced 0/0 with zero downgraded findings (dogfood)", () => {
  const r = runGate(REPO_ROOT);
  assert.equal(r.exitCode, 0);
  assert.equal(r.errorCount, 0);
  assert.ok(!r.findings.some((x) => x.downgraded), "no finding is downgraded (toolkit pins current; every since <= 0.11)");
});

test("a real plugin tree pinned below a check's since passes with a warn, but gate-fails when re-pinned to current", () => {
  // Build a minimal valid universal plugin (clone of golden/minimal-skill) with ONE broken mermaid block,
  // so U12 (since 0.10, universal) is the sole gating defect. Done in a temp dir because U12 scans
  // tests/fixtures/** too, so a committed broken diagram would break the toolkit's own gate.
  const dir = mkdtempSync(path.join(tmpdir(), "askit-std-"));
  try {
    cpSync(path.join(FIXTURES, "golden/minimal-skill"), dir, { recursive: true });
    // A structurally broken mermaid block: no recognized diagram keyword and unbalanced brackets.
    writeFileSync(path.join(dir, "diagram.md"), "# Diagram\n\n```mermaid\nnotadiagram [[[\n```\n");
    const libPath = path.join(dir, "library.json");
    const lib = JSON.parse(readFileSync(libPath, "utf8"));

    lib.standard = "0.9";
    writeFileSync(libPath, JSON.stringify(lib, null, 2));
    const old = runGate(dir);
    const u12 = old.findings.find((x) => x.reqId === "U12");
    assert.ok(u12, "U12 fires on the broken mermaid block");
    assert.equal(u12.severity, "warn", "pinned 0.9: U12 is downgraded to warn");
    assert.equal(u12.downgraded, true);
    assert.equal(old.exitCode, 0, "pinned 0.9: the downgraded U12 does not gate");

    lib.standard = "0.11";
    writeFileSync(libPath, JSON.stringify(lib, null, 2));
    const cur = runGate(dir);
    const u12cur = cur.findings.find((x) => x.reqId === "U12");
    assert.equal(u12cur.severity, "error", "pinned 0.11: U12 gates as an error");
    assert.ok(!u12cur.downgraded);
    assert.equal(cur.exitCode, 1, "pinned 0.11: the same defect gate-fails");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
