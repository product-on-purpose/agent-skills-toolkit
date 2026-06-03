---
title: "askit-evaluate"
description: "Assesses a known, local skill or plugin against the Standard."
audience: engineer
level: intermediate
---

# Reference: askit-evaluate

Assesses a known, local skill or plugin against the Standard.

- **Scope:** auto-detected. `library.json` present (or an `AGENTS.md`/`skills/`
  directory) -> plugin scope; a lone `SKILL.md` with no `library.json` -> component
  scope; neither -> an `unknown`-scope error naming what was expected.
- **Command:** `node scripts/evaluate.mjs <path> [--json]`
- **Output:** per-rule findings (`error`/`warn`), and for plugin scope the tier +
  `blocked` list. `--json` emits the full report object; see the skill's
  `references/report-format.md` for the shape.
- **Exit code:** non-zero when there is at least one error.
- **Out of scope (v1):** behavioral evaluation (running a skill against expected
  outputs) and qualitative review. Those arrive in a later phase.

## Multi-tier findings

Reports may include findings tagged at any tier (U-prefix universal, S-prefix convergent, A/G-prefix advanced). Findings ABOVE the plugin's declared tier do not fail the gate at the current ceiling - they appear in `blocked.<next-tier>` instead, as the visible burndown to the next tier. See [`../how-to/climb-from-bronze-to-silver.md`](../how-to/climb-from-bronze-to-silver.md).
