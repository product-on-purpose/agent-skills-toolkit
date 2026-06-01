import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, meta } from "../../scripts/checks/library-regression.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("meta declares G3 advanced", () => {
  assert.equal(meta.reqId, "G3");
  assert.equal(meta.tier, "advanced");
});

test("no chains and no hooks -> no findings (conditional)", () => {
  // minimal-skill ships no chain contract and no hooks, so there is nothing to regress.
  assert.deepEqual(check(loadPlugin(path.join(FIXTURES, "golden/minimal-skill"))), []);
});

test("golden regression-fixture: a chain edge covered by an eval set -> no findings", () => {
  assert.deepEqual(check(loadPlugin(path.join(FIXTURES, "golden/regression-fixture"))), []);
});

test("regression-missing-eval: an uncovered chain edge is a G3 error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/regression-missing-eval")));
  assert.ok(r.some((f) => f.reqId === "G3" && /rm-caller -> rm-worker/.test(f.message) && /no eval/.test(f.message)));
});

test("regression-stale-eval: stale, malformed, and uncovered are all G3 errors", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/regression-stale-eval")));
  // stale: an eval covers rs-caller -> rs-ghost, an edge the contract does not permit.
  assert.ok(r.some((f) => f.reqId === "G3" && /stale eval/.test(f.message) && /rs-ghost/.test(f.message)), "stale eval not flagged");
  // malformed: rs-bad.eval.json is not valid JSON (and so does not count as coverage).
  assert.ok(r.some((f) => f.reqId === "G3" && /not valid JSON/.test(f.message)), "malformed eval not flagged");
  // uncovered: the real edge rs-caller -> rs-worker has no valid covering eval.
  assert.ok(r.some((f) => f.reqId === "G3" && /rs-caller -> rs-worker/.test(f.message) && /no eval/.test(f.message)), "uncovered edge not flagged");
});

test("regression-orphan-evals: eval hygiene is enforced even with no contract", () => {
  // No chain contract and no hooks, but evals/ has a malformed file and a dangling chain eval.
  // The early conditional must not suppress these (the eval-hygiene false-negative the gate found).
  const r = check(loadPlugin(path.join(FIXTURES, "anti/regression-orphan-evals")));
  assert.ok(r.some((f) => f.reqId === "G3" && /not valid JSON/.test(f.message)), "malformed eval not flagged without a contract");
  assert.ok(r.some((f) => f.reqId === "G3" && /stale eval/.test(f.message) && /oe-a -> oe-b/.test(f.message)), "dangling eval not flagged without a contract");
});

test("the toolkit's own chains are covered (dogfood) -> no G3 findings", () => {
  assert.deepEqual(check(loadPlugin(REPO_ROOT)), []);
});
