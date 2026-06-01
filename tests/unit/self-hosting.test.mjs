import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, meta } from "../../scripts/checks/self-hosting.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("meta declares G2 advanced", () => {
  assert.equal(meta.reqId, "G2");
  assert.equal(meta.tier, "advanced");
});

test("a plugin with no CI workflow is a G2 error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "golden/minimal-skill")));
  assert.ok(r.some((f) => f.reqId === "G2" && /no CI workflow/.test(f.message)));
});

test("ci-comment-only fixture: the gate mentioned only in a YAML comment does NOT count (G2 error)", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/ci-comment-only")));
  assert.ok(r.some((f) => f.reqId === "G2" && /none runs the conformance gate/.test(f.message)));
});

test("ci-npm-gate fixture: a workflow running the gate via `npm run check` passes (no false positive)", () => {
  assert.deepEqual(check(loadPlugin(path.join(FIXTURES, "golden/ci-npm-gate"))), []);
});

test("the toolkit ships CI that runs the gate -> no G2 findings", () => {
  assert.deepEqual(check(loadPlugin(REPO_ROOT)), []);
});
