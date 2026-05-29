import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTierReport } from "../../scripts/tier-report.mjs";

const REPO = process.cwd();

test("repo tier-report: declared universal, satisfies universal, blocked.convergent now lists only S3 (components-index); S1 closed by agent-targets, S6 passes", () => {
  const t = computeTierReport(REPO);
  assert.equal(t.tier, "universal");
  assert.deepEqual(t.satisfies, ["universal"]);
  const blocked = t.blocked.convergent ?? [];
  assert.ok(blocked.some((s) => s.startsWith("S3")), "expected S3 (components-index) in blocked.convergent: " + JSON.stringify(blocked));
  assert.ok(!blocked.some((s) => s.startsWith("S1")), "S1 (agent-targets) should be closed - declared in library.json");
  assert.ok(!blocked.some((s) => s.startsWith("S2")), "S2 (prefix) should NOT block - askit- is set");
  assert.ok(!blocked.some((s) => s.startsWith("S4")), "S4 (chain-contract) should NOT block - no chaining present");
  assert.ok(!blocked.some((s) => s.startsWith("S5")), "S5 (workflow-skills) should NOT block - no workflows present");
  assert.ok(!blocked.some((s) => s.startsWith("S6")), "S6 (per-target-presence) should pass - both native manifests are generated on disk");
});
