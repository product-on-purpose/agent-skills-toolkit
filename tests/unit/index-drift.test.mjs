import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, meta } from "../../scripts/checks/index-drift.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("meta declares G4 advanced", () => {
  assert.equal(meta.reqId, "G4");
  assert.equal(meta.tier, "advanced");
});

test("index-stale fixture: a hand-edited INDEX that differs from gen-index is a G4 error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/index-stale")));
  assert.ok(r.some((f) => f.reqId === "G4" && /out of date/.test(f.message)));
});

test("a plugin with no INDEX.md is a G4 error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "golden/minimal-skill")));
  assert.ok(r.some((f) => f.reqId === "G4" && /missing/.test(f.message)));
});

test("the toolkit's INDEX.md matches gen-index (generated) -> no G4 findings", () => {
  assert.deepEqual(check(loadPlugin(REPO_ROOT)), []);
});
