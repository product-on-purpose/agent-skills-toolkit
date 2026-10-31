// what-it-is:   the health number (ADR 0063 sec 3)
// what-it-does: computes the five health categories (substance, budget, portability, security,
//               Standard currency) for one plugin or component report. Every category reads a RAW
//               measurement - recomputed straight from ctx or from the resolved findings' own
//               `ceiling` field, never from a module's post-profile/post-suppression severity - so a
//               profile, a suppression, or the Standard ceiling can buy a quieter gate but never a
//               better health score (ADR 0063 sec 3: "Health reads measurements, not severities").
//               Computes NO cross-category average (ADR 0063 sec 3). Every category is this ship's
//               `uncalibrated` (docs/reference/health-score.md's confusion counts), so no category
//               carries a `band` field; the pre-registered cut points in advisory-registry.mjs still
//               gate the two falsifiable tests, which ask whether a fixture falls below a fixed floor,
//               never whether that floor was validated by the (too-small) labelled corpus.
// why:          E61 (the tier certifies file shape, so a 33-file placeholder plugin earns Advanced,
//               0 errors, 0 warnings) needed a surface beside the tier that a placeholder plugin
//               cannot score well on. D-01 (a health number beside the tier) was ruled ADOPT for
//               reports by ADR 0063 on exactly that evidence.
// used-by:      scripts/evaluate.mjs (evaluate(), evaluateComponent(): the report object's `health`
//               field); scripts/lib/report-render.mjs (the health section); covered by
//               tests/unit/health-score.test.mjs
import { check as instructionBudgetCheck } from "../checks/instruction-budget.mjs";
import { distinctPreloadNames, PRELOAD_CAP } from "../advisory/adv2-preload-cap.mjs";
import { check as adv1Check } from "../advisory/adv1-portability.mjs";
import { check as adv3Check, listScanTargets as adv3ScanTargets } from "../advisory/adv3-security.mjs";
import { measure as adv4Measure } from "../advisory/adv4-substance.mjs";
import { parseStandard, compareStandard } from "./standard-version.mjs";
import { PROFILES } from "./profiles.mjs";
import { HOUSE_ADVISORY_IDS, HEALTH_BAND_CUT_POINTS, HEALTH_CALIBRATION_MINIMUM } from "./advisory-registry.mjs";

/** This release's calibration state for EVERY category (ADR 0063 sec 4's provisional reading: every
 * labelled category has fewer than HEALTH_CALIBRATION_MINIMUM positive trees once the two falsifiable-
 * test fixtures are held out - see docs/reference/health-score.md's confusion counts). A single
 * constant rather than a per-category computation against a corpus this codebase does not ship,
 * because ADR 0063 sec 4 requires the labelled corpus itself to become a tracked fixture before any
 * count is computed from it, and the task that commissioned this change keeps that corpus read-only
 * and out of the tree (see the divergence note in docs/reference/health-score.md). Flip to a real
 * per-category computation once the labelled corpus is tracked and a category clears the minimum.
 */
export const CALIBRATION_STATE = "uncalibrated";

const score = (flagged, total) => (total > 0 ? Math.round(100 * (1 - flagged / total)) : null);

function bandFor(s) {
  if (s == null) return null;
  const { healthyMin, fairMin, weakMin } = HEALTH_BAND_CUT_POINTS;
  if (s >= healthyMin) return "healthy";
  if (s >= fairMin) return "fair";
  if (s >= weakMin) return "weak";
  return "lowest";
}

/** True when the active profile turns off the house-provenance advisory signals (ADR 0063 sec 1's
 * plain-plugin advisory off-set, today exactly {ADV4}). ADR 0063 sec 1 groups substance and currency
 * together as "the health categories built on house signals" that "report off-by-profile" under such
 * a profile - substance because ADV4 is house, currency because it reads library.json's pin, the file
 * U1 (also house) covers. Resolved from PROFILES rather than hard-coded, so a future profile with its
 * own advisoryOff set is honored without a code change here. */
function isHouseOffProfile(profile) {
  const off = PROFILES[profile]?.advisoryOff ?? [];
  return HOUSE_ADVISORY_IDS.some((id) => off.includes(id));
}

function liveSkills(ctx) {
  return (ctx.skills ?? []).filter((s) => !s.parseError);
}
function liveAgents(ctx) {
  return (ctx.agentDocs ?? ctx.subagents ?? []).filter((a) => !a.parseError);
}

// --- substance (ADV4, house) -------------------------------------------------------------------

function substanceCategory(ctx, { houseOff }) {
  if (houseOff) return { state: "off-by-profile", reason: "house-provenance signal off under this profile" };
  const m = adv4Measure(ctx);
  if (!m) return { state: "not-applicable", reason: "no parseable skill" };
  const s = score(m.flaggedCount, m.componentCount);
  return {
    state: "scored",
    componentCount: m.componentCount,
    measurement: {
      underFloorCount: m.underFloorCount,
      placeholderCount: m.placeholderCount,
      duplicateDescriptionCount: m.duplicateDescriptionCount,
      flaggedCount: m.flaggedCount,
      score: s,
    },
    ...(CALIBRATION_STATE === "calibrated" ? { band: bandFor(s) } : {}),
  };
}

// --- budget (U7's raw line count + ADV2's preload cap, vendor-cited) --------------------------

function budgetCategory(ctx) {
  const skills = liveSkills(ctx);
  const agents = liveAgents(ctx);
  const total = skills.length + agents.length;
  if (total === 0) return { state: "not-applicable", reason: "no skill or subagent to measure" };
  // Recomputed straight from ctx via the check modules' own pure functions - NEVER from resolved
  // findings - so a config override, a profile, or the Standard ceiling cannot move this number
  // (ADR 0063 sec 3).
  const overBudgetFiles = new Set(instructionBudgetCheck(ctx).map((f) => f.file));
  let overCap = 0;
  for (const a of agents) {
    const distinct = distinctPreloadNames(a.frontmatter);
    if (distinct !== null && distinct.length > PRELOAD_CAP) overCap++;
  }
  const flagged = overBudgetFiles.size + overCap;
  const s = score(flagged, total);
  return {
    state: "scored",
    componentCount: total,
    measurement: { skillsOverBudgetLines: overBudgetFiles.size, agentsOverPreloadCap: overCap, flaggedCount: flagged, score: s },
    ...(CALIBRATION_STATE === "calibrated" ? { band: bandFor(s) } : {}),
  };
}

// --- portability (ADV1, vendor-cited) ----------------------------------------------------------

function portabilityCategory(ctx) {
  const skills = liveSkills(ctx);
  if (skills.length === 0) return { state: "not-applicable", reason: "no parseable skill" };
  const flaggedFiles = new Set(adv1Check(ctx).map((f) => f.file));
  const s = score(flaggedFiles.size, skills.length);
  return {
    state: "scored",
    componentCount: skills.length,
    measurement: { flaggedCount: flaggedFiles.size, score: s },
    ...(CALIBRATION_STATE === "calibrated" ? { band: bandFor(s) } : {}),
  };
}

// --- security (ADV3, objective) -----------------------------------------------------------------

function securityCategory(ctx) {
  const targets = adv3ScanTargets(ctx);
  if (targets.length === 0) return { state: "not-applicable", reason: "no in-scope file to scan" };
  const flaggedFiles = new Set(adv3Check(ctx).map((f) => f.file));
  const s = score(flaggedFiles.size, targets.length);
  return {
    state: "scored",
    componentCount: targets.length,
    measurement: { scannedFileCount: targets.length, flaggedFileCount: flaggedFiles.size, score: s },
    ...(CALIBRATION_STATE === "calibrated" ? { band: bandFor(s) } : {}),
  };
}

// --- Standard currency (house: the pin lives in library.json, U1's file) -----------------------

/**
 * ADR 0063 sec 3's currency table, read verbatim:
 *   - a real MAJOR.MINOR at or below the shipped edition -> minors behind + waived count
 *   - no pin -> not-applicable, reason "unpinned"
 *   - an unparseable value -> not-applicable, reason "unparseable-pin"
 *   - the baseline sentinel "0.x" -> not-applicable, reason "baseline-sentinel"
 *   - a pin ahead of the shipped edition -> "ahead", zero minors behind
 * `resolved` (the plugin's resolveFindings() output) is the one input this category reads for its
 * OWN sake, not as a severity proxy: `waivedCount` IS the fact "how many findings did the pin hold
 * below their resolved severity", which is exactly what ADR 0063 sec 3 asks this category to report.
 */
function currencyCategory({ pinned, shipped, resolved, houseOff }) {
  if (houseOff) return { state: "off-by-profile", reason: "house-provenance signal off under this profile" };
  const componentCount = 1; // the plugin's own pin, not a per-skill/agent measurement
  if (pinned === undefined || pinned === null) return { state: "not-applicable", reason: "unpinned", componentCount };
  if (pinned === "0.x") return { state: "not-applicable", reason: "baseline-sentinel", componentCount };
  const p = parseStandard(pinned);
  if (p === null || !Number.isFinite(p[0])) return { state: "not-applicable", reason: "unparseable-pin", componentCount };
  const waivedCount = (resolved ?? []).filter((f) => f.ceiling != null).length;
  const s = parseStandard(shipped);
  if (s === null || !Number.isFinite(s[0]) || compareStandard(pinned, shipped) > 0) {
    return { state: "ahead", componentCount, measurement: { minorsBehind: 0, waivedCount } };
  }
  const minorsBehind = p[0] === s[0] ? s[1] - p[1] : null; // ADR 0063 sec 3: minors are counted only within one MAJOR
  return { state: "scored", componentCount, measurement: { minorsBehind, waivedCount } };
}

/**
 * Compute the five-category health object (ADR 0063 sec 3), or `null` when the advisory layer is off
 * (ADR 0063 sec 1: `health` is `null` exactly when `advisoryLayer` is `"off"`).
 * @param {object} ctx the check context (plugin or component scope)
 * @param {{advisoryLayer:string, profile?:string, pinned?:unknown, shipped?:string|null, resolved?:Array<object>}} opts
 */
export function computeHealth(ctx, opts = {}) {
  if (opts.advisoryLayer !== "on") return null;
  const houseOff = isHouseOffProfile(opts.profile);
  return {
    calibration: CALIBRATION_STATE,
    categories: {
      substance: substanceCategory(ctx, { houseOff }),
      budget: budgetCategory(ctx),
      portability: portabilityCategory(ctx),
      security: securityCategory(ctx),
      currency: currencyCategory({ pinned: opts.pinned, shipped: opts.shipped, resolved: opts.resolved, houseOff }),
    },
  };
}

export { bandFor as _bandForTesting }; // exported only for tests/unit/health-score.test.mjs's band-boundary coverage
