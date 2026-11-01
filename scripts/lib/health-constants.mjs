// what-it-is:   the health number's PRE-REGISTERED data (ADR 0063 sec 3 and sec 4; moved here W6
//               post-registration, finding 10 of the pre-merge adversarial review)
// what-it-does: holds every cut point, threshold and calibration constant the health number and ADV4
//               need, as plain data with no imports of its own - a LEAF module. scripts/lib/advisory-
//               registry.mjs and scripts/advisory/adv4-substance.mjs both re-export from here rather
//               than restating a value, so an import site written against either file keeps working
//               and a value can still only ever move by editing this one place.
// why:          these constants used to live inside scripts/lib/advisory-registry.mjs, which imports
//               scripts/advisory/adv4-substance.mjs (for ADVISORY_MODULES) - so adv4-substance.mjs could
//               not import ITS OWN BODY_WORD_FLOOR/DESCRIPTION_DUPLICATE_THRESHOLD back from the
//               registry without a circular import. Pre-registered 2026-10-30; NOT re-measured by this
//               move (see docs/internal/decisions/0063-...'s appended "post-registration measurement
//               corrections" note) - every value below is copied verbatim from the commit that first
//               pre-registered it.
// used-by:      scripts/lib/advisory-registry.mjs (re-exports HEALTH_*); scripts/advisory/adv4-
//               substance.mjs (re-exports BODY_WORD_FLOOR, DESCRIPTION_DUPLICATE_THRESHOLD, and uses
//               both directly); scripts/lib/health-score.mjs (HEALTH_BAND_CUT_POINTS,
//               HEALTH_CALIBRATION_MINIMUM); covered by tests/unit/health-score.test.mjs and
//               tests/unit/advisory-adv4-substance.test.mjs

/**
 * Pre-registered 2026-10-30 (ADR 0063 sec 4: "cut points are pre-registered, and fixed before either
 * [falsifiable] test runs"). A skill body at or under this many words is flagged. Chosen to be well
 * clear of a real stub skill's shortest honest body (the family's shortest live skill body, measured
 * 2026-10-30, runs to several sentences) while still catching a one-line placeholder such as
 * potemkin-gold's "Do nothing." (2 words).
 */
export const BODY_WORD_FLOOR = 20;

/**
 * Pre-registered 2026-10-30. Two sibling skill descriptions at or above this Jaccard similarity (over
 * the SAME tokeniser ADR 0039's triggerSurfaceOverlap() uses, imported rather than reimplemented) are
 * flagged as duplicated. Deliberately NOT triggerSurfaceOverlap's own 0.5 default (ADR 0063 sec 2:
 * "It does not inherit triggerSurface's default threshold... Its threshold is a cut point fixed under
 * section 4") - sibling descriptions inside one plugin legitimately share more vocabulary (the same
 * product, the same prefix) than two unrelated plugins' skills ever would, so the bar is higher.
 */
export const DESCRIPTION_DUPLICATE_THRESHOLD = 0.7;

/** The four band names, worst to best is the reverse of this order ("lowest" first on purpose: it is
 * the band the two falsifiable tests name). Applies to the four SCORED categories (substance, budget,
 * portability, security); currency has no band this pass (ADR 0063 sec 3: "Currency has no band in
 * this pass. A band would say how far behind is too far, and that is D-02's question."). */
export const HEALTH_BANDS = Object.freeze(["lowest", "weak", "fair", "healthy"]);

/** A 0-100 score's band cut points: score >= healthyMin -> "healthy"; >= fairMin -> "fair"; >= weakMin
 * -> "weak"; below weakMin -> "lowest". `weakMin` is the floor the potemkin-gold falsifiable test
 * checks a score against directly (ADR 0063 sec 4: "the test asks whether the fixture falls below a
 * fixed floor, not whether the floor was validated") - it applies regardless of whether the category's
 * calibration state is "calibrated" or "uncalibrated", because an uncalibrated category still shows no
 * band but still reports its raw measurement and score. */
export const HEALTH_BAND_CUT_POINTS = Object.freeze({ healthyMin: 80, fairMin: 50, weakMin: 20 });

/** The ship bar (ADR 0063 sec 4): for each banded category, the most deserving (labelled `deserves:
 * true`) trees allowed in the lowest band, and the smallest share of labelled undeserving trees that
 * must land below the top ("healthy") band. Pre-registered so a FUTURE calibration pass is checked
 * against a bar fixed before that pass ran, never chosen after the fact to flatter its own result.
 * Unused this ship: docs/reference/health-score.md records that every category is below
 * HEALTH_CALIBRATION_MINIMUM, so there is nothing calibrated yet to hold to this bar. */
export const HEALTH_SHIP_BAR = Object.freeze({ falsePositiveCeiling: 0, separationFloor: 0.8 });

/** ADR 0063 sec 4: "a category needs at least 5 positive and 5 negative labelled trees before it shows
 * a band." Below this minimum on EITHER side, the category reports `uncalibrated` and shows no band. */
export const HEALTH_CALIBRATION_MINIMUM = 5;
