import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check } from "../../scripts/checks/anatomy.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const golden = path.join(FIXTURES, "golden/minimal-skill");

test("golden has AGENTS.md - no U2 error", () => {
  const findings = check(loadPlugin(golden));
  assert.equal(findings.filter((f) => f.reqId === "U2" && f.severity === "error").length, 0);
});

test("missing AGENTS.md is a U2 error", () => {
  const ctx = { root: ".", library: { data: { name: "x" }, parseError: null }, agentsMdPath: null, skills: [] };
  const findings = check(ctx);
  assert.ok(findings.some((f) => f.reqId === "U2" && f.severity === "error"));
});

test("no skills emits a U8 WARN (not error)", () => {
  const ctx = { root: ".", library: { data: { name: "x" }, parseError: null }, agentsMdPath: "/fake/AGENTS.md", skills: [] };
  const w = check(ctx).find((f) => f.reqId === "U8");
  assert.ok(w, "expected a U8 finding when there are no skills");
  assert.equal(w.severity, "warn");
});
