import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runGate, gateExitFromFindings } from "../../scripts/check.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const golden = path.join(FIXTURES, "golden/minimal-skill");
const missing = path.join(FIXTURES, "anti/missing-library-json");

test("golden gate passes (exitCode 0, no errors)", () => {
  const r = runGate(golden);
  assert.equal(r.exitCode, 0);
  assert.equal(r.errorCount, 0);
});

test("missing library.json fails the gate (exitCode 1)", () => {
  const r = runGate(missing);
  assert.equal(r.exitCode, 1);
  assert.ok(r.errorCount >= 1);
});

test("warnings alone do not fail the gate", () => {
  const r = runGate(path.join(FIXTURES, "anti/weak-description"));
  assert.equal(r.exitCode, 0);
  assert.ok(r.warnCount >= 1);
});

test("gateExitFromFindings: universal-declared, convergent-only error -> exit 0", () => {
  const findings = [{ check: "x", severity: "error", message: "m", file: null, reqId: "S1" }];
  const { exitCode, errorCount } = gateExitFromFindings(findings, "universal");
  assert.equal(exitCode, 0);
  assert.equal(errorCount, 0);
});

test("gateExitFromFindings: universal-declared, universal error -> exit 1", () => {
  const findings = [{ check: "x", severity: "error", message: "m", file: null, reqId: "U1" }];
  const { exitCode, errorCount } = gateExitFromFindings(findings, "universal");
  assert.equal(exitCode, 1);
  assert.equal(errorCount, 1);
});

test("gateExitFromFindings: no declared tier -> all errors count (back-compat)", () => {
  const findings = [{ check: "x", severity: "error", message: "m", file: null, reqId: "S1" }];
  const { exitCode } = gateExitFromFindings(findings, undefined);
  assert.equal(exitCode, 1);
});

test("gateExitFromFindings: convergent-declared, convergent error -> exit 1", () => {
  const findings = [{ check: "x", severity: "error", message: "m", file: null, reqId: "S1" }];
  const { exitCode } = gateExitFromFindings(findings, "convergent");
  assert.equal(exitCode, 1);
});
