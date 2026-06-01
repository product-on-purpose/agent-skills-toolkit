# askit-build-hook (reference)

Authors a plugin's event-driven hooks (Advanced tier, Standard sec 3.5). The skill is portable; the hooks it authors are primarily a Claude capability with a Codex subset.

## Modes
- `create`: interview (event, trigger/matcher, type, scope, failure behavior), author the hook + register it in `hooks/hooks.json` (using `${CLAUDE_PLUGIN_ROOT}`), declare it in `library.json` `components.hooks`, evaluate.
- `improve`: confirm the event/trigger/scope/failure are documented, the block message is actionable, and the hook is idempotent.

## Rules (sec 3.5)
- A hook MUST document its event, trigger, scope, and failure behavior.
- A blocking hook MUST emit an actionable message.
- A hook MUST be idempotent where the event can repeat.
- Least privilege applies (sec 9).

## Targets
Claude: 31 events; types `command` / `http` / `mcp_tool` / `prompt` / `agent`. Codex: a smaller event set; verify current plugin-hook ingestion at build time (known caveat) and scope `agent-targets`. The wider agentskills.io ecosystem does not support hooks.

## Validation
Hook conformance (documentation, idempotency, actionable messages) is graded at the Advanced tier; the deterministic hook check ships with Gold self-hosting (Phase 5), when the toolkit declares its own hooks. See [build-a-hook how-to](../how-to/build-a-hook.md) and [authoring-hooks](../../skills/askit-build-hook/references/authoring-hooks.md).
