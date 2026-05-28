import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, meta } from "../../scripts/checks/agent-targets.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

test("meta declares S1 convergent", () => {
  assert.equal(meta.reqId, "S1");
  assert.equal(meta.tier, "convergent");
});

test("golden silver fixture has agent-targets - no error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "golden/silver-fixture")));
  assert.equal(r.filter((f) => f.severity === "error").length, 0);
});

test("no-agent-targets fixture is an S1 error citing library.json", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/no-agent-targets")));
  const err = r.find((f) => f.severity === "error");
  assert.ok(err);
  assert.equal(err.reqId, "S1");
  assert.equal(err.file, "library.json");
});

test("invalid agent-targets value is an error", () => {
  const ctx = { library: { data: { "agent-targets": ["claude", "bogus"] } } };
  const r = check(ctx);
  assert.ok(r.some((f) => f.severity === "error" && /bogus/.test(f.message)));
});

test("empty agent-targets array is an error", () => {
  const ctx = { library: { data: { "agent-targets": [] } } };
  const r = check(ctx);
  assert.ok(r.some((f) => f.severity === "error"));
});

test("no library.json data - no finding (U1 owns that)", () => {
  assert.deepEqual(check({ library: { data: null } }), []);
});
