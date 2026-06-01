import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, meta } from "../../scripts/checks/release-notes.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("meta declares G5 advanced", () => {
  assert.equal(meta.reqId, "G5");
  assert.equal(meta.tier, "advanced");
});

test("a plugin with no RELEASE-NOTES.md is a G5 error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "golden/minimal-skill")));
  assert.ok(r.some((f) => f.reqId === "G5" && /RELEASE-NOTES\.md is missing/.test(f.message)));
});

test("the toolkit ships RELEASE-NOTES.md -> no G5 findings", () => {
  assert.deepEqual(check(loadPlugin(REPO_ROOT)), []);
});
