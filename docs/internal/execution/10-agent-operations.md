---
title: "Agent operations - the execution contract"
description: "The operational contract for Fable and subagents during the askit uplift program covering roles, routing, adversarial review, TDD, worktrees, session discipline, stop-and-flag rules, and house rules"
status: draft
last-updated: "2026-07-06"
---

# Agent operations: the execution contract

This document is the operational reference for the agentic execution running the askit uplift program (v1.7.0 through v1.10.0). It covers who does what, how routing decisions are made, how the adversarial review works, and what stops autonomous execution. It does not restate plan rationale or version decisions - those live in the release packets under `docs/internal/release-plans/`.

The hard boundary per maintainer ruling 2 (2026-07-06): this program writes to no other repo. Read-only `gh api` calls to other repos are permitted; cross-repo writes are not. The agent-plugins marketplace re-pin at each release is staged as ready-to-apply instructions in the release packet, never executed.

## What this delivers and why it matters

For a non-engineer: this document is the operating manual for the AI agents running this program. It decides which agent does which kind of work, how much care and cost to spend on each task, what checks must pass before any change lands in the repo, and when to stop and ask a human instead of pressing forward. The discipline here is what makes the program trustworthy - a flag that surfaces a real problem is more valuable than an autonomous run that quietly ships the wrong thing.

For engineers: the contract is binding on Fable (the orchestrator) and all dispatched subagents. Deviations are stop-and-flag events, not judgment calls.

---

## 1. Roles

**Fable (orchestrator)** plans, decomposes work, dispatches subagents, sequences phases, reviews diffs, merges green adversarially-reviewed PRs, cuts releases (bump, tag, GitHub release), and maintains the living packet docs. It does not delegate final judgment: every merge decision and every stop-and-flag call stays with Fable.

**Opus subagents** handle judgment-heavy implementation: craft rubric authoring (SP1 (builder craft pass) through SP4 (Manage gaps)), marketplace-scope core logic (v1.9.0), GUI studio slice (v1.10.0), ADR drafts, and the two correctness-oriented lenses of the adversarial panel on complex diffs.

**Sonnet subagents** handle mechanical volume: test scaffolds from written specs, fixture generation, doc sweeps, corpus grading runs (F2 (eval-run pipeline)), measurement passes (F3 (advisory quality measurement) and F5 (authoring token measurements)), and format conversions.

**Haiku** is never used for veracity-critical work. The recorded confabulation lessons - sensor readings 14, 16, and 17 in `docs/internal/eval-runs/`, including a fabricated statute "VPBA" produced at high effort - make this a hard rule, not a preference. Haiku is acceptable only for pure-mechanical transforms with deterministic verification (reformatting a CSV, applying a substitution whose output is diff-checked before use).

---

## 2. Routing table

| Task archetype | Model | Effort | Notes |
|---|---|---|---|
| Spec or ADR drafting | Opus | high | Rationale must survive adversarial review |
| New check or module implementation | Opus | high | TDD required; RED test first from a real fixture |
| Craft rubric authoring (SP1-SP4) | Opus | high | Output directly affects grading quality |
| Adversarial panel - false-PASS lens | Opus | high | See section 3 |
| Adversarial panel - false-FAIL lens | Opus | high | See section 3 |
| Adversarial panel - determinism lens | Sonnet | medium | See section 3 |
| Adversarial panel - contract-fidelity lens | Sonnet | medium | See section 3 |
| Test scaffolding from a written spec | Sonnet | medium | Spec must exist before dispatch |
| Doc sweep or link fixes | Sonnet | low-medium | Verify no substantive edits are introduced |
| Corpus grading run (F2 runner) | Sonnet | medium | Accuracy verified against known ground-truth per METHODOLOGY.md |
| F3 advisory quality measurement | Sonnet | medium | Advisory output; not gate-critical |
| F5 authoring token measurements | Sonnet | low-medium | Count; do not interpret |
| Pure-mechanical transform with deterministic verify | Haiku | low | Output diff-verified before any downstream use |

---

## 3. The 4-lens adversarial panel

Every substantive merge passes a 4-lens adversarial panel before Fable merges. Each lens is a separate agent prompted explicitly to REFUTE, not to validate. The four lenses run in parallel; Fable collects all four verdicts before merging.

**Lens 1 - false-PASS hunter (Opus, high).** Finds conditions under which the new code would accept something it should reject: a malformed input that passes a check, a suppression that silently waives a real defect, a test fixture that cannot reproduce the failure it claims to guard.

**Lens 2 - false-FAIL hunter (Opus, high).** Finds conditions under which the new code would reject something it should accept: a correct plugin graded down by an edge-case parser bug, a spec-valid name pattern that trips a regex, a real skill silently excluded from the manifest scan.

**Lens 3 - determinism auditor (Sonnet, medium).** Verifies that re-running the check on the same input produces identical output and exit code across runs, environments, and Node versions within the supported range.

**Lens 4 - contract-fidelity auditor (Sonnet, medium).** Verifies that the implementation matches the ADR or SPEC it claims to implement: no undocumented behaviors, no undocumented suppressions, no undocumented deviations from the Standard.

Findings are **resolved** (code or test change lands before merge) or **declined with recorded rationale** (the finding is wrong or out of scope; the specific reason is written into the PR before merge). The hold-positions-under-pushback rule applies here: a finding is not declined because it is inconvenient, only because it is demonstrably wrong, with the reason stated.

---

## 4. TDD protocol

1. Write a RED test from a real fixture or corpus string. Confirm it fails for the right reason - not an import error or setup failure.
2. Write the minimal code to make it GREEN.
3. Run the full suite (`node --test` from repo root). Any unexpected fixture fallout is addressed before proceeding; do not suppress or skip.
4. `UPDATE_SNAPSHOTS=1` is used only when the diff is verified additive: new snapshots only, no deletions that would silently drop coverage.

No check or ADR clause is implemented without at least one RED-first test grounded in a real corpus example. Synthetic fixtures are acceptable for edge cases but must be accompanied by at least one real-corpus anchor. The recorded corpus strings in `docs/internal/eval-runs/` are the canonical fixture source.

---

## 5. Worktree isolation

Parallel builds use git worktrees. The working-main checkout is never used for a feature branch that another session could also be on.

Rules:
- Branch off `origin/main` only, re-verified with `git fetch origin` immediately before branching.
- Each parallel build gets its own named worktree; worktrees are pruned after their PR merges.
- Never switch branches inside a shared checkout.
- The staleness check (section 6) is the entry gate for every session; a session that finds `origin/main` has advanced resolves the delta before starting new work.

---

## 6. Session protocol

**Open.** Every session begins with the staleness/collision check:
1. `git fetch origin`
2. Compare local `main` vs `origin/main`. If `origin/main` is ahead, the live truth is `docs/internal/STATUS.md` and `docs/internal/RELEASE-HISTORY.md` on `origin/main`; read those before touching anything.
3. Confirm no in-flight open PR conflicts with the planned session work.

**Close.** Every session closes with a wrap-session log via `jp-library:jp-wrap-session`, carrying a verbose continuation prompt so the next session can resume without re-deriving context. An open landing left mid-flight is captured as a blocker in the log; it is never left implicit.

**Living documents.** Every landing (merged PR, cut release) updates the affected packet docs in the same session: phase status fields, decision register, release plan, backlog. The packet never lags reality.

---

## 7. Stop-and-flag list

Autonomous execution halts and surfaces the condition to the maintainer the moment any of the following appear. None is a judgment call the orchestrator resolves alone.

| Trigger | Why it stops |
|---|---|
| A red gate (`node --test` fails; gate exits non-zero on the repo itself) | The gate never goes red silently; a regression surfaced mid-program needs a human call |
| The agent-plugins PR-C (askit re-adopt) appearing | Maintainer ruling 4 requires a stop-and-reconcile before this program continues |
| Any write attempt targeting another repo | Hard boundary per ruling 2; not a soft warning |
| Hook-denial pattern (no-dash hook denying on the same file repeatedly) | Signals pasted legacy content or upstream drift requiring a human decision, not a retry loop |
| A review finding demanding a judgment reversal without principled grounds | Hold-positions rule applies; a reversal without grounds is a flag, not a concession |
| A plan assumption found not to match the live tree | Re-derive live; if the derivation changes the plan's shape, stop and surface the delta |
| An allocation collision on an ADR number or version | Re-allocate against the fresh `origin/main` head; if not mechanical, stop |

---

## 8. House rules recap

These rules are always in force across all phases, not phase-dependent.

- **No em-dash or en-dash anywhere.** Use " - " (space hyphen space) or restructure. Enforced by a PreToolUse hook at `~/.claude/hooks/no-em-dashes.py`. Repeated denials on the same file signal a prompt-level issue, not a per-turn retry problem.
- **ADR references carry titles.** "ADR 0034 (component-scope profiles)", never bare "ADR 0034".
- **IDs carry handles on first use.** "SP1 (builder craft pass)", "F2 (eval-run pipeline)", "E11 (dependable eval-run pipeline)", "U13 (skill-registration)". Later mentions in the same document may shorten to the ID plus the handle.
- **Dual-audience on value-bearing artifacts.** Every plan, ADR, and release document includes a plain-language passage for a non-engineer alongside the engineering detail.
- **Decisions in documents, not chat.** Any ruling, decline rationale, or open question settled during a session is written into the packet before the session closes.
- **CHANGELOG completeness in staged re-pin instructions.** The marketplace re-pin instructions staged in each release packet carry a complete registry CHANGELOG entry, backfilling any missing version ranges. This mirrors the real release sequence even though the write is not executed.

---

## 9. Token posture

This program runs ultracode sessions: exhaustive correctness takes priority over token cost. Do not cut corners on adversarial panel effort or TDD coverage to save tokens.

The budgeting reference is `docs/reference/token-usage-estimates.md`. Key calibrations:
- The deterministic core (gate, tier report, renderer) runs zero model tokens.
- Advisory runs range roughly 33k-103k tokens per run; cost is dominated by target size, not model tier.
- Haiku at low effort on behavioral evaluations rubber-stamps findings (sensor reading 14); do not use for quality-sensitive advisory.
- A Sonnet/high panel paired with an Opus/high panel outperforms either alone for complex targets (sensor readings 16-17).

F5 (authoring token measurements) rides SP2 (deepen complex builders). Measurements from that work are recorded per the F5 IMPL-PLAN at `docs/internal/release-plans/plan_v1.6.0/F5-authoring-token-measurements/IMPL-PLAN.md` and folded back into `token-usage-estimates.md` as readings land.

---

## See also

- `docs/internal/release-plans/plan_v1.6.0/F2-eval-run-pipeline/IMPL-PLAN.md` - F2 (eval-run pipeline) implementation plan (v1.7.0 target)
- `docs/internal/release-plans/plan_v1.6.0/F3-advisory-quality/IMPL-PLAN.md` - F3 (advisory quality measurement) implementation plan (v1.8.0 target)
- `docs/internal/release-plans/plan_v1.6.0/F5-authoring-token-measurements/IMPL-PLAN.md` - F5 (authoring token measurements) implementation plan (v1.8.0 target)
- `docs/reference/token-usage-estimates.md` - token budgeting reference, deterministic-core vs model-assisted split
- `docs/internal/eval-runs/METHODOLOGY.md` - observe, verify against ground-truth, calibrate loop
- `docs/internal/STATUS.md` - live program tracker

---

## Change log

| Date | Change |
|---|---|
| 2026-07-06 | Created. |
