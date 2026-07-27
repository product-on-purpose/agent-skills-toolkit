# Authoring a hook (reference)

Choosing the event, choosing the channel the hook answers on, and choosing whether it denies or warns.
The contract is [STANDARD.md](../../../STANDARD.md) sec 3.5 (hook) and sec 9 (least privilege, fail
safe); the procedure is in [the skill itself](../SKILL.md).

A hook is the sharpest component type in the Standard. It runs on someone else's session, on every
matching event, without being asked, and a bad one is felt as the agent being broken rather than as a
plugin misbehaving. Three decisions carry almost all of the risk: which event, which output channel,
and deny versus warn.

## Decision 1: the event

Pick the **earliest event that can still see what you need**. A PostToolUse guard on a write is a hook
that complains after the file is on disk.

| You want to | Event | Note |
|---|---|---|
| Stop a bad action before it happens | `PreToolUse` | the only event that can prevent a tool call |
| React to a completed action (format, lint, index, redact) | `PostToolUse` | can also feed context back with `additionalContext` |
| Inject standing context at the start of work | `SessionStart` | matcher `compact` re-injects after compaction, which is where context is silently lost |
| Vet or enrich what the user just typed | `UserPromptSubmit` | can block the prompt or add context |
| Nudge before the turn ends | `Stop` | `additionalContext` reads as guidance, not as an error |

**Portability is decided here, not at registration.** Claude has 31 events; Codex ingests a smaller
set (PreToolUse, PostToolUse, Pre/PostCompact, SessionStart, SubagentStart/Stop, UserPromptSubmit,
Stop, PermissionRequest). Choosing an event outside that intersection narrows `agent-targets` to
`[claude]`, and that is a decision to make deliberately at event-selection time rather than discover
at emission time. Codex plugin-hook ingestion is a known moving target: verify it against the current
CLI when you build, and declare what actually works.

**`G1` consequence.** [hook-documentation.mjs](../../../scripts/checks/hook-documentation.mjs) requires
a non-empty `matcher` on exactly the two tool-matched events, `PreToolUse` and `PostToolUse`. On other
events a matcher is ignored by the runtime, so writing one there is misleading rather than harmless:
a reader will believe the hook is scoped when it is not.

## Decision 2: the output channel (exit codes versus JSON)

The runtime gives a `command` hook two ways to answer, and **you must pick one per hook**. Mixing them
is the most common way a hook silently does nothing.

| Exit code | What the runtime does |
|---|---|
| `0` | success. stdout is parsed for JSON control fields. This is the structured channel. |
| `2` | blocking error. stdout and **any JSON are ignored**; stderr is fed back to the model as the error. `PreToolUse` blocks the tool call, `UserPromptSubmit` rejects the prompt. |
| any other non-zero | non-blocking error for most events. stderr is surfaced in the transcript and execution continues. |

The trap is the middle row: **JSON is only read on exit 0**. A hook that prints a careful deny payload
and then exits 2 has thrown the payload away and blocked with whatever happened to be on stderr.

### Which channel to choose

- **Exit 2** when the refusal is one line, the message IS the whole story, and you want the model to
  read it as an error and adjust. Cheapest thing that works.
- **Exit 0 plus JSON** when you need a decision the exit code cannot express: an explicit
  `permissionDecision` of `allow`, `deny`, or `ask`; an `updatedInput` that rewrites the tool call
  rather than rejecting it; or `additionalContext` that should reach the model as guidance rather than
  as a failure.

The worked case is this repo's own hook, [hooks/no-dashes.mjs](../../../hooks/no-dashes.mjs). It always
exits 0 and emits:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Blocked: this tool call would write em-dash (U+2014) to disk. Replace with an ASCII hyphen with spaces (' - ') or restructure with a comma, colon, or sentence break (the Standard's U10 no-dash rule)."
  }
}
```

It chose JSON for two reasons worth copying. The deny carries a remediation sentence, and a
`permissionDecisionReason` is the field built to hold one; and exit 2 would have made a house style
rule read as a crash in the transcript, which is the wrong signal for a preference the user opted
into.

### The failure direction, which is the opposite of what "fail safe" sounds like

The same file returns 0 (allow) on a payload it cannot parse, and its top-level handler exits 0 on a
thrown error, with the comment "a hook crash must never wedge the session".

Section 9 says a hook that can block MUST fail safe. That means the **deny path is deliberate and
messaged** - not that every error blocks. A hook that denies when its own parser breaks takes the
user's session down with it, and the user has no way to tell your bug from their mistake. State the
crash behavior explicitly in the hook's documentation so a reviewer can check it, because no check
can.

## Decision 3: deny or warn

| Deny when all of these hold | Warn, inject, or say nothing when any of these hold |
|---|---|
| the action is objectively wrong by a rule the user opted into | the judgment is contextual |
| the check is cheap and deterministic | the check can be wrong on legitimate input |
| a false deny costs one edit to work around | a false deny costs the user their next twenty minutes |
| you can state exactly how to proceed | the remediation is a preference, not a correction |

The precedent worth learning from is in this repo's own history. ADR 0028
([retire U10 from the spine](../../../docs/internal/decisions/0028-retire-u10-no-dashes-from-the-spine.md))
removed the no-dashes rule from the conformance Standard because house style is not a portability
requirement - a plugin should not fail someone else's build over a typographic preference. The same
rule survives, unchanged, as an opt-in hook in this plugin.

That is the generalizable move: **a rule that should not fail someone else's build can still be a hook
in your own plugin.** Choosing "hook, not check" is the polite form of a strong opinion, because a hook
is scoped to sessions where your plugin is installed and can be turned off. The inverse anti-pattern is
a hook that denies on taste and leaves the user no route forward.

## The actionable message is a MUST

A blocking hook MUST emit an actionable message (sec 3.5, sec 9). Three parts, all of them:

1. **What was blocked** - name the thing, not the category.
2. **Why** - the rule, in one clause.
3. **How to proceed** - the substitution or the next action, concretely enough to act on without
   asking.

Compare. Not actionable: `Blocked by policy.` Actionable: the `permissionDecisionReason` quoted above,
which names the character, cites the rule, and gives two specific replacements.

A deny message is read by a model that will immediately retry. If it does not contain the fix, the
retry is a guess, and you have built a loop.

## Idempotency is a MUST where the event repeats

Tool-loop events fire many times per turn. Two properties, and both are testable in one command:

- **Same input, same decision.** A hook that alternates, or that depends on a counter, is unusable.
- **Convergence for side effects.** A formatter must reach a fixed point; an appender must not append
  twice.

Run the hook twice on the identical payload and diff both the output and any files it touched. The
repo's guard is idempotent by construction: it reads the payload, tests for two characters, and writes
nothing.

## Registration and paths

`hooks/hooks.json` at the plugin root, event to array of entries, each entry a `matcher` plus a
`hooks` array of actions:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit|NotebookEdit",
        "hooks": [
          { "type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/my-guard.mjs\"" }
        ]
      }
    ]
  }
}
```

- Use `${CLAUDE_PLUGIN_ROOT}` for the script path, and **quote it**. The install directory can contain
  spaces; the repo's own registration quotes it for exactly that reason.
- `G1` requires every action to carry a `type` from `command`, `http`, `mcp_tool`, `prompt`, `agent`,
  and treats an entry with no actions, or a bare non-object entry, as an error.
- Declare the hook in `library.json` `components.hooks` as `{ name, version, tier, status }`.
- Claude also supports registration in `settings.json` and in component frontmatter; a **plugin**
  should use `hooks/hooks.json` so the hook travels with the install.

**The same nonexistent-target trap MCP has.** [templates/hooks.json](../../../templates/hooks.json)
points at `hooks/example-guard.mjs`, which does not exist. It is a scaffold placeholder you MUST
replace, and nothing in the gate will tell you: `G1` validates the registration's shape, never that the
command resolves. Run the command yourself before you call the hook done.

## Least privilege (sec 9)

- **Narrow the matcher.** `Write|Edit` is a scope; `.*` is a promise to run on everything forever.
- **Narrow what you read.** The repo's guard reads exactly three payload fields (`new_string`,
  `content`, `new_source`) and nothing else, and its documentation says so, which is what lets a
  reviewer verify the claim.
- **No secrets in the hook or its registration.** Environment indirection only.
- **Be fast.** A tool-loop hook is on the critical path of every matching call. No network, no slow
  shells.

## Document the four facts, where a reader will find them

Every hook MUST document its **event**, **trigger**, **scope**, and **failure behavior** (sec 3.5).
The place for that is the plugin's `hooks/README.md`, beside the registration, not buried in the
script. This repo's [hooks/README.md](../../../hooks/README.md) is the worked example: five labelled
lines covering event, matcher, scope, action, and failure behavior, in that order, plus the reason the
hook exists at all.

Add the crash behavior to the failure line. "Denies on X with message Y; allows on a malformed payload
so a hook bug cannot wedge the session" is a complete failure statement. "Blocks bad writes" is not.

## Gold consequence

`G3` (library-regression) requires each registered hook **event** to carry at least one eval under
`evals/` declaring `"covers": { "hook": "<event>" }`. Adding a hook adds that obligation, so plan the
eval with the hook rather than discovering it at the Gold gate.

## Validate

    node scripts/evaluate.mjs . --json

Hook documentation is graded at the Advanced tier (`G1`), and `G1` grades the registration's structure
only. The four documented facts, the actionable message, idempotency, and the crash behavior are yours
to verify by hand and to state in the docs.

## See also

- [STANDARD.md](../../../STANDARD.md) - sec 3.5 (hook spec), sec 2.3 and 2.6 (Advanced tier and `G1`),
  sec 9 (least privilege and fail safe).
- [Gold checks](../../../docs/reference/gold-checks.md) - `G1` and the `G3` eval-set format.
- [hooks/README.md](../../../hooks/README.md) and
  [hooks/no-dashes.mjs](../../../hooks/no-dashes.mjs) - the worked hook, documented and implemented.
