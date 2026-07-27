# Golden example: model + context budget + cwd statusline

**Demonstrates:** authoring a statusline script that reads three session JSON fields (model, context budget, working directory), composes them into a single short line, degrades gracefully when fields are absent, and registers via `${CLAUDE_PLUGIN_ROOT}` - satisfying the full contract the recipe specifies.
**Provenance:** authored by `askit-build-statusline` create mode on 2026-07-26 during the SP2b metered authoring pass; raw run artifact under the gitignored `_local/audit/eval-runs/2026-07-26/`.

## Input

User asked: "Create a statusline for my plugin that shows the active model, how much context is left as a percentage, and the current project directory."

| Field | Value |
|---|---|
| What to display | Model name, context budget percentage used, working directory basename |
| Performance constraint | Fast: read stdin, no network calls, no slow subshells, exit promptly |
| Plugin root variable | `${CLAUDE_PLUGIN_ROOT}` |
| Target | Claude Code only (Codex has no script-based statusline - F-06 asymmetry, sec 2.3) |
| Graceful degradation | Show what is available; never crash or block the session |

---

## Output

### `statusline/line.mjs`

```javascript
#!/usr/bin/env node
// what-it-is:   statusline script for a Claude Code plugin
// what-it-does: reads the session JSON on stdin; prints one line:
//               "<model> | <ctx%> ctx | <dir>"  (omits any field not present in the JSON)
// why:          fast audit of session state at a glance - model, budget, and project
//
// Performance contract (statusline-recipe.md):
//   - Reads stdin once; no network calls; no slow subshells.
//   - Uses only Node built-ins (node:path).
//   - Exits promptly; any uncaught error falls through to the catch at the bottom.

import { basename } from "node:path";

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  // Parse the session JSON; degrade gracefully on malformed input.
  let session = {};
  try {
    session = JSON.parse(await readStdin());
  } catch {
    // Malformed stdin: degrade to a minimal line rather than crash.
    process.stdout.write("claude\n");
    return;
  }

  // Field: model name.
  const model = typeof session.model === "string" ? session.model : "";

  // Field: context budget percentage. session.context.used / session.context.budget.
  const ctx = (session.context && typeof session.context === "object") ? session.context : {};
  const pct =
    typeof ctx.budget === "number" && ctx.budget > 0 && typeof ctx.used === "number"
      ? Math.round((ctx.used / ctx.budget) * 100) + "% ctx"
      : "";

  // Field: working directory basename (node:path built-in; no subshell).
  const dir =
    typeof session.cwd === "string" && session.cwd.length > 0
      ? basename(session.cwd)
      : "";

  // Compose: omit any field that resolved to an empty string.
  const parts = [model, pct, dir].filter(Boolean);

  // Output: exactly one line. Fall back to "claude" if all fields are absent.
  process.stdout.write((parts.length > 0 ? parts.join(" | ") : "claude") + "\n");
}

// A hook crash must never block the session (statusline-recipe.md).
main().catch(() => {
  process.stdout.write("claude\n");
  process.exit(0);
});
```

### `settings.json` registration entry

Add this under the top-level `statusLine` key in the plugin's `settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "${CLAUDE_PLUGIN_ROOT}/statusline/line.mjs"
  }
}
```

`${CLAUDE_PLUGIN_ROOT}` resolves to the plugin root wherever the plugin is installed - the recipe's required pattern.

---

## Why this is golden

- **Full contract demonstrated (statusline-recipe.md):** The script satisfies every clause the recipe states: reads all of stdin once; parses JSON; ignores fields it does not use; prints exactly one line; exits promptly. The `main().catch()` wrapper ensures a crash cannot wedge the session - the recipe's safety requirement.
- **Performance constraint explicit and met (statusline-recipe.md):** The comment block at the top of the script states the contract. `node:path`'s `basename` is a pure string function; no subshell, no filesystem call, no network. The script exits after a single stdin read.
- **F-06 asymmetry acknowledged (Standard sec 2.3):** The interview table declares "Claude Code only." The Codex equivalent (`config.toml tui.status_line`) is a built-in picker, not a script, so there is no Codex artifact to generate. Silence on Codex is correct and not a conformance gap.
- **Graceful degradation for every field:** Each field guard (`typeof session.model === "string"`, `ctx.budget > 0 && typeof ctx.used === "number"`, `session.cwd.length > 0`) handles a missing or malformed field independently. The `.filter(Boolean)` step omits absent fields so the output line stays clean regardless of which fields the running Claude Code version provides.
- **`${CLAUDE_PLUGIN_ROOT}` registration (statusline-recipe.md):** The settings entry uses the canonical variable so the path resolves correctly after install rather than hard-coding an absolute path.

## Verification

### No external calls (by inspection)

The script uses only:
- `process.stdin` (standard Node stream)
- `JSON.parse` (built-in)
- `node:path` built-in (`basename`)
- `process.stdout.write` (standard Node stream)
- `process.exit` (standard Node)

No `import` of `node:net`, `node:http`, `node:https`, `fetch`, `exec`, or `spawn`. The performance constraint is satisfied structurally, not just by assertion.

### Link verification

No relative markdown links written in this file. Reference doc paths are cited as inline code (`skills/askit-build-statusline/references/statusline-recipe.md`, `Standard sec 2.3`, `Standard sec 9`).
