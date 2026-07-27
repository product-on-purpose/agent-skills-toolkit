import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildConditional } from "../../scripts/evaluate.mjs";
import { evaluate } from "../../scripts/evaluate.mjs";
import { renderMarkdown } from "../../scripts/lib/report-render.mjs";
import { CHECKS } from "../../scripts/lib/registry.mjs";
import { gateExitFromFindings } from "../../scripts/check.mjs";
import { readFileSync } from "node:fs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const MINIMAL = path.join(FIXTURES, "golden/minimal-skill");       // no diagrams, no enumerating manifest
const MERMAID_OK = path.join(FIXTURES, "golden/mermaid-ok");       // has valid mermaid diagrams
const SILVER = path.join(FIXTURES, "golden/silver-fixture");       // has enumerating manifest (components.skills)
const SPINE = CHECKS.map((m) => ({ reqId: m.meta.reqId, id: m.meta.id, tier: m.meta.tier }));

function optsFor(r, target, reportType = "conformance") {
  const lib = JSON.parse(readFileSync(path.join(target, "library.json"), "utf8"));
  const forGate = r.findings.filter((f) => !f.suppressed).map((f) => ({ ...f, severity: f.effectiveSeverity ?? f.severity }));
  const { exitCode } = gateExitFromFindings(forGate, lib.tier);
  return { library: lib, spine: SPINE, conditional: buildConditional(target), date: "2026-01-01", exitCode, reportType };
}

// --- RED: buildConditional includes U12 and U13 when artifacts are absent ---

test("buildConditional: includes U12 when target has no mermaid diagrams", () => {
  const cond = buildConditional(MINIMAL);
  assert.ok(cond.has("U12"), "U12 must be in conditional set when no mermaid diagrams exist");
});

test("buildConditional: includes U13 when target has no enumerating manifest", () => {
  const cond = buildConditional(MINIMAL);
  assert.ok(cond.has("U13"), "U13 must be in conditional set when no enumerating manifest exists");
});

// --- Guard: no false N/A when artifacts ARE present ---

test("buildConditional: does NOT include U12 when target has mermaid diagrams", () => {
  const cond = buildConditional(MERMAID_OK);
  assert.ok(!cond.has("U12"), "U12 must NOT be in conditional set when mermaid diagrams exist");
});

test("buildConditional: does NOT include U13 when target has an enumerating manifest", () => {
  const cond = buildConditional(SILVER);
  assert.ok(!cond.has("U13"), "U13 must NOT be in conditional set when enumerating manifest exists");
});

// --- End-to-end: U12 and U13 render N/A in report for minimal-skill ---

test("evaluate + render: U12 renders N/A for a plugin with no mermaid diagrams", () => {
  const r = evaluate(MINIMAL);
  const md = renderMarkdown(r, optsFor(r, MINIMAL));
  assert.match(md, /U12.*N\/A|N\/A.*U12/s, "U12 must appear as N/A in the report");
});

test("evaluate + render: U13 renders N/A for a plugin with no enumerating manifest", () => {
  const r = evaluate(MINIMAL);
  const md = renderMarkdown(r, optsFor(r, MINIMAL));
  assert.match(md, /U13.*N\/A|N\/A.*U13/s, "U13 must appear as N/A in the report");
});

// --- Guard: U12 renders PASS (not N/A) when diagrams exist and are valid ---

test("evaluate + render: U12 renders PASS (not N/A) for a plugin with valid mermaid diagrams", () => {
  const r = evaluate(MERMAID_OK);
  const md = renderMarkdown(r, optsFor(r, MERMAID_OK));
  // The U12 row must not show N/A
  const u12Line = md.split("\n").find((l) => l.includes("U12") && l.includes("|"));
  assert.ok(u12Line, "U12 row must appear in the report table");
  assert.ok(!u12Line.includes("N/A"), "U12 must not render N/A when valid diagrams exist");
});

// --- Guard: U13 renders PASS (not N/A) when enumerating manifest is clean ---

test("evaluate + render: U13 renders PASS (not N/A) for silver-fixture which has components.skills", () => {
  const r = evaluate(SILVER);
  const md = renderMarkdown(r, optsFor(r, SILVER));
  const u13Line = md.split("\n").find((l) => l.includes("U13") && l.includes("|"));
  assert.ok(u13Line, "U13 row must appear in the report table");
  assert.ok(!u13Line.includes("N/A"), "U13 must not render N/A when enumerating manifest exists");
});
