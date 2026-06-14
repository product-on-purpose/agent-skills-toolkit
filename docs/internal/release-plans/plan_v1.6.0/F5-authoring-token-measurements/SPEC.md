# F5 - authoring token measurements - SPEC

> The feature SPEC for **F5**, a **supporting (CREATE-informing)** effort of the v1.6.0 program. F5 fills the token-usage dossier's last unmeasured range: it measures real `askit-build-*` authoring runs and moves the authoring rows in `docs/reference/token-usage-estimates.md` from "not yet measured" to MEASURED. Not in the v1.6.0 user-facing cut; lands continuously (PROGRAM-PLAN sec 2).
> Created 2026-06-13. Owner: maintainer. Source of truth: `docs/reference/token-usage-estimates.md` (the "not yet measured" authoring note), the eval-run record practice. Live status: [`docs/internal/STATUS.md`](../../../STATUS.md).

## What this delivers (plain language first)

**For anyone (non-engineer):** the toolkit can tell you roughly how much an AI grading or review run costs, because we measured real ones. The one thing we have not yet measured is how much it costs to *author* a component (use one of the `build-*` skills to draft a skill, a subagent, an MCP wiring). The dossier honestly says those numbers are "not yet measured." F5 runs a representative set of authoring tasks, records what they actually cost, and replaces the placeholder with real numbers - so someone planning a build knows the budget.

**For an engineer:** F5 runs a representative sample of `askit-build-*` authorings across model x effort cells, records them in the eval-run record with `scope: authoring`, and moves the dossier's authoring rows out of "not yet measured" with cited runs. The deterministic rows stay at 0 (unchanged). It changes no code and no check.

## 1. Goal

The dossier (`token-usage-estimates.md`) is measured for the deterministic core (0 tokens, by construction) and the advisory layer (33k-103k, measured across two batches), but its authoring ranges are explicitly provisional ("The authoring ranges (`askit-build-*`) are not yet measured. Filling them is an active task."). F5 fills them with real runs, completing the dossier's honesty: every range is either measured or marked provisional with a reason.

## 2. Requirements

### R-AUTH-1 - measure a representative set of authoring runs

A representative sample of `askit-build-*` authorings MUST be run and measured: at minimum a small bounded component (e.g. a simple hook or settings file), a mid component (a skill), and a larger/complex component (an MCP wiring or a multi-section skill), across at least two model x effort cells, with revision rounds noted (since revisions dominate authoring cost).

- **Acceptance:** at least three authoring runs across component sizes and two model x effort cells are measured (tokens, wall-clock, revision rounds).

### R-AUTH-2 - record into the eval-run record with scope=authoring

Each authoring run MUST be recorded in `docs/internal/eval-runs/eval-runs.md` using the existing schema with `scope: authoring` (the record schema already carries scope), with a pointer to the output and the component built.

- **Acceptance:** the record carries the authoring rows with `scope: authoring`, model, effort, tokens, wall-clock, and an output pointer.

### R-AUTH-3 - move the dossier authoring rows to MEASURED

`docs/reference/token-usage-estimates.md`'s authoring rows MUST move from "not yet measured" to MEASURED, marked **MEASURED** and citing the runs, with a budget range and a ceiling (mirroring how the advisory rows were filled). The deterministic rows MUST stay at 0.

- **Acceptance:** the dossier's "Authoring ranges are not yet measured" note is replaced by a measured range citing the F5 runs; the "How to estimate your run" authoring bullet (item 3) gets a concrete per-component budget; the deterministic 0 rows are unchanged.

## 3. Acceptance criteria (feature-level checklist)

- [ ] At least three authoring runs across component sizes and two model x effort cells are measured (R-AUTH-1).
- [ ] The runs are recorded in `eval-runs.md` with `scope: authoring` (R-AUTH-2).
- [ ] The dossier authoring rows are MEASURED with cited runs and a budget range + ceiling; deterministic rows stay at 0 (R-AUTH-3).
- [ ] `node scripts/check.mjs .` Advanced 0/0; `npm test` green; no em/en dashes; the work is recorded.

## 4. Out of scope

- **Changing any `askit-build-*` skill** - F5 measures them as they are; it does not modify the builders.
- **Authoring-output QUALITY measurement** (an eval-harness over what the builders produce, the backlog E7 "borrow skill-creator's rigor" idea) - that is a separate Create-pillar effort; F5 measures cost, not quality.
- **Any code or check change** - F5 is measurement and a doc update.

See [`IMPL-PLAN.md`](./IMPL-PLAN.md) and PROGRAM-PLAN sec 2 (F5 is supporting work, not in the v1.6.0 cut).
