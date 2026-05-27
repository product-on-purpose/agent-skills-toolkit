import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check } from "../../scripts/checks/name-matches-dir.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const golden = path.join(FIXTURES, "golden/minimal-skill");
const mismatch = path.join(FIXTURES, "anti/name-mismatch");

test("golden name == dir - no error", () => {
  assert.equal(check(loadPlugin(golden)).filter((f) => f.severity === "error").length, 0);
});

test("name != dir is a U4 error", () => {
  const findings = check(loadPlugin(mismatch));
  const err = findings.find((f) => f.severity === "error");
  assert.ok(err);
  assert.equal(err.reqId, "U4");
  assert.match(err.message, /wrong-name/);
});
