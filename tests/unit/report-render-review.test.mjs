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
const SF = path.join(FIXTURES, "golden/silver-fixture"); // gate earns Silver; the review must not change that
const SNAP_DIR = path.join(FIXTURES, "golden/report-render");
const SPINE = CHECKS.map((m) => ({ reqId: m.meta.reqId, id: m.meta.id, tier: m.meta.tier }));
const CONDITIONAL = new Set(["G1", "G6", "U11"]);

function optsFor(r, target, reportType) {
  const lib = JSON.parse(readFileSync(path.join(target, "library.json"), "utf8"));
  const forGate = r.findings.filter((f) => !f.suppressed).map((f) => ({ ...f, severity: f.effectiveSeverity ?? f.severity }));
  const { exitCode } = gateExitFromFindings(forGate, lib.tier);
  return { library: lib, spine: SPINE, conditional: CONDITIONAL, date: "2026-01-01", exitCode, reportType };
}

// A frozen review object. These are produced by an LLM layer (askit-reviewer) at runtime; the test injects a
// fixed one so the renderer (a pure projection) is what is under test.
function reviewObject() {
  return {
    ...evaluate(SF),
    reportType: "review",
    review: {
      model: "claude-opus-4-8",
      effort: "high",
      date: "2026-01-01",
      findings: [
        { area: "scoping", severity: "major", message: "the single skill mixes drafting and review responsibilities; consider splitting", file: "skills/sf-do-thing/SKILL.md", provenance: "objective" },
        { area: "naming", severity: "minor", message: "sf-do-thing names the prefix but not the concrete action", file: "skills/sf-do-thing/SKILL.md", provenance: "house-preference" },
      ],
    },
    insights: [
      "The library is small and correctness-clean; its only real gap is the self-proving Gold tail.",
      "Sharper component naming would improve agent routing.",
    ],
  };
}

test("review render: advisory findings and insights render, labeled advisory, with a model stamp", () => {
  const r = reviewObject();
  const o = optsFor(r, SF, "review");
  const md = renderMarkdown(r, o);
  const html = renderHtml(r, o);
  assertNoDashes(md, "review MD");
  assertNoDashes(html, "review HTML");
  assertSelfContainedHtml(html);
  assert.match(md, /advisory/i);
  assert.ok(md.includes("claude-opus-4-8"), "the generating model is stamped");
  assert.ok(md.includes("objective") && md.includes("house-preference"), "the provenance tags render");
  assert.ok(md.includes("Sharper component naming"), "the insights render");
});

test("review render: the advisory layer never moves the deterministic grade", () => {
  const r = reviewObject();
  const md = renderMarkdown(r, optsFor(r, SF, "review"));
  assert.match(md, /Grade earned \| Silver \(Convergent\)/, "the gate-derived grade is preserved in the masthead");
  assert.equal(r.tier, "convergent", "the source tier is the gate's, unchanged by the review");
});

test("review: a hostile advisory cannot overwrite the gate tier, findings, or the masthead grade (applyAdvisory allowlist)", () => {
  const base = evaluate(SF);
  // A malformed or hallucinated advisory that also carries deterministic keys it must NOT be able to set.
  const hostile = { review: { model: "x", effort: "high", date: "2026-01-01", findings: [] }, insights: [], tier: "advanced", findings: [], byRule: {}, summary: { errors: 0, warns: 0 }, satisfies: ["advanced"], blocked: {} };
  const r = applyAdvisory(base, "review", hostile);
  assert.equal(r.tier, base.tier, "the advisory cannot overwrite the gate tier");
  assert.equal(r.findings.length, base.findings.length, "the advisory cannot overwrite the gate findings");
  assert.equal(Object.keys(r.byRule).length, Object.keys(base.byRule).length, "the advisory cannot overwrite byRule");
  const md = renderMarkdown(r, optsFor(r, SF, "review"));
  assert.match(md, /Grade earned \| Silver \(Convergent\)/, "the masthead grade is the gate's, not laundered to Gold");
  assert.ok(!md.includes("Gold (Advanced)"), "the advisory did not flip the grade to Gold");
});

test("review render: golden MD snapshot", () => {
  const r = reviewObject();
  assertSnapshot(renderMarkdown(r, optsFor(r, SF, "review")), SNAP_DIR, "review-silver.expected.md");
});

test("review render: golden HTML snapshot", () => {
  const r = reviewObject();
  assertSnapshot(renderHtml(r, optsFor(r, SF, "review")), SNAP_DIR, "review-silver.expected.html");
});

// --- v1.4.1 hardening (Codex review) ---

test("review render: a malformed advisory (missing findings) renders without crashing", () => {
  const r = { ...evaluate(SF), reportType: "review", review: { model: "x" } };
  assert.doesNotThrow(() => {
    renderMarkdown(r, optsFor(r, SF, "review"));
    renderHtml(r, optsFor(r, SF, "review"));
  });
});

test("review render: a hostile advisory message and model are HTML-escaped in Markdown", () => {
  const r = { ...evaluate(SF), reportType: "review", review: { model: "<img src=x onerror=alert(1)>", effort: "high", date: "2026-01-01", findings: [{ area: "scoping", severity: "major", message: "bad <script>alert(1)</script>", file: "f", provenance: "objective" }] } };
  const md = renderMarkdown(r, optsFor(r, SF, "review"));
  assert.ok(!md.includes("<script>alert(1)</script>"), "a raw script tag must not survive in the Markdown");
  assert.ok(!md.includes("<img src=x"), "a raw img tag (the model name) must not survive in the Markdown");
  assert.ok(md.includes("&lt;script&gt;"), "the angle brackets are escaped");
});
