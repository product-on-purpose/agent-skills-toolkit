# Phase 3B Multi-Agent Emission Spine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The toolkit emits its own Codex-native plugin manifest (`.codex-plugin/plugin.json`) from the canonical `library.json` (parallel to the Claude manifest), validates per-target manifest presence with a new S6 check, and proves the Codex artifact round-trips against the real `codex` CLI - shrinking the Silver burndown from `[S1, S3]` to `[S3]`.

**Architecture:** Extend the single existing generator (`scripts/generators/gen-manifest.mjs`) with two pure render functions and a `--target` flag (no file sprawl). Add a conditional Convergent check (S6) that fires only when `agent-targets` is declared, plus a small extension to the existing U8 drift check so the new Codex manifest is covered. Round-trip is a `node:test` integration test that runs for real locally and `skip`s when `codex` is absent (CI). The toolkit stays declared `universal`; convergent findings remain visible-but-non-gating via the existing `gateExitFromFindings` ceiling filter.

**Tech Stack:** Node >= 20, ESM `.mjs`, `node:test` + `node:assert/strict`, one runtime dep (`yaml`, not needed here), `node:child_process` for the round-trip probe. Source of truth: `STANDARD.md` v0.8 and `PHASE-3B-DESIGN.md`.

**Canonical inputs:** `PHASE-3B-DESIGN.md` (the approved spec), `spikes/2026-05-27_codex-plugin-format.md` (schema source of truth, re-verified at CLI v0.133.0 on 2026-05-28).

**Commit convention:** Every commit message MUST end with the trailer line:
`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
Per-step messages below show the subject line only; append the trailer at commit time. No em-dash (U+2014) or en-dash (U+2013) anywhere (a PreToolUse hook rejects them).

**Task-to-continuation-prompt mapping:** A=schema pin, B=generator, C=generate+commit, D=agent-targets (folds in the continuation prompt's Task H seed-test update for TDD red-green), E=S6 + U8 Codex coverage, F=`--agent-target`, G=round-trip test, I=docs (folds in INDEX/AGENTS housekeeping), J=CHANGELOG + exit gate.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `spikes/2026-05-27_codex-plugin-format.md` | Append | Pinned minimal `.codex-plugin/plugin.json` field set + working round-trip command recipe (Task A) |
| `scripts/generators/gen-manifest.mjs` | Extend | Add `renderClaudeNativeManifest`, `renderCodexNativeManifest`, `--target` CLI |
| `scripts/lib/load-plugin.mjs` | Modify | Expose `ctx.codexManifest` parallel to `ctx.claudeManifest` |
| `scripts/checks/per-target-presence.mjs` | Create | S6: per-target native-manifest presence (conditional on `agent-targets`) |
| `scripts/checks/manifest-drift.mjs` | Extend | U8: also compare `.codex-plugin/plugin.json` name/version |
| `scripts/lib/registry.mjs` | Modify | Register S6 |
| `library.json` | Modify | Add `author`, `keywords` (Task C); add `agent-targets` (Task D) |
| `.claude-plugin/plugin.json` | Regenerated | Now generated from `library.json` (was hand-authored) |
| `.codex-plugin/plugin.json` | Create (generated) | Codex native manifest for the toolkit |
| `skills/askit-build-skill/SKILL.md` | Update | `--agent-target` instructions; scope line |
| `skills/askit-build-skill/references/authoring-guide.md` | Update | Multi-agent emission section |
| `tests/integration/codex-roundtrip.test.mjs` | Create | Local round-trip (graceful skip in CI) |
| `tests/unit/gen-manifest.test.mjs` | Extend | Tests for the two new render functions + `--target` CLI |
| `tests/unit/manifest-drift.test.mjs` | Extend | Codex name/version drift cases |
| `tests/unit/per-target-presence.test.mjs` | Create | S6 unit tests (golden + anti + edge) |
| `tests/unit/load-plugin.test.mjs` | Extend (if it asserts ctx shape) | `ctx.codexManifest` presence |
| `tests/unit/seed-blocked-convergent.test.mjs` | Update | Now expects `[S3]` only |
| `tests/unit/seed-bronze.test.mjs` | Update | `blocked.convergent` now `S3` only (S1 closed) |
| `tests/fixtures/golden/silver-fixture/.claude-plugin/plugin.json` | Create | So S6 passes for the golden silver fixture |
| `tests/fixtures/golden/silver-fixture/.codex-plugin/plugin.json` | Create | So S6 passes for the golden silver fixture |
| `tests/fixtures/anti/missing-codex-manifest/` | Create | Declares `codex` target, no `.codex-plugin` manifest (S6 anti) |
| `docs/how-to/emit-for-multiple-agents.md` | Create | Walkthrough of `--agent-target` + the two manifests |
| `docs/reference/silver-checks.md` | Update | Add S6 row; "Five" -> "Six" |
| `docs/reference/askit-build-skill.md` | Update | Document `--agent-target` |
| `docs/explanation/conformance-and-tiers.md` | Update | Add S6 to the table; burndown note |
| `AGENTS.md` | Update | S1-S6; native manifests now generated |
| `INDEX.md` | Update (if it states manifests are hand-authored) | Consistency |
| `CHANGELOG.md` | Update | `[Unreleased]` entries |

---

## Task A: Pin the Codex plugin.json schema + record the round-trip recipe (spike)

This is an investigation task (no failing test). It de-risks Tasks B and G by determining the exact minimal `.codex-plugin/plugin.json` Codex accepts and the exact working CLI command sequence, recorded into the spike note. Local Windows + PowerShell; `codex` is on PATH at v0.133.0.

**Files:**
- Append: `spikes/2026-05-27_codex-plugin-format.md`
- Scratch (not committed): under `E:\tmp\codex-rt\`

- [ ] **Step 1: Re-confirm the CLI version**

Run: `codex --version`
Expected: `codex-cli 0.133.0` (or higher with the same plugin convention). If the major plugin layout has changed, STOP and update the spike note before continuing.

- [ ] **Step 2: Read the real bundled plugin manifest (already captured, re-confirm)**

Read: `C:\Users\jpris\.codex\.tmp\bundled-marketplaces\openai-bundled\plugins\browser\.codex-plugin\plugin.json`
Confirm the shape: shared spine (`name`, `version`, `description`, `author`, `homepage`, `repository`, `keywords`) + `"skills": "./skills/"` + an `"interface"` block. Note which `interface` fields the rich example carries (`displayName`, `shortDescription`, `category`, and so on).

- [ ] **Step 3: Build a throwaway marketplace wrapping a minimal candidate plugin**

The toolkit does not ship a marketplace catalog until Phase 5, so the round-trip wraps a candidate plugin in a temporary local marketplace. Create:

`E:\tmp\codex-rt\.agents\plugins\marketplace.json`:
```json
{
  "name": "askit-rt-test",
  "interface": { "displayName": "ASKit RT Test" },
  "plugins": [
    {
      "name": "askit-test",
      "source": { "source": "local", "path": "./plugins/askit-test" },
      "policy": { "installation": "AVAILABLE" },
      "category": "Engineering"
    }
  ]
}
```

`E:\tmp\codex-rt\plugins\askit-test\.codex-plugin\plugin.json` (the MINIMAL candidate to validate):
```json
{
  "name": "askit-test",
  "version": "0.1.0",
  "description": "Round-trip probe plugin.",
  "skills": "./skills/",
  "interface": { "displayName": "ASKit Test", "category": "Engineering" }
}
```

`E:\tmp\codex-rt\plugins\askit-test\skills\probe\SKILL.md`:
```markdown
---
name: probe
description: Probe skill used only to validate Codex plugin round-trip. Use never in production.
---

# probe

A throwaway skill for round-trip validation.
```

- [ ] **Step 4: Run the round-trip and PROVE INGESTION (not just listing)**

CRITICAL lesson (from the pm-skills Codex bug, memory `codex-emission-gotchas`): a plugin can LIST as installable while its components are invisible ("No plugin skills") because Codex discovers components ONLY through `.codex-plugin/plugin.json` and its load-bearing `"skills": "./skills/"` field. Listing is NOT ingestion. So this step must confirm the skill is actually discovered.

Run, in order, recording the exact accepted syntax and output:
```
codex plugin marketplace add --local E:\tmp\codex-rt
codex plugin marketplace list
codex plugin list
codex plugin add askit-test@askit-rt-test
```
Then find and record the command that shows a plugin's DISCOVERED skills (the ingestion proof, distinct from `codex plugin list`). Candidates to try: `codex plugin show askit-test@askit-rt-test`, `codex plugin list --verbose`, or the plugin detail view. The pm-skills bug surfaced as "No plugin skills" in that detail panel, so the proof is: the `probe` skill appears (skills count > 0), NOT "No plugin skills". Record the exact inspection command and its passing output.

Expected: `askit-test@askit-rt-test` lists as installable, installs cleanly, AND the inspection shows the `probe` skill discovered. If `codex plugin marketplace add` needs a name argument (for example `codex plugin marketplace add askit-rt-test --local <path>`), record the exact form that succeeded.

If the minimal `interface` (only `displayName` + `category`) is rejected, incrementally add fields (`shortDescription`, then others) until accepted, and record the minimal accepted set. Note two constraints to honor in `renderCodexNativeManifest` (Task B): emit NO `commands` field (Codex has no such field; commands are Claude-only legacy), and do not emit any URL field that would 404 (`privacyPolicyURL` must resolve or be omitted; `termsOfServiceURL` pointing at a present LICENSE is fine). The minimal interface in Task B emits no URL fields, which sidesteps the 404 risk.

- [ ] **Step 5: Clean up the installed plugin + scratch marketplace**

Run (use whichever remove forms Step 4 established):
```
codex plugin remove askit-test@askit-rt-test
codex plugin marketplace remove askit-rt-test
```
Then delete `E:\tmp\codex-rt\`.

- [ ] **Step 6: Record findings in the spike note**

Append a dated section to `spikes/2026-05-27_codex-plugin-format.md` titled "Phase 3B pin (2026-05-28)" containing: (a) the minimal accepted `.codex-plugin/plugin.json` field set, (b) the exact working `codex plugin marketplace add` / `list` / `remove` command forms, (c) the marketplace.json shape that worked. This is the authoritative reference for Tasks B and G.

- [ ] **Step 7: No commit**

`_local/` is gitignored, so there is nothing to commit here. The spike note persists on disk for Tasks B and G. (Recorded so the executor does not expect a commit.)

---

## Task B: Extend gen-manifest.mjs with native-manifest render functions + --target CLI

**Files:**
- Modify: `scripts/generators/gen-manifest.mjs`
- Test: `tests/unit/gen-manifest.test.mjs`

- [ ] **Step 1: Write failing tests for the two render functions**

Append to `tests/unit/gen-manifest.test.mjs`:
```javascript
import { renderClaudeNativeManifest, renderCodexNativeManifest } from "../../scripts/generators/gen-manifest.mjs";

const LIB_CTX = {
  library: {
    data: {
      name: "agent-skills-toolkit",
      version: "0.1.0",
      description: "Toolkit and Standard for cross-agent skill libraries.",
      author: { name: "product-on-purpose" },
      homepage: "https://example.com/repo",
      repository: "https://example.com/repo",
      keywords: ["skills", "standard"],
      "agent-targets": ["claude", "codex"],
    },
  },
};

test("renderClaudeNativeManifest emits the shared spine from library.json", () => {
  const m = JSON.parse(renderClaudeNativeManifest(LIB_CTX));
  assert.equal(m.name, "agent-skills-toolkit");
  assert.equal(m.version, "0.1.0");
  assert.deepEqual(m.author, { name: "product-on-purpose" });
  assert.deepEqual(m.keywords, ["skills", "standard"]);
  assert.equal(m.skills, undefined, "Claude manifest has no skills pointer");
  assert.equal(m.interface, undefined, "Claude manifest has no interface block");
});

test("renderCodexNativeManifest adds skills pointer + interface block", () => {
  const m = JSON.parse(renderCodexNativeManifest(LIB_CTX));
  assert.equal(m.name, "agent-skills-toolkit");
  assert.equal(m.version, "0.1.0");
  assert.equal(m.skills, "./skills/");
  assert.equal(m.interface.displayName, "Agent Skills Toolkit");
  assert.equal(m.interface.category, "Engineering");
});

test("renderCodexNativeManifest honors explicit displayName/category overrides", () => {
  const ctx = { library: { data: { name: "x-y", version: "1.0.0", displayName: "Custom Name", category: "Productivity" } } };
  const m = JSON.parse(renderCodexNativeManifest(ctx));
  assert.equal(m.interface.displayName, "Custom Name");
  assert.equal(m.interface.category, "Productivity");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/unit/gen-manifest.test.mjs`
Expected: FAIL with "renderClaudeNativeManifest is not a function" (or import error).

- [ ] **Step 3: Implement the render functions + --target CLI**

Replace the entire contents of `scripts/generators/gen-manifest.mjs` with:
```javascript
import { loadPlugin } from "../lib/load-plugin.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

/** manifest.generated.json = the resolved/expanded form of library.json + on-disk skills (Q1.3). */
export function renderManifest(ctx) {
  const lib = ctx.library.data ?? {};
  const obj = {
    name: lib.name ?? null,
    version: lib.version ?? null,
    tier: lib.tier ?? null,
    standard: lib.standard ?? null,
    skills: ctx.skills.map((s) => ({
      name: s.name,
      path: path.relative(ctx.root, s.skillMdPath).split(path.sep).join("/"),
      description: s.frontmatter?.description ?? null,
    })),
  };
  return JSON.stringify(obj, null, 2) + "\n";
}

/** Shared spine fields both native manifests carry, sourced from library.json. */
function nativeSpine(lib) {
  return {
    name: lib.name ?? null,
    version: lib.version ?? null,
    description: lib.description ?? null,
    author: lib.author ?? null,
    homepage: lib.homepage ?? null,
    repository: lib.repository ?? null,
    keywords: Array.isArray(lib.keywords) ? lib.keywords : [],
  };
}

/** .claude-plugin/plugin.json (Claude native manifest), generated from library.json. */
export function renderClaudeNativeManifest(ctx) {
  const lib = ctx.library?.data ?? {};
  return JSON.stringify(nativeSpine(lib), null, 2) + "\n";
}

/** Title-case a kebab name for the Codex marketplace displayName. */
function displayNameFor(lib) {
  if (typeof lib.displayName === "string" && lib.displayName) return lib.displayName;
  return String(lib.name ?? "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * .codex-plugin/plugin.json (Codex native manifest), generated from library.json.
 * Codex format (CLI v0.133, Standard sec 3.2/10.1): shared spine + a "skills"
 * pointer + an "interface" marketplace block. The minimal interface field set is
 * pinned in the spike note (Task A); displayName/category derive from library.json
 * unless explicitly declared.
 */
export function renderCodexNativeManifest(ctx) {
  const lib = ctx.library?.data ?? {};
  const obj = {
    ...nativeSpine(lib),
    skills: "./skills/",
    interface: {
      displayName: displayNameFor(lib),
      category: typeof lib.category === "string" && lib.category ? lib.category : "Engineering",
    },
  };
  return JSON.stringify(obj, null, 2) + "\n";
}

const RENDERERS = {
  resolved: { file: "manifest.generated.json", render: renderManifest },
  claude: { file: path.join(".claude-plugin", "plugin.json"), render: renderClaudeNativeManifest },
  codex: { file: path.join(".codex-plugin", "plugin.json"), render: renderCodexNativeManifest },
};

if (process.argv[1]?.endsWith("gen-manifest.mjs")) {
  const root = process.argv.find((a, i) => i >= 2 && !a.startsWith("--")) ?? process.cwd();
  const targetArg = process.argv.find((a) => a.startsWith("--target="));
  const target = targetArg ? targetArg.split("=")[1] : "all";
  const write = process.argv.includes("--write");
  const ctx = loadPlugin(root);

  const keys = target === "all" ? ["resolved", "claude", "codex"] : [target];
  for (const k of keys) {
    const r = RENDERERS[k];
    if (!r) {
      process.stderr.write(`unknown --target "${k}" (use resolved|claude|codex|all)\n`);
      process.exit(2);
    }
    const text = r.render(ctx);
    if (write) {
      const abs = path.join(root, r.file);
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(abs, text);
    } else {
      process.stdout.write(text);
    }
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/unit/gen-manifest.test.mjs`
Expected: PASS (all render-function tests + the original `renderManifest` test).

- [ ] **Step 5: Smoke-test the CLI (prints, does not write)**

Run: `node scripts/generators/gen-manifest.mjs tests/fixtures/golden/silver-fixture --target=codex`
Expected: valid JSON on stdout with `"name": "silver-fixture"`, `"skills": "./skills/"`, and an `interface` block.

- [ ] **Step 6: Commit**

```
git add scripts/generators/gen-manifest.mjs tests/unit/gen-manifest.test.mjs
git commit -m "feat(gen): emit Claude and Codex native manifests with --target flag"
```

---

## Task C: Add author/keywords to library.json and generate the toolkit's native manifests

**Files:**
- Modify: `library.json`
- Regenerated: `.claude-plugin/plugin.json`
- Create (generated): `.codex-plugin/plugin.json`

- [ ] **Step 1: Add author + keywords to library.json**

Edit `library.json` to add `author` and `keywords` (promoted from the hand-authored `.claude-plugin/plugin.json` so both manifests single-source from here, Standard sec 10.3). After the edit, `library.json` reads:
```json
{
  "name": "agent-skills-toolkit",
  "version": "0.1.0",
  "description": "Toolkit and Standard for authoring, validating, governing, and scaling cross-agent skill libraries (Claude Code and Codex) to a tiered Bronze/Silver/Gold quality bar. Use when building or grading agent skill plugins, when emitting components for multiple agents, or when adopting the Advanced Skill Library Standard.",
  "standard": "0.8",
  "tier": "universal",
  "prefix": "askit-",
  "author": { "name": "product-on-purpose" },
  "keywords": ["agent-skills", "skills", "claude-code", "codex", "plugin", "standard"],
  "engines": {
    "node": ">=20"
  },
  "repository": "https://github.com/product-on-purpose/agent-skills-toolkit",
  "homepage": "https://github.com/product-on-purpose/agent-skills-toolkit"
}
```

- [ ] **Step 2: Generate all native manifests**

Run: `node scripts/generators/gen-manifest.mjs . --write --target=all`
This regenerates `manifest.generated.json` + `.claude-plugin/plugin.json` and creates `.codex-plugin/plugin.json`.

- [ ] **Step 3: Review the expected diff**

Run: `git status` and `git diff .claude-plugin/plugin.json`
Expected: `.claude-plugin/plugin.json` `description` changes from the short hand-authored form to the full `library.json` description (a benign, reviewed improvement; this is the single-source-of-truth taking over). `name`, `version`, `author`, `homepage`, `repository`, `keywords` are unchanged. A new `.codex-plugin/plugin.json` appears. Confirm `.codex-plugin/plugin.json` contains `"name": "agent-skills-toolkit"`, `"version": "0.1.0"`, `"skills": "./skills/"`, and `interface.displayName` equal to `"Agent Skills Toolkit"`.

- [ ] **Step 4: Confirm the gate and tests still pass (no S1/S6 change yet)**

Run: `node scripts/check.mjs`
Expected: exit 0. `agent-targets` is not declared yet, so S1 still appears in `blocked.convergent` and S6 does not fire. Seed tests are unchanged at this point.

Run: `npm test`
Expected: all tests pass (the regenerated manifests do not affect any assertion; U8 compares only name/version, which match).

- [ ] **Step 5: Commit**

```
git add library.json .claude-plugin/plugin.json .codex-plugin/plugin.json manifest.generated.json
git commit -m "feat: generate native manifests from library.json (add author/keywords)"
```

---

## Task D: Declare agent-targets in library.json (closes S1) + update seed regression tests

This task changes a regression contract: declaring `agent-targets` removes S1 from the repo's `blocked.convergent`. The seed tests that assert S1 MUST be updated in the same task (red-green), or the suite breaks.

**Files:**
- Modify: `library.json`
- Update: `tests/unit/seed-blocked-convergent.test.mjs`
- Update: `tests/unit/seed-bronze.test.mjs`

- [ ] **Step 1: Update the seed regression tests to the [S3]-only contract (make them fail first)**

Replace `tests/unit/seed-blocked-convergent.test.mjs` with:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTierReport } from "../../scripts/tier-report.mjs";

const REPO = process.cwd();

test("repo tier-report: declared universal, satisfies universal, blocked.convergent now lists only S3 (components-index); S1 closed by agent-targets, S6 passes", () => {
  const t = computeTierReport(REPO);
  assert.equal(t.tier, "universal");
  assert.deepEqual(t.satisfies, ["universal"]);
  const blocked = t.blocked.convergent ?? [];
  assert.ok(blocked.some((s) => s.startsWith("S3")), "expected S3 (components-index) in blocked.convergent: " + JSON.stringify(blocked));
  assert.ok(!blocked.some((s) => s.startsWith("S1")), "S1 (agent-targets) should be closed - declared in library.json");
  assert.ok(!blocked.some((s) => s.startsWith("S2")), "S2 (prefix) should NOT block - askit- is set");
  assert.ok(!blocked.some((s) => s.startsWith("S4")), "S4 (chain-contract) should NOT block - no chaining present");
  assert.ok(!blocked.some((s) => s.startsWith("S5")), "S5 (workflow-skills) should NOT block - no workflows present");
  assert.ok(!blocked.some((s) => s.startsWith("S6")), "S6 (per-target-presence) should pass - both native manifests are generated on disk");
});
```

In `tests/unit/seed-bronze.test.mjs`, change the convergent assertions (the lines that assert S1 + S3) to assert S3 present and S1 absent. The updated test body (lines ~14-22) reads:
```javascript
test("the repository reports tier universal (S-checks in blocked.convergent do not affect the gate)", () => {
  const t = computeTierReport(process.cwd());
  assert.equal(t.tier, "universal");
  // blocked.convergent now lists only the remaining Silver climb item (S3 components-index);
  // S1 (agent-targets) is closed in Phase 3B; S6 (per-target-presence) passes.
  const conv = t.blocked.convergent ?? [];
  assert.ok(conv.some((s) => s.startsWith("S3")), "S3 expected in blocked.convergent");
  assert.ok(!conv.some((s) => s.startsWith("S1")), "S1 should be closed (agent-targets declared)");
});
```
(Preserve the rest of `seed-bronze.test.mjs` - only the convergent assertions change. Read the file first and edit the matching lines.)

- [ ] **Step 2: Run the seed tests to verify they fail**

Run: `node --test tests/unit/seed-blocked-convergent.test.mjs tests/unit/seed-bronze.test.mjs`
Expected: FAIL - S1 still appears in `blocked.convergent` because `agent-targets` is not declared yet.

- [ ] **Step 3: Declare agent-targets in library.json**

Edit `library.json` to add `"agent-targets": ["claude", "codex"]` after the `"prefix"` line:
```json
  "prefix": "askit-",
  "agent-targets": ["claude", "codex"],
  "author": { "name": "product-on-purpose" },
```

- [ ] **Step 4: Run the seed tests to verify they pass**

Run: `node --test tests/unit/seed-blocked-convergent.test.mjs tests/unit/seed-bronze.test.mjs`
Expected: PASS - S1 is gone; S3 remains. (S6 is not registered yet, so it cannot block; the native manifests already exist from Task C, so S6 will pass once registered in Task E.)

- [ ] **Step 5: Confirm the gate still exits 0**

Run: `node scripts/check.mjs`
Expected: exit 0. The `tier-report` human line shows Convergent blocked by 1 issue.

- [ ] **Step 6: Commit**

```
git add library.json tests/unit/seed-blocked-convergent.test.mjs tests/unit/seed-bronze.test.mjs
git commit -m "feat: declare agent-targets (closes S1); update seed burndown to S3-only"
```

---

## Task E: S6 per-target-presence check + U8 Codex drift coverage

Adds the new Convergent check (S6) and the small extension to U8 so the generated Codex manifest is drift-guarded. Also adds `ctx.codexManifest` (needed by U8) and the fixtures S6 needs.

**Files:**
- Modify: `scripts/lib/load-plugin.mjs`
- Create: `scripts/checks/per-target-presence.mjs`
- Modify: `scripts/checks/manifest-drift.mjs`
- Modify: `scripts/lib/registry.mjs`
- Create: `tests/unit/per-target-presence.test.mjs`
- Modify: `tests/unit/manifest-drift.test.mjs`
- Create: `tests/fixtures/golden/silver-fixture/.claude-plugin/plugin.json`
- Create: `tests/fixtures/golden/silver-fixture/.codex-plugin/plugin.json`
- Create: `tests/fixtures/anti/missing-codex-manifest/` (library.json + AGENTS.md + skill + `.claude-plugin/plugin.json`)

- [ ] **Step 1: Expose ctx.codexManifest in load-plugin**

In `scripts/lib/load-plugin.mjs`, after the `claude` line, add a `codex` read and include it in the returned context:
```javascript
  const claude = readJsonSafe(path.join(root, ".claude-plugin", "plugin.json"));
  const codex = readJsonSafe(path.join(root, ".codex-plugin", "plugin.json"));

  return { root, library, agentsMdPath, skills, claudeManifest: claude.data, codexManifest: codex.data };
```

- [ ] **Step 2: Add the golden silver-fixture native manifests (so S6 passes for it)**

Create `tests/fixtures/golden/silver-fixture/.claude-plugin/plugin.json`:
```json
{
  "name": "silver-fixture",
  "version": "0.1.0",
  "description": "Silver-shaped fixture plugin used to prove the Convergent checks pass.",
  "author": { "name": "product-on-purpose" },
  "homepage": "https://example.com/silver-fixture",
  "repository": "https://example.com/silver-fixture",
  "keywords": ["fixture"]
}
```

Create `tests/fixtures/golden/silver-fixture/.codex-plugin/plugin.json`:
```json
{
  "name": "silver-fixture",
  "version": "0.1.0",
  "description": "Silver-shaped fixture plugin used to prove the Convergent checks pass.",
  "author": { "name": "product-on-purpose" },
  "homepage": "https://example.com/silver-fixture",
  "repository": "https://example.com/silver-fixture",
  "keywords": ["fixture"],
  "skills": "./skills/",
  "interface": { "displayName": "Silver Fixture", "category": "Engineering" }
}
```
(name/version match `library.json` so U8 stays clean.)

- [ ] **Step 3: Create the S6 anti fixture (declares codex target, missing .codex-plugin manifest)**

Create `tests/fixtures/anti/missing-codex-manifest/library.json`:
```json
{
  "name": "missing-codex-manifest",
  "version": "0.1.0",
  "description": "Anti fixture: declares claude+codex agent-targets but ships no .codex-plugin manifest, to trip S6.",
  "standard": "0.8",
  "tier": "convergent",
  "prefix": "sf-",
  "agent-targets": ["claude", "codex"],
  "components": {
    "skills": [
      { "name": "sf-do-thing", "path": "skills/sf-do-thing/SKILL.md", "version": "0.1.0", "tier": "universal", "status": "active" }
    ]
  }
}
```

Create `tests/fixtures/anti/missing-codex-manifest/.claude-plugin/plugin.json`:
```json
{
  "name": "missing-codex-manifest",
  "version": "0.1.0",
  "description": "Anti fixture: declares claude+codex agent-targets but ships no .codex-plugin manifest, to trip S6.",
  "author": { "name": "product-on-purpose" },
  "homepage": "https://example.com/missing-codex",
  "repository": "https://example.com/missing-codex",
  "keywords": ["fixture"]
}
```

Create `tests/fixtures/anti/missing-codex-manifest/AGENTS.md`:
```markdown
# AGENTS.md - missing-codex-manifest

Anti fixture. Declares `agent-targets: ["claude", "codex"]` but provides only the
Claude native manifest; the Codex manifest is absent, which S6 flags.
```

Create `tests/fixtures/anti/missing-codex-manifest/skills/sf-do-thing/SKILL.md`:
```markdown
---
name: sf-do-thing
description: Does the one thing this fixture needs. Use when validating the missing-codex-manifest anti fixture for S6.
---

# sf-do-thing

A minimal skill so the fixture is a well-formed plugin.
```
(Do NOT create a `.codex-plugin/` directory here - its absence is the point.)

- [ ] **Step 4: Write failing tests for S6**

Create `tests/unit/per-target-presence.test.mjs`:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, meta } from "../../scripts/checks/per-target-presence.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

test("meta declares S6 convergent", () => {
  assert.equal(meta.reqId, "S6");
  assert.equal(meta.tier, "convergent");
});

test("golden silver fixture has both native manifests - no error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "golden/silver-fixture")));
  assert.equal(r.filter((f) => f.severity === "error").length, 0);
});

test("missing-codex-manifest fixture is an S6 error citing .codex-plugin/plugin.json", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/missing-codex-manifest")));
  const err = r.find((f) => f.severity === "error");
  assert.ok(err);
  assert.equal(err.reqId, "S6");
  assert.equal(err.file, ".codex-plugin/plugin.json");
  assert.match(err.message, /codex/);
});

test("no agent-targets declared - S6 stays silent (S1 owns that)", () => {
  const r = check({ root: ".", library: { data: { name: "x" } } });
  assert.deepEqual(r, []);
});

test("empty/invalid agent-targets - S6 stays silent (S1 owns that)", () => {
  assert.deepEqual(check({ root: ".", library: { data: { "agent-targets": [] } } }), []);
});

test("no library.json data - no finding (U1 owns that)", () => {
  assert.deepEqual(check({ library: { data: null } }), []);
});
```

- [ ] **Step 5: Run the S6 tests to verify they fail**

Run: `node --test tests/unit/per-target-presence.test.mjs`
Expected: FAIL with "Cannot find module .../per-target-presence.mjs".

- [ ] **Step 6: Implement the S6 check**

Create `scripts/checks/per-target-presence.mjs`:
```javascript
import path from "node:path";
import { finding, SEVERITY } from "../lib/findings.mjs";
import { fileExists } from "../lib/fs-utils.mjs";

export const meta = { id: "per-target-presence", tier: "convergent", reqId: "S6" };

/** Each declared agent-target requires its native manifest on disk. */
const MANIFEST_FOR = {
  claude: ".claude-plugin/plugin.json",
  codex: ".codex-plugin/plugin.json",
};

export function check(ctx) {
  const lib = ctx.library?.data;
  if (!lib) return []; // U1 owns missing library.json
  const targets = lib["agent-targets"];
  if (!Array.isArray(targets) || targets.length === 0) return []; // S1 owns missing/invalid agent-targets
  const out = [];
  for (const t of targets) {
    const rel = MANIFEST_FOR[t];
    if (!rel) continue; // S1 owns invalid target names
    if (!fileExists(path.join(ctx.root, rel))) {
      out.push(
        finding(
          meta.id,
          SEVERITY.ERROR,
          `library.json declares agent-target "${t}" but its native manifest ${rel} is missing on disk (REQUIRED at Convergent+; Standard sec 5.1, sec 10.1). Generate it with: node scripts/generators/gen-manifest.mjs . --write --target=all`,
          { file: rel, reqId: meta.reqId }
        )
      );
    }
  }
  return out;
}
```

- [ ] **Step 7: Run the S6 tests to verify they pass**

Run: `node --test tests/unit/per-target-presence.test.mjs`
Expected: PASS.

- [ ] **Step 8: Write failing tests for U8 Codex coverage**

Append to `tests/unit/manifest-drift.test.mjs`:
```javascript
test("codex manifest matching name/version - no finding", () => {
  const ctx = { root: ".", library: { data: { name: "x", version: "0.1.0" } }, claudeManifest: { name: "x", version: "0.1.0" }, codexManifest: { name: "x", version: "0.1.0" } };
  assert.equal(check(ctx).length, 0);
});

test("codex manifest version drift is a WARN citing .codex-plugin", () => {
  const ctx = { root: ".", library: { data: { name: "x", version: "0.2.0" } }, codexManifest: { name: "x", version: "0.1.0" } };
  const f = check(ctx)[0];
  assert.equal(f.severity, "warn");
  assert.equal(f.file, ".codex-plugin/plugin.json");
  assert.match(f.message, /version/);
});

test("no codex manifest - no codex finding", () => {
  const ctx = { root: ".", library: { data: { name: "x", version: "0.1.0" } }, claudeManifest: { name: "x", version: "0.1.0" }, codexManifest: null };
  assert.equal(check(ctx).length, 0);
});
```

- [ ] **Step 9: Run the U8 tests to verify the new ones fail**

Run: `node --test tests/unit/manifest-drift.test.mjs`
Expected: FAIL - the codex drift case fails because the check ignores `codexManifest` (no finding is produced for the drift).

- [ ] **Step 10: Extend U8 to cover the Codex manifest**

Replace the contents of `scripts/checks/manifest-drift.mjs` with:
```javascript
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "manifest-drift", tier: "universal", reqId: "U8" };

/** Native manifests generated from library.json; checked for name/version agreement. */
const NATIVE = [
  { key: "claudeManifest", file: ".claude-plugin/plugin.json" },
  { key: "codexManifest", file: ".codex-plugin/plugin.json" },
];

export function check(ctx) {
  const lib = ctx.library?.data;
  if (!lib) return [];
  const out = [];
  for (const { key, file } of NATIVE) {
    const m = ctx[key];
    if (!m) continue;
    for (const k of ["name", "version"]) {
      if (lib[k] !== m[k]) {
        out.push(finding(meta.id, SEVERITY.WARN, `${file} ${k} "${m[k]}" differs from library.json "${lib[k]}"; native manifests are generated from library.json (Standard sec 5, G4). Regenerate with: node scripts/generators/gen-manifest.mjs . --write --target=all`, { file, reqId: "U8" }));
      }
    }
  }
  return out;
}
```

- [ ] **Step 11: Run the U8 tests to verify they pass**

Run: `node --test tests/unit/manifest-drift.test.mjs`
Expected: PASS (original claude cases + the new codex cases).

- [ ] **Step 12: Register S6 in the registry**

In `scripts/lib/registry.mjs`, add the import and the array entry:
```javascript
import * as workflowSkills from "../checks/workflow-skills.mjs";
import * as perTargetPresence from "../checks/per-target-presence.mjs";

/** Ordered checks. Each exports { meta:{id,tier,reqId}, check(ctx)->Finding[] }. */
export const CHECKS = [
  libraryJson, anatomy, frontmatterValid, nameMatchesDir,
  descriptionScore, referenceLinks, instructionBudget, manifestDrift,
  agentTargets, prefix, componentsIndex, chainContract, workflowSkills,
  perTargetPresence,
];
```

- [ ] **Step 13: Run the full suite + the gate on the repo**

Run: `npm test`
Expected: all tests pass. (S6 is registered; the repo has both native manifests from Task C and declares `agent-targets` from Task D, so S6 passes on the repo. `golden/silver-fixture` has its manifests from Step 2. No aggregate test exercises the silver-shaped anti fixtures through the full registry, so they do not regress.)

Run: `node scripts/check.mjs`
Expected: exit 0.

Run: `node scripts/tier-report.mjs --json`
Expected: `{"tier":"universal","satisfies":["universal"],"blocked":{"convergent":["S3: ..."]}}` - only S3 remains.

- [ ] **Step 14: Commit**

```
git add scripts/lib/load-plugin.mjs scripts/checks/per-target-presence.mjs scripts/checks/manifest-drift.mjs scripts/lib/registry.mjs tests/unit/per-target-presence.test.mjs tests/unit/manifest-drift.test.mjs tests/fixtures/golden/silver-fixture/.claude-plugin tests/fixtures/golden/silver-fixture/.codex-plugin tests/fixtures/anti/missing-codex-manifest
git commit -m "feat: add S6 per-target-presence check and U8 Codex drift coverage"
```

---

## Task F: --agent-target on askit-build-skill

**Files:**
- Modify: `skills/askit-build-skill/SKILL.md`
- Modify: `skills/askit-build-skill/references/authoring-guide.md`

- [ ] **Step 1: Update SKILL.md create-mode step + scope line**

In `skills/askit-build-skill/SKILL.md`, change create-mode step 5 (the assess step) into an emission step, then add a new assess step. The create-mode list becomes (steps 1-4 unchanged; step 5 new; step 6 = old step 5):
```markdown
5. Emit native manifests for the declared targets: set `agent-targets` in the plugin's `library.json` (for example `["claude", "codex"]`), then run `node scripts/generators/gen-manifest.mjs <plugin-root> --write --target=all`. Use `--agent-target claude|codex|both` intent to choose which targets you declare (`both` is the default). This writes `.claude-plugin/plugin.json` and/or `.codex-plugin/plugin.json` from `library.json`.
6. Assess the new skill with `node scripts/evaluate.mjs skills/<name> --json` (this is what the `askit-evaluate` skill runs), report the result, and iterate until it passes with 0 errors.
```

Replace the `## Scope (v1)` section with:
```markdown
## Scope
Emits for Claude and Codex via `--agent-target` (both by default; `library.json.agent-targets` declares which native manifests are generated). Authoring is performed inline by the running agent; a dedicated authoring subagent is a later addition.
```

- [ ] **Step 2: Add a multi-agent emission section to the authoring guide**

Append to `skills/askit-build-skill/references/authoring-guide.md`:
```markdown

## Multi-agent emission (Standard sec 3.2, sec 10.1)
A plugin declares which agents it targets in `library.json.agent-targets` (`["claude", "codex"]`). The native manifests are generated from `library.json`, never hand-edited:
- `node scripts/generators/gen-manifest.mjs <plugin> --write --target=all` writes the resolved index plus `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json`.
- `--target=claude` or `--target=codex` writes just one.
The `SKILL.md` files are portable and shared - they live under the plugin's `skills/` and are not duplicated per agent. The S6 check enforces that each declared target has its native manifest on disk; U8 warns if a manifest's name/version drifts from `library.json`.
```

- [ ] **Step 3: Verify the skill still passes the gate (no convergent regression)**

Run: `node scripts/evaluate.mjs skills/askit-build-skill --json`
Expected: 0 errors (the description and budget are unchanged; the edits are prose).

Run: `node scripts/check.mjs`
Expected: exit 0.

- [ ] **Step 4: Commit**

```
git add skills/askit-build-skill/SKILL.md skills/askit-build-skill/references/authoring-guide.md
git commit -m "docs(build-skill): document --agent-target multi-agent emission"
```

---

## Task G: Local Codex round-trip integration test (graceful skip)

Codifies the recipe recorded in Task A. The test runs for real when `codex` is on PATH and `skip`s otherwise (CI). It wraps the toolkit's generated `.codex-plugin/plugin.json` in a throwaway local marketplace and confirms Codex lists it.

**Files:**
- Create: `tests/integration/codex-roundtrip.test.mjs`

- [ ] **Step 1: Write the integration test**

Create `tests/integration/codex-roundtrip.test.mjs`. Use the exact `codex plugin marketplace add/list/remove` command forms recorded in Task A's spike-note update; the version below uses the spike-captured forms - adjust the `add`/`remove` argument shape if Task A recorded different flags:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CODEX_MANIFEST = path.join(REPO, ".codex-plugin", "plugin.json");

function codexAvailable() {
  const r = spawnSync("codex", ["--version"], { encoding: "utf8" });
  return !r.error && r.status === 0;
}

const present = codexAvailable();
const required = process.env.CODEX_REQUIRED === "1";
const skip = present ? false : (required ? false : "codex CLI not on PATH (set CODEX_REQUIRED=1 to fail instead of skip)");

test("emitted .codex-plugin/plugin.json round-trips through the codex CLI", { skip }, () => {
  if (!present && required) {
    assert.fail("CODEX_REQUIRED=1 but codex CLI is not on PATH");
  }
  assert.ok(existsSync(CODEX_MANIFEST), "the toolkit must have generated .codex-plugin/plugin.json (run gen-manifest --target=all)");

  const mpName = "askit-rt-test";
  const sel = "askit-test@" + mpName;
  const root = mkdtempSync(path.join(tmpdir(), "askit-codex-rt-"));
  let added = false;
  try {
    // Build a throwaway local marketplace wrapping the toolkit's emitted manifest.
    const pluginDir = path.join(root, "plugins", "askit-test");
    mkdirSync(path.join(pluginDir, ".codex-plugin"), { recursive: true });
    mkdirSync(path.join(pluginDir, "skills", "probe"), { recursive: true });
    copyFileSync(CODEX_MANIFEST, path.join(pluginDir, ".codex-plugin", "plugin.json"));
    writeFileSync(
      path.join(pluginDir, "skills", "probe", "SKILL.md"),
      "---\nname: probe\ndescription: Probe skill used only to validate Codex round-trip. Use never in production.\n---\n\n# probe\n"
    );
    mkdirSync(path.join(root, ".agents", "plugins"), { recursive: true });
    writeFileSync(
      path.join(root, ".agents", "plugins", "marketplace.json"),
      JSON.stringify(
        {
          name: mpName,
          interface: { displayName: "ASKit RT Test" },
          plugins: [
            { name: "askit-test", source: { source: "local", path: "./plugins/askit-test" }, policy: { installation: "AVAILABLE" }, category: "Engineering" },
          ],
        },
        null,
        2
      )
    );

    // v0.135 syntax: `marketplace add` takes a POSITIONAL source path (NOT --local). Verified in Task A.
    const mpAdd = spawnSync("codex", ["plugin", "marketplace", "add", root], { encoding: "utf8" });
    added = mpAdd.status === 0;
    assert.equal(mpAdd.status, 0, `marketplace add failed: ${mpAdd.stderr || mpAdd.stdout}`);

    const list = spawnSync("codex", ["plugin", "list", "--marketplace", mpName], { encoding: "utf8" });
    assert.equal(list.status, 0, `plugin list failed: ${list.stderr || list.stdout}`);
    assert.match(list.stdout, /askit-test/, "the emitted plugin should appear in codex plugin list");

    // Listing is NOT ingestion (pm-skills bug). There is no `codex plugin show`; instead install and
    // confirm the skill RESOLVES into the install cache. `plugin add` prints "Installed plugin root: <path>".
    const add = spawnSync("codex", ["plugin", "add", sel], { encoding: "utf8" });
    assert.equal(add.status, 0, `plugin add failed: ${add.stderr || add.stdout}`);
    const m = (add.stdout || "").match(/Installed plugin root:\s*(.+?)\s*$/m);
    assert.ok(m, `could not parse install root from plugin add output: ${add.stdout}`);
    const installRoot = m[1].trim();
    assert.ok(
      existsSync(path.join(installRoot, "skills", "probe", "SKILL.md")),
      "Codex did not ingest the skill - skills/probe/SKILL.md missing from the install root (check the \"skills\" pointer in .codex-plugin/plugin.json)"
    );
  } finally {
    spawnSync("codex", ["plugin", "remove", sel], { encoding: "utf8" });
    if (added) spawnSync("codex", ["plugin", "marketplace", "remove", mpName], { encoding: "utf8" });
    rmSync(root, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run the test locally (real round-trip)**

Run: `node --test tests/integration/codex-roundtrip.test.mjs`
Expected (local, codex present): PASS - the plugin lists, installs, AND its `probe` skill is discovered (no "No plugin skills"). If it fails on the `add`/`remove`/`show` argument shape, align the spawnSync args with the exact forms Task A recorded, then re-run. The ingestion assertion (skill discovered, not just listed) is the load-bearing one: it is the check that would have caught the pm-skills bug.

- [ ] **Step 3: Confirm graceful skip semantics**

Run: `npm test`
Expected: the round-trip test runs (local) and the rest of the suite passes. The test is auto-discovered by `node --test` from `tests/integration/`. In CI (no codex), it reports as skipped, not failed.

- [ ] **Step 4: Record one real local pass in the dogfood log**

Create `dogfood/2026-05-28_codex-roundtrip.md` with the command run, the `codex --version`, and the passing output excerpt. (Gitignored; evidence for the PR description.)

- [ ] **Step 5: Commit**

```
git add tests/integration/codex-roundtrip.test.mjs
git commit -m "test: add local Codex round-trip integration test (graceful skip in CI)"
```

---

## Task I: Documentation (Diataxis + AGENTS.md + INDEX.md)

**Files:**
- Create: `docs/how-to/emit-for-multiple-agents.md`
- Modify: `docs/reference/silver-checks.md`
- Modify: `docs/reference/askit-build-skill.md`
- Modify: `docs/explanation/conformance-and-tiers.md`
- Modify: `AGENTS.md`
- Modify: `INDEX.md` (only if it states native manifests are hand-authored)

- [ ] **Step 1: Create the how-to**

Create `docs/how-to/emit-for-multiple-agents.md`:
````markdown
# How to emit a plugin for multiple agents

A plugin can target Claude Code, Codex, or both. The `SKILL.md` files are portable
and shared; only the native manifests differ per agent. They are generated from the
canonical `library.json`, never hand-edited.

## 1. Declare the targets

In `library.json`:
```json
{ "agent-targets": ["claude", "codex"] }
```

## 2. Generate the native manifests

```
node scripts/generators/gen-manifest.mjs . --write --target=all
```
- `--target=all` writes `manifest.generated.json`, `.claude-plugin/plugin.json`, and `.codex-plugin/plugin.json`.
- `--target=claude` or `--target=codex` writes just one.

`.claude-plugin/plugin.json` carries the shared spine (name, version, description,
author, homepage, repository, keywords). `.codex-plugin/plugin.json` adds a
`"skills": "./skills/"` pointer and an `interface` marketplace block (displayName,
category) for the Codex plugin system.

## 3. Validate

- `node scripts/check.mjs` runs S6 (per-target-presence): each declared target must
  have its native manifest on disk.
- U8 warns if a generated manifest's name/version drifts from `library.json` -
  regenerate to fix.

## 4. (Local) round-trip against Codex

With the `codex` CLI installed, `tests/integration/codex-roundtrip.test.mjs`
wraps the emitted `.codex-plugin/plugin.json` in a throwaway local marketplace and
confirms Codex lists it. It runs with `npm test` locally and skips when `codex` is
absent (for example in CI).

Marketplace catalog generation (publishing many plugins) is a separate, later step.
````

- [ ] **Step 2: Update the silver-checks reference (add S6, "Five" -> "Six")**

In `docs/reference/silver-checks.md`, change the opening sentence from "Five checks (S1-S5) earn Silver tier." to "Six checks (S1-S6) earn Silver tier." and add a row to the table after S5:
```markdown
| S6 | `scripts/checks/per-target-presence.mjs` | Each `agent-targets` entry has its native manifest on disk (`.claude-plugin/plugin.json` / `.codex-plugin/plugin.json`) | sec 5.1, sec 10.1 | yes (agent-targets declared) | Run `node scripts/generators/gen-manifest.mjs . --write --target=all` to generate the missing native manifest. |
```

- [ ] **Step 3: Update the askit-build-skill reference**

In `docs/reference/askit-build-skill.md`, change line 3 from "Creates and improves skills to the Standard. Claude target (v1)." to "Creates and improves skills to the Standard. Emits for Claude and Codex." and replace the "Out of scope (v1)" bullet with:
```markdown
- **Multi-agent emission:** declare `agent-targets` in `library.json` and run
  `gen-manifest.mjs --target=all`; `--agent-target claude|codex|both` selects targets
  (both by default). A dedicated authoring subagent is still a later addition.
```

- [ ] **Step 4: Update the conformance explanation (S6 row + status line)**

In `docs/explanation/conformance-and-tiers.md`, add an S6 row to the Silver-checks table:
```markdown
| S6 | Per-target native-manifest presence | sec 5.1, sec 10.1 | yes |
```
and replace the line "S6 (per-target format presence) is added in Phase 3B alongside emission." with:
```markdown
S6 (per-target native-manifest presence) fires only when `agent-targets` is declared; it checks that each declared target has its generated native manifest on disk. The repository now declares `agent-targets: ["claude", "codex"]` and emits both manifests, so its Silver burndown has shrunk from `[S1, S3]` to `[S3]` (only the components index remains).
```

- [ ] **Step 5: Update AGENTS.md**

In `AGENTS.md`:
- Change the Silver-checks line "Silver checks (Convergent, reqId S1-S5)" to "Silver checks (Convergent, reqId S1-S6)".
- Replace the Manifests bullet (the one stating native manifests are "generated from it at Gold; in this seed they are hand-authored ... MUST be kept consistent by hand") with:
```markdown
- **Manifests:** [`library.json`](library.json) is the authored, canonical
  cross-agent manifest. The native manifests (`.claude-plugin/plugin.json` and
  `.codex-plugin/plugin.json`) are GENERATED from it via
  `node scripts/generators/gen-manifest.mjs . --write --target=all`; do not hand-edit
  them. S6 checks per-target presence; U8 warns on name/version drift.
```

- [ ] **Step 6: Update INDEX.md if needed**

Read `INDEX.md`. If it states the native manifests are hand-authored or Claude-only, update those lines to reflect generated, multi-agent manifests. If it has no such statement, make no change.

- [ ] **Step 7: Verify the gate still passes (docs do not change validation)**

Run: `node scripts/check.mjs`
Expected: exit 0.

- [ ] **Step 8: Commit**

```
git add docs/how-to/emit-for-multiple-agents.md docs/reference/silver-checks.md docs/reference/askit-build-skill.md docs/explanation/conformance-and-tiers.md AGENTS.md INDEX.md
git commit -m "docs: document Codex emission, S6, and generated native manifests"
```

---

## Task J: CHANGELOG + final verification (exit gate)

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add CHANGELOG entries under [Unreleased] / Added**

Append to the `### Added` list under `## [Unreleased]` in `CHANGELOG.md`:
```markdown
- Multi-agent emission spine (Phase 3B): `gen-manifest.mjs` now emits `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` from `library.json` via a `--target=resolved|claude|codex|all` flag; the Claude manifest is now generated rather than hand-authored.
- `library.json` declares `agent-targets: ["claude", "codex"]` (closes S1) and carries canonical `author`/`keywords` for both native manifests.
- S6 (per-target-presence) Convergent check: each declared `agent-targets` entry must have its native manifest on disk (conditional on `agent-targets`). U8 manifest-drift extended to cover the Codex manifest.
- `askit-build-skill` documents `--agent-target` multi-agent emission.
- Local Codex round-trip integration test (`tests/integration/codex-roundtrip.test.mjs`): wraps the emitted manifest in a throwaway local marketplace against the real `codex` CLI; runs locally, skips in CI (set `CODEX_REQUIRED=1` to fail instead).
- Docs: `docs/how-to/emit-for-multiple-agents.md`; `silver-checks.md` and `conformance-and-tiers.md` add S6; AGENTS.md notes generated native manifests.
- The repository's Silver burndown shrank from `[S1, S3]` to `[S3]` - only the components index remains before declaring `tier: convergent` (3C).
```

- [ ] **Step 2: Run the full exit-gate verification**

Run each and confirm:
```
npm ci
npm test
node scripts/check.mjs
node scripts/evaluate.mjs .
node scripts/tier-report.mjs --json
```
Expected:
- `npm test`: all pass (the round-trip runs locally / skips in CI).
- `node scripts/check.mjs`: exit 0.
- `node scripts/evaluate.mjs .`: exit 0.
- `node scripts/tier-report.mjs --json`: `{"tier":"universal","satisfies":["universal"],"blocked":{"convergent":["S3: ..."]}}` - exactly one item (S3).

- [ ] **Step 3: Confirm no em-dash or en-dash slipped into the diff**

The PreToolUse hook rejects U+2014 and U+2013 on every Edit/Write, so committed files should already be clean. As a belt-and-suspenders check, scan the branch diff for those two code points and confirm zero matches. Build the scanner so it does not embed the literal characters - for example:
```
node -e "const{readFileSync}=require('node:fs');const{execSync}=require('node:child_process');const re=new RegExp('['+String.fromCharCode(0x2013,0x2014)+']');const files=execSync('git diff --name-only main').toString().trim().split(/\r?\n/).filter(Boolean);const bad=files.filter(f=>{try{return re.test(readFileSync(f,'utf8'))}catch{return false}});console.log(bad.length?('FOUND IN: '+bad.join(', ')):'clean')"
```
Expected: `clean`.

- [ ] **Step 4: Commit**

```
git add CHANGELOG.md
git commit -m "docs: changelog for Phase 3B multi-agent emission spine"
```

---

## Exit Gate (Phase 3B - all must hold before PR)

- [ ] `gen-manifest.mjs` emits all three artifacts; `--target` flag works; both render functions unit-tested.
- [ ] `.claude-plugin/plugin.json` regenerated from `library.json`; `.codex-plugin/plugin.json` generated and committed; both agree with `library.json` (U8 clean).
- [ ] `library.json` declares `agent-targets` (+ `author`/`keywords` promoted).
- [ ] S6 registered + unit-tested (golden + anti fixture); U8 covers the Codex manifest.
- [ ] `askit-build-skill` documents `--agent-target`; the gate still passes on the skill.
- [ ] Round-trip integration test present; ran for real locally (one pass recorded in the dogfood log); skips in CI.
- [ ] `tier-report.blocked.convergent == ["S3: ..."]` only; seed tests updated.
- [ ] New how-to + reference/explanation updates shipped; CHANGELOG entry under `[Unreleased]`.
- [ ] CI green: `npm ci && npm test && node scripts/check.mjs` all pass / exit 0.
- [ ] No em-dash or en-dash anywhere in the diff.

## Self-Review (run after writing all tasks - completed)

- **Spec coverage:** All six design parts map to tasks - generator (B), generate+commit (C), agent-targets (D), S6 (E), round-trip (G), `--agent-target` + docs (F, I, J). The two flagged design additions (author/keywords promotion, U8 Codex coverage) are in C and E. Marketplace catalog, S4 orphan, tier bump - all explicitly out of scope, no tasks (correct).
- **Placeholder scan:** No "TBD"/"handle edge cases"/"similar to". The only forward reference is Task A's recorded recipe informing Tasks B/G; both carry concrete code with an explicit "align with Task A" note where the live CLI governs.
- **Type/name consistency:** `renderClaudeNativeManifest` / `renderCodexNativeManifest` / `nativeSpine` / `displayNameFor` consistent across B and its tests. `ctx.codexManifest` consistent across load-plugin (E1), U8 (E10), and the U8 tests (E8). S6 `meta.reqId` is `"S6"`, `file` is `".codex-plugin/plugin.json"`, consistent across the check and its tests. `--target` values `resolved|claude|codex|all` consistent across the generator, the how-to, and the build-skill instructions.
- **Regression safety:** `minimal-skill`-based aggregate tests (tier-report, evaluate, check-runner) untouched because that fixture has no `agent-targets`; the two REPO seed tests are updated in Task D (red-green); `golden/silver-fixture` gets its manifests in Task E.
