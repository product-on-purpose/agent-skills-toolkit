# How to build a hook

Add an event-driven hook (Advanced tier) to a plugin: author it, register it, and document its behavior.

## 1. Create

Invoke `askit-build-hook` (create mode). It asks for the event (for example PreToolUse), the trigger/matcher, the hook type (`command` / `http` / `mcp_tool` / `prompt` / `agent`), the scope, and the failure behavior. It scaffolds the hook + its `hooks/hooks.json` registration (copying `templates/hooks.json` if needed).

## 2. Document the four required facts

Event, trigger, scope, and failure behavior (Standard sec 3.5). A blocking hook must also carry an actionable message, and must be idempotent if its event can repeat.

## 3. Register

Add the hook to `library.json` `components.hooks` as `{ name, version, tier, status }`. For Codex, verify current plugin-hook ingestion at build time and set `agent-targets` to match.

## 4. Validate

    node scripts/evaluate.mjs . --json

Hook documentation and idempotency are graded at the Advanced tier; the deterministic hook check arrives with Gold self-hosting (Phase 5).

## See also

- [`askit-build-hook` reference](../reference/askit-build-hook.md)
- [authoring-hooks](../../skills/askit-build-hook/references/authoring-hooks.md)
- [Conformance and tiers](../explanation/conformance-and-tiers.md)
