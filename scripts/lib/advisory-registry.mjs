// what-it-is:   the advisory registry (ADR 0063)
// what-it-does: declares the ADV1-ADV4 advisory metadata (advisoryId, title, category, provenance) and
//               runs the registered advisory modules over a check context, returning advisory findings.
//               ADV1 (portability), ADV2 (preload cap) and ADV3 (security screen) ship as real
//               screens, under scripts/advisory/. ADV4 exists here only as metadata; its screen arrives
//               in a later commit of this same change. This file also carries the health number's
//               PRE-REGISTERED cut points (ADR 0063 sec 4) as data: fixed in THIS commit, before any
//               corpus measurement or the health number's own implementing code, both of which land in
//               a later commit that imports these constants rather than restating them.
// why:          ADR 0063 decision 1: advisory findings are computed by modules registered in a registry
//               SEPARATE from scripts/lib/registry.mjs, so no verdict path can reach them by accident.
//               Every advisory finding is stamped with reqId: null here, at the one place findings leave
//               a module and enter the layer, so a module cannot leak a reqId into the tier machinery
//               even if it tried (tierForReq(null) is "universal", which is why the SEPARATE ARRAY - not
//               the null reqId - is what scripts/check.mjs relies on to keep these out of findings[]).
// used-by:      scripts/check.mjs (runs it beside runAllChecks); scripts/lib/profiles.mjs (reads the
//               house-provenance id set for the plain-plugin advisory off-set); the partition test;
//               tests/unit/adv3-security.test.mjs (ADV3's own fixture/mutation/timing coverage)
import * as adv1Portability from "../advisory/adv1-portability.mjs";
import * as adv2PreloadCap from "../advisory/adv2-preload-cap.mjs";
import * as adv3Security from "../advisory/adv3-security.mjs";

/**
 * ADV1-ADV4, exactly as ADR 0063 sec 2 names them. `category` is the health-number category (sec 3)
 * each ID's signals feed; it is metadata here and unused until the health number ships. No `modules`
 * list lives on an entry: a module names its own `advisoryId` in its `meta`, and runAdvisoryModules
 * below looks the provenance up from here rather than trusting the module to self-report it.
 *
 * ADV3's provenance is "objective" per this table; RS-E4's measured false-positive rate (0 fires over
 * 1,206 files across the family and audit corpora, within the pre-registered 0.005 ceiling - see
 * scripts/advisory/README.md's ADV3 heading) is what let it register in ADVISORY_MODULES below.
 */
export const ADVISORY_REGISTRY = Object.freeze([
  Object.freeze({
    advisoryId: "ADV1",
    title: "portability",
    category: "portability",
    provenance: "vendor-cited",
  }),
  Object.freeze({
    advisoryId: "ADV2",
    title: "preload cap",
    category: "budget",
    provenance: "vendor-cited",
  }),
  Object.freeze({
    advisoryId: "ADV3",
    title: "security screen",
    category: "security",
    provenance: "objective",
  }),
  Object.freeze({
    advisoryId: "ADV4",
    title: "substance signals",
    category: "substance",
    provenance: "house",
  }),
]);

export const ADVISORY_BY_ID = new Map(ADVISORY_REGISTRY.map((a) => [a.advisoryId, a]));

/** The house-provenance ADV ids - the set scripts/lib/profiles.mjs's plain-plugin advisory off-set must
 * equal (ADR 0063 sec 1: "Under --profile plain-plugin, the house-provenance advisory signals do not
 * run"). Derived from the registry, never duplicated as a literal list, so the two cannot drift - the
 * same shape ADR 0029 required for the spine's own house-provenance set. */
export const HOUSE_ADVISORY_IDS = Object.freeze(
  ADVISORY_REGISTRY.filter((a) => a.provenance === "house").map((a) => a.advisoryId)
);

/** The real, shipped module list: ADV1, ADV2 and ADV3 so far, each exporting
 * { meta: { advisoryId }, check(ctx) -> Finding[] } the same shape a spine check exports. ADV4 arrives
 * in a later commit of this same change. Frozen so a caller cannot mutate the shared default. */
export const ADVISORY_MODULES = Object.freeze([adv1Portability, adv2PreloadCap, adv3Security]);

// ---------------------------------------------------------------------------
// The health number's pre-registered cut points (ADR 0063 sec 3 and sec 4)
// ---------------------------------------------------------------------------
//
// PRE-REGISTERED 2026-10-30, in the commit that precedes BOTH the corpus measurement and the commit
// that adds the two falsifiable tests (ADR 0063 sec 4: "Git order is the evidence"). Every number here
// is imported by scripts/lib/health-score.mjs and by the falsifiable tests; neither restates a cut
// point as a literal, so a cut point can only ever move by editing this one place.

/** The four band names, worst to best is the reverse of this order ("lowest" first on purpose: it is
 * the band the two falsifiable tests name). Applies to the four SCORED categories (substance, budget,
 * portability, security); currency has no band this pass (ADR 0063 sec 3: "Currency has no band in
 * this pass. A band would say how far behind is too far, and that is D-02's question."). */
export const HEALTH_BANDS = Object.freeze(["lowest", "weak", "fair", "healthy"]);

/** A 0-100 score's band cut points: score >= healthyMin -> "healthy"; >= fairMin -> "fair"; >= weakMin
 * -> "weak"; below weakMin -> "lowest". `weakMin` is the floor the potemkin-gold falsifiable test
 * checks a score against directly (ADR 0063 sec 4: "the test asks whether the fixture falls below a
 * fixed floor, not whether the floor was validated") - it applies regardless of whether the category's
 * calibration state is "calibrated" or "uncalibrated", because an uncalibrated category still shows no
 * band but still reports its raw measurement and score. */
export const HEALTH_BAND_CUT_POINTS = Object.freeze({ healthyMin: 80, fairMin: 50, weakMin: 20 });

/** The ship bar (ADR 0063 sec 4): for each banded category, the most deserving (labelled `deserves:
 * true`) trees allowed in the lowest band, and the smallest share of labelled undeserving trees that
 * must land below the top ("healthy") band. Pre-registered so a FUTURE calibration pass is checked
 * against a bar fixed before that pass ran, never chosen after the fact to flatter its own result.
 * Unused this ship: docs/reference/health-score.md records that every category is below
 * HEALTH_CALIBRATION_MINIMUM, so there is nothing calibrated yet to hold to this bar. */
export const HEALTH_SHIP_BAR = Object.freeze({ falsePositiveCeiling: 0, separationFloor: 0.8 });

/** ADR 0063 sec 4: "a category needs at least 5 positive and 5 negative labelled trees before it shows
 * a band." Below this minimum on EITHER side, the category reports `uncalibrated` and shows no band. */
export const HEALTH_CALIBRATION_MINIMUM = 5;

/**
 * Run every registered advisory module over ctx and return its findings, flattened and stamped.
 *
 * `modules` defaults to the real, shipped ADVISORY_MODULES. Accepting it as a PARAMETER - rather than
 * reading a module-level constant unconditionally - is the injection point ADR 0063 asks for: the
 * partition test passes its own one-element array to prove the layer is really partitioned, without
 * touching this file and without an environment variable.
 *
 * Every returned finding carries `reqId: null` (this function sets it, overwriting whatever the module
 * emitted) and `advisoryId` + `provenance` from the registry entry matching the module's own
 * `meta.advisoryId` - looked up here rather than trusted from the module, so a module cannot misreport
 * its own provenance. A module whose `advisoryId` is not registered (a test stub, deliberately) falls
 * back to the module's own `meta.provenance`, or "house" if it names none - the strictest *provenance
 * label* available for a finding nobody can otherwise classify. This is cosmetic only: scripts/check.mjs
 * filters the MODULE LIST by `advisoryId` membership in a profile's `advisoryOff`, never by provenance,
 * so an unregistered id is never profile-exempt regardless of what provenance it is stamped with. Every
 * module this repository ships MUST have its advisoryId registered in ADVISORY_REGISTRY above, or
 * plain-plugin can never turn it off; add a test asserting that once the first module lands.
 */
export function runAdvisoryModules(ctx, modules = ADVISORY_MODULES) {
  const out = [];
  for (const mod of modules) {
    const id = mod?.meta?.advisoryId ?? null;
    const entry = id != null ? ADVISORY_BY_ID.get(id) : undefined;
    const provenance = entry?.provenance ?? mod?.meta?.provenance ?? "house";
    // ADR 0063 states the layer "can never fail anything" - a module that throws must not make
    // check.mjs/evaluate.mjs crash with a non-gate exit code, which would read indistinguishable from a
    // failing grade. Isolated per module so one broken screen cannot take the rest of the layer down
    // with it; reported as its own advisory finding (reqId: null, same partition as every other
    // advisory result) rather than only to stderr, so a thrown module is visible in --json/--sarif too,
    // not just in a terminal a CI run may never show.
    let findings;
    try {
      findings = mod.check(ctx);
    } catch (e) {
      out.push({
        check: "advisory-module-error", severity: "warn", reqId: null, advisoryId: id, provenance,
        message: `advisory module ${id ?? "(unregistered)"} threw and was skipped: ${e?.message ?? String(e)}`,
        file: null,
      });
      continue;
    }
    for (const f of findings) {
      out.push({ ...f, reqId: null, advisoryId: id, provenance });
    }
  }
  return out;
}
