// what-it-is:   the standard-aware downgrade pass (ADR 0027)
// what-it-does: builds a reqId -> since map from the registry and rewrites any error finding whose owning
//               check was introduced after the plugin's pinned library.json.standard to a warn (still
//               reported, never gate-failing), stamping downgraded/since/pinned provenance onto it
// why:          ADR 0027 - a plugin pinning an older Standard must be graded against the ruleset that
//               existed at its pin, not silently re-graded against the newest spine; a leaf module (not
//               check.mjs) owns this so tier-report.mjs and evaluate.mjs can import it without a cycle
// used-by:      scripts/check.mjs, scripts/tier-report.mjs, scripts/evaluate.mjs; covered by tests/unit/standard-gate.test.mjs
import { CHECKS } from "./registry.mjs";
import { BASELINE, isAfter } from "./standard-version.mjs";

/**
 * reqId -> since, built once from each registered check's meta. Null-reqId modules (none in CHECKS
 * today) are excluded. A check that forgets `since` defaults to the BASELINE sentinel, so it is never
 * downgraded (the safe default) and the omission surfaces in the registry-sync since-coverage test.
 */
export const SINCE_BY_REQ = Object.freeze(
  Object.fromEntries(
    CHECKS.filter((m) => m.meta?.reqId).map((m) => [m.meta.reqId, m.meta.since ?? BASELINE])
  )
);

/**
 * Apply ADR 0027: for each error finding, look up its check's `since` by reqId; if that check was
 * introduced after the plugin's `pinned` Standard, rewrite the finding's severity error -> warn and
 * stamp it (downgraded:true, since, pinned) so the report can explain why a former error is now a warn.
 * Pure and deterministic: returns a new array, never mutates the input, never consults a model.
 * @param {Array<{severity:string,reqId:string|null}>} findings raw findings from runAllChecks
 * @param {unknown} pinned library.json.standard (undefined/garbage -> no downgrade, full-strength grading)
 * @returns {Array<object>} a new findings array
 */
export function applyStandardDowngrade(findings, pinned) {
  return findings.map((f) => {
    if (f.severity !== "error" || !f.reqId) return f;
    const since = SINCE_BY_REQ[f.reqId] ?? BASELINE;
    if (!isAfter(since, pinned)) return f;
    return { ...f, severity: "warn", downgraded: true, since, pinned };
  });
}
