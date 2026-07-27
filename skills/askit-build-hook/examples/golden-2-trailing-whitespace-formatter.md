# Golden example: trailing-whitespace formatter

**Demonstrates:** a PostToolUse hook that normalizes trailing whitespace in written files using the `additionalContext` channel, with convergence proven by a second no-op run.
**Provenance:** authored by `askit-build-hook` create mode on 2026-07-26 during the SP2b metered authoring pass; raw run artifact under the gitignored `_local/audit/eval-runs/2026-07-26/`.

## Input

User request: "After any Write or Edit, strip trailing whitespace from each line of the written file and make sure there is exactly one trailing newline."

Create-mode interview answers:

| Field | Answer |
|---|---|
| Event | `PostToolUse` |
| Matcher | `Write\|Edit` |
| Type | `command` |
| Scope | the file at `tool_input.file_path`; text-only (skips binary files); reads and rewrites the file if content changed |
| Failure behavior | silently allows on any error (unreadable file, binary file, missing path); never blocks |

## Output

Registration entry for `hooks/hooks.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/trailing-whitespace-formatter.mjs\""
          }
        ]
      }
    ]
  }
}
```

Sibling script: `golden-2-trailing-whitespace-formatter.mjs`

- **Event:** `PostToolUse` - fires after the write has landed; the formatter reacts to a completed action rather than preventing one.
- **Trigger:** `Write|Edit` - the two text-file-writing tools.
- **Scope:** the file named in `tool_input.file_path`; strips trailing whitespace per line and ensures one trailing newline.
- **Failure behavior:** allows on all error paths (missing file, binary file, unreadable file, malformed payload); emits `additionalContext` only when a change was made.

**JSON shape note - nesting is per-event, not uniform.** The `additionalContext` field for `PostToolUse` and `Stop` goes INSIDE `hookSpecificOutput`, not at the top level. A hook that writes `{ "additionalContext": "..." }` at the top level for these events produces JSON the runtime does not recognize, and the output is silently discarded. The correct shape for this hook is `{ "hookSpecificOutput": { "hookEventName": "PostToolUse", "additionalContext": "..." } }`. This asymmetry is the easiest way to write a hook that appears to work (exits 0, no crash, correct JSON syntax) but does nothing: `PreToolUse` puts `permissionDecision` under `hookSpecificOutput`; `PostToolUse` and `Stop` put a blocking `decision` + `reason` at the top level, and their guidance channel (`additionalContext`) under `hookSpecificOutput`. If this isn't obvious, the anti-example at `skills/askit-build-hook/examples/anti-wrong-exit-code.md` covers the exit-code trap; the same "structurally valid JSON that does nothing" failure mode applies here for the wrong nesting.

## Why this is golden

- **Decision 1 (PostToolUse, not PreToolUse):** the formatter reacts to a completed write; a PreToolUse hook that tried to pre-normalize the content would need to parse and rewrite the `content` field, which is fragile. PostToolUse reads the file from disk after it has already landed. (authoring-hooks.md Decision 1)
- **Decision 3 (warn, not deny):** trailing whitespace is a preference, not an objective rule. A formatter that denies the write and demands clean input is a false deny waiting to happen. Instead the hook silently fixes and optionally reports via `additionalContext`. (authoring-hooks.md Decision 3; the deny-vs-warn table)
- **Convergence:** the `normalize` function satisfies `normalize(normalize(x)) === normalize(x)`. The second run in Verification confirms this: the hook produces no output and makes no change. (authoring-hooks.md "Idempotency is a MUST where the event repeats")
- **Binary-file guard:** a null byte in the file content causes an early return with no modification. Reformatting binary files would corrupt them; narrowing to text only is least privilege. (Standard sec 9)
- **All error paths exit 0:** every catch block and early return exits 0 without writing output. A hook crash must never wedge the session. (Standard sec 9; authoring-hooks.md "The failure direction")

## Verification

Commands run from the worktree root. The test file was created in the session scratchpad at the path shown.

**Create a test file with trailing whitespace on each line and extra blank lines at the end:**
```
$ printf "hello   \nworld  \n\n\n" > /path/to/test-whitespace.txt
$ cat -A /path/to/test-whitespace.txt
hello   $
world  $
$
$
```
(`$` in `cat -A` marks end-of-line; the trailing spaces before `$` are visible.)

**First run - file is normalized, additionalContext is returned (nested under hookSpecificOutput):**
```
$ echo '{"tool_name":"Write","tool_input":{"file_path":"C:/path/to/test-whitespace.txt","content":"..."}}' | node skills/askit-build-hook/examples/golden-2-trailing-whitespace-formatter.mjs; echo "exit: $?"
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"Normalized trailing whitespace in C:/path/to/test-whitespace.txt."}}exit: 0
```

**File content after first run:**
```
$ cat -A /path/to/test-whitespace.txt
hello$
world$
```
No trailing spaces; exactly one trailing newline (confirmed by `node -e` below).

**Node.js content check:**
```
$ node -e "const c=require('fs').readFileSync('/path/to/test-whitespace.txt','utf8'); console.log(JSON.stringify(c));"
"hello\nworld\n"
```

**Second run - file already normalized, no output (true no-op):**
```
$ echo '{"tool_name":"Write","tool_input":{"file_path":"/path/to/test-whitespace.txt","content":"..."}}' | node skills/askit-build-hook/examples/golden-2-trailing-whitespace-formatter.mjs; echo "exit: $?"
exit: 0
```

No stdout. Exit 0. The file is unchanged.
