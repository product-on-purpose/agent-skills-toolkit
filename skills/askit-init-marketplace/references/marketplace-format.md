# Marketplace format (reference)

A marketplace is a distribution index of plugins. The entry shape is the same across agents; only the file location and native schema differ (Standard sec 12).

## Native locations

| Agent | File | Notes |
|---|---|---|
| Claude Code | `.claude-plugin/marketplace.json` | the native marketplace manifest a user adds as a source |
| Codex | `.agents/plugins/marketplace.json` | Codex's native marketplace (added with `codex plugin marketplace add <path>`; the `marketplace` verb is under the `plugin` group) |

## Entry shape

Each entry catalogs one plugin: its `name`, its `source` (a path or repository the agent can install from), and its `version`. The catalog is keyed/listed so a user can browse and install. Keep the catalog separate from any single plugin's `library.json` or native `plugin.json` - a marketplace lists plugins; it is not itself a plugin (the separation rule, and the anti-pattern is folding a marketplace into a plugin manifest).

## Validation

- **Entry resolves:** each `source` exists and carries a `library.json` (it is a real plugin).
- **Version consistency:** an entry's `version` matches the referenced plugin's `library.json` version.
- **No orphans/dupes:** no entry points at a missing plugin; no plugin is listed twice.

## Registration timing

The Standard registers a plugin in a marketplace at its first tagged release, not before (sec 12). The toolkit additionally reserves its own marketplace debut for its Gold v1.0.0 tag (Decision C) - a product choice, not the normative rule. Scaffolding and validating the index is fine at any tier; publishing an entry waits for the first tagged release.
