---
title: "Build an output style"
description: "Author a Claude Code output style (a response mode)."
audience: engineer
level: intermediate
---

# How to build an output style

Author a Claude Code output style (a response mode). Claude-only (Standard sec 2.3).

## 1. Create

Invoke `askit-build-output-style` (create mode). It asks for the style's purpose (when Claude should use it) and the response shape it enforces (structure, tone, length), then scaffolds the output-style markdown from `templates/output-style.md`.

## 2. Declare Claude-only

Set `agent-targets: [claude]`. Output styles have no Codex or cross-agent equivalent; state that plainly rather than emitting nothing for other targets.

## 3. Register and validate

Add it to `library.json` `components.outputStyles`, then:

    node scripts/evaluate.mjs . --json

## See also

- [`askit-build-output-style` reference](../reference/askit-build-output-style.md)
- [authoring-output-styles](../../skills/askit-build-output-style/references/authoring-output-styles.md)
