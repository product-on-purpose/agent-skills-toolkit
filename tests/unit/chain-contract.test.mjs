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

test("chain-orphan fixture: a frontmatter chain invocation not permitted by the contract is an S4 orphan (legacy top-level `chain:` is still read)", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "anti/chain-orphan"));
  // co-caller declares chain at the legacy top-level location deliberately (kept for compatibility);
  // S4 must still read it, or this orphan would go undetected.
  assert.ok(Array.isArray(ctx.skills[0]?.frontmatter?.chain));
  assert.equal(ctx.skills[0]?.frontmatter?.metadata?.chain, undefined);
  const r = check(ctx);
  assert.ok(r.some((f) => f.reqId === "S4" && /co-caller/.test(f.message) && /co-worker/.test(f.message) && /orphan/.test(f.message)));
});

test("chain-scalar-callee fixture: a scalar (non-list) callee is a contract-shape error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/chain-scalar-callee")));
  assert.ok(r.some((f) => f.reqId === "S4" && /cs-caller/.test(f.message) && /must map to a list/.test(f.message)));
});

test("golden subagent-fixture: chain permitted + subagent in known set - no findings (declared under metadata.chain, the sanctioned location)", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "golden/subagent-fixture"));
  // sf-caller declares its chain under metadata.chain (not top-level), so this is the golden
  // coverage for the new sanctioned location.
  assert.deepEqual(ctx.skills[0]?.frontmatter?.metadata?.chain, ["sf-worker"]);
  assert.equal(ctx.skills[0]?.frontmatter?.chain, undefined);
  // Empty result is the discriminating check: sf-caller -> sf-worker is permitted (no orphan),
  // and sf-worker (a subagent named as a contract callee) is not flagged as a phantom - which
  // it would be if subagents were absent from the known set. So [] proves both behaviors.
  assert.deepEqual(check(ctx), []);
});

test("when both metadata.chain and top-level chain are declared, metadata.chain wins (no merge)", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "golden/subagent-fixture"));
  // sf-caller really declares metadata.chain: [sf-worker], which the contract permits. Graft a
  // conflicting, NOT-permitted top-level chain onto the same in-memory frontmatter: if the reader
  // incorrectly preferred (or merged in) the top-level value, this would surface as an S4 orphan
  // for "sf-not-permitted". It must not - metadata.chain alone must win.
  ctx.skills[0].frontmatter.chain = ["sf-not-permitted"];
  assert.deepEqual(check(ctx), []);
});
