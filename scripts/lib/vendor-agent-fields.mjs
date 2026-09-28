// what-it-is:   the vendor's own field list for plugin-shipped agents (ADR 0045)
// what-it-does: names which frontmatter fields Claude Code supports on an agent shipped inside a plugin,
//               which three it refuses, and answers "which of the refused fields does this frontmatter
//               declare"
// why:          the same requirement is read by two scopes - U14 when a plugin is graded on its own, and
//               the marketplace A6 reading when it is graded as a catalogue member - and a field list
//               written down twice is a field list that will disagree with itself. A plugin's verdict
//               must not depend on how it happened to be graded
// used-by:      scripts/checks/agent-restricted-fields.mjs, scripts/lib/marketplace/analyze.mjs;
//               covered by tests/unit/agent-restricted-fields.test.mjs

/**
 * The vendor statements this module encodes, quoted verbatim from the live pages read on 2026-09-28.
 *
 * The refusal, from https://code.claude.com/docs/en/sub-agents (Choose the subagent scope):
 *
 *   "For security reasons, plugin subagents don't support the `hooks`, `mcpServers`, or
 *    `permissionMode` frontmatter fields. These fields are ignored when loading agents from a plugin."
 *
 * The supported list, from https://code.claude.com/docs/en/plugins/components (Frontmatter fields in
 * plugin agents):
 *
 *   "Supported fields: `name`, `description`, `model`, `effort`, `maxTurns`, `tools`, `disallowedTools`,
 *    `skills`, `memory`, `background`, `omitClaudeMd`, `isolation`, `color`, and the `cacheTtl` key of
 *    `experimental`. The only valid `isolation` value is \"worktree\"."
 *
 * The pages write "don't" with a typographic apostrophe. This file stores the ASCII apostrophe, because
 * these constants are read by HUMANS in finding text. The pinned CLAIMS in
 * foundation/claims/vendor-claims.json are the copies that must match the fetched pages after
 * normalisation.
 *
 * What the 2026-09-28 re-read changed, against the 2026-09-16 reading:
 *   - both sentences LEFT the plugins reference, whose URL now serves only the manifest reference. The
 *     supported list moved to the plugin components page. The refusal sentence is gone from both plugin
 *     pages and survives on the sub-agents page, naming the same three fields with the same security
 *     rationale, so that is the page it is quoted from now.
 *   - the SUPPORTED list gained `color` and the `cacheTtl` key of `experimental`. It is read only to
 *     build U14's remediation prose, so this is green-ward. The nested key is written
 *     `experimental.cacheTtl` below, because a bare `experimental` would tell authors the whole map is
 *     supported, and the vendor says only that one key is.
 *   - the components page lists a FOURTH ignored field, "Ignored fields: `permissionMode`, `hooks`,
 *     `mcpServers`, and `initialPrompt`", without the security rationale. It is NOT added below. Adding a
 *     field to the unsupported list is red-ward under ADR 0045, so it needs a Standard minor with
 *     finding-level migration metadata, not a constant edit. Backlog E70 (initialPrompt on plugin agents)
 *     carries it.
 *   - the UNSUPPORTED list below is therefore UNCHANGED, so no plugin's verdict moves. Per ADR 0045 that
 *     makes this a pin refresh, not a Standard revision.
 *
 * Earlier readings, kept because each one moved something:
 *   - 2026-09-16: the supported list gained `omitClaudeMd`, and the refusal went passive to active.
 *   - 2026-08-13, while implementing ADR 0045: "For security reasons, `hooks`, `mcpServers`, and
 *     `permissionMode` are not supported for plugin-shipped agents."
 *
 * Note the vendor gives SECURITY REASONS for the refusal, which E33's original "silently ignored"
 * paraphrase left out. The vendor's own next sentence does say the fields "are ignored when loading
 * agents from a plugin", so ignored is accurate. What matters to an author is that nothing tells them.
 *
 * ADR 0045 decides what happens when this page changes, and the answer is asymmetric:
 *   - a field REMOVED from the unsupported list is a SILENT RE-READ. The check becomes less strict,
 *     which is green-ward, so no plugin that passed can start failing: update the constant, bump the
 *     read date, note it in the CHANGELOG.
 *   - a field ADDED to the unsupported list is a STANDARD REVISION. It is red-ward, so it needs a new
 *     minor and finding-level `migration` metadata per ADR 0044 - NOT a bump of U14's own `since`,
 *     because the check did not appear again, a rule inside it did.
 *
 * The docs host has already moved once (docs.claude.com now 301s to code.claude.com). A host move is a
 * documentation edit, not a Standard revision.
 */
export const AGENT_FIELDS_DOC = "https://code.claude.com/docs/en/sub-agents (Choose the subagent scope; read 2026-09-28)";

/** The vendor's sentence, quoted in every finding so a reader's "says who" is answered in place. */
export const AGENT_FIELDS_QUOTE =
  "For security reasons, plugin subagents don't support the hooks, mcpServers, or permissionMode frontmatter fields.";

export const PLUGIN_AGENT_UNSUPPORTED_FIELDS = Object.freeze(["hooks", "mcpServers", "permissionMode"]);

export const PLUGIN_AGENT_SUPPORTED_FIELDS = Object.freeze([
  "name", "description", "model", "effort", "maxTurns", "tools", "disallowedTools", "skills", "memory", "background", "omitClaudeMd", "isolation",
  "color", "experimental.cacheTtl",
]);

/**
 * The refused fields this frontmatter actually declares, in the vendor's own listing order.
 *
 * Uses hasOwnProperty rather than truthiness on purpose: `hooks: null` and `permissionMode: ""` are
 * still fields the author wrote and the runtime still refuses them. Declaring a field and giving it an
 * empty value is not the same as not declaring it, and treating it as such would make the check silent
 * in exactly the case where an author is most likely to think something is configured.
 *
 * @param {unknown} frontmatter a parsed agent frontmatter object (anything else yields no fields)
 * @returns {string[]}
 */
export function unsupportedFieldsOn(frontmatter) {
  if (!frontmatter || typeof frontmatter !== "object") return [];
  return PLUGIN_AGENT_UNSUPPORTED_FIELDS.filter((f) => Object.prototype.hasOwnProperty.call(frontmatter, f));
}
