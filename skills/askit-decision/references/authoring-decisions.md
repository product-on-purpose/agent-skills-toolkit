# Authoring decisions (reference)

ADRs and RFCs in the committed governance tree (Standard sec 10.4).

## ADR (MADR, numbered, immutable)

`docs/internal/decisions/NNNN-title.md`. Structure:

- Title (`# NNNN - title`)
- `## TL;DR` - three labelled lines: Decision / Why / Status (mandatory, ADR 0021)
- Status, Date, Deciders, (Builds on)
- Context and problem statement
- Decision drivers
- Considered options
- Decision outcome (the choice + rationale)
- Consequences (positive / negative)

ADRs are immutable once accepted: to change a decision, write a new ADR that supersedes the old one (link both ways). Numbering is sequential; reserve a range if a batch of existing decisions will graduate later.

## RFC (the proposal path)

`docs/internal/rfcs/NNNN-title.md` for a cross-cutting proposal - a Standard amendment, a new convention. Include the problem, the proposal, the alternatives considered, and the migration/impact. On acceptance, graduate the outcome into a numbered ADR.

## The TL;DR convention

Every ADR opens with a 3-line `## TL;DR` (Decision / Why / Status) so a reader gets the gist in seconds and the detailed body is there when needed. The `summary` mode emits and lints this block; a docs-presence check can later assert it exists.
