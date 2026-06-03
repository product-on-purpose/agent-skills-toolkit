---
title: "scripts/checks - folder guide"
---

# scripts/checks

One module per Standard requirement (reqId); each exports meta plus a synchronous check(ctx) that returns findings, and is registered in scripts/lib/registry.mjs.

## Inventory

- `agent-targets.mjs` - the agent-targets module.
- `agentskills.mjs` - the agentskills module.
- `anatomy.mjs` - the anatomy module.
- `chain-contract.mjs` - the chain-contract module.
- `command-contract.mjs` - the command-contract module.
- `components-index.mjs` - the components-index module.
- `components-mirror.mjs` - the components-mirror module.
- `deprecation.mjs` - the deprecation module.
- `description-score.mjs` - the description-score module.
- `docs-frontmatter.mjs` - the docs-frontmatter module.
- `folder-readme.mjs` - the folder-readme module.
- `frontmatter-valid.mjs` - the frontmatter-valid module.
- `hook-documentation.mjs` - the hook-documentation module.
- `index-drift.mjs` - the index-drift module.
- `instruction-budget.mjs` - the instruction-budget module.
- `library-json.mjs` - the library-json module.
- `library-regression.mjs` - the library-regression module.
- `manifest-drift.mjs` - the manifest-drift module.
- `mcp-valid.mjs` - the mcp-valid module.
- `mermaid-valid.mjs` - the mermaid-valid module.
- `name-matches-dir.mjs` - the name-matches-dir module.
- `no-dashes.mjs` - the no-dash PreToolUse guard script.
- `per-target-presence.mjs` - the per-target-presence module.
- `prefix.mjs` - the prefix module.
- `reference-links.mjs` - the reference-links module.
- `release-notes.mjs` - the release-notes module.
- `self-hosting.mjs` - the self-hosting module.
- `version-match.mjs` - the version-match module.
- `workflow-skills.mjs` - the workflow-skills module.
