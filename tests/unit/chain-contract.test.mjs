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

test("chain-scalar-callee fixture: a scalar (non-list) callee is a contract-shape error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/chain-scalar-callee")));
  assert.ok(r.some((f) => f.reqId === "S4" && /cs-caller/.test(f.message) && /must map to a list/.test(f.message)));
});

test("golden subagent-fixture: chain permitted + subagent in known set - no findings", () => {
  // Empty result is the discriminating check: sf-caller -> sf-worker is permitted (no orphan),
  // and sf-worker (a subagent named as a contract callee) is not flagged as a phantom - which
  // it would be if subagents were absent from the known set. So [] proves both behaviors.
  assert.deepEqual(check(loadPlugin(path.join(FIXTURES, "golden/subagent-fixture"))), []);
});
