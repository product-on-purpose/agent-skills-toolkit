import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, meta } from "../../scripts/checks/command-contract.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

test("meta declares S7 convergent", () => {
  assert.equal(meta.reqId, "S7");
  assert.equal(meta.tier, "convergent");
});
test("no commands - conditional, no findings", () => {
  assert.deepEqual(check(loadPlugin(path.join(FIXTURES, "golden/minimal-skill"))), []);
});
test("golden command-fixture: maps-to resolves - no findings", () => {
  assert.deepEqual(check(loadPlugin(path.join(FIXTURES, "golden/command-fixture"))), []);
});
test("command-orphan-mapsto: maps-to names a missing skill is an S7 error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/command-orphan-mapsto")));
  assert.ok(r.some((f) => f.reqId === "S7" && /co-cmd/.test(f.message) && /co-missing-skill/.test(f.message)));
});
test("command-no-mapsto: missing maps-to is an S7 error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/command-no-mapsto")));
  assert.ok(r.some((f) => f.reqId === "S7" && /cn-cmd/.test(f.message) && /maps-to/.test(f.message)));
});
