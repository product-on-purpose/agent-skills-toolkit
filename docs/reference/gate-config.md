---
title: "Gate configuration (askit.config.json)"
description: "Configure how the gate grades a plugin with per-rule severities, named profiles, a suppressions baseline, and a published-verdict mode."
audience: engineer
level: intermediate
tags: [gate, config, profiles, suppressions, provenance]
---

# Gate configuration (`askit.config.json`)

By default the gate grades every plugin against the full Advanced Skill Library Standard spine. An **optional** `askit.config.json` at the plugin root lets a consuming team scope HOW the gate grades, without editing source: turn a rule down or off, grade against a lighter rubric, or durably waive a known finding. The configuration is consumer-side and is NOT part of the plugin contract (STANDARD.md sec 7.7): a plugin is conformant or not independent of how a grader is configured. With no file present, the gate behaves exactly as before.

## Schema

```json
{
  "mode": "local",
  "profile": "askit-library",
  "rules": {
    "G9": "warn",
    "U6": "off"
  },
  "suppressions": [
    { "reqId": "G7", "file": "docs/legacy/**", "reason": "pre-taxonomy archive, waived 2026-06" }
  ]
}
```

All keys are optional; an absent file, an empty `{}`, or any absent key falls back to the documented default. A malformed file is surfaced as a finding, never a crash.

**A problem in this file is an OPERATOR error, not a conformance defect of the plugin.** `askit.config.json` selects the rubric; it is not part of what is being graded. Every finding the loader emits is labelled `[operator/...]` and can never move the tier, in either CLI. A fatal problem - the file is not valid JSON, or is not a JSON object - means the rubric in force is not the one you selected, so the run exits **2** (this CLI's operator-error code) rather than 1, which would say the plugin failed. Both CLIs treat a broken rubric this way. **They do NOT otherwise agree on exit codes for the same directory, and no claim here should be read as saying so** - `tests/fixtures/golden/lone-skill` is the standing counter-example: `check.mjs` exits 1 (no `library.json`, so it grades the folder as a plugin against the full ladder) while `evaluate.mjs` exits 0 (it detects component scope). That disagreement predates this change and is untouched by it. This is a CLI behaviour, not a Standard requirement: no check, severity or `since` window changed. Previously a trailing comma here took a conforming Bronze plugin to `Tier: None` with exit 1, measured on a clone of `tests/fixtures/golden/minimal-skill`.

Stated precisely, because the two CLIs report differently and one of them is not finished:

| Surface | Operator findings are... |
|---|---|
| `check.mjs` tier, `errorCount`, `warnCount`, exit code | excluded; printed in their own labelled block ahead of the findings |
| `check.mjs --json` | kept in `findings` with `operator: true`, counted separately in `operatorErrorCount`; the block goes to stderr so stdout stays one document |
| `check.mjs --gha` | annotated first, labelled "operator problem" |
| `evaluate.mjs` tier and exit code | excluded; the finding is printed with an `[operator/...]` label |
| `evaluate.mjs` `summary.errors` and `dispositions.realIssues` | **still counted**, so an unloadable config adds 1 to both. Tracked as a follow-up: separating it needs a sixth disposition bucket, and the five are a documented partition that consumers sum (ADR 0044). |
| `--sarif` | emitted as an ordinary result at level `error` with `ruleId: "config"`, unlabelled. Also a follow-up. |
| The GitHub Action | reported as its own `operator-errors` output, separate from `errors`, and annotated on the diff. See [run the gate in GitHub Actions](../how-to/run-the-gate-in-github-actions.md). |

- **`mode`** (default `"local"`): `"local"` or `"published-verdict"`. See [Published-verdict mode](#published-verdict-mode).
- **`profile`** (default `"askit-library"`): a named profile. See [Profiles](#profiles).
- **`rules`** (default `{}`): a map of `reqId` to an effective severity, `"error" | "warn" | "off"`. `off` drops every finding from that check; the others override the severity the check emitted. An unknown `reqId` or an invalid severity is a config warning and is ignored.
- **`suppressions`** (default `[]`): a baseline of waived findings. See [Suppressions](#suppressions).

## Provenance

Every check declares a `provenance`, so the report can separate portable, defensible failures from askit conventions:

- **`objective`**: a defect true regardless of any standard (a dead reference link, manifest drift, malformed JSON, a structurally broken diagram).
- **`vendor-cited`**: backed by an external authority (Claude Code, Codex, agentskills.io), for example the `SKILL.md` frontmatter validity and instruction-budget rules.
- **`house`**: an askit-Standard convention with no external mandate (the library manifest, the root `AGENTS.md` anatomy and the description scorer, the Convergent set, and the Gold self-documentation checks; see ADR 0029 for the `U2`/`U5` reclassification).

The report splits **real issues** (objective + vendor-cited errors that survive config) from **profile conformance** (house failures and anything a profile or rule downgraded), so a consumer sees what is broken apart from what merely does not meet the askit ladder.

## Profiles

A profile selects a base severity map applied before `rules`. The built-in profiles:

- **`askit-library`** (default): the full Bronze/Silver/Gold spine, every check at its declared severity. A no-op, so omitting `profile` reproduces the default grading.
- **`plain-plugin`**: grades a vanilla plugin on the portable, vendor-grounded universal checks only; the askit house checks are turned off - the manifest contract (`U1`), the root `AGENTS.md` anatomy (`U2`) and the description scorer (`U5`), the Convergent ladder (`S1-S8`), and Gold (`G1-G10`) (ADR 0029). Use this to grade a plain Claude Code or Codex plugin as itself, not against the askit library contract.
- **`house-style`**: the opt-in slot reserved (ADR 0028) for re-homed house preferences. Empty today; the dash preference remains the shipped `hooks/no-dashes.mjs` hook.

Resolution runs in **four ordered steps** (ADR 0044). (1) Profile, then per-rule override, with precedence **per-rule override > profile > the severity the check emitted**. (2) Suppression matching. (3) The published-verdict trust step, which runs only in that mode and never for `house` findings. (4) The **Standard ceiling**, applied LAST and never raising, which holds a finding back to what your pinned `standard` permits.

The ordering matters and it changed at Standard 0.13: the pin used to be applied as a pre-pass BEFORE your configuration resolved, which meant a per-rule override outranked it. **It no longer does.** A `rules.X = "error"` on a check introduced or tightened after your pin is honoured and then held back, and the reason is reported rather than the override silently appearing ignored.

To grade a plugin you do not own under a profile, pass `--profile <name>` on the CLI instead of writing a config file into its tree (see [CLI](#cli)). This is the intended path for grading a third-party plugin: `--profile plain-plugin` drops the askit library-ladder findings so only portable defects remain.

**The gate now names this profile for you when it is likely the one you want.** Pointing it at a directory with no `library.json` - a folder of loose skills, which is what a plain plugin usually is - grades it against the full askit ladder, so the output fills with house and Gold requirements the author never claimed. When no profile has been chosen (neither `--profile` nor a `profile` key in a config), the gate prints one line ahead of the findings saying so and naming both opt-ins. It is a hint and nothing more: no finding, no severity, and no effect on the verdict or the exit code.

## Suppressions

A suppression durably waives a known finding so a team accepts it once instead of re-triaging every run. Each entry needs a `reqId` and a human `reason`; it may narrow by a `file` glob (`**` for any, `*` for any non-slash segment) and an optional case-sensitive `message` substring.

```json
{ "reqId": "U11", "file": ".mcp.json", "message": "bearer_token", "reason": "false positive on an allowlisted field" }
```

A suppressed finding is removed from gating and the counts and is listed separately in the report (with its reason), never silently dropped. A suppression with no recorded reason is a config warning.

## Published-verdict mode

`mode: "local"` (the default, for a team running its own CI) applies every override and suppression as written. `mode: "published-verdict"` is for a grader publishing a conformance verdict about someone else's plugin: it prevents the SUBJECT from weakening an `objective` or `vendor-cited` finding to dodge the verdict.

**This changed at Standard 0.13, and the change is deliberate.** Through 0.12 such a finding was merely *clamped* up to a `warn`, which meant turning the mode on could never fail a passing gate. From 0.13 a subject-owned setting that lowers the finding is DISCARDED, and the finding returns to the severity a grader-selected rubric would give it - so **a published verdict can now fail where it previously passed.** A guarantee that protects the subject is the wrong guarantee in the one mode built to publish a verdict *about* the subject.

The rule is stated in terms of WHO chose the setting:

- **Subject-owned** (anything read from the graded plugin's own `askit.config.json`, including its `profile`) cannot LOWER an objective or vendor-cited finding. It can raise one: a plugin being stricter about itself is honoured.
- **Grader-owned** (anything you pass as a flag, such as `--profile plain-plugin` or `--mode`) is honoured in full, in either direction. Grading a third-party plugin against a rubric you chose is the intended use of the mode.
- A **subject-owned suppression is cleared**, not merely surfaced. A waiver and a lowered severity are two independent ways to dodge the same finding, and a gate needs both to be clean.
- A **`house` finding is never touched**, in any mode, so a consumer can always opt out of an askit convention.

Every trust action is reported with a `trustNotice` naming which of the subject's own settings was overruled, and the aggregate is available as `dispositions.trustActions`. The older `clampNotice` field remains for one minor, populated only where the old semantics are still literally true - a result that really is a `warn`.

## CLI

Both `scripts/check.mjs` and `scripts/evaluate.mjs` read `askit.config.json` automatically. A `--mode <local|published-verdict>` and a `--profile <name>` flag override the file for one run, so you can grade a plugin you do not own under a chosen profile without writing a config file into its tree (an explicit per-rule override in a present config still wins):

```
npx agent-skills-toolkit .
npx agent-skills-toolkit . --mode published-verdict
npx agent-skills-toolkit <path> --profile plain-plugin
npx agent-skills-toolkit evaluate <path> --json
npx agent-skills-toolkit evaluate <path> --format=html --profile plain-plugin --out report.html
```

An unknown `--profile` or `--mode` is rejected with exit code 2, and so is an `askit.config.json` that does not load (see [Schema](#schema)).

## The advisory layer

Both scripts also run a deterministic advisory layer (`ADV1` to `ADV4`, ADR 0063, an advisory layer beside the tier). Its findings are reported in their own `advisoryFindings` list beside the verdict. They never change the tier, the error and warning counts, or the exit code.

- **`--no-advisory`** switches the layer off for one run. The report then carries `advisoryLayer: "off"` and `advisoryFindings: null`, so a reader can tell "switched off" apart from "ran and found nothing".
- **Each profile carries an advisory off-set.** `plain-plugin` turns off the house-provenance advisory IDs, the same way it turns off the house checks. The vendor-cited and objective advisory IDs still run under it, because portability and security matter most when grading someone else's plugin.
