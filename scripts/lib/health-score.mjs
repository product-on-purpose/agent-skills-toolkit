// what-it-is:   the health number (ADR 0063 sec 3)
// what-it-does: computes the five health categories (substance, budget, portability, security,
//               Standard currency) for one plugin or component report. Every category reads a RAW
//               measurement - recomputed straight from ctx, or carried over from the advisory layer's
//               OWN already-computed findings (never from a post-profile/post-suppression severity) -
//               so a profile, a suppression, or the Standard ceiling can buy a quieter gate but never a
//               better health score (ADR 0063 sec 3: "Health reads measurements, not severities").
//               Computes NO cross-category average (ADR 0063 sec 3). Every category's calibration
//               state is computed PER CATEGORY against the labelled corpus inventory (W6 post-merge-
//               review finding 6) - see scripts/lib/health-calibration.mjs - rather than one constant
//               for all five; the pre-registered cut points in health-constants.mjs still gate the two
//               falsifiable tests, which ask whether a fixture falls below a fixed floor, never whether
//               that floor was validated by the (too-small) labelled corpus.
// why:          E61 (the tier certifies file shape, so a 33-file placeholder plugin earns Advanced,
//               0 errors, 0 warnings) needed a surface beside the tier that a placeholder plugin
//               cannot score well on. D-01 (a health number beside the tier) was ruled ADOPT for
//               reports by ADR 0063 on exactly that evidence.
// used-by:      scripts/evaluate.mjs (evaluate(), evaluateComponent(): the report object's `health`
//               field); scripts/lib/marketplace/evaluate-marketplace.mjs (gradeMember(), ADR 0063 sec 1
//               "each member's... health sit in that member's entry"); scripts/lib/report-render.mjs
//               (the health section); covered by tests/unit/health-score.test.mjs
import { check as instructionBudgetCheck } from "../checks/instruction-budget.mjs";
import { distinctPreloadNames, PRELOAD_CAP } from "../advisory/adv2-preload-cap.mjs";
import { meta as adv1Meta } from "../advisory/adv1-portability.mjs";
import { listScanTargets as adv3ScanTargets, meta as adv3Meta } from "../advisory/adv3-security.mjs";
import { meta as adv4Meta } from "../advisory/adv4-substance.mjs";
import { parseStandard, compareStandard } from "./standard-version.mjs";
import { PROFILES } from "./profiles.mjs";
import { HOUSE_ADVISORY_IDS, HEALTH_BAND_CUT_POINTS } from "./advisory-registry.mjs";
import { calibrationStateFor } from "./health-calibration.mjs";

const score = (flagged, total) => (total > 0 ? Math.round(100 * (1 - flagged / total)) : null);

function bandFor(s) {
  if (s == null) return null;
  const { healthyMin, fairMin, weakMin } = HEALTH_BAND_CUT_POINTS;
  if (s >= healthyMin) return "healthy";
  if (s >= fairMin) return "fair";
  if (s >= weakMin) return "weak";
  return "lowest";
}

/** True iff `profile` turns the named advisory id off entirely (its module never runs at all under
 * that profile - ADR 0063 sec 1). Resolved from PROFILES rather than hard-coded, so a future profile
 * with its own advisoryOff set is honored without a code change here. */
function isOffByProfile(profile, advisoryId) {
  const off = PROFILES[profile]?.advisoryOff ?? [];
  return off.includes(advisoryId);
}

/** True when the active profile turns off the house-provenance advisory signals (ADR 0063 sec 1's
 * plain-plugin advisory off-set, today exactly {ADV4}). ADR 0063 sec 1 groups substance and currency
 * together as "the health categories built on house signals" that "report off-by-profile" under such
 * a profile - substance because ADV4 is house, currency because it reads library.json's pin, the file
 * U1 (also house) covers. */
function isHouseOffProfile(profile) {
  return HOUSE_ADVISORY_IDS.some((id) => isOffByProfile(profile, id));
}

function liveSkills(ctx) {
  return (ctx.skills ?? []).filter((s) => !s.parseError);
}
function liveAgents(ctx) {
  return (ctx.agentDocs ?? ctx.subagents ?? []).filter((a) => !a.parseError);
}

/** The flagged-file Set for one advisory id, read straight off the advisory layer's OWN already-
 * computed findings (W6 finding 8) rather than re-running that module's check() a second time. Every
 * finding the registry stamps carries `.file` and `.advisoryId` (scripts/lib/advisory-registry.mjs's
 * runAdvisoryModules()), so filtering is the whole job - no module code executes again here. */
function flaggedFilesFrom(advisoryFindings, advisoryId) {
  return new Set((advisoryFindings ?? []).filter((f) => f.advisoryId === advisoryId).map((f) => f.file));
}

// --- substance (ADV4, house) -------------------------------------------------------------------

function substanceCategory(ctx, { houseOff, adv4Measurement }) {
  const componentCount = liveSkills(ctx).length;
  if (houseOff) return { state: "off-by-profile", reason: "house-provenance signal off under this profile", componentCount };
  // W6 finding 8: `adv4Measurement` is computed ONCE, by the same call that drives the advisory
  // layer's own ADV4 findings (scripts/check.mjs's computeAdvisoryLayer()) - never recomputed here.
  const m = adv4Measurement;
  if (!m) return { state: "not-applicable", reason: "no parseable skill", componentCount: 0 };
  const s = score(m.flaggedCount, m.componentCount);
  const calibration = calibrationStateFor("substance");
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
    calibration: calibration.calibrated ? "calibrated" : "uncalibrated",
    ...(calibration.calibrated ? { band: bandFor(s) } : {}),
  };
}

// --- budget (U7's raw line count + ADV2's preload cap, vendor-cited) --------------------------

function budgetCategory(ctx) {
  const skills = liveSkills(ctx);
  const agents = liveAgents(ctx);
  const total = skills.length + agents.length;
  if (total === 0) return { state: "not-applicable", reason: "no skill or subagent to measure", componentCount: 0 };
  // Recomputed straight from ctx via the check modules' own pure functions - NEVER from resolved
  // findings - so a config override, a profile, or the Standard ceiling cannot move this number
  // (ADR 0063 sec 3). Not part of the advisory layer's own findings (U7 is a spine check, not an
  // ADV module), so there is nothing to reuse here the way substance/portability/security do.
  const overBudgetFiles = new Set(instructionBudgetCheck(ctx).map((f) => f.file));
  let overCap = 0;
  for (const a of agents) {
    const distinct = distinctPreloadNames(a.frontmatter);
    if (distinct !== null && distinct.length > PRELOAD_CAP) overCap++;
  }
  const flagged = overBudgetFiles.size + overCap;
  const s = score(flagged, total);
  const calibration = calibrationStateFor("budget");
  return {
    state: "scored",
    componentCount: total,
    measurement: { skillsOverBudgetLines: overBudgetFiles.size, agentsOverPreloadCap: overCap, flaggedCount: flagged, score: s },
    calibration: calibration.calibrated ? "calibrated" : "uncalibrated",
    ...(calibration.calibrated ? { band: bandFor(s) } : {}),
  };
}

// --- portability (ADV1, vendor-cited) ----------------------------------------------------------

function portabilityCategory(ctx, { profile, advisoryFindings }) {
  const skills = liveSkills(ctx);
  // Guards against a FUTURE profile naming ADV1 in its advisoryOff set, which no shipped profile does
  // today (ADV1 is vendor-cited, not house, so ADR 0029/0063's house-off rule does not reach it) - were
  // one ever added, scoring from an advisoryFindings array that never ran ADV1 at all would silently
  // read as "zero flagged", which is a false "scored: 100", not a measurement.
  if (isOffByProfile(profile, adv1Meta.advisoryId)) {
    return { state: "off-by-profile", reason: "advisory signal off under this profile", componentCount: skills.length };
  }
  if (skills.length === 0) return { state: "not-applicable", reason: "no parseable skill", componentCount: 0 };
  // W6 finding 8: reused from the advisory layer's own ADV1 findings, never re-run here.
  const flaggedFiles = flaggedFilesFrom(advisoryFindings, adv1Meta.advisoryId);
  const s = score(flaggedFiles.size, skills.length);
  const calibration = calibrationStateFor("portability");
  return {
    state: "scored",
    componentCount: skills.length,
    measurement: { flaggedCount: flaggedFiles.size, score: s },
    calibration: calibration.calibrated ? "calibrated" : "uncalibrated",
    ...(calibration.calibrated ? { band: bandFor(s) } : {}),
  };
}

// --- security (ADV3, objective) -----------------------------------------------------------------

function securityCategory(ctx, { profile, advisoryFindings }) {
  // Same future-proofing guard as portability, above - no shipped profile turns ADV3 off today.
  if (isOffByProfile(profile, adv3Meta.advisoryId)) {
    return { state: "off-by-profile", reason: "advisory signal off under this profile", componentCount: 0 };
  }
  // The denominator alone - cached per ctx by listScanTargets() itself (W6 finding 8: this is the
  // expensive half of ADV3's rerun, the file-content reads, more than the ADV1 rerun), so calling it
  // again here after check() already built the advisory layer's ADV3 findings costs nothing extra.
  const targets = adv3ScanTargets(ctx);
  if (targets.length === 0) return { state: "not-applicable", reason: "no in-scope file to scan", componentCount: 0 };
  const flaggedFiles = flaggedFilesFrom(advisoryFindings, adv3Meta.advisoryId);
  const s = score(flaggedFiles.size, targets.length);
  const calibration = calibrationStateFor("security");
  return {
    state: "scored",
    componentCount: targets.length,
    measurement: { scannedFileCount: targets.length, flaggedFileCount: flaggedFiles.size, score: s },
    calibration: calibration.calibrated ? "calibrated" : "uncalibrated",
    ...(calibration.calibrated ? { band: bandFor(s) } : {}),
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
 * below their resolved severity", which is exactly what ADR 0063 sec 3 asks this category to report -
 * counted by `f.ceiling != null` (set only when the Standard ceiling actually BOUND, resolve-
 * config.mjs), never by re-counting warnings: a plugin can carry a warning the pin did nothing to
 * (W6 finding 2's own fixture proves this stays exact even when such a warning is present).
 */
function currencyCategory({ pinned, shipped, resolved, houseOff }) {
  const componentCount = 1; // the plugin's own pin, not a per-skill/agent measurement
  if (houseOff) return { state: "off-by-profile", reason: "house-provenance signal off under this profile", componentCount };
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
 * @param {{advisoryLayer:string, profile?:string, pinned?:unknown, shipped?:string|null,
 *   resolved?:Array<object>, advisoryFindings?:Array<object>, adv4Measurement?:object|null}} opts
 *   `advisoryFindings` and `adv4Measurement` are the SAME values scripts/check.mjs's
 *   computeAdvisoryLayer() already computed for this ctx - callers (evaluate.mjs, gradeMember()) pass
 *   them straight through rather than this file re-deriving them (W6 finding 8).
 */
export function computeHealth(ctx, opts = {}) {
  if (opts.advisoryLayer !== "on") return null;
  const houseOff = isHouseOffProfile(opts.profile);
  return {
    categories: {
      substance: substanceCategory(ctx, { houseOff, adv4Measurement: opts.adv4Measurement }),
      budget: budgetCategory(ctx),
      portability: portabilityCategory(ctx, { profile: opts.profile, advisoryFindings: opts.advisoryFindings }),
      security: securityCategory(ctx, { profile: opts.profile, advisoryFindings: opts.advisoryFindings }),
      currency: currencyCategory({ pinned: opts.pinned, shipped: opts.shipped, resolved: opts.resolved, houseOff }),
    },
  };
}

export { bandFor as _bandForTesting }; // exported only for tests/unit/health-score.test.mjs's band-boundary coverage
