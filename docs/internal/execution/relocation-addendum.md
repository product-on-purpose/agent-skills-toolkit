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
| 2026-07-26 | `scripts/lib/craft-review.mjs` (new, SP1 builder craft pass) | Added the craft-review SAFE/JUDGMENT partitioner, phase-2 eligibility, and consent-gated applier (ADR 0037) | **retained** - evaluate-side / askit-retained: it imports nothing from the check spine and rides the `evaluate.mjs --report=review` advisory path |
| 2026-07-26 | `scripts/eval-run.mjs`, `scripts/lib/eval-run.mjs`, `scripts/lib/eval-run-aggregate.mjs`, `tests/unit/eval-run.test.mjs`, `tests/unit/eval-run-aggregate.test.mjs` (F2, the eval-run pipeline) | New. The pinned-corpus runner (pin verification, forward-slash normalization, the record skeleton) and the aggregator that writes `docs/internal/eval-runs/eval-runs.md` rows plus the dossier's measured range. | **evaluate-side / askit-retained**, with one repoint: it orchestrates around the checker (gate via the `npm run check` seam, render via `npm run evaluate`) and is not part of the check spine, so relocation costs it a script definition rather than a rewrite. Its only engine-side import is `scripts/lib/fs-utils.mjs` (`listSkillDirs`, `readJsonSafe`, `relPath`); if that file relocates, repoint the import or copy those three helpers into the retained side. It reads and writes only askit surfaces (`docs/internal/eval-runs/`, `docs/reference/token-usage-estimates.md`, gitignored `_local/audit/eval-runs/`) and never writes into a graded target. |

| 2026-07-26 | `scripts/lib/advisory-score.mjs`, `tests/unit/advisory-score.test.mjs`, `tests/fixtures/anti/seeded-defects/simulated-runs/` (F3 R-AQ-2, the precision/recall harness) | New. Classifies each finding in an already-written advisory result against the seeded-defect scoring key and computes the precision/recall pair, the miss list and the adjudication worklist for one model x effort cell. | **evaluate-side / askit-retained**, and self-contained: its ENTIRE import graph is `node:fs`, `node:path` and `node:url` - it imports nothing from `scripts/lib/`, nothing from the check spine, and no shared utility, so relocation costs it nothing and it has no repoint. It reads two JSON documents (an advisory result and the key) and never reads the graded tree, runs a check, or dispatches a model; a test asserts the import allowlist and the absence of any dispatch surface. The key and fixtures it scores against live under `tests/fixtures/anti/seeded-defects/`, which is askit measurement data rather than runner data. |

Planned entries this program expects to add (kept current as releases land):

- `scripts/lib/craft-review.mjs` (SP1, builder craft pass) - **retained**: evaluate-side advisory partition logic, not part of the runner.
- The marketplace-scope module home (Release 3; exact paths fixed by its ADR) - dispositions recorded per file when it lands; the design intent is a delimited module that either **relocates whole** (if it ships as gate scope) with minimal unpicking, or splits cleanly along the same gate-vs-advisory seam as the rest of the engine.
- Any new `REPORT_META` rows or renderer modules (Release 3 factoring) - **retained**: presentation layer.
- F2 (eval-run pipeline) runner - landed in Release 1; see the delta log row above for its exact files and dispositions.

## Standing rules this program follows to keep the move cheap

1. New engine-adjacent code never hardcodes `scripts/check.mjs`; it calls through `npm run check` or an injected gate function.
2. New checks or scopes are ADR-gated and built in delimited module homes with minimal imports into existing lib internals.
3. Every landing that touches `scripts/` updates the delta log above in the same session.
4. If the standards program's PR-C (askit re-adopt) fires mid-program, execution stops and reconciles against this document first (stop-and-flag rule in [03-execution-plan.md](03-execution-plan.md)).
