import { test } from "node:test";
import assert from "node:assert/strict";
import { check } from "../../scripts/checks/manifest-drift.mjs";

test("matching name/version - no finding", () => {
  const ctx = { root: ".", library: { data: { name: "x", version: "0.1.0" } }, claudeManifest: { name: "x", version: "0.1.0" } };
  assert.equal(check(ctx).length, 0);
});

test("version drift between library.json and plugin.json is a WARN", () => {
  const ctx = { root: ".", library: { data: { name: "x", version: "0.2.0" } }, claudeManifest: { name: "x", version: "0.1.0" } };
  const f = check(ctx)[0];
  assert.equal(f.severity, "warn");
  assert.match(f.message, /version/);
});

test("no claudeManifest - no finding", () => {
  const ctx = { root: ".", library: { data: { name: "x", version: "0.1.0" } }, claudeManifest: null };
  assert.equal(check(ctx).length, 0);
});
