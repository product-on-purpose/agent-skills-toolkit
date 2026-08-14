// what-it-is:   the Standard ceiling (ADR 0044) - one post-resolution severity ceiling over `since` and
//               `until`
// what-it-does: given a plugin's pin, the check's introduction version, and a finding's optional
//               migration metadata, reports which version constraints are ACTIVE and what each one caps
//               the finding at; the resolver applies them last and takes the lower severity by rank
// why:          the repository had three version-gating mechanisms and only one read the pin. ADR 0027's
//               downgrade ran as a PRE-pass, so a consumer's `rules.X = "error"` beat it (E26), and
//               ADR 0041's migration cap was unconditional, so it could never graduate. `since` governs
//               an INTRODUCTION and `until` governs a TIGHTENING: two inputs to one ceiling, not two
//               mechanisms. A leaf module (it imports only version arithmetic) so resolve-config.mjs can
//               use it without pulling the check registry into its import graph
// used-by:      scripts/lib/resolve-config.mjs; covered by tests/unit/standard-ceiling.test.mjs
import { compareStandard, isAfter } from "./standard-version.mjs";

/**
 * Severity rank: off < warn < error.
 *
 * Every comparison in the ceiling is BY RANK, never lexical, and the difference is not cosmetic:
 * lexical `min("error", "warn")` is `"error"`, while the rank-correct answer is `"warn"`. An
 * implementation that compared these as strings would invert the ceiling into a floor.
 *
 * Ranking `off` below `warn` is what makes this a pure ceiling with no special-casing: the minimum of
 * (current, cap) can only ever lower a severity, so an off'd finding is never lifted back to warn by a
 * cap that caps at warn.
 */
export const SEVERITY_RANK = Object.freeze({ off: 0, warn: 1, error: 2 });

/** The lower of two severities BY RANK. Never lexical - see SEVERITY_RANK. */
export function lowerSeverity(a, b) {
  return SEVERITY_RANK[b] < SEVERITY_RANK[a] ? b : a;
}

/**
 * The version constraints ACTIVE for one finding at one pin.
 *
 * Two causes, and naming them apart is the distinction two mechanisms each invented a private substitute
 * for:
 *   - `since`  an INTRODUCTION. The check did not exist at your pin, so its findings cap at `warn`.
 *   - `until`  a TIGHTENING. The check existed, but this shape is mid-migration, so it caps at the
 *              finding's own `migration.capAt` until the pin reaches `migration.until`.
 *
 * Both can be active at once and that is not a corner case: at pin 0.11 a `U13` finding is under an
 * introduction ceiling (`since: "0.12"`) AND a tightening ceiling (`until: "0.13"`) simultaneously. That
 * is why this returns an ARRAY and why the caller's `due` is the maximum across it - the finding is only
 * free when the LAST constraint lifts. A singular cause would report such a finding as due at 0.12 while
 * it is in fact still capped until 0.13.
 *
 * No pin, a garbage pin, and `--strict` (which passes `pinned` as undefined) all yield NO constraints,
 * because `isAfter` already returns false for a missing, unparseable, or sentinel pin. That is ADR 0027's
 * existing back-compat rule - a plugin that never declared which contract it adopted cannot be graded
 * against the one it adopted - and it means strict needs no second flag threaded through here to stay in
 * sync with the pin.
 *
 * @param {unknown} pinned    library.json.standard
 * @param {string} since      the owning check's meta.since
 * @param {{capAt: string, until: string, reason?: string}|undefined} migration the finding's own metadata
 * @returns {Array<{cause: "since"|"until", due: string, ceiling: string}>}
 */
export function activeConstraints(pinned, since, migration) {
  const constraints = [];
  if (since !== undefined && isAfter(since, pinned)) {
    constraints.push({ cause: "since", due: since, ceiling: "warn" });
  }
  if (migration && migration.until !== undefined && isAfter(migration.until, pinned)) {
    // The ceiling value is the finding's own capAt, which is why this function takes the WHOLE migration
    // object: passing `until` alone leaves the ceiling unconstructible.
    constraints.push({ cause: "until", due: migration.until, ceiling: migration.capAt });
  }
  return constraints;
}

/**
 * The greatest `due` across active constraints, by Standard-version arithmetic.
 *
 * NOT numeric or lexical max, both of which order "0.9" after "0.10". Returns null for an empty set.
 */
export function latestDue(constraints) {
  let best = null;
  for (const c of constraints) {
    if (best === null || compareStandard(c.due, best) > 0) best = c.due;
  }
  return best;
}
