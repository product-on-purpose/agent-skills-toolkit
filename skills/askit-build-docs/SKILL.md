---
name: askit-build-docs
description: Creates and improves a plugin's documentation across modes (readme, quickstart, tutorial, how-to, reference, glossary, faq, troubleshooting, architecture, and an Astro Starlight docs site) to the Advanced Skill Library Standard. Use when authoring or refreshing docs, standing up a docs site, or aligning documentation with the component index.
metadata:
  version: 0.1.0
  tier: universal
  audience: intermediate
---

# askit-build-docs

## Purpose
Author and improve a plugin's human-and-agent-facing documentation, following the builder pattern ([../../docs/reference/builder-pattern.md](../../docs/reference/builder-pattern.md)). `create` scaffolds a doc from the component index and the Standard; `improve` reads `askit-evaluate` findings and the docs and fixes gaps. Doc modes follow the Diataxis split: `readme`, `quickstart`, `tutorial` (learning), `how-to` (task), `reference`, `glossary`, `faq`, `troubleshooting` (information), and `architecture` (an overview that links to a detailed companion, the summary-plus-detailed convention). The `site` mode stands up an Astro Starlight documentation site from the pinned recipe in [references/docs-site-recipe.md](references/docs-site-recipe.md). Mermaid is a validated convention, not a skill.

## When to use
When authoring or refreshing a plugin's docs, standing up a docs site, or aligning documentation with the component index after a change.

## create mode
1. Read `library.json` + component frontmatter (the index) and the target doc type.
2. Scaffold the doc from the matching Diataxis shape (one purpose per page). README and architecture lead with a summary and link to detail.
3. Cross-link: every relative link must resolve (the U6 reference-link rule is the discipline to mirror).

## improve mode
1. Run `node scripts/evaluate.mjs . --json` and read the docs for drift against the component index (a renamed or removed component leaves a dangling reference).
2. Fix each gap; keep prose tight (the ETH-Zurich finding: verbose context files lower agent task success).

## site mode
1. Follow [references/docs-site-recipe.md](references/docs-site-recipe.md): copy the pinned `../pm-skills` stack (Astro 6 + `@astrojs/starlight` ~0.39 + `astro-mermaid` ~2.0, ordered mermaid-before-starlight), the in-place `docs/` content-collection loader, the GitHub Pages `site` + `base`, and the post-build link-strip step.
2. Wire the deploy workflow (`.github/workflows/deploy-pages.yml`) and verify `npm run build` is green before publishing (standing up a live site is a separate, build-verified slice; the recipe is the contract).

## Scope
Documentation is Universal (markdown is portable on both agents). The site is the v1 docs surface (ADR 0021/0023); README/CHANGELOG/RELEASE-NOTES discipline is gated by `askit-release` and the release-readiness gate (ADR 0022). Sample sets and eval coverage are authored by `askit-build-samples`, not here.
