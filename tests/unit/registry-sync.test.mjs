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
