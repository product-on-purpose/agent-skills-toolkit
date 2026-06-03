---
title: "askit-deprecate"
description: "Validates and records a component's deprecation and keeps deprecated components validating until removal."
audience: engineer
level: intermediate
---

# askit-deprecate (reference)

Validates and records a component's deprecation and keeps deprecated components validating until removal.

## Modes
- `deprecate`: set `status: deprecated` + record `deprecated-by` (replacement) + `remove-in` (removal version), per sec 3.7 / 7.5.
- `check`: run the G6 `deprecation` check (contract complete; status valid) and confirm deprecated components still validate until `remove-in`.

## The contract (G6)
A deprecated component MUST declare `deprecated-by` + `remove-in`; `scripts/checks/deprecation.mjs` enforces this over the library.json entries. Policy + lifecycle: [deprecation-policy](../../skills/askit-deprecate/references/deprecation-policy.md).

## Boundary
Removal at `remove-in` is a release action (`askit-release`); this skill owns the policy + the deprecation contract. See the [deprecate-a-component how-to](../how-to/deprecate-a-component.md).
