// what-it-is:   U14 - restricted fields on plugin-shipped agents (ADR 0045)
// what-it-does: fails an agent under the plugin's agents/ directory that declares hooks, mcpServers or
//               permissionMode, which Claude Code refuses on plugin-shipped agents for security reasons
// why:          v1.12.0 detected this across the members of a CATALOGUE and not when a single plugin is
//               graded on its own, which is how almost everyone runs the gate. Same silent-no-op class
//               as the v1.10.0 phantom-subagent discovery: the author believes they configured
//               something and the runtime refuses it, with no signal either way
// used-by:      scripts/lib/registry.mjs; covered by tests/unit/agent-restricted-fields.test.mjs
import path from "node:path";
import { finding, SEVERITY } from "../lib/findings.mjs";
import { AGENT_FIELDS_DOC, AGENT_FIELDS_QUOTE, PLUGIN_AGENT_SUPPORTED_FIELDS, unsupportedFieldsOn } from "../lib/vendor-agent-fields.mjs";

/**
 * `since: "0.13"` and NO migration metadata, which is correct only under ADR 0044's reordering.
 *
 * `since` alone governs an introduction, and it is sufficient here because the Standard ceiling now runs
 * AFTER configuration resolves. Under the previous ordering the pin downgrade was a pre-pass, so a
 * consumer's `rules.U14 = "error"` would have beaten it (E26) and handed a gate-failing error to a
 * plugin pinned at 0.12 for a check that did not exist at its pin - a verdict moving with no pin change,
 * on this release's own new check.
 *
 * `vendor-cited`, not `objective`: the requirement is backed by an external authority quoted below, and
 * a consumer is entitled to know which of their failures are portable facts and which are our
 * conventions (ADR 0028).
 */
export const meta = {
  id: "agent-restricted-fields",
  tier: "universal",
  reqId: "U14",
  since: "0.13",
  provenance: "vendor-cited",
};

export function check(ctx) {
  const out = [];
  for (const agent of ctx.subagents ?? []) {
    // A frontmatter that failed to parse is another check's finding, not this one's: reporting a field
    // list from an unparseable document would be inventing evidence.
    if (agent.parseError) continue;
    const offending = unsupportedFieldsOn(agent.frontmatter);
    if (offending.length === 0) continue;
    out.push(finding(
      meta.id, SEVERITY.ERROR,
      `agent "${agent.name}" declares ${offending.map((f) => `\`${f}\``).join(", ")}, which Claude Code does not support on a plugin-shipped agent ` +
      `("${AGENT_FIELDS_QUOTE}" - ${AGENT_FIELDS_DOC}). ` +
      `The runtime refuses the field, so what you configured is not in effect. Supported fields: ${PLUGIN_AGENT_SUPPORTED_FIELDS.join(", ")}.`,
      { file: path.posix.join("agents", `${agent.name}.md`), reqId: meta.reqId }
    ));
  }
  return out;
}
