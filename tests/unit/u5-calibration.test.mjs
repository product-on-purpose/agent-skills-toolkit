// what-it-is:   the U5 calibration - what the description scorer actually does on labelled data
// what-it-does: scores twenty hand-labelled descriptions and pins the current confusion matrix, so any
//               change to U5 shows up as a measured number rather than an opinion
// why:          the README says U5 "protects the one signal an agent uses to decide relevance". That is a
//               testable claim about a heuristic, and this is the test. Before this file the claim rested
//               on a script in a gitignored audit folder, which meant nobody here could re-run it
// used-by:      npm test; tests/fixtures/u5-calibration/descriptions.json is the labelled set
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scoreDescription, THRESHOLD } from "../../scripts/checks/description-score.mjs";

const FIXTURE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures/u5-calibration/descriptions.json"
);
const SET = JSON.parse(readFileSync(FIXTURE, "utf8"));
const passes = (d) => scoreDescription(d) >= THRESHOLD;

/**
 * THE BASELINE, AND WHY IT IS PINNED RATHER THAN ASPIRED TO.
 *
 * These are not the numbers anyone wants. They are the numbers U5 produces today, measured on data written
 * before anyone looked at its regexes. Pinning them makes two things true that were not true before:
 *
 *   - A CHANGE to U5 that does not move them is a change that did not fix anything, and this test says so.
 *   - A change that DOES move them fails here, deliberately. That failure is the deliverable of the U5
 *     redesign (E63): update these constants in the same commit, and the diff is the evidence the redesign
 *     worked. A test that silently tolerated improvement would leave the redesign unmeasurable.
 *
 * Re-measured 2026-09-09 at the current code and they are unchanged from the audit's figures.
 */
const BASELINE = Object.freeze({ excellentPassing: 2, uselessPassing: 8 });

test("the labelled set is intact: ten excellent, ten useless", () => {
  assert.equal(SET.excellent.length, 10);
  assert.equal(SET.useless.length, 10);
  for (const d of [...SET.excellent, ...SET.useless]) {
    assert.equal(typeof d, "string");
    assert.ok(d.length > 0, "an empty description would be scored by a different code path (U3 owns it)");
  }
});

test("BASELINE: U5 passes 2 of 10 excellent descriptions and 8 of 10 useless ones", () => {
  const excellentPassing = SET.excellent.filter(passes).length;
  const uselessPassing = SET.useless.filter(passes).length;
  assert.equal(
    excellentPassing,
    BASELINE.excellentPassing,
    "excellent-passing count moved; if U5 was improved, update BASELINE in the same commit and say so"
  );
  assert.equal(
    uselessPassing,
    BASELINE.uselessPassing,
    "useless-passing count moved; if U5 was improved, update BASELINE in the same commit and say so"
  );
});

test("the check is worse than a coin flip on this set, and that is the finding", () => {
  // Stated as an assertion rather than left in prose, because it is the one sentence the README's claim
  // has to survive. Positive class = "warns", which is what the check is for.
  const flaggedCorrectly = SET.useless.filter((d) => !passes(d)).length;
  const flaggedTotal = flaggedCorrectly + SET.excellent.filter((d) => !passes(d)).length;
  const precision = flaggedCorrectly / flaggedTotal;
  assert.ok(precision <= 0.5, `of everything U5 flags, at most half is genuinely bad (measured ${precision.toFixed(2)})`);
});

test("the failure is STRUCTURAL, not a threshold that needs nudging", () => {
  // The tempting fix is to move the bar. This says why that cannot work: the two populations OVERLAP, and
  // the useless set scores HIGHER on average than the excellent one. No single cut-off separates them, so
  // E63's redesign has to change what is measured rather than where the line sits.
  const mean = (xs) => xs.reduce((a, d) => a + scoreDescription(d), 0) / xs.length;
  const meanExcellent = mean(SET.excellent);
  const meanUseless = mean(SET.useless);
  assert.ok(
    meanUseless > meanExcellent,
    `the useless set must score higher on average for this finding to hold (excellent ${meanExcellent.toFixed(2)}, useless ${meanUseless.toFixed(2)})`
  );
});

test("a perfect score on a hollow description is reachable, which is the mechanism", () => {
  // Eight of the ten useless descriptions score a full 1.00 as displayed. The scorer rewards the phrase
  // "Use when the user" plus one verb stem, and neither requires the description to mean anything.
  //
  // Compared with >= 0.99 rather than === 1 on purpose: the score is a sum of floating-point weights, so
  // a "perfect" score is 0.9999999999999999 and an equality test silently finds ZERO of them. This test
  // was written with === 1 first and found none, which is the same class of quiet pass it exists to catch.
  const perfect = SET.useless.filter((d) => scoreDescription(d) >= 0.99);
  assert.ok(perfect.length >= 5, `at least half the useless set scores a full 1.00 (found ${perfect.length})`);
});
