---
title: "Choose agent-targets"
description: "Decide which agents a plugin should target, and which tier to aim for, with `askit-capability-advisor`."
audience: engineer
level: intermediate
---

# How to choose agent-targets

Decide which agents a plugin should target, and which tier to aim for, with `askit-capability-advisor`.

## Advise (before you build)

Invoke `askit-capability-advisor` (advise mode) with your target agents (`claude`, `codex`, or both). It reports which component types are plugin-distributable on each, names the asymmetries (subagents, output styles, and statuslines are Claude-only; a command's Codex form is its backing skill; hooks are a Codex subset), and recommends a tier path (Bronze, Silver, Gold) from the agents and components you plan.

## Check (before you release)

Invoke `askit-capability-advisor` (check mode) on a component or the whole plugin. It reads the declared `agent-targets` and reports whether each component can run on each declared target, flagging a Claude-only component carried under a `codex` target. The fix is a per-component `agent-targets: [claude]` override, or moving the component into a Claude-only plugin.

## See also

- [`askit-capability-advisor` reference](../reference/askit-capability-advisor.md)
- [capability-matrix](../../skills/askit-capability-advisor/references/capability-matrix.md)
- [emit-for-multiple-agents](emit-for-multiple-agents.md)
