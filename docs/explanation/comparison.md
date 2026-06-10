---
title: "How agent-skills-toolkit compares"
description: "A verified, primary-source comparison of agent-skills-toolkit against the main skill and plugin builder tools, with a clearly-labelled read on where it fits."
audience: both
level: intermediate
---

# How agent-skills-toolkit compares

This page compares `agent-skills-toolkit` (askit) against the main skill and plugin builder tools. It is split deliberately into two parts: a **neutral, sourced matrix** that states what each tool does, and a separately-labelled **"where askit fits"** read that draws conclusions from it. The objective table is meant to earn your trust; the read is honestly flagged as our interpretation.

Every claim about another tool was verified against that tool's own primary sources (its repository, releases, and official docs) on **2026-06-10**, not taken from secondary write-ups. The full sourced matrix carries a citation and a confidence label on every cell; the protocol that produced it is written down in [the verification methodology](../internal/research/METHODOLOGY.md), and the complete table lives in [the full sourced matrix](../internal/research/matrix.md). Star counts and versions are dated snapshots that decay.

## The matrix (the differentiators)

These five dimensions are where the tools differ most. Cells are terse; each traces to a dated profile in [`docs/internal/research/tool-profiles/`](../internal/research/tool-profiles/) carrying its own citation and confidence. "(M)" marks a cell the source profile rated medium confidence.

| Tool | Unit of evaluation | Tiered and climbable | Verdict basis | Cross-agent emission | Self-proving |
|---|---|---|---|---|---|
| **agent-skills-toolkit** | whole-library | tiered with burndown | deterministic | multi-format native | yes (self-validates in CI) |
| ccpi | per-plugin | score + badge tiers | hybrid (deterministic gate + advisory LLM) | single-format (Claude) | yes (CI self-grades) |
| plugin-eval | per-skill | score + badge tiers | hybrid (3-layer + LLM judge) | multi-format native | partial |
| skill-check | per-skill | score, no tiers | deterministic | none | no |
| skills-check | per-skill | pass/fail + thresholds | hybrid (deterministic core + optional LLM) | none | not confirmed |
| skills-validator | per-skill | pass/fail + severity tiers | deterministic | none | not confirmed |
| agent-skill-linter | per-skill | pass/fail | hybrid (mechanical + semantic LLM) | none | yes |
| skills-ref | per-skill | pass/fail | deterministic | none | not as a CI gate (M) |
| skill-creator | per-skill | none (authoring tool) | n/a (authoring tool) | single-format | no |
| vercel skills CLI | per-skill | n/a (package manager) | n/a (no verdict) | multi-format native | no |

A few dimensions outside this table are worth naming because they cut both ways:

- **Output formats.** `skill-check` and `skills-check` emit **SARIF** and GitHub annotations; askit currently emits human, HTML, and Markdown but **no SARIF** (a gap askit has filed to close).
- **Security.** `skills-validator` and `skills-check` scan for pipe-to-shell installers (`curl | bash`) and dangerous commands; askit currently scans for committed secrets only.
- **Versioning.** `skills-check` verifies a declared version bump against the actual content diff (deterministically); askit enforces semver but does not yet check the bump against the diff.

askit has recorded each of these as a concrete enhancement to adopt, rather than claiming a lead it does not have.

## Where askit fits (our read)

> This section is interpretation, not part of the neutral table above.

The honest finding is that **no single dimension is uniquely askit's** - several tools overlap on any one of them. What is unoccupied is the **combination**: askit is the only tool that is, at once, whole-library in scope, tiered with a burndown you can climb, decided by a deterministic model-free gate, emitted natively for more than one agent, self-proving in its own CI, and split by provenance (which findings are portable-objective versus house conventions).

The nearest neighbours make the shape of that gap concrete, from their own sources:

- **ccpi** is the closest analogue - a tiered score plus a package manager - but its 100-point score is **advisory** (its pre-screen workflow states failures "NEVER block merges"); the blocking gate is catalog integrity, not the score. askit's verdict is an exit code that blocks CI.
- **plugin-eval** is the only other multi-agent emitter, but it grades **per-skill** with an LLM-judge and Monte Carlo layer rather than rendering a deterministic, reproducible verdict over a whole library.
- **skills-ref** is the base-spec floor every other tool sits above, and is self-described as "for demonstration purposes only," not a production gate.
- The **Vercel skills CLI** leads the field on adoption by a wide margin, yet ships **no grading at all** (its proposed validate command was closed unmerged). Distribution and grading are different jobs.

**The one differentiator askit holds alone** is the provenance split (objective / vendor-cited / house): it is the only tool that labels each finding by whether it is a portable spec rule or a house convention, which is what lets askit grade a library it does not own on portable rules only.

### What we are not claiming

In the spirit of the neutral table: askit's description-quality scorer is currently being recalibrated (it clusters strong descriptions just under its own bar), so we make **no claim** that askit grades description quality better than the field. Several of these tools run description checks too. We would rather tell you what we are still tuning than overstate the comparison.

## How we verified this, and where the proof will live

The point of this comparison is that you can check it. Each competitor claim traces to a primary source with a date and a confidence label; disputes were adjudicated from the sources both sides would have to accept. One worked example: the Agent Skills specification is **not** governed by the Linux Foundation's Agentic AI Foundation as of 2026-06-10 (the AAIF project list names MCP, goose, AGENTS.md, and agentgateway but not Agent Skills; the spec's own LICENSE reads "Copyright 2025 Anthropic, PBC"), correcting a claim that several secondary reports - and our own earlier notes - had repeated. The full reasoning is in [the methodology](../internal/research/METHODOLOGY.md).

The strongest proof is not a table about other tools but askit grading real libraries. Those graded reports (askit's deterministic gate run against real third-party plugins) will be published in an **Evaluation Reports showcase** at `/evaluation-reports/` as that corpus run is completed, so you can see the grader working on code it did not write rather than take our word for it.

This comparison was verified on 2026-06-10. Because adoption numbers and versions move, it is refreshed on a cadence (see [the refresh runbook](../internal/research/REFRESH.md)); for the normative definition of the tiers askit grades against, see [the Standard](../../STANDARD.md) and [conformance and tiers](conformance-and-tiers.md).
