import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { runAllChecks } from "../../scripts/lib/registry.mjs";
import { tierForReq } from "../../scripts/lib/tier.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SEED = path.join(REPO_ROOT, "templates", "seed-plugin");

// ADR 0023: askit-init-plugin regenerates the seed anatomy, verified by a STRUCTURAL match
// (the scaffold satisfies the Bronze conformance core), not a byte-exact diff. So the seed
// scaffold the skill copies MUST itself pass every Universal (Bronze) check with 0 errors.
test("the seed-plugin scaffold satisfies the Bronze anatomy (0 universal errors)", () => {
  const findings = runAllChecks(loadPlugin(SEED));
  const bronzeErrors = findings.filter((f) => f.severity === "error" && tierForReq(f.reqId) === "universal");
  assert.deepEqual(bronzeErrors, [], "seed-plugin must pass Bronze with 0 universal errors; got: " + JSON.stringify(bronzeErrors, null, 2));
});
