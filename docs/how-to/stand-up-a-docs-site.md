# How to stand up a docs site

Build a plugin's Astro Starlight documentation site with `askit-build-docs` (site mode).

## Scaffold

Invoke `askit-build-docs` (site mode). It copies the pinned stack (Astro 6 + Starlight ~0.39 + astro-mermaid ~2.0) per [docs-site-recipe](../../skills/askit-build-docs/references/docs-site-recipe.md): `package.json` deps + build script, `astro.config.mjs` (mermaid before starlight; `site` + `base` for GitHub Pages; the in-place `docs/` content loader; the Starlight 0.39 `items`-wrapped sidebar), `src/content.config.ts`, `src/styles/custom.css`, and `scripts/post-build-strip-md-links.mjs`.

## Verify before publishing

Run `npm run build` and confirm it is green. Check that `site` + `base` match the GitHub Pages URL (a `base` mismatch yields "Site not found", not a broken link). Then wire `.github/workflows/deploy-pages.yml` and deploy.

## Author the pages

Use the Diataxis doc modes (`readme`, `quickstart`, `tutorial`, `how-to`, `reference`, `glossary`, `faq`, `troubleshooting`, `architecture`) to fill the content; the sidebar autogenerates within each section.

## See also

- [`askit-build-docs` reference](../reference/askit-build-docs.md)
- [docs-site-recipe](../../skills/askit-build-docs/references/docs-site-recipe.md)
