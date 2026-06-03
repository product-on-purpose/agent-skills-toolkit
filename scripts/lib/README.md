---
title: "scripts/lib - folder guide"
---

# scripts/lib

The shared library the checks, generators, and gate import: findings, frontmatter parsing, fs helpers, plugin loading, the check registry, and tier mapping.

## Inventory

- `findings.mjs` - finding() and the SEVERITY enum.
- `frontmatter.mjs` - parseFrontmatter() over YAML frontmatter.
- `fs-utils.mjs` - filesystem helpers (relPath and friends).
- `load-plugin.mjs` - loadPlugin() that builds the check context from a plugin root.
- `registry.mjs` - the ordered CHECKS array and runAllChecks().
- `tier.mjs` - the reqId-to-tier mapping and tier ordering.
