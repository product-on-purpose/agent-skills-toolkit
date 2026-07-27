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
- `## Implementation sites` (see below)

ADRs are immutable once accepted: to change a decision, write a new ADR that supersedes the old one (link both ways). Numbering is sequential; reserve a range if a batch of existing decisions will graduate later.

## Implementation sites convention

Every ADR carries a `## Implementation sites` section that names the specific files and functions which carry the decision. The value is entirely in the specificity: a vague entry ("the report renderer") is useless; a useful entry names `scripts/lib/report-render.mjs` - `deriveModel()` and says what property of the decision it enforces.

**Why this section exists.** Three real defects in this project had the same shape: a decision was implemented in one code path and silently omitted from a second parallel path. ADR 0030 decided a plugin with no declared tier must not be reported as having earned one - implemented in `tier-report.mjs humanLine()` and never mirrored into `report-render.mjs deriveModel()`. Two months later that produced a false PASS on the shareable artifact. ADR 0034 validated a profile flag in plugin scope and silently dropped it in component scope. Two CodeQL escaping fixes were applied to one function and not the sibling function written by a different agent. The section exists so the next decision author, and every future release, can grep and verify each site.

**How to fill it.** Run `grep -rn "<key behavioral terms>" scripts/` before writing. Do not rely on recall - the site you remember first is rarely all of them. A decision that constrains behavior usually has more than one site.

**Format.** One bullet per site: `` `scripts/path/to/file.mjs` - `functionName()`: what property of the decision this enforces. ``

**Governance-only decisions.** ADRs whose decisions are structural, scope, or process with no code implementation say: "No code implementation sites; this is a governance or structural decision."

**Immutability.** Adding an Implementation sites section to an existing ADR is an additive annotation - it records a fact about where the decision lives, not a change to what was decided. It does not touch the Decision, Status, or Consequences. This is the same class of additive annotation as writing a linked follow-up task in Consequences, and it respects immutability.

## RFC (the proposal path)

`docs/internal/rfcs/NNNN-title.md` for a cross-cutting proposal - a Standard amendment, a new convention. Include the problem, the proposal, the alternatives considered, and the migration/impact. On acceptance, graduate the outcome into a numbered ADR.

## The TL;DR convention

Every ADR opens with a 3-line `## TL;DR` (Decision / Why / Status) so a reader gets the gist in seconds and the detailed body is there when needed. The `summary` mode emits and lints this block; a docs-presence check can later assert it exists.
