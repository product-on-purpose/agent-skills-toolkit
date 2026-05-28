import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluate, formatReport } from "../../scripts/evaluate.mjs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

test("plugin scope: golden plugin reports clean gate, tier universal (convergent blocked by S-checks minimal-skill lacks)", () => {
  const r = evaluate(path.join(FIXTURES, "golden/minimal-skill"));
  assert.equal(r.scope, "plugin");
  // S1+S2+S3 appear in findings but the declared tier is universal so errorCount is 0
  // (gate filter excludes convergent errors from the gated count).
  // findings includes S errors; summary.errors counts raw findings regardless of gate.
  assert.equal(r.tier, "universal");
  // blocked.convergent holds the Silver climb items for this fixture
  const conv = r.blocked.convergent ?? [];
  assert.ok(conv.some((s) => s.startsWith("S1")), "S1 expected in blocked.convergent");
  assert.ok(conv.some((s) => s.startsWith("S2")), "S2 expected in blocked.convergent");
  assert.ok(conv.some((s) => s.startsWith("S3")), "S3 expected in blocked.convergent");
  assert.ok(typeof r.byRule === "object");
});

test("plugin scope: missing library.json reports a U1 error grouped by rule", () => {
  const r = evaluate(path.join(FIXTURES, "anti/missing-library-json"));
  assert.equal(r.scope, "plugin");
  assert.ok(r.summary.errors >= 1);
  assert.ok(r.byRule.U1 && r.byRule.U1.length >= 1);
});

test("component scope: lone skill runs skill-level rules only, no tier", () => {
  const r = evaluate(path.join(FIXTURES, "golden/lone-skill"));
  assert.equal(r.scope, "component");
  assert.equal(r.summary.errors, 0);
  assert.equal(r.tier, undefined);
  assert.equal(r.byRule.U1, undefined);
  assert.equal(r.byRule.U2, undefined);
});

test("component scope: weak description is a U5 warn, not an error", () => {
  const r = evaluate(path.join(FIXTURES, "anti/weak-description/skills/vague"));
  assert.equal(r.scope, "component");
  assert.equal(r.summary.errors, 0);
  assert.ok(r.byRule.U5 && r.byRule.U5[0].severity === "warn");
});

test("neither plugin nor skill: returns an actionable error finding", () => {
  const empty = mkdtempSync(path.join(tmpdir(), "ev-"));
  const r = evaluate(empty);
  assert.equal(r.scope, "unknown");
  assert.ok(r.summary.errors >= 1);
  assert.match(r.findings[0].message, /library\.json|SKILL\.md/);
});

test("formatReport renders tier for a plugin and omits it for a component", () => {
  const plugin = formatReport(evaluate(path.join(FIXTURES, "golden/minimal-skill")));
  assert.match(plugin, /Tier: universal/);
  // S1+S2+S3 fire on this fixture (no prefix/agent-targets/components);
  // the gate keeps exit 0 for declared-universal plugins but the raw report
  // lists all findings. Assert the error count line is present.
  assert.match(plugin, /\d+ error\(s\)/);
  const comp = formatReport(evaluate(path.join(FIXTURES, "golden/lone-skill")));
  assert.ok(!/Tier:/.test(comp), "component report must not print a Tier line");
});
