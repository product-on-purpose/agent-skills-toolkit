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
