# F2 - the dependable eval-run pipeline (E11) - implementation plan

> Supporting (IMPROVE) effort; not in the v1.6.0 user-facing cut. Build right before corpus batch 3 so it is exercised immediately. Branch from `main`; ship the manifest, the deterministic runner, the dispatch templates, and the aggregator; verify gate Advanced 0/0; record. One or more PRs vs protected `main`, individually green.

## What F2 is (one paragraph)

Today an eval run is a hand procedure (clone a target, remember the pin, run the gate with the right profile and forward slashes, render, transcribe a row). F2 makes it a command: a pinned corpus manifest, a deterministic runner that refuses a drifted/empty tree and emits a record skeleton, the reusable advisory dispatch templates, and an aggregator that writes the tracked record and dossier. The deterministic half is model-free; only the dispatch involves a model, and its result can never move the verdict.

## Steps

Paths repo-relative to `E:\Projects\product-on-purpose\agent-skills-toolkit`.

### Step 1 - branch

```
git switch main && git pull
git switch -c f2-eval-run-pipeline
```

### Step 2 - the pinned-sha corpus manifest (R-PIPE-1)

Create `docs/internal/eval-runs/corpus.json` (tracked): an array of `{ id, repo, sha, scope, clonePath, notes }` for the four anchors plus any batch-3 additions. This is the reproducibility root.

### Step 3 - the deterministic runner (R-PIPE-2, R-PIPE-5)

Create `scripts/eval-run.mjs` (or `scripts/lib/eval-run.mjs` + a thin CLI):
- Accept a target path or a manifest id; resolve the clone path; **verify `git -C <clone> rev-parse HEAD` equals the pinned sha** and the tree is non-empty, failing loudly otherwise (closes the silent-empty-dir trap).
- Normalize the target path to forward slashes before handing it to `check`/`evaluate` (the Windows backslash trap).
- Run the free gate under the chosen profile; render conformance HTML + MD via the existing renderer; write outputs and a record-row skeleton (the `eval-runs.md` schema fields, with token/wall-clock left blank for the advisory pass to fill) under `_local/audit/eval-runs/<date>/<run-id>-*`.
- Make no model call; log any coverage bound (sampled targets) into the run output.
- New `scripts/lib/*` files MUST be listed in `scripts/lib/README.md` (G8) or the dogfood fails.

### Step 4 - the advisory dispatch contract (R-PIPE-3)

Add tracked templates under `docs/internal/eval-runs/` (e.g. `dispatch/reviewer.md`, `dispatch/grader.md`): the role prompts parameterized by `{model, effort, target, scope}`, carrying the effort wording, the collection-scale sampling protocol (sample at 50+ skills), and the plain-ASCII output rule. State the `applyAdvisory` allowlist invariant (the result is rendered beside the verdict, never moves it). These are the prompts a maintainer pastes (or a future automation dispatches) for the model pass.

### Step 5 - record + aggregate automation (R-PIPE-4)

Add an aggregator (`scripts/eval-run.mjs --aggregate <date>` or a sibling): read the day's record skeletons, append correctly-shaped rows to `docs/internal/eval-runs/eval-runs.md` (schema incl. `scope`), and update the measured ranges in `docs/reference/token-usage-estimates.md`. Keep raw artifacts gitignored under `_local/audit/eval-runs/`.

### Step 6 - verify + exercise on batch 3

Run the pipeline against the corpus manifest for batch 3; confirm reproducible deterministic output, a clean record append, and that a drifted/empty tree fails loudly. `node scripts/check.mjs .` Advanced 0/0; `npm test` green.

## Verification

| Command | Expected |
|---|---|
| `node scripts/eval-run.mjs deanpeters-pm --profile plain-plugin` | verifies the pin, renders the conformance report, writes a record skeleton; fails loudly if the clone is not at the pinned sha. |
| `node scripts/eval-run.mjs --aggregate <date>` | appends correctly-shaped `eval-runs.md` rows; updates the dossier ranges. |
| `node scripts/check.mjs .` | Advanced 0/0 (new `scripts/lib/*` listed in `scripts/lib/README.md`). |
| `npm test` | green. |

## Adversarial review

4-lens read-only review: **determinism** (the runner is reproducible and model-free; the dispatch is the only model surface); **soundness** (a drifted/empty tree fails loudly, not silently; paths are forward-slash normalized); **contract fidelity** (the record schema matches `eval-runs.md`; the dispatch states the never-moves-the-verdict invariant; coverage bounds are logged); **house rules** (new `scripts/lib/*` in `scripts/lib/README.md`; no em/en dashes; ASCII output rule in the templates).

## The PR

- **Title:** `feat(eval-runs): dependable eval-run pipeline - pinned corpus + deterministic runner + dispatch contract + aggregation (E11)`
- **Why:** the improve loop was a hand procedure with a silent-empty-dir trap; F2 makes a run a reproducible command before corpus batch 3 exercises it.
- **Trailer:** `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Rollback / risk notes

- Pure tooling around the existing core; a revert removes the pipeline and returns to the hand procedure, stranding nothing.
- The deterministic runner makes no model call, so it cannot leak the advisory layer into the verdict.
