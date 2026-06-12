# 0034 - Resolve gate config (profiles, mode) in component scope

## TL;DR
- **Decision:** `evaluate.mjs` component scope (a single skill directory with `SKILL.md` and no `library.json`) now runs the SAME config resolution as plugin scope: `loadConfig(target)`, then the CLI `--mode` / `--profile` overrides, then `resolveFindings()` over the component findings. The component report records `profile` and `mode` like the plugin report, and its findings carry `effectiveSeverity` / `provenance`. Previously `evaluateComponent()` never saw the options bag at all, so `--profile plain-plugin` on a third-party single skill was accepted by the CLI and then silently dropped - the skill was still held to the house checks (U5), and `report.profile` was `undefined`. Spine stays **29**, Standard stays **0.11**; the default component verdict is unchanged (the default profile resolves to `askit-library`, the identity ladder).
- **Why:** Eval-run sensor reading 1 (`docs/internal/eval-runs/eval-runs.md`, batch 2026-06-10): grading `anthropics/skills` single skills with `--profile plain-plugin` returned `profile: undefined` and a house U5 warn anyway. A silently-ignored flag is the worst of the three possible behaviors - the user believes they graded portably and did not. The whole point of `--profile` (corpus-run finding A-1, shipped v1.5.0) is grading targets you do not own without writing config into their tree; a third-party SINGLE SKILL is squarely that use case.
- **Status:** Accepted.

- **Date:** 2026-06-12
- **Deciders:** maintainer (jprisant), with Claude (Fable 5)

## Builds on
- The F3 gate-config layer (ADR-adjacent, PR #108: profiles, `resolveFindings`, provenance, the dispositions split) - this ADR extends its reach to component scope, changing no profile semantics.
- ADR 0029 (reclassify U2/U5 as house provenance) - which made `plain-plugin` drop U5; component scope now actually honors that for single skills.
- The eval-run record (`docs/internal/eval-runs/eval-runs.md`), sensor reading 1 - the observed defect and its disposition.

## Context and problem statement
`evaluate()` dispatches on scope: a `SKILL.md`-only directory goes to `evaluateComponent(target)` (graded by rule, no tier), anything plugin-shaped goes through the full F1 + F3 pipeline (standard downgrade, config load, CLI overrides, finding resolution). The component branch predates the F3 gate-config layer and was never wired to it: the CLI validated `--profile` (unknown names exit 2) and then component scope ignored the value. The failure was silent - no warning, no `profile` key, house findings intact.

## Decision drivers
- **Silent acceptance is the worst option.** Apply or reject are both defensible; ignoring while appearing to accept is not.
- **The use case is real and recorded:** three of the nine recorded eval runs (R1, R3, R5) graded third-party single skills; two were run with `--profile plain-plugin` that did nothing.
- **Symmetry over special-casing:** plugin and component scope should mean the same thing by `--profile`; one resolution path, one precedence rule (file config, then CLI override, per-rule override wins).
- **Default stability:** with no flag and no config the resolved profile is `askit-library` (identity), so existing component verdicts cannot move.

## Considered options
1. **Apply profiles in component scope (chosen).** Thread the options bag into `evaluateComponent()` and run `loadConfig` + `resolveFindings` exactly as plugin scope does. Smallest honest fix; reuses tested machinery; gives the component report the same `profile` / `mode` provenance the plugin report has.
2. **Reject `--profile` in component scope (exit 2).** Honest but hostile: it pushes the user grading one third-party skill to wrap it in a fake plugin to get portable grading. Also asymmetric - `--mode` would have needed the same rejection.
3. **Leave as-is, document the limitation.** Rejected outright: documents a trap instead of removing it.

## Decision outcome
Option 1. `scripts/evaluate.mjs`: `evaluateComponent(target, opts)` resolves `{ ...config, mode?, profile? }` and returns `{ ...baseReport, profile, mode }` over resolved findings. Deliberately NOT added: the `dispositions` split and the standard downgrade in component scope - the first is a report-shape change with renderer implications worth its own pass if wanted, the second needs a declared standard that only `library.json` carries.

**Review-driven refinement (Codex adversarial review, round 1):** the first cut rooted the finding paths at the skill directory's PARENT (`ctx.root = path.dirname(target)`, files like `vague/SKILL.md`) while loading config from the skill directory - so a file-scoped suppression glob (`file: "SKILL.md"`) could never match a component finding and the suppressed error still failed the gate exit. Fixed by making the skill directory the ONE root for both the findings and the config (component finding files are now `SKILL.md`-relative, mirroring plugin scope where files are root-relative). The reviewer's broader suggestion - resolving config from the nearest ENCLOSING plugin root when a skill sits inside one - was DECLINED for now: it would silently change which config governs a toolkit-internal component run and is a real semantic question (whose waivers apply when grading one skill of someone else's plugin?) worth its own decision if a use case arrives; recorded, not dropped.

Tests: +6 (the vague anti-fixture discriminates the profile path: U5 warn under the default ladder, `off` under `plain-plugin`, CLI JSON threads the flag with exit 0; `mode` threading and its `local` default; a new `anti/component-config/linkrot` fixture proves a file-scoped suppression in a skill-dir config waives both the error count and the CLI gate exit), 401 total, gate Advanced 0/0.

## Consequences
- A third-party single skill graded with `--profile plain-plugin` now gets exactly the portable subset, and the report says so (`profile: "plain-plugin"`).
- Component findings now carry `effectiveSeverity` / `provenance` in `--json` output (additive; the terminal renderer already resolved through `effSev`).
- An `askit.config.json` placed in a skill directory is now honored in component scope (same semantics as a plugin root). This is symmetry, not a new feature; it was unreachable before.
- `check.mjs` remains plugin-scope only (it grades a bare skill directory as an empty plugin root) - that is a separate recorded gap (sensor reading 3's neighbor) and is out of scope here; `evaluate.mjs` is the documented component entry point.
