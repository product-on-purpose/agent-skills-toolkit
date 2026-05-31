# Phase 2 - Authoring + Assessment Proof Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `build-skill -> evaluate -> improve` proof loop as authored skills over the Phase 1 conformance engine, plus one new deterministic unit (`scripts/evaluate.mjs`), with dual human/agent documentation - the toolkit authoring and validating its own skills.

**Architecture:** `evaluate` is a thin report aggregator that composes the existing `runAllChecks` + `computeTierReport` (plugin scope) or the `checkAgentskills` seam (component scope) into one structured report. `askit-build-skill` and `askit-evaluate` are authored SKILL.md skills (Claude-only, prefix `askit-`) validated by the toolkit's OWN gate - dogfooding. Subagents, Codex emission, and behavioral/review modes are deferred to Phase 3/4.

**Tech Stack:** Node >= 20, ESM `.mjs`, `node:test` (zero test-framework deps), the existing `yaml` dep. Authored components are agentskills.io `SKILL.md` markdown.

---

## Reference: design + locked decisions

Full design: `PHASE-2-DESIGN.md`. Key locks:
- Prefix `askit-` on every new component. Claude target only. Toolkit stays declared `universal` (Bronze).
- Validation = structural-in-CI (new skills must pass the toolkit's own gate) + one recorded manual dogfood.
- Subagents (`skill-author`, `evaluator`), Codex emission, and `evaluate` behavioral/review modes are Phase 3/4.
- `improve` consumes `evaluate --json` (Q2.1). `create` does a brief inline interview (Q2.2).

### What already exists (Phase 1, on `main`)
- `scripts/lib/load-plugin.mjs` - `loadPlugin(root)` -> `{root, library, agentsMdPath, claudeManifest, skills:[SkillInfo]}`. `SkillInfo = {name,dir,skillMdPath,raw,frontmatter,body,parseError}`.
- `scripts/lib/registry.mjs` - `CHECKS`, `runAllChecks(ctx)`.
- `scripts/tier-report.mjs` - `computeTierReport(root, ctx?)` -> `{tier, satisfies, blocked}`.
- `scripts/check.mjs` - `runGate(root, ctx?)` and the CLI gate.
- `scripts/checks/agentskills.mjs` - `checkAgentskills(ctx)` composing the skill-level checks U3-U7 (frontmatter-valid, name-matches-dir, description-score, reference-links, instruction-budget).
- `scripts/generators/{gen-index,gen-manifest,sync-agents-md}.mjs` - `renderIndex(ctx)`, `renderManifest(ctx)`, `renderAgentsComponentBlock(ctx)`, each with a `--write` CLI.
- `tests/unit/seed-bronze.test.mjs` - asserts `runGate(process.cwd())` has 0 errors and tier universal. Adding skills makes this assert the new skills conform.
- Tests anchor fixtures via `import.meta.url`: `const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");`.

### Conventions (carry forward from Phase 1)
- No em-dash/en-dash anywhere (a hook enforces). Use " - ".
- CLI entry guard: `if (process.argv[1]?.endsWith("<file>.mjs"))`.
- Finding shape `{check, severity, message, file, reqId}`; `relPath(root, abs)` from `fs-utils.mjs` for slash-normalized paths.

---

## File Structure

```
scripts/
  lib/load-plugin.mjs        MODIFY - extract + export loadSkill(dir); loadPlugin reuses it
  evaluate.mjs               CREATE - report aggregator + scope detection + CLI
templates/
  SKILL.md                   CREATE - the skeleton build-skill scaffolds from
skills/
  askit-evaluate/
    SKILL.md                 CREATE - agent-canonical (NL assessment front door)
    README.md                CREATE - human overview
    references/report-format.md  CREATE - the evaluate report shape (lazy depth)
  askit-build-skill/
    SKILL.md                 CREATE - agent-canonical (create + improve modes)
    README.md                CREATE - human overview
    references/authoring-guide.md  CREATE - the 8.1 description rubric + layout, author-facing
docs/
  how-to/build-and-evaluate-a-skill.md     CREATE - end-to-end walkthrough (human)
  reference/askit-build-skill.md           CREATE - interface reference (human)
  reference/askit-evaluate.md              CREATE - interface reference (human)
  explanation/conformance-and-tiers.md     CREATE - the "why" (human)
INDEX.md                     MODIFY - regenerate to list the new skills
AGENTS.md                    MODIFY - list the new skills + loop pointer
manifest.generated.json      CREATE - generate from library.json + skills
CHANGELOG.md                 MODIFY - Phase 2 entries
tests/
  fixtures/golden/lone-skill/SKILL.md   CREATE - a bare skill dir (no library.json) for component scope
  unit/evaluate.test.mjs                CREATE
```

---

## Task 1: Extract `loadSkill` from `loadPlugin` (refactor, DRY)

**Files:**
- Modify: `scripts/lib/load-plugin.mjs`
- Test: existing `tests/unit/load-plugin.test.mjs` must still pass; add one for `loadSkill`.

- [ ] **Step 1: Write the failing test** (append to `tests/unit/load-plugin.test.mjs`)

```js
import { loadSkill } from "../../scripts/lib/load-plugin.mjs";

test("loadSkill loads one skill dir into a SkillInfo", () => {
  const dir = path.join(FIXTURES, "golden/minimal-skill/skills/do-thing");
  const s = loadSkill(dir);
  assert.equal(s.name, "do-thing");
  assert.equal(s.frontmatter.name, "do-thing");
  assert.equal(s.parseError, null);
  assert.match(s.skillMdPath, /SKILL\.md$/);
});
```
(The file already defines `FIXTURES`, `path`, `test`, `assert`. Only add the new `import` and the test. If `FIXTURES` is not yet defined in this file because the Phase 1 version used a different anchor, add the standard anchor import.)

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/load-plugin.test.mjs`
Expected: FAIL - `loadSkill` is not exported.

- [ ] **Step 3: Refactor `load-plugin.mjs` to extract and export `loadSkill`**

In `scripts/lib/load-plugin.mjs`, add an exported `loadSkill` and call it from `loadPlugin`. The skill-loading logic currently inlined in `loadPlugin`'s `.map(...)` moves into `loadSkill`:

```js
import { readFileSync } from "node:fs";
import path from "node:path";
import { readJsonSafe, fileExists, listSkillDirs } from "./fs-utils.mjs";
import { parseFrontmatter } from "./frontmatter.mjs";

/** Load one skill directory into a SkillInfo. Read failure becomes a parseError (fail-safe). */
export function loadSkill(dir) {
  const skillMdPath = path.join(dir, "SKILL.md");
  let raw;
  try {
    raw = readFileSync(skillMdPath, "utf8");
  } catch (e) {
    return { name: path.basename(dir), dir, skillMdPath, raw: null, frontmatter: null, body: "", parseError: e.message };
  }
  const { frontmatter, body, parseError } = parseFrontmatter(raw);
  return { name: path.basename(dir), dir, skillMdPath, raw, frontmatter, body, parseError };
}

export function loadPlugin(root) {
  const libPath = path.join(root, "library.json");
  const library = { path: libPath, ...readJsonSafe(libPath) };
  const agentsMd = path.join(root, "AGENTS.md");
  const agentsMdPath = fileExists(agentsMd) ? agentsMd : null;
  const claude = readJsonSafe(path.join(root, ".claude-plugin", "plugin.json"));
  const skills = listSkillDirs(root).map((dir) => loadSkill(dir));
  return { root, library, agentsMdPath, claudeManifest: claude.data, skills };
}
```
(Preserve whatever the Phase 1 file currently does for `claudeManifest`; only the skill-loading is extracted. If the current file differs slightly, keep its behavior and just factor the per-skill block into `loadSkill`.)

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS - all prior tests plus the new `loadSkill` test (the refactor is behavior-preserving).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/load-plugin.mjs tests/unit/load-plugin.test.mjs
git commit -m "refactor(lib): extract loadSkill from loadPlugin for reuse by evaluate"
```

---

## Task 2: `scripts/evaluate.mjs` - plugin-scope report

**Files:**
- Create: `scripts/evaluate.mjs`
- Test: `tests/unit/evaluate.test.mjs`

- [ ] **Step 1: Write the failing test**

`tests/unit/evaluate.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluate } from "../../scripts/evaluate.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

test("plugin scope: golden plugin reports clean, tier universal", () => {
  const r = evaluate(path.join(FIXTURES, "golden/minimal-skill"));
  assert.equal(r.scope, "plugin");
  assert.equal(r.summary.errors, 0);
  assert.equal(r.tier, "universal");
  assert.deepEqual(r.blocked, {});
  assert.ok(typeof r.byRule === "object");
});

test("plugin scope: missing library.json reports a U1 error grouped by rule", () => {
  const r = evaluate(path.join(FIXTURES, "anti/missing-library-json"));
  assert.equal(r.scope, "plugin"); // it is a directory we treat as a plugin attempt
  assert.ok(r.summary.errors >= 1);
  assert.ok(r.byRule.U1 && r.byRule.U1.length >= 1);
});
```
Note: `anti/missing-library-json` has no `library.json`. Scope detection must still treat a directory lacking both `library.json` and a top-level `SKILL.md` as a plugin attempt so the U1 "missing library.json" error is surfaced (see Task 4 for the precise rule). For Task 2, implement plugin scope for a directory that has `library.json`; the missing-library-json case is finalized in Task 4. If this second test cannot pass yet under the Task 2 implementation, mark it `{ todo: true }` temporarily and finalize in Task 4. Prefer to implement the full scope rule now (Task 4 code) if straightforward.

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/evaluate.test.mjs`
Expected: FAIL - module not found.

- [ ] **Step 3: Implement plugin scope in `scripts/evaluate.mjs`**

```js
import path from "node:path";
import { existsSync } from "node:fs";
import { loadPlugin } from "./lib/load-plugin.mjs";
import { runAllChecks } from "./lib/registry.mjs";
import { computeTierReport } from "./tier-report.mjs";

/** Group findings by reqId (fallback to check id). */
function groupByRule(findings) {
  const byRule = {};
  for (const f of findings) {
    const key = f.reqId ?? f.check;
    (byRule[key] ??= []).push(f);
  }
  return byRule;
}

function baseReport(scope, target, findings) {
  return {
    scope,
    target,
    findings,
    byRule: groupByRule(findings),
    summary: {
      errors: findings.filter((f) => f.severity === "error").length,
      warns: findings.filter((f) => f.severity === "warn").length,
    },
  };
}

/** Evaluate a plugin (has library.json) or a lone skill (has SKILL.md). */
export function evaluate(target) {
  const hasLibrary = existsSync(path.join(target, "library.json"));
  const hasSkillMd = existsSync(path.join(target, "SKILL.md"));

  // Component scope only when it is clearly a lone skill (SKILL.md, no library.json).
  if (hasSkillMd && !hasLibrary) {
    return evaluateComponent(target); // Task 3
  }
  // Otherwise treat as a plugin attempt (this surfaces the U1 "missing library.json" error).
  const ctx = loadPlugin(target);
  const findings = runAllChecks(ctx);
  const t = computeTierReport(target, ctx);
  return { ...baseReport("plugin", target, findings), tier: t.tier, satisfies: t.satisfies, blocked: t.blocked };
}
```
For Task 2, add a temporary stub so the file imports cleanly:
```js
function evaluateComponent(target) {
  return baseReport("component", target, []); // finalized in Task 3
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test tests/unit/evaluate.test.mjs`
Expected: PASS - both plugin-scope tests (the missing-library-json directory has neither a top-level SKILL.md nor library.json, so it routes to the plugin branch and surfaces U1).

- [ ] **Step 5: Commit**

```bash
git add scripts/evaluate.mjs tests/unit/evaluate.test.mjs
git commit -m "feat(evaluate): plugin-scope conformance report (composes runAllChecks + tier-report)"
```

---

## Task 3: `scripts/evaluate.mjs` - component scope (lone skill)

**Files:**
- Modify: `scripts/evaluate.mjs`
- Create: `tests/fixtures/golden/lone-skill/SKILL.md`
- Test: `tests/unit/evaluate.test.mjs`

- [ ] **Step 1: Create the lone-skill fixture** `tests/fixtures/golden/lone-skill/SKILL.md`:
```markdown
---
name: lone-skill
description: Converts a list of tasks into a prioritized plan. Use when the user asks to order, rank, or sequence work items by priority.
metadata:
  version: 0.1.0
---
# lone-skill
Steps the agent follows.
```
(Directory name is `lone-skill`; frontmatter name matches; no `library.json` here, so it is a component, not a plugin.)

- [ ] **Step 2: Write the failing tests** (append to `tests/unit/evaluate.test.mjs`)
```js
test("component scope: lone skill runs skill-level rules only, no tier", () => {
  const r = evaluate(path.join(FIXTURES, "golden/lone-skill"));
  assert.equal(r.scope, "component");
  assert.equal(r.summary.errors, 0);
  assert.equal(r.tier, undefined);          // a lone component has no manifest, so no tier
  assert.equal(r.byRule.U1, undefined);     // U1 (library-json) does not apply
  assert.equal(r.byRule.U2, undefined);     // U2 (anatomy) does not apply
});

test("component scope: weak description is a U5 warn, not an error", () => {
  const r = evaluate(path.join(FIXTURES, "anti/weak-description/skills/vague"));
  assert.equal(r.scope, "component");
  assert.equal(r.summary.errors, 0);
  assert.ok(r.byRule.U5 && r.byRule.U5[0].severity === "warn");
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `node --test tests/unit/evaluate.test.mjs`
Expected: FAIL - `evaluateComponent` is still the stub returning empty findings.

- [ ] **Step 4: Implement `evaluateComponent`** (replace the stub in `scripts/evaluate.mjs`)
```js
import { loadSkill } from "./lib/load-plugin.mjs";
import { checkAgentskills } from "./checks/agentskills.mjs";

function evaluateComponent(target) {
  const skill = loadSkill(target);
  // checkAgentskills runs the skill-level rules U3-U7 over ctx.skills.
  const ctx = { root: path.dirname(target), skills: [skill] };
  const findings = checkAgentskills(ctx);
  return baseReport("component", target, findings); // no tier for a lone component
}
```
(Add the two imports at the top of the file. `checkAgentskills` already composes frontmatter-valid, name-matches-dir, description-score, reference-links, instruction-budget = exactly the skill-level rules.)

- [ ] **Step 5: Run to verify it passes**

Run: `node --test tests/unit/evaluate.test.mjs`
Expected: PASS - all four evaluate tests.

- [ ] **Step 6: Commit**

```bash
git add scripts/evaluate.mjs tests/unit/evaluate.test.mjs tests/fixtures/golden/lone-skill
git commit -m "feat(evaluate): component scope for a lone skill (reuses checkAgentskills)"
```

---

## Task 4: `scripts/evaluate.mjs` - the "neither" error + CLI

**Files:**
- Modify: `scripts/evaluate.mjs`
- Test: `tests/unit/evaluate.test.mjs`

- [ ] **Step 1: Write the failing test** (append)
```js
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

test("neither plugin nor skill: returns an actionable error finding", () => {
  const empty = mkdtempSync(path.join(tmpdir(), "ev-"));
  const r = evaluate(empty);
  assert.equal(r.scope, "unknown");
  assert.ok(r.summary.errors >= 1);
  assert.match(r.findings[0].message, /library\.json|SKILL\.md/);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/evaluate.test.mjs`
Expected: FAIL - an empty dir currently routes to the plugin branch (loadPlugin) rather than an "unknown" report.

- [ ] **Step 3: Add the neither-case and CLI** to `scripts/evaluate.mjs`

Update `evaluate` to detect the neither-case explicitly, and add a human formatter + CLI. Replace the final plugin branch with:
```js
  if (!hasLibrary && !hasSkillMd) {
    const f = { check: "evaluate", severity: "error", message: "not a plugin or skill: expected a library.json (plugin) or a SKILL.md (component) at " + target, file: null, reqId: null };
    return { ...baseReport("unknown", target, [f]) };
  }
  const ctx = loadPlugin(target);
  const findings = runAllChecks(ctx);
  const t = computeTierReport(target, ctx);
  return { ...baseReport("plugin", target, findings), tier: t.tier, satisfies: t.satisfies, blocked: t.blocked };
}

export function formatReport(r) {
  const lines = [];
  lines.push(`Evaluating (${r.scope}): ${r.target}`);
  for (const f of r.findings) {
    lines.push(`  [${f.severity}] ${f.reqId ?? f.check}: ${f.message}${f.file ? "  -> " + f.file : ""}`);
  }
  if (r.tier) lines.push(`Tier: ${r.tier}`);
  lines.push(`${r.summary.errors} error(s), ${r.summary.warns} warning(s).`);
  return lines.join("\n");
}

if (process.argv[1]?.endsWith("evaluate.mjs")) {
  const target = process.argv.find((a, i) => i >= 2 && !a.startsWith("--")) ?? process.cwd();
  const r = evaluate(target);
  console.log(process.argv.includes("--json") ? JSON.stringify(r, null, 2) : formatReport(r));
  process.exit(r.summary.errors > 0 ? 1 : 0);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test tests/unit/evaluate.test.mjs` then `npm test`
Expected: PASS (all evaluate tests + full suite). Smoke-check the CLI: `node scripts/evaluate.mjs tests/fixtures/golden/minimal-skill` prints a clean plugin report and exits 0; `node scripts/evaluate.mjs tests/fixtures/golden/lone-skill` prints a component report.

- [ ] **Step 5: Add the `evaluate` npm script + commit**

In `package.json` `scripts`, add `"evaluate": "node scripts/evaluate.mjs"`. Then:
```bash
git add scripts/evaluate.mjs tests/unit/evaluate.test.mjs package.json
git commit -m "feat(evaluate): unknown-target error, human/json CLI, npm script"
```

---

## Task 5: `templates/SKILL.md` skeleton

**Files:**
- Create: `templates/SKILL.md`
- Test: `tests/unit/template-skill.test.mjs`

- [ ] **Step 1: Write the failing test** `tests/unit/template-skill.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "../../scripts/lib/frontmatter.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("templates/SKILL.md parses and has the required frontmatter keys", () => {
  const raw = readFileSync(path.join(ROOT, "templates/SKILL.md"), "utf8");
  const { frontmatter, parseError } = parseFrontmatter(raw);
  assert.equal(parseError, null);
  assert.ok("name" in frontmatter);
  assert.ok("description" in frontmatter);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/template-skill.test.mjs`
Expected: FAIL - file does not exist.

- [ ] **Step 3: Create `templates/SKILL.md`**
```markdown
---
name: REPLACE-with-kebab-case-name-matching-this-directory
description: REPLACE - state what the skill does AND when to use it, with concrete trigger keywords. One to two sentences. Third person. Avoid "helps with".
metadata:
  version: 0.1.0
---

# REPLACE-with-name

## Purpose
One paragraph: what this skill does for the agent.

## When to use
The trigger conditions, mirroring the description.

## Steps
1. First step.
2. Second step.

## References
Move deep content into `references/` and link it here so this file stays within the instruction budget.
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test tests/unit/template-skill.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add templates/SKILL.md tests/unit/template-skill.test.mjs
git commit -m "feat(templates): SKILL.md skeleton for build-skill to scaffold from"
```

---

## Task 6: `askit-evaluate` skill (authored; validated by the gate)

**Files:**
- Create: `skills/askit-evaluate/SKILL.md`, `skills/askit-evaluate/README.md`, `skills/askit-evaluate/references/report-format.md`

This is an authoring task, not TDD code. The test is the toolkit's own gate: the new skill must pass U3-U7. Frontmatter is given exactly (it must clear U4 name==dir and U5 description >= 0.7); the body is specified by outline; any `references/` link in the body MUST resolve (U6), so create the referenced file.

- [ ] **Step 1: Create `skills/askit-evaluate/SKILL.md`**
```markdown
---
name: askit-evaluate
description: Evaluates a skill or plugin against the Advanced Skill Library Standard and reports per-rule findings, the tier, and remediation. Use when you want to audit conformance, check a skill or plugin, or see what blocks the next tier.
metadata:
  version: 0.1.0
  tier: universal
  audience: intermediate
---

# askit-evaluate

## Purpose
Assess a known, local component or plugin against `STANDARD.md` and return a per-rule report (pass / warn / error), the satisfied tier, and concrete remediation. The conformance core is deterministic - this skill runs the portable scripts and presents the result.

## When to use
When the user asks to evaluate, audit, or check a skill or plugin, or asks "what tier is this" or "what is blocking the next tier".

## Steps
1. Determine the target path (a plugin root with `library.json`, or a single skill directory with `SKILL.md`).
2. Run: `node scripts/evaluate.mjs <path> --json`.
3. Present the findings grouped by rule, the tier (for a plugin), and the remediation. Lead with errors, then warnings.
4. If there are warnings or errors, point the user at `askit-build-skill` in `improve` mode to fix them.

## Scope (v1)
This skill is the conformance-core assessment. Behavioral evaluation (running a skill against expected outputs) and qualitative review are out of scope here and arrive in a later phase. See `references/report-format.md` for the report shape.
```

- [ ] **Step 2: Create `skills/askit-evaluate/references/report-format.md`** (the link target, so U6 passes)
```markdown
# evaluate report format

`node scripts/evaluate.mjs <path> --json` returns:

- `scope`: "plugin" | "component" | "unknown"
- `target`: the evaluated path
- `findings`: array of `{ check, severity, message, file, reqId }`
- `byRule`: findings grouped by requirement id (e.g. `U5`) or check id
- `tier`, `satisfies`, `blocked`: present for plugin scope only
- `summary`: `{ errors, warns }`

Severity `error` fails a gate; `warn` is surfaced but does not fail. A lone component has no manifest, so no tier is reported.
```

- [ ] **Step 3: Create `skills/askit-evaluate/README.md`** (human view)
```markdown
# askit-evaluate (human overview)

Audit a skill or plugin against the Advanced Skill Library Standard.

**What it does:** runs the toolkit's conformance checks and shows you per-rule findings, the tier a plugin satisfies, and what to fix.

**When to use it:** before committing a new skill, or when you want to know what blocks the next tier.

**Example:**
```
node scripts/evaluate.mjs skills/askit-build-skill
```
Agent-canonical instructions live in `SKILL.md`; the report shape is in `references/report-format.md`.
```

- [ ] **Step 4: Validate against the gate**

Run: `node scripts/evaluate.mjs skills/askit-evaluate`
Expected: component-scope report, **0 errors** (description clears 0.7, name==dir, links resolve, within budget). If U5 warns that the description scores low, rewrite the description to state what + when with concrete keywords - do not change the threshold. Re-run until 0 errors and no U5 warn.

- [ ] **Step 5: Commit**

```bash
git add skills/askit-evaluate
git commit -m "feat(skill): askit-evaluate - NL conformance assessment front door"
```

---

## Task 7: `askit-build-skill` skill (authored; validated by the gate)

**Files:**
- Create: `skills/askit-build-skill/SKILL.md`, `skills/askit-build-skill/README.md`, `skills/askit-build-skill/references/authoring-guide.md`

- [ ] **Step 1: Create `skills/askit-build-skill/SKILL.md`**
```markdown
---
name: askit-build-skill
description: Creates and improves agentskills.io skills to the Advanced Skill Library Standard. Use when you need to author a new SKILL.md, scaffold a skill directory, or raise an existing skill's conformance and description quality.
metadata:
  version: 0.1.0
  tier: universal
  audience: beginner
---

# askit-build-skill

## Purpose
Author conformant skills. Two modes: `create` scaffolds a new skill that passes Bronze on first run; `improve` raises an existing skill toward the quality bar. Authoring depth is in `references/authoring-guide.md`.

## When to use
When the user asks to create, scaffold, write, or improve a skill.

## create mode
1. Brief interview: ask for the skill name (kebab-case), what it does, when to use it, and a few trigger keywords.
2. Create `skills/<name>/` and copy `templates/SKILL.md` into `skills/<name>/SKILL.md`.
3. Fill the frontmatter: `name` equal to the directory, and a `description` that states what AND when with concrete keywords (see `references/authoring-guide.md` for the bar).
4. Scaffold `references/` and `examples/` if the skill needs depth or samples. Do not assume the surrounding plugin anatomy exists - this skill works a la carte.
5. Run `askit-evaluate` on the new skill and report the result; iterate until it passes.

## improve mode
1. Run `node scripts/evaluate.mjs <skill> --json` and read the report.
2. For each finding: a samples warn -> add representative examples; a low description score (U5) -> rewrite the description to clear the bar; an over-budget warning (U7) -> move depth into `references/`.
3. Re-run evaluate to confirm the findings are resolved.

## Scope (v1)
Claude target only; multi-agent emission (`--agent-target`) arrives in a later phase. Authoring is performed inline by the running agent; a dedicated authoring subagent is a later addition.
```

- [ ] **Step 2: Create `skills/askit-build-skill/references/authoring-guide.md`**
```markdown
# Skill authoring guide

## The description bar (Standard sec 8.1)
A description MUST state what the skill does AND when to use it, and SHOULD include concrete trigger keywords. Tooling scores it 0-1 and warns below 0.7.
- State the action/output ("Converts ...", "Generates ...").
- State the trigger ("Use when ...").
- Use words a user would actually say.
- Third person; no "helps with", no vague verbs; no angle brackets or ALL-CAPS.

## Layout (Standard sec 10.2)
`skills/<name>/SKILL.md` (canonical), optional `references/` (lazy depth, one level), `examples/` (>= 3 golden + 1 anti, recommended), `HISTORY.md` (recommended at Bronze).

## Budget
Keep `SKILL.md` lean (well under 500 lines); push depth into `references/`.
```

- [ ] **Step 3: Create `skills/askit-build-skill/README.md`** (human view)
```markdown
# askit-build-skill (human overview)

Author and improve skills that conform to the Advanced Skill Library Standard.

**create:** interviews you briefly, scaffolds `skills/<name>/` from the template, and validates the result.
**improve:** reads an `evaluate` report and fixes what it flags (samples, description, budget).

Works a la carte inside any plugin. Agent-canonical instructions are in `SKILL.md`; the authoring rubric is in `references/authoring-guide.md`.
```

- [ ] **Step 4: Validate against the gate**

Run: `node scripts/evaluate.mjs skills/askit-build-skill`
Expected: component-scope report, **0 errors**. Fix the description (not the threshold) if U5 warns. Re-run until clean.

- [ ] **Step 5: Commit**

```bash
git add skills/askit-build-skill
git commit -m "feat(skill): askit-build-skill - create + improve authoring loop"
```

---

## Task 8: Regenerate INDEX + manifest, update AGENTS.md (dogfood the generators)

**Files:**
- Modify: `INDEX.md`, `AGENTS.md`
- Create: `manifest.generated.json`

- [ ] **Step 1: Regenerate INDEX.md and the manifest from the live repo**

Run:
```bash
node scripts/generators/gen-index.mjs . --write
node scripts/generators/gen-manifest.mjs . --write
```
This rewrites `INDEX.md` to list `askit-build-skill` and `askit-evaluate` with their descriptions, and creates `manifest.generated.json`.

- [ ] **Step 2: Update `AGENTS.md`** - replace the "no skills yet" statement with the two skills and a one-line pointer to the loop. Specifically, in the "Current state" section, change the "There are no skills yet" line to:
```markdown
- Skills: `askit-build-skill` (author/improve skills) and `askit-evaluate` (assess conformance). The core loop is build-skill (create) -> askit-evaluate -> build-skill (improve).
```
And in "Build / test / lint", note: `node scripts/evaluate.mjs <path>` assesses a skill or plugin.

- [ ] **Step 3: Verify the gate is still green on the repo**

Run: `node scripts/check.mjs`
Expected: 0 errors. The U8 "no skills" warning is now gone (skills exist). `manifest.generated.json` matches disk (no drift). If `gen-index` produced a different INDEX shape than the hand-authored one, that is fine - the generated form is now canonical for the skills list; ensure the foundation-document links the seed added by hand are not lost (if `gen-index` only emits the skills list, manually re-add the foundation-doc table that the Phase 0 INDEX had, below the generated skills section, OR keep the hand-authored INDEX and instead just verify it lists both skills - choose whichever keeps `node scripts/check.mjs` green and the human map complete).

- [ ] **Step 4: Commit**

```bash
git add INDEX.md AGENTS.md manifest.generated.json
git commit -m "docs(gen): regenerate INDEX + manifest for the new skills; AGENTS.md loop pointer"
```

---

## Task 9: Public documentation (Diataxis, human-facing)

**Files:**
- Create: `docs/how-to/build-and-evaluate-a-skill.md`, `docs/reference/askit-build-skill.md`, `docs/reference/askit-evaluate.md`, `docs/explanation/conformance-and-tiers.md`

These are human docs; the single source of truth (the `description`) lives in the skill frontmatter - these link to or quote it, never re-define it.

- [ ] **Step 1: Create `docs/how-to/build-and-evaluate-a-skill.md`**
```markdown
# How to build and evaluate a skill

A walkthrough of the core loop: create a skill, evaluate it, improve it.

## 1. Create
Invoke `askit-build-skill` (create mode). It asks for the name, what the skill does, when to use it, and trigger keywords, then scaffolds `skills/<name>/SKILL.md` from the template.

## 2. Evaluate
Run the assessment:
```
node scripts/evaluate.mjs skills/<name>
```
You get per-rule findings, and (for a whole plugin) the tier and what blocks the next one.

## 3. Improve
Invoke `askit-build-skill` (improve mode). It reads the evaluate report and fixes what it flags - tightening the description, adding samples, or moving depth into `references/`.

Repeat evaluate until the report is clean.
```

- [ ] **Step 2: Create `docs/reference/askit-evaluate.md`**
```markdown
# Reference: askit-evaluate

Assesses a known, local skill or plugin against the Standard.

- **Scope:** auto-detected. `library.json` present -> plugin; `SKILL.md` only -> component.
- **Command:** `node scripts/evaluate.mjs <path> [--json]`
- **Output:** per-rule findings (`error`/`warn`), tier + blocked list (plugin scope), summary counts. See the skill's `references/report-format.md` for the JSON shape.
- **Exit code:** non-zero when there is at least one error.
- **Out of scope (v1):** behavioral and qualitative review modes.
```

- [ ] **Step 3: Create `docs/reference/askit-build-skill.md`**
```markdown
# Reference: askit-build-skill

Creates and improves skills to the Standard. Claude target (v1).

- **create:** interview -> scaffold from `templates/SKILL.md` -> fill frontmatter -> evaluate.
- **improve:** consume `evaluate --json` -> resolve findings (description, samples, budget) -> re-evaluate.
- **A la carte:** works inside any plugin; does not require the full anatomy.
- **Authoring bar:** see the skill's `references/authoring-guide.md`.
```

- [ ] **Step 4: Create `docs/explanation/conformance-and-tiers.md`**
```markdown
# Explanation: conformance and tiers

The toolkit grades a plugin against the Advanced Skill Library Standard. Checks emit `error` or `warn` findings keyed to requirement ids (for example `U5` is the description-quality rule). `evaluate` composes those checks into a report; `tier-report` rolls them into the highest tier a plugin satisfies, capped at the tier it declares in `library.json` so it cannot over-claim.

A description scoring below 0.7 is a warning, never an error - quality is judgment, so the heuristic guides rather than gates. The tiers (Universal/Convergent/Advanced, or Bronze/Silver/Gold) are cumulative: each includes the last. This is why a Bronze plugin can grow into Silver and Gold without rework.
```

- [ ] **Step 5: Verify internal links + gate**

Run: `node scripts/check.mjs`
Expected: 0 errors (these docs are not skills, so they are not gated by U6, but keep the relative links correct by inspection). Confirm the suite is green: `npm test`.

- [ ] **Step 6: Commit**

```bash
git add docs/how-to docs/reference docs/explanation
git commit -m "docs: Diataxis how-to/reference/explanation for the build+evaluate loop"
```

---

## Task 10: Recorded manual dogfood (behavioral proof)

**Files:**
- Create: `dogfood/2026-05-NN_build-evaluate-improve.md` (gitignored)

This is the one behavioral check (not automatable in CI this phase). Execute the loop by actually following the authored skills.

- [ ] **Step 1: Run create.** Following `skills/askit-build-skill/SKILL.md` create mode, author a throwaway skill (e.g. `skills/tmp-demo-skill/`) with a deliberately mediocre description.
- [ ] **Step 2: Evaluate.** Run `node scripts/evaluate.mjs skills/tmp-demo-skill --json`. Capture the report. Confirm it surfaces the weak description (U5 warn) and any missing pieces.
- [ ] **Step 3: Improve.** Following improve mode, rewrite the description to clear 0.7 and add what the report asked for. Re-run evaluate; confirm clean.
- [ ] **Step 4: Record.** Write the transcript + before/after into `dogfood/<date>_build-evaluate-improve.md`. Then DELETE `skills/tmp-demo-skill/` (it was a throwaway; do not leave it in the repo, or it becomes a permanent component the gate validates).
- [ ] **Step 5: Confirm the repo is clean and green**

Run: `git status --short` (no stray `skills/tmp-demo-skill`), then `npm test && node scripts/check.mjs`.
Expected: suite green; gate 0 errors. No commit needed if only the gitignored dogfood file changed; if you want the dogfood note tracked, it is under `_local/` (gitignored) by design - leave it local.

---

## Task 11: CHANGELOG + final verification

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Update `CHANGELOG.md`** under `## [Unreleased]` -> `### Added`:
```
- `scripts/evaluate.mjs`: conformance-core assessment report (plugin + component scope) over the Phase 1 checks; CLI + `--json`.
- `askit-evaluate` skill: natural-language front door that runs the conformance assessment and presents findings + tier + remediation.
- `askit-build-skill` skill: create + improve modes that author conformant skills and consume the evaluate report to fix findings (Claude target; subagent delegation and multi-agent emission deferred to Phase 3).
- `templates/SKILL.md` skeleton; regenerated `INDEX.md` + `manifest.generated.json`.
- Dual documentation: per-skill `SKILL.md` + `README.md` + `references/`, and Diataxis `docs/how-to` + `docs/reference` + `docs/explanation` for the build/evaluate loop.
- The toolkit now contains and self-validates its own skills at Bronze (the build-skill -> evaluate -> improve proof loop).
```

- [ ] **Step 2: Full verification** (the CI commands)

Run: `npm ci && npm test && node scripts/check.mjs`
Expected: tests green (Phase 1 + new evaluate/template tests); gate exits 0; `node scripts/tier-report.mjs --json` still reports `{"tier":"universal","satisfies":["universal"],"blocked":{}}`.

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: changelog for the Phase 2 authoring + assessment loop"
```

---

## Self-Review

**1. Spec coverage (against PHASE-2-DESIGN.md):**
- `scripts/evaluate.mjs` (plugin + component scope, report shape, scope detection, CLI) -> Tasks 2-4. COVERED.
- `askit-evaluate` skill + references -> Task 6. COVERED.
- `askit-build-skill` skill (create + improve, consumes evaluate --json, references) -> Task 7. COVERED.
- `templates/SKILL.md` -> Task 5. COVERED.
- Dual documentation (agent: SKILL.md + references + AGENTS.md; human: README + INDEX + Diataxis docs) -> Tasks 6, 7, 8, 9. COVERED.
- Self-validation (new skills pass the gate; seed-bronze gains teeth) -> validation steps in Tasks 6, 7, 8, 11. COVERED.
- Manual recorded dogfood -> Task 10. COVERED.
- Generators dogfooded (gen-index, gen-manifest) -> Task 8. COVERED.
- Deferred items (subagents, Codex, behavioral/review) -> documented as out-of-scope in the skill bodies (Tasks 6, 7). COVERED.

**2. Placeholder scan:** the only "REPLACE-..." text is inside `templates/SKILL.md` by design (it is a fill-in template). No TODO/TBD in implementation steps. Authored-doc tasks give exact frontmatter (the part that must pass checks) and full body content.

**3. Type consistency:** `evaluate(target)` returns `{scope, target, findings, byRule, summary{errors,warns}}` plus `{tier, satisfies, blocked}` for plugin scope only; `loadSkill(dir)` returns the Phase 1 `SkillInfo` shape; `checkAgentskills(ctx)` consumes `{root, skills}`. `formatReport`/CLI use `r.summary.errors`. Names consistent across Tasks 1-4.

## Open carry-forwards into Phase 3
- Refactor inline authoring/scanning into the `skill-author` / `evaluator` subagents (Convergent) when the toolkit declares Silver.
- Add `--agent-target` (Codex) emission to `build-skill`.
- `evaluate` behavioral (`quality-grader`) and review (`reviewer`) modes.
- If `gen-index` overwrote the hand-authored foundation-doc map, reconcile the generated INDEX with the human foundation section (decide the INDEX generator's full template at Gold/G4).
