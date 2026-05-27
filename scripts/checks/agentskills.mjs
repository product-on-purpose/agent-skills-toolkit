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
export function checkAgentskills(ctx) {
  return [...frontmatter(ctx), ...nameDir(ctx), ...description(ctx), ...refs(ctx), ...budget(ctx)];
}

export const meta = { id: "agentskills", tier: "universal", reqId: null };
