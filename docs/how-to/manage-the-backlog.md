---
title: "Manage the backlog"
description: "Capture, triage, and prune work in the two backlogs (Standard sec 7.1)."
audience: engineer
level: intermediate
---

# How to manage the backlog

Capture, triage, and prune work in the two backlogs (Standard sec 7.1).

## Capture a proposal (intake)

Invoke `askit-backlog` (intake mode). For a NEW component it applies the why-gate - warranted? duplicate? really a mode of an existing skill? what tier and targets? - and records it in `docs/internal/backlog/new-components.md`. For a change to an EXISTING component it records the target, the change, a why, and a how-to-apply in `docs/internal/backlog/enhancements.md`.

## Triage

Invoke `askit-backlog` (triage mode) to prioritize open items, route mis-filed ones (a "new component" that is really a mode becomes an enhancement), and tag enhancements with their target component or phase.

## Prune

Invoke `askit-backlog` (prune mode) to remove items that shipped (now in the CHANGELOG) or that are stale or rejected, recording the reason.

## See also

- [`askit-backlog` reference](../reference/askit-backlog.md)
- [backlog-workflow](../../skills/askit-backlog/references/backlog-workflow.md)
