# eval-runs - the historical evaluation-run record

The tracked log of every **model-assisted** evaluation run (the `--report=review` and `--report=behavioral` advisory layers, and eventually `askit-build-*` authoring runs). The deterministic gate costs zero model tokens and is reproducible, so it is never logged here; this record exists for the layer that has real model and effort variance.

Two purposes, in priority order:

1. **Exercise and improve the toolkit.** Every advisory run is a sensor reading on the evaluator, not a report card on the target. Gaps the run surfaces (a judge that misfires, a check false-positive class, a review that is too shallow at a given effort) are filed in the run's notes and triaged the corpus way: calibrate via ADR + TDD if warranted.
2. **Keep the token dossier honest.** The measured token numbers here are the source for the MEASURED rows in [`docs/reference/token-usage-estimates.md`](../../reference/token-usage-estimates.md). When enough runs cover a model x effort cell, the dossier's provisional range moves to measured and cites this record.

## What lives where

- **This folder (tracked):** [`eval-runs.md`](eval-runs.md) - one row per run plus the per-batch toolkit findings.
- **Gitignored:** the raw advisory JSON files and rendered HTML reports, under `_local/audit/eval-runs/<date>/`. The record row carries the path.

## The row schema

Per run: id, date, context (why evaluated), target (name, version or commit), report type (review | behavioral), model, effort, token usage, wall-clock, output reference, verdict or findings summary, notes (any evaluator gap surfaced).

Measurement conventions:

- **Tokens** are the `subagent_tokens` figure Claude Code reports for the Agent dispatch that produced the advisory JSON: the harness-reported total for that subagent's whole run (reading the target, running the deterministic baseline, judging, and emitting the JSON). The parent session's orchestration cost (prompt assembly, writing the JSON to disk, rendering) is not included; the render itself is deterministic and costs 0 model tokens.
- **Effort** is instruction-directed: the dispatch prompt sets the expected depth (high = exhaustive multi-pass verification, medium = one balanced thorough pass, low = one quick bounded pass). The harness does not expose a per-dispatch extended-thinking budget, so effort here is the instructed level, not a configured thinking budget.
- **Targets** are pinned by commit (third-party clones) or component version (toolkit skills) so a run is re-derivable.

## Inventory

- `README.md` - this guide.
- `eval-runs.md` - the run log and per-batch toolkit findings.
