import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, meta } from "../../scripts/checks/library-json.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const golden = path.join(FIXTURES, "golden/minimal-skill");
const missing = path.join(FIXTURES, "anti/missing-library-json");

test("meta declares U1 at universal tier", () => {
  assert.equal(meta.reqId, "U1");
  assert.equal(meta.tier, "universal");
});

test("golden library.json produces no errors", () => {
  const findings = check(loadPlugin(golden));
  assert.equal(findings.filter((f) => f.severity === "error").length, 0);
});

test("missing library.json is an error citing the file", () => {
  const findings = check(loadPlugin(missing));
  const err = findings.find((f) => f.severity === "error");
  assert.ok(err);
  assert.equal(err.reqId, "U1");
  assert.match(err.message, /library\.json/);
});

test("missing required field (tier) is an error", () => {
  const ctx = { root: ".", library: { path: "library.json", data: { name: "x", version: "0.1.0", description: "d".repeat(40), standard: "0.7" }, parseError: null }, agentsMdPath: null, skills: [] };
  const findings = check(ctx);
  assert.ok(findings.some((f) => f.severity === "error" && /tier/.test(f.message)));
});

test("bad semver version is an error", () => {
  const ctx = { root: ".", library: { path: "library.json", data: { name: "x", version: "v1", description: "d".repeat(40), standard: "0.7", tier: "universal" }, parseError: null }, agentsMdPath: null, skills: [] };
  const findings = check(ctx);
  assert.ok(findings.some((f) => f.severity === "error" && /version/.test(f.message)));
});

test("invalid tier enum is an error", () => {
  const ctx = { root: ".", library: { path: "library.json", data: { name: "x", version: "0.1.0", description: "d".repeat(40), standard: "0.7", tier: "platinum" }, parseError: null }, agentsMdPath: null, skills: [] };
  const findings = check(ctx);
  assert.ok(findings.some((f) => f.severity === "error" && /tier/.test(f.message)));
});

test("non-string version is an error", () => {
  const ctx = { root: ".", library: { path: "library.json", data: { name: "x", version: 1, description: "d".repeat(40), standard: "0.7", tier: "universal" }, parseError: null }, agentsMdPath: null, skills: [] };
  const findings = check(ctx);
  assert.ok(findings.some((f) => f.severity === "error" && /version/.test(f.message)));
});
