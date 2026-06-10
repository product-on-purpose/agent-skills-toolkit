---
title: Competitive comparison research
---

# Competitive comparison research

The verified, dated, primary-source comparison of `agent-skills-toolkit` against the main skill/plugin builder tools, plus the best-in-class gap analysis. This is internal research (the `docs/internal/` tree is excluded from the published site and from the `G8` folder-README gate); the inventory below is for human navigation, not gate conformance.

One dataset, three views: the dated dossiers in `tool-profiles/` are the source of truth; `matrix.md`, `gap-analysis.md`, and (when shipped) the public comparison page are projections of them.

## Inventory

- `DESIGN.md` - the spec: scope, the four locked decisions, the schema, file layout, and the phased build sequence (re-based on v1.5.0).
- `METHODOLOGY.md` - the pre-registered verification protocol: the rules of evidence, the confidence rubric, the adjudication log, and the refresh loop, with mermaid diagrams.
- `IMPL-PLAN.md` - the bite-sized implementation plan that produced these artifacts.
- `matrix.md` - the full sourced comparison table (at-a-glance plus 16 dimensions across 10 tools), distilled from the profiles.
- `gap-analysis.md` - the adopt / build / deliberately-skip worklist for staying best in class.
- `REFRESH.md` - the runbook and cadence for keeping the comparison current.
- `tool-profiles/` - one dated, sourced dossier per competitor (the source of truth), plus `_TEMPLATE.md` (the 16-dimension schema).

## Provenance

Raw inputs (the seven cross-LLM reports in `_local/standards-comparison/`) are gitignored and uneven in reliability; they are leads only, cited as provenance and never published. Every published claim traces through `METHODOLOGY.md` to a primary source.
