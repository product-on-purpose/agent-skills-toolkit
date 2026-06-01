import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, meta } from "../../scripts/checks/deprecation.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("meta declares G6 advanced", () => {
  assert.equal(meta.reqId, "G6");
  assert.equal(meta.tier, "advanced");
});

test("deprecated-incomplete: a deprecated component missing deprecated-by and remove-in is a G6 error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/deprecated-incomplete")));
  assert.ok(r.some((f) => f.reqId === "G6" && /deprecated-by/.test(f.message)), "missing deprecated-by not flagged");
  assert.ok(r.some((f) => f.reqId === "G6" && /remove-in/.test(f.message)), "missing remove-in not flagged");
});

test("deprecated-complete: a complete deprecation contract -> no findings", () => {
  assert.deepEqual(check(loadPlugin(path.join(FIXTURES, "golden/deprecated-complete"))), []);
});

test("minimal-skill (no components index) -> no findings", () => {
  assert.deepEqual(check(loadPlugin(path.join(FIXTURES, "golden/minimal-skill"))), []);
});

test("the toolkit's own components are all active -> no G6 findings", () => {
  assert.deepEqual(check(loadPlugin(REPO_ROOT)), []);
});
