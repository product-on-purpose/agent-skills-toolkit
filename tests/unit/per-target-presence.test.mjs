import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, meta } from "../../scripts/checks/per-target-presence.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

test("meta declares S6 convergent", () => {
  assert.equal(meta.reqId, "S6");
  assert.equal(meta.tier, "convergent");
});

test("golden silver fixture has both native manifests - no error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "golden/silver-fixture")));
  assert.equal(r.filter((f) => f.severity === "error").length, 0);
});

test("missing-codex-manifest fixture is an S6 error citing .codex-plugin/plugin.json", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/missing-codex-manifest")));
  assert.equal(r.filter((f) => f.severity === "error").length, 1, "exactly one S6 error: codex manifest missing; the claude manifest is present so no claude error");
  const err = r.find((f) => f.severity === "error");
  assert.ok(err);
  assert.equal(err.reqId, "S6");
  assert.equal(err.file, ".codex-plugin/plugin.json");
  assert.match(err.message, /codex/);
});

test("no agent-targets declared - S6 stays silent (S1 owns that)", () => {
  const r = check({ root: ".", library: { data: { name: "x" } } });
  assert.deepEqual(r, []);
});

test("empty/invalid agent-targets - S6 stays silent (S1 owns that)", () => {
  assert.deepEqual(check({ root: ".", library: { data: { "agent-targets": [] } } }), []);
});

test("no library.json data - no finding (U1 owns that)", () => {
  assert.deepEqual(check({ library: { data: null } }), []);
});
