---
title: "skills/askit-standards-watch - folder guide"
---

# skills/askit-standards-watch

The askit-standards-watch skill. Checks whether the pinned agentskills.io upstream specification has changed, reports which Universal conformance checks each delta lands on, and drafts a proposal ADR without editing a check or the Standard. Use when asking if the upstream spec has moved, before cutting a Standard minor version, or when re-pinning the agentskills.io revision the Universal tier tracks.

## Inventory

- `SKILL.md` - the skill definition (frontmatter plus the procedure).
- `examples/` - three golden runs (unchanged, a real upstream delta, a material delta) plus the anti-example, and the historical pin golden 2 replays (Standard sec 7.2).
- `references/` - supporting reference docs loaded on demand.
