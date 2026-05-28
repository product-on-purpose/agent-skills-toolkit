import { loadPlugin } from "./lib/load-plugin.mjs";
import { runAllChecks } from "./lib/registry.mjs";
import { TIER_ORDER, tierForReq } from "./lib/tier.mjs";

export function computeTierReport(root, ctx = loadPlugin(root), findings = runAllChecks(ctx)) {
  const declaredTier = ctx.library?.data?.tier ?? null;
  const declaredIdx = declaredTier ? TIER_ORDER.indexOf(declaredTier) : -1;

  const errorsByTier = { universal: [], convergent: [], advanced: [] };
  for (const f of findings) {
    if (f.severity !== "error") continue;
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
  return { tier, satisfies, blocked };
}

export function humanLine(r) {
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
