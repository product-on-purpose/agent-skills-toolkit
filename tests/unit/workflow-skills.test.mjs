import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, meta } from "../../scripts/checks/workflow-skills.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

test("meta declares S5 convergent", () => {
  assert.equal(meta.reqId, "S5");
  assert.equal(meta.tier, "convergent");
});

test("golden silver fixture (no workflows) - no findings", () => {
  assert.deepEqual(check(loadPlugin(path.join(FIXTURES, "golden/silver-fixture"))), []);
});

test("workflow-missing-skill fixture: S5 error naming the missing skill", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/workflow-missing-skill")));
  assert.ok(r.some((f) => f.reqId === "S5" && /this-skill-does-not-exist/.test(f.message)));
});
