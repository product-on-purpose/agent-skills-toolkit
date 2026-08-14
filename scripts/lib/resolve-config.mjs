// what-it-is:   the config resolver (F3)
// what-it-does: annotates each finding with its effective severity (after profile + per-rule override),
//               its provenance, a suppressed flag (after the baseline matcher), a published-verdict
//               clampNotice, and a migration-cap ceiling, leaving the array intact so the report shows
//               what was downgraded/waived/clamped/capped rather than hiding it
// why:          one resolution path keeps check.mjs, evaluate.mjs, and tier-report.mjs consistent and keeps
//               the gate deterministic (a pure data transform over the finding array, no model, no I/O)
// used-by:      scripts/check.mjs, scripts/evaluate.mjs, scripts/tier-report.mjs
import { PROFILES } from "./profiles.mjs";
import { matchSuppression } from "./suppressions.mjs";
import { activeConstraints, latestDue, lowerSeverity, SEVERITY_RANK } from "./standard-ceiling.mjs";
import { BASELINE } from "./standard-version.mjs";

/**
 * Resolve raw findings against the loaded config. Precedence per finding: per-rule override > profile >
 * the severity the check emitted (which already carries F1's standard-aware downgrade). Then, in
 * published-verdict mode ONLY, the trust clamp lifts any objective/vendor-cited finding that a rule,
 * profile, or suppression turned off back to "warn" (with a clampNotice, never silently dropped); a
 * "house" finding is never clamped. The clamp only ever raises off->warn, never to error, so turning the
 * mode on can never flip a passing gate to failing.
 *
 * Finally, a per-finding migration cap (round-2 adversarial review, high severity: "S4 warn-first
 * findings can be promoted back to errors") is applied LAST, after every precedence step above has
 * produced effectiveSeverity. A finding may carry `migration: { capAt, until, reason }` (set by the
 * check itself for a shape it is warn-first migrating, e.g. S4's string-shaped chain declarations,
 * ADR 0041); if the effectiveSeverity computed above outranks `capAt`, it is pulled back down to
 * `capAt` and the reason is surfaced via `migrationNotice` - so a consumer whose `rules.<reqId> =
 * "error"` override gets overruled sees WHY, rather than the override silently appearing ignored. The
 * cap is a CEILING, never a floor: it is compared by SEVERITY_RANK, so a severity already at or below
 * `capAt` (including "off", from a rule or the published-verdict clamp) is left exactly as resolved -
 * suppression and "off" still win, because this step never raises anything. Applying it after
 * suppression matching (rather than before) means a capped-and-suppressed finding stays suppressed:
 * `suppressed` is computed independently above and this step never touches it.
 * Pure and synchronous; never mutates the input.
 * @param {Array<object>} findings raw findings (post-F1-downgrade)
 * @param {object} config frozen config from loadConfig
 * @param {Map<string,string>} provenanceByReq reqId -> provenance
 * @returns {Array<object>} resolved findings, each + { provenance, effectiveSeverity, downgradedFrom, suppressed, suppressionReason, clampNotice, migrationNotice }
 */
export function resolveFindings(findings, config, provenanceByReq, { pinned, sinceByReq = {} } = {}) {
  // The config is ORIGIN-BEARING (ADR 0044): every setting is `{ value, origin }` so the published-verdict
  // trust step can tell a rubric the grader chose from one the subject wrote about itself.
  const profileRules = (PROFILES[config.profile.value] ?? PROFILES["askit-library"]).rules;
  const published = config.mode.value === "published-verdict";
  return findings.map((f) => {
    const declared = f.severity;
    // Provenance and `since` are LOOKED UP, never read off the finding: a finding carries
    // { check, severity, message, file, reqId, migration, line } and neither `provenance` nor `meta`.
    const provenance = provenanceByReq.get(f.reqId) ?? "objective";
    const since = sinceByReq[f.reqId] ?? BASELINE;

    // STEPS 1-2: profile, then per-rule override, then suppression matching.
    const overridden = config.rules[f.reqId]?.value;   // already normalized to a bare severity by loadConfig
    const profiled = profileRules[f.reqId];
    let effectiveSeverity = overridden ?? profiled ?? declared;
    let sup = matchSuppression(f, config.suppressions);

    // STEP 3: the published-verdict trust step. W1c replaces this clamp entirely; until then it is the
    // behaviour it has always been.
    let clampNotice = null;
    if (published && provenance !== "house" && (effectiveSeverity === "off" || sup)) {
      clampNotice = `clamped to warn in published-verdict mode (provenance ${provenance}): a published verdict cannot disable an objective or vendor-cited check`;
      effectiveSeverity = "warn";
      sup = null; // surfaced, not suppressed
    }

    // The severity after steps 1-3 and BEFORE any ceiling. Both the ceiling's `from` and the binding test
    // measure against this, not against `declared`: reporting the ceiling as lowering from what the module
    // emitted would overstate what the pin is holding back when config had already moved it.
    const postTrust = effectiveSeverity;
    // A CONFIG-caused reduction that survived the trust step. This is the only way to tell a
    // config-lowered finding from a ceiling-lowered one, and the two belong in different dispositions.
    const configReduced = SEVERITY_RANK[postTrust] < SEVERITY_RANK[declared];

    // STEP 4: the Standard ceiling, always last, never raises.
    const constraints = activeConstraints(pinned, since, f.migration);
    for (const c of constraints) effectiveSeverity = lowerSeverity(effectiveSeverity, c.ceiling);

    // Did the ceiling ACTUALLY lower anything? A version condition that changes no outcome is not debt:
    // where config has already lowered a finding, the constraint is still version-active but binds
    // nothing, and reporting it would tell every debt consumer the pin is holding back a finding the
    // unchanged config keeps a warning either way.
    const binding = SEVERITY_RANK[effectiveSeverity] < SEVERITY_RANK[postTrust];
    // Per-constraint, deliberately NOT derived from the aggregate `binding`: at pin 0.11 both a `since`
    // ceiling (warn) and an `until` ceiling (capAt) can be active and EQUAL, and an aggregate test cannot
    // say which one did the work. Equal ceilings mean both bind, and the notice is emitted.
    const untilConstraint = constraints.find((c) => c.cause === "until");
    const bindingUntil = untilConstraint && SEVERITY_RANK[f.migration.capAt] < SEVERITY_RANK[postTrust] ? untilConstraint : null;
    const sinceConstraint = constraints.find((c) => c.cause === "since");

    return {
      ...f,
      provenance,
      effectiveSeverity,
      downgradedFrom: effectiveSeverity !== declared ? declared : null,
      suppressed: !!sup,
      suppressionReason: sup ? sup.reason ?? null : null,
      clampNotice,
      configReduced,
      // The cap's public explanation survives the move. The old branch both applied the cap and wrote
      // this notice; replacing it without re-specifying the notice would silently delete an explanation
      // that check.mjs, evaluate.mjs, --json and both renderers consume.
      migrationNotice: bindingUntil
        ? `capped at ${f.migration.capAt} until Standard ${f.migration.until} (${f.migration.reason}); severity before the cap was ${postTrust}`
        : null,
      // ALWAYS PRESENT, null when nothing BINDS - never omitted, never an empty object or array, so
      // `if (f.ceiling)` is the whole check a consumer needs.
      ceiling: binding
        ? {
            pinned,
            from: postTrust,
            to: effectiveSeverity,
            due: latestDue(constraints),
            constraints: constraints.map((c) => ({ cause: c.cause, due: c.due })),
          }
        : null,
      // LEGACY --json COMPATIBILITY, deprecated for one minor. Each field is specified independently,
      // because treating them as an atomic triple is self-contradictory for an `until`-only ceiling.
      // `downgraded` has always meant "an applied downgrade", so it follows `binding` rather than mere
      // version-activity; `since` is emitted only when an INTRODUCTION participates, because a tightening
      // does not change when a check was introduced and deriving it from max(due) would tell a reader the
      // check appeared in a version it did not.
      // Spread rather than assigned, so a non-binding finding carries no key at all - exactly the shape
      // the pre-pass produced. Assigning `undefined` would leave the key present for `in` and deepEqual.
      ...(binding
        ? { downgraded: true, pinned, ...(sinceConstraint ? { since: sinceConstraint.due } : {}) }
        : {}),
    };
  });
}

/** A finding GATES iff its effective severity is "error" AND it is not suppressed. */
export function gatingFindings(resolved) {
  return resolved.filter((f) => f.effectiveSeverity === "error" && !f.suppressed);
}
