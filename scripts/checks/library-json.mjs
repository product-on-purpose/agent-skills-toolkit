// what-it-is:   the library-json check (U1)
// what-it-does: asserts library.json exists at the root with the required fields (name, version, description, standard, tier)
// why:          enforces the Standard requirement U1 deterministically, one module per reqId, so the gate stays model-free
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "library-json", tier: "universal", reqId: "U1", since: "0.x", provenance: "house" };

/** The closed enum for library.json `selfValidation`. Absent means "npx". */
export const SELF_VALIDATION_VALUES = Object.freeze(["vendored", "npx"]);

/**
 * The migration window for the `selfValidation` SUBRULE (E35, ADR 0044). Static and activation-neutral.
 * `until: "0.13"` because the field is introduced at 0.13: a plugin that has not adopted 0.13 cannot be
 * expected to satisfy a rule that did not exist when it pinned.
 */
const SELF_VALIDATION_MIGRATION = Object.freeze({
  capAt: SEVERITY.WARN,
  until: "0.13",
  reason: "E35: library.json gains a selfValidation enum at Standard 0.13; an unknown field was previously ignored.",
});

const SEMVER = /^\d+\.\d+\.\d+(?:[-+].+)?$/;
const TIERS = ["universal", "convergent", "advanced"];
const REQUIRED = ["name", "version", "description", "standard", "tier"];

export function check(ctx) {
  const out = [];
  const rel = "library.json";
  if (ctx.library.parseError) {
    return [finding(meta.id, SEVERITY.ERROR, `library.json is not valid JSON: ${ctx.library.parseError}`, { file: rel, reqId: meta.reqId })];
  }
  const data = ctx.library.data;
  if (!data) {
    return [finding(meta.id, SEVERITY.ERROR, "library.json is missing; a plugin MUST carry one (Standard sec 5). Add name, version, description, standard, tier.", { file: rel, reqId: meta.reqId })];
  }
  for (const key of REQUIRED) {
    if (!(key in data)) out.push(finding(meta.id, SEVERITY.ERROR, `library.json is missing required field "${key}" (Standard sec 5.1).`, { file: rel, reqId: meta.reqId }));
  }
  if ("version" in data) {
    if (typeof data.version !== "string" || !SEMVER.test(data.version)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `library.json "version" must be a semver string (got ${JSON.stringify(data.version)}).`, { file: rel, reqId: meta.reqId }));
    }
  }
  if ("tier" in data && !TIERS.includes(data.tier)) {
    out.push(finding(meta.id, SEVERITY.ERROR, `library.json "tier" must be one of ${TIERS.join(", ")} (got "${data.tier}").`, { file: rel, reqId: meta.reqId }));
  }
  // `selfValidation` (E35): a CLOSED enum selecting which self-validation command gen-index writes into
  // INDEX.md. Absent is not a finding - it means "npx", which is right for every plugin that consumes
  // this toolkit rather than vendoring it.
  //
  // THIS SUBRULE CARRIES ITS OWN CEILING, and the reason generalises (ADR 0044). `U1` is registered with
  // `since: "0.x"`, so a NEW RULE added under an existing reqId inherits that reqId's introduction
  // version and gets NO migration window at all: a plugin pinned at 0.12 carrying an arbitrary
  // `selfValidation` value passes today, because an unknown library.json field is simply ignored, and
  // would fail the instant this release shipped - a red-ward movement INSIDE the governing invariant's
  // scope, not one of its exclusions. `meta.since` describes when the CHECK appeared and says nothing
  // about when a rule inside it did, so the finding-level metadata is the only thing that can express it.
  if (data.selfValidation !== undefined && !SELF_VALIDATION_VALUES.includes(data.selfValidation)) {
    out.push(finding(meta.id, SEVERITY.ERROR,
      `library.json "selfValidation" must be one of ${SELF_VALIDATION_VALUES.map((v) => `"${v}"`).join(" or ")} (got ${JSON.stringify(data.selfValidation)}). ` +
      `It selects which self-validation command gen-index writes into INDEX.md; absent means "npx". ` +
      `An unparseable value is not honoured - the generator falls back to the "npx" form, which is safe for any plugin.`,
      { file: rel, reqId: meta.reqId, migration: SELF_VALIDATION_MIGRATION }));
  }
  return out;
}
