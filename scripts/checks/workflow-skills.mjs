// what-it-is:   the workflow-skills check (S5)
// what-it-does: asserts every skill a workflow references actually exists
// why:          enforces the Standard requirement S5 deterministically, one module per reqId, so the gate stays model-free
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "workflow-skills", tier: "convergent", reqId: "S5", since: "0.x", provenance: "house" };

/**
 * Reads `ctx.workflows` (ADR 0047). This check used to hand-roll its own `readdirSync` over
 * `_workflows/`, which is how the repository ended up with THREE different ideas of what a workflow
 * file is - this one, `S4`'s `isDir` probe, and the `ctx.workflows` `S7` read that nothing built. That
 * private reader also included `README.md`, which fell through harmlessly only because a folder guide
 * has no `steps` array; the loader excludes it outright, so this is a strict narrowing.
 *
 * The frontmatter `steps` parsing stays here, because THAT is this check's subject matter.
 */
export function check(ctx) {
  const out = [];
  const known = new Set((ctx.skills || []).map((s) => s.name));
  for (const w of ctx.workflows || []) {
    const steps = w.frontmatter?.steps;
    if (!Array.isArray(steps)) continue;
    for (const step of steps) {
      const skillName = typeof step === "string" ? step : step?.skill;
      if (typeof skillName === "string" && !known.has(skillName)) {
        out.push(finding(meta.id, SEVERITY.ERROR, `workflow "${w.name}.md" references skill "${skillName}" which does not exist on disk (Standard sec 3.4).`, { file: `_workflows/${w.name}.md`, reqId: meta.reqId }));
      }
    }
  }
  return out;
}
