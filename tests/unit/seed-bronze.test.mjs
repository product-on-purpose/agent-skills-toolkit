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

test("the repository reports tier universal (S-checks in blocked.convergent do not affect the gate)", () => {
  const t = computeTierReport(process.cwd());
  assert.equal(t.tier, "universal");
  // blocked.convergent now lists only the remaining Silver climb item (S3 components-index);
  // S1 (agent-targets) is closed in Phase 3B; S6 (per-target-presence) passes.
  const conv = t.blocked.convergent ?? [];
  assert.ok(conv.some((s) => s.startsWith("S3")), "S3 expected in blocked.convergent");
  assert.ok(!conv.some((s) => s.startsWith("S1")), "S1 should be closed (agent-targets declared)");
});
