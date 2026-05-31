# Phase 3C-2a Implementation Plan (Option A - subagents Claude-only)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `askit-build-subagent` (a Claude subagent authoring skill) and make the toolkit's own Silver claim real by dogfooding two subagents (`skill-author`, `evaluator`) wired into a real chain contract, completing S4 orphan detection along the way.

**Architecture:** Subagents are Claude-only for plugin distribution (Codex v0.135 plugins cannot ship `[agents.*]` - see the spike note; decision: Option A). The canonical subagent is `agents/<name>.md` (no Codex render). `load-plugin` gains `ctx.subagents`; S3 (`components-index`) validates `components.subagents` symmetrically with skills; S4 (`chain-contract`) gains orphan detection driven by frontmatter `chain:` lists; the skills delegate to the subagents via `chain:` frontmatter, creating the toolkit's first real inter-component chain. The shared per-target emission harness is OUT of scope (subagents have no second target to emit) and moves to 3C-2b's first dual-target builder. STANDARD sec 3.3/10.1 are corrected to state Codex subagents are config-level, not plugin-level.

**Tech Stack:** Node >= 20, ESM `.mjs`, `node:test` + `node:assert/strict`, one runtime dep `yaml`. Tests auto-discovered under `tests/**/*.test.mjs`. No em-dash (U+2014) / en-dash (U+2013) anywhere.

**Out of scope (deferred to 3C-2b+, do NOT build here):** `gen-subagent.mjs` / `renderCodexAgentToml` / `renderCodexAgentsConfig`; `.codex-plugin/config.toml [agents.*]`; component-level (per-target) S6 and its codex branch; the Codex subagent round-trip test; `docs/reference/builder-pattern.md` and the shared harness contract; workflow-step orphan detection (arrives with `build-workflow`).

**Repo state at start:** main @ `a672485`, tag `v0.2.0`, clean tree, `tier: convergent`, 107 tests green. Branch `phase-3c-2a` off main before Task B.

---

## Task A: Codex subagent spike - DONE (no code)

Completed 2026-05-29 before this plan. `codex --version` = 0.135.0 (unchanged). The authoritative `[agents.*]` / `AgentRoleToml` / role-file schema is pinned in `spikes/2026-05-27_codex-plugin-format.md`. The spike found that Codex plugins cannot register subagents (no `agents` field in `plugin.json`; `[agents.*]` is user/project `config.toml` only). Maintainer chose Option A. This is the basis for the whole re-scope; no further spike work.

- [x] Spike complete, schema pinned, blocker recorded, Option A chosen.

---

## Task B: STANDARD revision (sec 3.3 + 10.1) - Codex subagents are config-level

**Files:**
- Modify: `STANDARD.md:155-156` (sec 3.3 CX format + Rules)
- Modify: `STANDARD.md:351` (sec 10.1 layout line for `.codex-plugin/config.toml`)

No automated check validates STANDARD.md prose, so this task has no unit test; verification is the dash scan + a read-back. The `standard` version stays `"0.8"` (this corrects the existing v0.8 Codex contract rather than introducing a new contract; a version bump would ripple into `library.json` and is not warranted for a correction).

- [ ] **Step 1: Revise sec 3.3 CX format + Rules**

Replace the `**CX format:**` and `**Rules:**` bullets at `STANDARD.md:155-156` with:

```markdown
- **CX format:** Codex custom agents are declared in a `config.toml` `[agents.<name>]` table (`description`, `config_file`, optional `nickname_candidates`) with the role defined in a per-agent TOML (e.g., `agents/<name>.toml`). **As of Codex CLI v0.135 these are a USER/PROJECT `config.toml` concern, NOT a plugin-distributable component:** the Codex plugin manifest (`plugin.json`) has no `agents` field (its component pointers are `skills`/`hooks`/`mcpServers`/`apps`), and `[agents.*].config_file` resolves relative to the `config.toml` that defines it, with no plugin-to-config merge path. A distributed plugin therefore CANNOT ship Codex-ingested subagents; subagents are effectively a Claude-only component for plugin distribution until Codex adds an `agents` manifest field. Built-in Codex roles include default/worker/explorer.
- **Rules:** a subagent MUST declare its purpose and the narrowest tool set it needs. A subagent that may be invoked by skills MUST appear in a chain contract (3.6). A subagent declares its target agents via `agent-targets` (3.7); because Codex does not ingest plugin-shipped subagents (above), a subagent distributed in a plugin targets Claude (`agent-targets: [claude]`). The "emit both formats" rule applies to components Codex CAN ingest as a plugin (skills, hooks, MCP); it does NOT apply to subagents under the current Codex plugin model.
```

- [ ] **Step 2: Revise sec 10.1 layout line**

Replace `STANDARD.md:351` with:

```markdown
  .codex-plugin/config.toml      Codex MCP entries (mcp_servers) generated for the plugin (3.9). NOTE: Codex subagents ([agents.*]) are NOT plugin-shipped (3.3) - they are user/project config.toml only.  [agent]
```

- [ ] **Step 3: Dash scan + commit**

Run: `node -e "const fs=require('fs');const d=String.fromCharCode(0x2013,0x2014);const t=fs.readFileSync('STANDARD.md','utf8');const bad=[...t].some(c=>d.includes(c));process.exit(bad?1:0)"`
Expected: exit 0 (no dashes).

```bash
git add STANDARD.md
git commit -m "docs(standard): correct Codex subagent contract - config-level, not plugin-level (sec 3.3/10.1)"
```

---

## Task C: ctx.subagents in load-plugin (+ fs-utils helper)

**Files:**
- Modify: `scripts/lib/fs-utils.mjs` (add `listAgentFiles`)
- Modify: `scripts/lib/load-plugin.mjs` (add `loadSubagent` + `ctx.subagents`)
- Test: `tests/unit/load-plugin.test.mjs` (extend)
- Test fixture: `tests/fixtures/golden/subagent-fixture/` (new; reused by Tasks D + E)

- [ ] **Step 1: Create the shared golden fixture** (a minimal plugin with one subagent + a valid chain)

Create `tests/fixtures/golden/subagent-fixture/library.json`:

```json
{
  "name": "subagent-fixture",
  "version": "0.1.0",
  "tier": "convergent",
  "prefix": "sf-",
  "agent-targets": ["claude"],
  "components": {
    "skills": [
      { "name": "sf-caller", "path": "skills/sf-caller/SKILL.md", "version": "0.1.0", "tier": "universal", "status": "active" }
    ],
    "subagents": [
      { "name": "sf-worker", "path": "agents/sf-worker.md", "version": "0.1.0", "tier": "convergent", "status": "active" }
    ]
  }
}
```

Create `tests/fixtures/golden/subagent-fixture/AGENTS.md`:

```markdown
# subagent-fixture
Test plugin: one skill that chains to one subagent.
```

Create `tests/fixtures/golden/subagent-fixture/skills/sf-caller/SKILL.md`:

```markdown
---
name: sf-caller
description: Calls the worker subagent to do a thing. Use when delegating work to sf-worker.
chain:
  - sf-worker
metadata:
  version: 0.1.0
---
# sf-caller
Delegates to sf-worker.
```

Create `tests/fixtures/golden/subagent-fixture/agents/sf-worker.md`:

```markdown
---
name: sf-worker
description: Performs the delegated work. Use when sf-caller hands off a bounded task.
tools:
  - Read
metadata:
  version: 0.1.0
  tier: convergent
  status: active
  agent-targets:
    - claude
---
# sf-worker
A bounded worker subagent.
```

Create `tests/fixtures/golden/subagent-fixture/agents/_chain-permitted.yaml`:

```yaml
sf-caller:
  - sf-worker
```

- [ ] **Step 2: Write the failing test** (append to `tests/unit/load-plugin.test.mjs`)

```javascript
test("loads subagents from agents/*.md into ctx.subagents", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "golden/subagent-fixture"));
  assert.equal(ctx.subagents.length, 1);
  assert.equal(ctx.subagents[0].name, "sf-worker");
  assert.equal(ctx.subagents[0].frontmatter.name, "sf-worker");
  assert.deepEqual(ctx.subagents[0].frontmatter.chain ?? null, null);
  assert.equal(ctx.subagents[0].parseError, null);
});

test("ctx.subagents excludes _chain-permitted.yaml and is empty when no agents/ dir", () => {
  const ctx = loadPlugin(path.join(FIXTURES, "golden/minimal-skill"));
  assert.deepEqual(ctx.subagents, []);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test tests/unit/load-plugin.test.mjs`
Expected: FAIL with `ctx.subagents` undefined (cannot read `.length`).

- [ ] **Step 4: Add `listAgentFiles` to `scripts/lib/fs-utils.mjs`**

Append after `listSkillDirs` (before `walkFiles`):

```javascript
/** Absolute paths of agents/*.md subagent definitions, excluding _-prefixed control files (_chain-permitted.yaml, _pairing.yaml). */
export function listAgentFiles(root) {
  const agentsRoot = path.join(root, "agents");
  if (!existsSync(agentsRoot) || !statSync(agentsRoot).isDirectory()) return [];
  return readdirSync(agentsRoot)
    .filter((name) => name.endsWith(".md") && !name.startsWith("_"))
    .map((name) => path.join(agentsRoot, name))
    .filter((p) => fileExists(p));
}
```

- [ ] **Step 5: Add `loadSubagent` + `ctx.subagents` to `scripts/lib/load-plugin.mjs`**

Change the import line to add `listAgentFiles`:

```javascript
import { readJsonSafe, fileExists, listSkillDirs, listAgentFiles } from "./fs-utils.mjs";
```

Add `loadSubagent` after `loadSkill`:

```javascript
/** Load one agents/<name>.md into a SubagentInfo (parallel to loadSkill). Read failure becomes a parseError (fail-safe). */
export function loadSubagent(file) {
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

In `loadPlugin`, after the `skills` line add:

```javascript
  const subagents = listAgentFiles(root).map((f) => loadSubagent(f));
```

And add `subagents` to the returned object:

```javascript
  return { root, library, agentsMdPath, skills, subagents, claudeManifest: claude.data, codexManifest: codex.data };
```

- [ ] **Step 6: Run test to verify it passes**

Run: `node --test tests/unit/load-plugin.test.mjs`
Expected: PASS (all load-plugin tests).

- [ ] **Step 7: Run the full suite to confirm no regression**

Run: `npm test`
Expected: all pass (now 109+).

- [ ] **Step 8: Commit**

```bash
git add scripts/lib/fs-utils.mjs scripts/lib/load-plugin.mjs tests/unit/load-plugin.test.mjs tests/fixtures/golden/subagent-fixture
git commit -m "feat(load-plugin): expose ctx.subagents from agents/*.md (Standard sec 3.3)"
```

---

## Task D: S3 validates components.subagents (components-index)

**Files:**
- Modify: `scripts/checks/components-index.mjs` (add a subagent branch)
- Test: `tests/unit/components-index.test.mjs` (extend)

- [ ] **Step 1: Write the failing tests** (append to `tests/unit/components-index.test.mjs`)

```javascript
test("S3: golden subagent-fixture has matching subagents index - no error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "golden/subagent-fixture")));
  assert.equal(r.filter((f) => f.severity === "error").length, 0);
});

test("S3 flags a declared subagent missing on disk", () => {
  const ctx = { library: { data: { components: { skills: [], subagents: [{ name: "ghost" }] } } }, skills: [], subagents: [] };
  assert.ok(check(ctx).some((f) => f.reqId === "S3" && /ghost/.test(f.message) && /not on disk/.test(f.message)));
});

test("S3 flags an on-disk subagent not declared", () => {
  const ctx = { library: { data: { components: { skills: [], subagents: [] } } }, skills: [], subagents: [{ name: "rogue" }] };
  assert.ok(check(ctx).some((f) => f.reqId === "S3" && /rogue/.test(f.message) && /not declared/.test(f.message)));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/components-index.test.mjs`
Expected: FAIL (the `ghost`/`rogue` assertions fail; subagents are not yet validated).

- [ ] **Step 3: Implement the subagent branch in `scripts/checks/components-index.mjs`**

Immediately before the final `return out;`, insert (parallel to the skills block):

```javascript
  const declaredSubagents = Array.isArray(components.subagents) ? components.subagents : [];
  const onDiskSubagentNames = new Set((ctx.subagents || []).map((s) => s.name));
  const declaredSubagentNames = new Set();
  for (const c of declaredSubagents) {
    if (!c || typeof c.name !== "string") {
      out.push(finding(meta.id, SEVERITY.ERROR, "library.json components.subagents entry is missing required string \"name\".", { file: "library.json", reqId: meta.reqId }));
      continue;
    }
    declaredSubagentNames.add(c.name);
    if (!onDiskSubagentNames.has(c.name)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `library.json components.subagents declares "${c.name}" but it is not on disk under agents/.`, { file: "library.json", reqId: meta.reqId }));
    }
  }
  for (const s of (ctx.subagents || [])) {
    if (!declaredSubagentNames.has(s.name)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `agents/${s.name}.md exists on disk but is not declared in library.json components.subagents.`, { file: "library.json", reqId: meta.reqId }));
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/components-index.test.mjs`
Expected: PASS.

- [ ] **Step 5: Full suite + commit**

Run: `npm test` (expected: all pass; the repo has no subagents yet so its own S3 is unaffected).

```bash
git add scripts/checks/components-index.mjs tests/unit/components-index.test.mjs
git commit -m "feat(S3): validate library.json components.subagents against disk (Standard sec 5.1)"
```

---

## Task E: S4 orphan detection (chain-contract) + anti fixture

**Files:**
- Modify: `scripts/checks/chain-contract.mjs` (known += subagents; orphan detection; refined conditional)
- Test: `tests/unit/chain-contract.test.mjs` (extend)
- Test fixture: `tests/fixtures/anti/chain-orphan/` (new)

Scope note: orphan detection here is driven by frontmatter `chain:` lists on skills/subagents (the dogfooded case). Workflow-step orphan detection arrives with `build-workflow` in 3C-2b (the repo has no `_workflows/` yet).

- [ ] **Step 1: Create the anti fixture** `tests/fixtures/anti/chain-orphan/`

Create `tests/fixtures/anti/chain-orphan/library.json`:

```json
{
  "name": "chain-orphan",
  "version": "0.1.0",
  "tier": "convergent",
  "agent-targets": ["claude"],
  "components": { "skills": [{ "name": "co-caller", "path": "skills/co-caller/SKILL.md", "version": "0.1.0", "tier": "universal", "status": "active" }] }
}
```

Create `tests/fixtures/anti/chain-orphan/AGENTS.md`:

```markdown
# chain-orphan
A caller declares a chain invocation the contract does not permit (S4 orphan).
```

Create `tests/fixtures/anti/chain-orphan/skills/co-caller/SKILL.md`:

```markdown
---
name: co-caller
description: Declares it invokes co-worker, which the chain contract does not permit. Use to exercise S4 orphan detection.
chain:
  - co-worker
metadata:
  version: 0.1.0
---
# co-caller
Steps.
```

Create `tests/fixtures/anti/chain-orphan/agents/_chain-permitted.yaml`:

```yaml
co-caller: []
```

- [ ] **Step 2: Write the failing tests** (append to `tests/unit/chain-contract.test.mjs`)

```javascript
test("chain-orphan fixture: a frontmatter chain invocation not permitted by the contract is an S4 orphan", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/chain-orphan")));
  assert.ok(r.some((f) => f.reqId === "S4" && /co-caller/.test(f.message) && /co-worker/.test(f.message) && /orphan/.test(f.message)));
});

test("golden subagent-fixture: chain fully permitted - no findings", () => {
  assert.deepEqual(check(loadPlugin(path.join(FIXTURES, "golden/subagent-fixture"))), []);
});

test("subagents are in the known set (a subagent caller is not a phantom)", () => {
  // sf-worker is a real subagent; a contract entry for it must not be flagged as a phantom caller.
  const r = check(loadPlugin(path.join(FIXTURES, "golden/subagent-fixture")));
  assert.ok(!r.some((f) => /sf-worker/.test(f.message) && /phantom/.test(f.message)));
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test tests/unit/chain-contract.test.mjs`
Expected: FAIL (orphan not detected; the subagent-fixture currently has no orphan logic so the golden case may also surface the unhandled `chain:`).

- [ ] **Step 4: Rewrite `scripts/checks/chain-contract.mjs`**

Replace the body of `check(ctx)` from the `const known = ...` section and the conditional logic with the version below. Full file:

```javascript
import { finding, SEVERITY } from "../lib/findings.mjs";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

export const meta = { id: "chain-contract", tier: "convergent", reqId: "S4" };

function isDir(p) { return existsSync(p) && statSync(p).isDirectory(); }
function isFile(p) { return existsSync(p) && statSync(p).isFile(); }

export function check(ctx) {
  const out = [];
  const contractPath = path.join(ctx.root, "agents", "_chain-permitted.yaml");
  const workflowsDir = path.join(ctx.root, "_workflows");
  const hasContract = isFile(contractPath);
  const hasWorkflows = isDir(workflowsDir);

  const components = [...(ctx.skills || []), ...(ctx.subagents || [])];
  // A component "declares an invocation" via a frontmatter `chain:` list (Standard sec 3.6, 3.8).
  const declaredChains = components
    .map((c) => ({
      name: c.name,
      chain: Array.isArray(c.frontmatter?.chain) ? c.frontmatter.chain.filter((x) => typeof x === "string") : [],
    }))
    .filter((c) => c.chain.length > 0);

  // Conditional: chaining is "in use" iff a contract OR workflows OR a frontmatter chain declaration exists.
  const chainingInUse = hasContract || hasWorkflows || declaredChains.length > 0;
  if (!chainingInUse) return [];

  if (!hasContract) {
    out.push(finding(meta.id, SEVERITY.ERROR, "chaining is used (a component declares a frontmatter `chain:` or _workflows/ is present) but agents/_chain-permitted.yaml is missing (chain contract is REQUIRED when chaining is used; Standard sec 3.6).", { file: "agents/_chain-permitted.yaml", reqId: meta.reqId }));
    return out;
  }

  let contract;
  try {
    contract = parseYaml(readFileSync(contractPath, "utf8"));
  } catch (e) {
    out.push(finding(meta.id, SEVERITY.ERROR, `agents/_chain-permitted.yaml is not valid YAML: ${e.message}`, { file: "agents/_chain-permitted.yaml", reqId: meta.reqId }));
    return out;
  }
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    out.push(finding(meta.id, SEVERITY.ERROR, "agents/_chain-permitted.yaml must be a key/value map of component-name -> allowed invocations (Standard sec 3.6).", { file: "agents/_chain-permitted.yaml", reqId: meta.reqId }));
    return out;
  }

  const known = new Set(components.map((c) => c.name));
  // Phantom detection: contract names that match no on-disk component.
  for (const [caller, callees] of Object.entries(contract)) {
    if (!known.has(caller)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `chain-permitted contract names caller "${caller}" but no on-disk component is known by that name (phantom; Standard sec 3.6).`, { file: "agents/_chain-permitted.yaml", reqId: meta.reqId }));
    }
    if (Array.isArray(callees)) {
      for (const callee of callees) {
        if (typeof callee === "string" && !known.has(callee)) {
          out.push(finding(meta.id, SEVERITY.ERROR, `chain-permitted contract entry "${caller}" -> "${callee}" points at a missing component (phantom; Standard sec 3.6).`, { file: "agents/_chain-permitted.yaml", reqId: meta.reqId }));
        }
      }
    }
  }
  // Orphan detection: a declared (frontmatter chain) invocation not permitted by the contract.
  for (const { name, chain } of declaredChains) {
    const permitted = new Set(Array.isArray(contract[name]) ? contract[name].filter((x) => typeof x === "string") : []);
    for (const target of chain) {
      if (!permitted.has(target)) {
        out.push(finding(meta.id, SEVERITY.ERROR, `"${name}" declares (frontmatter chain) that it may invoke "${target}" but agents/_chain-permitted.yaml does not permit "${name}" -> "${target}" (orphan; Standard sec 3.6).`, { file: "agents/_chain-permitted.yaml", reqId: meta.reqId }));
      }
    }
  }
  return out;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/unit/chain-contract.test.mjs`
Expected: PASS (orphan detected; golden subagent-fixture clean; existing chain-phantom + silver-fixture tests still green).

- [ ] **Step 6: Full suite + commit**

Run: `npm test` (expected: all pass; repo still has no chaining so its S4 is conditional-untriggered and green).

```bash
git add scripts/checks/chain-contract.mjs tests/unit/chain-contract.test.mjs tests/fixtures/anti/chain-orphan
git commit -m "feat(S4): complete chain-contract orphan detection from frontmatter chain: (Standard sec 3.6)"
```

---

## Task F: askit-build-subagent skill (Claude subagent authoring)

**Files:**
- Create: `templates/agent.md` (subagent scaffold)
- Create: `skills/askit-build-subagent/SKILL.md`
- Create: `skills/askit-build-subagent/references/authoring-subagents.md`
- Modify: `library.json` (add `askit-build-subagent` to `components.skills`)
- Regen: `manifest.generated.json` (+ native manifests, idempotent)
- Test: covered by `node scripts/evaluate.mjs skills/askit-build-subagent --json` (0 errors)

- [ ] **Step 1: Create `templates/agent.md`** (the subagent scaffold the skill copies)

```markdown
---
name: REPLACE-with-kebab-case-name-matching-this-file
description: REPLACE - what this subagent does AND when to delegate to it, with concrete trigger keywords. Third person.
tools:
  - Read
model: inherit
chain: []
metadata:
  version: 0.1.0
  tier: convergent
  status: active
  agent-targets:
    - claude
---

# REPLACE-with-name

## Role
One paragraph: the bounded job this subagent owns.

## Tools
Why each tool in `tools` is needed (narrowest set; Standard sec 9). Remove `model`/`chain` if unused (`chain` only when this subagent invokes another).

## Steps
1. First step.
2. Second step.
```

- [ ] **Step 2: Create `skills/askit-build-subagent/SKILL.md`**

```markdown
---
name: askit-build-subagent
description: Creates and improves Claude subagents (agents/<name>.md) to the Advanced Skill Library Standard. Use when you need to author a new subagent, scaffold an agents/ delegate, declare its tools and chain, or raise an existing subagent's conformance.
metadata:
  version: 0.1.0
  tier: universal
  audience: intermediate
---

# askit-build-subagent

## Purpose
Author conformant subagents. Two modes: `create` scaffolds a new `agents/<name>.md` (frontmatter + role body); `improve` raises an existing subagent toward the quality bar. Subagents are Claude-only for plugin distribution (Codex v0.135 plugins cannot ship `[agents.*]`; Standard sec 3.3), so this skill emits no Codex artifact. Authoring depth is in [references/authoring-subagents.md](references/authoring-subagents.md).

## When to use
When the user asks to create, scaffold, write, or improve a subagent (an `agents/<name>.md` delegate).

## create mode
1. Brief interview: ask for the subagent name (kebab-case), the bounded job it owns, the narrowest tools it needs, and which components (if any) it may invoke. Skip the interview if these inputs are already in context.
2. Copy `templates/agent.md` into `agents/<name>.md`.
3. Fill the frontmatter: `name` equal to the file basename; a `description` that states what AND when (Standard sec 8.1); `tools` as the narrowest set (sec 9); optional `model`; `chain` listing components it may invoke (omit if none); `metadata.version`, `metadata.tier`, `metadata.status`, and `metadata.agent-targets: [claude]` (sec 3.3 - subagents are Claude-only for plugin distribution).
4. Register the subagent in `library.json` `components.subagents` as `{ name, path, version, tier, status }`.
5. If the subagent declares a `chain`, add the entry to `agents/_chain-permitted.yaml` (`<name>: [<invoked>, ...]`) so S4 has no orphan.
6. Assess with `node scripts/evaluate.mjs . --json` and iterate until 0 errors (S3 components index + S4 chain contract must be clean).

## improve mode
1. Run `node scripts/evaluate.mjs . --json` and read the report.
2. For each finding: an S3 error -> declare/undeclare the subagent in `components.subagents` to match disk; an S4 orphan -> add the missing `caller -> callee` to `agents/_chain-permitted.yaml`; an S4 phantom -> fix the contract entry or the component name. For any other finding, read its message and apply the fix it states.
3. Re-run evaluate to confirm.

## Scope
Claude-only: a subagent is `agents/<name>.md` (Claude auto-discovers it). Codex does not ingest plugin-shipped subagents (Standard sec 3.3), so there is no Codex render. Authoring is performed inline by the running agent; the toolkit's own `skill-author` subagent is the delegated authoring role for skills.
```

- [ ] **Step 3: Create `skills/askit-build-subagent/references/authoring-subagents.md`**

```markdown
# Authoring subagents (reference)

A subagent is a bounded delegate with its own tools and prompt, defined in `agents/<name>.md` (markdown + YAML frontmatter). Claude auto-discovers it and it is @-mentionable. Standard sec 3.3, 3.6, 3.8.

## Frontmatter contract (sec 3.8)
- `name` (kebab-case, equals the file basename).
- `description` (what + when + trigger keywords; sec 8.1).
- `tools` (the narrowest set the role needs; sec 9 - never grant more than the job requires).
- `model` (OPTIONAL; omit to inherit).
- `chain` (the components this subagent MAY invoke; declare only when it invokes another, and mirror it in `agents/_chain-permitted.yaml`).
- `metadata.version` (REQUIRED, semver), `metadata.tier`, `metadata.status`, `metadata.agent-targets: [claude]`.

## Claude-only (sec 3.3)
As of Codex CLI v0.135, a distributed plugin cannot register Codex subagents (`plugin.json` has no `agents` field; `[agents.*]` is user/project `config.toml` only). So a subagent shipped in a plugin targets Claude. Declare `agent-targets: [claude]`. There is no Codex artifact to generate.

## Chain safety (sec 3.6)
If a subagent (or a skill) invokes another component, that invocation MUST be permitted by `agents/_chain-permitted.yaml` (`caller: [callee, ...]`). Tooling flags a declared-but-unpermitted invocation as an orphan (S4) and a contract entry pointing at a missing component as a phantom.

## Tool scoping (sec 9)
Grant the fewest tools that let the role do its job. A read-only assessor needs read + the ability to run the validator, not write access. Document why each tool is present.
```

- [ ] **Step 4: Register the skill in `library.json`**

Add to `components.skills` (after `askit-evaluate`):

```json
      { "name": "askit-build-subagent", "path": "skills/askit-build-subagent/SKILL.md", "version": "0.1.0", "tier": "universal", "status": "active" }
```

- [ ] **Step 5: Regenerate manifests**

Run: `node scripts/generators/gen-manifest.mjs . --write --target=all`
Expected: `manifest.generated.json` skills list now includes `askit-build-subagent`; native manifests unchanged (name/version stable).

- [ ] **Step 6: Evaluate the new skill**

Run: `node scripts/evaluate.mjs skills/askit-build-subagent --json`
Expected: 0 errors. If U5 (description score) or U7 (instruction budget) warns, tighten the description / move depth into `references/` until clean.

- [ ] **Step 7: Full suite + commit**

Run: `npm test` (expected: all pass; components-index S3 sees the new skill declared + on disk).

```bash
git add templates/agent.md skills/askit-build-subagent library.json manifest.generated.json .claude-plugin/plugin.json .codex-plugin/plugin.json
git commit -m "feat(skills): add askit-build-subagent (Claude subagent authoring; create/improve)"
```

---

## Task G: Dogfood - skill-author + evaluator subagents + chain contract + delegation

**Files:**
- Create: `agents/skill-author.md`
- Create: `agents/evaluator.md`
- Create: `agents/_chain-permitted.yaml`
- Modify: `library.json` (add `components.subagents`)
- Modify: `skills/askit-build-skill/SKILL.md` (add `chain:` frontmatter + delegate note; update line 32)
- Modify: `skills/askit-evaluate/SKILL.md` (add `chain:` frontmatter + delegate note)
- Regen: `manifest.generated.json` (idempotent; name/version stable)

This is the atomic step that makes the toolkit's Silver real: real subagents + a real chain. S3 and S4 are exercised on the repo here; the seed tests are the regression guard.

- [ ] **Step 1: Create `agents/skill-author.md`**

```markdown
---
name: skill-author
description: Authors and improves agentskills.io skills to the Advanced Skill Library Standard. Use when delegating skill creation or conformance work - the bounded role behind askit-build-skill.
tools:
  - Read
  - Write
  - Edit
  - Bash
chain:
  - evaluator
metadata:
  version: 0.1.0
  tier: convergent
  status: active
  agent-targets:
    - claude
---

# skill-author

## Role
The delegated authoring role behind `askit-build-skill`. Scaffolds `skills/<name>/`, writes a conformant `SKILL.md` (frontmatter + body), and iterates to 0 errors. Delegates assessment to `evaluator`.

## Tools
`Read`/`Write`/`Edit` to scaffold and edit skill files; `Bash` to copy the template and run `node scripts/generators/gen-manifest.mjs` / `node scripts/evaluate.mjs`. No broader access.

## Steps
1. Interview or read provided inputs (name, purpose, when-to-use, trigger keywords).
2. Scaffold `skills/<name>/` from `templates/SKILL.md`; fill frontmatter and body.
3. Emit native manifests for the declared targets (`gen-manifest --write --target=all`).
4. Delegate assessment to `evaluator`; apply its findings; iterate to 0 errors.
```

- [ ] **Step 2: Create `agents/evaluator.md`**

```markdown
---
name: evaluator
description: Assesses a skill or plugin against the Advanced Skill Library Standard and reports findings with remediation. Use when delegating conformance assessment - the bounded read-only role behind askit-evaluate.
tools:
  - Read
  - Bash
metadata:
  version: 0.1.0
  tier: convergent
  status: active
  agent-targets:
    - claude
---

# evaluator

## Role
The delegated assessment role behind `askit-evaluate`. Runs the validator and reports findings (severity, file, remediation). Read-only: it never edits the target.

## Tools
`Read` to inspect the target; `Bash` to run `node scripts/evaluate.mjs <target> --json`. No write access (assessment must not mutate what it grades).

## Steps
1. Run `node scripts/evaluate.mjs <target> --json`.
2. Parse the findings; group by severity and requirement id.
3. Report each finding with its file and the remediation its message states.
```

- [ ] **Step 3: Create `agents/_chain-permitted.yaml`**

```yaml
askit-build-skill:
  - skill-author
askit-evaluate:
  - evaluator
skill-author:
  - evaluator
```

- [ ] **Step 4: Add `components.subagents` to `library.json`**

Inside `components`, after the `skills` array, add:

```json
    "subagents": [
      { "name": "skill-author", "path": "agents/skill-author.md", "version": "0.1.0", "tier": "convergent", "status": "active" },
      { "name": "evaluator", "path": "agents/evaluator.md", "version": "0.1.0", "tier": "convergent", "status": "active" }
    ]
```

- [ ] **Step 5: Add `chain:` frontmatter + delegate note to `skills/askit-build-skill/SKILL.md`**

In the frontmatter, after `description:` and before `metadata:`, add:

```yaml
chain:
  - skill-author
```

Replace the Scope line (`skills/askit-build-skill/SKILL.md:32`) with:

```markdown
Emits for Claude and Codex: `library.json.agent-targets` declares which targets the plugin requires, and `gen-manifest.mjs --target=all|claude|codex` generates the matching native manifests. This skill delegates authoring to the `skill-author` subagent (the delegated path; permitted in `agents/_chain-permitted.yaml`), which in turn delegates assessment to `evaluator`.
```

- [ ] **Step 6: Add `chain:` frontmatter + delegate note to `skills/askit-evaluate/SKILL.md`**

In the frontmatter, after `description:` and before `metadata:`, add:

```yaml
chain:
  - evaluator
```

Add a sentence to its Scope/Purpose section noting it delegates assessment to the `evaluator` subagent (permitted in `agents/_chain-permitted.yaml`). (Read the file first; match its existing structure.)

- [ ] **Step 7: Regenerate manifests + evaluate the repo**

Run: `node scripts/generators/gen-manifest.mjs . --write --target=all`
Run: `node scripts/evaluate.mjs . --json`
Expected: 0 errors. S3 sees `skill-author`/`evaluator` declared + on disk; S4 sees the chain contract permits every declared `chain:` invocation (no orphans), and every contract entry maps to a real component (no phantoms).

- [ ] **Step 8: Run gate + tier-report + full suite**

Run: `node scripts/check.mjs` (expected: exit 0)
Run: `node scripts/tier-report.mjs --json` (expected: `{"tier":"convergent","satisfies":["universal","convergent"],"blocked":{}}`)
Run: `npm test` (expected: all pass, seed tests green - the regression guard confirms the dogfood did not break the repo's own Silver claim).

- [ ] **Step 9: Commit**

```bash
git add agents library.json manifest.generated.json .claude-plugin/plugin.json .codex-plugin/plugin.json skills/askit-build-skill/SKILL.md skills/askit-evaluate/SKILL.md
git commit -m "feat: dogfood skill-author + evaluator subagents and the toolkit's first chain contract"
```

---

## Task H: Docs + AGENTS.md/INDEX.md + CHANGELOG

**Files:**
- Create: `docs/how-to/build-a-subagent.md`
- Create: `docs/reference/askit-build-subagent.md`
- Modify: `docs/reference/silver-checks.md` (refine S4 row: orphan detection complete; note subagents Claude-only)
- Modify: `AGENTS.md` + `INDEX.md` (regen if generated; else edit to list subagents + chain contract + build-subagent)
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Create `docs/how-to/build-a-subagent.md`** (Diataxis how-to; mirror `docs/how-to/build-and-evaluate-a-skill.md` structure - read it first)

Cover: when to reach for a subagent vs a skill; `create` via `askit-build-subagent`; declaring narrowest `tools`; declaring `chain` and mirroring it in `agents/_chain-permitted.yaml`; the Claude-only constraint (sec 3.3); running `evaluate` to 0 errors. Include the exact commands. No placeholders.

- [ ] **Step 2: Create `docs/reference/askit-build-subagent.md`** (mirror `docs/reference/askit-build-skill.md` - read it first)

Document the skill's two modes, inputs, the files it touches, and its outputs. State Claude-only emission.

- [ ] **Step 3: Refine `docs/reference/silver-checks.md`**

Update the S4 row to state orphan detection is complete (a frontmatter `chain:` invocation not permitted by `agents/_chain-permitted.yaml` is an orphan; a contract entry pointing at a missing component is a phantom). Add a note under S3/S4 that subagents are Claude-only for plugin distribution (sec 3.3), so component-level per-target presence for subagents is satisfied by the `.md`; the dual-target component S6 lands with 3C-2b. Read the file first and match its table format.

- [ ] **Step 4: Update AGENTS.md + INDEX.md**

Check for generators first: `node scripts/generators/sync-agents-md.mjs --help` and `node scripts/generators/gen-index.mjs --help` (read each script to learn its invocation). If AGENTS.md/INDEX.md are generated, regenerate them; otherwise edit by hand to list the two subagents, the chain contract, and the `askit-build-subagent` skill. Then run the gate to confirm no AGENTS.md drift (U-checks).

Run: `node scripts/check.mjs` (expected: exit 0; no drift findings).

- [ ] **Step 5: Update `CHANGELOG.md`**

Add an entry under the current section (read the file to match its format):

```markdown
### Added
- `askit-build-subagent` skill (Claude subagent authoring: create/improve).
- The toolkit's own `skill-author` and `evaluator` subagents and its first chain contract (`agents/_chain-permitted.yaml`), making the Silver claim non-vacuous.
- S3 now validates `library.json components.subagents` against disk.
- S4 chain-contract orphan detection (a frontmatter `chain:` invocation not permitted by the contract).

### Changed
- STANDARD sec 3.3/10.1: Codex subagents are a user/project `config.toml` concern, not a plugin-distributable component (Codex v0.135). Subagents are Claude-only for plugin distribution.
```

- [ ] **Step 6: Dash scan + commit**

Run the dash scan over the changed docs (reuse the Task B snippet per file, or scan the tree).

```bash
git add docs AGENTS.md INDEX.md CHANGELOG.md
git commit -m "docs: subagent how-to/reference, S4 refinements, Silver-real changelog"
```

---

## Task I: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Gate + evaluate + tier-report**

Run: `node scripts/check.mjs` -> exit 0
Run: `node scripts/evaluate.mjs .` -> exit 0
Run: `node scripts/tier-report.mjs --json` -> `{"tier":"convergent","satisfies":["universal","convergent"],"blocked":{}}`

- [ ] **Step 2: Full suite**

Run: `npm test`
Expected: all pass (107 baseline + the new load-plugin/components-index/chain-contract tests; seed tests green).

- [ ] **Step 3: Dash scan (whole tree)**

Run a scan for U+2013/U+2014 across changed files (build the needle from `String.fromCharCode(0x2013,0x2014)`, never literal dashes). Expected: clean.

- [ ] **Step 4: Working tree review**

Run: `git status --short` and `git diff --stat main` -> confirm only intended files changed; no generated file hand-edited.

---

## Self-review (run before handing to execution)

**Spec coverage (re-scoped design):**
- build-subagent skill -> Task F. Dogfood skill-author/evaluator -> Task G. Complete S4 orphan detection -> Task E. ctx.subagents -> Task C. components.subagents + S3 -> Tasks C (load) + D (validate). Standard sec 3.3/10.1 revision -> Task B. Docs/CHANGELOG -> Task H. Final verification -> Task I. Covered.
- Deferred items (gen-subagent.mjs, Codex subagent render/round-trip/S6-component, builder-pattern.md, workflow-step orphans) are explicitly out of scope per the design banner - no task, by design.

**Type/name consistency:** `ctx.subagents` (Task C) is consumed by `components-index` (Task D) and `chain-contract` (Task E) and the shape `{ name, frontmatter, body, parseError }` matches `loadSubagent`. `listAgentFiles` (Task C) is the only new fs-utils export. Subagent names (`skill-author`, `evaluator`, `sf-worker`, `co-caller`/`co-worker`) are used consistently across fixtures, contract, and assertions.

**Placeholder scan:** all code steps contain complete code; doc steps (Task H) state exact content requirements and say "read the sibling file first, match its format" rather than leaving prose TBD - acceptable for human-facing Diataxis docs that must match existing voice, but the how-to/reference must contain real commands, not stubs.

**Versioning:** plugin stays `0.2.0`; new components `0.1.0`; no tag (within the Silver milestone). U8 compares only name/version, so manifests stay drift-clean.
