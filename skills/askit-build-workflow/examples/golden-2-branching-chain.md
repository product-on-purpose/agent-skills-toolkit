# Golden example: branching chain with a governed inter-component invocation

**Demonstrates:** a workflow with a real decision point (branch after step 1), a flat `steps` sequence that lists every skill that can run, and one step whose skill dispatches a subcomponent via a declared chain invocation.
**Provenance:** authored by `askit-build-workflow` create mode on 2026-07-26 during the SP2b metered authoring pass; raw run artifact under the gitignored `_local/audit/eval-runs/2026-07-26/`.

## Input

The user asked: "I want a workflow that adopts an existing skills repo, fixes whatever is blocking Bronze, and confirms the final tier."

Create-mode interview answers:

| Question | Answer |
|---|---|
| Arc name | `adopt-and-raise` |
| Ordered skills | assess the repo, fix blocking skill gaps, grade the result |
| Decision point | after assess: if Bronze is already clean, skip the fix step |
| What is handed between steps | gap report with error counts by tier; list of fixed skill paths; final evaluate report |
| Exit criteria | `askit-evaluate` reports Bronze (or target tier) with 0 errors |
| Target agents | claude only (step 2 dispatches a subagent, which Codex plugins cannot ship per sec 3.3) |
| Inter-component invocation | step 2 (`askit-build-skill`) dispatches `askit-skill-author`; this edge is already declared and permitted |

## Output

`_workflows/adopt-and-raise.md`

```markdown
---
name: adopt-and-raise
description: Assesses an existing skills repo, fixes blocking skill gaps, and confirms the final tier. Use when adopting a foreign plugin and wanting to raise it from its current state to a clean tier pass.
metadata:
  version: 0.1.0
  tier: convergent
  status: active
  agent-targets:
    - claude
steps:
  - skill: askit-migrate
  - skill: askit-build-skill
  - skill: askit-evaluate
---

# adopt-and-raise

## Steps

**Step 1: `askit-migrate` (assess mode)**

Input: the foreign plugin root path. If the repo has no `library.json`, run `askit-migrate` adopt mode first to scaffold the minimal manifest, then restart at step 1.

Output: a gap report listing which checks fail and why, keyed to Bronze and then Silver. The report includes a count of Bronze errors.

Artifact handed on: `{ bronze_errors: N, silver_errors: M }` summary counts, plus the list of skill directories that have Universal-check failures.

Exit criterion: the gap report is produced (exit 0 from `askit-migrate` assess). If the report cannot be produced because `library.json` is absent or unparseable, run `askit-migrate` adopt mode and re-run step 1.

Failure: if the repo structure is too non-standard for `askit-migrate` to map (for example, no `skills/` directory at all), halt and surface the raw directory listing to the maintainer before attempting any further assessment.

**DECISION after step 1:** if `bronze_errors == 0`, skip step 2 and jump to step 3. If `bronze_errors > 0`, run step 2 for each skill with Universal-check failures, then proceed to step 3.

**Step 2: `askit-build-skill` (improve mode, one skill at a time)**

Input: a skill directory with Universal-check findings from step 1.

Output: an updated `SKILL.md` that passes the Universal checks for that skill.

Artifact handed on: the list of improved skill paths (one path per invocation; iterate over all skills with failures).

Inter-component invocation: `askit-build-skill` dispatches `askit-skill-author` for the drafting work. This is a real inter-component invocation. `askit-build-skill` declares `chain: [askit-skill-author, askit-reviewer]` in its own frontmatter, and `agents/_chain-permitted.yaml` permits the edge under `askit-build-skill: [askit-skill-author, askit-reviewer]`. S4 enforces this: if the frontmatter declares the edge but the contract entry is missing or incomplete, S4 emits an orphan error. This invocation is governed; no additional contract entry is required in the adopting plugin's contract for a call that `askit-build-skill` governs internally.

Exit criterion: `node scripts/evaluate.mjs skills/<name> --json` reports 0 Universal errors for the improved skill. Repeat for each skill in the failure list from step 1 before moving to step 3.

Failure: if a skill cannot be made clean in two improve passes, record the blocking check ID and its message, skip that skill, and note the skip in the step 3 report. A blocked skill shows up as a remaining error in step 3.

**Step 3: `askit-evaluate` (conformance mode)**

Input: the plugin root (with improvements from step 2 applied, if step 2 ran).

Output: a per-rule report, the tier reached, and the count of remaining findings.

Artifact handed on: `{ exit_code, tier, errors, warnings }` summary.

Exit criterion: the report shows 0 errors at the target tier (Bronze if that was the goal; Silver if the maintainer aimed higher). Warnings at the target tier are acceptable, but record them for the next climb.

Failure: if the report shows errors, read the check ID and route back to the owning step. A U-check error means step 2 missed a skill (re-run step 2 for that skill). A new S- or G-check error means a Silver gap that was not in scope for this arc (record it and scope a follow-up arc).

## Why this order matters

Assess must precede fix: you cannot know which skills to improve until you have surveyed the full gap. Fix must precede the final grade: running `askit-evaluate` before the improvements are applied gives a stale result and wastes the maintainer's time. The branch after step 1 makes the arc efficient: when the repo is already clean at Bronze, the runner skips step 2 and goes straight to the confirmation.

## Why the frontmatter lists all three steps

S5 validates only that each named skill exists on disk. Listing all three lets the gate confirm every skill is present regardless of which branch the runner takes. The branch logic lives in the body, not in the frontmatter; S5 does not read the body.

## Exit criteria

`askit-evaluate` (step 3) reports 0 errors at the target tier. All skills that had Universal failures in step 1 are either clean or explicitly recorded as blocked with a reason.
```

Companion contract fragment (the existing entry in `agents/_chain-permitted.yaml` that governs the step 2 invocation):

```yaml
askit-build-skill:
  - askit-skill-author
  - askit-reviewer
```

This entry already exists in this toolkit's `agents/_chain-permitted.yaml`. The workflow does not create a new contract entry; it documents an invocation that the invoking component's own contract already governs.

## Why this is golden

- **Sec 3.4 (workflow, branching):** the flat `steps` sequence lists all three skills that can run. S5 validates each exists. The body carries the branch condition explicitly: "if `bronze_errors == 0`, skip step 2." The craft doc notes that `steps` is a flat YAML sequence and cannot express a branch; the body is the right place for branch logic, not the frontmatter.
- **Inter-component invocation documented correctly (sec 3.4, 3.6):** step 2's body calls out exactly what S4 does and why: `askit-build-skill` has `chain: [askit-skill-author, askit-reviewer]` in its frontmatter; the contract has the matching entry; S4 enforces the edge. The workflow author does not need to add a new contract entry, but the body makes the invocation visible so a reader knows the arc is not purely runner-driven.
- **`agent-targets: [claude]` narrowed honestly (sec 3.4):** step 2 uses `askit-build-skill`, which dispatches `askit-skill-author` as a subagent. Codex plugins cannot ship subagents (sec 3.3). Narrowing `agent-targets` to `[claude]` is accurate; copying `[claude, codex]` from the template would misrepresent the arc's capabilities.
- **Body exit criteria are evaluable (craft doc):** "0 Universal errors for the improved skill" and "`askit-evaluate` reports 0 errors at the target tier" are conditions a reader can check. "The step is done" is not.
- **S5 (workflow-skills) would pass:** every skill in `steps` exists on disk. Verified by hand below.

## Verification

Skills listed in `steps` verified on disk:

```
$ ls skills/askit-migrate/SKILL.md
skills/askit-migrate/SKILL.md

$ ls skills/askit-build-skill/SKILL.md
skills/askit-build-skill/SKILL.md

$ ls skills/askit-evaluate/SKILL.md
skills/askit-evaluate/SKILL.md
```

`askit-build-skill` frontmatter confirms the declared chain:

`askit-build-skill/SKILL.md` contains `chain: [askit-skill-author, askit-reviewer]`.

`agents/_chain-permitted.yaml` entry confirmed:

```
askit-build-skill:
  - askit-skill-author
  - askit-reviewer
```

Frontmatter parsed with `node -e "import('./scripts/lib/frontmatter.mjs').then(m=>{const fs=require('fs');const f=fs.readFileSync('<scratch>/wf-golden2.md','utf8');console.log(JSON.stringify(m.parseFrontmatter(f).frontmatter,null,2))})"`:

```json
{
  "name": "adopt-and-raise",
  "description": "Assesses an existing skills repo, fixes blocking skill gaps, and confirms the final tier. Use when adopting a foreign plugin and wanting to raise it from its current state to a clean tier pass.",
  "metadata": {
    "version": "0.1.0",
    "tier": "convergent",
    "status": "active",
    "agent-targets": [
      "claude"
    ]
  },
  "steps": [
    { "skill": "askit-migrate" },
    { "skill": "askit-build-skill" },
    { "skill": "askit-evaluate" }
  ]
}
```

`steps` is a YAML sequence; each element is a mapping with `skill:`. S5 reads exactly this shape.

No relative markdown links in this file (all file paths written as inline code).
