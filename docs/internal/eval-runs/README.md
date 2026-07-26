# eval-runs - the historical evaluation-run record

The tracked log of every **model-assisted** evaluation run (the `--report=review` and `--report=behavioral` advisory layers, and eventually `askit-build-*` authoring runs). The deterministic gate costs zero model tokens and is reproducible, so it is never logged here; this record exists for the layer that has real model and effort variance.

Two purposes, in priority order:

1. **Exercise and improve the toolkit.** Every advisory run is a sensor reading on the evaluator, not a report card on the target. Gaps the run surfaces (a judge that misfires, a check false-positive class, a review that is too shallow at a given effort) are filed in the run's notes and triaged the corpus way: calibrate via ADR + TDD if warranted.
2. **Keep the token dossier honest.** The measured token numbers here are the source for the MEASURED rows in [`docs/reference/token-usage-estimates.md`](../../reference/token-usage-estimates.md). When enough runs cover a model x effort cell, the dossier's provisional range moves to measured and cites this record.

## What lives where

- **This folder (tracked):** [`eval-runs.md`](eval-runs.md) - one row per run plus the per-batch toolkit findings.
- **Gitignored:** the raw advisory JSON files and rendered HTML reports, under `_local/audit/eval-runs/<date>/`. The record row carries the path.

## Running a batch (the pipeline, not a procedure)

A run is a command, not a checklist (F2, backlog E11). The deterministic half makes no model call:

1. `node scripts/eval-run.mjs deanpeters-pm` - resolves the target from the pinned manifest [`corpus.json`](corpus.json), refuses a drifted, empty, or dirty tree, grades it through the `npm run check` seam, renders the conformance report, and writes a record skeleton under `_local/audit/eval-runs/<date>/`.
2. The advisory pass (the only model surface): dispatch [`dispatch-reviewer.md`](dispatch-reviewer.md) or [`dispatch-grader.md`](dispatch-grader.md), then fill the skeleton's `advisory` fields.
3. `node scripts/eval-run.mjs --aggregate <date>` - appends the rows to [`eval-runs.md`](eval-runs.md) newest-batch-first and widens the machine-maintained measured range in [`docs/reference/token-usage-estimates.md`](../../reference/token-usage-estimates.md). The dossier's MEASURED table rows stay hand-written: their Notes column is editorial.

Aggregate only once the advisory fields are filled: this record is the **model-assisted** log, and a deterministic-only run belongs in `_local/` until a model has actually judged the target. `--dry-run` previews the exact rows and writes nothing.

Every bound the pipeline applies (a `--limit`, a collection-scale sampling instruction) is stated in the run output and carried into the record's batch section, so a sampled batch can never be read later as full coverage.

## The row schema

Per run: id, date, context (why evaluated), target (name, version or commit), **evaluation scope** (component = a single skill directory graded by rule with no tier, vs plugin = a whole plugin/library graded against the tier ladder - `evaluate.mjs` auto-detects this from the target: `SKILL.md` with no `library.json`/`AGENTS.md`/`skills/` means component), report type (review | behavioral), model, effort, token usage, wall-clock, output reference, verdict or findings summary, notes (any evaluator gap surfaced).

Scope matters to cost: target size dominates token usage, and scope is the coarse proxy for it - component-scope runs have measured near the ~33k floor, plugin-scope runs scale with skill count and instructed depth (up to ~103k measured). Record the scope so the dossier's ranges can be split per scope once enough rows exist.

Measurement conventions:

- **Tokens** are the `subagent_tokens` figure Claude Code reports for the Agent dispatch that produced the advisory JSON: the harness-reported total for that subagent's whole run (reading the target, running the deterministic baseline, judging, and emitting the JSON). The parent session's orchestration cost (prompt assembly, writing the JSON to disk, rendering) is not included; the render itself is deterministic and costs 0 model tokens.
- **Effort** is instruction-directed: the dispatch prompt sets the expected depth (high = exhaustive multi-pass verification, medium = one balanced thorough pass, low = one quick bounded pass). The harness does not expose a per-dispatch extended-thinking budget, so effort here is the instructed level, not a configured thinking budget.
- **Targets** are pinned by commit (third-party clones) or component version (toolkit skills) so a run is re-derivable.

## Inventory

- `README.md` - this guide.
- `eval-runs.md` - the run log and per-batch toolkit findings.
- `METHODOLOGY.md` - how runs are judged for quality and how sensor readings become verified, shipped engine calibrations (the observe -> verify -> calibrate path).
- `corpus.json` - the pinned-sha corpus manifest (repo URL, sha, scope, local clone) that makes a batch reproducible.
- `dispatch-reviewer.md` - the review-mode advisory dispatch template (role prompt, effort wording, sampling protocol, output contract).
- `dispatch-grader.md` - the behavioral-mode advisory dispatch template.
