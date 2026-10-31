// what-it-is:   coverage for the health number, ADR 0063 sec 3
// what-it-does: the two falsifiable tests sec 4 requires (potemkin-gold in the lowest substance band,
//               pin-abuse showing currency debt), the off-by-profile and --no-advisory contracts, and
//               the shape every category must hold (state, componentCount, no band while uncalibrated)
// why:          E61 (the tier certifies file shape); ADR 0063 sec 3/4; W6 post-merge-review finding 6
//               (calibration is a PER-CATEGORY state, computed against HEALTH_CALIBRATION_MINIMUM, not
//               one constant for all five)
// used-by:      npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluate } from "../../scripts/evaluate.mjs";
import { computeHealth } from "../../scripts/lib/health-score.mjs";
import { HEALTH_BAND_CUT_POINTS, HEALTH_CALIBRATION_MINIMUM } from "../../scripts/lib/advisory-registry.mjs";
import { calibrationStateFor, calibrationState } from "../../scripts/lib/health-calibration.mjs";
import { MAX_LINES } from "../../scripts/checks/instruction-budget.mjs";
import { shippedStandardEdition } from "../../scripts/lib/shipped-standard.mjs";
import { cpSync, mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const POTEMKIN_GOLD = path.join(REPO, "tests/fixtures/audit-corpus/potemkin-gold");
const PIN_ABUSE = path.join(REPO, "tests/fixtures/audit-corpus/pin-abuse");
const LONE_SKILL = path.join(REPO, "tests/fixtures/golden/lone-skill");

// W6 finding 6: calibration is computed PER CATEGORY against HEALTH_CALIBRATION_MINIMUM, not read off
// one constant shared by all five - this test fails on the OLD single-constant design (there is no
// such constant to import any more) and would also fail a mutant that hard-codes `calibrated: true`
// regardless of the counts, because every category here is genuinely below the minimum on this ship.
test("every category this ship is uncalibrated (below the 5-and-5 minimum - docs/reference/health-score.md's confusion counts)", () => {
  for (const category of ["substance", "budget", "portability", "security"]) {
    const { calibrated, positives, negatives } = calibrationStateFor(category);
    assert.equal(calibrated, false, `${category}: expected uncalibrated given ${positives} positives / ${negatives} negatives`);
    assert.ok(
      positives < HEALTH_CALIBRATION_MINIMUM || negatives < HEALTH_CALIBRATION_MINIMUM,
      `${category}: calibrationStateFor must actually compare against HEALTH_CALIBRATION_MINIMUM (${HEALTH_CALIBRATION_MINIMUM}), not just report false`
    );
  }
});

test("calibrationState actually compares against HEALTH_CALIBRATION_MINIMUM: clearing it on both sides calibrates, falling short on either side does not", () => {
  // Proves the comparison is real, not a constant "uncalibrated" in different clothing (W6 finding 6:
  // "so the constant is actually used"). A mutant that returns false unconditionally, or that checks
  // only one side of the AND, turns one of these three red.
  const m = HEALTH_CALIBRATION_MINIMUM;
  assert.equal(calibrationState({ positives: m, negatives: m }), true, "exactly at the minimum on both sides must calibrate");
  assert.equal(calibrationState({ positives: m - 1, negatives: m }), false, "one short on positives must not calibrate");
  assert.equal(calibrationState({ positives: m, negatives: m - 1 }), false, "one short on negatives must not calibrate");
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

// --- W6 finding 3 (pre-merge adversarial review): the budget category, and "a pin cannot buy a
// better health score" (ADR 0063 sec 3) --------------------------------------------------------

/** The line ending the checked-out tree actually uses (mirrors tests/unit/standard-pin-floor.test.mjs's
 *  own eolOf/cloneWithPin, duplicated rather than imported so this file stays independently readable). */
function eolOf(dir) {
  return readFileSync(path.join(dir, "library.json"), "utf8").includes("\r\n") ? "\r\n" : "\n";
}

function cloneAt(pin) {
  const dir = path.join(mkdtempSync(path.join(tmpdir(), "health-pin-")), "plugin");
  cpSync(PIN_ABUSE, dir, { recursive: true });
  const eol = eolOf(dir);
  const manifest = path.join(dir, "library.json");
  const lib = JSON.parse(readFileSync(manifest, "utf8"));
  lib.standard = pin;
  writeFileSync(manifest, (JSON.stringify(lib, null, 2) + "\n").replace(/\r?\n/g, eol));
  return { dir, eol };
}

/** Pushes one already-registered skill's body over MAX_LINES, so the budget category's
 *  `skillsOverBudgetLines` signal fires without touching library.json's component list at all. */
function pushOneSkillOverBudget(dir, eol) {
  const skillPath = path.join(dir, "skills/pg-skill-one/SKILL.md");
  const frontmatter = [
    "---", 'name: "pg-skill-one"', 'description: "Creates output for things. Use when the user asks for things."',
    "metadata:", '  version: "0.1.0"', "  tier: universal", "  status: active", '  chain: "pg-agent-one"', "---", "",
  ].join(eol);
  const body = Array.from({ length: MAX_LINES + 1 }, (_, i) => `Step ${i + 1}: do the next thing.`).join(eol) + eol;
  writeFileSync(skillPath, frontmatter + body);
}

test("W6 finding 3: an over-budget skill moves the budget category, and only the budget category", () => {
  const { dir, eol } = cloneAt("0.9");
  const before = evaluate(dir).health.categories.budget;
  pushOneSkillOverBudget(dir, eol);
  const after = evaluate(dir).health.categories.budget;

  assert.equal(before.measurement.skillsOverBudgetLines, 0);
  assert.equal(after.measurement.skillsOverBudgetLines, 1, "the pushed skill must be counted as over budget");
  assert.ok(after.measurement.score < before.measurement.score, "the budget score must drop once a skill is over budget");
});

test('W6 finding 3 (ADR 0063 sec 3, "a pin can therefore buy a quieter gate but never a better health score"): the same tree re-pinned to an older edition produces an IDENTICAL health measurement in every category except currency', () => {
  const old = evaluate(cloneAt("0.9").dir);
  // The toolkit's OWN shipped edition, never a literal: a pin AT the shipped edition waives nothing
  // and sits zero minors behind, by definition - the same derivation currencyCategory() itself uses.
  const current = evaluate(cloneAt(shippedStandardEdition()).dir);

  // The gate itself DOES move: 0.9 passes (waived), 0.16 fails outright - that is the "quieter gate"
  // the ADR names. The tier differs too, proving the two runs are not accidentally identical.
  assert.notEqual(old.tier, current.tier);

  // But the four non-currency categories must be measured IDENTICALLY either way: same componentCount,
  // same measurement, same state - a pin changes nothing about what ADV1/ADV2/ADV3/ADV4 actually found.
  for (const name of ["substance", "budget", "portability", "security"]) {
    assert.deepEqual(current.health.categories[name], old.health.categories[name], `${name} must be pin-invariant`);
  }

  // Currency is the one category ALLOWED to differ, because it is what reports what the pin bought:
  // a current pin waives nothing (minorsBehind 0, waivedCount 0); the old 0.9 pin waives 11 findings
  // and sits several minors behind.
  assert.equal(current.health.categories.currency.measurement.minorsBehind, 0);
  assert.equal(current.health.categories.currency.measurement.waivedCount, 0);
  assert.ok(old.health.categories.currency.measurement.minorsBehind > 0);
  assert.ok(old.health.categories.currency.measurement.waivedCount > 0);
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

// W6 finding 11: componentCount is required in EVERY state, not only "scored"/"ahead" - a
// not-applicable or off-by-profile category still knows how many components were in scope (zero, or
// the live count a profile turned the signal off for). Checked against both a plugin with every
// category scored (potemkin-gold) and one where substance/currency are off-by-profile (plain-plugin).
test("every category reports a componentCount in every state, not only when scored", () => {
  for (const r of [evaluate(POTEMKIN_GOLD), evaluate(POTEMKIN_GOLD, { profile: "plain-plugin" })]) {
    for (const [name, c] of Object.entries(r.health.categories)) {
      assert.ok(Number.isInteger(c.componentCount) && c.componentCount >= 0, `${name} (state ${c.state}) must report an integer componentCount`);
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
