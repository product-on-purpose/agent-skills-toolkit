# Golden example: generated-file guard

**Demonstrates:** a PreToolUse hook that denies writes to generator-managed files using the exit-0-plus-JSON channel with a three-part actionable message.
**Provenance:** authored by `askit-build-hook` create mode on 2026-07-26 during the SP2b metered authoring pass; raw run artifact under the gitignored `_local/audit/eval-runs/2026-07-26/`.

## Input

User request: "Add a hook that blocks anyone from hand-editing `.claude-plugin/`, `.codex-plugin/`, or `INDEX.md` - those are generator output and editing them is a G4 error."

Create-mode interview answers:

| Field | Answer |
|---|---|
| Event | `PreToolUse` |
| Matcher | `Write\|Edit\|NotebookEdit` |
| Type | `command` |
| Scope | `tool_input.file_path` and `tool_input.notebook_path`; denies when the path is under `.claude-plugin/` or `.codex-plugin/`, or has basename `INDEX.md` |
| Failure behavior | Deny on match, exit 0; allow on malformed payload so a hook bug cannot wedge the session |

## Output

Registration entry for `hooks/hooks.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit|NotebookEdit",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/generated-file-guard.mjs\""
          }
        ]
      }
    ]
  }
}
```

Sibling script: `golden-1-generated-file-guard.mjs`

- **Event:** `PreToolUse` - fires before the tool call so the write is prevented, not rolled back.
- **Trigger:** `Write|Edit|NotebookEdit` - the three file-writing tools.
- **Scope:** the target file path in `tool_input.file_path` (Write, Edit) and `tool_input.notebook_path` (NotebookEdit).
- **Failure behavior:** denies with an actionable message on a generated-file path; allows on a malformed payload (fail-safe); allows on any other path.

## Why this is golden

- **Decision 1 (earliest useful event):** `PreToolUse` is the only event that can prevent the write from landing. A `PostToolUse` guard on the same action would complain after the damage is done. (authoring-hooks.md Decision 1)
- **Decision 2 (exit-0-plus-JSON, not exit 2):** the deny payload carries `permissionDecisionReason` with the three-part message; exit 2 would discard it. The model needs the reason to know how to proceed, so the structured channel is the right one. (authoring-hooks.md Decision 2)
- **Actionable three-part message:** what was blocked (the specific file path), why (G4 error, generator will overwrite), how to proceed (the exact generator command). Satisfies sec 3.5 MUST. (authoring-hooks.md "The actionable message is a MUST")
- **Fail-safe on parse error:** a malformed payload exits 0 without blocking. A hook bug must never wedge the session. (Standard sec 9; authoring-hooks.md "The failure direction")
- **Idempotent:** the decision depends only on the path in the payload; the hook writes nothing and holds no state. Same input always yields the same result. (authoring-hooks.md "Idempotency is a MUST where the event repeats")

## Verification

Commands run from the worktree root:

**Deny case - target under `.claude-plugin/`:**
```
$ echo '{"tool_name":"Write","tool_input":{"file_path":".claude-plugin/plugin.json","content":"{}"}}' | node skills/askit-build-hook/examples/golden-1-generated-file-guard.mjs; echo "exit: $?"
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Blocked: '.claude-plugin/plugin.json' is inside .claude-plugin, which is generator output. Hand-editing generator-managed files is a G4 error: the next generate run will overwrite your changes silently. To update, edit the source and regenerate: node scripts/generators/gen-manifest.mjs ."}}exit: 0
```

**Deny case - `INDEX.md` by basename:**
```
$ echo '{"tool_name":"Write","tool_input":{"file_path":"some/path/INDEX.md","content":"# Index\n"}}' | node skills/askit-build-hook/examples/golden-1-generated-file-guard.mjs; echo "exit: $?"
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Blocked: 'some/path/INDEX.md' is inside INDEX.md, which is generator output. Hand-editing generator-managed files is a G4 error: the next generate run will overwrite your changes silently. To update, edit the source and regenerate: node scripts/generators/gen-index.mjs ."}}exit: 0
```

**Allow case - a normal source file:**
```
$ echo '{"tool_name":"Edit","tool_input":{"file_path":"skills/askit-build-hook/SKILL.md","old_string":"foo","new_string":"bar"}}' | node skills/askit-build-hook/examples/golden-1-generated-file-guard.mjs; echo "exit: $?"
exit: 0
```

**Allow case - malformed payload (fail-safe):**
```
$ echo 'not valid json' | node skills/askit-build-hook/examples/golden-1-generated-file-guard.mjs; echo "exit: $?"
exit: 0
```
