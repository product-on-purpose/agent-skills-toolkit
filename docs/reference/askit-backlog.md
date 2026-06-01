# askit-backlog (reference)

Manages a plugin's two backlogs (Standard sec 7.1): `docs/internal/backlog/new-components.md` and `docs/internal/backlog/enhancements.md`.

## Modes
- `intake`: capture a proposal; apply the why-gate (warranted? duplicate? a mode not a component? tier/targets?); record it in the right backlog.
- `triage`: prioritize and route open items.
- `prune`: remove shipped or stale items, recording why.

## The why-gate
A new-component proposal must be warranted, not a duplicate, and not really a mode of an existing skill. The default answer is consolidation (one skill per component type, modes over micro-skills). Failing items route to `enhancements.md`.

## Notes
Both backlogs are RECOMMENDED at Bronze and REQUIRED at Silver+. See the [manage-the-backlog how-to](../how-to/manage-the-backlog.md) and [backlog-workflow](../../skills/askit-backlog/references/backlog-workflow.md).
