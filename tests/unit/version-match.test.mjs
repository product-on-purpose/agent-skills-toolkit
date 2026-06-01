import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, meta } from "../../scripts/checks/version-match.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

test("meta declares U9 universal", () => {
  assert.equal(meta.reqId, "U9");
  assert.equal(meta.tier, "universal");
});

test("matching package.json and library.json versions - no error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "golden/version-match")));
  assert.equal(r.length, 0);
});

test("mismatched versions - U9 error naming package.json", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/version-mismatch")));
  const err = r.find((f) => f.severity === "error");
  assert.ok(err);
  assert.equal(err.reqId, "U9");
  assert.equal(err.file, "package.json");
});

test("no package.json - not applicable (no error)", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "golden/minimal-skill")));
  assert.equal(r.length, 0);
});

test("present-but-invalid package.json is a U9 error (fails closed)", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/bad-package-json")));
  assert.ok(r.some((f) => f.reqId === "U9" && /not valid JSON/.test(f.message)));
});
