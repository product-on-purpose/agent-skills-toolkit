import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { evaluate, applyAdvisory } from "../../scripts/evaluate.mjs";
import { renderMarkdown, renderHtml } from "../../scripts/lib/report-render.mjs";
import { CHECKS } from "../../scripts/lib/registry.mjs";
import { gateExitFromFindings } from "../../scripts/check.mjs";
import { assertNoDashes, assertSelfContainedHtml, assertSnapshot } from "./_report-asserts.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const SF = path.join(FIXTURES, "golden/silver-fixture");
const SNAP_DIR = path.join(FIXTURES, "golden/report-render");
const SPINE = CHECKS.map((m) => ({ reqId: m.meta.reqId, id: m.meta.id, tier: m.meta.tier }));
const CONDITIONAL = new Set(["G1", "G6", "U11"]);

function optsFor(r, target, reportType) {
  const lib = JSON.parse(readFileSync(path.join(target, "library.json"), "utf8"));
  const forGate = r.findings.filter((f) => !f.suppressed).map((f) => ({ ...f, severity: f.effectiveSeverity ?? f.severity }));
  const { exitCode } = gateExitFromFindings(forGate, lib.tier);
  return { library: lib, spine: SPINE, conditional: CONDITIONAL, date: "2026-01-01", exitCode, reportType };
}

// A frozen behavioral object. These are produced by an LLM layer (askit-quality-grader) at runtime; the
// test injects a fixed one so the renderer (a pure projection) is what is under test.
function behavioralObject() {
  return {
    ...evaluate(SF),
    reportType: "behavioral",
    behavioral: {
      model: "claude-opus-4-8",
      effort: "medium",
      date: "2026-01-01",
      cases: [
        { kind: "trigger", id: "fires-on-do-thing", expected: "fires", observed: "fired", verdict: "pass", evidence: "matched the use-when trigger" },
        { kind: "trigger", id: "no-fire-on-unrelated", expected: "no fire", observed: "fired", verdict: "fail", evidence: "over-triggered on an unrelated query" },
        { kind: "behavior", id: "produces-structured-thing", expected: "a structured result", observed: "a structured result", verdict: "pass", evidence: "output matched the expected shape" },
      ],
      summary: { fired: 2, missed: 0, behaviorPass: 1, behaviorFail: 0 },
    },
  };
}

test("behavioral render: cases and summary render, labeled advisory, with a model stamp", () => {
  const r = behavioralObject();
  const o = optsFor(r, SF, "behavioral");
  const md = renderMarkdown(r, o);
  const html = renderHtml(r, o);
  assertNoDashes(md, "behavioral MD");
  assertNoDashes(html, "behavioral HTML");
  assertSelfContainedHtml(html);
  assert.match(md, /advisory/i);
  assert.ok(md.includes("claude-opus-4-8"), "the generating model is stamped");
  assert.ok(md.includes("fires-on-do-thing") && md.includes("no-fire-on-unrelated"), "the cases render");
});

test("behavioral render: the advisory layer never moves the deterministic grade", () => {
  const r = behavioralObject();
  const md = renderMarkdown(r, optsFor(r, SF, "behavioral"));
  assert.match(md, /Grade earned \| Silver \(Convergent\)/, "the gate-derived grade is preserved in the masthead");
  assert.equal(r.tier, "convergent", "the source tier is the gate's, unchanged by the behavioral pass");
});

test("behavioral: a hostile advisory cannot overwrite the gate tier, findings, or the masthead grade (applyAdvisory allowlist)", () => {
  const base = evaluate(SF);
  const hostile = { behavioral: { model: "x", effort: "low", date: "2026-01-01", cases: [], summary: { fired: 0, missed: 0, behaviorPass: 0, behaviorFail: 0 } }, tier: "advanced", findings: [], byRule: {}, summary: { errors: 0, warns: 0 }, satisfies: ["advanced"], blocked: {} };
  const r = applyAdvisory(base, "behavioral", hostile);
  assert.equal(r.tier, base.tier, "the advisory cannot overwrite the gate tier");
  assert.equal(r.findings.length, base.findings.length, "the advisory cannot overwrite the gate findings");
  const md = renderMarkdown(r, optsFor(r, SF, "behavioral"));
  assert.match(md, /Grade earned \| Silver \(Convergent\)/, "the masthead grade is the gate's, not laundered to Gold");
  assert.ok(!md.includes("Gold (Advanced)"), "the advisory did not flip the grade to Gold");
});

test("behavioral render: golden MD snapshot", () => {
  const r = behavioralObject();
  assertSnapshot(renderMarkdown(r, optsFor(r, SF, "behavioral")), SNAP_DIR, "behavioral-silver.expected.md");
});

test("behavioral render: golden HTML snapshot", () => {
  const r = behavioralObject();
  assertSnapshot(renderHtml(r, optsFor(r, SF, "behavioral")), SNAP_DIR, "behavioral-silver.expected.html");
});
