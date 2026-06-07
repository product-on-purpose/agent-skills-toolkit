// what-it-is:   the built-in gate profiles (F3)
// what-it-does: names maps of reqId -> effective severity ("off" to drop a check) so a plugin can be graded
//               against a chosen rubric (the full library ladder, or a lighter portable-plugin rubric, or
//               an opt-in house-style slot) without editing source
// why:          grading against the wrong rubric is the largest source of evaluator noise (linter-vs-judge
//               note sec 1); a profile removes it up front, deterministically, and is the opt-in home ADR
//               0028 named for house preferences (a toggle, not a universal law)
// used-by:      scripts/lib/config.mjs (validates the profile name), scripts/lib/resolve-config.mjs (applies it)

// The reqIds whose checks are askit-house conventions (provenance "house"): the askit manifest contract
// (U1), the entire Convergent set (S1-S8), and the entire Gold set (G1-G10). plain-plugin turns these off
// so a vanilla plugin is graded only on the portable, vendor-grounded universal checks. Listed as exact
// reqIds (never a wildcard) so adding a future check does not silently change a profile's meaning.
const HOUSE_REQIDS = [
  "U1",
  "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8",
  "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "G9", "G10",
];

const offMap = (reqIds) => Object.freeze(Object.fromEntries(reqIds.map((r) => [r, "off"])));

export const PROFILES = Object.freeze({
  // The identity profile (default): every rule keeps the severity its module declares. A no-op, so
  // selecting it (or omitting `profile`) reproduces the pre-F3 gate result byte for byte.
  "askit-library": Object.freeze({
    description: "The full Bronze/Silver/Gold Advanced Skill Library Standard, as the modules declare it.",
    rules: Object.freeze({}),
  }),
  // A lighter rubric: grade a vanilla plugin on the portable, vendor-grounded universal checks only
  // (the objective + vendor-cited set), turning the askit library-ladder and house checks off. This is
  // how a plain Claude Code / Codex plugin is graded as itself, not against the askit library contract.
  "plain-plugin": Object.freeze({
    description: "Portable correctness only: the objective and vendor-grounded universal checks; the askit library-ladder (U1, S1-S8) and Gold (G1-G10) checks off.",
    rules: offMap(HOUSE_REQIDS),
  }),
  // The opt-in home ADR 0028 named for re-homed house preferences (e.g. a future dash rule). Empty in
  // v1.3.0 (no house check exists post-ADR-0028; the dash preference stays the shipped hooks/no-dashes.mjs
  // hook), but the slot exists so a future preference is a profile a consumer selects, never a law.
  "house-style": Object.freeze({
    description: "Opt-in house preferences (empty in v1.3.0; the slot ADR 0028 reserved for re-homed style rules).",
    rules: Object.freeze({}),
  }),
});
