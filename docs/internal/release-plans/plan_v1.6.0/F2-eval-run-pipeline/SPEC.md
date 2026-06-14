# F2 - the dependable eval-run pipeline (E11) - SPEC

> The feature SPEC for **F2**, a **supporting (IMPROVE-pillar)** effort of the v1.6.0 program. F2 makes the eval-run loop reproducible: a pinned-sha target manifest, a deterministic runner, the advisory dispatch contract, and record/aggregate automation. It is **not** in the v1.6.0 user-facing cut (F1 + F4); it lands continuously and should be built right before corpus batch 3 so it is exercised immediately (PROGRAM-PLAN sec 2).
> Created 2026-06-13. Owner: maintainer. Source of truth: backlog E11 (`docs/internal/backlog/enhancements.md`), the eval-run METHODOLOGY (`docs/internal/eval-runs/METHODOLOGY.md`), STATUS roadmap P1 item 3. Live status: [`docs/internal/STATUS.md`](../../../STATUS.md).

## What this delivers (plain language first)

**For anyone (non-engineer):** the toolkit improves by grading real third-party plugins and learning from what it finds (the "eval-run program"). Today each run is done by hand, which is slow and easy to do inconsistently. F2 turns that into a repeatable routine: a list of exactly which plugins to grade (pinned to an exact version so the result never drifts), a script that grades them the same way every time, a standard set of instructions for the AI advisory pass, and automatic recording of the results. The payoff is that anyone can reproduce a run and trust the comparison, and the next batch of grading takes minutes to set up instead of an afternoon.

**For an engineer:** F2 ships (1) a tracked pinned-sha corpus manifest, (2) a deterministic runner that clones/verifies the pin, runs the free gate, renders the conformance report, and emits a record-row skeleton under `_local/audit/eval-runs/<date>/`, (3) the advisory dispatch contract (the `askit-reviewer`/`askit-quality-grader` role-prompt templates with effort wording, the collection-scale sampling protocol, and the plain-ASCII output rule), and (4) aggregation of the record skeletons into `docs/internal/eval-runs/eval-runs.md` and the `token-usage-estimates.md` dossier. The deterministic half is model-free and reproducible; only the advisory dispatch involves a model.

## 1. Goal

Eval-run reading work proved the improve loop's value but exposed its fragility: runs are hand-driven, targets are re-cloned ad hoc (the Windows backslash-path trap silently graded an empty dir once), and recording is manual. F2 makes a run a command, not a procedure, so corpus batch 3 and every later batch are reproducible and cheap to set up.

## 2. Requirements

### R-PIPE-1 - a pinned-sha corpus manifest

A tracked manifest (e.g. `docs/internal/eval-runs/corpus.json` or `.txt`) MUST list each reusable target with its repo URL, the pinned sha, the scope (plugin / component / marketplace-by-hand), and the local reusable clone path. It MUST capture the four existing anchors (`anthropics/skills` @ `5754626`, `lenny-skills` @ `280a57a`, `deanpeters-pm` @ `70fb6c4`, `phuryn-pm` @ `d384f0c`) so a batch is reproducible from the manifest alone.

- **Acceptance:** the manifest lists every reusable anchor with URL + sha + scope + clone path; a reader can reconstruct any past batch's targets from it.

### R-PIPE-2 - a deterministic runner (free, model-free, reproducible)

A runner script MUST, given a target (or the manifest), verify the working tree is at the pinned sha (refusing to run on a drifted or empty tree - closing the silent-empty-dir trap), run the free deterministic gate (`check`/`evaluate`) under the chosen profile, render the conformance report (HTML + MD), and write the outputs plus a record-row skeleton under `_local/audit/eval-runs/<date>/<run-id>-*`. It MUST use forward-slash path normalization so a Windows backslash path cannot grade an empty dir. It MUST make no model call.

- **Acceptance:** running it on `deanpeters-pm` @ the pinned sha produces the conformance report + a record skeleton; running it on a tree NOT at the pin fails loudly; two runs on the same pin produce identical deterministic output.

### R-PIPE-3 - the advisory dispatch contract

The pipeline MUST ship reusable role-prompt templates for the advisory pass: the `askit-reviewer` (review mode) and `askit-quality-grader` (behavioral mode) prompts, parameterized by model and effort, carrying the effort wording, the collection-scale sampling protocol (instruct sampling at 50+ skills - it held an 86-skill review to ~77k), and the plain-ASCII output rule (no em/en dashes, no smart quotes). The contract MUST state that the advisory result is rendered beside the verdict and never moves it (the `applyAdvisory` allowlist invariant).

- **Acceptance:** the templates exist as tracked files; a dispatch produces a result that records model + effort + date and is allowlist-merged; the sampling protocol and ASCII rule are stated in the template.

### R-PIPE-4 - record and aggregate automation

The pipeline MUST turn the per-run skeletons into `eval-runs.md` rows (the existing record schema: id, model, effort, tokens, wall-clock, tool uses, advisory result, output pointer, scope) and update the `token-usage-estimates.md` measured ranges, so recording is not hand-transcription. Raw artifacts stay gitignored under `_local/audit/eval-runs/`; the tracked record and dossier are the durable surface.

- **Acceptance:** running the aggregator after a batch appends correctly-shaped rows to `eval-runs.md` and updates the dossier's measured ranges; the schema matches the existing record (scope column included).

### R-PIPE-5 - documented, not a silent cap

Any bound the pipeline applies (top-N targets, sampling, no-retry) MUST be logged in the run output, so a reader never mistakes a sampled run for full coverage (the METHODOLOGY "no silent caps" rule).

- **Acceptance:** a sampled run's output states what was sampled and what was dropped.

## 3. Acceptance criteria (feature-level checklist)

- [ ] A pinned-sha corpus manifest lists every reusable anchor with URL + sha + scope + clone path (R-PIPE-1).
- [ ] The deterministic runner verifies the pin, runs the free gate, renders the report, emits the record skeleton, normalizes paths, and makes no model call (R-PIPE-2).
- [ ] The advisory dispatch templates (reviewer + grader) carry effort wording, the sampling protocol, and the plain-ASCII rule, and state the never-moves-the-verdict invariant (R-PIPE-3).
- [ ] Aggregation appends correctly-shaped `eval-runs.md` rows and updates the dossier (R-PIPE-4).
- [ ] Any coverage bound is logged (R-PIPE-5).
- [ ] `node scripts/check.mjs .` Advanced 0/0; `npm test` green; no em/en dashes; the work is recorded.

## 4. Out of scope

- **A marketplace SCOPE for the gate** (P3) - F2 runs per-plugin; marketplace-scope grading is a separate concept.
- **Hosting/showcasing the rendered reports** (the corpus-to-showcase mechanics noted in the 2026-06-10 session Q1) - a later pass.
- **Changing any check or the verdict** - F2 is orchestration around the existing deterministic core and advisory layer.

See [`IMPL-PLAN.md`](./IMPL-PLAN.md) and PROGRAM-PLAN sec 2 (F2 is supporting work, not in the v1.6.0 cut).
