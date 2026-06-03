---
title: "askit-build-docs"
description: "Creates and improves a plugin's documentation, including an Astro Starlight docs site, following the builder pattern."
audience: engineer
level: intermediate
---

# askit-build-docs (reference)

Creates and improves a plugin's documentation, including an Astro Starlight docs site, following the builder pattern.

## Modes
- `create` / `improve`: scaffold a doc from the component index, or fix drift against `askit-evaluate` findings.
- Diataxis doc types: `readme`, `quickstart`, `tutorial`, `how-to`, `reference`, `glossary`, `faq`, `troubleshooting`, `architecture` (summary + linked detail).
- `site`: stand up an Astro Starlight site from the pinned recipe.

## The site stack
Astro 6 + `@astrojs/starlight` ~0.39 + `astro-mermaid` ~2.0 (mermaid before starlight), the stock `docsLoader()` over a generated Pattern S view of `docs/**` (emitted by `gen-docs-site.mjs` at astro config load, gitignored, link-rewritten), GitHub Pages `site` + `base`. Full recipe + gotchas: [docs-site-recipe](../../skills/askit-build-docs/references/docs-site-recipe.md).

## Boundaries
README/CHANGELOG/RELEASE-NOTES gating belongs to `askit-release`; sample sets and eval coverage to `askit-build-samples`; Mermaid validity is a check, not a skill. See the [stand-up-a-docs-site how-to](../how-to/stand-up-a-docs-site.md).
