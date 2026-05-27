import { test } from "node:test";
import assert from "node:assert/strict";
import { runGate } from "../../scripts/check.mjs";
import { computeTierReport } from "../../scripts/tier-report.mjs";

const REPO = process.cwd();

test("the repository seed passes the Bronze gate", () => {
  const r = runGate(REPO);
  assert.equal(r.errorCount, 0, JSON.stringify(r.findings.filter((f) => f.severity === "error"), null, 2));
  assert.equal(r.exitCode, 0);
});

test("the repository reports tier universal with empty blocked", () => {
  const t = computeTierReport(REPO);
  assert.equal(t.tier, "universal");
  assert.deepEqual(t.blocked, {});
});
