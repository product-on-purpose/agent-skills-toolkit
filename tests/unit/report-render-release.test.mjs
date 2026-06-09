import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { releaseReport, computeGoNoGo } from "../../scripts/lib/release-report.mjs";
import { renderMarkdown, renderHtml } from "../../scripts/lib/report-render.mjs";
import { CHECKS } from "../../scripts/lib/registry.mjs";
import { gateExitFromFindings } from "../../scripts/check.mjs";
import { assertNoDashes, assertSelfContainedHtml, assertSnapshot } from "./_report-asserts.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const SF = path.join(FIXTURES, "golden/silver-fixture"); // no RELEASE-NOTES, no package.json -> a no-go
const SNAP_DIR = path.join(FIXTURES, "golden/report-render");
const SPINE = CHECKS.map((m) => ({ reqId: m.meta.reqId, id: m.meta.id, tier: m.meta.tier }));
const CONDITIONAL = new Set(["G1", "G6", "U11"]);

function optsFor(r, target, reportType) {
  const lib = JSON.parse(readFileSync(path.join(target, "library.json"), "utf8"));
  const forGate = r.findings.filter((f) => !f.suppressed).map((f) => ({ ...f, severity: f.effectiveSeverity ?? f.severity }));
  const { exitCode } = gateExitFromFindings(forGate, lib.tier);
  return { library: lib, spine: SPINE, conditional: CONDITIONAL, date: "2026-01-01", exitCode, reportType };
}

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

// --- B.3: the release renderer ---

test("release render: MD and HTML are clean, self-contained, and show the go/no-go", () => {
  const r = releaseReport(SF);
  const o = optsFor(r, SF, "release");
  const md = renderMarkdown(r, o);
  const html = renderHtml(r, o);
  assertNoDashes(md, "release MD");
  assertNoDashes(html, "release HTML");
  assertSelfContainedHtml(html);
  assert.match(md, /NO-GO for release/);
  assert.match(html, /Release readiness: NO-GO/);
});

test("release render: golden MD snapshot", () => {
  const r = releaseReport(SF);
  assertSnapshot(renderMarkdown(r, optsFor(r, SF, "release")), SNAP_DIR, "release-silver.expected.md");
});

test("release render: golden HTML snapshot", () => {
  const r = releaseReport(SF);
  assertSnapshot(renderHtml(r, optsFor(r, SF, "release")), SNAP_DIR, "release-silver.expected.html");
});
