---
title: "Program risk register - the askit uplift program"
description: "Ranked risks across the four-release askit uplift program, each with severity, mitigation named in the plan, early-warning trigger, owner, and status"
status: draft
last-updated: "2026-07-06"
---

# Program risk register

This register tracks the risks across the four-release askit uplift program (v1.7.0 through v1.10.0) planned 2026-07-06. It operationalizes the program packet in this folder (`docs/internal/execution/`) and does not restate scope, sequencing, or decision rationale - those live in the execution plan and the packet decision register. Risks are ranked by combined impact and likelihood, most severe first. This is a living document: retire or downgrade a risk when a landing closes it, and add any new risk a landing surfaces, in the same session as the change.

## What this delivers and why it matters (plain language)

A program that runs across four releases and touches a live, public tool has more ways to go wrong than any single release does. This page is the program's honest list of those ways, written down before they happen, each paired with the specific thing we will do to prevent or catch it. For a non-engineer, the headline is simple: the biggest danger is not a coding bug, it is a sister project (a separate maintainer effort in the neighbouring `agent-plugins` repo) rebuilding shared plumbing underneath us while we work, and the second is biting off four releases of ambition and burning out before any of it ships. Both have concrete, named guardrails below. Every risk names who watches it (the orchestrator that runs the work, or the human maintainer) and the early signal that means "look now". Nothing here is theoretical hand-waving; each mitigation points at a real step in the plan.

## How to read this register

- **Severity**: impact x likelihood, assessed as of 2026-07-06. Re-assess when the trigger fires, not on a schedule.
- **Owner**: who acts when the trigger fires. Orchestrator means the agentic executor (Fable) acting under the execution plan; Maintainer means a human decision or go is required.
- **Trigger / early-warning signal**: the observable condition that means the risk needs a fresh look.
- **Status**: open for every risk at program start; flips to mitigated, retired, or realized as the program runs.

## Summary

| ID | Risk | Severity | Owner | Status |
|---|---|---|---|---|
| R-1 | Cross-program collision: agent-plugins PR-C (askit re-adopt) restructures scripts/ mid-program | HIGH | Orchestrator, Maintainer | open |
| R-2 | Scope and burnout across four releases | MEDIUM-HIGH | Maintainer, Orchestrator | open |
| R-3 | Marketplace-scope rework if the checker later relocates | MEDIUM | Orchestrator | open |
| R-4 | GUI studio slice scope creep | MEDIUM | Maintainer | open |
| R-5 | Renderer factoring regression during the 933-line split | MEDIUM | Orchestrator | open |
| R-6 | Advisory measurement validity read as timeless | MEDIUM | Orchestrator | open |
| R-7 | Codex reviewer unreliability on this Windows setup | LOW-MEDIUM | Orchestrator | open |
| R-8 | Memory and STATUS drift across parallel maintainer sessions | LOW-MEDIUM | Maintainer, Orchestrator | open |
| R-9 | README and badge drift recurrence | LOW | Orchestrator | open |
| R-10 | Supply-chain exposure on a public repo | LOW | Maintainer | open |
| R-11 | Windows path traps (backslash empty-dir grade, CRLF churn) | LOW | Orchestrator | open |

## Risk detail

### R-1: Cross-program collision (agent-plugins standards program fires PR-C mid-program)

A separate maintainer program in `agent-plugins` (its `docs/internal/execution/`) may relocate STANDARD.md and the checker (`scripts/check.mjs`, `scripts/lib/`, `scripts/checks/`, `scripts/generators/`, `tier-report.mjs`) out of askit into `agent-plugins/standards/`, and its "PR-C askit re-adopt" package would repoint askit at the relocated runner and delete askit's local copies. If that fires while this program is mid-flight - especially during Release 3 (v1.9.0, marketplace scope), which factors and extends the checker - it restructures `scripts/` underneath in-flight branches and invalidates path assumptions across every open worktree.

- **Description**: the two programs share the exact files this program edits most. A relocation landing mid-program is a merge-base earthquake, not a routine conflict.
- **Mitigation**: four named guards. (1) A STATUS.md dependency note is a Release 1 H1 (hygiene batch) item, recording the live PR-C status and the packing-list surface so every session sees it. (2) The staleness/collision check opens every session (`git fetch origin`, compare `main` vs `origin/main` in both this repo and a read-only `gh api` glance at the agent-plugins program's execution folder). (3) A stop-and-reconcile protocol: if PR-C lands or is imminent, this program halts new engine-adjacent work and reconciles before proceeding. (4) The relocation addendum in this packet stays current, documenting the packing-list delta so re-adoption is a known, small diff rather than a discovery exercise. Per the maintainer's hard boundary ruling, this program writes to no other repo; the agent-plugins re-pin at each release is staged as ready-to-apply instructions only, so the collision surface is one-directional (they can move files under us; we never move theirs).
- **Trigger / early-warning signal**: the session-open collision check finds a new commit under `agent-plugins/docs/internal/execution/` naming PR-C, or a relocation branch, or STANDARD.md moved under `standards/`; or a read-only `gh api` call shows the agent-plugins standards program has entered its LAND phase.
- **Owner**: Orchestrator (detection and halt), Maintainer (reconciliation go). **Status**: open.

### R-2: Scope and burnout across four releases

The program spans four releases and the GUI thin slice - the repo's historical R6-scale ambition risk. A four-release commitment invites a mid-program collapse where none of it ships cleanly because everything was half-built at once.

- **Description**: ambition compounded across v1.7.0 through v1.10.0 plus a studio slice risks a stall with nothing landed.
- **Mitigation**: every release is independently shippable and independently valuable; stopping after any release leaves a complete, coherent product (v1.7.0 "trust and craft" alone is a shippable improvement). The stretch riders - E4 (SARIF output) and E9 (provenance output contract) in Release 4 - are explicitly droppable and marked as such in the execution plan, so the program degrades gracefully rather than failing whole. Release boundaries are the natural stop points; the plan sequences so no release depends on a later release existing.
- **Trigger / early-warning signal**: a release slips its intended sequence position while a later release's work has already started, or two releases are simultaneously mid-build with neither near a cut.
- **Owner**: Maintainer (call to stop or continue at each release boundary), Orchestrator (surfacing the signal). **Status**: open.

### R-3: Marketplace-scope rework if the checker later relocates

Release 3 (v1.9.0) builds the headline marketplace-scope evaluation as new engine-adjacent code. If the agent-plugins standards program later relocates the checker (R-1's underlying event), marketplace-scope code written with tight coupling to the current `scripts/lib/` layout would need rework at re-adoption.

- **Description**: new evaluation code risks being welded to a soon-to-move engine.
- **Mitigation**: build the marketplace-scope module with a separable module home and minimal `scripts/lib/` coupling (import surface kept small and explicit, per the maintainer's ruling 4 that new engine-adjacent code be cleanly separable). The relocation addendum records the packing-list delta for the new module so a future re-adoption knows exactly what moves. This is the same separability discipline that makes R-1's stop-and-reconcile cheap.
- **Trigger / early-warning signal**: the marketplace-scope module grows more than a documented handful of imports from `scripts/lib/`, or references checker internals not on the addendum packing list.
- **Owner**: Orchestrator. **Status**: open.

### R-4: GUI studio slice scope creep

Release 4 (v1.10.0) includes a read-only GUI studio slice. The full studio design is a product vision; a read-only visualization slice can quietly accrete editing, running, or grading verbs and become an unbounded build.

- **Description**: "studio" is an aspirational surface; the slice is deliberately thin and read-only.
- **Mitigation**: the read-only non-goals list is normative in the execution plan - the slice may visualize checker output and library structure and nothing more. Any verb beyond visualize (edit, run a grade, mutate config, trigger a release) requires a new maintainer decision recorded in the packet decision register; the orchestrator cannot self-authorize it.
- **Trigger / early-warning signal**: a GUI task description contains a mutating verb, or the slice proposes to add gate or scoring logic of its own. (Running the existing read-only entry points - `computeTierReport` / `evaluate` - in-process against the chosen target is the DESIGNED behavior per OR-5 (GUI slice scope) and the R4 plan, not a creep signal; the red flags are new logic and mutation.)
- **Owner**: Maintainer (any scope expansion is a decision). **Status**: open.

### R-5: Renderer factoring regression during the 933-line split

Release 3 (v1.9.0) splits the 933-line `report-render.mjs` while marketplace scope adds a report surface. A refactor of the report renderer risks silently changing rendered output (whitespace, ordering, escaping) that the 5 report types depend on.

- **Description**: a large single-file renderer split is a classic silent-diff hazard.
- **Mitigation**: golden snapshots are regenerated with additive-only diff verification - the split must produce byte-identical output for existing report types, and any diff must be provably additive (new marketplace surface only, no change to conformance/migration/release/review/behavioral output). The 4-lens Claude adversarial panel runs its determinism lens on the split PR specifically. Snapshots regenerate via `UPDATE_SNAPSHOTS=1` only after the additive-only property is confirmed by inspection, never blindly.
- **Trigger / early-warning signal**: a golden snapshot diff on the split PR touches an existing report type's output, or the determinism lens flags non-reproducible rendering.
- **Owner**: Orchestrator. **Status**: open.

### R-6: Advisory measurement validity read as timeless

Release 2 (v1.8.0) ships F3 (advisory quality measurement) and F5 (authoring token measurements). These numbers are model-version-dependent and effort-dependent; a reader could treat a measured range as a permanent property of the tool rather than a snapshot taken on a specific model on a specific date.

- **Description**: advisory and token figures are measurements-on-a-date, not constants. The eval-run practice already learned this (the token dossier labels ranges as measured, not guaranteed).
- **Mitigation**: every recorded run carries a model id, a date, and an effort level in its record schema (the existing `docs/internal/eval-runs/` convention, extended by F3). The dossier and any published range are labelled measured-on-date with the model named inline, never as a bare number. F3's SPEC (see below) already scopes this; the delta here is enforcing the label at every surface F3 and F5 write.
- **Mitigation source**: F3 (advisory quality measurement) SPEC at `docs/internal/release-plans/plan_v1.6.0/F3-advisory-quality/`; F5 (authoring token measurements) SPEC at `docs/internal/release-plans/plan_v1.6.0/F5-authoring-token-measurements/`.
- **Trigger / early-warning signal**: a recorded run lands without a model id, date, or effort field; or a published range appears without its measured-on-date label.
- **Owner**: Orchestrator. **Status**: open.

### R-7: Codex reviewer unreliability on this Windows setup

Codex review is unreliable on this Windows environment (documented across prior sessions). Depending on it as a merge gate would stall the program on a flaky tool.

- **Description**: Codex review is opportunistic value, not a dependable gate here.
- **Mitigation**: the Claude 4-lens adversarial panel (false-PASS, false-FAIL, determinism, contract-fidelity) is the primary and sufficient merge gate for every substantive PR. Codex review is used opportunistically only, is liveness-checked before each use, and is never blocked on - a Codex non-response never holds a merge. This inverts the sibling program's Codex-required gate precisely because the Windows reliability profile differs.
- **Trigger / early-warning signal**: a merge is proposed to wait on a Codex result, or Codex is invoked without a prior liveness check.
- **Owner**: Orchestrator. **Status**: open.

### R-8: Memory and STATUS drift across parallel maintainer sessions

Parallel maintainer sessions can leave the living docs and auto-memory out of sync with reality - the 2026-06-25 unlogged-session failure mode, where work happened but no session log or STATUS update captured it, and the next session re-derived stale context.

- **Description**: undocumented sessions rot the shared context the next session trusts.
- **Mitigation**: the living-docs protocol requires every landing to update STATUS.md, the affected packet docs, and this register in the same session as the change. Every session closes with a wrap-session log carrying a verbose continuation prompt (`jp-wrap-session`). The packet records the stalled-thread design durably so a mid-flight landing is captured as an explicit blocker, never left implicit. Parallel builds use git worktrees to keep session state isolated.
- **Trigger / early-warning signal**: a session opens and finds STATUS.md or this register contradicts live `git log`, or a prior session left no wrap log while `main` advanced.
- **Owner**: Maintainer (session discipline), Orchestrator (detection at session open). **Status**: open.

### R-9: README and badge drift recurrence

README stats (skill counts, check counts, test counts, tier) and status badges drift from reality as the program ships four releases of change - a recurring low-grade hygiene failure.

- **Description**: hand-maintained README numbers go stale silently across many releases.
- **Mitigation**: Release 1 H1 (hygiene batch) adds an automated README/badge refresh plus a CI assertion that fails the build when the rendered numbers diverge from the generated source of truth, so drift becomes a red gate rather than a slow rot.
- **Trigger / early-warning signal**: the CI assertion fires, or a manual read of the README finds a count that disagrees with `check.mjs` output.
- **Owner**: Orchestrator. **Status**: open.

### R-10: Supply-chain exposure on a public repo

The repo carries a single runtime dependency today, but it is public and shipped to two agent runtimes. A compromised or typo-squatted transitive dependency, or an unpinned action, is a real if low-likelihood exposure.

- **Description**: small dependency surface today, but public reach amplifies any compromise.
- **Mitigation**: the `05-ci-plan.md` hardening set - Dependabot enabled, an `npm audit` (or equivalent) step in CI, and SHA-pinned GitHub Actions - lands as part of the program's CI plan. The single-dep surface keeps the audit cheap; the value is the standing assertion, not a one-time sweep.
- **Trigger / early-warning signal**: Dependabot opens an advisory PR, the audit step reports a new vulnerability, or a new workflow references a floating action tag.
- **Owner**: Maintainer (accepting or updating a flagged dependency). **Status**: open.

### R-11: Windows path traps (backslash empty-dir grade, CRLF churn)

Two recurring Windows traps: a bash for-loop with a backslash path silently grades an empty directory (the checker sees no files and reports a vacuous pass), and generators leave CRLF churn on `.claude-plugin/`, `.codex-plugin/`, INDEX, and `manifest.generated` files. The F2 (eval-run pipeline) runner is especially exposed because it iterates corpus paths.

- **Description**: silent-pass and spurious-diff traps specific to this Git Bash on Windows setup.
- **Mitigation**: forward-slash path normalization is spec'd into the F2 (eval-run pipeline) runner so a corpus iteration cannot silently grade an empty dir (existing SPEC at `docs/internal/release-plans/plan_v1.6.0/F2-eval-run-pipeline/`). The choreography's KEEP-vs-checkout manifest rule tells each session which generated files to `git checkout --` before committing to shed CRLF churn. Normal `git status` discipline at session open surfaces unexpected churn before it enters a commit.
- **Trigger / early-warning signal**: an F2 run reports a suspiciously clean pass on a non-empty corpus target, or `git status` shows CRLF-only diffs on generated files at commit time.
- **Owner**: Orchestrator. **Status**: open.

## Change log

| Date | Change |
|---|---|
| 2026-07-06 | Created. |
