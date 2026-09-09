// what-it-is:   the tier mapping
// what-it-does: maps a reqId prefix (U/S/G) to its tier, defines the monotonic tier ordering, and
//               names the public-facing Bronze/Silver/Gold and Universal/Convergent/Advanced display
//               vocabulary for each internal tier string
// why:          the reqId-to-tier mapping is what lets the gate bucket findings into Bronze, Silver,
//               and Gold. The display vocabulary lived only as a private copy inside
//               report-render.mjs until round 3 of the pre-release adversarial review found that
//               check-readme-version.mjs needed the same mapping to validate a README's tier claim
//               against library.json.tier and had no reusable place to get it from; keeping one
//               copy here is what stops the renderer and the README guard from being able to drift.
// used-by:      imported by the aggregate gate, tier-report.mjs, report-render.mjs, and check-readme-version.mjs
export const TIER_ORDER = ["universal", "convergent", "advanced"];

/** Public-facing tier synonyms, keyed by the internal tier string: the Bronze/Silver/Gold grade name
 * and the Universal/Convergent/Advanced subtitle (e.g. README/report text reads "Advanced (Gold)"). */
export const TIER_NAME = { universal: "Bronze", convergent: "Silver", advanced: "Gold" };
export const TIER_SUB = { universal: "Universal", convergent: "Convergent", advanced: "Advanced" };

/** Map a reqId prefix to its tier. Null/empty -> universal (the safest default). */
export function tierForReq(reqId) {
  if (!reqId) return "universal";
  if (reqId.startsWith("U")) return "universal";
  if (reqId.startsWith("S")) return "convergent";
  return "advanced"; // A-prefix and anything else (e.g. Gold G-prefix) maps to advanced
}

/** Map a declared-tier string to its index in TIER_ORDER. Missing/unknown -> last (no ceiling). */
/**
 * Is this finding ABOVE the tier the plugin declared - a requirement of a rung it has not claimed?
 *
 * The single predicate behind every surface that has to make this distinction: `sectionFindings` in
 * check.mjs for the text output and the GitHub annotations, and `buildResults` in sarif-render.mjs for
 * the SARIF document. It lives here rather than in either caller because the surfaces DISAGREEING is
 * the defect it exists to prevent: before this, the text output printed "0 error(s)" for a run whose
 * SARIF document carried three results at level "error", and a Bronze plugin's pull request showed red
 * annotations for Gold requirements that could not affect its grade (2026-09-04 audit, F-032).
 *
 * False when the plugin declares no tier: with nothing declared there is no ceiling to be above, and
 * every finding grades. That is the same reading `ceilingIndex` already takes.
 */
export function isAboveDeclaredTier(reqId, declared) {
  if (!declared) return false;
  return TIER_ORDER.indexOf(tierForReq(reqId)) > ceilingIndex(declared);
}

export function ceilingIndex(declared) {
  const i = TIER_ORDER.indexOf(declared);
  return i >= 0 ? i : TIER_ORDER.length - 1;
}
