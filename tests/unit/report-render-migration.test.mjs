import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { migrateReport } from "../../scripts/lib/migrate-report.mjs";
import { renderMarkdown, renderHtml } from "../../scripts/lib/report-render.mjs";
import { CHECKS } from "../../scripts/lib/registry.mjs";
import { gateExitFromFindings } from "../../scripts/check.mjs";
import { assertNoDashes, assertSelfContainedHtml, assertSnapshot } from "./_report-asserts.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const SF = path.join(FIXTURES, "golden/silver-fixture"); // convergent (Silver), blocked from Gold by G2/G4/G5
const SNAP_DIR = path.join(FIXTURES, "golden/report-render");
const SPINE = CHECKS.map((m) => ({ reqId: m.meta.reqId, id: m.meta.id, tier: m.meta.tier }));
const CONDITIONAL = new Set(["G1", "G6", "U11"]);

function optsFor(r, target, reportType) {
  const lib = JSON.parse(readFileSync(path.join(target, "library.json"), "utf8"));
  const forGate = r.findings.filter((f) => !f.suppressed).map((f) => ({ ...f, severity: f.effectiveSeverity ?? f.severity }));
  const { exitCode } = gateExitFromFindings(forGate, lib.tier);
  return { library: lib, spine: SPINE, conditional: CONDITIONAL, date: "2026-01-01", exitCode, reportType };
}

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

test("migrateReport: an invalid targetTier throws instead of producing an empty plan", () => {
  assert.throws(() => migrateReport(SF, { targetTier: "bogus" }), /invalid targetTier/);
});

// --- B.3: the migration renderer ---

test("migration render: MD and HTML are clean, self-contained, and show the staged plan", () => {
  const r = migrateReport(SF, { targetTier: "advanced" });
  const o = optsFor(r, SF, "migration");
  const md = renderMarkdown(r, o);
  const html = renderHtml(r, o);
  assertNoDashes(md, "migration MD");
  assertNoDashes(html, "migration HTML");
  assertSelfContainedHtml(html);
  assert.match(md, /staged ladder from Silver to Gold/);
  assert.ok(["G2", "G4", "G5"].every((id) => md.includes(id)), "the Gold blockers appear in the plan");
});

test("migration render: golden MD snapshot", () => {
  const r = migrateReport(SF, { targetTier: "advanced" });
  assertSnapshot(renderMarkdown(r, optsFor(r, SF, "migration")), SNAP_DIR, "migration-silver-to-gold.expected.md");
});

test("migration render: golden HTML snapshot", () => {
  const r = migrateReport(SF, { targetTier: "advanced" });
  assertSnapshot(renderHtml(r, optsFor(r, SF, "migration")), SNAP_DIR, "migration-silver-to-gold.expected.html");
});
