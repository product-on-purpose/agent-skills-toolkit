import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { runAllChecks } from "../../scripts/lib/registry.mjs";
import { tierForReq } from "../../scripts/lib/tier.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SEED = path.join(REPO_ROOT, "templates", "seed-plugin");

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

// ADR 0023: askit-init-plugin regenerates the seed anatomy, verified by a STRUCTURAL match
// (the scaffold satisfies the Bronze conformance core), not a byte-exact diff. So the seed
// scaffold the skill copies MUST itself pass every Universal (Bronze) check with 0 errors.
test("the seed-plugin scaffold satisfies the Bronze anatomy (0 universal errors)", () => {
  const findings = runAllChecks(loadPlugin(SEED));
  const bronzeErrors = findings.filter((f) => f.severity === "error" && tierForReq(f.reqId) === "universal");
  assert.deepEqual(bronzeErrors, [], "seed-plugin must pass Bronze with 0 universal errors; got: " + JSON.stringify(bronzeErrors, null, 2));
});

// ADR 0027: the gate downgrades error -> warn for any check whose `since` is after the plugin's
// pinned library.json.standard. That is right for an EXISTING plugin (grade it against the ruleset
// it was written for) and wrong for a NEW one: a plugin scaffolded today has no legacy to protect
// and must be born on the current Standard. The seed's pin is copied verbatim into every plugin
// askit-init-plugin creates, so a stale pin silently opts each new plugin out of every check
// introduced since. This invariant fails on the next Standard bump that forgets the template.
test("the seed-plugin pin tracks the current Standard (a new plugin is born on today's ruleset)", () => {
  const seedPin = readJson(path.join(SEED, "library.json")).standard;
  const current = readJson(path.join(REPO_ROOT, "library.json")).standard;
  assert.equal(
    seedPin,
    current,
    `templates/seed-plugin/library.json pins Standard ${seedPin} but the current Standard is ${current}. ` +
      "Every check introduced after the seed pin is downgraded to a warn for the life of that pin, " +
      "so a freshly scaffolded plugin would silently opt out of them. Bump the seed pin."
  );
});
