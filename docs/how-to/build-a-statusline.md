---
title: "Build a status line"
description: "Author a Claude Code status line with `askit-build-statusline`."
audience: engineer
level: intermediate
---

# How to build a status line

Author a Claude Code status line with `askit-build-statusline`.

## Scaffold (create)

Invoke `askit-build-statusline` (create mode). Decide what the line shows (model, cwd, branch, context budget), then author a script that reads the session JSON on stdin and prints one short line fast (no network or slow shells - it runs often). Register it under `statusLine` in settings, pointing at the script via `${CLAUDE_PLUGIN_ROOT}`.

## Improve

Invoke `askit-build-statusline` (improve mode) to tighten an existing line: drop slow calls, fix the displayed fields, keep it to one line.

## Claude-only

A status line script is a Claude Code feature; Codex uses a built-in picker set in `config.toml`. Declare the component for Claude only; its absence on Codex is fine (Standard sec 2.3).

## See also

- [`askit-build-statusline` reference](../reference/askit-build-statusline.md)
- [statusline-recipe](../../skills/askit-build-statusline/references/statusline-recipe.md)
