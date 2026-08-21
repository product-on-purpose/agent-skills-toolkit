import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  INT_TOKEN_SRC,
  normalizeCount,
  extractLabeledCounts,
  extractTestCountClaims,
} from "../../scripts/lib/stated-counts.mjs";

// --- normalizeCount ---

test("normalizeCount: strips thousands-separator commas before converting to a Number", () => {
  assert.equal(normalizeCount("1,720"), 1720);
  assert.equal(normalizeCount("1,024"), 1024);
  assert.equal(normalizeCount("720"), 720);
});

test("normalizeCount: leaves a plain (unseparated) digit string unchanged in value", () => {
  assert.equal(normalizeCount("0"), 0);
  assert.equal(normalizeCount("12345"), 12345);
});

// --- extractLabeledCounts: the "<int> <label>" shape (README skills/checks claims) ---

test("extractLabeledCounts: matches a plain integer immediately before the label", () => {
  const c = extractLabeledCounts("- **Components** - 24 skills.", "skills");
  assert.equal(c.length, 1);
  assert.equal(c[0].count, 24);
});

test("extractLabeledCounts: parses a comma-grouped thousands total as the FULL number, not a truncated substring (the round-6 bypass)", () => {
  // Before the fix, a boundary-less `(\d+)\s+skills\b` matched "024 skills" inside "1,024 skills"
  // and Number("024") === 24, so a contradictory claim of 1,024 read as the coincidentally-correct
  // 24. The complete-token rule must read the whole grouped number.
  const c = extractLabeledCounts("- **Also** - 1,024 skills, elsewhere.", "skills");
  assert.equal(c.length, 1);
  assert.equal(c[0].count, 1024, "must parse the complete grouped number, not just its last 3 digits");
});

test("extractLabeledCounts: the same boundary rule applies to a different label word (checks)", () => {
  const c = extractLabeledCounts("- **Also** - 1,030 checks, elsewhere.", "checks");
  assert.equal(c.length, 1);
  assert.equal(c[0].count, 1030, "must not read \"1,030\" as \"030\" -> 30");
});

test("extractLabeledCounts: finds every occurrence via matchAll, never just the first", () => {
  const c = extractLabeledCounts("- 2 skills here.\n- 9 skills there.\n", "skills");
  assert.equal(c.length, 2);
  assert.deepEqual(c.map((x) => x.count), [2, 9]);
});

test("extractLabeledCounts: returns [] when the label does not occur", () => {
  assert.deepEqual(extractLabeledCounts("no matching claim here", "skills"), []);
});

// --- extractTestCountClaims: the "<int> (tests,)? <int> failures" shape (CHANGELOG / STATUS.md) ---

test("extractTestCountClaims: matches the CHANGELOG.md prose shape", () => {
  const c = extractTestCountClaims("**682 tests, 0 failures**.");
  assert.equal(c.length, 1);
  assert.deepEqual([c[0].total, c[0].failures], [682, 0]);
});

test("extractTestCountClaims: matches the STATUS.md table-row shape (no \"tests\" word)", () => {
  const c = extractTestCountClaims("| Tests | 682, 0 failures |");
  assert.equal(c.length, 1);
  assert.deepEqual([c[0].total, c[0].failures], [682, 0]);
});

test("extractTestCountClaims: parses a false grouped-thousands total as the FULL number, not a truncated substring (the round-6 bypass)", () => {
  // Before the fix, `(\d+)\s*(?:tests?)?\s*,\s*(\d+)\s+failures?\b` had no leading numeric boundary,
  // so against an actual total of 720 the false claim "1,720 tests, 0 failures" matched on the
  // substring "720 tests, 0 failures" and silently agreed. The complete-token rule must read "1,720"
  // as 1720, which correctly disagrees with 720.
  const c = extractTestCountClaims("1,720 tests, 0 failures");
  assert.equal(c.length, 1);
  assert.equal(c[0].total, 1720, "must parse the complete grouped total, not its last 3 digits");
});

test("extractTestCountClaims: a genuinely correct grouped total parses to the value it claims", () => {
  const c = extractTestCountClaims("1,720 tests, 0 failures");
  assert.equal(c[0].total, 1720);
  // A caller comparing this against an authoritative total of 1720 (not 720) would agree - that
  // comparison itself is exercised at the check-release-counts.mjs level.
});

test("extractTestCountClaims: the STATUS.md row shape also parses a grouped total as the full number", () => {
  const c = extractTestCountClaims("1,720, 0 failures");
  assert.equal(c.length, 1);
  assert.equal(c[0].total, 1720);
});

test("extractTestCountClaims: does not match a bare count with no adjacent failures figure", () => {
  const c = extractTestCountClaims("613 tests, spine 30, Standard 0.12.");
  assert.equal(c.length, 0);
});

test("extractTestCountClaims: finds two separate claims in one blob via matchAll, never just the first", () => {
  const c = extractTestCountClaims("First: 10 tests, 0 failures. Later: 12 tests, 1 failures.");
  assert.equal(c.length, 2);
  assert.deepEqual([c[0].total, c[0].failures], [10, 0]);
  assert.deepEqual([c[1].total, c[1].failures], [12, 1]);
});

// --- INT_TOKEN_SRC: the boundary rule directly ---

test("INT_TOKEN_SRC: a standalone RegExp built from it does not begin a match mid-number", () => {
  const re = new RegExp(INT_TOKEN_SRC, "g");
  const found = [...("1,720 and 42".matchAll(re))].map((m) => m[1]);
  assert.deepEqual(found, ["1,720", "42"], "must never yield a bare \"720\" split out of \"1,720\"");
});

// --- Single point of definition: mirrors the SKIP_DIRS / normalizeArgPath invariant in
// tests/unit/fs-utils.test.mjs (existence-only, not completeness) so the next author who needs to
// parse a stated count cannot quietly add a fourth private copy of this regex shape. ---

test("check-release-counts.mjs and check-readme-version.mjs both import the shared stated-count parser, with no local redefinition", () => {
  const files = [
    "../../scripts/check-release-counts.mjs",
    "../../scripts/check-readme-version.mjs",
  ];
  for (const f of files) {
    const src = readFileSync(new URL(f, import.meta.url), "utf8");
    assert.match(
      src,
      /import \{[^}]*\} from "\.\/lib\/stated-counts\.mjs"/,
      `${f} must import the shared stated-counts helper`
    );
    assert.doesNotMatch(
      src,
      /\(\?:,\\d\{3\}\)/,
      `${f} must not locally redefine a thousands-separator integer pattern`
    );
  }
});

// --- W1 (adversarial wave 2, HIGH): emphasis BETWEEN the number and the comma ---
//
// The docblock cites CHANGELOG's "**682 tests, 0 failures**", where the emphasis wraps the WHOLE
// phrase and the parser is unaffected. Bolding only the NUMBER puts the markers between the integer
// and the comma, and the claim became invisible: the v1.15.0 packet headline read
// "| Suite | 1252 | **1292**, 0 failures |" while the same file said 1352 two sections later, and
// check-release-counts reported "agrees everywhere checked" - true, and true only because it could
// not see the one place that disagreed.

test("extractTestCountClaims: emphasis around only the NUMBER is still a claim (W1)", () => {
  for (const s of ["**1292**, 0 failures", "*1292*, 0 failures", "__1292__, 0 failures"]) {
    const c = extractTestCountClaims(s);
    assert.equal(c.length, 1, `no claim found in ${JSON.stringify(s)}`);
    assert.equal(c[0].total, 1292);
    assert.equal(c[0].failures, 0);
  }
});

test("extractTestCountClaims: emphasis around the failures word too", () => {
  const c = extractTestCountClaims("**1292** tests, **0** failures");
  assert.equal(c.length, 1);
  assert.equal(c[0].total, 1292);
  assert.equal(c[0].failures, 0);
});

test("extractTestCountClaims: the real packet headline shape is seen (W1 regression)", () => {
  const c = extractTestCountClaims("| Suite | 1252 | **1292**, 0 failures |");
  assert.equal(c.length, 1, 'the exact line that defeated the guard must be visible');
  assert.equal(c[0].total, 1292);
});

test("extractTestCountClaims: widening for emphasis did not start matching prose", () => {
  // The guard on the guard. Emphasis runs are allowed AT THE SEAMS ONLY. Arbitrary words between the
  // integer and the comma must still not match, or a parser loosened to see a bold number starts
  // inventing claims out of ordinary sentences - which would be the false-finding class this
  // repository grades other tools on, introduced by the fix for a missed finding.
  assert.deepEqual(extractTestCountClaims("1292 skills and 5 suites, 0 failures").map((c) => c.total), []);
  assert.deepEqual(extractTestCountClaims("1292 was the count once, 0 failures").map((c) => c.total), []);
  // ...and the shapes that must keep working, including the comma-grouped integer the lookbehind exists for.
  assert.deepEqual(extractTestCountClaims("1,720 tests, 0 failures").map((c) => c.total), [1720]);
  assert.deepEqual(extractTestCountClaims("682 tests, 0 failures").map((c) => c.total), [682]);
});
