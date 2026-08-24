---
name: askit-build-docs
description: Creates and improves a plugin's documentation across modes (readme, quickstart, tutorial, how-to, reference, glossary, faq, troubleshooting, architecture, folder-readme, and an Astro Starlight docs site) to the Advanced Skill Library Standard. Use when authoring or refreshing docs, scaffolding a folder README, standing up a docs site, or aligning documentation with the component index.
metadata:
  version: 0.2.0
  tier: universal
  audience: intermediate
---

# askit-build-docs

## Purpose
Author and improve a plugin's human-and-agent-facing documentation, following the builder pattern ([../../docs/reference/builder-pattern.md](../../docs/reference/builder-pattern.md)). `create` scaffolds a doc from the component index and the Standard; `improve` reads `askit-evaluate` findings and the docs and fixes gaps. Doc modes follow the Diataxis split: `readme`, `quickstart`, `tutorial` (learning), `how-to` (task), `reference`, `glossary`, `faq`, `troubleshooting` (information), and `architecture` (an overview that links to a detailed companion, the summary-plus-detailed convention). The `folder-readme` mode scaffolds or refreshes a meaningful folder's `README.md` so its inventory matches the folder's actual children (the `G8` anti-rot guard). The `site` mode stands up an Astro Starlight documentation site from the pinned recipe in [references/docs-site-recipe.md](references/docs-site-recipe.md). Mermaid is a validated convention, not a skill.

## When to use
When authoring or refreshing a plugin's docs, standing up a docs site, or aligning documentation with the component index after a change.

## create mode
1. Read `library.json` + component frontmatter (the index) and the target doc type.
2. Scaffold the doc from the matching Diataxis shape (one purpose per page). README and architecture lead with a summary and link to detail.
3. Cross-link: every relative link must resolve (the U6 reference-link rule is the discipline to mirror).

## improve mode
1. Run `npx agent-skills-toolkit evaluate . --json` and read the docs for drift against the component index (a renamed or removed component leaves a dangling reference).
2. Fix each gap; keep prose tight (the ETH-Zurich finding: verbose context files lower agent task success).

## site mode
1. Follow [references/docs-site-recipe.md](references/docs-site-recipe.md): copy the pinned `../pm-skills` stack (Astro 6 + `@astrojs/starlight` ~0.39 + `astro-mermaid` ~2.0, ordered mermaid-before-starlight), the GitHub Pages `site` + `base`, and the **generated Pattern S** content collection (ADR 0024 D2): the stock `docsLoader()` over `src/content/docs/`, a `gen-docs-site.mjs` generator that emits the public `docs/**` tree there (gitignored, rebuilt via a `generate()` call at the top of `astro.config.mjs`, link-rewritten so the clause-14.11 guard stays green), and curated landing pages on top. Not an in-place glob over `./docs`.
2. Wire the deploy workflow (`.github/workflows/deploy-pages.yml`, triggered on `site/**` and `docs/**`) and verify `npm run build` plus the link/route/untracked guards are green before publishing (standing up a live site is a separate, build-verified slice; the recipe is the contract).

## folder-readme mode
Scaffold or refresh a folder `README.md` whose inventory set-equals the folder's immediate children, so the `folder-readme` (`G8`) check stays green as the folder evolves.
1. List the folder's immediate children with `fs.readdirSync`, dropping `README.md`, gitignored/scratch/tool dirs (`node_modules`, `.git`, `dist`, `.astro`, `_local`, ...), lockfiles, and `.gitkeep`.
2. Emit a README with a frontmatter `title`, a one-to-two-sentence purpose, and an `## Inventory` section listing each remaining child as `- ``name`` - what it is` (a trailing slash marks a subdirectory). For a folder under `docs/`, also carry the full frontmatter taxonomy (`description`, `audience`, `level`) so it passes `G7`.
3. Refresh rather than overwrite: when a README exists, keep its purpose paragraph and existing per-child descriptions, and only add or remove inventory lines so the set matches the current children.
The meaningful-folder allowlist (ADR 0024 D1) is the repo's source and component folders; the repo-root README (the project hero) and `templates/seed-plugin/` (a seed payload, not a folder guide) are excluded.

## Writing rules (all modes)
Four rules, each from a defect found in this repository's own public docs on 2026-08-23 and 2026-08-24.
1. **Every command must run from the reader's position.** A page written for a plugin author must not name `node scripts/*.mjs`: that path exists only in a clone, while the install docs send people to npm or the marketplace. Use the published bin (`npx agent-skills-toolkit [subcommand]`). Where a tool ships with the plugin but NOT the npm package, say which install route provides it rather than dropping the command. Seventy commands across 34 pages had this defect.
2. **No internal planning vocabulary.** Project phases, wave numbers and packet names mean nothing outside this repo, and they rot: one page told readers to wait for a phase that had shipped three months earlier.
3. **Define a coined word in the sentence that first uses it**, and link [the glossary](../../docs/explanation/glossary.md). Product terms (Bronze, Silver, Gold, tier) do not need this; invented ones (burndown, spine, emission, declared-tier ceiling) do.
4. **A reference ID always carries a handle and a route.** Never a bare `E14`; write what it is and link where it lives. A reader cannot look up a number they have no index for.
## Scope
Documentation is Universal (markdown is portable on both agents). The site is the v1 docs surface (ADR 0021/0023); README/CHANGELOG/RELEASE-NOTES discipline is gated by `askit-release` and the release-readiness gate (ADR 0022). Sample sets and eval coverage are authored by `askit-build-samples`, not here.
