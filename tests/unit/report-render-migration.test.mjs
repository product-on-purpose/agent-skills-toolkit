import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrateReport } from "../../scripts/lib/migrate-report.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const SF = path.join(FIXTURES, "golden/silver-fixture"); // convergent (Silver), blocked from Gold by G2/G4/G5

// --- B.1: the migration report object ---

test("migrateReport: decorates the conformance object with a migration block", () => {
  const r = migrateReport(SF, { targetTier: "advanced" });
  assert.equal(r.reportType, "migration");
  assert.equal(r.scope, "plugin");
  assert.equal(r.migration.currentTier, "convergent");
  assert.equal(r.migration.targetTier, "advanced");
});

test("migrateReport: stages list each tier from current+1 to target with its blockers", () => {
  const r = migrateReport(SF, { targetTier: "advanced" });
  // silver-fixture is convergent; the only remaining stage is advanced, blocked by G2/G4/G5
  assert.deepEqual(r.migration.stages.map((s) => s.tier), ["advanced"]);
  const adv = r.migration.stages[0];
  assert.deepEqual(adv.blockers.map((b) => b.reqId).sort(), ["G2", "G4", "G5"]);
  assert.ok(adv.blockers.every((b) => b.fixPrompt && b.effort), "each blocker carries a fix prompt and an effort estimate");
});

test("migrateReport: a target equal to the current tier yields no stages", () => {
  const r = migrateReport(SF, { targetTier: "convergent" });
  assert.deepEqual(r.migration.stages, []);
});
