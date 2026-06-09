// what-it-is:   the migration (gap-by-tier) report object builder
// what-it-does: decorates the evaluate() conformance object with a staged current-to-target bring-to-conformance plan
// why:          askit-migrate needs a shareable migration assessment; it reuses the one report renderer via reportType "migration" (E1)
// used-by:      scripts/evaluate.mjs (--report=migration) and the askit-migrate skill
import { evaluate } from "../evaluate.mjs";
import { TIER_ORDER, tierForReq } from "./tier.mjs";
import { metaFor } from "./report-meta.mjs";

const effSev = (f) => f.effectiveSeverity ?? f.severity;

/**
 * Build the migration report object: the conformance object plus a `migration` block whose `stages` list,
 * for each tier from current+1 to the target, the error findings that block that tier with their fix prompt
 * and effort. Derived deterministically from the resolved findings and TIER_ORDER (report.blocked alone is
 * not enough; it only carries the immediate next tier).
 */
export function migrateReport(target, opts = {}) {
  const base = evaluate(target, opts);
  const currentTier = base.tier ?? "none";
  const targetTier = opts.targetTier ?? "advanced";

  const errorsByTier = {};
  for (const f of base.findings ?? []) {
    if (effSev(f) !== "error" || f.suppressed) continue;
    (errorsByTier[tierForReq(f.reqId)] ??= []).push(f);
  }

  const curIdx = currentTier === "none" ? -1 : TIER_ORDER.indexOf(currentTier);
  const tgtIdx = TIER_ORDER.indexOf(targetTier);
  const stages = [];
  for (let i = curIdx + 1; i <= tgtIdx; i++) {
    const tier = TIER_ORDER[i];
    const blockers = (errorsByTier[tier] ?? []).map((f) => {
      const m = metaFor(f.reqId);
      return {
        reqId: f.reqId,
        message: f.message,
        fixPrompt: f.file ? m.fixPrompt.replace(/<component>/g, f.file) : m.fixPrompt,
        effort: m.effort,
      };
    });
    stages.push({ tier, blockers });
  }

  return { ...base, reportType: "migration", migration: { currentTier, targetTier, stages } };
}
