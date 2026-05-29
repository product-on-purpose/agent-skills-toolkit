import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTierReport } from "../../scripts/tier-report.mjs";

const REPO = process.cwd();

test("repo tier-report: declares + satisfies convergent (Silver); no convergent blockers remain", () => {
  const t = computeTierReport(REPO);
  assert.equal(t.tier, "convergent");
  assert.deepEqual(t.satisfies, ["universal", "convergent"]);
  const conv = t.blocked.convergent ?? [];
  assert.equal(conv.length, 0, "no convergent blockers expected at Silver: " + JSON.stringify(conv));
});
