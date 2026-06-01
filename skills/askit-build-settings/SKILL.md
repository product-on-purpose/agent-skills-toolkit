---
name: askit-build-settings
description: Creates and improves a plugin's settings and permissions per target and recommends least-privilege allowlists. Use when authoring settings, scoping permissions, wiring environment variables, or registering hooks in settings.
metadata:
  version: 0.1.0
  tier: universal
  audience: advanced
---

# askit-build-settings

## Purpose
Author and improve a plugin's settings and permissions, following the builder pattern ([../../docs/reference/builder-pattern.md](../../docs/reference/builder-pattern.md)). `create` scaffolds the settings per target (Claude Code `settings.json` - permissions, env, hook registration; Codex `config.toml` for the subset it supports); `improve` tightens an existing one. It also folds in permission advice: recommend the least-privilege allowlist a plugin needs, never broader (Standard sec 9). Recipe and the permission rubric are in [references/settings-recipe.md](references/settings-recipe.md).

## When to use
When authoring settings, scoping permissions, wiring environment variables, or registering hooks in settings.

## create mode
1. Read what the plugin actually needs (which tools, which paths, which env, which hooks).
2. Scaffold the settings per target: Claude Code `settings.json` (a `permissions` allow/deny set, `env`, and `hooks` registration); Codex `config.toml` for the subset it supports.
3. Apply least privilege: the allowlist grants only what a component uses; secrets go through `env` indirection, never committed (sec 9).

## improve mode
1. Read the current settings and the components; remove any granted permission no component uses, and tighten an over-broad matcher.

## permission advice
1. For a given component or plugin, recommend the minimal allowlist (the narrowest tool set and path scope it needs) and flag any over-grant. This is the `permission-advisor` role, folded in as a mode rather than a separate skill.

## Scope
Settings are partly cross-agent: Claude Code `settings.json` is the rich surface; Codex `config.toml` supports a subset. Least privilege and secret hygiene are Universal security rules (sec 9). Hook authoring itself is `askit-build-hook`; this skill wires a hook's registration entry. Status line registration is `askit-build-statusline`.
