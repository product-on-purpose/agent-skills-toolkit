// what-it-is:   Standard-version arithmetic for the standard-aware gate
// what-it-does: parses a "MAJOR.MINOR" Standard version, compares two, and answers "was check X
//               introduced after the plugin's pinned Standard?" so the gate can downgrade post-pin checks
// why:          ADR 0027 - the gate must honor library.json.standard ("validate against the right ruleset"),
//               and the policy must be pure version arithmetic to keep the gate deterministic and model-free
// used-by:      scripts/lib/standard-gate.mjs (builds SINCE_BY_REQ and the downgrade on top of these); covered by tests/unit/standard-version.test.mjs

/** The sentinel for a pre-policy baseline check (older than any real pinned minor). */
export const BASELINE = "0.x";

/**
 * Parse a Standard version "MAJOR.MINOR" into a comparable [major, minor] tuple.
 * The BASELINE sentinel parses to [-Infinity, -Infinity] (sorts before every real version).
 * A missing or unparseable input parses to null (treated as "unknown" by the callers).
 * @param {unknown} v
 * @returns {[number, number] | null}
 */
export function parseStandard(v) {
  if (v === BASELINE) return [-Infinity, -Infinity];
  if (typeof v !== "string") return null;
  const m = /^(\d+)\.(\d+)$/.exec(v.trim());
  if (!m) return null;
  return [Number(m[1]), Number(m[2])];
}

/**
 * Compare two Standard versions. Returns -1 if a < b, 0 if equal, 1 if a > b.
 * MAJOR.MINOR are compared numerically per component, so 0.9 < 0.10 < 0.11 (the trap a naive
 * string compare gets wrong, since "0.9" > "0.10" lexically). BASELINE sorts below every real
 * version. An unparseable input sorts as the maximum, so it never causes a spurious downgrade
 * (consistent with the back-compat default: a garbage pin grades at full strength).
 * @returns {-1 | 0 | 1}
 */
export function compareStandard(a, b) {
  const pa = parseStandard(a);
  const pb = parseStandard(b);
  if (pa === null && pb === null) return 0;
  if (pa === null) return 1; // unparseable sorts last (treated as the highest)
  if (pb === null) return -1;
  if (pa[0] !== pb[0]) return pa[0] < pb[0] ? -1 : 1;
  if (pa[1] !== pb[1]) return pa[1] < pb[1] ? -1 : 1;
  return 0;
}

/**
 * True iff a check introduced at `since` is NEWER than the plugin's `pinned` Standard
 * (so its findings must be downgraded to warn for this run, per ADR 0027). If `pinned` is
 * missing or unparseable, returns false (no downgrade: fall back to today's full-strength grading).
 * @param {string} since   the check's meta.since
 * @param {unknown} pinned library.json.standard
 * @returns {boolean}
 */
export function isAfter(since, pinned) {
  const p = parseStandard(pinned);
  // A real pin must be a finite MAJOR.MINOR. No pin, garbage (-> null), OR the BASELINE sentinel
  // (-> [-Infinity, ...], which is check metadata, never a release a plugin pins) grades at full
  // strength, so the sentinel cannot be used as a back door to disable the post-baseline checks.
  if (p === null || !Number.isFinite(p[0])) return false;
  return compareStandard(since, pinned) > 0;
}
