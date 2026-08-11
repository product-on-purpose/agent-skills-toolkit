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

// Severity rank for the migration cap's ceiling comparison: off < warn < error. Ranking "off" below
// "warn" is what makes the cap a pure ceiling with no special-casing needed - min(current, capAt) by
// rank can only ever lower a severity, so an off'd (or suppressed, which is orthogonal to this rank
// entirely - see below) finding is never lifted back up to warn by a cap that only ever caps at warn.
const SEVERITY_RANK = { off: 0, warn: 1, error: 2 };

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
export function resolveFindings(findings, config, provenanceByReq) {
  const profileRules = (PROFILES[config.profile] ?? PROFILES["askit-library"]).rules;
  const published = config.mode === "published-verdict";
  return findings.map((f) => {
    const declared = f.severity;
    const provenance = provenanceByReq.get(f.reqId) ?? "objective";
    const overridden = config.rules[f.reqId];          // already normalized to a bare severity by loadConfig
    const profiled = profileRules[f.reqId];
    let effectiveSeverity = overridden ?? profiled ?? declared;
    let sup = matchSuppression(f, config.suppressions);
    let clampNotice = null;
    if (published && provenance !== "house" && (effectiveSeverity === "off" || sup)) {
      clampNotice = `clamped to warn in published-verdict mode (provenance ${provenance}): a published verdict cannot disable an objective or vendor-cited check`;
      effectiveSeverity = "warn";
      sup = null; // surfaced, not suppressed
    }
    let migrationNotice = null;
    if (f.migration && SEVERITY_RANK[effectiveSeverity] > SEVERITY_RANK[f.migration.capAt]) {
      migrationNotice = `capped at ${f.migration.capAt} until Standard ${f.migration.until} (${f.migration.reason}); your configured severity would otherwise be "${effectiveSeverity}"`;
      effectiveSeverity = f.migration.capAt;
    }
    return {
      ...f,
      provenance,
      effectiveSeverity,
      downgradedFrom: effectiveSeverity !== declared ? declared : null,
      suppressed: !!sup,
      suppressionReason: sup ? sup.reason ?? null : null,
      clampNotice,
      migrationNotice,
    };
  });
}

/** A finding GATES iff its effective severity is "error" AND it is not suppressed. */
export function gatingFindings(resolved) {
  return resolved.filter((f) => f.effectiveSeverity === "error" && !f.suppressed);
}
