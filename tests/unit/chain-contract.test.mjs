import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, meta } from "../../scripts/checks/chain-contract.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

test("meta declares S4 convergent", () => {
  assert.equal(meta.reqId, "S4");
  assert.equal(meta.tier, "convergent");
});

test("golden silver fixture (no chaining) - no findings (conditional)", () => {
  assert.deepEqual(check(loadPlugin(path.join(FIXTURES, "golden/silver-fixture"))), []);
});

test("chain-phantom fixture: contract names a callee that has no on-disk component", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/chain-phantom")));
  assert.ok(r.some((f) => f.reqId === "S4" && /this-component-does-not-exist/.test(f.message) && /missing/.test(f.message)));
});

test("chain-orphan fixture: a frontmatter chain invocation not permitted by the contract is an S4 orphan", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/chain-orphan")));
  assert.ok(r.some((f) => f.reqId === "S4" && /co-caller/.test(f.message) && /co-worker/.test(f.message) && /orphan/.test(f.message)));
});

test("golden subagent-fixture: chain fully permitted - no findings", () => {
  assert.deepEqual(check(loadPlugin(path.join(FIXTURES, "golden/subagent-fixture"))), []);
});

test("subagents are in the known set (a subagent named in the contract is not a phantom)", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "golden/subagent-fixture")));
  assert.ok(!r.some((f) => /sf-worker/.test(f.message) && /phantom/.test(f.message)));
});
