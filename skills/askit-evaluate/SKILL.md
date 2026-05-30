---
name: askit-evaluate
description: Evaluates a skill or plugin against the Advanced Skill Library Standard, producing per-rule findings, a tier result, and remediation steps. Use when you want to audit conformance, check a skill or plugin, or see what blocks the next tier.
chain:
  - evaluator
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
This skill is the conformance-core assessment. Behavioral evaluation (running a skill against expected outputs) and qualitative review are out of scope here and arrive in a later phase. See [references/report-format.md](references/report-format.md) for the report shape. Assessment is delegated to the `evaluator` subagent (permitted in `agents/_chain-permitted.yaml`).
