---
title: "scripts/generators - folder guide"
---

# scripts/generators

Generators that produce the committed artifacts (INDEX.md, the native per-agent manifests, AGENTS.md) deterministically from library.json plus component frontmatter.

## Inventory

- `gen-index.mjs` - regenerates INDEX.md from library.json plus component frontmatter.
- `gen-manifest.mjs` - regenerates the native per-agent manifests and manifest.generated.json.
- `sync-agents-md.mjs` - regenerates the root AGENTS.md component map.
