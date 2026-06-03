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
    // Starlight's light/dark. Brand the diagram line color (#5C7CFA) + system-ui font per the
    // family Astro site standard 14.2 (mirrors the pm-skills reference); the shared preset will
    // own this once it lands.
    mermaid({
      theme: 'default',
      autoTheme: true,
      mermaidConfig: {
        themeVariables: {
          lineColor: '#5C7CFA',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
          fontSize: '14px',
        },
      },
    }),
    starlight({
      title: 'agent-skills-toolkit',
      description:
        'Toolkit and Standard for authoring, validating, governing, and scaling cross-agent skill libraries (Claude Code and Codex) to a tiered Bronze/Silver/Gold quality bar.',
      editLink: {
        baseUrl: 'https://github.com/product-on-purpose/agent-skills-toolkit/edit/main/site/',
      },
      customCss: ['./src/styles/custom.css'],
      // The curated landing sections sit on top of the generated Pattern S view of docs/ (ADR 0024
      // D2). The four quadrant sections below autogenerate from the pages gen-docs-site.mjs emits
      // into src/content/docs/{tutorials,how-to,reference,explanation}/ (stock docsLoader, so the
      // autogenerate `directory` is the slug-relative quadrant, not a docs/-prefixed path). The
      // generator runs in `prebuild`/`predev`, so these directories always exist at config-load time.
      sidebar: [
        { label: 'Start here', items: [{ slug: 'overview' }, { slug: 'getting-started' }] },
        { label: 'The Standard', items: [{ slug: 'the-standard' }, { slug: 'tiers' }] },
        { label: 'The catalog', items: [{ slug: 'catalog' }] },
        { label: 'Tutorials', items: [{ autogenerate: { directory: 'tutorials' } }] },
        { label: 'How-to guides', items: [{ autogenerate: { directory: 'how-to' } }] },
        { label: 'Reference', items: [{ autogenerate: { directory: 'reference' } }] },
        { label: 'Explanation', items: [{ autogenerate: { directory: 'explanation' } }] },
      ],
    }),
  ],
});
