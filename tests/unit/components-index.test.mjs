import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, meta } from "../../scripts/checks/components-index.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

test("meta declares S3 convergent", () => {
  assert.equal(meta.reqId, "S3");
  assert.equal(meta.tier, "convergent");
});

test("golden silver fixture has matching components index - no error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "golden/silver-fixture")));
  assert.equal(r.filter((f) => f.severity === "error").length, 0);
});

test("components-drift fixture errors on both declared-missing and on-disk-undeclared", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/components-drift")));
  const errs = r.filter((f) => f.severity === "error");
  assert.ok(errs.some((e) => /cd-missing-skill/.test(e.message) && /not on disk/.test(e.message)));
  assert.ok(errs.some((e) => /cd-on-disk-only/.test(e.message) && /not declared/.test(e.message)));
});

test("missing components is an S3 error", () => {
  const ctx = { library: { data: {} }, skills: [] };
  assert.ok(check(ctx).some((f) => f.reqId === "S3" && /missing/.test(f.message)));
});
