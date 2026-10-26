// what-it-is:   the built-in gate profiles (F3)
// what-it-does: names maps of reqId -> effective severity ("off" to drop a check) so a plugin can be graded
//               against a chosen rubric (the full library ladder, or a lighter portable-plugin rubric, or
//               an opt-in house-style slot) without editing source
// why:          grading against the wrong rubric is the largest source of evaluator noise (linter-vs-judge
//               note sec 1); a profile removes it up front, deterministically, and is the opt-in home ADR
//               0028 named for house preferences (a toggle, not a universal law)
// used-by:      scripts/lib/config.mjs (validates the profile name), scripts/lib/resolve-config.mjs (applies it)
import { HOUSE_ADVISORY_IDS } from "./advisory-registry.mjs";

// The reqIds whose checks are askit-house conventions (provenance "house"): the askit manifest contract
// (U1), the repo-root AGENTS.md anatomy file (U2) and the description-quality scorer (U5) - both
// reclassified from portable to house per ADR 0029 - the entire Convergent set (S1-S8), and the entire
// Gold set (G1-G10). plain-plugin turns these off so a vanilla plugin is graded only on the portable,
// vendor-grounded universal checks. Listed as exact reqIds (never a wildcard) so adding a future check does
// not silently change a profile's meaning; the house-provenance.test.mjs invariant keeps this list in
// lockstep with the per-check provenance so the two never drift.
const HOUSE_REQIDS = [
  // U16 (metadata-placement, ADR 0050) is house because sec 3.7's PLACEMENT of the governance keys is
  // this Standard's convention, not a vendor's - nothing in agentskills.io or Claude Code says a
  // `version` must live under `metadata`. So outward grading of a stranger's plugin must not apply it,
  // exactly as it does not apply U5. U15 is NOT here: it rests on Claude Code's own discovery
  // behaviour, so it is vendor-cited and stays ON under plain-plugin, which is the whole difference
  // between a portable fact and a house convention.
  "U1", "U2", "U5", "U16",
  "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8",
  "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "G9", "G10",
];

const offMap = (reqIds) => Object.freeze(Object.fromEntries(reqIds.map((r) => [r, "off"])));

export const PROFILES = Object.freeze({
  // The identity profile (default): every rule keeps the severity its module declares. A no-op, so
  // selecting it (or omitting `profile`) reproduces the pre-F3 gate result byte for byte.
  // Every profile also carries `advisoryOff`, ADR 0063 sec 1's per-profile advisory off-set: the ADV ids
  // scripts/check.mjs drops from advisoryFindings under this profile, parallel to `rules`' per-reqId
  // off-map but for the separate advisory layer. Identity for the two full-ladder profiles (nothing is
  // house-provenance-exempt there); plain-plugin's is checked below for an exact match against
  // HOUSE_ADVISORY_IDS by tests/unit/house-provenance.test.mjs, the same invariant ADR 0029 required
  // for the spine's own house-provenance set.
  "askit-library": Object.freeze({
    description: "The full Bronze/Silver/Gold Advanced Skill Library Standard, as the modules declare it.",
    rules: Object.freeze({}),
    advisoryOff: Object.freeze([]),
  }),
  // A lighter rubric: grade a vanilla plugin on the portable, vendor-grounded universal checks only
  // (the objective + vendor-cited set), turning the askit library-ladder and house checks off. This is
  // how a plain Claude Code / Codex plugin is graded as itself, not against the askit library contract.
  // U4 (name-matches-dir) is downgraded to a warning here, not turned off: real third-party plugins
  // deliberately use the skill name as a display label or namespaced command (gsd ships 83 "gsd:*"
  // commands, hookify uses prose labels), so name-vs-dir divergence should inform a vanilla plugin, not
  // fail it. It stays a hard error under the default askit-library ladder, which commits to the canonical
  // name contract (Finding 4 / ADR 0031). Because U4 is "warn" (not "off"), the house-provenance invariant
  // - which checks the OFF-set equals the house-provenance set - is unaffected; U4 remains vendor-cited.
  "plain-plugin": Object.freeze({
    description: "Portable correctness only: the objective and vendor-grounded universal checks; the askit library-ladder (U1, U16, S1-S8) and Gold (G1-G10) checks off, and name-matches-dir (U4) advisory.",
    rules: Object.freeze({ ...offMap(HOUSE_REQIDS), U4: "warn" }),
    // ADR 0063 sec 1: house-provenance advisory signals (ADV4 today) do not run under plain-plugin,
    // for the same reason ADR 0029 turned off U1/U2/U5/U16 and the whole Convergent/Gold ladder there -
    // grading a plugin you do not own on this repository's own conventions is illegitimate, and "a warn
    // is still a finding in a published report" applies to an advisory finding too.
    advisoryOff: HOUSE_ADVISORY_IDS,
  }),
  // The opt-in home ADR 0028 named for re-homed house preferences (e.g. a future dash rule). Empty in
  // v1.3.0 (no house check exists post-ADR-0028; the dash preference stays the shipped hooks/no-dashes.mjs
  // hook), but the slot exists so a future preference is a profile a consumer selects, never a law.
  "house-style": Object.freeze({
    description: "Opt-in house preferences (empty in v1.3.0; the slot ADR 0028 reserved for re-homed style rules).",
    rules: Object.freeze({}),
    advisoryOff: Object.freeze([]),
  }),
});
