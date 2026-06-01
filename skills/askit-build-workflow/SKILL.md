---
name: askit-build-workflow
description: Creates and improves workflows (an ordered multi-skill arc) for a plugin to the Advanced Skill Library Standard. Use when a recurring sequence of skills is worth formalizing as a workflow, when you need to author a _workflows file with steps and exit criteria, or to resolve S5 workflow findings.
metadata:
  version: 0.1.0
  tier: universal
  audience: advanced
---

# askit-build-workflow

## Purpose
Author a plugin's workflows: ordered arcs that chain multiple skills toward an outcome (Standard sec 3.4). Two modes: `create` authors `_workflows/<name>.md` (steps, inputs/outputs handed between steps, exit criteria); `improve` resolves findings. Authoring depth is in [references/authoring-workflows.md](references/authoring-workflows.md). Follows the shared builder contract ([../../docs/reference/builder-pattern.md](../../docs/reference/builder-pattern.md)).

## When to use
When the user asks to author, scaffold, or improve a workflow, or to formalize a recurring multi-skill sequence into an ordered arc.

## create mode
1. Identify the recurring arc: the ordered skills, what is handed between steps, and the exit criteria. Skip the interview if in context.
2. Author `_workflows/<name>.md` (copy `templates/workflow.md`): frontmatter `steps` (each naming the skill it invokes) plus a body describing the handoffs and exit criteria.
3. Every referenced skill MUST exist (S5). Every chaining step MUST be permitted by the chain contract (sec 3.4); use `askit-build-chain-contract` to add the permission if needed.
4. A workflow SHOULD declare which agent targets it supports.
5. Evaluate (`node scripts/evaluate.mjs . --json`) until S5 is clean.

## improve mode
1. Run evaluate and read findings.
2. For an S5 finding (a step references a skill not on disk), fix the skill name or create the skill. Tighten the handoffs and exit criteria.
3. Re-run to confirm.

## Scope
A workflow is `_workflows/<name>.md` with ordered steps and exit criteria (sec 3.4). Referenced skills must exist (S5) and chaining steps must be chain-permitted (sec 3.6). The deterministic workflow-step chain-permission check (step orphans) is a planned enhancement; today S5 enforces step skill-existence and the chain contract governs component-to-component invocation.
