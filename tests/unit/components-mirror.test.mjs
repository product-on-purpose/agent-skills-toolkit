import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, meta } from "../../scripts/checks/components-mirror.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("meta declares S8 convergent", () => {
  assert.equal(meta.reqId, "S8");
  assert.equal(meta.tier, "convergent");
});

test("status-disagree: a frontmatter status that the entry does not mirror is an S8 error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/status-disagree")));
  assert.ok(r.some((f) => f.reqId === "S8" && /sd-skill/.test(f.message) && /mirror/.test(f.message)), "status disagreement not flagged");
});

test("a skill whose frontmatter omits status leaves the entry canonical -> no findings", () => {
  // silver-fixture's skill declares no metadata.status, so its active entry is canonical.
  assert.deepEqual(check(loadPlugin(path.join(FIXTURES, "golden/silver-fixture"))), []);
});

test("the toolkit's entries mirror their components -> no S8 findings", () => {
  assert.deepEqual(check(loadPlugin(REPO_ROOT)), []);
});
