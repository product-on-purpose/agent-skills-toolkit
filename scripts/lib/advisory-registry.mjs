// what-it-is:   the advisory registry (ADR 0063)
// what-it-does: declares the ADV1-ADV4 advisory metadata (advisoryId, title, category, provenance) and
//               runs the registered advisory modules over a check context, returning advisory findings.
//               The module list is EMPTY today - ADV1-ADV4 exist here only as metadata, and their screen
//               modules (under scripts/advisory/) arrive in later changes.
// why:          ADR 0063 decision 1: advisory findings are computed by modules registered in a registry
//               SEPARATE from scripts/lib/registry.mjs, so no verdict path can reach them by accident.
//               Every advisory finding is stamped with reqId: null here, at the one place findings leave
//               a module and enter the layer, so a module cannot leak a reqId into the tier machinery
//               even if it tried (tierForReq(null) is "universal", which is why the SEPARATE ARRAY - not
//               the null reqId - is what scripts/check.mjs relies on to keep these out of findings[]).
// used-by:      scripts/check.mjs (runs it beside runAllChecks); scripts/lib/profiles.mjs (reads the
//               house-provenance id set for the plain-plugin advisory off-set); the partition test

/**
 * ADV1-ADV4, exactly as ADR 0063 sec 2 names them. `category` is the health-number category (sec 3)
 * each ID's signals feed; it is metadata here and unused until the health number ships. No `modules`
 * list lives on an entry: a module names its own `advisoryId` in its `meta`, and runAdvisoryModules
 * below looks the provenance up from here rather than trusting the module to self-report it.
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

/** The real, shipped module list. EMPTY today: screens arrive in later changes, each exporting
 * { meta: { advisoryId }, check(ctx) -> Finding[] } the same shape a spine check exports. Frozen so a
 * caller cannot mutate the shared default. */
export const ADVISORY_MODULES = Object.freeze([]);

/**
 * Run every registered advisory module over ctx and return its findings, flattened and stamped.
 *
 * `modules` defaults to the real, empty ADVISORY_MODULES. Accepting it as a PARAMETER - rather than
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
