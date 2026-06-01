import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, meta } from "../../scripts/checks/hook-documentation.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("meta declares G1 advanced", () => {
  assert.equal(meta.reqId, "G1");
  assert.equal(meta.tier, "advanced");
});

test("no hooks -> no findings (conditional)", () => {
  assert.deepEqual(check(loadPlugin(path.join(FIXTURES, "golden/minimal-skill"))), []);
});

test("hook-documented fixture: a PreToolUse hook with matcher + type -> no findings", () => {
  assert.deepEqual(check(loadPlugin(path.join(FIXTURES, "golden/hook-documented"))), []);
});

test("hook-undocumented fixture: missing matcher and missing type are G1 errors", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/hook-undocumented")));
  assert.ok(r.some((f) => f.reqId === "G1" && /matcher/.test(f.message)), "missing matcher not flagged");
  assert.ok(r.some((f) => f.reqId === "G1" && /type/.test(f.message)), "missing type not flagged");
});

test("hook-array fixture: a top-level hooks array (not an object keyed by event) is a G1 error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/hook-array")));
  assert.ok(r.some((f) => f.reqId === "G1" && /object keyed by event name/.test(f.message)), "array hooks not flagged");
});

test("the toolkit ships no hooks -> no G1 findings", () => {
  assert.deepEqual(check(loadPlugin(REPO_ROOT)), []);
});
