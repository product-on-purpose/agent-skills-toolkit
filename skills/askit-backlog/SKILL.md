---
name: askit-backlog
description: Manages a plugin's two backlogs (new-component proposals and enhancements) to the Advanced Skill Library Standard. Use when capturing a new-component proposal through the why-gate, triaging or prioritizing backlog items, or pruning stale or completed entries.
metadata:
  version: 0.1.0
  tier: universal
  audience: intermediate
---

# askit-backlog

## Purpose
Maintain the two local-first backlogs the Standard defines (sec 7.1): `docs/internal/backlog/new-components.md` (proposals to add a skill, command, subagent, hook, and so on) and `docs/internal/backlog/enhancements.md` (changes to existing components). Three modes: `intake` captures a proposal through the why-gate; `triage` prioritizes and routes; `prune` removes stale or completed items. Authoring depth is in [references/backlog-workflow.md](references/backlog-workflow.md).

## When to use
When the user proposes a new component, requests an enhancement, or wants to review, prioritize, or clean the backlog.

## intake mode
1. Decide which backlog: a new component (new-components.md) or a change to an existing one (enhancements.md).
2. Apply the why-gate to a new-component proposal: is it warranted? is it a duplicate of an existing component, or really a mode of one? what tier and agent-targets? If it fails the gate (a duplicate, or a would-be mode), record the rationale and route it to enhancements instead.
3. Record the item. New-components: proposed name, component type, target tier, agent-targets, rationale, status. Enhancements: the target component, the change, a why, and a how-to-apply.

## triage mode
1. Review open items; assign priority and, for enhancements, the target component or phase.
2. Re-route mis-filed items (a "new component" that is really a mode becomes an enhancement).

## prune mode
1. Remove items that shipped (now in the CHANGELOG) or that are stale or rejected, recording why.

## Scope
Two backlogs, local-first and version-controlled (sec 7.1): RECOMMENDED at Bronze, REQUIRED at Silver+. The why-gate keeps the new-components backlog from collecting duplicates and would-be modes; consolidation (one skill per component type, modes over micro-skills) is the default answer, per the toolkit's own packaging decision.
