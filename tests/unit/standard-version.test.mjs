import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStandard, compareStandard, isAfter, BASELINE } from "../../scripts/lib/standard-version.mjs";

// Proves the pure Standard-version arithmetic behind the ADR 0027 standard-aware gate
// (scripts/lib/standard-version.mjs): MAJOR.MINOR parses and compares NUMERICALLY (not lexically),
// the "0.x" baseline sentinel sorts below every real minor, and a missing/garbage pin is treated as
// "never after" so the gate falls back to full-strength grading rather than silently weakening.

test("parseStandard parses a MAJOR.MINOR string to a numeric tuple", () => {
  assert.deepEqual(parseStandard("0.11"), [0, 11]);
  assert.deepEqual(parseStandard("1.2"), [1, 2]);
  assert.deepEqual(parseStandard(" 0.10 "), [0, 10]); // trims
});

test("parseStandard maps the BASELINE sentinel below every real version", () => {
  assert.deepEqual(parseStandard(BASELINE), [-Infinity, -Infinity]);
  assert.equal(BASELINE, "0.x");
});

test("parseStandard returns null for garbage (so callers can fall back safely)", () => {
  for (const bad of ["latest", "1", "0.", ".1", "0.1.2", "", null, undefined, 11, {}]) {
    assert.equal(parseStandard(bad), null, `expected null for ${JSON.stringify(bad)}`);
  }
});

test("compareStandard orders minors NUMERICALLY, not lexically (the 0.9 < 0.10 trap)", () => {
  assert.equal(compareStandard("0.9", "0.10"), -1); // lexical compare would wrongly say 1
  assert.equal(compareStandard("0.10", "0.9"), 1);
  assert.equal(compareStandard("0.10", "0.2"), 1);
  assert.equal(compareStandard("0.11", "0.11"), 0);
  assert.equal(compareStandard("1.0", "0.99"), 1); // major dominates
});

test("compareStandard sorts BASELINE below every real version and garbage above", () => {
  assert.equal(compareStandard("0.x", "0.10"), -1);
  assert.equal(compareStandard("0.x", "0.9"), -1);
  assert.equal(compareStandard("0.10", "0.x"), 1);
  assert.equal(compareStandard("0.x", "0.x"), 0);
  assert.equal(compareStandard("latest", "0.11"), 1); // unparseable sorts last
  assert.equal(compareStandard("0.11", "latest"), -1);
});

test("isAfter is true only for a check strictly newer than the pin", () => {
  assert.equal(isAfter("0.10", "0.9"), true); // a 0.10 check is after a 0.9 pin
  assert.equal(isAfter("0.10", "0.10"), false); // equal is NOT after (graded in-scope)
  assert.equal(isAfter("0.10", "0.11"), false); // older check, newer pin
  assert.equal(isAfter("0.x", "0.9"), false); // baseline is never after any real pin
});

test("isAfter returns false for a missing or garbage pin (back-compat full strength)", () => {
  assert.equal(isAfter("0.10", undefined), false);
  assert.equal(isAfter("0.10", null), false);
  assert.equal(isAfter("0.10", "latest"), false);
  assert.equal(isAfter("0.10", ""), false);
});

test("the BASELINE sentinel is NOT a valid pin: pinning '0.x' grades at full strength (no back door)", () => {
  // "0.x" is check metadata (a baseline check sorts below all), never a release a plugin pins.
  // A plugin pinning it must not get its post-baseline (0.10) checks silently downgraded.
  assert.equal(isAfter("0.10", BASELINE), false);
  assert.equal(isAfter("0.10", "0.x"), false);
});
