# 0044 - One post-resolution Standard ceiling, config provenance, and the deliberate reversal of the published-verdict guarantee

## TL;DR
- **Decision:** three mechanisms become one. (1) ADR 0027's `since` downgrade and ADR 0041's `migration` cap are replaced by a **single severity ceiling applied LAST inside `resolveFindings`**, computed from `(pin, since, migration.until)` and compared by severity RANK. A check now emits its **target** severity always and encodes no migration state itself. (2) Every resolved config setting carries **who chose it** - `grader`, `subject`, or `default` - because the trust step below cannot exist without that distinction. (3) In `published-verdict` mode a **subject-owned setting can no longer weaken an objective or vendor-cited finding**; it can strengthen one, and grader-owned settings can do either.
- **Why:** the repository had three version-gating mechanisms and only one read the pin. The `since` downgrade ran as a **pre-pass**, before configuration resolved, so a consumer's own `rules.X = "error"` simply beat it (E26). The `migration` cap was **unconditional**, so it could never graduate: removing a ceiling cannot promote anything, which is why ADR 0041's scheduled `S4` graduation would have fired in name only. And `U13`'s graduation lived in a hand-edited constant whose own comment conceded the gap - a promise kept by someone remembering, in two files, with no test that failed if they did not.
- **This ADR reverses a guarantee this codebase published**, and that reversal is the decision, not a side effect. See "The reversal" below.
- **Status:** Accepted.

- **Date:** 2026-08-13
- **Deciders:** maintainer (jprisant), with Claude (Opus 5)

## Builds on
- ADR 0027 (Standard versioning and compatibility policy) - established that a plugin is graded against the ruleset it adopted, and the `meta.since` burndown that expressed it. This ADR **supersedes the ordering half** of that decision: the policy is unchanged, the point in the pipeline where it applies moves from before configuration to after it. Its back-compat rules survive intact - no pin, a garbage pin, and the `0.x` sentinel all still grade at full strength.
- ADR 0035 (`U13` skill-registration) and ADR 0041 (warn-first string-shaped chain declarations) - the two graduations this mechanism makes deliverable. ADR 0041 is amended in place: its own mechanism could not have graduated anything.
- ADR 0031 (`plain-plugin` profile calibration) - the counterexample that killed the first version of the trust floor, and the reason provenance rather than exemption is the answer.
- ADR 0034 (rooted-per-member marketplace evaluation) - why the marketplace scope needs no ownership rule of its own: each member is graded through `runGate` rooted at that member's own directory, so a member's config is that member's **subject-owned** config. Grading a catalogue does not make the grader the owner of a member's file.
- **E26** (`enhancements.md`) - filed 2026-08-11 from the v1.10.1 round-2 review, naming `U13` as its live instance. The first draft of the v1.13.0 plan designed around this hole without knowing the entry existed.
- **E38** - the published-verdict false-green, found by the pre-implementation review of that same plan.

## Context and problem statement

ADR 0027 promised that a plugin is graded against the ruleset it adopted. The promise was broken in two directions at once.

**For a check that is TIGHTENED**, the only mechanism was a human editing a constant, which takes every consumer at the same moment regardless of what any of them pinned. ADR 0041 tried to do better with a per-finding cap, but the cap was a ceiling at `warn` over a finding the check emitted as `warn`, so lifting it at Standard 0.13 would have produced a warning. The graduation was inert by construction and no implementation of it could have been correct.

**For a check that is merely INTRODUCED**, the pin downgrade ran before `resolveFindings`, so it was overridable by the very configuration it was supposed to outrank. A consumer writing `rules.U13 = "error"` at pin 0.11 took a gate-failing error from a check that did not exist at its pin. That is a verdict moving with no pin change - precisely what ADR 0027 forbids.

Both are the same defect wearing different clothes: **a ceiling applied at the wrong point in the resolution order.**

A third problem sat beside them. `published-verdict` mode exists to publish a verdict *about* a subject, and `resolve-config.mjs` clamped only `off` and suppressed findings, only up to `warn`. Once `U13` graduated, a subject could write `rules.U13 = "warn"` and publish green. Before this release that setting is a no-op, because `U13` already emitted `warn` - so deferring the fix would have **shipped** two bypassable gate-failing requirements that do not exist today.

## Decision drivers

- A graduation must be **data the tooling enforces**, not a constant someone remembers to edit.
- A consumer's own configuration must not be able to overrule the contract they pinned, in either direction.
- The fix for the published-verdict hole must not disturb `plain-plugin`, the calibration this project relies on for honest third-party grading (ADR 0031).
- Nothing may move **red-ward** for a plugin carrying a valid pin below 0.13, graded without `--strict` and without `published-verdict`.

## Considered options

**Option A - thread `pinned` into `resolveFindings` and make ADR 0041's cap conditional, leaving everything else alone.** Rejected in one line by the pre-implementation review: *a cap is a ceiling, and removing a ceiling cannot promote anything*. `chain-contract.mjs` emitted `WARN` on both string-derived branches, so `S4` would never have graduated. The plan had specified the right primitive for `U13` (emit the target severity, let a ceiling lower it) and failed to apply it to `S4` three paragraphs later.

**Option B - a blanket floor: "config cannot lower an objective or vendor-cited finding" in published-verdict mode.** Rejected: it restores `U4` to `error` under `plain-plugin`, because `profiles.mjs` deliberately sets `U4: "warn"` per ADR 0031. It would fail plugins that pass today, in the exact mode this project uses for honest third-party grading.

**Option C - exempt profiles from the floor.** Rejected: it hands the bypass straight back. A subject writes `profile: "plain-plugin"` into its own `askit.config.json` and the exemption is self-granted.

**Option D (chosen) - one post-resolution ceiling, plus CONFIG PROVENANCE.** The distinction that survives both counterexamples is not *what* the setting is but **who chose it**. A grader selecting `--profile plain-plugin` is choosing a rubric to publish against; a subject writing the same string into its own file is grading itself. Same value, different owner, different trust.

## Decision outcome

**1. Checks emit their TARGET severity.** No check hand-encodes a migration state.

**2. One ceiling, applied last.** `activeConstraints(pinned, since, migration)` returns the version constraints active for a finding: a `since` constraint caps at `warn` (the check did not exist at your pin), an `until` constraint caps at the finding's own `migration.capAt` (the tightening has not reached your pin). Both can be active simultaneously, which is why the result is an **array** and the reported `due` is the maximum across it - at pin 0.11 a `U13` finding is under both at once, and a singular cause would report it due at 0.12 while it is in fact capped until 0.13. The ceiling never raises, and every comparison is by `SEVERITY_RANK`: lexical `min("error","warn")` is `"error"`, which would invert the ceiling into a floor.

**3. `since` governs an INTRODUCTION; `until` governs a TIGHTENING.** Two inputs to one ceiling, not two mechanisms. A new check needs no migration metadata **only because the ceiling now runs after overrides**; under the old ordering that claim was false, which is exactly how the first draft of this design got `U14` wrong.

**4. A new or tightened SUBRULE under an existing reqId needs finding-level `migration` metadata.** `meta.since` describes when the *check* appeared and says nothing about when a rule inside it did, so a subrule inherits its reqId's `since` and would otherwise get no migration window at all.

**5. Config provenance.** Every setting is `{ value, origin }`. `grader` is anything the caller supplied as an option; `subject` is anything read from the target's own `askit.config.json`, including its `profile`; `default` is a third category rather than an owner, because the trust step only ever acts on a setting that **lowers** a finding and a default lowers nothing. A subject value that fails validation keeps the default's origin - it is not the value in force. Suppression origin is stamped **on the entry at load time**, because `matchSuppression` returns the config entry itself and nothing downstream can recover the owner after matching.

**6. The trust step.** In `published-verdict` mode, for `objective` and `vendor-cited` findings only, the resolver computes the **trusted resolution** - the same precedence with every subject-owned setting absent - and takes it only when the subject's own result ranks **lower**. It is RAISE-ONLY. Severity and suppression are decided **independently**, because a gate requires `error` AND `!suppressed`: a step that raised only severity would leave a subject-owned waiver intact and still publish green. House provenance is never touched.

**7. The rank guard is load-bearing.** A subject writing `rules.U7 = "error"` is being *stricter about itself*. An unconditional recomputation drops it back to `warn`, turning a deliberately failing published verdict green **by way of the mechanism built to stop verdicts being turned green**.

**8. Roll back to the TRUSTED RESOLUTION, not to the declared severity.** With a grader-owned `--profile plain-plugin` (which resolves `U4` to `warn`) beneath a subject-owned `rules.U4 = "off"`, an atomic reset to the declared severity yields `error` - discarding the grader's own deliberate `warn`.

### The reversal

`resolve-config.mjs` stated: *"the clamp only ever raises off->warn, never to error, so turning the mode on can never flip a passing gate to failing."* **In `published-verdict` mode it now can**, for a subject-owned reduction of an objective or vendor-cited finding.

This is ratified as a decision, not recorded as a consequence. A guarantee that protects the subject is the wrong guarantee in the one mode built to publish a verdict *about* the subject. The guarantee was stated in five places and all five move together; a fix that resolved only inside this repository's own source would leave the surface other people actually read.

Local mode is untouched. A subject's own configuration remains authoritative about its own repository.

## Consequences

- **`ceiling` is a new public field**, always present, `null` whenever no constraint **binds**. Binding-only rather than version-active: where config has already lowered a finding, a constraint changes nothing, and reporting it would tell every debt consumer the pin is holding back a finding the unchanged config keeps a warning either way. **A version condition that changes no outcome is not debt.**
- **The legacy `--json` fields are specified independently, not as a triple.** `downgraded` follows binding (it has always meant "an applied downgrade"); `pinned` is emitted whenever a constraint binds; `since` is emitted **only when an introduction participates**, because a tightening does not change when a check was introduced. Treating them atomically is self-contradictory for an `until`-only ceiling.
- **Standard debt is redefined** as findings held below their severity by a binding introduction **or** tightening ceiling. Both renderers' prose said "postdate the member's pin", which becomes false the moment debt includes tightenings.
- **`dispositions` becomes an ORDERED, first-match partition that sums to the finding count.** The buckets previously overlapped - a live non-house error reduced by config was in both `realIssues` and `profileConformance` - so "the buckets sum" was never true of the old code either, which is what every consumer assumed they could do. `profileConformance` and `warns` both **shrink**. This is a public meaning change.
- **`profileConformance` counts reductions only**, via a returned `configReduced` field. Keying off `downgradedFrom != null` also caught ceiling-lowered findings and subject *increases*.
- **`clampNotice` is deprecated for one minor, not deleted**, and populated only where the old clamp would have fired AND the result really is `warn` - the set whose old semantics it can still state truthfully. `trustNotice` is additive and set on every trust action. `dispositions.trustActions` restores the aggregate signal, declared ORTHOGONAL to the partition because one finding can both be raised and have its suppression cleared.
- **An unpinned plugin has no migration window.** The cap used to be unconditional, so a plugin that never declared which contract it adopted silently received a window sized for plugins that had. This is red-ward and deliberate.
- **`applyStandardDowngrade` is deleted.** It also rewrote `severity` in place, so a held-back finding no longer knew what its check had emitted - which is exactly what a check needs to keep once it emits its target severity.

## Implementation sites
- `scripts/lib/standard-ceiling.mjs` - **new leaf module**: `activeConstraints`, `lowerSeverity`, `latestDue`, `SEVERITY_RANK`. Imports only version arithmetic, so `resolve-config.mjs` can use it without pulling the check registry into its import graph.
- `scripts/lib/resolve-config.mjs` - `resolveFindings` gains the four ordered steps and the `pinned` / `sinceByReq` parameters; returns `ceiling`, `configReduced`, `trustNotice` and `trust`. Its header comment is one of the five public surfaces stating the reversed guarantee.
- `scripts/lib/config.mjs` - `ORIGIN`, `withGraderOptions`, `configFrom`, `publicConfig`. Ownership parity is structural: one merge function rather than four hand-rolled spreads.
- `scripts/lib/standard-gate.mjs` - keeps `SINCE_BY_REQ` only; the pre-pass is gone.
- `scripts/check.mjs` - `standardDebtLine` and `ceilingAnnotation` read `ceiling`; `--strict` passes `pinned` as undefined so both causes go inert together with no second flag to keep in sync.
- `scripts/evaluate.mjs` - `dispositions` is the ordered partition plus `trustActions`.
- `scripts/lib/marketplace/evaluate-marketplace.mjs` - per-member `standardDebt` reads `ceiling`.
- `scripts/lib/report-render.mjs` - the Markdown and HTML definitions of Standard debt.
- `tests/unit/standard-ceiling.test.mjs`, `tests/unit/config-provenance.test.mjs`, `tests/unit/dispositions.test.mjs` - new coverage for the ceiling primitive, ownership, and the partition.
- `tests/unit/config.test.mjs` - the clamp contract tests are **rewritten rather than deleted**, so the reversal is visible in the diff instead of being a test that quietly stopped existing.

Grep anchor: `activeConstraints` in `scripts/lib/standard-ceiling.mjs`, and `withGraderOptions` in `scripts/lib/config.mjs`.
