---
name: askit-evaluate
description: Evaluates a skill or plugin against the Advanced Skill Library Standard across three modes, producing deterministic conformance findings and a tier, an opt-in behavioral pass, and a qualitative review. Use when you want to audit conformance, judge whether a skill behaves and triggers correctly, get a qualitative review, or see what blocks the next tier.
chain:
  - askit-evaluator
  - askit-quality-grader
  - askit-reviewer
metadata:
  version: 0.1.0
  tier: universal
  audience: intermediate
---

# askit-evaluate

## Purpose
Assess a known, local component or plugin against `STANDARD.md`. Three modes. `conformance` (the default) runs the deterministic portable scripts and returns a per-rule report (pass / warn / error), the satisfied tier, and concrete remediation. `behavioral` runs a skill against its eval-set and judges whether it triggers and behaves as expected, delegating to `askit-quality-grader`. `review` forms a qualitative judgment (correctness, altitude, naming, whether a component is warranted), delegating to `askit-reviewer`. Only `conformance` is deterministic and gate-safe; `behavioral` and `review` are opt-in LLM-judged passes that produce evidence, never a CI gate result (Design Principle 3, ADR 0023).

## When to use
When the user asks to evaluate, audit, or check a skill or plugin, asks "what tier is this" or "what is blocking the next tier" (conformance), asks whether a skill actually triggers and behaves correctly (behavioral), or wants a qualitative review (review).

## conformance mode (default, deterministic)
1. Determine the target path (a plugin root with `library.json`, or a single skill directory with `SKILL.md`).
2. Run: `node scripts/evaluate.mjs <path> --json`.
3. Present the findings grouped by rule, the tier (for a plugin), and the remediation. Lead with errors, then warnings.
4. For a shareable, designed report, render the same object: `node scripts/evaluate.mjs <path> --format=html --out report.html` (a self-contained page for a non-engineer) or `--format=md` (the Markdown twin for PR review and agents). It renders the same deterministic object the terminal shows, adds no judgment, and does not change the verdict. See [references/report-format.md](references/report-format.md).
5. If there are warnings or errors, point the user at `askit-build-skill` in `improve` mode to fix them.

## behavioral mode (opt-in, LLM-judged)
1. Locate the target's eval-set under `evals/` (triggering `{query, should_trigger}` cases and `{given, expect}` behavior cases).
2. Delegate to `askit-quality-grader`: it runs the skill against the cases and judges fire / no-fire and output quality.
3. Report the verdict per case with evidence. This is evidence, not a gate result; it never fails CI.

## review mode (opt-in, qualitative)
1. Delegate to `askit-reviewer`: it reviews the component or change for correctness, altitude, naming, and whether it is warranted.
2. Report findings by severity with remediation. Like behavioral, this is advisory, not a gate result.

## Scope
The conformance core is deterministic and is what CI runs (Design Principle 3). Behavioral and review are opt-in LLM-judged layers beside the gate: the Standard defers the full eval engine to roadmap, and G3 requires only the deterministic baseline (ADR 0023). See [references/report-format.md](references/report-format.md) for the report shape. The delegations are permitted in `agents/_chain-permitted.yaml` (`askit-evaluate` may invoke `askit-evaluator` for conformance, `askit-quality-grader` for behavioral, and `askit-reviewer` for review).
