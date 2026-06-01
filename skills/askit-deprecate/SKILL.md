---
name: askit-deprecate
description: Validates and records a component's deprecation (status, replacement, and removal target) and keeps deprecated components validating until removal. Use when deprecating a component, recording its replacement, or checking the deprecation contract.
metadata:
  version: 0.1.0
  tier: universal
  audience: advanced
---

# askit-deprecate

## Purpose
Manage a component's end-of-life cleanly. Two modes: `deprecate` marks a component `status: deprecated` and records its replacement (`deprecated-by`) and the version it will be removed in (`remove-in`), per Standard sec 3.7 / 7.5; `check` runs the G6 `deprecation` check (the contract is complete) and confirms a deprecated component still validates until its `remove-in` version, so consumers get a migration window rather than a sudden break. Policy and the lifecycle are in [references/deprecation-policy.md](references/deprecation-policy.md).

## When to use
When deprecating a component, recording its replacement, or checking that deprecated components still validate before their removal version.

## deprecate mode
1. Set the component's `status` to `deprecated` in `library.json` (and the component frontmatter `metadata.status`).
2. Record `deprecated-by` (the replacement component) and `remove-in` (the target plugin version for removal).
3. Point users at the replacement in the component's description or body; do not delete it yet.

## check mode
1. Run `node scripts/check.mjs` (the aggregate gate, which includes the G6 `deprecation` check): every `deprecated` component declares `deprecated-by` + `remove-in`, and no component carries an invalid status.
2. Confirm each deprecated component still passes its tier checks until `remove-in` (a deprecated component must keep validating during the migration window).

## Scope
The G6 `deprecation` check enforces the contract deterministically; this skill is the front door and the policy. Actual removal at the `remove-in` version is a release-time action driven by `askit-release` (and recorded in the CHANGELOG). Deprecation is the Gold G6 baseline; a dedicated removal-automation skill is roadmap (the policy and frontmatter handling are what v1 requires).
