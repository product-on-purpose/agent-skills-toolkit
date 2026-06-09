import { test } from "node:test";
import assert from "node:assert/strict";
import { provenanceByReq } from "../../scripts/lib/registry.mjs";
import { PROFILES } from "../../scripts/lib/profiles.mjs";
import { resolveFindings } from "../../scripts/lib/resolve-config.mjs";

// ADR 0029: reclassify U2 (AGENTS.md anatomy) and U5 (description-score heuristic) from portable
// (objective / vendor-cited) to house provenance. The eval-target corpus run showed both fire on
// well-built official targets (anthropics/skills ships no AGENTS.md; good descriptions cluster at 0.65),
// so they are askit conventions, not portable defects. Reclassifying makes plain-plugin drop them, the
// report count them as profile conformance (not real issues), and a consumer opt out of them (never
// clamped). The default askit-library grade is UNCHANGED: both still fire under the full ladder.
const PROV = provenanceByReq();
const f = (severity, reqId) => ({ reqId, check: reqId, severity, message: `${reqId} fired` });
const cfg = (over = {}) => ({ mode: "local", profile: "askit-library", rules: {}, suppressions: [], ...over });

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
