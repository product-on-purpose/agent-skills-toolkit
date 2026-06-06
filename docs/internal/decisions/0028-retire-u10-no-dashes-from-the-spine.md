# 0028 - Retire U10 (no-dashes) from the conformance spine (house style is not a portability requirement)

## TL;DR
- **Decision:** Retire the `U10` `no-dashes` check from the conformance spine. The no-em-dash / no-en-dash rule is a stylistic house preference with no portability or vendor basis (agentskills.io, Claude Code, and Codex impose no such rule), so it is no longer a graded requirement. Standard `0.10 -> 0.11`; spine `30 -> 29` (`U1-U9`, `U11-U12`, `S1-S8`, `G1-G10`). The preference stays available as an opt-in `PreToolUse` hook (`hooks/no-dashes.mjs`), so Gold `G1` stays non-vacuous.
- **Why:** A conformance standard should grade portability, correctness, and lifecycle rigor, not one author's typographic taste. A check earns its place only as a proxy for a real outcome, backed by objective correctness or cited external authority; U10 had neither, and grading third-party plugins on it is illegitimate (a real evaluation of Anthropic's own `product-management` plugin flagged it for em-dashes, which the platform uses freely).
- **Status:** Accepted (shipped in v1.2.0: PR #101 retired the check, PR #103 cut the release).

- **Status:** Accepted
- **Date:** 2026-06-06
- **Deciders:** maintainer (jprisant), with Claude (Opus 4.8)

## Builds on
- ADR 0024 (documentation depth and discoverability) - added `U12` and `G8-G10` and took the spine to 30 at Standard v0.10; `U10` predated it as a Bronze content-hygiene check.
- ADR 0027 (Standard versioning and compatibility policy, Proposed) - this is the first Standard change since 0027 was proposed. It is a RELAXATION (removing a requirement), the always-safe direction: no plugin that passed before can newly fail, so the warn-then-error burndown 0027 prescribes for TIGHTENINGS does not apply. It ships as a minor bump (0.10 -> 0.11).
- The linter-vs-judge analysis in `_local/notes/evaluator-linter-vs-judge-and-consistency.md` - the principle that house preferences belong in an opt-in profile or hook, not the universal gate.

## Context and problem statement
Two real third-party evaluations (a Pushpay plugin and Anthropic's own `product-management` plugin) surfaced that a large share of a vanilla Claude Code plugin's gate "failures" were either agentskills.io-Standard-specific scaffolding or the `U10` no-dash house rule. U10 was the toolkit maintainer's personal writing preference (recorded in a global CLAUDE.md rule and enforced by a personal PreToolUse hook), elevated into a Universal-tier ERROR that gates Bronze and therefore every tier, and applied to every plugin the toolkit grades. No external authority (agentskills.io, Anthropic/Claude Code, OpenAI/Codex) forbids em-dashes; the Anthropic `product-management` plugin uses them throughout and is otherwise well built. The rule had no portability or vendor basis, only taste.

## Decision drivers
- Legitimacy: a conformance check is valuable only as a proxy for an outcome the consumer cares about (does the skill trigger, does the connector resolve, does the agent fail, does the library rot), grounded in objective correctness or cited external best practice. U10 proxied neither; it enforced aesthetics.
- The Standard is positioned as a portable contract other libraries grade against; imposing one author's typography on every graded plugin undermines that positioning.
- House preferences have a legitimate home: an opt-in mechanism (a hook a user installs by choice), not the universal gate.

## Considered options
1. **Retire U10 from the spine; keep the dash rule as an opt-in hook.** (chosen) The gate stops grading dashes for any plugin; the toolkit still ships `hooks/no-dashes.mjs` for authors who want a dash-free house style, and the maintainer's personal global hook is untouched. Gold `G1` stays non-vacuous via the kept hook.
2. **Demote U10 from error to warning.** Keeps it in the spine as advisory noise; still imposes the preference, just without gating. Rejected: a standard should not even advise on taste it cannot justify.
3. **Keep U10 as a Universal error.** Rejected: imposes a personal aesthetic on every graded plugin with no portability basis, the antipattern this ADR corrects.
4. **Move U10 into an opt-in house-style profile.** The ideal long-term home, but the gate has no per-rule config or profile mechanism yet (a separate, larger change; see the linter-vs-judge notes and ADR 0027's standard-aware-gate work). Deferred: until profiles exist, the hook is the opt-in surface.

## Decision outcome
Option 1, shipped in v1.2.0. `scripts/checks/no-dashes.mjs` and its test were removed; the shared `SKIP_DIRS` set relocated to `scripts/lib/fs-utils.mjs` (`U12` mermaid-valid and `G8` folder-readme import it); `registry-sync` asserts 29; `STANDARD.md` moved to v0.11 (spine line + version note); `library.json standard` to 0.11; the live docs were swept to the 29-check spine; and the retired-U10 reference was dropped from the shipped `askit-release` and `askit-migrate` skills. A four-lens adversarial review confirmed no code or runtime regression and caught an incomplete first doc sweep (resolved before push). Gate 0/0 Advanced; suite 276/276.

## Consequences
- **Positive:** the gate's findings are now defensible (objective correctness or cited vendor best practice); a third-party plugin is never failed on typographic taste; the legitimacy case for the Standard strengthens.
- **Negative:** the toolkit's own GATE no longer enforces its dash-free authoring; mitigated by keeping the `hooks/no-dashes.mjs` PreToolUse hook (and the maintainer's global hook), so the repo's authoring stays dash-free without a graded requirement.
- **Neutral:** a relaxation, so no pinned consumer breaks; consistent with ADR 0027's principle that removing requirements is the safe direction.
