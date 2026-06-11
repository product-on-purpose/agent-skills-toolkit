# Eval-run methodology - how runs become engine improvements

How we learn about the QUALITY of the evaluation engine (the deterministic gate plus the model-assisted advisory layer) from real runs, and how a run's observations become aligned, shipped changes. The run log itself is [eval-runs.md](eval-runs.md); conventions for the captured fields are in [README.md](README.md).

## The core discipline: sensor readings, then verification, then calibration

Every run against a real target is a **sensor reading on the evaluator, not a report card on the target**. A reading never changes the engine directly. The promotion path is:

1. **Observe.** A run surfaces something: a finding class that looks like a false positive, a check the advisory contradicts, a gap neither layer covers, a cost or quality surprise. It is recorded in the batch's "Toolkit findings" list with a proposed disposition.
2. **Verify against ground truth.** Before any observation becomes calibration input, it is verified by hand against an authoritative semantic (the spec, the file on disk, the rendering behavior) - NOT against the advisory's own confidence. This rule exists because it already caught a real near-miss: in batch 2026-06-10b, a Sonnet/high advisory confidently triaged 11 U6 (reference-links) errors as checker false positives and recommended weakening U6; CommonMark relative-link resolution proves those links genuinely 404, so U6 was right and the "fix" would have blinded it (reading 8). A model's triage is itself advisory.
3. **Calibrate via ADR + TDD, or file.** Verified readings that warrant an engine change go the established route: an ADR records the decision (with a short descriptive title, e.g. ADR 0032 "U6 inline-code + U12 non-live mermaid"), the change lands RED-first behind tests built from the corpus evidence, and the default grade's stability is asserted (a calibration changes HOW a check fires, not WHAT the Standard requires). Readings that do not warrant a change are still recorded with the reason - a declined reading is data too.

## What each run captures, and why

| Field | Why it is captured |
| --- | --- |
| Context | so a future reader knows what question the run was answering |
| Target, pinned (commit / component version) | reproducibility - a reading is only re-derivable against the same bytes |
| Report type, model, effort | the cost/quality matrix cell this run fills |
| Tokens (harness-reported subagent total) + wall-clock + tool uses | the measured cost; feeds the public dossier's MEASURED rows |
| Deterministic gate verdict | the free baseline the advisory sat beside; also the false-positive denominator |
| Advisory result summary | the quality evidence (finding counts, severities, what only judgment could see) |
| Output reference | the raw advisory JSON + rendered report under `_local/audit/eval-runs/<date>/` |
| Notes / sensor readings | the actual product of the run - what it taught us about the ENGINE |

## How we judge advisory QUALITY today (and the rigor gap)

Today's quality assessment is **structured-qualitative**: for each run we record what the advisory found that the gate could not, whether its claims survived spot verification, and how depth tracked the instructed effort. That was enough to establish the headline results so far: the quality gradient orders as predicted (Opus > Sonnet > Haiku on open-ended judgment), cost is dominated by target size rather than model tier, Haiku's low-to-medium effort step is high-leverage, and a strong model at high effort can still be confidently wrong (reading 8).

It is NOT yet a measurement. Three things are missing before "advisory quality" is a number rather than a narrative, in priority order:

1. **Seeded-defect benchmark targets (advisory golden/anti fixtures).** The deterministic spine is tested against golden/anti fixtures; the advisory layer has no equivalent. Build one or two fixture plugins with KNOWN, planted qualitative issues (a trigger-surface collision, a manifest-vs-disk drift, a stale doc claim, a subtly wrong procedure) plus a scoring key. Then an advisory run has measurable precision/recall per model x effort cell, and a calibration to the dispatch prompts can be regression-tested.
2. **Same-target cross-model A/B.** The current matrix confounds target with model (each cell used a different target, chosen deliberately to widen coverage first). To isolate the model/effort effect, run two or three models on the SAME target and diff their finding sets against the scoring key (or against a verified union).
3. **An adversarial verification pass before recording.** For findings that will drive engine changes, the 4-lens refute-style verification the repo already uses for pre-merge review should be applied to advisory findings (cheap: only the calibration-relevant findings need it). Reading 8 is the existence proof for why.

## Where everything lives (the documentation map)

| Artifact | Location | Tracked? |
| --- | --- | --- |
| Run log + sensor readings + dispositions | `docs/internal/eval-runs/eval-runs.md` | yes |
| Conventions + this methodology | `docs/internal/eval-runs/README.md`, `METHODOLOGY.md` | yes |
| Raw advisory JSON + rendered HTML reports | `_local/audit/eval-runs/<date>/` | gitignored (the row carries the path) |
| Measured token aggregates (public) | `docs/reference/token-usage-estimates.md` | yes (site) |
| Calibration decisions | `docs/internal/decisions/` (ADRs) | yes |
| Engine improvement queue | `docs/internal/backlog/enhancements.md` (E-items) | yes |
| Release packaging of accepted work | `docs/internal/release-plans/plan_vX/` (SPEC + IMPL-PLAN per feature) | yes |

## How readings become specs, implementation plans, and release plans

The pipeline from observation to release reuses the repo's existing machinery rather than inventing a parallel one:

- **Small calibrations** (a check's matching behavior, a message wording): ADR + TDD directly, accumulated under CHANGELOG `[Unreleased]` toward a patch release (the v1.5.1 pattern).
- **New checks or schema changes** (e.g. reading 12's manifest-vs-disk drift candidate): an ADR is mandatory (spine/Standard impact), and the work graduates to a release-plan packet (`docs/internal/release-plans/plan_vX/` with SPEC + IMPL-PLAN) when committed to a minor version.
- **Pipeline/process improvements** (runner, fixtures, A/B protocol): intake as backlog E-items first (see E11, the dependable eval-run pipeline), promoted to a plan packet when a release commits to them.

## Inventory note

This file is listed in the folder [README.md](README.md) inventory.
