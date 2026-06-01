# Authoring a hook (reference)

The bar for a conformant hook (Standard sec 3.5, Advanced tier).

## Document four things (MUST)

Every hook documents its:
- **event** - which lifecycle/tool event fires it (for example PreToolUse, PostToolUse, SessionStart, Stop).
- **trigger** - the matcher/condition that narrows when it actually runs (for example tool name `Write|Edit`).
- **scope** - what it guards, blocks, or injects, and over what surface.
- **failure behavior** - what happens when it fails or denies: fail-safe (block) vs fail-open (warn), and why.

## Blocking hooks emit an actionable message (MUST)

A hook that denies an action (for example PreToolUse deny) MUST tell the user what was blocked and how to proceed. A bare "blocked" is not actionable.

## Idempotency (MUST where the event repeats)

If the event can fire repeatedly (most tool-loop events), the hook MUST be safe to run many times with the same effect.

## Registration

- Claude: register in `hooks/hooks.json` (using `${CLAUDE_PLUGIN_ROOT}`), `settings.json`, or component frontmatter. 31 events; types `command` / `http` / `mcp_tool` / `prompt` / `agent`.
- Codex: a smaller event set (PreToolUse, PostToolUse, Pre/PostCompact, SessionStart, SubagentStart/Stop, UserPromptSubmit, Stop, PermissionRequest). Verify current Codex plugin-hook ingestion at build time; declare `agent-targets` to match what actually works.

## Least privilege (sec 9)

A hook's command runs with the narrowest scope and permissions needed. Never embed secrets; reference them from the environment.

## Worked example: the no-dashes guard

The toolkit's own house-style rule (no em-dashes / en-dashes) is a textbook PreToolUse `command` hook: event PreToolUse, trigger Write/Edit, scope the `content`/`new_string` being written, failure behavior fail-safe block with an actionable substitution message. It is idempotent (re-checking the same text is identical). This is the H1 candidate for the toolkit's own Gold G1 hooks.
