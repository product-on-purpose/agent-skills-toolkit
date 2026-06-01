---
name: askit-init-marketplace
description: Creates and validates a marketplace index that catalogs plugins for Claude Code and Codex, checking each entry, its plugin reference, and version consistency. Use when standing up a marketplace, adding a plugin to a marketplace, or validating marketplace entries.
metadata:
  version: 0.1.0
  tier: universal
  audience: advanced
---

# askit-init-marketplace

## Purpose
Scaffold and validate a distribution index that catalogs plugins, in each target's native format. `create` scaffolds the marketplace index per target; `validate` checks that every entry resolves to a real plugin and that versions are consistent. The two native formats and the entry shape are in [references/marketplace-format.md](references/marketplace-format.md).

## When to use
When standing up a marketplace, adding a plugin to one, or validating marketplace entries.

## create mode
1. Read the target agents and the plugin roster to catalog.
2. Scaffold the index per target: Claude Code `.claude-plugin/marketplace.json`; Codex `.agents/plugins/marketplace.json` (Standard sec 12). Each entry names the plugin, its source or path, and its version.
3. Keep the catalog separate from any single plugin's manifest (a marketplace catalogs plugins; it is not itself a plugin).

## validate mode
1. Each entry resolves to a real plugin (its source/path exists and carries a `library.json`).
2. Versions are consistent (an entry's version matches the plugin's `library.json` version; no dangling or duplicate entries).

## Scope
A marketplace catalogs plugins for distribution; it is a separate artifact from the plugins it lists (the marketplace-vs-plugin separation rule). Per D8, marketplace registration happens only at a plugin's first Gold tag - this skill scaffolds and validates the index, but a plugin is not registered before it earns Gold. `askit-init-plugin` scaffolds a plugin; this skill scaffolds the marketplace that lists plugins.
