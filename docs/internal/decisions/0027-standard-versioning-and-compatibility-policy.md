# 0027 - Standard versioning and compatibility policy (how the Standard itself evolves)

## TL;DR
- **Decision:** Adopt an explicit policy for how the Advanced Skill Library Standard versions itself: a new or tightened tier requirement (a new U#/S#/G#, or a stricter rule on an existing one) ships as a `warn` for one Standard minor version before it becomes a gate-failing `error`, and the gate grades a plugin against the Standard version it pins in `library.json.standard` rather than always against the live spine. A requirement may instead be introduced directly as an `error` only in a MAJOR Standard bump.
- **Why:** Today the gate filters checks by declared tier but never reads `library.json.standard`, so a plugin pinned to an older Standard is silently re-graded against the newest spine. Adding four checks in v0.10 (the 1.1.0 release) as immediate errors means a plugin that was conformant under v0.9 can fail with zero changes to itself. The Standard is positioned as "a downstream contract every conformant plugin must meet," so it needs a stability promise.
- **Status:** Accepted (implemented and shipped in v1.3.0: F1 added `meta.since` to every check, a `standard-version.mjs` / `standard-gate.mjs` pure-arithmetic downgrade pass wired through `check.mjs` / `tier-report.mjs` / `evaluate.mjs`, a `--strict` bypass, and the normative STANDARD.md sec 7.7). The standard-aware gate now reads `library.json.standard` and downgrades a post-pin requirement to `warn`. The recommended option 1 was adopted in full; the per-check `warn`-then-`error` burndown machinery ships but is unexercised (v0.11 was a relaxation, so no live tightening). The toolkit pins the current Standard, so its own gate is unchanged.

- **Status:** Accepted (Proposed 2026-06-03, Accepted 2026-06-06)
- **Date:** 2026-06-03
- **Deciders:** maintainer (jprisant), with Claude (Opus 4.8)

## Builds on
- ADR 0024 (documentation depth and discoverability) - introduced U12 and G8-G10 and took the spine to 30 checks at Standard v0.10, the additive tightening that motivates this policy.
- ADR 0025 (raise the Node baseline) - the most recent Standard-document bump (v0.8 to v0.9), which changed an optional field's floor and so did not raise this compatibility question; v0.10 is the first release to add hard tier requirements.
- STANDARD.md sec 5/5.1 (the `standard` field "so tooling can validate against the right ruleset") and sec 7.4/7.5 (plugin/component version propagation, which govern a plugin's OWN version, not the Standard's).

## Context and problem statement
The v1.1.0 adversarial review (read-only 4-lens Workflow over `v1.0.0...HEAD`, 2026-06-03) confirmed a contract gap, independently reproduced against source:

1. **The gate ignores the pinned Standard.** `scripts/check.mjs` runs the live `CHECKS` array filtered only by the plugin's declared tier. `library.json.standard` is presence-validated by U1 and otherwise rendered as a display string; no code selects a ruleset from it. A plugin pinning `standard: "0.9"` is graded against the 0.10 spine.
2. **v0.10 tightened the contract as a minor bump.** ADR 0024 added U12 (Bronze) and G8/G9/G10 (Gold), all emitting `error`, each conditional only on the relevant artifact existing. A real Gold plugin with source files and folders but no four-field docblocks and no folder-README inventories was conformant under v0.9 (G1-G7) and fails G8/G9 under v0.10 after a routine `npm update`, with no change to itself.
3. **STANDARD.md has no versioning, stability, deprecation, or breaking-change policy for the Standard itself.** Sections 7.4/7.5 govern a plugin's version derived from its components; nothing covers how the Standard's own requirement set may grow, or what a consumer pinned to an older Standard is promised.

Today the blast radius is bounded: the toolkit is the only plugin that grades against this Standard, it dogfoods its own conventions and passes, and v1.0.0 (Standard 0.9, Gold G1-G7) shipped publicly only hours before v0.10 was authored. But the moment a second library pins an older Standard, silent re-grading becomes a real regression, and the "downstream contract" positioning is undermined.

This ADR does not relitigate whether U12/G8/G9/G10 are the right requirements (ADR 0024 decided that). It decides how the Standard is allowed to add or tighten requirements over time.

## Decision drivers
- The Standard is explicitly positioned as a portable contract other libraries grade against; a contract that silently tightens under consumers is not trustworthy.
- The gate must stay deterministic, synchronous, and model-free (Design Principle 3); whatever the policy is, it has to be enforceable as plain version comparison, not judgment.
- `library.json.standard` already exists and is documented as the field "so tooling can validate against the right ruleset" - the gate should honor that promise rather than contradict it.
- Burndown (warn-then-error) is the established ergonomic for tightening a linter without breaking the world; it matches how the no-dashes hook and the WARN-tier findings already behave.
- Minimize churn for the only current consumer (the toolkit itself), which should keep grading at the newest spine since it authors the Standard.

## Considered options
1. **Warn-for-one-version burndown plus a standard-aware gate.** (recommended) A newly added or tightened tier requirement emits `warn` for the Standard minor version that introduces it, then becomes `error` in the next minor. The gate reads `library.json.standard` and, for a plugin pinned below the current Standard, treats requirements introduced after the pinned version as `warn` (surfaced, not gate-failing). A plugin can opt into the newest spine by bumping its pinned `standard`. The toolkit pins the current Standard, so it grades at full strength.
2. **Tightening is always a MAJOR Standard bump.** Any new/stricter tier requirement forces the Standard's major version up (0.x to 1.0, later 1.x to 2.0), and the gate refuses to grade a plugin whose pinned major is below the spine's until the maintainer re-pins. Simpler to state, but heavy: it makes routine additive checks (the normal way this Standard grows pre-1.0) into major events, and it still needs the gate to read the pinned version.
3. **Do nothing; document that the gate always grades against the newest spine.** Rejected: it is honest but abandons the "validate against the right ruleset" promise in sec 5.1 and makes every future tightening a silent regression for pinned consumers. Acceptable only while the toolkit is the sole grader, which is exactly the window closing.
4. **Freeze the spine at 30 and never tighten again.** Rejected: the Standard is pre-1.0 and explicitly expected to grow; freezing trades a real capability for a compatibility property a versioning policy delivers without the freeze.

## Decision outcome
Recommended: **option 1**, deferred to a dedicated fast-follow PR for maintainer ratification because it changes the public conformance contract and the gate's grading semantics. The implementation sketch:
- Add a `since` (Standard version) annotation to each check's `meta`, defaulting to the Standard version at which the spine was first frozen (0.10 for the four ADR 0024 checks; the pre-existing checks are "0.x baseline").
- The gate compares a plugin's pinned `library.json.standard` to each check's `since`: a check introduced after the pinned version is downgraded to `warn` for that run (still reported, never gate-failing), and a one-minor-version burndown window is documented so the maintainer knows when a `warn` graduates to `error`.
- Add a "Standard versioning and compatibility" section to STANDARD.md (near sec 7.4) stating the burndown rule and the pinned-version grading contract.
- The toolkit continues to pin the current Standard, so its own gate is unchanged (full-strength at 0.10).

Until this lands, the documented current behavior is option 3 (the gate grades at the newest spine), and the v1.1.0 release notes/STATUS record that v0.10 is an additive tightening release.

## Consequences
- **Positive:** the Standard becomes safe to evolve; a pinned consumer is graded on the contract it adopted; the "validate against the right ruleset" promise in sec 5.1 is finally kept; the burndown gives downstream libraries a migration window instead of a hard break.
- **Negative:** the gate gains a small amount of version-comparison logic and every check carries a `since`; the Standard document grows a normative section; there is a transitional window (until this lands) where a pinned-older plugin would be graded at the newest spine.
- **Neutral:** no behavior change for the toolkit itself (it pins the current Standard and grades at full strength); the policy is pure version arithmetic, so it preserves the deterministic, model-free gate contract.

## Note on the v1.1.0 tightening
The same fix PR that records this ADR also promotes the U8 manifest-drift VERSION disagreement from `warn` to `error` (so the portable gate is authoritative for the exact invariant the release tag guard enforces). That is itself a tightening of an existing check. It is folded into the v0.10 / 1.1.0 release deliberately, BEFORE this versioning policy exists, on the same transitional grounds: 1.1.0 is the tightening release, the toolkit is the only graded plugin, and the change does not break the toolkit's own green gate (its manifests are consistent). Once this policy is adopted, further tightenings follow the burndown rule.
