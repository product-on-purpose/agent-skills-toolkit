---
name: askit-build-hook
description: Creates and improves event-driven hooks (Advanced tier) for a plugin to the Advanced Skill Library Standard. Use when you need to add a hook, enforce a guard on a tool or session event, inject context, or document a hook's event, scope, and failure behavior.
metadata:
  version: 0.1.0
  tier: universal
  audience: advanced
---

# askit-build-hook

## Purpose
Author a plugin's hooks: event-driven enforcement or context injection (Standard sec 3.5). Hooks are an Advanced-tier capability. Two modes: `create` scaffolds a hook and its registration; `improve` raises an existing hook toward the bar (documentation, idempotency, actionable block messages). The hook SKILL is portable; what it authors is primarily a Claude capability (31 events) with a smaller Codex event set. Authoring depth is in [references/authoring-hooks.md](references/authoring-hooks.md). Follows the shared builder contract ([../../docs/reference/builder-pattern.md](../../docs/reference/builder-pattern.md)).

## When to use
When the user asks to add, scaffold, author, or improve a hook (a PreToolUse / PostToolUse / Stop / SessionStart guard, a context injector, or any event-driven automation) for a plugin.

## create mode
1. Brief interview: the event (for example PreToolUse), the trigger or matcher, the hook type (`command` / `http` / `mcp_tool` / `prompt` / `agent`), the scope (what it guards or injects), and the failure behavior (fail-safe block vs warn). Skip the interview if these are in context.
2. Author the hook and its registration. A plugin registers hooks in `hooks/hooks.json` using `${CLAUDE_PLUGIN_ROOT}`; copy `templates/hooks.json` if none exists. Document the event, trigger, scope, and failure behavior (Standard sec 3.5 MUST).
3. For a blocking hook (for example a PreToolUse deny), write an ACTIONABLE message that states what was blocked and how to proceed. Make the hook idempotent where the event can repeat.
4. Register the hook in `library.json` `components.hooks` as `{ name, version, tier, status }`.
5. Targets: Claude supports 31 events. Codex supports a smaller set (PreToolUse, PostToolUse, Pre/PostCompact, SessionStart, SubagentStart/Stop, UserPromptSubmit, Stop, PermissionRequest). Verify current Codex plugin-hook ingestion at build time (a known caveat) and scope `agent-targets` accordingly.
6. Assess with `node scripts/evaluate.mjs . --json`. Hook documentation and idempotency are graded at the Advanced tier; the deterministic hook check lands with Gold self-hosting (Phase 5).

## improve mode
1. Run `node scripts/evaluate.mjs . --json` and read the report.
2. Fix what it flags. For hooks specifically, confirm the event / trigger / scope / failure are documented (sec 3.5), the block message is actionable, and the hook is idempotent.
3. Re-run to confirm.

## Scope
Hooks are Advanced-tier and the most agent-specific component: Claude's event set is the richest, Codex covers a subset, and the wider ecosystem does not support hooks. A hook MUST document its event, trigger, scope, and failure behavior, and a blocking hook MUST emit an actionable message (Standard sec 3.5). Least privilege applies (sec 9): a hook's command runs with the narrowest scope needed.
