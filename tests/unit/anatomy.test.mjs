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

test("no skills emits a U2 WARN (not error), never tagged U8", () => {
  // The warning carried reqId U8 from the first Bronze bootstrap; U8 is manifest-drift, a different
  // check's requirement, so the finding was filed and configured under a reqId this module does not own.
  const ctx = { root: ".", library: { data: { name: "x" }, parseError: null }, agentsMdPath: "/fake/AGENTS.md", skills: [] };
  const findings = check(ctx);
  const w = findings.find((f) => /No skills found/.test(f.message));
  assert.ok(w, "expected a finding when there are no skills");
  assert.equal(w.reqId, "U2", "the anatomy warning carries the anatomy reqId");
  assert.equal(w.severity, "warn");
  assert.ok(findings.every((f) => f.reqId === "U2"), "anatomy emits nothing under another check's reqId");
});
