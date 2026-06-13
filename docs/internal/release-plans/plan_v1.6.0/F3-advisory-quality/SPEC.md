# F3 - advisory quality measurement - SPEC

> The feature SPEC for **F3**, a **supporting (IMPROVE-pillar)** effort of the v1.6.0 program. F3 makes the model-assisted advisory layer trustworthy and measurable: seeded-defect fixtures with a scoring key (precision/recall per model x effort) and a replication of the R9/R10/R11 model triple on a structurally-defective target. Not in the v1.6.0 user-facing cut; lands continuously (PROGRAM-PLAN sec 2).
> Created 2026-06-13. Owner: maintainer. Source of truth: the eval-run METHODOLOGY rigor items (`docs/internal/eval-runs/METHODOLOGY.md`), sensor readings 14/16/17, STATUS roadmap P1 item 4. Live status: [`docs/internal/STATUS.md`](../../../STATUS.md).

## What this delivers (plain language first)

**For anyone (non-engineer):** the toolkit's grade is deterministic and trustworthy by construction, but it also offers an optional AI "advisory" opinion (a review of writing quality, factual accuracy, and so on). How good is that opinion, and which AI model should you pay for? Today we have suggestive evidence (a frontier model caught a fake legal statute that a cheaper model confidently rubber-stamped), but no measured score. F3 builds a test with known planted problems and an answer key, so we can measure how many real problems each model at each effort level actually catches - turning "Sonnet seemed as good as Opus" into a number, and proving when the cheap option is safe and when it is not.

**For an engineer:** F3 ships (1) a seeded-defect fixture plugin with a documented scoring key (a set of planted qualitative defects - factual errors, inverted rules, cross-reference contradictions, capability overclaims - each with a ground-truth label), and a harness that scores an advisory run against the key for precision/recall per model x effort; and (2) a replication of the same-target model triple (Opus/Sonnet/Haiku at high effort) on a structurally-defective target, to test the single-target "Sonnet matches Opus" parity claim (reading 16) where triage depth actually matters. It changes no check and never touches the verdict.

## 1. Goal

The METHODOLOGY proved the advisory layer's value (reading 8: a high-effort advisory mis-triaged 11 real link defects as false positives, so "verify before calibrate" is law) and its variance (readings 14/16/17: the categorical Haiku-vs-frontier boundary; Sonnet matched Opus on a clean target). But the parity claim has a single-target caveat and the advisory's precision/recall is unmeasured. F3 closes both with a scored fixture and a defect-rich replication, so the dossier's model guidance rests on measurement, not one anecdote.

## 2. Requirements

### R-AQ-1 - a seeded-defect fixture with a scoring key

A fixture plugin (or a curated copy of a real target) MUST carry a documented set of planted qualitative defects spanning the classes the eval runs surfaced (factual/legal error, inverted domain rule, command-vs-skill enumerated-content contradiction, capability overclaim, broken cross-reference) and a scoring key mapping each planted defect to a ground-truth label. The fixture and key MUST be tracked; the key MUST be precise enough that a finding can be auto- or hand-matched to a planted defect.

- **Acceptance:** the fixture exists with N documented planted defects and a key; a reviewer can classify any advisory finding as a true positive (matches a planted defect), false positive (no planted match), or miss (a planted defect not found).

### R-AQ-2 - a precision/recall harness per model x effort

A harness MUST score an advisory run against the key, computing precision (true positives / all findings) and recall (true positives / planted defects) for a given model x effort cell, and record the result in the eval-run record (or a sibling measurement table). It MUST be reproducible (same run, same score) and MUST NOT alter the verdict.

- **Acceptance:** scoring an Opus/high and a Haiku/high run against the same seeded fixture yields a precision/recall pair per cell; the scores are recorded with the run id; the harness makes no change to the deterministic grade.

### R-AQ-3 - replicate the model triple on a structurally-defective target

The R9/R10/R11 triple (Opus/Sonnet/Haiku at high effort, identical prompt) MUST be replicated on a structurally-defective target (a defect-rich plugin where triage DEPTH matters, unlike the clean pm-toolkit the triple first ran on), to test the reading-16 parity claim ("Sonnet/high matched Opus/high"). The result MUST be recorded with the verified-finding union and an explicit statement of whether parity holds on a defect-rich target.

- **Acceptance:** three runs (same target, same prompt, three model tiers) recorded in `eval-runs.md`; the verified-finding union computed; the dossier's parity guidance updated to "holds / does not hold on a defect-rich target," with the single-target caveat resolved or carried forward explicitly.

### R-AQ-4 - findings feed the dossier and the methodology, never the gate

F3's measurements MUST update `token-usage-estimates.md`'s model-guidance and `METHODOLOGY.md` (the precision/recall numbers, the parity verdict). They MUST NOT change any check, severity, or the verdict - the advisory layer stays advisory (the `applyAdvisory` allowlist invariant).

- **Acceptance:** the dossier and methodology carry the measured numbers; `node scripts/check.mjs .` is unchanged; no check module is touched.

## 3. Acceptance criteria (feature-level checklist)

- [ ] A seeded-defect fixture + scoring key spanning the surfaced defect classes is tracked (R-AQ-1).
- [ ] A reproducible precision/recall harness scores a run per model x effort and records it (R-AQ-2).
- [ ] The model triple is replicated on a structurally-defective target; the parity claim is tested and the verdict recorded (R-AQ-3).
- [ ] The dossier and methodology carry the measured numbers; no check or verdict changes (R-AQ-4).
- [ ] `node scripts/check.mjs .` Advanced 0/0; `npm test` green; no em/en dashes; the work is recorded.

## 4. Out of scope

- **A calibration/judge loop** (learned preferences, panels deciding the grade) - explicitly out; the advisory layer never decides the verdict.
- **Auto-dispatching the model runs** - F3 measures; the dispatch mechanics are F2's contract.
- **Changing any deterministic check** - F3 is measurement of the advisory layer only.

See [`IMPL-PLAN.md`](./IMPL-PLAN.md) and PROGRAM-PLAN sec 2 (F3 is supporting work, not in the v1.6.0 cut).
