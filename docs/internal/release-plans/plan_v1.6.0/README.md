# plan_v1.6.0 - manifest completeness, made actionable

> The planning packet for the next milestone. **v1.6.0** grows the quality Standard for the first time since the v1.2.0 relaxation - an objective check that catches a plugin silently shipping skills it never registered ([F1](./F1-manifest-completeness/), [ADR 0035](../../decisions/0035-manifest-vs-disk-skill-registration-completeness.md)) - and makes that grade actionable with a per-check report glossary, the missing Bronze reference page, and a phone-legible report ([F4](./F4-report-ux/), backlog E12). Three supporting efforts mature the improve loop and fill the last cost-measurement gap ([F2](./F2-eval-run-pipeline/) E11, [F3](./F3-advisory-quality/), [F5](./F5-authoring-token-measurements/)); they land continuously, not as release gates.
> Created 2026-06-13. Status: **committed and shipping in v1.6.0** - the cut (F1 + F4) is merged to `main`; F2/F3/F5 are continuous supporting work. Source of truth: ADR 0035 (Accepted), the eval-run record + METHODOLOGY (`docs/internal/eval-runs/`), the STATUS prioritized roadmap, backlog E11/E12. Live status: [`docs/internal/STATUS.md`](../../STATUS.md). Baseline: `main` at **v1.5.2**, Gold, 29-check spine, Standard 0.11 (v1.6.0 grew it to 30 / 0.12).

## What this delivers (plain language + engineer)

**Plain language.** A grade is only useful if you can trust it and act on it. v1.6.0 adds a check for a real, common publishing mistake - listing fewer skills in your catalog than you actually shipped, so some are invisible to installers - and then makes the result easy to act on by explaining every check in the report and adding the reference page the foundational checks were missing. The behind-the-scenes work makes the toolkit's own grading routine repeatable, measures how good the optional AI-review opinion is, and fills in the last missing cost estimate.

**Engineer.** v1.6.0 = F1 (`U13` `skill-registration`, spine 29 -> 30, Standard 0.11 -> 0.12, shipping as a burndown `warn`) + F4 (per-check report glossary + `docs/reference/universal-checks.md` + sub-600px responsive). F2/F3/F5 are continuous IMPROVE/CREATE supporting work, documented here for rigor, not in the cut.

## Read order

1. **[`PROGRAM-PLAN.md`](./PROGRAM-PLAN.md)** - the whole program: the goal framed by the Create/Manage/Improve pillars, **the cut (sec 2) and why v1.6.0 = F1 + F4 with F2/F3/F5 continuous**, the per-feature contracts, the sequencing graph, how it executes the recorded decisions, the **SPEC-vs-IMPL reconciliation and cross-dependencies (sec 6)**, release mechanics, risks, and the Definition of Done. **Start here.**
2. [`F1-manifest-completeness/SPEC.md`](./F1-manifest-completeness/SPEC.md) then [`IMPL-PLAN.md`](./F1-manifest-completeness/IMPL-PLAN.md) - the headline check: the registration-source precedence, the bidirectional comparison, the burndown, the Standard sweep.
3. [`F4-report-ux/SPEC.md`](./F4-report-ux/SPEC.md) then [`IMPL-PLAN.md`](./F4-report-ux/IMPL-PLAN.md) - the glossary, the universal-checks page, the sub-600px pass; the F1 cross-dependency.
4. The supporting packets (continuous, not in the cut): [`F2-eval-run-pipeline/`](./F2-eval-run-pipeline/) (E11), [`F3-advisory-quality/`](./F3-advisory-quality/), [`F5-authoring-token-measurements/`](./F5-authoring-token-measurements/).

## Per-feature detail packets

Each feature has a SPEC (the requirement-level contract with testable acceptance criteria and stable `R-` ids) and an IMPL-PLAN (the from-cold, file-by-file execution plan with fixtures, tests, a verification table, and the adversarial-review lenses):

- **[`F1-manifest-completeness/`](./F1-manifest-completeness/)** (v1.6.0, Improve-backbone) - `U13` `skill-registration`: compares the skills a plugin registers (library.json components, else marketplace plugins) against the skill dirs on disk; on-disk-but-unregistered is the headline, registered-but-missing is the reverse. Objective + portable, distinct from `U8`. Spine 29 -> 30, Standard 0.11 -> 0.12, shipping as a `warn` (the burndown's first live exercise). Implements ADR 0035.
- **[`F4-report-ux/`](./F4-report-ux/)** (v1.6.0, Improve/Create-facing) - a consolidated per-check glossary (every check explained, from `REPORT_META`, zero model tokens), the new `docs/reference/universal-checks.md` Bronze reference page, and a `@media (max-width:600px)` block. **Documentation-coupled to F1** (renders the `U13` row, documents `U13`).
- **[`F2-eval-run-pipeline/`](./F2-eval-run-pipeline/)** (continuous, Improve) - E11: a pinned-sha corpus manifest, a deterministic runner, the advisory dispatch contract, and record/aggregate automation. Built right before corpus batch 3.
- **[`F3-advisory-quality/`](./F3-advisory-quality/)** (continuous, Improve) - a seeded-defect fixture + precision/recall harness and a defect-rich replication of the model triple, to test the "Sonnet matches Opus" parity claim.
- **[`F5-authoring-token-measurements/`](./F5-authoring-token-measurements/)** (continuous, Create-informing) - measures `askit-build-*` authoring runs and moves the dossier's authoring rows to MEASURED.

## What this delivers

| Release | Theme | Deliverable |
|---|---|---|
| **v1.6.0** | Standard growth | `U13` catches a plugin shipping skills it never registered (invisible to installers); objective + portable, survives `--profile plain-plugin`; the first Standard growth since `U10` retired, shipping as a burndown `warn` |
| **v1.6.0** | actionable grades | a per-check glossary in every report (every check explained, not only the failing ones) + the missing Bronze reference page (`universal-checks.md`) + a phone-legible report |
| **v1.6.0** | the burndown, proven | the warn-for-one-minor machinery v1.3.0 built runs for the first time; the bump gates nobody |
| **continuous** | a dependable improve loop | a reproducible eval-run pipeline (F2), a measured advisory layer (F3), and the last cost range filled (F5) |

## Key decisions captured here (so the build does not re-litigate them)

- **One release, named continuous supporting work.** v1.6.0 = F1 + F4 (the user-facing pair); F2/F3/F5 are internal infra/measurement that land on their own cadence, not a planned v1.7.0 (PROGRAM-PLAN sec 2).
- **F1 is a spine check, not a side-channel validator (ADR 0035).** Objective + portable + plugin-intrinsic + non-vacuous is the Universal-tier definition; the `config-valid` precedent (plan_v1.3.0 sec 7.2) is correctly applied, not overturned (config-valid was a consumer-config concern and vacuous for the common plugin; `U13` is neither). A non-spine validator would let a plugin shipping invisible skills still reach Gold.
- **The Standard grows now, on purpose.** No third party is known to grade against it yet, so this is the lowest-risk moment to prove responsible growth; the burndown and the pinned-version downgrade cushion the churn twice over.
- **The deterministic gate stays model-free.** F1 is a pure set comparison; F4 is presentation over frozen facts; F2's runner and F3's scorer make no model call (only the advisory dispatch does, and it never moves the verdict).
- **The IMPL-PLAN is canonical where SPEC and IMPL diverge** (PROGRAM-PLAN sec 6): F1 ships bidirectional registration checking and flags the empty-`components` evasion for ratification; the F4 glossary sources from `REPORT_META`, not docblock re-parsing; F1 owns the `U13` `REPORT_META` row to keep its own CI green.

## Relationship to other packets

- Executes [ADR 0035](../../decisions/0035-manifest-vs-disk-skill-registration-completeness.md) (Proposed; the F1 PR ratifies it Accepted, the way ADR 0027 was ratified by v1.3.0 and ADR 0028 by v1.2.0) and is the first release to exercise the burndown that [ADR 0027](../../decisions/0027-standard-versioning-and-compatibility-policy.md) defined and [`plan_v1.3.0`](../plan_v1.3.0/)'s F1 built.
- Sits beside [`plan_v1.3.0/`](../plan_v1.3.0/) (the gate-evolution program whose F2 report renderer F4 now extends, and whose standard-aware gate F1 now exercises) and the eval-run record (`docs/internal/eval-runs/`) whose readings 12/14/16/17 motivate F1/F2/F3.
- Companion working note: the gitignored eval-target anchor list (`_local/notes/eval-target-anchor-list.md`) and the reusable pinned corpus clones (`E:/tmp/eval-deanpeters-pm` @ `70fb6c4` is the F1 target).
- Out of scope (named so the next pass owns them, PROGRAM-PLAN sec 8): the marketplace SCOPE for the gate (P3, the likely next headline), the Gemini emitter, the E4-E10 borrowed checks, the Finding-5 residual, and corpus batch 3.
