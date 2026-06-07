import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { CHECKS, runAllChecks } from "../../scripts/lib/registry.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// Guards the deterministic/LLM boundary (Design Principle 3, ADR 0023): every gate check
// MUST be synchronous and return an array. A future check that calls a model (returning a
// Promise) would fail here, before it could affect a CI pass/fail.
test("every registered check returns an array synchronously (deterministic gate)", () => {
  const ctx = loadPlugin(REPO_ROOT);
  for (const m of CHECKS) {
    const r = m.check(ctx);
    assert.ok(Array.isArray(r), `check ${m.meta?.id} must return an array synchronously (got ${r && r.constructor ? r.constructor.name : typeof r})`);
  }
  assert.ok(Array.isArray(runAllChecks(ctx)));
});

// The 29-check spine: Bronze U1-U9, U11, U12 (11) + Silver S1-S8 (8) + Gold G1-G10 (10). Adding or
// removing a check is a deliberate spine change, so this count is asserted explicitly (it caught
// silent +1 drift historically). Bump it WITH the check, never to make a red test green. U10
// (no-dashes) was retired in Standard v0.11 as a stylistic house preference, not a portability rule.
test("the spine is exactly 29 checks (U1-U9, U11-U12 + S1-S8 + G1-G10)", () => {
  assert.equal(CHECKS.length, 29);
});

// Every check backs a distinct reqId (a duplicate would let two modules claim one requirement).
test("every registered check has a unique reqId", () => {
  const reqIds = CHECKS.map((m) => m.meta?.reqId).filter((r) => r != null);
  assert.equal(new Set(reqIds).size, reqIds.length, "duplicate reqId among registered checks");
});

// ADR 0027 (F1): every check declares the Standard version it was introduced at (meta.since), so the
// standard-aware gate can downgrade a post-pin requirement to warn. A check that forgets `since` would
// default to the baseline sentinel and silently never downgrade; this assertion makes the omission fail.
test("every registered check declares a non-empty meta.since [R-SINCE-1]", () => {
  for (const m of CHECKS) {
    assert.equal(typeof m.meta?.since, "string", `check ${m.meta?.id} must declare a string meta.since`);
    assert.ok(m.meta.since.length > 0, `check ${m.meta?.id} meta.since must be non-empty`);
  }
});

// The since values are fixed by ADR 0027: only the five ADR 0024 checks (U12 + G7-G10) are "0.10";
// every other check is the "0.x" pre-policy baseline (0.11 was a relaxation, so it adds no new since).
// Diff this against the SPEC sec 3 table with zero discrepancies.
test("the reqId -> since map matches the ADR 0027 baseline table [R-SINCE-2]", () => {
  const since010 = new Set(["U12", "G7", "G8", "G9", "G10"]);
  for (const m of CHECKS) {
    const expected = since010.has(m.meta.reqId) ? "0.10" : "0.x";
    assert.equal(m.meta.since, expected, `${m.meta.reqId} (${m.meta.id}) should be since ${expected}`);
  }
});
