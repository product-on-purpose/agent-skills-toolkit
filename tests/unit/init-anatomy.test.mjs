import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { runAllChecks } from "../../scripts/lib/registry.mjs";
import { tierForReq } from "../../scripts/lib/tier.mjs";
import { check as manifestDriftCheck } from "../../scripts/checks/manifest-drift.mjs";
import { check as perTargetPresenceCheck } from "../../scripts/checks/per-target-presence.mjs";

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

// ADR 0043: the Bronze scaffold now ships a minimal native manifest (.claude-plugin/plugin.json:
// name, version, description only) so a freshly scaffolded plugin is install-recognized on Claude
// Code, and on Codex since 0.146.0 reads .claude-plugin/* directly, without pretending to Silver's
// S6 per-target emission. Both files here are hand-maintained templates, not generated at scaffold
// time, so a version bump to one and not the other would silently ship U8 (manifest-drift) drift to
// every plugin askit-init-plugin scaffolds next. This is the version-agreement analogue of the
// Standard-pin invariant above.
// This also guards a deliberate decision, not just a shape: the raw template MUST NOT carry an
// "author" key, placeholder or otherwise. A template genuinely has no author to declare, so
// `claude plugin validate --strict` correctly warns on it; a fabricated `{"name": "REPLACE - ..."}`
// would be the same class of defect U5 (description-score) already penalizes real TODO/TBD/FIXME/
// PLACEHOLDER/CHANGEME tokens for (ADR 0033), wearing a different hat. Only `askit-init-plugin`'s
// `interview` mode, which can actually ask a human, is allowed to add a real `author` (ADR 0043).
test("the seed-plugin's native manifest is minimal (no author) and its name/version agree with library.json", () => {
  const manifest = readJson(path.join(SEED, ".claude-plugin", "plugin.json"));
  const lib = readJson(path.join(SEED, "library.json"));
  assert.deepEqual(
    Object.keys(manifest).sort(),
    ["description", "name", "version"],
    "the seed's native manifest must stay genuinely minimal (name, version, description only) with no author placeholder; it is not Silver's S6 per-target shape"
  );
  assert.equal(manifest.name, lib.name, "native manifest name must agree with library.json, or U8 (manifest-drift) warns on the drift");
  assert.equal(manifest.version, lib.version, "native manifest version must agree with library.json, or U8 (manifest-drift) errors on the drift");
});

test("U8 (manifest-drift) and S6 (per-target-presence) produce no findings against the seed", () => {
  const ctx = loadPlugin(SEED);
  assert.deepEqual(manifestDriftCheck(ctx), [], "U8 must stay silent: the seed's native manifest agrees with library.json");
  assert.deepEqual(
    perTargetPresenceCheck(ctx),
    [],
    "S6 must stay silent: the seed declares no agent-targets, so shipping one native manifest does not make it claim Silver's per-target behavior"
  );
});
