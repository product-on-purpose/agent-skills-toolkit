---
title: "askit uplift program - relocation addendum"
description: "The packing-list delta this program hands the standards program if the Standard and checker relocate"
status: draft
last-updated: "2026-07-06"
---

# Relocation addendum

**What this delivers and why it matters (plain language).** The maintainer's separate standards program (in agent-plugins) has a written plan to move the Standard text and the grading engine out of this repo into a shared home. That plan includes an exact packing list of files to move and delete. This program adds new code near the engine, which would make that packing list stale. This document is the fix: a running record of every engine-adjacent file this program adds or changes, with its disposition, so the moving day needs a mechanical diff, not archaeology.

**Reference:** the staged relocation lives at agent-plugins `docs/internal/execution/05-lane-b/B2-pr-c-askit-readopt.md` (PR-C, askit re-adopt) and its packing list derives from that program's PR-B relocation manifest. Dispositions here use its vocabulary: **relocates** (moves with the runner), **retained** (stays in askit), **repoint** (stays but must target the relocated runner).

## Baseline (as of 2026-07-06, before this program)

Per the staged PR-C package, the planned relocation set is: `STANDARD.md`, `scripts/check.mjs`, `scripts/tier-report.mjs`, `scripts/lib/`, `scripts/checks/`, `scripts/generators/`, and the runner tests under `tests/`. Retained by askit: `scripts/evaluate.mjs` and the report/advisory side (final dispositions of shared lib imports are owned by that program's PR-B probe).

## Delta log (updated whenever this program touches engine-adjacent code)

| Date | File(s) | Change | Disposition if the checker relocates |
|---|---|---|---|
| (none yet) | | | |

Planned entries this program expects to add (kept current as releases land):

- `scripts/lib/craft-review.mjs` (SP1, builder craft pass) - **retained**: evaluate-side advisory partition logic, not part of the runner.
- The marketplace-scope module home (Release 3; exact paths fixed by its ADR) - dispositions recorded per file when it lands; the design intent is a delimited module that either **relocates whole** (if it ships as gate scope) with minimal unpicking, or splits cleanly along the same gate-vs-advisory seam as the rest of the engine.
- Any new `REPORT_META` rows or renderer modules (Release 3 factoring) - **retained**: presentation layer.
- F2 (eval-run pipeline) runner - **retained + repoint**: it invokes the gate only through the `npm run check` seam, so relocation costs it a config change, not a rewrite.

## Standing rules this program follows to keep the move cheap

1. New engine-adjacent code never hardcodes `scripts/check.mjs`; it calls through `npm run check` or an injected gate function.
2. New checks or scopes are ADR-gated and built in delimited module homes with minimal imports into existing lib internals.
3. Every landing that touches `scripts/` updates the delta log above in the same session.
4. If the standards program's PR-C (askit re-adopt) fires mid-program, execution stops and reconciles against this document first (stop-and-flag rule in [03-execution-plan.md](03-execution-plan.md)).
