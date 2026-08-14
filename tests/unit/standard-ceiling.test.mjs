// what-it-is:   unit coverage for the ADR 0044 Standard ceiling
// what-it-does: proves activeConstraints() reports the right constraints for each (pin, since, migration)
//               combination, that severities are compared BY RANK rather than lexically, and that `due`
//               is Standard-version arithmetic rather than numeric or lexical max
// why:          this is the primitive the whole release rests on - `since` governs an INTRODUCTION and
//               `until` governs a TIGHTENING, two inputs to ONE ceiling. Getting the comparison direction
//               wrong turns the ceiling into a floor, and a plan-level review found exactly that defect
//               written into pseudocode as an unqualified `min`
// used-by:      npm test
import test from "node:test";
import assert from "node:assert/strict";
import { activeConstraints, latestDue, lowerSeverity, SEVERITY_RANK } from "../../scripts/lib/standard-ceiling.mjs";

const CAP = { capAt: "warn", until: "0.13", reason: "warn-first migration" };

// --- rank, not lexical order -----------------------------------------------------------------------

test("severities compare BY RANK: off < warn < error", () => {
  assert.equal(SEVERITY_RANK.off, 0);
  assert.equal(SEVERITY_RANK.warn, 1);
  assert.equal(SEVERITY_RANK.error, 2);
});

test("lowerSeverity is rank-correct where a LEXICAL comparison inverts the ceiling", () => {
  // The trap, stated as a test because it was written into a design document as an unqualified `min`:
  // lexical min("error", "warn") is "error", because "e" sorts before "w". The rank-correct answer is
  // "warn". An implementation that compared these as strings would raise findings instead of lowering
  // them - a floor wearing a ceiling's name.
  assert.equal(lowerSeverity("error", "warn"), "warn");
  assert.equal(lowerSeverity("warn", "error"), "warn");
  assert.ok("error" < "warn", "sanity: lexically 'error' really does sort first, which is the trap");

  // Ranking `off` below `warn` is what makes this a pure ceiling with no special-casing: an off'd
  // finding is never lifted back to warn by a cap that caps at warn.
  assert.equal(lowerSeverity("off", "warn"), "off");
  assert.equal(lowerSeverity("warn", "warn"), "warn");
});

// --- introductions (`since`) -----------------------------------------------------------------------

test("a check introduced AFTER the pin yields a since constraint capping at warn", () => {
  const [c, ...rest] = activeConstraints("0.9", "0.10", undefined);
  assert.deepEqual(rest, []);
  assert.deepEqual(c, { cause: "since", due: "0.10", ceiling: "warn" });
});

test("a BASELINE check is never constrained, at any pin", () => {
  assert.deepEqual(activeConstraints("0.9", "0.x", undefined), []);
  assert.deepEqual(activeConstraints("0.13", "0.x", undefined), []);
});

test("the boundary: a pin EQUAL to the check's since is not after it, so nothing is constrained", () => {
  assert.deepEqual(activeConstraints("0.10", "0.10", undefined), []);
});

test("no pin, a garbage pin, and the BASELINE sentinel as a pin all grade at full strength", () => {
  // ADR 0027's existing back-compat rule, not a new one: a plugin that never declared which contract it
  // adopted cannot be graded against the one it adopted. The sentinel is check metadata and is
  // deliberately not usable as a pin, so it cannot be a back door around every post-baseline check.
  assert.deepEqual(activeConstraints(undefined, "0.10", undefined), []);
  assert.deepEqual(activeConstraints("latest", "0.10", undefined), []);
  assert.deepEqual(activeConstraints("0.x", "0.10", undefined), []);
});

test("--strict passes the pin as undefined, so BOTH causes go inert together", () => {
  // There is deliberately no `strict` parameter here. Strict is expressed by withholding the pin, which
  // is what stops an implementation from disabling one cause and forgetting the other.
  assert.deepEqual(activeConstraints(undefined, "0.13", CAP), []);
});

// --- tightenings (`until`) -------------------------------------------------------------------------

test("a migration whose `until` is after the pin yields an until constraint capping at its own capAt", () => {
  const [c] = activeConstraints("0.12", "0.x", CAP);
  assert.deepEqual(c, { cause: "until", due: "0.13", ceiling: "warn" });
});

test("a migration whose `until` has been REACHED lifts, which is what makes a graduation real", () => {
  assert.deepEqual(activeConstraints("0.13", "0.x", CAP), []);
  assert.deepEqual(activeConstraints("0.14", "0.x", CAP), []);
});

test("the ceiling value comes from the finding's own capAt, not from a fixed warn", () => {
  const offCap = { capAt: "off", until: "0.14", reason: "r" };
  const [c] = activeConstraints("0.13", "0.x", offCap);
  assert.equal(c.ceiling, "off");
});

// --- both causes at once ---------------------------------------------------------------------------

test("both causes can be active simultaneously, which is why this returns an ARRAY", () => {
  // At pin 0.11 a U13-shaped finding is under an INTRODUCTION ceiling (since 0.12) and a TIGHTENING
  // ceiling (until 0.13) at the same time. A singular `cause` field would report it as due at 0.12 while
  // it is in fact still capped until 0.13 - a wrong due version shipped to every reader at any pin more
  // than one minor behind.
  const cs = activeConstraints("0.11", "0.12", CAP);
  assert.equal(cs.length, 2);
  assert.deepEqual(cs.map((c) => c.cause), ["since", "until"]);
  assert.equal(latestDue(cs), "0.13", "the finding is only free when the LAST constraint lifts");
});

test("latestDue is Standard-version arithmetic, not numeric or lexical max", () => {
  // Both naive comparisons order "0.9" after "0.10": numerically 0.9 > 0.10 as decimals, and lexically
  // "0.9" > "0.10" because "9" sorts after "1".
  assert.equal(latestDue([{ due: "0.9" }, { due: "0.10" }]), "0.10");
  assert.equal(latestDue([{ due: "0.10" }, { due: "0.9" }]), "0.10");
  assert.equal(latestDue([]), null, "an empty constraint set has no due version");
});
