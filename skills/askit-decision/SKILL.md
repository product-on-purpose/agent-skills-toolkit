---
name: askit-decision
description: Creates and maintains a plugin's decision records (MADR ADRs) and RFCs in docs/internal, and the summary TL;DR companion for long decision docs. Use when recording an architecture decision, drafting an RFC to evolve the Standard, or generating the TL;DR for a decision doc.
metadata:
  version: 0.1.0
  tier: universal
  audience: advanced
---

# askit-decision

## Purpose
Author and maintain a plugin's governed decisions: numbered MADR ADRs under `docs/internal/decisions/` and RFCs under `docs/internal/rfcs/`. Three modes: `adr` records an architecture decision; `rfc` drafts a cross-cutting proposal (for example, to evolve the Standard); `summary` emits and lints the mandatory 3-line TL;DR (Decision / Why / Status) on a long ADR or RFC (the summary-plus-detailed convention, ADR 0021). Authoring depth is in [references/authoring-decisions.md](references/authoring-decisions.md).

## When to use
When the user makes or records an architecture decision, proposes a change to the Standard or the plugin via an RFC, or needs the TL;DR companion for a decision doc.

## adr mode
1. Pick the next ADR number (`docs/internal/decisions/NNNN-title.md`).
2. Author MADR: Status, Date, Deciders, Context, Decision drivers, Considered options, Decision outcome, Consequences. Copy `templates/adr.md`.
3. Add the mandatory `## TL;DR` (Decision / Why / Status) immediately under the title (ADR 0021 convention).
4. ADRs are immutable once accepted; supersede rather than rewrite.

## rfc mode
1. Author an RFC under `docs/internal/rfcs/` for a cross-cutting proposal (a Standard amendment, a new convention).
2. Include the problem, the proposal, the alternatives, and the migration/impact. On acceptance, graduate the outcome to an ADR.

## summary mode
1. Read a long ADR or RFC and emit (or lint) the 3-line `## TL;DR` (Decision / Why / Status), so the summary and the detailed body never diverge.

## Scope
Decisions live in the committed governance tree (`docs/internal/`, sec 10.4). ADRs are MADR-format and numbered; RFCs are the proposal path that graduates to ADRs. Every ADR carries a TL;DR (the summary-plus-detailed convention). The toolkit dogfoods this (ADRs 0020 through 0022).
