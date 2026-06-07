// what-it-is:   the config resolver (F3)
// what-it-does: annotates each finding with its effective severity (after profile + per-rule override),
//               its provenance, a suppressed flag (after the baseline matcher), and a published-verdict
//               clampNotice, leaving the array intact so the report shows what was downgraded/waived/clamped
//               rather than hiding it
// why:          one resolution path keeps check.mjs, evaluate.mjs, and tier-report.mjs consistent and keeps
//               the gate deterministic (a pure data transform over the finding array, no model, no I/O)
// used-by:      scripts/check.mjs, scripts/evaluate.mjs, scripts/tier-report.mjs
import { PROFILES } from "./profiles.mjs";
import { matchSuppression } from "./suppressions.mjs";

/**
 * Resolve raw findings against the loaded config. Precedence per finding: per-rule override > profile >
 * the severity the check emitted (which already carries F1's standard-aware downgrade). Then, in
 * published-verdict mode ONLY, the trust clamp lifts any objective/vendor-cited finding that a rule,
 * profile, or suppression turned off back to "warn" (with a clampNotice, never silently dropped); a
 * "house" finding is never clamped. The clamp only ever raises off->warn, never to error, so turning the
 * mode on can never flip a passing gate to failing. Pure and synchronous; never mutates the input.
 * @param {Array<object>} findings raw findings (post-F1-downgrade)
 * @param {object} config frozen config from loadConfig
 * @param {Map<string,string>} provenanceByReq reqId -> provenance
 * @returns {Array<object>} resolved findings, each + { provenance, effectiveSeverity, downgradedFrom, suppressed, suppressionReason, clampNotice }
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
    return {
      ...f,
      provenance,
      effectiveSeverity,
      downgradedFrom: effectiveSeverity !== declared ? declared : null,
      suppressed: !!sup,
      suppressionReason: sup ? sup.reason ?? null : null,
      clampNotice,
    };
  });
}

/** A finding GATES iff its effective severity is "error" AND it is not suppressed. */
export function gatingFindings(resolved) {
  return resolved.filter((f) => f.effectiveSeverity === "error" && !f.suppressed);
}
