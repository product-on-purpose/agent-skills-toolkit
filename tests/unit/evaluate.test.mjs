import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluate } from "../../scripts/evaluate.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

test("plugin scope: golden plugin reports clean, tier universal", () => {
  const r = evaluate(path.join(FIXTURES, "golden/minimal-skill"));
  assert.equal(r.scope, "plugin");
  assert.equal(r.summary.errors, 0);
  assert.equal(r.tier, "universal");
  assert.deepEqual(r.blocked, {});
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
