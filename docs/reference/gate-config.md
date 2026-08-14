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

Resolution precedence is **per-rule override > profile > the severity the check emitted** (which already reflects the pinned-Standard downgrade of STANDARD.md sec 7.7).

To grade a plugin you do not own under a profile, pass `--profile <name>` on the CLI instead of writing a config file into its tree (see [CLI](#cli)). This is the intended path for grading a third-party plugin: `--profile plain-plugin` drops the askit library-ladder findings so only portable defects remain.

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
node scripts/check.mjs .
node scripts/check.mjs . --mode published-verdict
node scripts/check.mjs <path> --profile plain-plugin
node scripts/evaluate.mjs <path> --json
node scripts/evaluate.mjs <path> --format=html --profile plain-plugin --out report.html
```

An unknown `--profile` or `--mode` is rejected with exit code 2.
