import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';

// The toolkit's documentation site (Astro Starlight), adapted from the pinned
// ../pm-skills stack per ADR 0021/0023. Lives in this isolated site/ subdir so the
// toolkit's core (a zero-dependency, portable validation spine) stays uncontaminated
// by the frontend toolchain. Deployed to GitHub Pages by .github/workflows/deploy-pages.yml.
export default defineConfig({
  // GitHub Pages project hosting: https://<org>.github.io/<repo>. The base path MUST be
  // present or project-page assets 404 (see docs-site-recipe.md).
  site: 'https://product-on-purpose.github.io',
  base: '/agent-skills-toolkit',
  integrations: [
    // astro-mermaid MUST come before starlight (integration-order rule). autoTheme follows
    // Starlight's light/dark.
    mermaid({ theme: 'default', autoTheme: true }),
    starlight({
      title: 'agent-skills-toolkit',
      description:
        'Toolkit and Standard for authoring, validating, governing, and scaling cross-agent skill libraries (Claude Code and Codex) to a tiered Bronze/Silver/Gold quality bar.',
      editLink: {
        baseUrl: 'https://github.com/product-on-purpose/agent-skills-toolkit/edit/main/site/',
      },
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        { label: 'Start here', items: [{ slug: 'overview' }, { slug: 'getting-started' }] },
        { label: 'The Standard', items: [{ slug: 'the-standard' }, { slug: 'tiers' }] },
        { label: 'The catalog', items: [{ slug: 'catalog' }] },
      ],
    }),
  ],
});
