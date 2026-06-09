import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { releaseReport, computeGoNoGo } from "../../scripts/lib/release-report.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const SF = path.join(FIXTURES, "golden/silver-fixture"); // no RELEASE-NOTES, no package.json -> a no-go

// --- B.2: the release-readiness report object ---

test("computeGoNoGo: go iff the gate is clean AND notes present AND versions consistent", () => {
  assert.equal(computeGoNoGo({ gateExit: 0, notesPresent: true, versionConsistent: true }), "go");
  assert.equal(computeGoNoGo({ gateExit: 1, notesPresent: true, versionConsistent: true }), "no-go");
  assert.equal(computeGoNoGo({ gateExit: 0, notesPresent: false, versionConsistent: true }), "no-go");
  assert.equal(computeGoNoGo({ gateExit: 0, notesPresent: true, versionConsistent: false }), "no-go");
});

test("releaseReport: silver-fixture is a no-go (no RELEASE-NOTES) with a populated release block", () => {
  const r = releaseReport(SF);
  assert.equal(r.reportType, "release");
  assert.equal(r.release.goNoGo, "no-go");
  assert.equal(r.release.notesPresent, false);
  assert.equal(typeof r.release.gateExit, "number");
  assert.equal(typeof r.release.versionConsistency.ok, "boolean");
});

test("releaseReport: the go / no-go is a pure function of the deterministic facts (stable across runs)", () => {
  const a = releaseReport(SF).release.goNoGo;
  const b = releaseReport(SF).release.goNoGo;
  assert.equal(a, b);
});
