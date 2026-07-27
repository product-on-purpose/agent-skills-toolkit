#!/usr/bin/env node
// what-it-is:   ANTI-EXAMPLE - a PreToolUse hook that exits 2 while printing a JSON deny payload
// what-it-does: [WRONG] prints a deny permissionDecision to stdout, then exits 2; the runtime
//               discards all of stdout on exit 2 and uses stderr as the error message instead, so
//               the permissionDecisionReason is silently lost and the model receives no guidance.
// why:          this is the exit-code trap in authoring-hooks.md: JSON is only read on exit 0.
//               This file is a runnable artifact of that mistake; do NOT register or copy it.
// used-by:      skills/askit-build-hook/examples/ (anti-example only - not for production use).

// [WRONG] The JSON deny payload below is carefully written but will never reach the runtime,
// because process.exit(2) causes the runtime to discard all of stdout. The model receives
// a block with no permissionDecisionReason - an empty error with no guidance on how to proceed.

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

// Nothing on stderr, so the runtime surfaces a blank error message to the model.
process.exit(2); // BUG: discards the JSON above; the permissionDecisionReason is lost
