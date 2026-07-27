---
title: "askit uplift program - execution packet map"
description: "Entry point and file map for the askit uplift program execution packet (four releases, v1.7.0 through v1.10.0)"
status: draft
last-updated: "2026-07-06"
---

# askit uplift program - execution packet

This packet is the complete plan for the **askit uplift program**: four releases (v1.7.0 through v1.10.0) that deepen the Create pillar (the builders), industrialize the Improve pillar (the eval-run loop), ship the gate's next headline (marketplace-scope evaluation), close the Manage gaps, restore every stale trust surface, and deliver the first read-only slice of the studio GUI.

It was created 2026-07-06 from a full multi-agent audit of the repo, the wrap-session logs, and the raw Claude Code transcripts of this and related projects (committed as [01-audit-2026-07-06.md](01-audit-2026-07-06.md)), under the maintainer rulings recorded in [07-decision-register.md](07-decision-register.md).

## Authorization status (2026-07-26)

| Release | Status |
|---|---|
| **R1 (v1.7.0 "trust and craft")** | **AUTHORIZED 2026-07-26** and in execution. The maintainer's instruction was "complete 1.7.0". |
| R2 (v1.8.0), R3 (v1.9.0), R4 (v1.10.0) | **Still pending.** Each remains subject to the maintainer's go; nothing in them is in flight. |

Two amendments to R1 as written, both forced by work that shipped after the packet was authored:

1. **v1.6.1 already took three of R1's riders.** The U12 (mermaid-valid) calibration, the U6 (reference-links) template-slot fix, and the display pair (above-tier sectioning plus the pinned-Standard debt line) shipped in v1.6.1 on 2026-07-25 under ADR 0036, ahead of this program. R1's H1 batch is correspondingly lighter, and R1's PR-1 keeps only the U6 finding-message wording item (H1.11), not the U6 logic.
2. **The cross-repo boundary was lifted for the v1.6.1 re-pin.** Ruling AU-2 (re-pins staged, never executed) was overridden by explicit maintainer instruction on 2026-07-26; the v1.6.1 re-pin was executed as `agent-plugins` PR #54 (registry `metadata.version` 1.38.0 -> 1.39.0), which also backfilled a missing `[1.37.0]` registry CHANGELOG entry. The default remains "stage, do not execute" absent a fresh instruction.

**What this delivers and why it matters (plain language).** The toolkit today is a healthy, self-proving product whose builders are broad but shallow, whose evaluation loop is hand-run, and whose public README is three versions stale. This program makes the builders genuinely good teachers (with real working examples), makes the improvement loop reproducible and measurable, teaches the grader to grade whole marketplaces in one run, gives the project its first visual face, and fixes every surface that currently contradicts itself. Each release is independently shippable: stopping after any one of them still leaves a complete, better product.

**The one boundary rule.** This program writes only to this repository. The marketplace re-pin step of each release is staged as ready-to-apply instructions for the maintainer, never executed. The maintainer's separate standards program (in agent-plugins) may later relocate the Standard and the checker; this program plans around that move and never performs it.

## How to use this packet

Suggested reading order for the maintainer: this file, then [EXEC-SUMMARY.md](EXEC-SUMMARY.md) (the go/no-go page), then [07-decision-register.md](07-decision-register.md) (what was ruled and what you can still overrule), then any release plan under [04-releases/](04-releases/README.md).

## Inventory

- [README.md](README.md) - this file, the packet map.
- [EXEC-SUMMARY.md](EXEC-SUMMARY.md) - the executive summary the maintainer reviews before saying "go".
- [01-audit-2026-07-06.md](01-audit-2026-07-06.md) - the audit record: verified state, findings, open-work inventory, maintainer signals.
- [02-prd.md](02-prd.md) - product requirements: outcomes, success metrics, scope rulings, non-goals, constraints.
- [03-execution-plan.md](03-execution-plan.md) - the release model, sequencing, gates, living-docs protocol, stop-and-flag rules, done definitions.
- [04-releases/](04-releases/README.md) - the four release plans: R1 (v1.7.0 trust and craft), R2 (v1.8.0 deep builders, measured advisory), R3 (v1.9.0 marketplace scope), R4 (v1.10.0 manage and studio).
- [05-ci-plan.md](05-ci-plan.md) - CI hardening plan (Dependabot, Node matrix, audit step, caching, concurrency, SHA-pinning, coverage).
- [06-release-choreography.md](06-release-choreography.md) - the per-release cut runbook, including the staged re-pin instructions template.
- [07-decision-register.md](07-decision-register.md) - every decision this program rests on, who ruled it, and which are still overridable.
- [08-risk-register.md](08-risk-register.md) - ranked risks with mitigations, triggers, and owners (living document).
- [09-backlog.md](09-backlog.md) - everything deliberately NOT in the four releases, so nothing is silently lost (living document).
- [10-agent-operations.md](10-agent-operations.md) - the orchestration contract: model routing, adversarial panel, TDD protocol, session discipline, stop-and-flag.
- [relocation-addendum.md](relocation-addendum.md) - the packing-list delta this program hands the standards program if the checker relocates (created when Release 3 lands engine-adjacent code; a stub until then).

## Relationship to existing repo conventions

This packet spans four releases, so it lives here rather than in a single release folder. Each release still gets the repo's conventional thin packet under `docs/internal/release-plans/plan_vX.Y.0/` at cut time (a RELEASE-PLAN.md plus the staged repin-instructions.md), linking back here. `docs/internal/STATUS.md` remains the single live tracker; this packet's registers are updated in the same session as any landing per the living-docs protocol in [03-execution-plan.md](03-execution-plan.md).


## Renumbered 2026-07-27

**R3 is now v1.10.0 and R4 is now v1.11.0.** Maintainer-approved work outside this program (`askit-standards-watch` plus the ADR implementation-sites convention) shipped as **v1.9.0**, because adding a skill is a MINOR under semver and the version is a promise to anyone installing from the marketplace. Renumbering an internal plan is cheaper than misnumbering a public release.

Release CONTENT is unchanged. Only the version labels move. Where this packet's prose says "v1.9.0 marketplace scope" or "v1.10.0 manage and studio", read v1.10.0 and v1.11.0 respectively.
