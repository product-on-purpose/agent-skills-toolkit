// what-it-is:   coverage for the health number, ADR 0063 sec 3
// what-it-does: the two falsifiable tests sec 4 requires (potemkin-gold in the lowest substance band,
//               pin-abuse showing currency debt), the off-by-profile and --no-advisory contracts, and
//               the shape every category must hold (state, componentCount, no band while uncalibrated)
// why:          E61 (the tier certifies file shape); ADR 0063 sec 3/4
// used-by:      npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluate } from "../../scripts/evaluate.mjs";
import { computeHealth, CALIBRATION_STATE } from "../../scripts/lib/health-score.mjs";
import { HEALTH_BAND_CUT_POINTS } from "../../scripts/lib/advisory-registry.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const POTEMKIN_GOLD = path.join(REPO, "tests/fixtures/audit-corpus/potemkin-gold");
const PIN_ABUSE = path.join(REPO, "tests/fixtures/audit-corpus/pin-abuse");
const LONE_SKILL = path.join(REPO, "tests/fixtures/golden/lone-skill");

test("every category this ship is uncalibrated (below the 5-and-5 minimum - docs/reference/health-score.md's confusion counts)", () => {
  assert.equal(CALIBRATION_STATE, "uncalibrated");
});

// --- Falsifiable test 1 (ADR 0063 sec 4): potemkin-gold lands in the lowest substance band ---

test("potemkin-gold's substance score falls below the pre-registered 'lowest' band floor", () => {
  const r = evaluate(POTEMKIN_GOLD);
  const substance = r.health.categories.substance;
  assert.equal(substance.state, "scored");
  assert.ok(
    substance.measurement.score < HEALTH_BAND_CUT_POINTS.weakMin,
    `score ${substance.measurement.score} must be under the pre-registered weakMin (${HEALTH_BAND_CUT_POINTS.weakMin})`
  );
  // Uncalibrated this ship: the category reports its raw measurement but NEVER a band key, exactly as
  // ADR 0063 sec 4 says ("the test asks whether the fixture falls below a fixed floor, not whether the
  // floor was validated").
  assert.equal(substance.band, undefined, "no banded category may carry a band while uncalibrated");
});

// ADR 0063 sec 4: "the test must still pass with the placeholder-body signal removed, carried by the
// body-length floor and description uniqueness alone". Proven here by asserting placeholderCount is 0
// for this fixture (the generic catalogue does not fire on "Do nothing.") while the fixture still fails
// - i.e. the OTHER two signals alone already carry the result, with the third signal contributing zero.
test("potemkin-gold fails the substance floor WITHOUT any help from the placeholder-phrase signal", () => {
  const r = evaluate(POTEMKIN_GOLD);
  const substance = r.health.categories.substance;
  const m = substance.measurement;
  assert.equal(m.placeholderCount, 0, "the generic catalogue must not special-case this fixture's exact words");
  assert.ok(m.underFloorCount > 0 && m.duplicateDescriptionCount > 0, "the floor and duplicate signals alone must still fire");
  assert.equal(m.flaggedCount, substance.componentCount, "every skill is flagged by the floor/duplicate signals alone");
});

// --- Falsifiable test 2 (ADR 0063 sec 4): pin-abuse shows currency debt ---

test("pin-abuse shows currency debt: minors behind derived from the shipped edition, and findings waived by the pin", () => {
  const r = evaluate(PIN_ABUSE);
  const currency = r.health.categories.currency;
  assert.equal(currency.state, "scored");
  assert.ok(currency.measurement.minorsBehind > 0, "a 0.9 pin must be measured as behind this toolkit's shipped edition");
  assert.ok(currency.measurement.waivedCount >= 1, "at least one finding must be waived by the pin (the fixture's own 11 downgraded warnings)");
  // Never a literal: derived from the pin and the shipped edition this run resolved against.
  assert.notEqual(currency.measurement.minorsBehind, undefined);
});

test("currency never carries a band, in any calibration state (ADR 0063 sec 3: 'Currency has no band in this pass')", () => {
  const r = evaluate(PIN_ABUSE);
  assert.equal(r.health.categories.currency.band, undefined);
});

// --- off-by-profile and --no-advisory contracts (ADR 0063 sec 1) ---

test("--profile plain-plugin reports substance and currency as off-by-profile; portability/budget/security stay scored", () => {
  const r = evaluate(POTEMKIN_GOLD, { profile: "plain-plugin" });
  assert.equal(r.health.categories.substance.state, "off-by-profile");
  assert.equal(r.health.categories.currency.state, "off-by-profile");
  assert.equal(r.health.categories.portability.state, "scored");
  assert.equal(r.health.categories.budget.state, "scored");
  assert.equal(r.health.categories.security.state, "scored");
});

test("--no-advisory yields advisoryLayer 'off' and health: null", () => {
  const r = evaluate(POTEMKIN_GOLD, { noAdvisory: true });
  assert.equal(r.advisoryLayer, "off");
  assert.equal(r.health, null);
});

// --- shape invariants ---

test("every category reports a componentCount when scored", () => {
  const r = evaluate(POTEMKIN_GOLD);
  for (const [name, c] of Object.entries(r.health.categories)) {
    if (c.state === "scored" || c.state === "ahead") {
      assert.ok(Number.isInteger(c.componentCount) && c.componentCount >= 0, `${name} must report an integer componentCount`);
    }
  }
});

test("component scope: currency is not-applicable (unpinned) since a lone skill has no library.json pin", () => {
  const r = evaluate(LONE_SKILL);
  assert.equal(r.scope, "component");
  assert.equal(r.health.categories.currency.state, "not-applicable");
  assert.equal(r.health.categories.currency.reason, "unpinned");
});

test("computeHealth returns null when the advisory layer is off", () => {
  assert.equal(computeHealth({ skills: [] }, { advisoryLayer: "off" }), null);
});

test("a category with nothing to measure reports not-applicable, never a score of 100", () => {
  const health = computeHealth({ root: "/tmp/x", skills: [], agentDocs: [], commands: [] }, { advisoryLayer: "on" });
  assert.equal(health.categories.substance.state, "not-applicable");
  assert.equal(health.categories.budget.state, "not-applicable");
  assert.equal(health.categories.portability.state, "not-applicable");
});

test("no cross-category average exists anywhere on the health object", () => {
  const r = evaluate(POTEMKIN_GOLD);
  assert.equal(Object.prototype.hasOwnProperty.call(r.health, "overall"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(r.health, "average"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(r.health, "score"), false);
});

// --- ADR 0063 sec 2's safety net: health is computed BESIDE the tier and never moves it ---

test("the tier, exit-relevant findings, and summary are unchanged by health being computed at all", () => {
  const withHealth = evaluate(POTEMKIN_GOLD);
  const withoutHealth = evaluate(POTEMKIN_GOLD, { noAdvisory: true });
  assert.equal(withHealth.tier, withoutHealth.tier);
  assert.deepEqual(withHealth.summary, withoutHealth.summary);
  assert.deepEqual(withHealth.findings, withoutHealth.findings);
});
