# 0023 - v1 scope resolutions (init-plugin, docs-site, eval engine)

## TL;DR
- **Decision:** v1 builds the full eval engine and the full Astro Starlight docs-site, and verifies `askit-init-plugin` seed regeneration by structural/anatomy match (not byte-exact).
- **Why:** the maintainer chose maximal v1 scope (consistent with ADR 0020 O-1, "truly everything in v1"); the eval engine is the defensible competitive wedge and worth building now.
- **Status:** Accepted (2026-06-01).

- **Status:** Accepted
- **Date:** 2026-06-01
- **Deciders:** maintainer (jprisant), with Claude (Opus 4.8) at the Phase-4 design-call pause

## Context and problem statement
Phase 4 reserved three design calls for the maintainer before the dependent components were built (recorded in the 2026-05-31 session log and STATUS). With the Phase 4 lighter queue and its adversarial gate complete (15 skills + 6 subagents on `v1-build`), the build reached that pause. The three open questions: how strict the `askit-init-plugin` seed-regeneration check should be; whether the Astro Starlight docs-site is a thin or full v1 deliverable; and whether the behavioral eval engine ships in v1 or v1.x. The third question reopens ADR 0021, which had deferred the full eval engine.

## Decision drivers
- ADR 0020 O-1: full catalog in v1 ("truly everything").
- The competitive wedge (verified, _local/audit/): a tiered standard that grades whole libraries via a deterministic gate is the unoccupied position; library-scale eval/regression deepens that wedge.
- R6 (scope / burnout) is the dominant risk; the monotonic-tier model keeps the toolkit shippable at each phase exit.
- Design Principle 3: deterministic where objective, LLM where judgment. The CI gate MUST stay deterministic.

## Considered options
For each call, the options offered were: (init) structural/anatomy match, byte-exact, or defer; (docs) thin markdown-first scaffold, full site, or defer the site; (eval) defer to v1.x with a documented seam, a minimal behavioral layer, or the full engine.

## Decision outcome
- **init-plugin:** structural/anatomy match. The asserted test checks that init reproduces the seed's required files and frontmatter shape against an anatomy checklist, not byte-for-byte. Robust to formatting and key ordering; tests intent, not whitespace.
- **docs-site:** full Astro Starlight site in v1 (theming, mermaid, search, curated Diataxis IA), copied and adapted from the `../pm-skills` stack per ADR 0021.
- **eval engine:** full eval engine in v1 (behavioral eval + library-regression + LLM-judge, the Gold G3 machinery). This supersedes ADR 0021's deferral of the full engine and un-defers `askit-quality-grader` (backlog N1), which is now built as the behavioral judge alongside the harness.

## Consequences
- Positive: v1 ships the wedge-defining eval layer and a polished public docs surface; `askit-quality-grader` gets its genuine (behavioral) role instead of the deterministic duplicate the Phase-4 gate rejected.
- Negative / to manage: this pulls Gold-tier (Phase 5) work forward and is the single largest scope addition, so R6 is now live. Mitigation: sequence the work as three distinct sub-phases (eval engine, docs-site, init-plugin), each designed then built slice-by-slice with the gate cadence and an adversarial gate at each sub-phase boundary.
- Architectural constraint (eval engine): the behavioral / LLM-judge layer MUST sit beside the gate as opt-in evidence, never inside the deterministic CI gate (Design Principle 3). The library-regression check is deterministic where it can be (chain-graph reachability) and behavioral only where judgment is required.
