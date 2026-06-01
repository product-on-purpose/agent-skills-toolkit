# New-component backlog

> Proposals to ADD a component (skill, command, subagent, hook, and so on) to the toolkit (Standard sec 7.1). Each item passes the why-gate (warranted? duplicate? a mode not a component? tier and agent-targets?) before it is accepted. When `askit-backlog` (Phase 4) manages governance, it maintains this file; items here are recorded by hand.

## N1 - askit-quality-grader (behavioral / LLM-judge grading delegate)

- **Proposed name:** `askit-quality-grader`
- **Component type:** subagent (Claude-only, Standard sec 3.3).
- **Target tier:** convergent (the delegate); the behavioral eval machinery it judges is a Gold concern (G3).
- **Agent-targets:** claude.
- **Rationale:** a grading delegate that judges whether a skill actually works when triggered (runs it against eval prompts and judges the outputs), distinct from deterministic conformance. This is the behavioral / LLM-judge layer the design docs (DESIGN.md, PHASE-2-DESIGN.md) intended `quality-grader` to be.
- **Why deferred:** a first cut shipped in Phase 4 as a `tier-report` wrapper, but the Phase-4 adversarial gate (2026-05-31) found that role duplicates the evaluate path - `askit-evaluator` already returns tier + burndown, and `tier-report.mjs` is a subroutine of `evaluate.mjs`. The genuine, non-duplicative role is behavioral judgment, which depends on the eval-harness whose shape is a reserved maintainer design call (the eval-harness / `evaluate` behavioral and review modes, v1 vs v1.x). Build it with that decision so it is not a wrapper over existing deterministic output.
- **Status:** deferred to the eval-harness design call (recorded 2026-05-31).
