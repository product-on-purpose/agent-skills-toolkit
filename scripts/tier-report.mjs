// what-it-is:   the tier report
// what-it-does: reports the highest tier a plugin satisfies plus the burndown (blocked requirements) to the next, keyed by reqId
// why:          the burndown turns the climb into a worklist instead of a guess
// used-by:      run by contributors, askit-capability-advisor, and the docs that show the tier ladder
import { loadPlugin } from "./lib/load-plugin.mjs";
import { runAllChecks, provenanceByReq } from "./lib/registry.mjs";
import { SINCE_BY_REQ } from "./lib/standard-gate.mjs";
import { loadConfig } from "./lib/config.mjs";
import { resolveFindings } from "./lib/resolve-config.mjs";
import { TIER_ORDER, tierForReq } from "./lib/tier.mjs";
import { normalizeArgPath } from "./lib/fs-utils.mjs";

// F1 + F3: when no findings are passed, default to the fully resolved set (the standard-aware downgrade,
// then config/profile/suppression resolution), so the burndown agrees with the gate. check.mjs and
// evaluate.mjs pass their already-resolved findings in.
function defaultResolved(root, ctx) {
  const { config, findings: configFindings } = loadConfig(root);
  return resolveFindings([...configFindings, ...runAllChecks(ctx)], config, provenanceByReq(), {
    pinned: ctx.library?.data?.standard,
    sinceByReq: SINCE_BY_REQ,
  });
}

export function computeTierReport(root, ctx = loadPlugin(root), findings = defaultResolved(root, ctx)) {
  // PRESENCE, not nullishness. `?? null` cannot tell an ABSENT field from an explicit `"tier": null`,
  // so a library.json that declares the field as null was read as "never declared a tier" and fell
  // through to the check-every-tier path - earning Advanced under the plain-plugin profile, which is
  // the precise defect the previous commit set out to close. It closed the "banana" spelling of it and
  // not the null one. A field that is PRESENT is a declaration, whatever it holds; only its absence is
  // the deliberate no-claim case.
  const declared = ctx.library?.data ?? {};
  const tierDeclared = Object.hasOwn(declared, "tier");
  const declaredTier = tierDeclared ? declared.tier : null;
  const declaredIdx = typeof declaredTier === "string" ? TIER_ORDER.indexOf(declaredTier) : -1;
  // A declaration the tool CANNOT READ is not the same as no declaration, and conflating them awarded a
  // top grade for a typo. `tier: "banana"` - or `"ADVANCED"`, which is likelier - is non-null, so it slipped
  // past the null guard in humanLine below, fell through to "no ceiling, check every tier", and printed
  // "Tier: Advanced (no blockers detected)" with exit 0. U1 normally catches the bad enum first, but the
  // plain-plugin profile turns U1 off - and that profile exists for plugins that have NOT adopted this
  // Standard, which is exactly the population most likely to carry a malformed tier.
  //
  // A missing declaration is a choice. An unreadable one is an error, and an error must never earn a grade.
  // TRUE when there is nothing unreadable: either a recognised tier, or no declaration at all. Setting
  // it from `declaredIdx >= 0` alone marked a MISSING tier invalid and swallowed the honest
  // not-graded-against-the-ladder message that case already had.
  const declaredTierValid = tierDeclared ? declaredIdx >= 0 : true;
  if (tierDeclared && !declaredTierValid) {
    return { tier: "none", satisfies: [], blocked: {}, declaredTier, declaredTierValid: false };
  }

  const errorsByTier = { universal: [], convergent: [], advanced: [] };
  for (const f of findings) {
    const sev = f.effectiveSeverity ?? f.severity; // grade on the resolved severity, not the emitted one
    if (sev !== "error" || f.suppressed) continue;
    const tier = tierForReq(f.reqId);
    errorsByTier[tier].push(`${f.reqId ?? "?"}: ${f.message}`);
  }

  // Accumulate passing tiers up to (and including) the declared tier ceiling.
  // If no declared tier, check all tiers.
  const ceiling = declaredIdx >= 0 ? declaredIdx : TIER_ORDER.length - 1;
  const satisfies = [];
  for (let i = 0; i <= ceiling; i++) {
    const tier = TIER_ORDER[i];
    if (errorsByTier[tier].length === 0) satisfies.push(tier);
    else break;
  }
  const tier = satisfies.length ? satisfies[satisfies.length - 1] : "none";
  const blocked = {};
  const next = TIER_ORDER[satisfies.length <= ceiling ? satisfies.length : ceiling + 1];
  if (next && errorsByTier[next]?.length > 0) blocked[next] = errorsByTier[next];
  return { tier, satisfies, blocked, declaredTier, declaredTierValid };
}

export function humanLine(r) {
  // A plugin that never declared an askit tier (no library.json tier) is not graded against the tier
  // ladder; under plain-plugin (where U1/library.json is off) it would otherwise read as the top tier
  // just for passing the objective checks. Report it honestly instead of asserting an earned tier.
  // An UNREADABLE declaration is reported as the author error it is, never as a grade. This branch is
  // first because the value is non-null, so the null guard below cannot see it - which is how a plugin
  // declaring `tier: "banana"` printed "Tier: Advanced".
  if (r.declaredTierValid === false) {
    return `Tier: not graded - library.json declares tier ${JSON.stringify(r.declaredTier)}, which is not one of ${TIER_ORDER.join(", ")}. Fix the declaration; the tool will not guess which tier you meant.`;
  }
  if (r.declaredTier == null && r.tier !== "none") {
    return `Objective checks pass (no askit tier declared; not graded against the tier ladder).`;
  }
  const next = Object.keys(r.blocked)[0];
  const blockers = next ? r.blocked[next] : [];
  if (!next || blockers.length === 0) return `Tier: ${cap(r.tier)} (no blockers detected)`;
  return `Tier: ${cap(r.tier)} (${cap(next)} blocked: ${blockers.length} issue${blockers.length === 1 ? "" : "s"})`;
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

if (process.argv[1]?.endsWith("tier-report.mjs")) {
  // Normalized through normalizeArgPath so a Windows backslash root is not silently misread (the
  // historical defect: docs/how-to/troubleshoot-the-gate.md). Only the argv-sourced value is
  // normalized; the process.cwd() default is left as the OS gave it.
  const rawRoot = process.argv.find((a, i) => i >= 2 && !a.startsWith("--"));
  const root = rawRoot !== undefined ? normalizeArgPath(rawRoot) : process.cwd();
  const r = computeTierReport(root);
  if (process.argv.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else console.log(humanLine(r));
}
