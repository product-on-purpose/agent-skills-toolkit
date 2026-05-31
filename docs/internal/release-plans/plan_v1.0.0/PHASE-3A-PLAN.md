# Phase 3A - Codex Contract + Silver Conformance Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the Silver foundation - revise STANDARD.md to v0.8 (Codex contract + sec 12 marketplace, per the 2026-05-27 spike), add five Convergent (Silver) conformance checks (S1-S5) registered in the spine, and adjust the gate runner so a Bronze plugin running new Silver checks stays green - making `tier-report`'s `blocked.convergent` the live to-do list for Phase 3B/3C.

**Architecture:** Each Convergent check is a `.mjs` module tagged `meta = {tier:"convergent", reqId:"S<n>"}`. The S-prefix routes findings into the convergent bucket automatically. A small `scripts/lib/tier.mjs` extraction shares `TIER_ORDER` + `tierForReq` between `tier-report.mjs` and `check.mjs`. The gate-runner caps `errorCount` by the plugin's declared-tier ceiling so convergent errors do not fail a Bronze repo's CI. Documentation (per-rule reference + a how-to walkthrough + the existing Diataxis docs) is first-class.

**Tech Stack:** Node >= 20, ESM `.mjs`, `node:test` + `node:assert/strict`, the existing `yaml` dep (used here for parsing `agents/_chain-permitted.yaml`).

---

## Reference: design + locked decisions

Design doc: `PHASE-3A-DESIGN.md`. Spike: `spikes/2026-05-27_codex-plugin-format.md`.

Locks:
- Standard revision scope: sec 3.2/3.3/3.9 + sec 10.1 + sec 12 + Appendix A + version banner. Out of scope: sec 2.5 Silver-row tweaks, sec 3 component-type sweeps.
- "(b)" stance: toolkit stays declared `universal`. Convergent errors are visible (printed by `check.mjs`, listed in `tier-report.blocked.convergent`) but do NOT fail the gate at the declared tier.
- S6 (per-target format presence) deferred to 3B.
- S4 (chain-contract) ships phantom + workflows-without-contract detection in 3A. **Full orphan detection** (parsing workflow steps for invocations of skills not covered by the contract) is deferred to 3B once workflows are real in the toolkit.
- `library.json` polish: add `"prefix": "askit-"` (preempts S2 finding; optional at Universal but allowed).
- DESIGN.md D19 gets a one-line annotation only; full ADR migration is Phase 4 (Q-C).

### What already exists (do NOT recreate)
- `scripts/lib/findings.mjs` (`finding`, `SEVERITY`).
- `scripts/lib/load-plugin.mjs` (`loadPlugin`, `loadSkill`).
- `scripts/lib/fs-utils.mjs` (`relPath`, `readJsonSafe`, etc.).
- `scripts/lib/frontmatter.mjs` (`parseFrontmatter`, yaml-backed).
- `scripts/lib/registry.mjs` (`CHECKS`, `runAllChecks`).
- `scripts/tier-report.mjs` (`computeTierReport`) - currently has local `TIER_ORDER` + `tierForReq`; Task 6 extracts these.
- `scripts/check.mjs` (`runGate`) - Task 7 modifies to filter by declared tier.
- `scripts/checks/agentskills.mjs` (`checkAgentskills`) - unchanged.
- All Phase 1/2 fixtures.
- Tests anchor fixtures via `import.meta.url`:
  `const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");`

### Conventions
- No em-dash/en-dash anywhere (a PreToolUse hook rejects them). Use " - ".
- CLI guard: `process.argv[1]?.endsWith("<file>.mjs")` for any new script entry.
- Finding shape: `{check, severity, message, file, reqId}`; `relPath(root, abs)` for paths in findings.
- Cite `Standard sec X.Y` in every finding message that maps to a Standard requirement, so an agent reading a report can navigate (per Phase 2 design doc convention).

---

## File Structure

```
STANDARD.md                                  REVISE - v0.8 (sec 3.2/3.3/3.9, sec 10.1, sec 12, Appendix A)
library.json                                 MODIFY - "standard": "0.8"; add "prefix": "askit-"
docs/internal/DESIGN.md                      REVISE - annotate D19 (one line)

scripts/lib/tier.mjs                         NEW - shared TIER_ORDER + tierForReq + ceilingIndex
scripts/tier-report.mjs                      MODIFY - import from lib/tier.mjs (delete local copies)
scripts/check.mjs                            MODIFY - filter errorCount by declared-tier ceiling

scripts/checks/agent-targets.mjs             NEW - S1
scripts/checks/prefix.mjs                    NEW - S2
scripts/checks/components-index.mjs          NEW - S3
scripts/checks/chain-contract.mjs            NEW - S4 (conditional, phantom + workflows-without-contract)
scripts/checks/workflow-skills.mjs           NEW - S5 (conditional)
scripts/lib/registry.mjs                     MODIFY - register the 5 new checks

tests/fixtures/golden/silver-fixture/        NEW - a Silver-shaped plugin (S1-S5 pass)
tests/fixtures/anti/no-agent-targets/        NEW - (S1 anti)
tests/fixtures/anti/no-prefix/               NEW - (S2 anti)
tests/fixtures/anti/components-drift/        NEW - (S3 anti)
tests/fixtures/anti/chain-phantom/           NEW - (S4 anti)
tests/fixtures/anti/workflow-missing-skill/  NEW - (S5 anti)

tests/unit/tier-lib.test.mjs                 NEW - tier helpers
tests/unit/check-runner.test.mjs             EXTEND - declared-tier ceiling cases
tests/unit/agent-targets.test.mjs            NEW
tests/unit/prefix.test.mjs                   NEW
tests/unit/components-index.test.mjs         NEW
tests/unit/chain-contract.test.mjs           NEW
tests/unit/workflow-skills.test.mjs          NEW
tests/unit/seed-blocked-convergent.test.mjs  NEW - locks the climb-to-Silver list

docs/explanation/conformance-and-tiers.md    EXTEND - "Silver checks" + "Visible burndown"
docs/reference/silver-checks.md              NEW - per-rule reference table for S1-S5
docs/how-to/climb-from-bronze-to-silver.md   NEW - the burndown walkthrough
docs/reference/askit-evaluate.md             UPDATE - note Convergent findings
AGENTS.md                                    UPDATE - "Silver checks now run" line

CHANGELOG.md                                 entry under [Unreleased]
```

---

## Task 1: Standard revision sec 3.2/3.3/3.9 + sec 10.1 + Appendix A + version banner

**Files:** Modify `STANDARD.md`.

This is targeted prose editing - no TDD. The "test" is: the file still parses (it is markdown), and the existing suite + gate stay green. There is no automated check that the Standard's wording is correct - that is the maintainer review.

- [ ] **Step 1: Read the current STANDARD.md sec 3.2, sec 3.3, sec 3.9, sec 10.1, Appendix A, and the version banner header**

Use the Read tool on `STANDARD.md` (the whole file is short enough). Note the exact wording so the edits are surgical.

- [ ] **Step 2: Edit sec 3.2 (commands - Codex target)**

In the "CX format" paragraph for sec 3.2, change the Codex target description to (replacing the current Codex-target sentence with this):
`- **CX format:** the Codex target is a **skill packaged inside a Codex plugin** (`.codex-plugin/plugin.json` plus the skill at `skills/<name>/SKILL.md` within the plugin), explicitly invocable. Standalone custom prompts (`~/.codex/prompts/*.md`) remain deprecated in favor of skills; tooling MAY emit the legacy prompt behind an explicit flag with a deprecation warning, but the default Codex target is a skill within a plugin.`

Keep the "Parity note" paragraph that follows unchanged.

- [ ] **Step 3: Edit sec 3.3 (subagents - Codex location)**

In the "CX format" sentence for sec 3.3, replace it with:
`- **CX format:** Codex subagents are declared in `config.toml` `[agents.<name>]` (`description`, `config_file`, optional `nickname_candidates`) with the role defined in a per-agent TOML (e.g., `agents/<name>.toml`); distributed inside the emitted Codex plugin so the plugin's `config.toml` augments the user config when the plugin is loaded. Built-in roles include default/worker/explorer.`

(The "build-time confirm" wording for the loaded-config mechanism is recorded in Appendix A in Step 6 below.)

- [ ] **Step 4: Edit sec 3.9 (MCP - Codex registration)**

In the "Per-agent format" sentence of sec 3.9, replace the Codex sentence with:
`Codex registers the MCP server inside the distributed Codex plugin (the plugin's `config.toml` mcp_servers entries) rather than relying on the user's global `config.toml`. Multi-target plugins MUST emit the registration for each declared target.`

- [ ] **Step 5: Edit sec 10.1 (layout) - add Codex emission targets**

Find the existing layout block (the one that lists `<plugin>/`, `library.json`, `.claude-plugin/plugin.json`, etc.). Replace the Codex line with:
```
  .codex-plugin/plugin.json      Codex native manifest (generated from library.json)  [agent]
  skills/<skill>/                portable skills (shared across Claude + Codex targets)  [agent]
```
And ensure subagent emission for Codex is described in the comment alongside `agents/` referencing `config.toml` + per-role `.toml`. (Read the current block first; preserve everything else.) Marketplaces are a separate concern in sec 12 - do NOT mix the marketplace layout into the plugin layout here.

- [ ] **Step 6: Add an Appendix A entry**

In Appendix A, append:
```
- RESOLVED (2026-05-27, via spike): Codex CLI v0.133 ships a native plugin + marketplace system. A Codex plugin is a directory with `.codex-plugin/plugin.json` (native manifest, parallel to Claude's `.claude-plugin/plugin.json`) plus `skills/<name>/SKILL.md` within it. A Codex marketplace is `.agents/plugins/marketplace.json` (`{name, interface.displayName, plugins:[{name, source:{source,path}, policy, category}]}`). Round-trip locally testable via `codex plugin marketplace add --local <path>` + `codex plugin add <plugin>@<mp>`. F-04 closed. Build-time confirm remaining: exact distribution semantics for subagent + MCP `config.toml` augmentation when a plugin is loaded - to be verified by the 3B emitter against current Codex docs.
```

- [ ] **Step 7: Update the version banner**

At the top of `STANDARD.md`, add a new bullet to the version-history blockquote BEFORE the existing v0.7 line:
`> v0.8: Codex contract revised to the native plugin + marketplace model (sec 3.2/3.3/3.9/10.1 + Appendix A), per the 2026-05-27 spike against Codex CLI v0.133. Sec 12 marketplace updated to describe Codex's concrete native marketplace alongside Claude's.`

Update the top-line "**Standard version 0.X**" banner (the one promoted in Phase 0) to say `**Standard version 0.8**`.

- [ ] **Step 8: Verify suite + gate**

Run: `npm test && node scripts/check.mjs`
Expected: tests pass (no test reads Standard text yet); gate exits 0. The Standard is markdown - nothing breaks.

- [ ] **Step 9: Commit**

```bash
git add STANDARD.md
git commit -m "docs(standard): v0.8 - revise Codex contract to native plugin/marketplace (sec 3.2/3.3/3.9/10.1 + Appendix A)"
```

---

## Task 2: Standard revision sec 12 (marketplace)

**Files:** Modify `STANDARD.md`.

- [ ] **Step 1: Read the current sec 12** in `STANDARD.md`.

- [ ] **Step 2: Replace the Claude-specific marketplace sentence (if any) with an agent-agnostic description and append a Codex example**

The current sec 12 should describe marketplaces abstractly. Append (at the end of the section, before the "Anti-pattern" line):

```
**Concrete marketplace formats.**
- **Claude Code:** `.claude-plugin/marketplace.json` at the marketplace repository root catalogs plugins by source/version.
- **Codex (v0.133+):** `.agents/plugins/marketplace.json` at the marketplace repository root, e.g.:
  ```json
  {
    "name": "<marketplace-id>",
    "interface": { "displayName": "<Display Name>" },
    "plugins": [
      { "name": "<plugin>",
        "source": { "source": "local" | "git", "path": "./plugins/<plugin>" },
        "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
        "category": "<Engineering|Productivity|Research|...>" }
    ]
  }
  ```
  Codex installs via `codex plugin marketplace add <name> <local-path|git-url>` then `codex plugin add <plugin>@<marketplace>`.

The separation rule applies to BOTH formats: a plugin MUST NOT embed a marketplace that lists itself, regardless of which agent's marketplace format is used.
```

- [ ] **Step 3: Verify and commit**

Run: `npm test && node scripts/check.mjs`
Expected: green.
```bash
git add STANDARD.md
git commit -m "docs(standard): sec 12 - describe Codex native marketplace alongside Claude's"
```

---

## Task 3: library.json bump + add prefix

**Files:** Modify `library.json`.

- [ ] **Step 1: Read `library.json`** to see its current shape.

- [ ] **Step 2: Update two fields**

Change `"standard": "0.7"` to `"standard": "0.8"`.
Add `"prefix": "askit-"` as a new top-level field (place it after `"tier"` for readability).

- [ ] **Step 3: Verify the suite + gate stay green**

Run: `npm test && node scripts/check.mjs`
Expected: 65 tests pass; gate exits 0. (No check currently validates the `standard` value or `prefix` shape; S2 is added later but will pass given the value.)

- [ ] **Step 4: Commit**

```bash
git add library.json
git commit -m "build: bump library.json to Standard v0.8; declare prefix askit-"
```

---

## Task 4: Annotate DESIGN.md D19 with spike supersession

**Files:** Modify `docs/internal/DESIGN.md`.

- [ ] **Step 1: Locate the D19 entry** in the decision record table (use Grep for "D19").

- [ ] **Step 2: Append a one-line annotation to D19's "Resolution" cell** (do not rewrite the entry):

`(Superseded 2026-05-27 by spike `spikes/2026-05-27_codex-plugin-format.md` - Codex v0.133 ships a native plugin + marketplace system; the Codex emission contract now targets `.codex-plugin/plugin.json` + `.agents/plugins/marketplace.json`. STANDARD.md v0.8 reflects this; the full ADR migration happens at Phase 4 per Q-C.)`

- [ ] **Step 3: Commit**

```bash
git add docs/internal/DESIGN.md
git commit -m "docs(design): annotate D19 with the 2026-05-27 Codex-format spike supersession"
```

---

## Task 5: Silver fixtures (golden + 5 anti)

**Files:** Create the fixture directories and files listed below.

These are pure fixture authoring - no tests yet. The S1-S5 task tests will exercise them.

- [ ] **Step 1: Create the golden Silver fixture** `tests/fixtures/golden/silver-fixture/`

`tests/fixtures/golden/silver-fixture/library.json`:
```json
{
  "name": "silver-fixture",
  "version": "0.1.0",
  "description": "Silver-shaped fixture plugin used to prove the Convergent checks pass. Use it as the golden baseline for S1-S5.",
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

`tests/fixtures/golden/silver-fixture/AGENTS.md`:
```markdown
# AGENTS.md
Golden Silver-shaped fixture used by the Convergent validation suite.
```

`tests/fixtures/golden/silver-fixture/skills/sf-do-thing/SKILL.md`:
```markdown
---
name: sf-do-thing
description: Converts CSV input into a formatted summary. Use when the user asks to summarize or tabulate spreadsheet data.
metadata:
  version: 0.1.0
---
# sf-do-thing
Steps.
```

(No chain contract, no workflows - S4/S5 are conditional and will not fire on the golden, which is the desired baseline.)

- [ ] **Step 2: Create `tests/fixtures/anti/no-agent-targets/`**

Copy the golden's `library.json`, `AGENTS.md`, and `skills/sf-do-thing/` into this fixture, but:
- In `library.json`, change `"name": "no-agent-targets"`, and DELETE the `agent-targets` field. Keep everything else the same.

- [ ] **Step 3: Create `tests/fixtures/anti/no-prefix/`**

Copy the golden similarly, but in `library.json`: `"name": "no-prefix"`, DELETE the `prefix` field.

- [ ] **Step 4: Create `tests/fixtures/anti/components-drift/`**

Copy the golden similarly, but in `library.json`: `"name": "components-drift"`, change the `components.skills[0]` entry to declare a skill that does NOT exist on disk:
```json
"components": {
  "skills": [
    { "name": "cd-missing-skill", "path": "skills/cd-missing-skill/SKILL.md", "version": "0.1.0", "tier": "universal", "status": "active" }
  ]
}
```
The on-disk skill remains `sf-do-thing` (rename it to match this fixture: `skills/cd-on-disk-only/SKILL.md` with `name: cd-on-disk-only` in frontmatter). So S3 will see one declared-but-missing AND one on-disk-but-undeclared - both kinds of drift.

- [ ] **Step 5: Create `tests/fixtures/anti/chain-phantom/`**

Copy the golden similarly, but in `library.json`: `"name": "chain-phantom"`. Add:

`tests/fixtures/anti/chain-phantom/agents/_chain-permitted.yaml`:
```yaml
sf-do-thing:
  - this-component-does-not-exist
```
(So S4 finds a phantom - the contract names a callee that has no on-disk component.)

- [ ] **Step 6: Create `tests/fixtures/anti/workflow-missing-skill/`**

Copy the golden similarly, but in `library.json`: `"name": "workflow-missing-skill"`. Add:

`tests/fixtures/anti/workflow-missing-skill/_workflows/demo.md`:
```markdown
---
steps:
  - sf-do-thing
  - this-skill-does-not-exist
agent-targets: [claude]
exit-criteria: done
---
# demo workflow
```
AND add a sibling `agents/_chain-permitted.yaml` (so S4 doesn't fire its "workflows-without-contract" error - we want THIS fixture to isolate S5 specifically):
```yaml
sf-do-thing:
  - sf-do-thing
```

- [ ] **Step 7: Commit**

```bash
git add tests/fixtures/golden/silver-fixture tests/fixtures/anti/no-agent-targets tests/fixtures/anti/no-prefix tests/fixtures/anti/components-drift tests/fixtures/anti/chain-phantom tests/fixtures/anti/workflow-missing-skill
git commit -m "test(fixtures): Silver golden + S1-S5 anti fixtures"
```

---

## Task 6: Extract `scripts/lib/tier.mjs` (shared tier helpers)

**Files:** Create `scripts/lib/tier.mjs`; modify `scripts/tier-report.mjs`; create `tests/unit/tier-lib.test.mjs`.

- [ ] **Step 1: Write the failing test** `tests/unit/tier-lib.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { TIER_ORDER, tierForReq, ceilingIndex } from "../../scripts/lib/tier.mjs";

test("TIER_ORDER is universal, convergent, advanced", () => {
  assert.deepEqual(TIER_ORDER, ["universal", "convergent", "advanced"]);
});

test("tierForReq maps prefixes correctly", () => {
  assert.equal(tierForReq(null), "universal");
  assert.equal(tierForReq("U1"), "universal");
  assert.equal(tierForReq("U8"), "universal");
  assert.equal(tierForReq("S1"), "convergent");
  assert.equal(tierForReq("G3"), "advanced");
  assert.equal(tierForReq("A2"), "advanced");
});

test("ceilingIndex returns declared tier index or last when missing", () => {
  assert.equal(ceilingIndex("universal"), 0);
  assert.equal(ceilingIndex("convergent"), 1);
  assert.equal(ceilingIndex("advanced"), 2);
  assert.equal(ceilingIndex(undefined), 2);
  assert.equal(ceilingIndex(null), 2);
  assert.equal(ceilingIndex("bogus"), 2);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/tier-lib.test.mjs`
Expected: FAIL - module not found.

- [ ] **Step 3: Create `scripts/lib/tier.mjs`**

```js
export const TIER_ORDER = ["universal", "convergent", "advanced"];

/** Map a reqId prefix to its tier. Null/empty -> universal (the safest default). */
export function tierForReq(reqId) {
  if (!reqId) return "universal";
  if (reqId.startsWith("U")) return "universal";
  if (reqId.startsWith("S")) return "convergent";
  return "advanced"; // A-prefix and anything else (e.g. Gold G-prefix) maps to advanced
}

/** Map a declared-tier string to its index in TIER_ORDER. Missing/unknown -> last (no ceiling). */
export function ceilingIndex(declared) {
  const i = TIER_ORDER.indexOf(declared);
  return i >= 0 ? i : TIER_ORDER.length - 1;
}
```

- [ ] **Step 4: Refactor `scripts/tier-report.mjs` to import from the new lib**

Read `scripts/tier-report.mjs`. Remove the local `const TIER_ORDER = [...]` and the local `function tierForReq(...)` definitions. Add at the top:
```js
import { TIER_ORDER, tierForReq } from "./lib/tier.mjs";
```
Verify nothing else in tier-report uses or re-exports these locally. Run all tier-report tests; they must still pass (the imports are behavior-preserving).

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all prior tests + the 3 new tier-lib tests pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/tier.mjs scripts/tier-report.mjs tests/unit/tier-lib.test.mjs
git commit -m "refactor(lib): extract TIER_ORDER + tierForReq + ceilingIndex to lib/tier.mjs"
```

---

## Task 7: Gate-runner declared-tier ceiling filter

**Files:** Modify `scripts/check.mjs`; extend `tests/unit/check-runner.test.mjs`.

This MUST land before the S-checks are registered (Task 13), so the toolkit's repo stays exit 0 when new Convergent findings appear.

- [ ] **Step 1: Read the current `scripts/check.mjs`** (the `runGate` function and the CLI).

- [ ] **Step 2: Write the failing tests** (extend `tests/unit/check-runner.test.mjs`)

Append:
```js
test("gate filters errorCount by declared-tier ceiling: convergent error on universal plugin does NOT fail", () => {
  // Synthesize a ctx with declared universal but a convergent error in findings.
  // Use the missing-library-json fixture for a known-broken plugin, but the new test
  // does not rely on it - we test the filter via runGate's findings filter directly.
  // Easiest: a fake ctx + monkey-patched runAllChecks is overkill; use the new
  // silver-fixture (declared convergent) inverted.
  // For a clean test: use no-agent-targets which is declared convergent and S1 errors;
  // wrap it with a declared universal to assert filter. Since the fixture's library.json
  // declares convergent, simpler: test the runGate filter in isolation via a temporary
  // tier override.
  // SIMPLEST PATH: dispatch runGate against no-agent-targets (declared convergent) -> S1 error -> exitCode 1 (errors at declared tier).
  const r = runGate(path.join(FIXTURES, "anti/no-agent-targets"));
  assert.equal(r.exitCode, 1, "declared convergent + S1 error must fail the gate");
  assert.ok(r.findings.some((f) => f.reqId === "S1" && f.severity === "error"));
});

test("gate filters errorCount by declared-tier ceiling: same S1 error on a universal-declared variant does NOT fail", () => {
  // Build a temporary fixture inline: copy no-agent-targets but force tier=universal at read.
  // Cleanest: use a synthesized ctx via the runGate(root, ctx) override.
  // For now, write a tiny inline ctx with one fake S1 error finding and call the gate's filter.
  // Since runGate's contract takes (root, ctx?), pass a hand-built ctx.
  const fakeCtx = {
    root: ".",
    library: { data: { tier: "universal" }, parseError: null },
    agentsMdPath: "/fake/AGENTS.md",
    claudeManifest: null,
    skills: [],
  };
  // Monkey: temporarily replace runAllChecks via dynamic import? Too invasive.
  // Cleaner: assert the FILTER directly by extracting it - see Step 4.
  // For this test, we accept that the ceiling filter is tested via the inline ceiling utility tests in Task 6 (ceilingIndex covers the mapping), and via the END-TO-END check below using the seed-blocked-convergent test (Task 14) which asserts the repo (declared universal) exits 0 even with S-errors after registration.
  // This is a placeholder reminder; remove the inline placeholder commentary and instead add the runtime test below.
  assert.ok(true);
});
```

NOTE: the "monkey patching" approach above is awkward. Use this CLEANER test pattern instead - pass a stub `findings` source. Actually, the simplest robust test: register the new S-checks first (which is Task 13) and then add the end-to-end repo gate test (Task 14 `seed-blocked-convergent`) which exercises this exact case.

REVISED Step 2 - replace the above with a single end-to-end test using an existing fixture pair:
```js
test("gate filters errors by declared-tier ceiling (convergent fixture with S1 error fails; same content declared universal would not)", () => {
  // Direct test of runGate against no-agent-targets (declared convergent). After S1 is registered
  // (Task 13), this fixture WILL emit an S1 error and the gate WILL exit 1 (correct - the
  // declared tier is convergent, so convergent errors count). The Universal case is covered
  // by the seed-blocked-convergent test on the repo itself.
  const r = runGate(path.join(FIXTURES, "anti/no-agent-targets"));
  // Before Task 13 registration, S1 is not registered - so r.findings does not include S1
  // and exitCode is 0. After Task 13, S1 fires and exitCode is 1. Either way, this assertion
  // holds at this Task's time of writing.
  assert.ok(r.exitCode === 0 || r.exitCode === 1);
});
```

Actually this is unsatisfying. The cleanest is to test the FILTER as a UNIT, not via the registry. Replace Step 2 entirely with the following clean approach using a unit test on the gate's filter logic. Add to `tests/unit/check-runner.test.mjs`:
```js
import { gateExitFromFindings } from "../../scripts/check.mjs";

test("gateExitFromFindings: universal-declared, no errors at-or-below universal -> exit 0", () => {
  const findings = [
    { check: "x", severity: "error", message: "m", file: null, reqId: "S1" }, // convergent
  ];
  const { exitCode, errorCount } = gateExitFromFindings(findings, "universal");
  assert.equal(exitCode, 0);
  assert.equal(errorCount, 0);
});

test("gateExitFromFindings: universal-declared, universal error -> exit 1", () => {
  const findings = [{ check: "x", severity: "error", message: "m", file: null, reqId: "U1" }];
  const { exitCode, errorCount } = gateExitFromFindings(findings, "universal");
  assert.equal(exitCode, 1);
  assert.equal(errorCount, 1);
});

test("gateExitFromFindings: no declared tier -> all errors count (back-compat)", () => {
  const findings = [{ check: "x", severity: "error", message: "m", file: null, reqId: "S1" }];
  const { exitCode } = gateExitFromFindings(findings, undefined);
  assert.equal(exitCode, 1);
});

test("gateExitFromFindings: convergent-declared, convergent error -> exit 1", () => {
  const findings = [{ check: "x", severity: "error", message: "m", file: null, reqId: "S1" }];
  const { exitCode } = gateExitFromFindings(findings, "convergent");
  assert.equal(exitCode, 1);
});
```

- [ ] **Step 3: Run the new tests to verify they fail**

Run: `node --test tests/unit/check-runner.test.mjs`
Expected: FAIL - `gateExitFromFindings` is not exported.

- [ ] **Step 4: Modify `scripts/check.mjs`**

Add imports at the top:
```js
import { TIER_ORDER, tierForReq, ceilingIndex } from "./lib/tier.mjs";
```
Add the new helper and refactor `runGate` to use it:
```js
/** Exported for unit testing. Filters error severity by declared-tier ceiling. */
export function gateExitFromFindings(findings, declaredTier) {
  const ceiling = ceilingIndex(declaredTier);
  const gatedErrors = findings.filter(
    (f) => f.severity === "error" && TIER_ORDER.indexOf(tierForReq(f.reqId)) <= ceiling
  );
  return {
    errorCount: gatedErrors.length,
    exitCode: gatedErrors.length > 0 ? 1 : 0,
  };
}

export function runGate(root, ctx = loadPlugin(root)) {
  const findings = runAllChecks(ctx);
  const { errorCount, exitCode } = gateExitFromFindings(findings, ctx?.library?.data?.tier);
  const warnCount = findings.filter((f) => f.severity === "warn").length;
  return { findings, errorCount, warnCount, exitCode };
}
```

(The `findings` returned still includes ALL errors - the filter only affects the gate exit. This matches the design: convergent errors stay visible in the printed report but do not fail the gate at the declared universal ceiling.)

- [ ] **Step 5: Run the new tests** and the full suite

Run: `node --test tests/unit/check-runner.test.mjs` then `npm test`
Expected: 4 new gate-filter tests pass; full suite green.

- [ ] **Step 6: Commit**

```bash
git add scripts/check.mjs tests/unit/check-runner.test.mjs
git commit -m "feat(gate): filter errorCount by declared-tier ceiling (Bronze stays green under Silver checks)"
```

---

## Task 8: Check S1 - `agent-targets` (TDD)

**Files:** Create `scripts/checks/agent-targets.mjs`; Create `tests/unit/agent-targets.test.mjs`.

- [ ] **Step 1: Write the failing test**

`tests/unit/agent-targets.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, meta } from "../../scripts/checks/agent-targets.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

test("meta declares S1 convergent", () => {
  assert.equal(meta.reqId, "S1");
  assert.equal(meta.tier, "convergent");
});

test("golden silver fixture has agent-targets - no error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "golden/silver-fixture")));
  assert.equal(r.filter((f) => f.severity === "error").length, 0);
});

test("no-agent-targets fixture is an S1 error citing library.json", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/no-agent-targets")));
  const err = r.find((f) => f.severity === "error");
  assert.ok(err);
  assert.equal(err.reqId, "S1");
  assert.equal(err.file, "library.json");
});

test("invalid agent-targets value is an error", () => {
  const ctx = { library: { data: { "agent-targets": ["claude", "bogus"] } } };
  const r = check(ctx);
  assert.ok(r.some((f) => f.severity === "error" && /bogus/.test(f.message)));
});

test("empty agent-targets array is an error", () => {
  const ctx = { library: { data: { "agent-targets": [] } } };
  const r = check(ctx);
  assert.ok(r.some((f) => f.severity === "error"));
});

test("no library.json data - no finding (U1 owns that)", () => {
  assert.deepEqual(check({ library: { data: null } }), []);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/agent-targets.test.mjs`
Expected: FAIL - module not found.

- [ ] **Step 3: Write `scripts/checks/agent-targets.mjs`**

```js
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "agent-targets", tier: "convergent", reqId: "S1" };

const VALID = new Set(["claude", "codex"]);

export function check(ctx) {
  const lib = ctx.library?.data;
  if (!lib) return []; // U1 owns missing library.json
  const out = [];
  const t = lib["agent-targets"];
  if (t === undefined) {
    out.push(finding(meta.id, SEVERITY.ERROR, "library.json is missing \"agent-targets\" (REQUIRED at Convergent+; Standard sec 5.1, sec 2.2).", { file: "library.json", reqId: meta.reqId }));
    return out;
  }
  if (!Array.isArray(t) || t.length === 0) {
    out.push(finding(meta.id, SEVERITY.ERROR, "library.json \"agent-targets\" must be a non-empty array of \"claude\" and/or \"codex\".", { file: "library.json", reqId: meta.reqId }));
    return out;
  }
  for (const v of t) {
    if (!VALID.has(v)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `library.json "agent-targets" contains invalid value "${v}"; allowed: claude, codex (Standard sec 5.1).`, { file: "library.json", reqId: meta.reqId }));
    }
  }
  return out;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test tests/unit/agent-targets.test.mjs`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/checks/agent-targets.mjs tests/unit/agent-targets.test.mjs
git commit -m "feat(checks): S1 agent-targets - Convergent library.json field validator"
```

---

## Task 9: Check S2 - `prefix` (TDD)

**Files:** Create `scripts/checks/prefix.mjs`; Create `tests/unit/prefix.test.mjs`.

- [ ] **Step 1: Write the failing test**

`tests/unit/prefix.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, meta } from "../../scripts/checks/prefix.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

test("meta declares S2 convergent", () => {
  assert.equal(meta.reqId, "S2");
  assert.equal(meta.tier, "convergent");
});

test("golden silver fixture has prefix sf- - no error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "golden/silver-fixture")));
  assert.equal(r.filter((f) => f.severity === "error").length, 0);
});

test("no-prefix fixture is an S2 error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/no-prefix")));
  const err = r.find((f) => f.severity === "error");
  assert.ok(err);
  assert.equal(err.reqId, "S2");
});

test("invalid prefix (no trailing dash) is an error", () => {
  const ctx = { library: { data: { prefix: "askit" } } };
  assert.ok(check(ctx).some((f) => f.severity === "error" && /kebab/.test(f.message)));
});

test("invalid prefix (uppercase) is an error", () => {
  const ctx = { library: { data: { prefix: "ASkit-" } } };
  assert.ok(check(ctx).some((f) => f.severity === "error"));
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/prefix.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Write `scripts/checks/prefix.mjs`**

```js
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "prefix", tier: "convergent", reqId: "S2" };

// Kebab-case, all lowercase letters/digits with single hyphens, ending in '-'.
const KEBAB_DASH = /^[a-z0-9]+(?:-[a-z0-9]+)*-$/;

export function check(ctx) {
  const lib = ctx.library?.data;
  if (!lib) return [];
  const p = lib.prefix;
  if (p === undefined) {
    return [finding(meta.id, SEVERITY.ERROR, "library.json is missing \"prefix\" (REQUIRED at Convergent+; Standard sec 8.2).", { file: "library.json", reqId: meta.reqId })];
  }
  if (typeof p !== "string" || !KEBAB_DASH.test(p)) {
    return [finding(meta.id, SEVERITY.ERROR, `library.json "prefix" must be lowercase kebab-case ending in "-" (got ${JSON.stringify(p)}); Standard sec 8.2.`, { file: "library.json", reqId: meta.reqId })];
  }
  return [];
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test tests/unit/prefix.test.mjs`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/checks/prefix.mjs tests/unit/prefix.test.mjs
git commit -m "feat(checks): S2 prefix - Convergent library.json field validator"
```

---

## Task 10: Check S3 - `components-index` (TDD)

**Files:** Create `scripts/checks/components-index.mjs`; Create `tests/unit/components-index.test.mjs`.

- [ ] **Step 1: Write the failing test**

`tests/unit/components-index.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, meta } from "../../scripts/checks/components-index.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

test("meta declares S3 convergent", () => {
  assert.equal(meta.reqId, "S3");
  assert.equal(meta.tier, "convergent");
});

test("golden silver fixture has matching components index - no error", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "golden/silver-fixture")));
  assert.equal(r.filter((f) => f.severity === "error").length, 0);
});

test("components-drift fixture errors on both declared-missing and on-disk-undeclared", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/components-drift")));
  const errs = r.filter((f) => f.severity === "error");
  assert.ok(errs.some((e) => /cd-missing-skill/.test(e.message) && /not on disk/.test(e.message)));
  assert.ok(errs.some((e) => /cd-on-disk-only/.test(e.message) && /not declared/.test(e.message)));
});

test("missing components is an S3 error", () => {
  const ctx = { library: { data: {} }, skills: [] };
  assert.ok(check(ctx).some((f) => f.reqId === "S3" && /missing/.test(f.message)));
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/components-index.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Write `scripts/checks/components-index.mjs`**

```js
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "components-index", tier: "convergent", reqId: "S3" };

export function check(ctx) {
  const lib = ctx.library?.data;
  if (!lib) return [];
  const out = [];
  const components = lib.components;
  if (components === undefined) {
    out.push(finding(meta.id, SEVERITY.ERROR, "library.json is missing \"components\" index (REQUIRED at Convergent+; Standard sec 5.1).", { file: "library.json", reqId: meta.reqId }));
    return out;
  }
  if (typeof components !== "object" || components === null || Array.isArray(components)) {
    out.push(finding(meta.id, SEVERITY.ERROR, "library.json \"components\" must be an object keyed by component type (e.g. { \"skills\": [...] }).", { file: "library.json", reqId: meta.reqId }));
    return out;
  }
  const declaredSkills = Array.isArray(components.skills) ? components.skills : [];
  const onDiskSkillNames = new Set((ctx.skills || []).map((s) => s.name));
  const declaredSkillNames = new Set();
  for (const c of declaredSkills) {
    if (!c || typeof c.name !== "string") {
      out.push(finding(meta.id, SEVERITY.ERROR, "library.json components.skills entry is missing required string \"name\".", { file: "library.json", reqId: meta.reqId }));
      continue;
    }
    declaredSkillNames.add(c.name);
    if (!onDiskSkillNames.has(c.name)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `library.json components.skills declares "${c.name}" but it is not on disk under skills/.`, { file: "library.json", reqId: meta.reqId }));
    }
  }
  for (const s of (ctx.skills || [])) {
    if (!declaredSkillNames.has(s.name)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `skills/${s.name} exists on disk but is not declared in library.json components.skills.`, { file: "library.json", reqId: meta.reqId }));
    }
  }
  return out;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test tests/unit/components-index.test.mjs`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/checks/components-index.mjs tests/unit/components-index.test.mjs
git commit -m "feat(checks): S3 components-index drift (skills only in 3A; other types in 3C)"
```

---

## Task 11: Check S4 - chain-contract (TDD; phantom + workflows-without-contract)

**Files:** Create `scripts/checks/chain-contract.mjs`; Create `tests/unit/chain-contract.test.mjs`.

Scope: in 3A, S4 detects (a) `_workflows/` exists with content but `agents/_chain-permitted.yaml` is missing, and (b) phantom contract entries (callers or callees in the contract that have no on-disk component). **Full orphan detection** (parsing workflow steps for invocations not covered by the contract) is deferred to 3B - workflows are not yet real in the toolkit, and the parsing is non-trivial.

- [ ] **Step 1: Write the failing test**

`tests/unit/chain-contract.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, meta } from "../../scripts/checks/chain-contract.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

test("meta declares S4 convergent", () => {
  assert.equal(meta.reqId, "S4");
  assert.equal(meta.tier, "convergent");
});

test("golden silver fixture (no chaining) - no findings (conditional)", () => {
  assert.deepEqual(check(loadPlugin(path.join(FIXTURES, "golden/silver-fixture"))), []);
});

test("chain-phantom fixture: contract names a callee that has no on-disk component", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/chain-phantom")));
  assert.ok(r.some((f) => f.reqId === "S4" && /this-component-does-not-exist/.test(f.message) && /missing/.test(f.message)));
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/chain-contract.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Write `scripts/checks/chain-contract.mjs`**

```js
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

  // Conditional: only checks fire when chaining is in use.
  if (!hasContract && !hasWorkflows) return [];

  if (!hasContract && hasWorkflows) {
    out.push(finding(meta.id, SEVERITY.ERROR, "workflows are present but agents/_chain-permitted.yaml is missing (chain contract is REQUIRED when chaining is used; Standard sec 3.6).", { file: "agents/_chain-permitted.yaml", reqId: meta.reqId }));
    return out;
  }

  // Parse the contract
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

  // Phantom detection: contract names callers/callees that have no on-disk component.
  // In 3A, the known set is the skills list; subagent/workflow components extend this in 3B/3C.
  const known = new Set((ctx.skills || []).map((s) => s.name));
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
  // Orphan detection (workflow steps invoking skills not covered by the contract) is deferred to 3B.
  return out;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test tests/unit/chain-contract.test.mjs`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/checks/chain-contract.mjs tests/unit/chain-contract.test.mjs
git commit -m "feat(checks): S4 chain-contract - phantom + workflows-without-contract (orphan detection in 3B)"
```

---

## Task 12: Check S5 - workflow-skills (TDD; conditional)

**Files:** Create `scripts/checks/workflow-skills.mjs`; Create `tests/unit/workflow-skills.test.mjs`.

- [ ] **Step 1: Write the failing test**

`tests/unit/workflow-skills.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { check, meta } from "../../scripts/checks/workflow-skills.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

test("meta declares S5 convergent", () => {
  assert.equal(meta.reqId, "S5");
  assert.equal(meta.tier, "convergent");
});

test("golden silver fixture (no workflows) - no findings", () => {
  assert.deepEqual(check(loadPlugin(path.join(FIXTURES, "golden/silver-fixture"))), []);
});

test("workflow-missing-skill fixture: S5 error naming the missing skill", () => {
  const r = check(loadPlugin(path.join(FIXTURES, "anti/workflow-missing-skill")));
  assert.ok(r.some((f) => f.reqId === "S5" && /this-skill-does-not-exist/.test(f.message)));
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/workflow-skills.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Write `scripts/checks/workflow-skills.mjs`**

```js
import { finding, SEVERITY } from "../lib/findings.mjs";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "../lib/frontmatter.mjs";

export const meta = { id: "workflow-skills", tier: "convergent", reqId: "S5" };

export function check(ctx) {
  const out = [];
  const workflowsDir = path.join(ctx.root, "_workflows");
  if (!existsSync(workflowsDir) || !statSync(workflowsDir).isDirectory()) return [];

  const known = new Set((ctx.skills || []).map((s) => s.name));
  for (const entry of readdirSync(workflowsDir)) {
    const full = path.join(workflowsDir, entry);
    if (!entry.endsWith(".md") || !statSync(full).isFile()) continue;
    const { frontmatter } = parseFrontmatter(readFileSync(full, "utf8"));
    const steps = frontmatter?.steps;
    if (!Array.isArray(steps)) continue;
    for (const step of steps) {
      const skillName = typeof step === "string" ? step : step?.skill;
      if (typeof skillName === "string" && !known.has(skillName)) {
        out.push(finding(meta.id, SEVERITY.ERROR, `workflow "${entry}" references skill "${skillName}" which does not exist on disk (Standard sec 3.4).`, { file: `_workflows/${entry}`, reqId: meta.reqId }));
      }
    }
  }
  return out;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test tests/unit/workflow-skills.test.mjs`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/checks/workflow-skills.mjs tests/unit/workflow-skills.test.mjs
git commit -m "feat(checks): S5 workflow-skills existence (conditional; sec 3.4)"
```

---

## Task 13: Register S1-S5 in the registry

**Files:** Modify `scripts/lib/registry.mjs`.

- [ ] **Step 1: Read `scripts/lib/registry.mjs`** to see the existing import + CHECKS list.

- [ ] **Step 2: Add imports + entries** (preserve existing imports/order)

Add at the top with the other check imports:
```js
import * as agentTargets from "../checks/agent-targets.mjs";
import * as prefix from "../checks/prefix.mjs";
import * as componentsIndex from "../checks/components-index.mjs";
import * as chainContract from "../checks/chain-contract.mjs";
import * as workflowSkills from "../checks/workflow-skills.mjs";
```

Append to the `CHECKS` array, after the existing entries:
```js
agentTargets, prefix, componentsIndex, chainContract, workflowSkills,
```

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: all tests pass. The repo's `seed-bronze` test stays green because:
- The toolkit declares `tier: universal`, so the gate-runner filter (Task 7) keeps `exitCode = 0` even though S1/S3 now fire.
- `tier-report` correctly reports `tier: universal`, `satisfies: [universal]`, with `blocked.convergent: [S1: ..., S3: ...]`.

If the suite goes red, STOP and report - the most likely cause is the gate filter not being in effect on the repo gate.

- [ ] **Step 4: Smoke-check on the repo**

Run: `node scripts/check.mjs` then `node scripts/tier-report.mjs --json`
Expected:
- `check.mjs`: prints S1 + S3 findings in the list; `0 error(s)` (filtered) or `N error(s)` with `exitCode 0`; the summary reflects the filter. (The summary line may need a wording tweak - if the printed `N error(s)` counts UNFILTERED, leave it as informational and document the difference in the conformance-and-tiers doc. The exit code is what matters for CI.)
- `tier-report --json`: `{"tier":"universal","satisfies":["universal"],"blocked":{"convergent":["S1: ...","S3: ..."]}}`.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/registry.mjs
git commit -m "feat(registry): register S1-S5 Convergent checks (toolkit shows climb-to-Silver in tier-report.blocked.convergent)"
```

---

## Task 14: `seed-blocked-convergent.test.mjs` - lock the burndown contract

**Files:** Create `tests/unit/seed-blocked-convergent.test.mjs`.

- [ ] **Step 1: Write the test**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTierReport } from "../../scripts/tier-report.mjs";

const REPO = process.cwd();

test("repo tier-report: declared universal, satisfies universal, blocked.convergent lists the Silver climb (S1 agent-targets and S3 components-index)", () => {
  const t = computeTierReport(REPO);
  assert.equal(t.tier, "universal");
  assert.deepEqual(t.satisfies, ["universal"]);
  const blocked = t.blocked.convergent ?? [];
  // S2 (prefix) and S4/S5 (conditional, not triggered) must NOT appear.
  assert.ok(blocked.some((s) => s.startsWith("S1")), "expected S1 (agent-targets) in blocked.convergent: " + JSON.stringify(blocked));
  assert.ok(blocked.some((s) => s.startsWith("S3")), "expected S3 (components-index) in blocked.convergent: " + JSON.stringify(blocked));
  assert.ok(!blocked.some((s) => s.startsWith("S2")), "S2 (prefix) should NOT block - askit- is set in library.json");
  assert.ok(!blocked.some((s) => s.startsWith("S4")), "S4 (chain-contract) should NOT block - no chaining present");
  assert.ok(!blocked.some((s) => s.startsWith("S5")), "S5 (workflow-skills) should NOT block - no workflows present");
});
```

- [ ] **Step 2: Run it**

Run: `node --test tests/unit/seed-blocked-convergent.test.mjs`
Expected: PASS. If it fails, the assertion message names what is wrong about the toolkit's library.json state - do NOT modify the test or the checks; fix the seed (likely the prefix value, or the absence of `agent-targets` if you accidentally added it).

- [ ] **Step 3: Run the full suite + the gate**

Run: `npm test && node scripts/check.mjs`
Expected: full suite green; gate exits 0.

- [ ] **Step 4: Commit**

```bash
git add tests/unit/seed-blocked-convergent.test.mjs
git commit -m "test: lock the Silver burndown - repo blocks on S1 + S3 only"
```

---

## Task 15: Extend `docs/explanation/conformance-and-tiers.md`

**Files:** Modify `docs/explanation/conformance-and-tiers.md`.

- [ ] **Step 1: Read the current file** to match its tone.

- [ ] **Step 2: Append two new subsections** after the existing content:

```markdown

## Silver checks (added in Phase 3A)

Convergent (Silver) reqIds carry the `S` prefix. The current set:

| reqId | What | Standard | Conditional? |
|---|---|---|---|
| S1 | `library.json` `agent-targets` present + valid | sec 5.1, sec 2.2 | no |
| S2 | `library.json` `prefix` present + kebab-dash | sec 8.2 | no |
| S3 | `library.json` `components` index matches disk | sec 5.1, sec 10.3 | no |
| S4 | Chain-contract integrity (phantom; missing-when-chaining) | sec 3.6 | yes |
| S5 | Workflow skill-existence | sec 3.4 | yes |

S6 (per-target format presence) is added in Phase 3B alongside emission.

## Visible burndown - reading `blocked.convergent` as the climb to Silver

`tier-report` caps `satisfies` at the plugin's declared tier (so a Bronze plugin cannot accidentally claim Silver), and lists everything above the ceiling as `blocked.<next-tier>`. The gate-runner (`check.mjs`) follows the same model: only errors at-or-below the declared tier fail the gate. So a Bronze plugin that adds Silver requirements gradually sees its `blocked.convergent` list shrink, while CI stays green throughout the climb. The repository itself works this way - `node scripts/tier-report.mjs --json` prints the toolkit's remaining Silver gaps as a literal to-do list.
```

- [ ] **Step 3: Commit**

```bash
git add docs/explanation/conformance-and-tiers.md
git commit -m "docs(explanation): Silver checks + visible-burndown subsection"
```

---

## Task 16: `docs/reference/silver-checks.md` - NEW per-rule reference

**Files:** Create `docs/reference/silver-checks.md`.

- [ ] **Step 1: Write the file**

```markdown
# Reference: Silver (Convergent) conformance checks

Five checks (S1-S5) earn Silver tier. Each fires findings tagged `reqId: "S<n>"`; tier-report buckets them into the `convergent` tier and lists unmet ones in `blocked.convergent`.

| reqId | Module | What it checks | Standard | Conditional? | Example fix |
|---|---|---|---|---|---|
| S1 | `scripts/checks/agent-targets.mjs` | `library.json.agent-targets` is a non-empty array of `claude`/`codex` | sec 5.1, sec 2.2 | no | Add `"agent-targets": ["claude", "codex"]` to `library.json`. |
| S2 | `scripts/checks/prefix.mjs` | `library.json.prefix` is lowercase kebab-case ending in `-` | sec 8.2 | no | Add `"prefix": "<short>-"` to `library.json` (e.g. `"askit-"`). |
| S3 | `scripts/checks/components-index.mjs` | `library.json.components.skills` index matches on-disk `skills/` | sec 5.1, sec 10.3 | no | Run `node scripts/generators/gen-manifest.mjs . --write` to refresh the resolved manifest, then ensure `library.json.components.skills` lists each on-disk skill with `{name, path, version, tier, status}`. |
| S4 | `scripts/checks/chain-contract.mjs` | `agents/_chain-permitted.yaml` has no phantom entries; present when workflows exist | sec 3.6 | yes (chaining-in-use) | Either remove the unused contract entry, or add the missing component on disk. |
| S5 | `scripts/checks/workflow-skills.mjs` | Workflows reference only on-disk skills | sec 3.4 | yes (workflows exist) | Fix the workflow's `steps:` list to reference an existing skill name. |

Findings cite their Standard section in the message, so an agent reading a report can navigate to the rule. Convergent errors do NOT fail the gate at the Universal tier - they appear in `blocked.convergent` until the plugin declares `convergent` and addresses them.
```

- [ ] **Step 2: Commit**

```bash
git add docs/reference/silver-checks.md
git commit -m "docs(reference): silver-checks.md - per-rule reference for S1-S5"
```

---

## Task 17: `docs/how-to/climb-from-bronze-to-silver.md` - NEW walkthrough

**Files:** Create `docs/how-to/climb-from-bronze-to-silver.md`.

- [ ] **Step 1: Write the file**

```markdown
# How to climb from Bronze to Silver

The toolkit's validators turn the Silver climb into a literal to-do list you can read off `tier-report`.

## 1. Read the burndown

```
node scripts/tier-report.mjs --json
```

Look at `blocked.convergent` - each entry is a `S<n>: <message>` reminder of what stands between this plugin and Silver.

## 2. Fix items one by one

For each `S<n>` entry, see the per-rule reference (`docs/reference/silver-checks.md`) for the exact remediation. Most fixes are small edits to `library.json`:

- **S1 missing agent-targets:** add `"agent-targets": ["claude", "codex"]`.
- **S2 missing prefix:** add `"prefix": "<short>-"`.
- **S3 components index drift:** regenerate the manifest and align `components.skills` with what is on disk.

Re-run `tier-report --json` after each fix; the `blocked.convergent` list shrinks.

## 3. Declare convergent

When `blocked.convergent` is empty (and S4/S5 are satisfied or do not apply), update `library.json`:

```
"tier": "convergent"
```

From that point `node scripts/check.mjs` starts gating on Convergent errors too (the declared-tier ceiling rises). If anything still flags, the climb is not actually done - keep fixing until the gate exits 0 at the new tier.

## 4. Wait for 3B to ship emission

S6 (per-target format presence) is added in Phase 3B alongside the Codex-emission generators. Until then, Silver means the `library.json` and chain/workflow integrity are correct; the per-target emission proof arrives with the emitters.
```

- [ ] **Step 2: Commit**

```bash
git add docs/how-to/climb-from-bronze-to-silver.md
git commit -m "docs(how-to): walkthrough for reading blocked.convergent as the Silver climb"
```

---

## Task 18: Update `docs/reference/askit-evaluate.md`

**Files:** Modify `docs/reference/askit-evaluate.md`.

- [ ] **Step 1: Read the current file**.

- [ ] **Step 2: Append at the bottom**:

```markdown

## Multi-tier findings

Reports may include findings tagged at any tier (U-prefix universal, S-prefix convergent, A/G-prefix advanced). Findings ABOVE the plugin's declared tier do not fail the gate at the current ceiling - they appear in `blocked.<next-tier>` instead, as the visible burndown to the next tier. See [`../how-to/climb-from-bronze-to-silver.md`](../how-to/climb-from-bronze-to-silver.md).
```

- [ ] **Step 3: Commit**

```bash
git add docs/reference/askit-evaluate.md
git commit -m "docs(reference): askit-evaluate - note multi-tier findings + burndown"
```

---

## Task 19: Update `AGENTS.md` - Silver checks line

**Files:** Modify `AGENTS.md`.

- [ ] **Step 1: Read AGENTS.md** to find the validation-spine bullet (under "Components present on disk" -> "Scripts").

- [ ] **Step 2: Add a sentence right after the Scripts bullet** describing the Silver checks:

`- **Silver checks (Convergent, reqId S1-S5)** run alongside the Universal ones; they emit findings into the convergent tier. Convergent findings populate `tier-report`'s `blocked.convergent` (the visible climb to Silver) without failing the gate at the declared Universal tier.`

(Place this as its own bullet inside the same Components-present block.)

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs(agents): Silver checks now run; burndown visible in blocked.convergent"
```

---

## Task 20: CHANGELOG + final verification

**Files:** Modify `CHANGELOG.md`.

- [ ] **Step 1: Read the [Unreleased] section** in CHANGELOG.md.

- [ ] **Step 2: Append to the Added list under [Unreleased]:**

```
- Standard revised to v0.8: Codex emission contract updated to Codex's native plugin + marketplace model (sec 3.2/3.3/3.9/10.1 + Appendix A, per 2026-05-27 spike against Codex CLI v0.133); sec 12 describes Codex's concrete native marketplace alongside Claude's.
- Five Convergent (Silver) conformance checks (S1-S5): agent-targets, prefix, components-index drift, chain-contract integrity (phantom + workflows-without-contract), workflow skill-existence. Composed via the existing registry; tagged with the `S` reqId prefix so tier-report buckets them into the convergent tier automatically.
- `scripts/lib/tier.mjs`: shared TIER_ORDER + tierForReq + ceilingIndex helpers used by tier-report and the gate runner.
- Gate runner (`check.mjs`) filters errorCount by the declared-tier ceiling: convergent errors on a Bronze plugin appear in the printed findings + `tier-report.blocked.convergent`, but do not fail CI. This is the milestone-validity model on the gate side.
- The repository's own `tier-report` now prints the Silver burndown - exactly the items 3B/3C must close to declare `tier: convergent`.
- Documentation: `docs/reference/silver-checks.md` (per-rule reference), `docs/how-to/climb-from-bronze-to-silver.md` (walkthrough), `conformance-and-tiers.md` extended with Silver subsection + visible-burndown, `askit-evaluate.md` notes multi-tier findings, AGENTS.md updated.
```

- [ ] **Step 3: Run the full CI commands**

Run: `npm ci && npm test && node scripts/check.mjs && node scripts/tier-report.mjs --json`
Expected:
- `npm ci` ok.
- `npm test` green (Phase 1 + Phase 2 + the new Phase 3A tests).
- `node scripts/check.mjs` exits 0 (the gate filter holds).
- `tier-report --json` reports `{"tier":"universal","satisfies":["universal"],"blocked":{"convergent":["S1: ...","S3: ..."]}}`.

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: changelog for Phase 3A (Standard v0.8 + Silver conformance core)"
```

---

## Self-Review

**1. Spec coverage (against PHASE-3A-DESIGN.md):**
- Standard v0.8 sec 3.2/3.3/3.9 + sec 10.1 + Appendix A + version banner -> Task 1. COVERED.
- Standard v0.8 sec 12 (marketplace - Codex format) -> Task 2. COVERED.
- library.json bump + prefix polish -> Task 3. COVERED.
- DESIGN.md D19 annotation -> Task 4. COVERED.
- Five new Convergent checks (S1-S5) with TDD per check -> Tasks 8, 9, 10, 11, 12. COVERED.
- Fixtures (golden + 5 anti) -> Task 5. COVERED.
- Shared tier helpers (`scripts/lib/tier.mjs`) -> Task 6. COVERED.
- Gate-runner declared-tier ceiling filter + tests -> Task 7. COVERED.
- Registry registration -> Task 13. COVERED.
- seed-blocked-convergent test (locks the burndown contract) -> Task 14. COVERED.
- Documentation (first-class): conformance-and-tiers extended (Task 15), silver-checks.md NEW (Task 16), climb-from-bronze-to-silver.md NEW (Task 17), askit-evaluate updated (Task 18), AGENTS.md updated (Task 19). COVERED.
- CHANGELOG + final verification -> Task 20. COVERED.

**2. Placeholder scan:** Task 7's first failing-test draft contained two "monkey-patching is awkward" notes which were replaced inline with the cleaner `gateExitFromFindings` unit-test approach. No TBD/TODO in implementation steps. Each authored doc has full body content.

**3. Type consistency:** `meta = {id, tier, reqId}` and `check(ctx) -> Finding[]` are uniform across S1-S5. `tier.mjs` exports `TIER_ORDER`, `tierForReq`, `ceilingIndex` consistently. `gateExitFromFindings(findings, declaredTier) -> {errorCount, exitCode}` is consistent in its tests + use site. The `Finding` shape `{check, severity, message, file, reqId}` is unchanged.

## Open carry-forwards into Phase 3B

- S6 per-target format presence (requires emission to validate).
- `gen-manifest` extended to emit `.codex-plugin/plugin.json` from `library.json` (parallel to the Claude manifest).
- Codex marketplace catalog generation (`.agents/plugins/marketplace.json`).
- `--agent-target` on `build-skill`.
- Local Codex round-trip via `codex plugin marketplace add --local ...` + `codex plugin add ...`.
- Full S4 orphan detection (workflow steps invoking skills not covered by the contract) once workflows exist.
- `check.mjs` printed summary line may want a separate "filtered errors / total errors" wording to clarify the new gate semantics (currently the printed `N error(s)` may differ from the gate's filtered count - cosmetic, not behavioral).
