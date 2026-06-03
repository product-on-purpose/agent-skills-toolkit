---
title: Hooks
---

# Hooks

The toolkit's event-driven hooks. The toolkit ships one demonstrative hook so its own Gold `G1` (hook-documentation) check grades a real artifact instead of passing vacuously, and so the `askit-build-hook` skill has a worked example to point at. See Standard sec 3.5 for the hook component contract.

## Inventory

- `hooks.json` - the hook registration (event, matcher, action).
- `no-dashes.mjs` - the PreToolUse guard script.

## The no-dash guard (PreToolUse)

- **Event:** `PreToolUse` - fires immediately before a tool call runs, so the hook can deny the call before any write lands.
- **Trigger / matcher:** `Write|Edit|NotebookEdit` - only the file-writing tools; the matcher is the regular expression `G1` requires a tool-matched event to document.
- **Scope:** the tool payload's `new_string` (Edit), `content` (Write), and `new_source` (NotebookEdit). Nothing else is read.
- **Action:** `command` - runs `node "${CLAUDE_PLUGIN_ROOT}/hooks/no-dashes.mjs"`, which reads the tool call as JSON on stdin.
- **Failure behavior:** if the payload contains an em-dash (U+2014) or en-dash (U+2013), the hook emits a `PreToolUse` deny decision with an actionable message (replace with ' - ' or restructure with a comma, colon, or sentence break). Otherwise it allows the call. A malformed or unreadable payload is allowed rather than blocked, so a hook bug never wedges the session. The decision is idempotent: the same input always yields the same result.

This enforces the Standard's house no-dash rule (`U10`) at author-time, the moment of the write, rather than only catching it in the at-rest file scan. The script writes the banned characters as character codes so it stays `U10`-clean itself.

> The hook is active for any session where the toolkit is installed as a plugin. To adopt the rule selectively, copy the pattern into your own plugin with `askit-build-hook`; to turn it off, disable the toolkit's hooks in your settings.
