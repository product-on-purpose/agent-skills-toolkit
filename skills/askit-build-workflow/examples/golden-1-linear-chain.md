# Golden example: linear chain, runner-driven arc

**Demonstrates:** a straight arc across four independently useful skills, where the runner drives every handoff and nothing is owed to the chain contract.
**Provenance:** authored by `askit-build-workflow` create mode on 2026-07-26 during the SP2b metered authoring pass; raw run artifact under the gitignored `_local/audit/eval-runs/2026-07-26/`.

## Input

The user asked: "I want a workflow that takes a maintainer from zero to a Bronze-conformant plugin in one session."

Create-mode interview answers:

| Question | Answer |
|---|---|
| Arc name | `new-plugin-to-bronze` |
| Ordered skills | init, then author first skill, then document, then grade |
| What is handed between steps | plugin root path; first skill name; documented README; evaluate report |
| Exit criteria | `askit-evaluate` reports Bronze tier with 0 errors |
| Target agents | claude and codex (all four skills are portable markdown) |

## Output

`_workflows/new-plugin-to-bronze.md`

```markdown
---
name: new-plugin-to-bronze
description: Scaffolds a new plugin from scratch, authors the first skill, documents it, and confirms the Bronze pass. Use when starting a brand-new plugin and wanting the full scaffold-to-grade arc in one session.
metadata:
  version: 0.1.0
  tier: convergent
  status: active
  agent-targets:
    - claude
    - codex
steps:
  - skill: askit-init-plugin
  - skill: askit-build-skill
  - skill: askit-build-docs
  - skill: askit-evaluate
---

# new-plugin-to-bronze

## Steps

**Step 1: `askit-init-plugin` (interview mode)**

Input: the maintainer's answers to the onboarding questions (plugin name, scope, target agents, target tier, first skill name and description).

Output: a Bronze seed scaffold at `<plugin-root>/`: `library.json` with five required fields, a root `AGENTS.md`, and `README.md` / `CHANGELOG.md` starters.

Artifact handed on: the plugin root path (e.g., `my-plugin/`) and the first skill name the maintainer named during the interview (e.g., `my-plugin-fetch`).

Exit criterion: `library.json` exists and contains `name`, `version`, `description`, `standard`, and `tier`. If any field is missing, re-run step 1 with the specific gap identified.

Failure: if the maintainer's answers are too sparse to scaffold, surface the onboarding questionnaire (`askit-init-plugin` questionnaire mode) and return to step 1 with the completed form.

**Step 2: `askit-build-skill` (create mode)**

Input: the plugin root from step 1 and the first skill name.

Output: `skills/<name>/SKILL.md` with conformant frontmatter and a procedure body.

Artifact handed on: the skill directory path (e.g., `skills/my-plugin-fetch/`).

Exit criterion: `node scripts/evaluate.mjs skills/<name> --json` reports 0 errors. Iterate in `askit-build-skill` improve mode until the skill is clean before proceeding.

Failure: if the skill fails Universal checks after two improve passes, identify the blocking check by ID and address it directly (for example, a U5 description score below threshold requires rewriting the description to include the action verb and trigger keywords).

Why after step 1: you cannot author a skill in a valid plugin until `library.json` exists; U1 checks the manifest at every tier, and a missing manifest means the conformance core cannot grade the plugin at all.

**Step 3: `askit-build-docs` (create mode, readme mode)**

Input: the plugin root from step 1 (which now contains the skill from step 2).

Output: an updated `README.md` whose inventory section describes the first skill.

Artifact handed on: the `README.md` path confirming the inventory is current.

Exit criterion: the README exists, its `## Inventory` section lists `skills/<name>/` with a one-line description, and it has no relative links pointing to paths that do not exist. `askit-build-docs` folder-readme mode confirms the G8 inventory invariant.

Failure: if G8 reports the README is missing inventory items after step 3, re-run `askit-build-docs` folder-readme mode with the current folder listing before step 4.

Why after step 2: the README describes the skills in the plugin; authoring documentation before the skill exists inverts the dependency and guarantees drift. The README inventory cannot list a skill until the skill is on disk.

**Step 4: `askit-evaluate` (conformance mode)**

Input: the plugin root.

Output: a per-rule conformance report: tier, error count, warning count, and remediation per finding.

Exit criterion: the report shows tier Bronze with 0 errors. Warnings are acceptable at Bronze but record them for the Silver climb.

Failure: if the report shows errors, read the check ID and its message. Route back to the step that owns the failing surface: a U-check failure routes back to step 2 (the skill); a G-check failure routes back to step 3 (the docs); a U1 failure routes back to step 1 (the manifest). Re-run the owning step and re-run step 4.

## Why this order matters

Steps 1 through 4 are non-swappable: each step depends on the on-disk artifact the prior step produced. Steps 2 and 3 could be swapped only if the README did not list the skill; in practice the skill is the plugin's primary subject, so step 2 comes first.

## Exit criteria

`askit-evaluate` (step 4) reports tier Bronze with 0 errors. The maintainer has the plugin root, the first skill, the README, and the Bronze gate green in one session.

## No chain contract is owed

This arc is runner-driven: the runner (human or orchestrating agent) reads each step's output, then manually invokes the next skill. No skill in this arc dispatches another. The chain contract (Standard sec 3.6) is a CONDITIONAL MUST, required if and only if a component invokes another component. Since no invocations happen here, `agents/_chain-permitted.yaml` is not owed and should not be created. Shipping an empty contract to "be safe" manufactures phantom governance for invocations that do not exist.
```

## Why this is golden

- **Sec 3.4 (workflow):** the arc formalizes a recurring sequence (new-plugin to Bronze is the most common starting task) across skills that are each independently useful: `askit-init-plugin` is invoked on its own when onboarding, `askit-build-skill` is invoked on its own when adding a skill, and so on. The workflow buys repeatability and reviewability; it does not collapse the skills.
- **Body completeness (craft doc "The body is the part nothing checks"):** each step names the artifact handed on (not "passes the result along"), states an evaluable exit criterion (a condition a reader can check, not "the step is done"), names the failure branch and what to do, and explains why the order cannot be swapped. The gate never reads the body; this discipline is the author's own guarantee.
- **No chain contract obligation (sec 3.6):** the commentary in the body is explicit that the arc is runner-driven and nothing is owed. This is the distinction authors get wrong most often in the "safe" direction: they create an entry in `_chain-permitted.yaml` "to be safe" and manufacture phantom governance and a Gold `G3` eval obligation for an invocation that never happens.
- **`agent-targets` narrowed honestly (sec 3.4):** all four skills are portable markdown and work on both claude and codex, so `agent-targets: [claude, codex]` is accurate rather than copied blindly from the template.
- **S5 (workflow-skills) would pass:** every skill named in `steps` exists on disk. Verified by hand below.

## Verification

Skills listed in `steps` verified on disk:

```
$ ls skills/askit-init-plugin/SKILL.md
skills/askit-init-plugin/SKILL.md

$ ls skills/askit-build-skill/SKILL.md
skills/askit-build-skill/SKILL.md

$ ls skills/askit-build-docs/SKILL.md
skills/askit-build-docs/SKILL.md

$ ls skills/askit-evaluate/SKILL.md
skills/askit-evaluate/SKILL.md
```

Frontmatter parsed with `node -e "import('./scripts/lib/frontmatter.mjs').then(m=>{const fs=require('fs');const f=fs.readFileSync('<scratch>/wf-golden1.md','utf8');console.log(JSON.stringify(m.parseFrontmatter(f).frontmatter,null,2))})"`:

```json
{
  "name": "new-plugin-to-bronze",
  "description": "Scaffolds a new plugin from scratch, authors the first skill, documents it, and confirms the Bronze pass. Use when starting a brand-new plugin and wanting the full scaffold-to-grade arc in one session.",
  "metadata": {
    "version": "0.1.0",
    "tier": "convergent",
    "status": "active",
    "agent-targets": [
      "claude",
      "codex"
    ]
  },
  "steps": [
    { "skill": "askit-init-plugin" },
    { "skill": "askit-build-skill" },
    { "skill": "askit-build-docs" },
    { "skill": "askit-evaluate" }
  ]
}
```

`steps` is a YAML sequence; each element is a mapping with `skill:`. S5 reads exactly this shape.

No relative markdown links in this file (all file paths written as inline code).
