// what-it-is:   ADV2 - preload cap (ADR 0063 sec 2; backlog E87, "plugin-agent loading asymmetries")
// what-it-does: flags a subagent whose frontmatter `skills:` list names more than 32 distinct skills,
//               since Claude Code preloads only the first 32 distinct names in the list
// why:          https://code.claude.com/docs/en/sub-agents (read 2026-10-25) states the field controls
//               which skills are PRELOADED into the subagent's startup context, and caps that preload
//               at the first 32 distinct names. A subagent declaring more than 32 would silently have
//               the rest excluded from its startup context, with nothing here warning about it. This is
//               an ADVISORY finding (never a gate failure): the runtime does not refuse the frontmatter
//               or the agent, it only preloads less than the author wrote
// used-by:      scripts/lib/advisory-registry.mjs (ADVISORY_MODULES); covered by
//               tests/unit/advisory-adv2-preload-cap.test.mjs
import { finding, SEVERITY } from "../lib/findings.mjs";
import { relPath } from "../lib/fs-utils.mjs";

/**
 * The vendor's cap, read verbatim off https://code.claude.com/docs/en/sub-agents (fetched 2026-10-25
 * with the same accept header scripts/vendor-watch.mjs uses):
 *
 *   "The full content of each listed skill is injected into the subagent's context at startup, up to
 *   the first 32 distinct names in the list."
 *
 * The SAME page's worked example shows the field's documented shape - a YAML list of skill name
 * strings under `skills:`:
 *
 *   skills:
 *     - api-conventions
 *     - error-handling-patterns
 *
 * This is the same sentence the quote claim `plugin-agent-skills-preload-cap` pins in
 * foundation/claims/vendor-claims.json, and tests/unit/advisory-adv2-preload-cap.test.mjs derives this
 * constant FROM that claim's text, so the two cannot drift apart.
 */
export const PRELOAD_CAP = 32;

/** ADV2's advisoryId and provenance, mirroring adv1-portability.mjs's note on the same pattern. */
export const meta = { advisoryId: "ADV2", provenance: "vendor-cited" };

/**
 * The distinct skill names a `skills:` frontmatter value declares, in first-occurrence list order, or
 * `null` when the value's shape cannot be read as the documented list of names.
 *
 * `null` (not `[]`) distinguishes "this frontmatter has no `skills:` field, or it is shaped in a way
 * this screen cannot read" from "it has one and it names zero skills" - a value this screen cannot
 * parse must produce no finding, never a false "0 distinct names" reading or a crash. A non-string
 * entry (a shape the documented list never shows) is dropped rather than treated as a parse failure for
 * the whole field, so one malformed entry does not hide a real overflow among the rest.
 *
 * @param {unknown} frontmatter a parsed agent frontmatter object (anything else yields null)
 * @returns {string[]|null}
 */
export function distinctPreloadNames(frontmatter) {
  if (!frontmatter || typeof frontmatter !== "object") return null;
  const raw = frontmatter.skills;
  if (raw === undefined) return null;
  if (!Array.isArray(raw)) return null; // documented shape is a list; anything else is unparseable here
  const names = raw.filter((x) => typeof x === "string");
  return [...new Set(names)];
}

export function check(ctx) {
  const out = [];
  // agentDocs, NOT subagents, for the same reason U14 (agent-restricted-fields) reads it: it is what
  // the RUNTIME loads from agents/, a superset of what the plugin registers (README.md and
  // underscore-prefixed files are excluded from registration but loaded anyway).
  for (const agent of ctx.agentDocs ?? ctx.subagents ?? []) {
    if (agent.parseError) continue; // another check's finding, not this one's - see adv1-portability.mjs
    const distinct = distinctPreloadNames(agent.frontmatter);
    if (distinct === null || distinct.length <= PRELOAD_CAP) continue;
    const overflow = distinct.slice(PRELOAD_CAP);
    out.push(finding(
      "adv2-preload-cap", SEVERITY.WARN,
      `agent "${agent.name}" declares ${distinct.length} distinct skills in its \`skills:\` list, which is ` +
      `more than the ${PRELOAD_CAP} Claude Code preloads into its startup context ("The full content of each ` +
      `listed skill is injected into the subagent's context at startup, up to the first ${PRELOAD_CAP} distinct ` +
      `names in the list." - https://code.claude.com/docs/en/sub-agents). The skills past the ${PRELOAD_CAP}th ` +
      `are not preloaded: ${overflow.map((n) => `\`${n}\``).join(", ")}.`,
      { file: relPath(ctx.root, agent.file) }
    ));
  }
  return out;
}
