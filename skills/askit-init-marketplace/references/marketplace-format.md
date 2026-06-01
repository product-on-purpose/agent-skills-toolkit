# Marketplace format (reference)

A marketplace is a distribution index of plugins. The entry shape is the same across agents; only the file location and native schema differ (Standard sec 12).

## Native locations

| Agent | File | Notes |
|---|---|---|
| Claude Code | `.claude-plugin/marketplace.json` | the native marketplace manifest a user adds as a source |
| Codex | `.agents/plugins/marketplace.json` | Codex's native marketplace (added with `codex marketplace add <path>`) |

## Entry shape

Each entry catalogs one plugin: its `name`, its `source` (a path or repository the agent can install from), and its `version`. The catalog is keyed/listed so a user can browse and install. Keep the catalog separate from any single plugin's `library.json` or native `plugin.json` - a marketplace lists plugins; it is not itself a plugin (the separation rule, and the anti-pattern is folding a marketplace into a plugin manifest).

## Validation

- **Entry resolves:** each `source` exists and carries a `library.json` (it is a real plugin).
- **Version consistency:** an entry's `version` matches the referenced plugin's `library.json` version.
- **No orphans/dupes:** no entry points at a missing plugin; no plugin is listed twice.

## Registration timing

Per decision D8, a plugin is registered in a marketplace only at its first Gold tag. Scaffolding and validating the index is fine at any tier; publishing an entry waits for Gold.
