---
title: "skills/askit-capability-advisor - folder guide"
---

# skills/askit-capability-advisor

The askit-capability-advisor skill. Reports which component types a target agent can run and recommends a conformance tier before a plugin is built, mapping Claude Code and Codex capabilities to the Advanced Skill Library Standard's component types. Use when choosing agent-targets, checking whether a component is portable across agents, or deciding which tier to aim for.

## Inventory

- `SKILL.md` - the skill definition (frontmatter plus the procedure).

> **`references/` was emptied 2026-08-20 (v1.16.0 W2).** Its only file, `capability-matrix.md`, moved to
> [`../../foundation/synthesis/capability-matrix.md`](../../foundation/synthesis/capability-matrix.md)
> per ADR 0055 (the `foundation/` layout). The matrix is a synthesis of vendor capability that three
> skills and two public pages depend on, so it was never one skill's private reference.
