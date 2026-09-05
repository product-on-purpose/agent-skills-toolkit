// what-it-is:   the per-agent hook handler-type support table (RS-C2, Standard 0.16)
// what-it-does: names, per target agent, which `hooks.json` handler types actually EXECUTE and which are
//               accepted by the parser and then skipped
// why:          Claude Code and Codex do not agree on the handler-type vocabulary, and the disagreement
//               fails SILENTLY. Codex parses a `prompt` or `agent` handler, skips it, and reports no
//               error - so a plugin that emits a Codex manifest and ships one of those hooks has a hook
//               that never runs, and nothing in the gate said so. G1 validated `type` against the Claude
//               five-type set only, which is correct for Claude and blind for Codex.
// used-by:      scripts/checks/hook-documentation.mjs (G1); covered by tests/unit/hook-handler-support.test.mjs
//
// This is a VENDOR-CITED table, not a house convention. The Codex half is pinned as the claim
// `cx-hook-handler-support` in foundation/claims/vendor-claims.json and re-verified by `vendor-watch` on
// every run, so if the vendor widens or narrows the supported set the watch reports it rather than this
// file quietly going stale. That pin is the ledger's first Codex claim, and this table is what depends
// on it.

/** The Claude Code handler vocabulary (STANDARD.md sec 3.5). All five execute. */
export const CLAUDE_HANDLER_TYPES = Object.freeze(["command", "http", "mcp_tool", "prompt", "agent"]);

/**
 * Codex, read 2026-09-04 from https://learn.chatgpt.com/docs/hooks.md:
 *
 *   "`command` and `mcp_tool` handlers are supported. `prompt` and `agent` handlers are parsed but skipped."
 *
 * `parsed but skipped` is the whole point. It is not a rejection - nothing errors, nothing warns at
 * runtime, and the plugin author has no signal at all. That is why this is a gate finding rather than
 * something left to the vendor to report.
 */
export const CODEX_HANDLER_SUPPORT = Object.freeze({
  supported: Object.freeze(["command", "mcp_tool"]),
  skipped: Object.freeze(["prompt", "agent"]),
});

/** The vendor's own sentence, quoted where a finding needs to show its authority. */
export const CODEX_HANDLER_SENTENCE =
  "`command` and `mcp_tool` handlers are supported. `prompt` and `agent` handlers are parsed but skipped.";

export const CODEX_HANDLER_SOURCE = "https://learn.chatgpt.com/docs/hooks.md";

/**
 * Does this handler type run on Codex?
 *
 * A type Codex has never heard of is NOT reported here. G1's existing type validation already rejects a
 * type outside the Claude five, and reporting the same string twice under two reqIds would double-count
 * one defect. This answers only the narrower question the vendor sentence supports: of the types that
 * are legal to write, which ones does Codex actually execute.
 */
export function codexSkipsHandler(type) {
  return CODEX_HANDLER_SUPPORT.skipped.includes(type);
}

/**
 * Does this plugin ship to Codex?
 *
 * Two independent signals, either sufficient, because they answer the question at different lifecycle
 * points and a plugin can legitimately be at either. `agent-targets` is the DECLARATION - what the
 * library says it converges across - and a `.codex-plugin/plugin.json` is the ARTIFACT, what it has
 * actually emitted. Requiring both would miss a plugin that declares Codex and has not generated yet;
 * requiring only the manifest would miss the moment the author most wants to be told, which is before
 * the emit.
 */
export function targetsCodex(ctx) {
  const declared = ctx?.library?.data?.["agent-targets"];
  if (Array.isArray(declared) && declared.includes("codex")) return true;
  return Boolean(ctx?.codexManifest);
}
