---
name: askit-build-statusline
description: Creates and improves a Claude Code status line script and its settings registration. Use when authoring a status line, customizing what the status line shows, or wiring its settings entry.
metadata:
  version: 0.1.0
  tier: universal
  audience: advanced
---

# askit-build-statusline

## Purpose
Author and improve a Claude Code status line, following the builder pattern ([../../docs/reference/builder-pattern.md](../../docs/reference/builder-pattern.md)). `create` scaffolds a status line script (it reads the session JSON Claude Code passes on stdin and prints one status line) and registers it under `statusLine` in settings; `improve` tightens an existing one. This is a Claude-only component (F-06 asymmetry): Codex has no shipped status line script - it configures a built-in picker via `config.toml` `tui.status_line` - so the script targets Claude only. Recipe in [references/statusline-recipe.md](references/statusline-recipe.md).

## When to use
When authoring a status line, customizing what it displays, or wiring its settings registration.

## create mode
1. Decide what the line shows (model, cwd, branch, token/context budget) and keep it to a single fast line.
2. Author the script: read the session JSON on stdin, print one line, exit fast (it runs often; no slow calls).
3. Register it under `statusLine` in `settings.json` (or the plugin's settings), pointing at the script with `${CLAUDE_PLUGIN_ROOT}`.

## improve mode
1. Read the script and its registration; tighten latency (no network/slow shells), correctness, and the displayed fields.

## Scope
Claude-only (Standard sec 2.3): the script and its `statusLine` registration are a Claude Code feature; Codex's status line is a built-in picker set in `config.toml`, not a distributable script. A plugin shipping a status line declares it for Claude only; its absence on Codex is not a conformance failure (sec 2.3). Settings/permissions more broadly are `askit-build-settings`.
