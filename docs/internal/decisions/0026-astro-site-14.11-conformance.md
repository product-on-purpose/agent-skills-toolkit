# 0026 - Reach full Astro site conformance: local 14.11 link/route guards, node-version-file, branded mermaid

## TL;DR
- **Decision:** Close the toolkit site's remaining family Astro site standard gaps now: implement the clause 14.11 link/route guards LOCALLY (a rendered-link check + a route-parity gate, ported from pm-skills), switch CI to `node-version-file: .nvmrc` with `@v5` actions (14.6/14.8), and brand the mermaid theme (14.2). Port two of the four reference validators; skip the other two with cause.
- **Why:** The shared reusable workflow and the `astro-docs-preset` the packet would prefer do not exist yet (verified on disk), and 14.11 is a MUST. The sanctioned fallback is a local guard now, migrating to the shared infrastructure when it ships.
- **Status:** Proposed (lands with the `astro-starlight-conformance` PR).

- **Status:** Proposed
- **Date:** 2026-06-02
- **Deciders:** maintainer (jprisant), with Claude (Opus 4.8)

## Builds on
- ADR 0021 (documentation, examples, and docs-site strategy) - established the Astro Starlight site and the pinned pm-skills-derived stack.
- ADR 0025 (raise the runner Node baseline from EOL Node 20 to Node 22.12, pin 24) - the Node floor and the committed `.nvmrc`/`.node-version` pin this change makes CI actually read.
- The proposed family Astro site standard, Section 14 (clauses 14.1-14.11), owned in `agent-plugins/standards/domains/astro-sites/SITE-STANDARD.md`. Not yet landed in `STANDARD.md`; this ADR records the toolkit site's conformance to it as the proposed reference.

## Context and problem statement
A prior PR converged the toolkit's `site/` to clauses 14.1-14.10 (Pattern S, the stock `docsLoader()`, the `build-site` PR job, the `catalog-coverage` drift guard, `robots.txt`, base-relative links, and the `@v5` Pages actions) and deliberately deferred three items. The 2026-06-02 rollout packet and a re-audit confirm the remaining delta:

1. **14.11 (link and route integrity) is unmet and is a MUST.** None of the four build-aware validators exist; the nearest check (`reference-links.mjs`, U6) validates markdown links on the filesystem, not the rendered `dist`. A Starlight page serves at `slug/index.html`, one URL level deeper than its source, so a filesystem-correct link can still 404 in the browser, and a removed route silently 404s every existing bookmark.
2. **14.6/14.8 (toolchain) is partial.** CI hardcodes `node-version: "24"` in all three `setup-node` steps instead of reading the committed `.nvmrc` via `node-version-file`, and `checkout`/`setup-node` are at `@v4` while the family pins `@v5`.
3. **14.2 (branding) is partial.** `astro-mermaid` is correctly ordered before `starlight`, but the mermaid theme is unbranded (`theme: 'default'` with no `themeVariables`).

The packet's preferred remedy for 14.11 is to adopt the shared reusable CI workflow (ROADMAP Phase 1). That infrastructure does not exist: `product-on-purpose/.github` has no `workflows/` directory and zero workflow files, and `@product-on-purpose/astro-docs-preset` exists only in spec prose. Both are at the design stage, gated on earlier ROADMAP phases. So the decision is how to satisfy a MUST today without the not-yet-built shared payload, and how much of the four-validator reference set a small, hand-authored site (six authored content pages; seven rendered routes once Astro's auto-generated 404 is counted) actually needs.

## Decision drivers
- 14.11 is a MUST; a documented absence of the shared workflow cannot be a reason to ship a non-conformant site.
- The toolkit core is a zero-dependency, portable validation spine; site build-aware guards must not contaminate it or burden downstream plugins that have no site.
- Reproducibility: the committed `.nvmrc` should be the single CI source of truth for the Node version.
- Do not hand-roll throwaway branding assets the shared preset will own (the standard's stated preference for `og:image`, applied here to a favicon too).
- Minimize future migration cost: the local guards should be a clean, parameterized port of the donor so adopting the shared workflow later is a swap, not a rewrite.

## Considered options
1. **Implement the two load-bearing 14.11 guards locally now, port two of four, modernize the toolchain, brand mermaid.** (chosen) Satisfies 14.11's two MUST behaviors (no browser-broken links/anchors; no silent route removal) with `check-rendered-links.mjs` and `check-route-parity.mjs` in `site/scripts/`, run as PR-build steps. Skips `verify-edit-links.mjs` (its 100-link floor is meaningless for six pages) and `remark-resolve-links.mjs` (no cross-repo or generated-content links to repair).
2. **Wait for the shared reusable workflow + preset (ROADMAP Phase 1), then adopt.** Rejected for now: the infrastructure is unbuilt and gated on earlier phases, so this leaves a MUST unmet for an unbounded time. It remains the destination (Phase 1.4 names the toolkit as the second pilot); the local guards are the bridge.
3. **Port all four validators.** Rejected: `verify-edit-links` and `remark-resolve-links` solve problems a six-page hand-authored site does not have, adding maintenance surface (a 100-link floor that is wrong here, an mdast transform with no relative `.md` links to resolve) for no conformance gain. The MUST is the two behaviors, not the count of files.
4. **Put the guards in the plugin `scripts/` conformance spine.** Rejected: they operate on a built `site/dist`, not plugin source, and `scripts/check.mjs` is the portable gate downstream plugins run where no site exists. They live in `site/scripts/` and run as CI steps, mirroring the `catalog-coverage.test.mjs` precedent (a site test kept out of the gate registry).

## Decision outcome
Chosen: **option 1.** Two zero-dependency guards land in `site/scripts/` (`check-rendered-links.mjs` with anchors enforced via `STRICT_ANCHORS=1`, and `check-route-parity.mjs` against a committed `site/scripts/route-manifest.txt`) and run after `npm run build` in the `build-site` PR job. Each guard preserves the standard's normative robustness contract (hard-fail an empty-but-existing `dist`, decode defensively, fail on its own assertions not on a parse error) and is proven by a `node --test` unit test that exercises a clean fixture, a broken-link fixture, and an empty `dist`. CI switches to `node-version-file: .nvmrc` with `actions/checkout@v5` + `actions/setup-node@v5`; the mermaid theme gains `mermaidConfig.themeVariables` (`lineColor: '#5C7CFA'`, system-ui, 14px). The shared family favicon `site/public/favicon.svg` (the `#5C7CFA` three-diamond mark, reused verbatim from pm-skills) is added: on its first run the strict rendered-link guard found that Starlight emits `<link rel="icon" href="{base}/favicon.svg">` on every page, which 404s when no file is shipped, so this fixes a real broken link rather than introducing a new branding asset (the original plan to skip a favicon assumed, wrongly, that omitting it meant no reference). `og:image` remains deferred to the preset (no reference is emitted, so it is not a broken link). `STANDARD.md` is untouched.

## Consequences
- **Positive:** the site satisfies all of 14.1-14.11; the committed `.nvmrc` is the single CI source of truth; diagrams are on-brand; a removed route or a browser-broken link now fails the PR build, the one place real user harm was live. The guard proved its worth immediately, catching a live favicon 404 on all seven pages that the static audit had missed.
- **Negative:** two guard scripts are temporarily duplicated from pm-skills until the shared workflow ships; they carry an inline `BASE` literal that must track `astro.config.mjs` (mitigated by a comment and the route-parity guard being base-agnostic). Migration to the shared workflow (Phase 1.4) is tracked, not eliminated.
- **Neutral:** the guards are site-scoped (`site/scripts/`, run in CI) and never enter the portable plugin gate, so downstream plugins without a site are unaffected; the toolkit's `library.json` `standard` field is unchanged by this site-only work.
