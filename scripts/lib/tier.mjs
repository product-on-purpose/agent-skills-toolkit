export const TIER_ORDER = ["universal", "convergent", "advanced"];

/** Map a reqId prefix to its tier. Null/empty -> universal (the safest default). */
export function tierForReq(reqId) {
  if (!reqId) return "universal";
  if (reqId.startsWith("U")) return "universal";
  if (reqId.startsWith("S")) return "convergent";
  return "advanced"; // A-prefix and anything else (e.g. Gold G-prefix) maps to advanced
}

/** Map a declared-tier string to its index in TIER_ORDER. Missing/unknown -> last (no ceiling). */
export function ceilingIndex(declared) {
  const i = TIER_ORDER.indexOf(declared);
  return i >= 0 ? i : TIER_ORDER.length - 1;
}
