// what-it-is:   the check-introduction map the Standard ceiling resolves against (ADR 0027/0044)
// what-it-does: builds a reqId -> since map from the registry, so the ceiling in resolve-config.mjs can
//               ask when each check was introduced without importing the registry itself
// why:          ADR 0027 - a plugin pinning an older Standard must be graded against the ruleset that
//               existed at its pin, not silently re-graded against the newest spine; a leaf module (not
//               check.mjs) owns this so tier-report.mjs and evaluate.mjs can import it without a cycle
// used-by:      scripts/check.mjs, scripts/tier-report.mjs, scripts/evaluate.mjs; covered by tests/unit/standard-gate.test.mjs
import { CHECKS } from "./registry.mjs";
import { BASELINE } from "./standard-version.mjs";

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

// applyStandardDowngrade lived here and is GONE (ADR 0044). It ran as a PRE-pass over the raw findings,
// which put it before configuration resolved, and that ordering was the defect: a consumer's own
// `rules.X = "error"` was applied afterwards and simply beat it (E26). It also rewrote `severity` in
// place, so a held-back finding no longer knew what its check had emitted - which is exactly what a
// check needs to keep once it emits its TARGET severity and lets a ceiling hold it back.
//
// Its replacement is `activeConstraints` in standard-ceiling.mjs, applied LAST inside resolveFindings.
// This module keeps only SINCE_BY_REQ, the map that answers "when was this check introduced" - the one
// piece that genuinely needs the check registry.
