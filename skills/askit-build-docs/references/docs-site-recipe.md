# Docs-site recipe (reference)

The pinned Astro Starlight stack for the `site` mode, adapted from the `../pm-skills` site (the prior-art stack ADR 0021 chose to copy). Stand up a live site as a build-verified slice; this recipe is the contract.

## Dependencies (package.json)

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build && node scripts/post-build-strip-md-links.mjs",
    "preview": "astro preview"
  },
  "dependencies": {
    "@astrojs/starlight": "~0.39.0",
    "astro": "^6.3.0",
    "astro-mermaid": "~2.0.1",
    "sharp": "^0.34.5"
  }
}
```

## astro.config.mjs (the load-bearing decisions)

- **`site` + `base`** set for GitHub Pages project hosting (`https://<org>.github.io` + `/<repo>`). Redirect destinations MUST include the base path - Astro does not auto-prepend the base to redirect targets (a bare destination 404s on the project page); redirect sources stay root-relative (the source side is base-aware).
- **`astro-mermaid` BEFORE `starlight`** in `integrations` (the integration-order rule from the astro-mermaid README). Use `autoTheme: true` so Mermaid follows Starlight light/dark; brand `themeVariables` (lineColor, fontFamily) apply on top of either base theme.
- **In-place `docs/` content collection.** A custom glob loader (`src/content.config.ts`) mounts `./docs` in place rather than copying into `src/content/docs/`, so `entry.filePath` retains the `docs/` prefix.
- **Sidebar (Starlight 0.39 form).** Manual top-level ordering + `autogenerate` within each section. As of Starlight 0.39 the autogenerate shorthand was removed: every labeled section MUST wrap autogenerate in an `items` array - `{ label: 'X', items: [{ autogenerate: { directory: 'docs/X' } }] }`. Autogenerate `directory` paths are prefixed with `docs/` because of the in-place loader (do not "fix" the prefix).
- **`customCss`** points at `src/styles/custom.css` (a minimal port; keep the `.mermaid` rules).

## Post-build link strip

`scripts/post-build-strip-md-links.mjs` rewrites residual `.md` links in the built HTML (the custom-glob-loader setup does not pick up a remark plugin reliably; a post-build HTML rewrite is the reliable fix). The `build` script runs it after `astro build`.

## Deploy

`.github/workflows/deploy-pages.yml` builds and publishes to GitHub Pages. Verify `npm run build` is green locally before the first deploy, and that `site` + `base` match the Pages URL (a `base` mismatch produces a "Site not found" rather than a broken-link symptom).

## Mermaid is a check, not a skill

Diagram validity is enforced as a convention/check (renderable Mermaid), not authored by a dedicated skill. The site renders Mermaid client-side per-page via `astro-mermaid`.
