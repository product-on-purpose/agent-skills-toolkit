---
title: "askit-build-statusline"
description: "Creates and improves a Claude Code status line script and its settings registration."
audience: engineer
level: intermediate
---

# askit-build-statusline (reference)

Creates and improves a Claude Code status line script and its settings registration. Claude-only.

## Modes
- `create`: scaffold the script (reads session JSON on stdin, prints one fast line) + register under `statusLine` in settings.
- `improve`: tighten latency, correctness, and the displayed fields.

## Claude-only
Codex has no shipped status line script (it configures a built-in picker via `config.toml`), so this component targets Claude only (Standard sec 2.3); its absence on Codex is not a conformance failure. Recipe: [statusline-recipe](../../skills/askit-build-statusline/references/statusline-recipe.md). See the [build-a-statusline how-to](../how-to/build-a-statusline.md).
