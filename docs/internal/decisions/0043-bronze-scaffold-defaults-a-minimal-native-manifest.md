# 0043 - The Bronze scaffold defaults a minimal native manifest; the Standard's own requirement stays open

## TL;DR
- **Decision:** `templates/seed-plugin/` and everything `askit-init-plugin` scaffolds from it now ship a second file alongside `library.json`: a minimal `.claude-plugin/plugin.json` carrying `name`, `version`, `description` and nothing else - no `agent-targets`, `prefix`, `components` index, component-path arrays, or any of the extra fields (`homepage`, `repository`, `keywords`) the fuller Silver-tier spine adds. This is a **tooling default**, scoped to what `askit-init-plugin` writes for a brand-new plugin. Whether the Standard's Bronze tier itself REQUIRES a native manifest is a separate question, and this ADR deliberately leaves it open. One field gets a narrower, deliberate exception: `askit-init-plugin`'s `interview` mode, because it can actually ask a human, additionally asks for an optional `author` and writes a real one (never a placeholder) into both `library.json` and `.claude-plugin/plugin.json` when supplied - so a plugin scaffolded THAT way passes `claude plugin validate --strict` outright, while the raw template and a plugin scaffolded via `questionnaire`/`hybrid` or with the author declined stay in the minimal, author-less state and correctly keep warning under `--strict`. Two honest states, not one bug.
- **Why:** `claude plugin validate templates/seed-plugin --strict` failed with "No manifest found in directory," while the README's Bronze payoff claims a Bronze plugin "is installable and behaves the same on Claude Code, Codex, and the broader agentskills.io ecosystem." Both cannot be true at once. The Standard's own tier design places native manifests at Silver, via S6 (per-target emission), so the prior Bronze scaffold was correct by the Standard's ladder and still not a plugin by the vendor's own definition. What makes this cheap to fix now, and not a correction of a design error in 2026-06 when the tier split was written: Codex 0.146.0 (2026-07-29) reads `.claude-plugin/*` directly, so one minimal file now buys install recognition on both vendors where two per-target files used to be needed. That is a premise move, not new information about a mistake.
- **Status:** Accepted.

- **Date:** 2026-08-11
- **Deciders:** maintainer (jprisant), with Claude (Opus 5)

## Builds on
- ADR 0023 (v1 scope resolutions: init, docs, eval) - established `templates/seed-plugin/` and the discipline that `tests/unit/init-anatomy.test.mjs` checks a **structural** match, not a byte-exact diff. This ADR extends that same seed with one new template file under the same discipline.
- ADR 0027 (Standard versioning and compatibility policy) - the warn-first burndown mechanism (`meta.since`, `applyStandardDowngrade`) that a Bronze-tier spine change would be required to use. This decision explicitly declines to invoke it: it changes what the tooling writes for new plugins, not what the Standard requires of existing ones.
- `docs/internal/release-plans/plan_v1.10.1/validator-parity-baseline.md` - recorded the exact failing `claude plugin validate templates/seed-plugin --strict` transcript this ADR fixes (measured 2026-08-11 against Claude Code CLI 2.1.227), and named the resolution this ADR carries out.
- `_local/audit/2026-08-10_fable/09-divergence-resolution-plan.md` item A4, and `_local/audit/2026-08-10_fable/appendix-b-codex-surface.md` (primary-source citation: `codex-rs/core-plugins/src/manifest.rs`, and https://github.com/openai/codex/releases/tag/rust-v0.146.0) - the proposed, not-yet-ratified plan item this ADR accepts, and the primary evidence for the Codex premise move. One correction to that plan item is recorded below, under Consequences.

## Context and problem statement
A live run of the vendor's own validator against the toolkit's Bronze scaffold fails:

```
$ claude plugin validate templates/seed-plugin --strict
✘ Found 1 error:
  ❯ directory: No manifest found in directory. Expected .claude-plugin/marketplace.json or .claude-plugin/plugin.json
✘ Validation failed
```

Meanwhile `README.md`'s Bronze payoff line reads: "a Bronze plugin is installable and behaves the same on Claude Code, Codex, and the broader agentskills.io ecosystem at once. Write once, run anywhere." Both cannot be true of the same bytes.

This is not a bug in either surface taken alone. The Standard's tier design (STANDARD.md, S6 - per-target emission) deliberately places native manifests at Silver: Bronze is meant to be the smallest commitment, and a plugin carrying only `library.json` is fully conformant with what Bronze requires. The vendor's install tooling has a different, narrower definition: a directory with no `.claude-plugin/plugin.json` (or `marketplace.json`) is not a plugin at all, regardless of what any third-party Standard says about it. The two definitions were never going to agree by accident, and until 2026-07-29 there was no cheap way to reconcile them: satisfying both vendors meant writing two per-target manifests, which is exactly the S6 (per-target emission) commitment the tier design reserves for Silver, gated on declaring `agent-targets` and a `prefix` first.

Codex 0.146.0 changed that premise. Its manifest-resolution order now checks, per plugin root: an Agent Plugins root `plugin.json`, then `.codex-plugin/plugin.json`, then `.claude-plugin/plugin.json`, then `.cursor-plugin/plugin.json` - first one present wins (verified in `_local/audit/2026-08-10_fable/appendix-b-codex-surface.md` against Codex source and the 0.146.0 release notes). A single `.claude-plugin/plugin.json` is therefore now sufficient for both Claude Code and Codex to recognize the directory as a plugin. This was not true when S6's Silver placement was decided, so resolving the tension now is a premise move on the vendor's side, not evidence that the original tier split was a design error.

This ADR was recorded as a known, deliberately deferred tension in `validator-parity-baseline.md` and is scoped to v1.11.0 "reach" per `_local/audit/2026-08-10_fable/09-divergence-resolution-plan.md` item A4.

## Decision drivers
- The README's Bronze payoff claim needs to become true for newly scaffolded plugins; changing the claim itself is out of this decision's scope (README.md is a concurrently edited file this release, and evaluating its wording is a separate question from what the scaffold emits).
- The tier ladder's meaning has to stay legible: Bronze must not start looking like Silver just because it now installs. S6 (per-target emission) exists specifically to gate the Silver claim (`agent-targets` declared, both native manifests present and agreeing); nothing about fixing installability should let a Bronze plugin trip that gate by accident.
- A tooling default is reversible and reaches only plugins scaffolded from here forward; it moves nobody's already-graded verdict.
- A Standard change reaches every already-graded Bronze plugin's verdict and is governed by ADR 0027's warn-first burndown, which asks for a `since` version and a burndown window - machinery this decision has no evidence to justify invoking yet.

## Considered options
1. **Tooling-only: `askit-init-plugin` and the seed template emit a minimal `.claude-plugin/plugin.json` by default.** (chosen) The Standard's Bronze spine (U1 through U13) is untouched; only what the scaffold writes changes.
2. **Tighten the Standard itself: add or extend a Bronze-tier check to REQUIRE a native manifest.** Rejected for this decision. This would re-grade every plugin that has already earned Bronze under the current spine, and per ADR 0027 a new or tightened requirement must ship `warn` for one Standard minor before it can gate-fail. No burndown evidence exists yet. Deferred to Standard 0.13, tracked as the open item under Consequences.
3. **Scaffold the FULL S6 per-target spine at Bronze** - both native manifests, rendered by `scripts/generators/gen-manifest.mjs`'s `renderClaudeNativeManifest()`/`renderCodexNativeManifest()`, carrying `author`, `homepage`, `repository`, `keywords`, and (for Codex) a `skills` pointer and `interface` block. Rejected: this is exactly the back door the task guarding this decision named. A Bronze plugin would carry Silver-shaped artifacts without declaring `agent-targets` or `prefix`, and S6 (per-target-presence) exists precisely to make that claim mean something; scaffolding its output at Bronze empties the check's meaning for every plugin born from this scaffold.
4. **Do nothing; document the gap and wait for the Standard question to resolve first.** Rejected: the fix at the tooling layer is cheap now that the Codex premise moved, and the README's claim is false today, not hypothetically.
5. **Ship a placeholder `author` (e.g. `{"name": "REPLACE - your name"}`) in the template, to make `--strict` pass unconditionally.** Rejected. `U5` (description-score, `scripts/checks/description-score.mjs`) already exists specifically to penalize this move: ADR 0033 recalibrated it to subtract 0.4 from any description matching `/\b(TODO|TBD|FIXME|XXX+|PLACEHOLDER|CHANGEME)\b/`, on the reasoning that a description reading "TODO: write a description" scoring as if finished is the scorer being fooled by unfinished content dressed as real content. `U5` is scoped to skill descriptions and does not literally read `author` - the connection is the principle, not the regex - but the defect is the same shape: a fabricated `author.name` would make `--strict` pass while asserting an attribution that is not true, and it would ship in every scaffolded plugin until a human noticed and fixed it by hand. A missing optional field is honest; a fabricated one is not. Accepted instead: option 6.
6. **Let `askit-init-plugin`'s `interview` mode ask for a real author, and emit it only when supplied.** (chosen, alongside option 1) The one mode that can actually ask a human is the one allowed to add `author`; the other two modes (`questionnaire`, `hybrid`) and the raw template itself stay author-less and keep warning under `--strict`, honestly.

## Decision outcome
Option 1. `templates/seed-plugin/.claude-plugin/plugin.json` is a new file:

```json
{
  "name": "replace-with-plugin-name",
  "version": "0.1.0",
  "description": "REPLACE - what this plugin does and when to use it, with concrete trigger keywords."
}
```

Each field earns its place narrowly:
- **`name`** - the vendor's minimum requirement for a valid manifest at all, and the field U8 (manifest-drift) compares against `library.json`'s `name` (a WARN on mismatch).
- **`version`** - the field U8 treats as an ERROR on mismatch (the same invariant the release tag guard enforces on the toolkit's own manifests, per ADR 0027's note on the v1.1.0 tightening), so it has to be present and correct from the first commit, not added later.
- **`description`** - the field the vendor's install listing shows a user before they install; omitting it costs nothing structurally but is a worse first impression than the two-line cost of including it.

Nothing else is emitted: no `agent-targets`, `prefix`, `components` index, `author`, `homepage`, `repository`, `keywords`, `mcpServers` pointer, or Codex `skills`/`interface` block. `templates/seed-plugin/library.json`'s `name` placeholder was also changed from `REPLACE-with-plugin-name` to `replace-with-plugin-name` (lowercase) - the vendor's manifest schema requires kebab-case (lowercase letters, digits, hyphens only) and rejected the prior uppercase placeholder as a warning-turned-`--strict`-error; `templates/seed-plugin/README.md`'s H1 mirrors the same placeholder for consistency. `askit-init-plugin`'s SKILL.md and `references/onboarding-modes.md` now instruct: fill `name`/`description` identically in both files, or U8 flags the drift.

**Verified, not assumed, against the seed after this change:**
- `claude plugin validate templates/seed-plugin --strict` no longer fails on a missing manifest.
- `node scripts/check.mjs templates/seed-plugin` reports `Tier: Universal (Convergent blocked: 3 issues)`, `0 error(s)`, unchanged from before this ADR except for the new manifest's presence.
- U8 (manifest-drift, `scripts/checks/manifest-drift.mjs`) returns zero findings against the seed: `name`/`version` agree.
- S6 (per-target-presence, `scripts/checks/per-target-presence.mjs`) returns zero findings against the seed: it returns early because the seed declares no `agent-targets`, so a Bronze plugin shipping this minimal file is never read as claiming Silver's per-target behavior.
- U9 (version-match, `scripts/checks/version-match.mjs`) is unaffected; it compares `package.json` to `library.json` and the seed ships neither a `package.json` nor is one implied by this change, so it returns `[]` (not applicable) exactly as before.

**Verified again, from the consumer's position, in a fresh directory outside this repository, after the `interview`-mode author addition below:** a plugin (`csv-cleaner`) scaffolded with `author: { "name": "Jamie Rivera" }` written into both `library.json` and `.claude-plugin/plugin.json` reports `claude plugin validate <dir> --strict` -> `✔ Validation passed` (zero warnings, not merely zero errors), `node scripts/check.mjs <dir>` -> `Tier: Universal (Convergent blocked: 3 issues)`, `0 error(s), 1 warning(s)` (the pre-existing "no skills yet" warning only) with exit code `0`, and no U8 finding of any kind despite the extra field. Re-run side by side, the raw `templates/seed-plugin/` template is unchanged: `--strict` still warns on the missing `author`, plain `validate` still passes with that warning, and the gate is still `Universal`, `0 error(s)`.

**The `--strict` finding, and why it is now a feature of two honest states rather than one gap.** With only the three fields above, `claude plugin validate templates/seed-plugin --strict` reports one warning-as-error:

```
⚠ Found 1 warning:
  ❯ author: No author information provided. Consider adding author details for plugin attribution
✘ Validation failed (--strict treats warnings as errors)
```

The vendor's `author` field is not a placeholder-able scalar: probing confirms `"author": ""` is rejected outright (`Invalid input: expected object, received string`) and `"author": {}` still warns `author.name: Invalid input: expected string, received undefined` - satisfying it requires a real `{ name: string, ... }` object, a fourth field this decision's own "name, version, description at most" boundary rules out for the TEMPLATE. Plain `claude plugin validate templates/seed-plugin` (without `--strict`) passes: `✔ Validation passed with warnings`.

The first instinct - grow the template's manifest with a placeholder `author` so `--strict` passes unconditionally - was considered and rejected (option 5 above): it is the same class of defect `U5` already penalizes in descriptions, applied to a new field. The template genuinely has no author to declare, so the `--strict` warning on `templates/seed-plugin/` itself is CORRECT and is left in place permanently, not a residual gap to close later.

What actually resolves the gap is option 6: `askit-init-plugin`'s `interview` mode can ask a human, so it does. When the maintainer supplies a name (optionally a url/email), the scaffold writes a real `author` object into BOTH `library.json` (its existing OPTIONAL field, Standard sec 5.1 - `scripts/generators/gen-manifest.mjs`'s `nativeSpine()` already reads `lib.author`, so mirroring it there means a later Silver-tier regeneration does not silently drop it) and `.claude-plugin/plugin.json`. Probing confirms `author: { name: "Jane Maintainer" }` alone, with no url/email, is sufficient: `claude plugin validate --strict` reports `✔ Validation passed` with zero warnings. If the maintainer declines or skips, the scaffold emits NO `author` key in either file - the plugin then sits in exactly the template's state and keeps warning under `--strict`, honestly. `questionnaire` and `hybrid` mode do not yet ask this question, so a plugin scaffolded through either one also stays in the author-less state until the maintainer adds one by hand; this is a disclosed, not silently accepted, limitation (see Consequences).

So there are two states, both correct, not a gap:
| State | `claude plugin validate --strict` |
|---|---|
| The raw `templates/seed-plugin/` template | Warns (`author` missing) - correctly; a template has no author |
| A plugin scaffolded via `interview` mode, author supplied | Passes cleanly |
| A plugin scaffolded via `interview` mode, author declined | Warns - correctly; still no author |
| A plugin scaffolded via `questionnaire`/`hybrid` mode | Warns - correctly; not yet asked |

## Consequences
- **Positive:** a plugin scaffolded from `templates/seed-plugin/` today is recognized as an installable plugin by Claude Code and, since Codex 0.146.0, by Codex, from the first commit - without waiting on a Standard change, and without any existing Bronze plugin's grade moving. A plugin scaffolded through `interview` mode with a real author supplied passes `claude plugin validate --strict` outright, with no fabricated data anywhere in the chain.
- **Negative / accepted:** the raw template, and any plugin scaffolded through `questionnaire`/`hybrid` mode or through `interview` mode with the author declined, still warns under `--strict` over the missing `author` object. This is accepted permanently, not left open pending a future fix: growing the template's manifest with a placeholder would blur exactly the Bronze/Silver boundary this decision protects AND repeat the fabricated-content defect `U5` exists to catch (option 5, rejected above). The honest fix is asking, not padding.
- **Accepted gap:** `questionnaire` and `hybrid` mode do not ask for an author, so a plugin scaffolded through either one stays in the author-less, `--strict`-warning state even if the maintainer would have supplied one. Recorded here as a known, disclosed limitation rather than silently left inconsistent; closing it (adding the same question to `templates/onboarding-questionnaire.template.md` and its processing step) is out of this decision's file scope and is a natural, small follow-up.
- **Correction to the evidence pack this ADR accepts, in two places:** `_local/audit/2026-08-10_fable/09-divergence-resolution-plan.md` item A4 states its acceptance criterion as "`claude plugin validate templates/seed-plugin --strict` passes," unqualified - it does not say which of the two states above it means. `docs/internal/release-plans/plan_v1.11.0/RELEASE-PLAN.md` carries the same unqualified criterion forward from A4 (that release plan is out of this decision's file scope; it is named here, not edited). Live verification shows the unqualified criterion is false of the raw template (which is correct to warn) and true of an `interview`-scaffolded plugin with an author supplied (verified below). Recorded here as a correction rather than silently satisfied, per this repository's practice of running published instructions from the consumer's position and reporting the real transcript (the same discipline the G4 index-drift remediation failure established, per `_local/_session-logs/2026-08-10_18-05_claude_the-audit-that-ran-the-other-sides-validators.md`).
- **Deferred - the open question this ADR does not answer:** does the Standard's Bronze tier itself need to REQUIRE a native manifest (a new or tightened U-check), rather than the tooling merely defaulting one? Changing the tooling default, as this ADR does, reaches only plugins scaffolded from here forward and moves no existing verdict. Changing the Bronze tier's requirements would move every already-graded Bronze plugin's verdict and needs ADR 0027's warn-first burndown treatment plus evidence a burndown window is warranted. That decision is deferred to Standard 0.13 evidence, matching item A4's own note: "recommendation is tooling-default now, spine decision deliberately deferred to Standard 0.13 evidence."

## Implementation sites
- `templates/seed-plugin/.claude-plugin/plugin.json` - NEW. The concrete minimal manifest: `name`, `version`, `description` only.
- `templates/seed-plugin/library.json` - `name` placeholder changed to lowercase kebab-case (`replace-with-plugin-name`) so the vendor's kebab-case rule does not fail on the raw template; `templates/seed-plugin/README.md`'s H1 mirrors it.
- `scripts/checks/manifest-drift.mjs` - `check()` and the `NATIVE` array: unaffected by this decision; verified to return zero findings against the seed once the new manifest agrees with `library.json`.
- `scripts/checks/per-target-presence.mjs` - `check()` and `MANIFEST_FOR`: unaffected; verified to return zero findings against the seed because `agent-targets` stays absent.
- `scripts/generators/gen-manifest.mjs` - `renderClaudeNativeManifest()`: the Silver-tier full generator this decision does NOT invoke at Bronze scaffold time; naming it is the boundary this ADR draws against option 3.
- `skills/askit-init-plugin/SKILL.md` - Purpose paragraph and interview-mode steps 1-2: the scaffold description, the optional-author question, and the instruction to fill `name`/`description` identically in both `library.json` and `.claude-plugin/plugin.json`, add a real `author` to both when supplied, and emit no `author` key in either when declined.
- `skills/askit-init-plugin/references/onboarding-modes.md` - onboarding question 5 (author) and the "Two honest states, not one" paragraph: names the new file, states it is not the Silver step, and states the template-vs-interview-scaffolded split plainly.
- `tests/unit/init-anatomy.test.mjs` - the seed's native manifest is exactly `{name, version, description}` (explicitly, no `author`) and agrees with `library.json`'s `name`/`version`; and `manifestDriftCheck`/`perTargetPresenceCheck` (the aliased imports of `manifest-drift.mjs` and `per-target-presence.mjs`'s `check` functions) both return `[]` against the loaded seed.
- `tests/unit/manifest-drift.test.mjs` - two new tests locking in that `check()` never compares an `author` field, whether present on both sides, one side, or neither - the guarantee this decision's `library.json`+`.claude-plugin/plugin.json` mirroring relies on.

Grep anchor: `NATIVE` in `scripts/checks/manifest-drift.mjs` - the array both U8 (`manifest-drift`) and S6 (`per-target-presence`'s `MANIFEST_FOR`) key off; the comment above it says to keep the two in sync.
