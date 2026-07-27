# Golden example: complete evidence set for askit-build-statusline

**Demonstrates:** authoring a full evidence set (3 goldens + 1 anti-example under `examples/`, plus a 24-case triggering eval set under `evals/`) for the `askit-build-statusline` skill, including the drift rule.
**Provenance:** authored by `askit-build-samples` create mode on 2026-07-26 during the SP2b metered authoring pass; raw run artifact under the gitignored `_local/audit/eval-runs/2026-07-26/`.

## Input

User asked: "Build a complete evidence set for askit-build-statusline - golden examples, an anti-example, and the triggering eval set."

| Field | Value |
|---|---|
| Target skill | `askit-build-statusline` |
| Mode | create |
| Source for skill behavior | `skills/askit-build-statusline/SKILL.md` and `skills/askit-build-statusline/references/statusline-recipe.md` |
| Example threads (ADR 0021) | greenfield Bronze plugin adding a statusline; toolkit self-hosting (Gold) |
| Drift rule to encode | a script with a slow external call is an error (not merely stale), because the recipe's no-network-calls constraint is load-bearing; a sample that claims it works is worse than no sample |

---

## Output

These files live as fenced blocks because creating them for real would change `askit-build-statusline`'s graded component set (Standard sec 7.2). The paths shown are where they would be written.

---

### `skills/askit-build-statusline/examples/golden-1-model-line.md`

````markdown
# Sample: model-only statusline

**Input:** "I want a statusline that shows which Claude model is active."

**Output - `statusline/line.mjs`:**
```javascript
#!/usr/bin/env node
// what-it-is:   statusline script for a plugin
// what-it-does: reads the session JSON on stdin; prints the active model name on one line
// why:          lets the user see at a glance which model Claude Code is using

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  let session = {};
  try { session = JSON.parse(await readStdin()); } catch { /* degrade gracefully */ }
  const model = session.model ?? "claude";
  process.stdout.write(model + "\n");
}

main().catch(() => { process.stdout.write("claude\n"); process.exit(0); });
```

**Output - `settings.json` registration entry:**
```json
{
  "statusLine": {
    "type": "command",
    "command": "${CLAUDE_PLUGIN_ROOT}/statusline/line.mjs"
  }
}
```

**Why this works:** Reads `session.model` from the stdin JSON (Standard sec 2.3 contract). Falls back to `"claude"` when the field is absent. Prints exactly one line. No network calls, no subshells.

**Drift signal:** If `askit-build-statusline` changes the session JSON field from `model` to a different key, this golden is an error (not merely stale): it claims a field name that no longer works.
````

---

### `skills/askit-build-statusline/examples/golden-2-context-budget.md`

````markdown
# Sample: context budget statusline

**Input:** "Add a statusline that shows how much context budget remains as a percentage."

**Output - `statusline/line.mjs`:**
```javascript
#!/usr/bin/env node
// what-it-is:   statusline showing context budget consumption
// what-it-does: reads session.context.used / session.context.budget; prints "XX% ctx"
// why:          warns the user before a context window runs out

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  let session = {};
  try { session = JSON.parse(await readStdin()); } catch { /* degrade gracefully */ }
  const ctx = session.context ?? {};
  const pct = (ctx.budget && ctx.used != null)
    ? Math.round((ctx.used / ctx.budget) * 100) + "% ctx"
    : "";
  process.stdout.write((pct || "ctx unknown") + "\n");
}

main().catch(() => { process.stdout.write("ctx unknown\n"); process.exit(0); });
```

**Why this works:** Uses `session.context.used` and `session.context.budget` from the session JSON. Degrades to `"ctx unknown"` when either field is absent. One line, fast, no external calls.

**Drift signal:** If the context sub-object shape changes (e.g., `session.tokenBudget.used` replacing `session.context.used`), this golden becomes an error - it tests a field path that no longer resolves.
````

---

### `skills/askit-build-statusline/examples/golden-3-cwd-model.md`

````markdown
# Sample: working directory and model statusline

**Input:** "Show both the current working directory basename and the model in the status bar."

**Output - `statusline/line.mjs`:**
```javascript
#!/usr/bin/env node
// what-it-is:   statusline combining cwd basename and active model
// what-it-does: reads session.cwd and session.model; prints "<dir> | <model>"
// why:          keeps project context and model visible together

import { basename } from "node:path";

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  let session = {};
  try { session = JSON.parse(await readStdin()); } catch { /* degrade gracefully */ }
  const dir = session.cwd ? basename(session.cwd) : "";
  const model = session.model ?? "claude";
  const parts = [dir, model].filter(Boolean);
  process.stdout.write(parts.join(" | ") + "\n");
}

main().catch(() => { process.stdout.write("claude\n"); process.exit(0); });
```

**Why this works:** `basename(session.cwd)` extracts the project name without a slow shell call. Falls back cleanly when either field is missing. `node:path` is a built-in; no external dependencies needed.

**Drift signal:** If the session JSON key for the working directory changes from `cwd`, this golden's output is wrong - it silently shows an empty string rather than the project name.
````

---

### `skills/askit-build-statusline/examples/anti-1-network-call.md`

````markdown
# Anti-example: statusline that makes a network call

**Input:** "Create a statusline that fetches the latest deployment status from our API and shows it."

**Why this should NOT be built with askit-build-statusline as described:**
The recipe states plainly: "No network calls, no slow subshells; read-only and fast." (statusline-recipe.md). A statusline that fetches from a remote API violates the performance contract - Claude Code runs the script on a tight cadence, and a network-dependent call will block the UI, time out intermittently, and degrade the session.

**What the user should do instead:**
- Run the deployment check as a separate command or hook, cache the result to a local file.
- Have the statusline read that cached local file (fast, read-only). `askit-build-statusline` (improve mode) can wire the fast read.
- If the check must be real-time, build it as a slash command with `askit-build-command`, not a statusline.

**Boundary:** `askit-build-statusline` produces single-line, fast, read-only scripts. Long-running checks belong in commands or hooks.
````

---

### `evals/build-statusline.eval.json`

```json
{
  "covers": { "skill": "askit-build-statusline" },
  "description": "Triggering eval set for askit-build-statusline.",
  "cases": [
    { "query": "Create a status line that shows the current model", "should_trigger": true },
    { "query": "Add a statusline to my plugin", "should_trigger": true },
    { "query": "I want a custom status bar showing token usage", "should_trigger": true },
    { "query": "Build me a Claude Code status line", "should_trigger": true },
    { "query": "Author a statusline script for my plugin", "should_trigger": true },
    { "query": "Wire up the statusLine setting in my plugin", "should_trigger": true },
    { "query": "How do I customize what appears in the Claude Code status bar", "should_trigger": true },
    { "query": "Create line.mjs that shows the current git branch", "should_trigger": true },
    { "query": "Register a status line in settings.json", "should_trigger": true },
    { "query": "Show context budget in my status area", "should_trigger": true },
    { "query": "I need a status line showing model and cwd", "should_trigger": true },
    { "query": "Scaffold a status line for my Claude Code plugin", "should_trigger": true },
    { "query": "Create a permissions list for my plugin", "should_trigger": false },
    { "query": "I want to add a PreToolUse hook that blocks writes", "should_trigger": false },
    { "query": "Build a subagent that grades skills", "should_trigger": false },
    { "query": "What is the conformance status of my plugin?", "should_trigger": false },
    { "query": "Show me the git status in my terminal", "should_trigger": false },
    { "query": "Create a slash command for my plugin", "should_trigger": false },
    { "query": "Update the README status badge", "should_trigger": false },
    { "query": "Write a progress indicator for my node script", "should_trigger": false },
    { "query": "Add environment variables to my settings.json", "should_trigger": false },
    { "query": "Check if my plugin passes the quality gate", "should_trigger": false },
    { "query": "What is a status line?", "should_trigger": false },
    { "query": "Configure the Codex tui.status_line option", "should_trigger": false }
  ]
}
```

---

## Why this is golden

- **3 goldens + 1 anti-example (Standard sec 7.2):** Each golden demonstrates a distinct, realistic input/output pair - model only, context budget, cwd+model - covering the three main fields the recipe names (`model`, `cwd`, and context budget). The anti-example defines the scope boundary (network calls are off-limits) so the description's trigger surface is explicit.
- **Drift is an error, not staleness (Standard sec 7.2, sec 8.3):** Each golden names its specific drift signal: the session JSON field it depends on. A sample that reads `session.model` but the field is now `session.activeModel` actively lies about what works - the validate mode must treat it as an error, not a stale note.
- **20+ balanced triggering eval cases (Standard sec 8.3):** 24 cases, 12 positive and 12 negative. Negatives include near-misses that use the word "status" in other senses (git status, conformance status, README badge) so the description neither under- nor over-fires. The last negative (`Configure the Codex tui.status_line option`) guards the F-06 asymmetry boundary (sec 2.3): this skill does NOT author Codex's built-in picker config.
- **Example-threads (ADR 0021):** The three goldens follow two of the three bounded threads: a new Bronze plugin adding a statusline (goldens 1 and 3) and a context-budget monitor that any Gold plugin would want (golden 2). They compose naturally - a real plugin might wire all three reads into one script.
- **Drift rule stated for each golden:** Every golden names its breaking field so the validate mode has a mechanically checkable claim, not just "it worked once."

## Verification

### Eval JSON parse

```
node -e "JSON.parse(require('fs').readFileSync('<eval-path>','utf8')); console.log('OK')"
OK
```

### Eval case count (programmatic)

```
node -e "const d=JSON.parse(require('fs').readFileSync('<path>','utf8')); console.log('cases:',d.cases.length,'positive:',d.cases.filter(c=>c.should_trigger).length,'negative:',d.cases.filter(c=>!c.should_trigger).length)"
cases: 24 positive: 12 negative: 12
```

Run against the scratchpad copy at `C:/Users/jpris/AppData/Local/Temp/claude/.../scratchpad/statusline-trigger.eval.json` - real output, not invented.

### Link verification

No relative markdown links written in this file. Reference doc paths are cited as inline code (`skills/askit-build-statusline/references/statusline-recipe.md`, `agents/_chain-permitted.yaml`), not as clickable links, so U6 cannot produce a false finding and no path resolution is required.
