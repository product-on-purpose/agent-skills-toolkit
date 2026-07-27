# Anti-example: wrong exit code discards the JSON payload

**Demonstrates the mistake:** a PreToolUse hook that prints a complete JSON deny payload to stdout and then exits 2, causing the runtime to discard the JSON entirely and surface an empty error to the model.
**Provenance:** authored by `askit-build-hook` create mode on 2026-07-26 during the SP2b metered authoring pass; raw run artifact under the gitignored `_local/audit/eval-runs/2026-07-26/`.

## Input

User request: "Block writes to read-only files with a helpful message." The author writes a hook that prints a deny JSON payload, then calls `process.exit(2)` thinking that the exit code enforces the block while the JSON carries the reason.

## The wrong output

**STOP - the script below is WRONG and must not be copied or registered.**

The script at `anti-wrong-exit-code.mjs` is the broken artifact. It prints:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Blocked: target is read-only. Use the approved write path instead."
  }
}
```

and then calls `process.exit(2)`.

The registration that a misled author might write:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/anti-guard.mjs\""
          }
        ]
      }
    ]
  }
}
```

This is structurally valid JSON. `G1` accepts it. The hook will block the tool call. But the model receives no reason and cannot recover without guessing.

## Why it is wrong

**Trap 1: exit 2 discards stdout entirely.**

The runtime's rule is:
- Exit 0: stdout is parsed for JSON control fields.
- Exit 2: stdout and any JSON are discarded; stderr is fed to the model as the error message.
- Any other non-zero: non-blocking for most events; stderr is surfaced and execution continues.

When the script exits 2, the runtime throws away the entire JSON payload on stdout. The `permissionDecisionReason` is silently lost. Because nothing was written to stderr either, the model receives a block with a blank error message - no guidance on what to do next. The model will retry blindly.

**Trap 2: intending to block but exiting 1.**

A second version of the same mistake exits 1 instead:

```javascript
process.exit(1); // BUG: non-blocking for PreToolUse; the tool call proceeds
```

Exit 1 is not in the "blocking" category. For `PreToolUse`, the blocking exit codes are 0 (with a deny decision in JSON) and 2. Exit 1 is a non-blocking error for most events, so the tool call proceeds as though the hook were not there. The author intended a block; the runtime delivers a pass-through.

**Neither mistake is caught by the gate.** `G1` validates the registration's shape (type field, matcher on tool-matched events, non-empty hooks array). It never executes the script and cannot know whether the exit code matches the intended behavior. The author must verify this by hand.

## What the builder does instead

The corrected hook exits 0 and places the deny decision in JSON on stdout:

```javascript
// CORRECT: exits 0; runtime reads the JSON and enforces the deny with the reason intact
process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason:
        "Blocked: target is read-only. Use the approved write path instead.",
    },
  })
);
process.exit(0); // exit 0 so the runtime reads stdout
```

If a one-line message is truly sufficient and no structured fields are needed, exit 2 with the message on stderr is also valid:

```javascript
// ALSO CORRECT: exit 2; stderr becomes the error message; no JSON needed
process.stderr.write("Blocked: target is read-only. Use the approved write path instead.\n");
process.exit(2);
```

The rule is: **pick one channel per hook**. JSON lives on exit 0. A plain error message lives on exit 2 via stderr. Mixing them - JSON on stdout with exit 2 - silently throws the JSON away.

## How to detect it

The deterministic gate (`G1`) does not catch this. It validates structure, not runtime behavior.

To detect it, run the script directly and inspect the exit code and the stdout/stderr split:

```
$ echo '{}' | node hooks/my-guard.mjs > /tmp/stdout.txt 2>/tmp/stderr.txt
$ echo "exit: $?"
$ echo "stdout: $(cat /tmp/stdout.txt)"
$ echo "stderr: $(cat /tmp/stderr.txt)"
```

If the exit code is 2 and stdout contains JSON, the payload is discarded. If the exit code is 1 and you intended a block, the action will proceed.

The anti-example at `anti-wrong-exit-code.mjs` is a runnable reproduction of Trap 1. Run it and verify:

```
$ echo '{}' | node skills/askit-build-hook/examples/anti-wrong-exit-code.mjs > /tmp/stdout.txt 2>/tmp/stderr.txt; CODE=$?; echo "stdout: $(cat /tmp/stdout.txt)"; echo "stderr: $(cat /tmp/stderr.txt)"; echo "exit: $CODE"
stdout: {"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Blocked: target is read-only. Use the approved write path instead."}}
stderr: 
exit: 2
```

The JSON is present on stdout and completely correct. The exit code is 2. The runtime discards stdout, reads stderr (empty), and surfaces a blank error to the model. The `permissionDecisionReason` never arrives.
