import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, meta } from "../../scripts/checks/prefix.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

test("meta declares S2 convergent", () => {
  assert.equal(meta.reqId, "S2");
  assert.equal(meta.tier, "convergent");
});

test("golden silver fixture has prefix sf- - no error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "golden/silver-fixture")));
  assert.equal(r.filter((f) => f.severity === "error").length, 0);
});

test("no-prefix fixture is an S2 error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/no-prefix")));
  const err = r.find((f) => f.severity === "error");
  assert.ok(err);
  assert.equal(err.reqId, "S2");
});

test("invalid prefix (no trailing dash) is an error", () => {
  const ctx = { library: { data: { prefix: "askit" } } };
  assert.ok(check(ctx).some((f) => f.severity === "error" && /kebab/.test(f.message)));
});

test("invalid prefix (uppercase) is an error", () => {
  const ctx = { library: { data: { prefix: "ASkit-" } } };
  assert.ok(check(ctx).some((f) => f.severity === "error"));
});
