// what-it-is:   the agentskills check
// what-it-does: composes the agentskills.io base checks (anatomy plus frontmatter) over each skill, the Universal portability floor
// why:          enforces a Standard requirement deterministically so the gate stays model-free
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import { check as frontmatter } from "./frontmatter-valid.mjs";
import { check as nameDir } from "./name-matches-dir.mjs";
import { check as description } from "./description-score.mjs";
import { check as refs } from "./reference-links.mjs";
import { check as budget } from "./instruction-budget.mjs";

/**
 * The agentskills.io-equivalent validation surface (Standard sec 6).
 * Reimplemented (decision Q1.1); a real skills-ref can replace the body here
 * without changing callers.
 */
// NOTE: this is a compositor, not an individual check. It intentionally does NOT
// export `check` so the registry (which lists individual checks) cannot enumerate
// it and double-count U3-U7. The seam is the swap point for a future real skills-ref.
export function checkAgentskills(ctx) {
  return [...frontmatter(ctx), ...nameDir(ctx), ...description(ctx), ...refs(ctx), ...budget(ctx)];
}

export const meta = { id: "agentskills", tier: "universal", reqId: null };
