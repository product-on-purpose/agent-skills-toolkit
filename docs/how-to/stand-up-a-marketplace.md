# How to stand up a marketplace

Catalog plugins for distribution with `askit-init-marketplace`.

## Scaffold (create)

Invoke `askit-init-marketplace` (create mode) with the target agents and the plugin roster. It scaffolds the native index per target: Claude Code `.claude-plugin/marketplace.json`, Codex `.agents/plugins/marketplace.json` (Standard sec 12). Each entry names a plugin, its source/path, and its version. Keep the catalog separate from any single plugin's manifest.

## Validate

Invoke `askit-init-marketplace` (validate mode) to confirm every entry resolves to a real plugin (its source carries a `library.json`), versions match, and there are no orphan or duplicate entries.

## When to publish

Scaffolding and validating the index is fine at any tier. Per decision D8, a plugin is registered in the marketplace only at its first Gold tag.

## See also

- [`askit-init-marketplace` reference](../reference/askit-init-marketplace.md)
- [marketplace-format](../../skills/askit-init-marketplace/references/marketplace-format.md)
