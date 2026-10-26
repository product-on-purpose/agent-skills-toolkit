import { test } from "node:test";
import assert from "node:assert/strict";
import { provenanceByReq } from "../../scripts/lib/registry.mjs";
import { PROFILES } from "../../scripts/lib/profiles.mjs";
import { resolveFindings } from "../../scripts/lib/resolve-config.mjs";
import { configFrom } from "../../scripts/lib/config.mjs";
import { ADVISORY_REGISTRY, HOUSE_ADVISORY_IDS, ADVISORY_BY_ID, ADVISORY_MODULES } from "../../scripts/lib/advisory-registry.mjs";

// ADR 0029: reclassify U2 (AGENTS.md anatomy) and U5 (description-score heuristic) from portable
// (objective / vendor-cited) to house provenance. The eval-target corpus run showed both fire on
// well-built official targets (anthropics/skills ships no AGENTS.md; good descriptions cluster at 0.65),
// so they are askit conventions, not portable defects. Reclassifying makes plain-plugin drop them, the
// report count them as profile conformance (not real issues), and a consumer opt out of them (never
// clamped). The default askit-library grade is UNCHANGED: both still fire under the full ladder.
const PROV = provenanceByReq();
const f = (severity, reqId) => ({ reqId, check: reqId, severity, message: `${reqId} fired` });
const cfg = (over = {}) => configFrom({ mode: "local", profile: "askit-library", rules: {}, suppressions: [], ...over });

test("U2 (AGENTS.md anatomy) is house provenance, not a portable defect", () => {
  assert.equal(PROV.get("U2"), "house");
});

test("U5 (description-score) is house provenance: the scorer is a heuristic, not a portable defect", () => {
  assert.equal(PROV.get("U5"), "house");
});

test("plain-plugin turns U2 and U5 off, so a third-party plugin is not dinged for askit conventions", () => {
  for (const id of ["U2", "U5"]) {
    const [out] = resolveFindings([f("error", id)], cfg({ profile: "plain-plugin" }), PROV);
    assert.equal(out.effectiveSeverity, "off", `${id} is off under plain-plugin`);
  }
});

test("the default askit-library profile still fires U2 and U5 (no conformance change)", () => {
  for (const id of ["U2", "U5"]) {
    const [out] = resolveFindings([f("error", id)], cfg({ profile: "askit-library" }), PROV);
    assert.equal(out.effectiveSeverity, "error", `${id} still fires under the default ladder`);
  }
});

// The latent invariant, made explicit: plain-plugin must turn off EXACTLY the house-provenance checks.
// This is the guard that would have caught U2/U5 being portable while semantically house, and keeps the
// two representations (the profile's off-map and the per-check provenance) from drifting apart.
test("invariant: plain-plugin turns off exactly the house-provenance checks", () => {
  const houseReqs = [...PROV.entries()].filter(([, p]) => p === "house").map(([id]) => id).sort();
  const plainOff = Object.entries(PROFILES["plain-plugin"].rules).filter(([, sev]) => sev === "off").map(([id]) => id).sort();
  assert.deepEqual(plainOff, houseReqs, "the plain-plugin off-set and the house-provenance set must match");
});

// ADR 0063 sec 1: the same invariant, for the ADVISORY layer. plain-plugin must turn off EXACTLY the
// house-provenance ADV ids (ADV4 today), so the profile's advisoryOff and the registry's own provenance
// tags cannot drift apart - the failure mode the reqId invariant above already guards against.
test("advisory invariant: plain-plugin's advisoryOff equals the house-provenance ADV ids", () => {
  const houseAdvIds = ADVISORY_REGISTRY.filter((a) => a.provenance === "house").map((a) => a.advisoryId).sort();
  assert.deepEqual(houseAdvIds, [...HOUSE_ADVISORY_IDS].sort(), "HOUSE_ADVISORY_IDS must be derived from the registry's own provenance tags");
  const plainAdvisoryOff = [...PROFILES["plain-plugin"].advisoryOff].sort();
  assert.deepEqual(plainAdvisoryOff, houseAdvIds, "plain-plugin's advisoryOff must equal exactly the house-provenance ADV ids");
  // The non-plain profiles turn nothing off: portability and security matter most to exactly the
  // third parties plain-plugin exists for (ADR 0063 sec 1), so only house-provenance signals are exempt.
  assert.deepEqual([...PROFILES["askit-library"].advisoryOff], []);
  assert.deepEqual([...PROFILES["house-style"].advisoryOff], []);
});

// W5a review: every SHIPPED advisory module must be registered in ADVISORY_REGISTRY under its own
// advisoryId, or plain-plugin can never turn it off - runAdvisoryModules() falls back to "house"
// provenance for an unregistered id (the strictest label available for a finding nobody can otherwise
// classify), which would make a vendor-cited screen silently un-exemptable by name. advisory-registry.mjs's
// own docblock names this invariant as required "once the first module lands"; ADV1 and ADV2 are that
// first landing.
test("every module in ADVISORY_MODULES has a meta.advisoryId that is a key of ADVISORY_BY_ID", () => {
  assert.ok(ADVISORY_MODULES.length > 0, "this invariant is vacuous with no shipped modules; ADV1/ADV2 must exist");
  for (const mod of ADVISORY_MODULES) {
    const id = mod?.meta?.advisoryId;
    assert.ok(id, `a shipped advisory module has no meta.advisoryId: ${JSON.stringify(mod?.meta)}`);
    assert.ok(ADVISORY_BY_ID.has(id), `advisoryId "${id}" is not registered in ADVISORY_REGISTRY`);
  }
  const ids = ADVISORY_MODULES.map((m) => m.meta.advisoryId);
  assert.equal(new Set(ids).size, ids.length, "no two shipped modules may share an advisoryId");
});
