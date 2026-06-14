# F3 - advisory quality measurement - implementation plan

> Supporting (IMPROVE) effort; not in the v1.6.0 user-facing cut. Branch from `main`; ship the seeded-defect fixture + key, the precision/recall harness, and the defect-rich triple replication; record into the dossier and methodology; verify gate unchanged. One or more PRs vs protected `main`, individually green.

## What F3 is (one paragraph)

The advisory layer's value is shown but unmeasured. F3 plants known qualitative defects in a fixture with a scoring key, scores each model x effort run for precision/recall, and replicates the Opus/Sonnet/Haiku triple on a defect-rich target to test the "Sonnet matches Opus" parity claim where triage depth matters. The output is numbers in the dossier and methodology; the deterministic grade is never touched.

## Steps

Paths repo-relative to `E:\Projects\product-on-purpose\agent-skills-toolkit`.

### Step 1 - branch

```
git switch main && git pull
git switch -c f3-advisory-quality
```

### Step 2 - the seeded-defect fixture + scoring key (R-AQ-1)

Create a fixture (a tracked plugin under `tests/fixtures/` or a curated `docs/internal/eval-runs/seeded/`) with documented planted defects across the surfaced classes (the recorded real examples are the template): a fake legal statute (the VIPA/VCDPA class), an inverted domain rule (the AmE/BrE data-rule class), a command-vs-skill enumerated-content contradiction (the XYZ+S / 10-list class), a capability overclaim (DOCX/email class), and a broken cross-reference (the U6 link class). Write the scoring key as a tracked file mapping each planted defect to a ground-truth label and a match rule.

### Step 3 - the precision/recall harness (R-AQ-2)

Add a harness (`scripts/lib/advisory-score.mjs` + a thin CLI) that takes an advisory result file and the scoring key, classifies each finding as TP/FP/miss, and computes precision/recall for the run's model x effort cell. Record the pair in the eval-run record (or a sibling measurement table). Keep it reproducible and model-free (it scores an existing result; it does not dispatch a model). List new `scripts/lib/*` in `scripts/lib/README.md` (G8).

### Step 4 - replicate the triple on a defect-rich target (R-AQ-3)

Pick a structurally-defective target (a defect-rich plugin from the corpus or a curated one) and run Opus/Sonnet/Haiku at high effort with an identical prompt (the F2 dispatch contract). Score each against the key (Step 3). Compute the verified-finding union. Record the three runs in `eval-runs.md` and state whether the reading-16 parity claim holds on a defect-rich target.

### Step 5 - feed the dossier and methodology (R-AQ-4)

Update `docs/reference/token-usage-estimates.md` (model guidance with the measured precision/recall) and `docs/internal/eval-runs/METHODOLOGY.md` (the parity verdict, the scoring method). Touch no check module; confirm the verdict is unchanged.

## Verification

| Command | Expected |
|---|---|
| `node scripts/lib/advisory-score.mjs <result> <key>` | a precision/recall pair classifying each finding TP/FP/miss; reproducible across runs. |
| `node scripts/check.mjs .` | Advanced 0/0, unchanged (no check touched). |
| `npm test` | green. |

## Adversarial review

4-lens: **soundness** (the scoring key is precise enough that TP/FP/miss classification is unambiguous; the harness does not credit a hallucinated correction as a TP - reading 17's Haiku confabulation must score as FP+miss, not TP); **determinism** (the harness scores a fixed result identically; it dispatches no model); **methodology fidelity** (verify-before-calibrate is honored - the parity verdict rests on hand-verified findings, not raw counts); **contract** (no check or verdict change; the advisory stays advisory; no em/en dashes).

## The PR

- **Title:** `feat(eval-runs): advisory quality measurement - seeded-defect fixture + precision/recall harness + defect-rich triple`
- **Why:** the advisory layer's value is shown but unmeasured; F3 scores it and tests the parity claim where triage depth matters, so the dossier's model guidance rests on measurement.
- **Trailer:** `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Rollback / risk notes

- Measurement tooling + fixtures + doc updates; a revert removes them and strands nothing. No check or verdict is affected.
- The harness scores existing advisory results and never dispatches a model, so it cannot leak the advisory layer into the deterministic grade.
