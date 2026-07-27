# Golden example: Stop uncommitted-changes notifier

**Demonstrates:** a Stop hook that emits `additionalContext` guidance without blocking, illustrating the warn side of the deny-vs-warn decision and the correct use of the Stop event.
**Provenance:** authored by `askit-build-hook` create mode on 2026-07-26 during the SP2b metered authoring pass; raw run artifact under the gitignored `_local/audit/eval-runs/2026-07-26/`.

## Input

User request: "At the end of each turn, if there are uncommitted changes under `skills/` or `scripts/`, remind the agent to run the conformance gate. It should never block."

Create-mode interview answers:

| Field | Answer |
|---|---|
| Event | `Stop` |
| Matcher | none - Stop does not scope to a tool name; a matcher here is ignored by the runtime and is misleading |
| Type | `command` |
| Scope | runs `git status --porcelain -- skills/ scripts/` to detect uncommitted changes |
| Failure behavior | never blocks; git failure or unavailability exits 0 silently; `additionalContext` only when changes are present |

## Output

Registration entry for `hooks/hooks.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/uncommitted-changes-notifier.mjs\""
          }
        ]
      }
    ]
  }
}
```

Note: no `matcher` field. The `G1` check requires a matcher only on `PreToolUse` and `PostToolUse`; writing one on `Stop` would mislead a reader into thinking the hook is scoped when it is not.

Sibling script: `golden-3-stop-uncommitted-notifier.mjs`

- **Event:** `Stop` - fires at the end of each turn, after all tool calls have completed.
- **Trigger:** every Stop event (no tool matcher; the hook runs unconditionally on the Stop).
- **Scope:** `git status --porcelain` limited to `skills/` and `scripts/` paths.
- **Failure behavior:** emits `additionalContext` when uncommitted changes are found; exits 0 and produces no output when the tree is clean or git is unavailable.

## Why this is golden

- **Decision 1 (Stop, not PostToolUse):** the nudge is an end-of-turn reflection, not a reaction to a specific tool call. PostToolUse fires on every matching write; Stop fires once per turn. Nudging once at the end is lower noise and more accurate (changes from any tool call in the turn are visible). (authoring-hooks.md Decision 1)
- **Decision 3 (warn, not deny):** whether to run the gate is contextual. The author may be mid-work, or the changes may be intentional WIP. A deny at Stop would cost the user their turn for a judgment call that only they can make. `additionalContext` is the correct channel for guidance that should not block. (authoring-hooks.md Decision 3; the deny-vs-warn table)
- **No matcher on Stop:** the `G1` requirement limits mandatory matchers to `PreToolUse` and `PostToolUse`. Writing a matcher on Stop does not scope the hook; it only deceives a reader. The entry above has no `matcher` field. (authoring-hooks.md "G1 consequence"; hook-documentation.mjs `MATCHER_EVENTS`)
- **Portability:** Stop is in the Codex event subset as well as the Claude 31-event set, so `agent-targets` can include both. (authoring-hooks.md Decision 1 portability note)
- **All error paths exit 0:** git failure, timeout, and the case where no changes are found all exit 0 with no output. The hook never blocks the turn. (Standard sec 9)

## Verification

Commands run from the worktree root. The worktree had multiple untracked `examples/` directories under `skills/` at verification time (parallel agents adding examples for all builder skills). Partial listing shown for brevity.

**Check git status before running the hook (partial listing):**
```
$ git status --porcelain -- skills/ scripts/ | head -5
 M skills/askit-build-hook/README.md
 M skills/askit-build-hook/references/authoring-hooks.md
?? skills/askit-build-hook/examples/
?? skills/askit-build-mcp/examples/
?? skills/askit-build-samples/examples/
```

**Run the Stop hook with a minimal payload:**
```
$ echo '{}' | node skills/askit-build-hook/examples/golden-3-stop-uncommitted-notifier.mjs; echo "exit: $?"
{"hookSpecificOutput":{"hookEventName":"Stop","additionalContext":"29 uncommitted changes detected under skills/ or scripts/. Run 'node scripts/check.mjs .' before closing the session to confirm conformance."}}exit: 0
```

The hook counted the changed paths, emitted `additionalContext` nested under `hookSpecificOutput`, and exited 0. It did not block. The count varies with the worktree state; the shape is what matters: `additionalContext` for `Stop` is always nested under `hookSpecificOutput`, not at the top level.

**Clean-tree behavior (when git status returns empty):** the hook exits 0 with no stdout. No output is ever emitted when the tree is clean.
