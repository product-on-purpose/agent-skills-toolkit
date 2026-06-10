// what-it-is:   the tier report
// what-it-does: reports the highest tier a plugin satisfies plus the burndown (blocked requirements) to the next, keyed by reqId
// why:          the burndown turns the climb into a worklist instead of a guess
// used-by:      run by contributors, askit-capability-advisor, and the docs that show the tier ladder
import { loadPlugin } from "./lib/load-plugin.mjs";
import { runAllChecks, provenanceByReq } from "./lib/registry.mjs";
import { applyStandardDowngrade } from "./lib/standard-gate.mjs";
import { loadConfig } from "./lib/config.mjs";
import { resolveFindings } from "./lib/resolve-config.mjs";
import { TIER_ORDER, tierForReq } from "./lib/tier.mjs";

// F1 + F3: when no findings are passed, default to the fully resolved set (the standard-aware downgrade,
// then config/profile/suppression resolution), so the burndown agrees with the gate. check.mjs and
// evaluate.mjs pass their already-resolved findings in.
function defaultResolved(root, ctx) {
  const downgraded = applyStandardDowngrade(runAllChecks(ctx), ctx.library?.data?.standard);
  const { config, findings: configFindings } = loadConfig(root);
  return resolveFindings([...configFindings, ...downgraded], config, provenanceByReq());
}

export function computeTierReport(root, ctx = loadPlugin(root), findings = defaultResolved(root, ctx)) {
  const declaredTier = ctx.library?.data?.tier ?? null;
  const declaredIdx = declaredTier ? TIER_ORDER.indexOf(declaredTier) : -1;

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
  return { tier, satisfies, blocked, declaredTier };
}

export function humanLine(r) {
  // A plugin that never declared an askit tier (no library.json tier) is not graded against the tier
  // ladder; under plain-plugin (where U1/library.json is off) it would otherwise read as the top tier
  // just for passing the objective checks. Report it honestly instead of asserting an earned tier.
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
  const root = process.argv.find((a, i) => i >= 2 && !a.startsWith("--")) ?? process.cwd();
  const r = computeTierReport(root);
  if (process.argv.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else console.log(humanLine(r));
}
