# Enhancement backlog

> Features, fixes, and refinements to existing components (Standard sec 7.1). Each item references the target component and describes the change. When `askit-backlog` (Phase 4) ships, it manages this file; until then, items are recorded by hand.

## E1 - Designed HTML + Markdown evaluation report (summary + detailed)

- **Target:** `askit-evaluate` (and every future evaluation skill/mode - behavioral, review, and library-grade evaluation).
- **Change:** alongside the existing per-rule terminal output and `--json`, add two thoughtfully designed renderings of an evaluation result, each with a SUMMARY and a DETAILED breakdown:
  - **Markdown report** - embeddable in PRs, issues, and docs. SUMMARY: declared vs satisfied tier, pass/warn/error counts, the `blocked` burndown to the next tier, and a one-line verdict. DETAILED: every finding (reqId, severity, file, message, remediation), grouped by tier and severity.
  - **HTML report** - a self-contained, styled page (inline CSS, no external assets) for human review and sharing. Same summary + detailed content, with visual tier/severity cues, collapsible per-rule sections, and a mermaid tier diagram where it helps.
- **Why:** directly serves the maintainer's "summary AND detailed versions" requirement (ADR 0021) and the visuals emphasis; makes evaluation results consumable by non-engineers (HTML) and by agents / PR review (Markdown), not only in the terminal or as JSON. A designed, shareable report is part of the best-in-class differentiator.
- **How to apply (sketch):** `scripts/evaluate.mjs` already produces a structured report object. Add `--format=md|html` renderers over that ONE model so MD / HTML / JSON never diverge (deterministic, portable Node, no new runtime, no binary assets - preserves the "CI only shells out to portable scripts" principle). Reuse the summary+detailed convention and the existing mermaid validation.
- **Tier / phase:** enhancement. Natural home is Phase 4 (when `evaluate`'s behavioral/review modes land), or earlier as a standalone output enhancement. Strong candidate to pull into the v1 docs/visuals push so the public Silver preview ships a polished report.
- **Status:** backlog (recorded 2026-05-31).
