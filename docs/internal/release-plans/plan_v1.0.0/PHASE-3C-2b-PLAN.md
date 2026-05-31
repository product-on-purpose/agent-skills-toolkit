# Phase 3C-2b Implementation Plan - build-command + builder-pattern.md

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ship `askit-build-command` (authors a Claude slash command mapping to a skill; Codex form is the backing skill, no new artifact), establish `docs/reference/builder-pattern.md` (the shared builder-skill contract), add a `command-contract` check (S7), and dogfood the toolkit's own `/askit-evaluate` + `/askit-build-skill` commands.

**Architecture:** A command is `commands/<name>.md` (Claude-native frontmatter + `maps-to` convention key + a body invoking the backing skill). Codex realizes a command as its backing skill (sec 3.2 parity) - no Codex render, no round-trip. `ctx.commands` parallels `ctx.subagents`; S3 validates `components.commands`; a new conditional Convergent check S7 (`command-contract`) verifies `maps-to` resolves to exactly one on-disk skill/workflow. The shared "harness" is the builder-SKILL pattern documented in `builder-pattern.md` (no code render engine - see the spike SYNTHESIS).

**Tech Stack:** Node >=20, ESM `.mjs`, `node:test` + `node:assert/strict`. No em-dash (U+2014) / en-dash (U+2013) anywhere (PreToolUse hook rejects them; build any dash scanner from `String.fromCharCode(0x2013,0x2014)`).

**Repo state at start:** main @ `c2dca9b` (PR #63), tier convergent, 114 tests, clean. Branch `phase-3c-2b` off main before Task B.

---

## Task A: pin Claude command frontmatter - DONE (no code)

Completed 2026-05-29, recorded in the spike note. Claude command = `commands/<name>.md`; filename is the name (NO `name` frontmatter); fields `description` (required), `argument-hint`/`allowed-tools`/`model` (optional); body uses `$ARGUMENTS`/`$1`. Toolkit adds `maps-to` (Standard convention) + `metadata.version`. No Codex artifact (backing skill is the Codex form).

- [x] Frontmatter pinned; recorded.

---

## Task B: docs/reference/builder-pattern.md (the shared builder-skill contract)

**Files:** Create: `docs/reference/builder-pattern.md`

- [ ] **Step 1: Write the reference doc** (Diataxis reference; read `docs/reference/silver-checks.md` first to match format)

```markdown
# The builder pattern (reference)

Every `askit-build-<type>` skill follows one shape. There is no per-component code "render engine": across Claude and Codex, skills and MCP are portable files (wired by the native manifests), subagents and output styles are Claude-only, and a command's Codex form is its backing skill. So the shared thing is the builder SKILL pattern, captured here once.

## The shape (create mode)
1. Interview the component's inputs (or read them from context).
2. Copy the type's template from `templates/` to the canonical file (`commands/<name>.md`, `agents/<name>.md`, `skills/<name>/SKILL.md`, ...).
3. Author the Claude-native canonical file: frontmatter (per Standard sec 3.8 for the type) + body.
4. Register the component in `library.json` `components.<type>` as `{ name, path, version, tier, status }`.
5. Wire any per-target manifest pointer by running `node scripts/generators/gen-manifest.mjs . --write --target=all` (skills/MCP are referenced by the native manifests; Claude auto-discovers `commands/` and `agents/`).
6. Assess: `node scripts/evaluate.mjs . --json` and iterate to 0 errors.

## The shape (improve mode)
1. `node scripts/evaluate.mjs . --json` and read the findings.
2. Fix each finding per its message (a missing `maps-to`, an over-scoped tool set, a description below the bar, a drifted manifest).
3. Re-run to confirm.

## Cross-agent emission (what each type does)
- **Skill / MCP:** portable file, referenced by each native manifest (`gen-manifest`). Plugin-distributable on both agents.
- **Subagent / output style:** Claude-only (`agent-targets: [claude]`); no Codex artifact (Standard sec 3.3).
- **Command:** a new Claude `commands/<name>.md`; on Codex the backing skill IS the invocable form (Standard sec 3.2 parity) - no separate Codex file.
- **Chain contract / AGENTS.md:** agent-agnostic; one file, no per-target form.

There is no `gen-<type>.mjs` render engine - per-target wiring is `gen-manifest`'s job, and Claude-only types have no Codex artifact. Add a per-target renderer ONLY if a genuinely divergent, both-ingestible type ever appears (none in the v1 set).
```

- [ ] **Step 2: Dash scan + commit**

Run: `node -e "const fs=require('fs');const d=String.fromCharCode(0x2013,0x2014);process.exit([...fs.readFileSync('docs/reference/builder-pattern.md','utf8')].some(c=>d.includes(c))?1:0)"` (expect exit 0)

```bash
git add docs/reference/builder-pattern.md
git commit -m "docs(reference): add builder-pattern.md - the shared builder-skill contract

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task C: ctx.commands in load-plugin (+ listCommandFiles)

**Files:** Modify `scripts/lib/fs-utils.mjs`, `scripts/lib/load-plugin.mjs`; Test `tests/unit/load-plugin.test.mjs`; new fixture `tests/fixtures/golden/command-fixture/`.

- [ ] **Step 1: Create the golden fixture** `tests/fixtures/golden/command-fixture/`

`library.json`:
```json
{
  "name": "command-fixture",
  "version": "0.1.0",
  "tier": "convergent",
  "prefix": "cf-",
  "agent-targets": ["claude"],
  "components": {
    "skills": [{ "name": "cf-do-thing", "path": "skills/cf-do-thing/SKILL.md", "version": "0.1.0", "tier": "universal", "status": "active" }],
    "commands": [{ "name": "cf-do-thing", "path": "commands/cf-do-thing.md", "version": "0.1.0", "tier": "convergent", "status": "active" }]
  }
}
```
`AGENTS.md`:
```markdown
# command-fixture
Test plugin: one command mapping to one skill.
```
`skills/cf-do-thing/SKILL.md`:
```markdown
---
name: cf-do-thing
description: Converts CSV input into a formatted summary. Use when the user asks to summarize spreadsheet data.
metadata:
  version: 0.1.0
---
# cf-do-thing
Steps.
```
`commands/cf-do-thing.md`:
```markdown
---
description: Summarize spreadsheet data. Use when the user asks to tabulate or summarize a CSV.
argument-hint: "[path]"
maps-to: cf-do-thing
metadata:
  version: 0.1.0
---
Invoke the `cf-do-thing` skill to summarize: $ARGUMENTS
```

- [ ] **Step 2: Write the failing test** (append to `tests/unit/load-plugin.test.mjs`)
```javascript
test("loads commands from commands/*.md into ctx.commands", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "golden/command-fixture"));
  assert.deepEqual(ctx.commands.map((c) => c.name), ["cf-do-thing"]);
  assert.equal(ctx.commands[0].frontmatter["maps-to"], "cf-do-thing");
  assert.equal(ctx.commands[0].parseError, null);
});

test("ctx.commands is empty when no commands/ dir exists", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "golden/minimal-skill"));
  assert.deepEqual(ctx.commands, []);
});
```

- [ ] **Step 3: Run, confirm FAIL** (`node --test tests/unit/load-plugin.test.mjs`).

- [ ] **Step 4: Add `listCommandFiles` to `scripts/lib/fs-utils.mjs`** (after `listAgentFiles`):
```javascript
/** Absolute paths of commands/*.md definitions, excluding _-prefixed control files. */
export function listCommandFiles(root) {
  const commandsRoot = path.join(root, "commands");
  if (!existsSync(commandsRoot) || !statSync(commandsRoot).isDirectory()) return [];
  return readdirSync(commandsRoot)
    .filter((name) => name.endsWith(".md") && !name.startsWith("_"))
    .map((name) => path.join(commandsRoot, name))
    // fileExists guards against a directory named "<x>.md" (mirrors listAgentFiles).
    .filter((p) => fileExists(p));
}
```

- [ ] **Step 5: Update `scripts/lib/load-plugin.mjs`**
- Add `listCommandFiles` to the fs-utils import.
- Add `loadCommand` after `loadSubagent`:
```javascript
/** Load one commands/<name>.md into a CommandInfo (parallel to loadSubagent). */
export function loadCommand(file) {
  let raw;
  try {
    raw = readFileSync(file, "utf8");
  } catch (e) {
    return { name: path.basename(file, ".md"), file, raw: null, frontmatter: null, body: "", parseError: e.message };
  }
  const { frontmatter, body, parseError } = parseFrontmatter(raw);
  return { name: path.basename(file, ".md"), file, raw, frontmatter, body, parseError };
}
```
- In `loadPlugin`, after the `subagents` line: `const commands = listCommandFiles(root).map((f) => loadCommand(f));`
- Add `commands` to the returned object (after `subagents`).

- [ ] **Step 6: Run test, confirm PASS.** **Step 7: `npm test` all pass.** **Step 8: Commit**
```bash
git add scripts/lib/fs-utils.mjs scripts/lib/load-plugin.mjs tests/unit/load-plugin.test.mjs tests/fixtures/golden/command-fixture
git commit -m "feat(load-plugin): expose ctx.commands from commands/*.md (Standard sec 3.2)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task D: S3 validates components.commands

**Files:** Modify `scripts/checks/components-index.mjs`; Test `tests/unit/components-index.test.mjs`.

- [ ] **Step 1: Write failing tests** (append)
```javascript
test("S3: golden command-fixture has matching commands index - no error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "golden/command-fixture")));
  assert.equal(r.filter((f) => f.severity === "error").length, 0);
});
test("S3 flags a declared command missing on disk", () => {
  const ctx = { library: { data: { components: { skills: [], commands: [{ name: "ghostcmd" }] } } }, skills: [], subagents: [], commands: [] };
  assert.ok(check(ctx).some((f) => f.reqId === "S3" && /ghostcmd/.test(f.message) && /not on disk/.test(f.message)));
});
test("S3 flags an on-disk command not declared", () => {
  const ctx = { library: { data: { components: { skills: [], commands: [] } } }, skills: [], subagents: [], commands: [{ name: "roguecmd" }] };
  assert.ok(check(ctx).some((f) => f.reqId === "S3" && /roguecmd/.test(f.message) && /not declared/.test(f.message)));
});
```

- [ ] **Step 2: Run, confirm FAIL.**

- [ ] **Step 3: Implement** - insert before the final `return out;` in `components-index.mjs` (mirrors the subagents block):
```javascript
  const declaredCommands = Array.isArray(components.commands) ? components.commands : [];
  const onDiskCommandNames = new Set((ctx.commands || []).map((c) => c.name));
  const declaredCommandNames = new Set();
  for (const c of declaredCommands) {
    if (!c || typeof c.name !== "string") {
      out.push(finding(meta.id, SEVERITY.ERROR, "library.json components.commands entry is missing required string \"name\".", { file: "library.json", reqId: meta.reqId }));
      continue;
    }
    declaredCommandNames.add(c.name);
    if (!onDiskCommandNames.has(c.name)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `library.json components.commands declares "${c.name}" but it is not on disk under commands/.`, { file: "library.json", reqId: meta.reqId }));
    }
  }
  for (const c of (ctx.commands || [])) {
    if (!declaredCommandNames.has(c.name)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `commands/${c.name}.md exists on disk but is not declared in library.json components.commands.`, { file: "library.json", reqId: meta.reqId }));
    }
  }
```

- [ ] **Step 4: Run PASS. Step 5: `npm test`. Step 6: Commit**
```bash
git add scripts/checks/components-index.mjs tests/unit/components-index.test.mjs
git commit -m "feat(S3): validate library.json components.commands against disk (Standard sec 5.1)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task E: command-contract check (S7, Convergent, conditional)

**Files:** Create `scripts/checks/command-contract.mjs`; Modify `scripts/lib/registry.mjs`; Test `tests/unit/command-contract.test.mjs`; fixtures `tests/fixtures/anti/command-orphan-mapsto/`, `tests/fixtures/anti/command-no-mapsto/`.

- [ ] **Step 1: Create the anti fixtures**

`tests/fixtures/anti/command-orphan-mapsto/` - a command whose `maps-to` names a missing skill:
- `library.json`: `{ "name": "command-orphan-mapsto", "version": "0.1.0", "tier": "convergent", "agent-targets": ["claude"], "components": { "commands": [{ "name": "co-cmd", "path": "commands/co-cmd.md", "version": "0.1.0", "tier": "convergent", "status": "active" }] } }`
- `AGENTS.md`: `# command-orphan-mapsto\nmaps-to a skill that does not exist (S7).`
- `commands/co-cmd.md`:
```markdown
---
description: Maps to a skill that does not exist. Use to exercise S7.
maps-to: co-missing-skill
metadata:
  version: 0.1.0
---
Invoke the skill: $ARGUMENTS
```

`tests/fixtures/anti/command-no-mapsto/` - a command missing `maps-to`:
- `library.json`: same shape, name `command-no-mapsto`, command `cn-cmd`.
- `AGENTS.md`: `# command-no-mapsto\ncommand missing maps-to (S7).`
- `commands/cn-cmd.md`:
```markdown
---
description: A command with no maps-to. Use to exercise S7.
metadata:
  version: 0.1.0
---
Do something: $ARGUMENTS
```

- [ ] **Step 2: Write failing tests** `tests/unit/command-contract.test.mjs`
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, meta } from "../../scripts/checks/command-contract.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

test("meta declares S7 convergent", () => {
  assert.equal(meta.reqId, "S7");
  assert.equal(meta.tier, "convergent");
});
test("no commands - conditional, no findings", () => {
  assert.deepEqual(check(loadPlugin(path.join(FIXTURES, "golden/minimal-skill"))), []);
});
test("golden command-fixture: maps-to resolves - no findings", () => {
  assert.deepEqual(check(loadPlugin(path.join(FIXTURES, "golden/command-fixture"))), []);
});
test("command-orphan-mapsto: maps-to names a missing skill is an S7 error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/command-orphan-mapsto")));
  assert.ok(r.some((f) => f.reqId === "S7" && /co-cmd/.test(f.message) && /co-missing-skill/.test(f.message)));
});
test("command-no-mapsto: missing maps-to is an S7 error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/command-no-mapsto")));
  assert.ok(r.some((f) => f.reqId === "S7" && /cn-cmd/.test(f.message) && /maps-to/.test(f.message)));
});
```

- [ ] **Step 3: Run, confirm FAIL** (module not found).

- [ ] **Step 4: Create `scripts/checks/command-contract.mjs`**
```javascript
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "command-contract", tier: "convergent", reqId: "S7" };

export function check(ctx) {
  const commands = ctx.commands || [];
  if (commands.length === 0) return []; // conditional: only fires when commands exist (Standard sec 3.2)
  const out = [];
  const skillNames = new Set((ctx.skills || []).map((s) => s.name));
  const workflowNames = new Set((ctx.workflows || []).map((w) => w.name)); // ctx.workflows arrives in a later phase
  const known = new Set([...skillNames, ...workflowNames]);
  for (const c of commands) {
    const file = `commands/${c.name}.md`;
    if (c.parseError) {
      out.push(finding(meta.id, SEVERITY.ERROR, `command frontmatter does not parse: ${c.parseError}`, { file, reqId: meta.reqId }));
      continue;
    }
    const fm = c.frontmatter || {};
    if (typeof fm.description !== "string" || fm.description.length === 0) {
      out.push(finding(meta.id, SEVERITY.ERROR, `commands/${c.name}.md is missing a non-empty "description" (Standard sec 3.2, 8.1).`, { file, reqId: meta.reqId }));
    }
    const mapsTo = fm["maps-to"];
    if (typeof mapsTo !== "string" || mapsTo.length === 0) {
      out.push(finding(meta.id, SEVERITY.ERROR, `commands/${c.name}.md must declare "maps-to" naming exactly one skill or workflow (Standard sec 3.2).`, { file, reqId: meta.reqId }));
    } else if (!known.has(mapsTo)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `commands/${c.name}.md maps-to "${mapsTo}" but no skill or workflow by that name exists on disk (Standard sec 3.2).`, { file, reqId: meta.reqId }));
    }
  }
  return out;
}
```

- [ ] **Step 5: Register** in `scripts/lib/registry.mjs` - import `* as commandContract from "../checks/command-contract.mjs"` and add `commandContract` to the `CHECKS` array (after `chainContract`).

- [ ] **Step 6: Run tests PASS. Step 7: `npm test` (repo has no commands yet, so its S7 is silent). Step 8: Commit**
```bash
git add scripts/checks/command-contract.mjs scripts/lib/registry.mjs tests/unit/command-contract.test.mjs tests/fixtures/anti/command-orphan-mapsto tests/fixtures/anti/command-no-mapsto
git commit -m "feat(S7): command-contract check - maps-to resolves to exactly one skill/workflow (Standard sec 3.2)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task F: gen-manifest indexes commands (manifest.generated.json)

**Files:** Modify `scripts/generators/gen-manifest.mjs`; Test `tests/unit/gen-manifest.test.mjs`.

- [ ] **Step 1: Write a failing test** (append to `tests/unit/gen-manifest.test.mjs`; read it first to match style). Assert that `renderManifest` on the `golden/command-fixture` includes a `commands` array with `cf-do-thing` and its `maps-to`.
```javascript
test("renderManifest indexes commands with name + maps-to", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "golden/command-fixture"));
  const obj = JSON.parse(renderManifest(ctx));
  assert.ok(Array.isArray(obj.commands));
  assert.deepEqual(obj.commands.map((c) => c.name), ["cf-do-thing"]);
  assert.equal(obj.commands[0].mapsTo, "cf-do-thing");
});
```
(Import `renderManifest` + `loadPlugin` + `FIXTURES` as the file already does; if `renderManifest` is not exported, export it.)

- [ ] **Step 2: Run, confirm FAIL.**

- [ ] **Step 3: Extend `renderManifest`** in `gen-manifest.mjs` - add a `commands` field to the object (after `skills`):
```javascript
    commands: (ctx.commands || []).map((c) => ({
      name: c.name,
      path: path.relative(ctx.root, c.file).split(path.sep).join("/"),
      description: c.frontmatter?.description ?? null,
      mapsTo: c.frontmatter?.["maps-to"] ?? null,
    })),
```

- [ ] **Step 4: Run PASS. Step 5: Regenerate the repo manifest** (`node scripts/generators/gen-manifest.mjs . --write --target=resolved`) - the repo has no commands yet so `manifest.generated.json` gains an empty `commands: []`. Step 6: `npm test`. Step 7: Commit
```bash
git add scripts/generators/gen-manifest.mjs tests/unit/gen-manifest.test.mjs manifest.generated.json
git commit -m "feat(gen-manifest): index commands in manifest.generated.json

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task G: askit-build-command skill + templates/command.md

**Files:** Create `templates/command.md`, `skills/askit-build-command/SKILL.md`, `skills/askit-build-command/references/authoring-commands.md`; Modify `library.json`; regen manifests.

- [ ] **Step 1: Create `templates/command.md`**
```markdown
---
description: REPLACE - what this command does AND when to use it, mirroring the backing skill's triggering intent.
maps-to: REPLACE-backing-skill-name
metadata:
  version: 0.1.0
---

REPLACE - the prompt body. Invoke the `REPLACE-backing-skill-name` skill, passing $ARGUMENTS. Add an optional `argument-hint`, `allowed-tools`, or `model` to the frontmatter if the command needs them.
```

- [ ] **Step 2: Create `skills/askit-build-command/SKILL.md`** (mirror `askit-build-subagent`)
```markdown
---
name: askit-build-command
description: Creates and improves Claude slash commands (commands/<name>.md) that map to a skill, to the Advanced Skill Library Standard. Use when you need to give a skill an explicit /command entry point or raise an existing command's conformance.
metadata:
  version: 0.1.0
  tier: universal
  audience: intermediate
---

# askit-build-command

## Purpose
Author conformant commands. Two modes: `create` scaffolds a new `commands/<name>.md` that maps to an existing skill; `improve` raises an existing command toward the quality bar. On Codex a command is realized as its backing skill (Standard sec 3.2 parity), so this skill emits no Codex artifact. Follows the shared [builder pattern](../../docs/reference/builder-pattern.md). Authoring depth is in [references/authoring-commands.md](references/authoring-commands.md).

## When to use
When the user asks to create, scaffold, or improve a slash command for a skill.

## create mode
1. Brief interview: the command name (kebab-case, becomes `/name`), the skill (or workflow) it maps to, optional args, and a description mirroring the backing skill's intent. Skip if provided in context.
2. Copy `templates/command.md` into `commands/<name>.md`.
3. Fill the frontmatter: `description` (what AND when; Standard sec 8.1); `maps-to` equal to the backing skill or workflow name; optional `argument-hint`/`allowed-tools`/`model`; `metadata.version`. The filename is the command name (no `name` key). Write a body that invokes the backing skill, passing `$ARGUMENTS`.
4. Verify the `maps-to` target exists (a skill in `skills/` or a workflow in `_workflows/`).
5. Register the command in `library.json` `components.commands` as `{ name, path, version, tier, status }`.
6. Assess with `node scripts/evaluate.mjs . --json` and iterate until 0 errors (S3 components index + S7 command-contract must be clean).

## improve mode
1. Run `node scripts/evaluate.mjs . --json` and read the report.
2. For each finding: an S3 error -> declare/undeclare the command in `components.commands` to match disk; an S7 error -> add the missing `maps-to`, fix a `maps-to` that does not resolve, or add a missing `description`. For any other finding, read its message and apply the fix it states.
3. Re-run evaluate to confirm.

## Scope
Claude-native: a command is `commands/<name>.md`. Codex realizes a command as its backing skill (Standard sec 3.2), so there is no Codex artifact to generate; the backing skill is the invocable form on Codex. A command MUST map to exactly one skill or workflow.
```

- [ ] **Step 3: Create `skills/askit-build-command/references/authoring-commands.md`** - cover: a command is `commands/<name>.md` (filename = name); frontmatter (`description` required; `maps-to` the Standard convention; optional `argument-hint`/`allowed-tools`/`model`); the body invokes the backing skill via `$ARGUMENTS`; the Codex parity (sec 3.2 - the backing skill is the Codex form); a command MUST map to exactly one skill/workflow (S7).

- [ ] **Step 4: Register in `library.json`** - add to `components.skills` after `askit-build-subagent`:
```json
      { "name": "askit-build-command", "path": "skills/askit-build-command/SKILL.md", "version": "0.1.0", "tier": "universal", "status": "active" }
```

- [ ] **Step 5: Regenerate** (`node scripts/generators/gen-manifest.mjs . --write --target=all`).

- [ ] **Step 6: Evaluate** (`node scripts/evaluate.mjs skills/askit-build-command --json`) - MUST be 0 errors (tighten the description / move depth to references if U5/U7 warns).

- [ ] **Step 7: `npm test`. Step 8: Commit** (add the changed manifests via `git status` - native manifests likely unchanged; manifest.generated.json gains the skill)
```bash
git add templates/command.md skills/askit-build-command library.json manifest.generated.json
git commit -m "feat(skills): add askit-build-command (Claude command authoring; create/improve)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task H: Dogfood - the toolkit's own commands

**Files:** Create `commands/askit-evaluate.md`, `commands/askit-build-skill.md`; Modify `library.json` (`components.commands`); regen manifests.

- [ ] **Step 1: Create `commands/askit-evaluate.md`**
```markdown
---
description: Evaluate a skill or plugin against the Advanced Skill Library Standard and report per-rule findings, the tier, and remediation. Use to audit conformance or see what blocks the next tier.
argument-hint: "[path]"
maps-to: askit-evaluate
metadata:
  version: 0.1.0
---

Invoke the `askit-evaluate` skill to assess the target at: $ARGUMENTS

Run the conformance core, then report the findings grouped by rule, the satisfied tier, and the remediation. Lead with errors, then warnings.
```

- [ ] **Step 2: Create `commands/askit-build-skill.md`**
```markdown
---
description: Create or improve an agentskills.io skill to the Advanced Skill Library Standard. Use to scaffold a new SKILL.md or raise an existing skill's conformance and description quality.
argument-hint: "[skill-name-or-path]"
maps-to: askit-build-skill
metadata:
  version: 0.1.0
---

Invoke the `askit-build-skill` skill to create or improve: $ARGUMENTS
```

- [ ] **Step 3: Register in `library.json`** - add `components.commands` (after `subagents` inside `components`):
```json
    "commands": [
      { "name": "askit-evaluate", "path": "commands/askit-evaluate.md", "version": "0.1.0", "tier": "convergent", "status": "active" },
      { "name": "askit-build-skill", "path": "commands/askit-build-skill.md", "version": "0.1.0", "tier": "convergent", "status": "active" }
    ]
```

- [ ] **Step 4: Regenerate + verify green**
- `node scripts/generators/gen-manifest.mjs . --write --target=all`
- `node scripts/check.mjs` -> exit 0 (S2 prefix: the commands carry `askit-`; S3: declared == on disk; S7: both maps-to resolve to real skills)
- `node scripts/evaluate.mjs . --json` -> 0 errors
- `node scripts/tier-report.mjs --json` -> `{"tier":"convergent","satisfies":["universal","convergent"],"blocked":{}}`
- `npm test` -> all pass (seed tests green - the regression guard)

If S2 (prefix) or any check flags the commands, fix until green.

- [ ] **Step 5: Commit**
```bash
git add commands library.json manifest.generated.json
git commit -m "feat: dogfood /askit-evaluate + /askit-build-skill commands (invocation parity)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task I: Docs + AGENTS/INDEX + CHANGELOG

**Files:** Create `docs/how-to/build-a-command.md`, `docs/reference/askit-build-command.md`; Modify `docs/reference/silver-checks.md`, `AGENTS.md`, `INDEX.md`, `CHANGELOG.md`.

- [ ] **Step 1:** `docs/how-to/build-a-command.md` (mirror `docs/how-to/build-a-subagent.md`): when to add a command; create via `askit-build-command`; `maps-to`; the Codex parity (sec 3.2); validating to 0 errors. Real commands, no stubs.
- [ ] **Step 2:** `docs/reference/askit-build-command.md` (mirror `docs/reference/askit-build-subagent.md`): two modes, inputs, files touched, the Codex parity.
- [ ] **Step 3:** `docs/reference/silver-checks.md` - add an **S7** row (command-contract: a command must declare `maps-to` resolving to exactly one on-disk skill/workflow; conditional - fires only when `commands/` exist). Match the table format.
- [ ] **Step 4:** `AGENTS.md` + `INDEX.md` - add `askit-build-command`, the two dogfood commands, `builder-pattern.md`, and the S7 check. (Hand-edit; the generators emit only partial blocks - confirmed in 3C-2a.) Run `node scripts/check.mjs` -> exit 0.
- [ ] **Step 5:** `CHANGELOG.md` under `## [Unreleased]`:
```markdown
### Added
- `askit-build-command` skill (Claude slash-command authoring: create/improve).
- `docs/reference/builder-pattern.md` - the shared builder-skill contract.
- `/askit-evaluate` + `/askit-build-skill` commands (cross-agent invocation parity).
- S3 now validates `library.json components.commands`.
- S7 `command-contract` check: a command must map to exactly one on-disk skill/workflow.
- `manifest.generated.json` now indexes commands.
```
- [ ] **Step 6: Dash scan changed files + commit**
```bash
git add docs AGENTS.md INDEX.md CHANGELOG.md
git commit -m "docs: command how-to/reference, builder-pattern, S7 row, changelog

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task J: Final verification

- [ ] `node scripts/check.mjs` -> exit 0; `node scripts/evaluate.mjs .` -> exit 0.
- [ ] `node scripts/tier-report.mjs --json` -> `{"tier":"convergent","satisfies":["universal","convergent"],"blocked":{}}`.
- [ ] `npm test` -> all pass (114 baseline + new load-plugin/components-index/command-contract/gen-manifest tests; seed tests green).
- [ ] Dash scan across `git diff --name-only main...HEAD` -> 0 hits.
- [ ] `git status --short` clean; `git diff --stat main...HEAD` only intended files.

---

## Self-review (run before execution)

**Spec coverage:** builder-pattern.md -> B. ctx.commands -> C. S3 commands -> D. S7 command-contract -> E. gen-manifest command index -> F. build-command skill -> G. dogfood commands -> H. docs/CHANGELOG -> I. verification -> J. Covered.

**Type/name consistency:** `ctx.commands` ({name, file, frontmatter, body, parseError}) from `loadCommand` is consumed by S3 (D), S7 (E), gen-manifest (F). `listCommandFiles` is the new fs-utils export. `maps-to` is read as `frontmatter["maps-to"]` everywhere. S7 reqId is `S7` in the check, the test, and the silver-checks row. Dogfood command names (`askit-evaluate`, `askit-build-skill`) match their `maps-to` skills.

**Placeholder scan:** all code steps have complete code; doc steps state exact content + "mirror the sibling, real commands".

**Versioning:** plugin stays 0.2.0; new component 0.1.0; no tag. U8 compares only name/version, so drift-clean.

**Conditional discipline:** S7 returns [] when no commands exist (like S4) - unit-tested via minimal-skill. The repo gains commands in H, so S7 then runs and must pass.
