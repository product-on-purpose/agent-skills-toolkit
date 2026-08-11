// what-it-is:   the one parser for a "stated count" number claim in prose or a table row
// what-it-does: exposes a regex fragment for a COMPLETE integer token (a match can never begin or
//               end mid-number), a normalizer that strips thousands-separator commas before
//               comparing, and matchAll-backed extractors that always return every occurrence in a
//               text, never just the first
// why:          a round-6 adversarial review on the v1.10.1 release branch found the identical
//               first-match-only defect (round-5's own finding, fixed once in check-readme-version.mjs)
//               reintroduced in a brand-new file, check-release-counts.mjs's isolateStatusTestsRow.
//               It also found a second, independent defect - no leading numeric boundary, no
//               thousands-separator support - duplicated across BOTH check-release-counts.mjs's
//               STATED_COUNT_RE and check-readme-version.mjs's skill/checks matchAll loops, so a
//               false claim like "1,720 tests, 0 failures" matched on the substring "720 tests, 0
//               failures" and passed. Three instances of two defects, each written fresh per call
//               site instead of named once, is the same shape of mistake as the duplicated tier
//               mapping two review rounds earlier. This module is the one place the rule lives now;
//               both consuming scripts import it rather than writing their own copy.
// used-by:      scripts/check-release-counts.mjs, scripts/check-readme-version.mjs,
//               tests/unit/stated-counts.test.mjs

/**
 * Regex SOURCE (a string, no flags - compile it into a caller's own RegExp) of a complete integer
 * token: a run of digits, optionally grouped into proper thousands blocks (comma followed by
 * exactly 3 digits, repeated), with a negative lookbehind for a digit or comma immediately before
 * it and a negative lookahead for a digit immediately after it.
 *
 * Both boundaries matter, and independently: without the lookbehind, "1,720" matches "720" as a
 * false substring hit (the exact bypass this module closes - an actual total of 720 against the
 * false claim "1,720 tests, 0 failures" must disagree, not silently match on the tail). Without the
 * lookahead, a bare "17" would match as a false partial hit inside "1720". Capturing group 1 is the
 * raw digit token (with commas, if present) - a caller embedding this source twice in one combined
 * pattern gets group 1 and group 2 in source order, which is exactly what extractTestCountClaims
 * below does for its "total ... failures" shape.
 */
export const INT_TOKEN_SRC = "(?<![\\d,])(\\d+(?:,\\d{3})*)(?!\\d)";

/**
 * Parse a matched integer token ("1,720" or "720") into a plain Number (1720), stripping any
 * thousands-separator commas. Never called on anything but a string that already matched
 * INT_TOKEN_SRC, so this never has to guard against a non-numeric result.
 */
export function normalizeCount(token) {
  return Number(String(token).replace(/,/g, ""));
}

/**
 * Every "<complete integer> <label>" occurrence in `text` (e.g. label "skills" over "1,024
 * skills"), found with matchAll - never just the first, so no caller can reintroduce the
 * first-match-only hole by switching back to .match(). `label` is inserted into the pattern as a
 * literal word (callers pass a fixed word like "skills" or "checks", never untrusted input).
 * Returns [] when there is no occurrence, distinct from a caller mistaking that for "no claims to
 * check" being an error - callers decide what an empty result means for their own guard.
 */
export function extractLabeledCounts(text, label) {
  const re = new RegExp(`${INT_TOKEN_SRC}\\s+${label}\\b`, "gi");
  const out = [];
  for (const m of String(text).matchAll(re)) {
    out.push({ count: normalizeCount(m[1]), index: m.index, raw: m[0] });
  }
  return out;
}

/**
 * Every "<complete integer> (tests,)? <complete integer> failures" occurrence in `text` - the shape
 * this repository states a LIVE test-suite total in everywhere (CHANGELOG's "**682 tests, 0
 * failures**", STATUS.md's "682, 0 failures"). See scripts/check-release-counts.mjs's module
 * docblock for why a bare count with no adjacent failures figure is deliberately NOT matched here;
 * that scope decision lives with the caller that depends on it, not in this shared parser. Returns
 * every occurrence via matchAll, never just the first.
 */
export function extractTestCountClaims(text) {
  const re = new RegExp(`${INT_TOKEN_SRC}\\s*(?:tests?)?\\s*,\\s*${INT_TOKEN_SRC}\\s+failures?\\b`, "gi");
  const out = [];
  for (const m of String(text).matchAll(re)) {
    out.push({ total: normalizeCount(m[1]), failures: normalizeCount(m[2]), index: m.index, raw: m[0] });
  }
  return out;
}
