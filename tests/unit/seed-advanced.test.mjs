import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTierReport } from "../../scripts/tier-report.mjs";

const REPO = process.cwd();

// The toolkit self-validates at Gold: it declares tier advanced and passes G1-G7 (plus all
// Bronze + Silver checks), so tier-report satisfies every tier with an empty burndown.
test("repo tier-report: declares + satisfies Advanced (Gold); no blockers remain", () => {
  const t = computeTierReport(REPO);
  assert.equal(t.tier, "advanced");
  assert.deepEqual(t.satisfies, ["universal", "convergent", "advanced"]);
  assert.deepEqual(t.blocked, {}, "no blockers expected at Gold: " + JSON.stringify(t.blocked));
});
