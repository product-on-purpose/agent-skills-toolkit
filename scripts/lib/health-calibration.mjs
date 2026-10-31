// what-it-is:   per-category calibration state for the health number (ADR 0063 sec 4; W6 post-merge-
//               review finding 6)
// what-it-does: holds each health category's labelled positive/negative count from the 2026-09-04
//               audit corpus, measured against the committed, machine-readable inventory at
//               tests/fixtures/audit-corpus/inventory.json, and compares each count to
//               HEALTH_CALIBRATION_MINIMUM to decide whether THAT CATEGORY (never all five at once)
//               reports `calibrated` or `uncalibrated`.
// why:          Before this file, scripts/lib/health-score.mjs exported one CALIBRATION_STATE constant
//               applied to every category alike, so HEALTH_CALIBRATION_MINIMUM was pre-registered data
//               nothing ever compared anything against - a constant that is never read is not a
//               calibration rule, it is a note. The counts below are a deliberate SUMMARY of the
//               committed inventory, not a second source of truth for it:
//               tests/unit/health-calibration.test.mjs recomputes the same two numbers per category
//               straight from tests/fixtures/audit-corpus/inventory.json and asserts they match, so
//               this file cannot drift from the inventory it summarizes.
// used-by:      scripts/lib/health-score.mjs (calibrationStateFor(), per category); covered by
//               tests/unit/health-calibration.test.mjs and tests/unit/health-score.test.mjs
//
// THIS FILE SHIPS IN THE NPM TARBALL; tests/fixtures/ DOES NOT (package.json's `files` list). The
// counts are therefore DATA here, not a runtime read of the inventory - the same reason the pre-
// registered cut points live in scripts/lib/health-constants.mjs as data rather than being computed
// from docs/reference/health-score.md at runtime.
import { HEALTH_CALIBRATION_MINIMUM } from "./health-constants.mjs";

/**
 * Measured 2026-10-30 against the labelled 2026-09-04 audit corpus inventory
 * (tests/fixtures/audit-corpus/inventory.json), EXCLUDING the two falsifiable-test hold-outs
 * (`01-potemkin-gold`, `09-pin-abuse`), their pin-state variants (`09b`/`09c`/`09d`), and every
 * `deserves: null` hardening tree (ADR 0063 sec 4). A tree is a POSITIVE for a category iff the
 * inventory's `categories` field for that tree names it; every `deserves: true` tree is a NEGATIVE for
 * every category (ADR 0063 sec 4: "The seven deserving trees are negatives for every category").
 * These numbers match docs/reference/health-score.md's "Confusion counts" table verbatim - that page
 * is the narrative record of the same measurement; this is its machine-readable form.
 */
export const CATEGORY_LABEL_COUNTS = Object.freeze({
  substance: Object.freeze({ positives: 1, negatives: 7 }),
  budget: Object.freeze({ positives: 1, negatives: 7 }),
  portability: Object.freeze({ positives: 0, negatives: 7 }),
  security: Object.freeze({ positives: 1, negatives: 7 }),
  currency: Object.freeze({ positives: 0, negatives: 7 }),
});

/**
 * The comparison itself, pure and independent of the lookup table above: calibrated iff BOTH counts
 * meet HEALTH_CALIBRATION_MINIMUM (ADR 0063 sec 4, "at least 5 positive AND 5 negative labelled trees
 * before it shows a band"). Exported separately from calibrationStateFor() so a test can feed it
 * synthetic counts and prove the comparison is real - a mutant that hard-codes `calibrated: false` (or
 * ignores one side of the AND) must turn such a test red.
 * @param {{positives:number, negatives:number}} counts
 * @returns {boolean}
 */
export function calibrationState({ positives, negatives }) {
  return positives >= HEALTH_CALIBRATION_MINIMUM && negatives >= HEALTH_CALIBRATION_MINIMUM;
}

/**
 * Whether `category` is calibrated, per ADR 0063 sec 4: "a category needs at least 5 positive AND 5
 * negative labelled trees before it shows a band." Below the minimum on EITHER side, `calibrated` is
 * false and scripts/lib/health-score.mjs's category functions omit `band` even though they still
 * report a measurement and a score - "uncalibrated" describes the EVIDENCE, not the category's own
 * measurement, which is unaffected either way.
 * @param {"substance"|"budget"|"portability"|"security"} category - currency is never banded (ADR
 *   0063 sec 3) and has no entry here that scripts/lib/health-score.mjs reads a band decision from.
 * @returns {{calibrated:boolean, positives:number, negatives:number}}
 */
export function calibrationStateFor(category) {
  const counts = CATEGORY_LABEL_COUNTS[category] ?? { positives: 0, negatives: 0 };
  return { calibrated: calibrationState(counts), positives: counts.positives, negatives: counts.negatives };
}
