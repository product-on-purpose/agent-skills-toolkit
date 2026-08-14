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
 * The vendor statement this module encodes, quoted verbatim. Re-verified against the live page on
 * 2026-08-13 while implementing ADR 0045; both sentences matched exactly, including "For security
 * reasons".
 *
 *   "Plugin agents support `name`, `description`, `model`, `effort`, `maxTurns`, `tools`,
 *    `disallowedTools`, `skills`, `memory`, `background`, and `isolation` frontmatter fields. The only
 *    valid `isolation` value is \"worktree\". For security reasons, `hooks`, `mcpServers`, and
 *    `permissionMode` are not supported for plugin-shipped agents."
 *
 * Note the vendor's wording is "not supported for SECURITY REASONS", which is stronger and more precise
 * than the "silently ignored" paraphrase E33 was originally filed under: the field is refused, not
 * merely dropped, and the author gets no signal that it was.
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
export const AGENT_FIELDS_DOC = "https://code.claude.com/docs/en/plugins-reference (Agents; read 2026-08-13)";

/** The vendor's sentence, quoted in every finding so a reader's "says who" is answered in place. */
export const AGENT_FIELDS_QUOTE =
  "For security reasons, hooks, mcpServers, and permissionMode are not supported for plugin-shipped agents";

export const PLUGIN_AGENT_UNSUPPORTED_FIELDS = Object.freeze(["hooks", "mcpServers", "permissionMode"]);

export const PLUGIN_AGENT_SUPPORTED_FIELDS = Object.freeze([
  "name", "description", "model", "effort", "maxTurns", "tools", "disallowedTools", "skills", "memory", "background", "isolation",
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
