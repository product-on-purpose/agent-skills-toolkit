---
title: Refresh runbook - competitive comparison
last_verified: 2026-06-10
---

# Keeping the comparison current

The matrix and the public views are PROJECTIONS of the dated profiles in `tool-profiles/`. Refreshing is therefore a bounded, mechanical loop - re-verify, re-distill - not a fresh research project. This runbook is the loop.

## Cadence

- **Quarterly** - a full sweep: re-verify the volatile cells of every profile (see below), then re-distill.
- **Event-triggered** - whenever a tracked tool ships a MAJOR release that changes capabilities, refresh that one profile out of band, then re-distill.

## What is volatile (always re-checked)

- Dimension 14 (maturity signal): stars, releases, last-commit. These are dated snapshots and decay immediately.
- Any cell the profile rated Medium or Low confidence (the `(M)` / `(unverified)` cells in the matrix). These are the readings most likely to be wrong, or to have been clarified by a new release.
- Any Open item in a profile (the things a primary source could not settle last time).

Stable cells (license, architecture, unit of evaluation, governance) rarely change; confirm them only on the quarterly sweep or when a release suggests a change.

## The re-run loop

1. **Re-verify the changed tool(s).** Re-dispatch the Phase 1 verification procedure (IMPL-PLAN.md, "Phase 1 research procedure") for each tool that needs refreshing: a research agent reads the tool's PRIMARY sources (repo, releases, docs) and re-fills its profile per `_TEMPLATE.md` and the rules in `METHODOLOGY.md`. Update `last_verified` to the refresh date. Keep the evidence discipline: every cell cited + confidence-labelled; secondary-only facts stay out.
2. **Re-distill the matrix.** Re-run Task 12 (IMPL-PLAN.md): pull the refreshed dimension values into `matrix.md`, update its `last_verified`, and re-check that no `_pending_` remains. If a refresh surfaced a new cross-source contradiction, add an adjudication row to `METHODOLOGY.md`.
3. **Re-check the gap analysis.** If a refresh changed a capability (a competitor shipped something in the Adopt / Build / Skip space, or askit closed a gap), re-run Task 13 to update `gap-analysis.md`. A pure stars/date refresh does not require this.
4. **Re-publish (if the public page is live).** If `docs/explanation/comparison.md` has shipped, regenerate its curated subset from the refreshed matrix and re-run the gate + site guards (IMPL-PLAN.md Task 16).

## The public-page gate

`docs/explanation/comparison.md` (Task 16) is DEFERRED: publish it only once the eval-target corpus run has produced a richer body of rendered reports to link as live proof (DESIGN.md section 3b). Until then the public surface stays unpublished and this runbook maintains the internal artifacts only.

## How to re-verify one tool

Dispatch a research subagent with the Phase 1 procedure from IMPL-PLAN.md, filling the tool's repo + primary sources + any known disputes. The agent reads `_TEMPLATE.md` + `METHODOLOGY.md`, re-researches against primary sources, and writes the refreshed `tool-profiles/<tool>.md` (it does not commit). Then run the acceptance check (last_verified set; at least 16 confidence labels; at least 16 source links) and commit.

For a gate-run against a competitor's repo (when a profile needs askit's own grade of that tool as evidence), use `node scripts/check.mjs <path> --profile plain-plugin` so no config is written into a tree you do not own (v1.5.0).
