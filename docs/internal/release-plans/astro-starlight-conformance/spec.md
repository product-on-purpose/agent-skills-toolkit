# Astro Starlight conformance - spec

> The conformance target and acceptance criteria for bringing the agent-skills-toolkit
> documentation site (`site/`) to FULL compliance with the Product on Purpose family
> Astro site standard. Source packet:
> `agent-plugins/standards/domains/astro-sites/rollout/agent-skills-toolkit.md`.
> Contract: `agent-plugins/standards/domains/astro-sites/SITE-STANDARD.md` (clauses 14.1-14.11).
> Companion: this directory's `release-plan.md` (the executable checklist, owned and updated as work proceeds).

## Goal

Close the last conformance gaps on the toolkit's Astro Starlight site so it satisfies all
of clauses 14.1-14.11. A prior PR already converged the site to 14.1-14.10 (Pattern S, the
stock `docsLoader()`, the `build-site` PR job, the `catalog-coverage` drift guard, `robots.txt`,
base-relative links, and the `@v5` Pages actions). This effort is the remaining P2 polish plus
the one outstanding MUST (14.11 link/route integrity).

## Scope (the verified delta, 2026-06-02 audit re-run)

Each row was re-verified against the repo on branch `astro-starlight-conformance`.

| Clause | Verified state | Action |
|---|---|---|
| 14.2 Framework (branding) | `astro-mermaid` is ordered before `starlight` (correct), but the mermaid theme is `theme: 'default', autoTheme: true` with NO `themeVariables`. `#5C7CFA` exists only as the Starlight CSS accent, not the diagram line color. | Brand the mermaid theme: `mermaidConfig.themeVariables` with `lineColor: '#5C7CFA'`, system-ui font, `fontSize: '14px'`. |
| 14.6 Deploy toolchain | `actions/checkout@v4` + `actions/setup-node@v4` (stale majors); `node-version: "24"` hardcoded in all three `setup-node` steps (`ci.yml` validate + build-site, `deploy-pages.yml` build). Pages actions already `@v5`; `build-site` PR job already present. | Bump `checkout`/`setup-node` to `@v5`; replace every hardcoded `node-version` with `node-version-file: .nvmrc`. |
| 14.8 Versions + Node | `engines.node >=22.12.0` (root + site); `.nvmrc`/`.node-version` = `24`; Astro resolves `6.4.2`. Pin is correct; CI does not yet READ it via `node-version-file`. | Satisfied once 14.6 switches CI to `node-version-file: .nvmrc` (the pin becomes the single CI source of truth). |
| 14.9 Search + SEO (favicon) | Pagefind, sitemap, and `robots.txt` already present. No favicon asset, yet Starlight emits `<link rel="icon" href="{base}/favicon.svg">` on every page, so the live site 404s its favicon (surfaced by the new rendered-link guard, not the static audit). | Add the shared family favicon `site/public/favicon.svg` (`#5C7CFA` three-diamond mark, reused from pm-skills) so the existing reference resolves. |
| 14.11 Link/route integrity | NONE of the four validators present. The nearest (`scripts/checks/reference-links.mjs`, U6) is a filesystem markdown-link check on repo docs, not a built-`dist` guard. | Add the two load-bearing build-aware guards locally (the shared reusable workflow does not exist yet): a rendered-link check (anchors enforced) and a route-parity gate with a committed manifest, run in the PR `build-site` job. |

### Why local guards, not the shared workflow

The packet's preferred path is "adopt the shared reusable workflow (ROADMAP Phase 1)." The
audit confirmed on disk that this infrastructure does not exist yet: `product-on-purpose/.github`
has no `workflows/` directory and zero workflow files, and `@product-on-purpose/astro-docs-preset`
exists only in spec prose. Both are at the design stage (ROADMAP Phase 1, gated on Phase 0). The
packet's sanctioned fallback - implement a local rendered-link check now - is therefore the only
available path. When the shared workflow and preset later ship, the site migrates per ROADMAP
Phase 1.4 (askit is the second pilot). ADR 0026 records this.

### Which validators, and why two of four

Clause 14.11's MUST is two behaviors: (a) no browser-broken internal links or unresolved
`#anchors` in the rendered `dist`, and (b) no silent removal of a published route. The
"four-validator set" is the named reference guardrail, not a mandate to ship all four.

- **Ported (load-bearing):** `check-rendered-links.mjs` satisfies (a); `check-route-parity.mjs`
  satisfies (b). Both are zero-dependency Node, donated by pm-skills (the 14.11 donor).
- **Skipped (justified for a small hand-authored site):** `verify-edit-links.mjs` is built for
  large generated sites (its `MIN_EDIT_LINKS` floor of 100 is meaningless for this site's six
  authored content pages, seven rendered routes once the auto-generated 404 is counted);
  `remark-resolve-links.mjs` exists to repair cross-repo and generated-content links, which a
  six-page hand-authored site does not have (authors write correct base-relative links directly,
  and the rendered-link check is the gate that proves it).

## Non-goals

- Editing `STANDARD.md` (the family Standard text). It is owned by the governance amendment
  process; the Node baseline reconciliation already landed as Standard v0.9 / ADR 0025.
- Editing any other repository (pm-skills, agent-plugins). The guards are ported, not shared.
- A new or repo-specific favicon design. The shared family favicon (`site/public/favicon.svg`,
  the three-diamond family mark in `#5C7CFA`, reused verbatim from pm-skills) IS added, because the
  strict rendered-link guard revealed that Starlight emits `<link rel="icon" href="{base}/favicon.svg">`
  on every page unconditionally; omitting the file is a live 404 on all seven pages, not a clean
  absence. Adding the existing family asset fixes that real broken link, and the shared preset will
  own it later. `og:image` remains deferred to the preset (no reference is emitted for it, so it is
  not a broken link).
- Pushing or merging. Work lands as commits on `astro-starlight-conformance` and a prepared PR;
  the maintainer confirms before any push or merge.

## Placement decision

The link guards live in `site/scripts/` (not the plugin's `scripts/` conformance spine) and run
as CI steps after `npm run build`, NOT as registered checks in `scripts/check.mjs`. Rationale:
they operate on a built `site/dist`, not on plugin source, and `scripts/check.mjs` is the
portable gate downstream plugins run against their own repos where no Astro site exists. This
mirrors the precedent already set by `catalog-coverage.test.mjs` (a site-related test kept out of
the gate registry). Their behavior is proven by `node --test` unit tests in `tests/unit/` that
run a crafted fixture `dist` through each guard.

## Acceptance criteria (done = all true)

1. `ci.yml` and `deploy-pages.yml` use `actions/checkout@v5` + `actions/setup-node@v5` with
   `node-version-file: .nvmrc`; no hardcoded `node-version` literal remains in any workflow.
2. Mermaid diagrams render with the `#5C7CFA` brand line color (`mermaidConfig.themeVariables`
   present in `site/astro.config.mjs`).
3. The PR `build-site` job runs a rendered-link check against `dist` (anchors enforced via
   `STRICT_ANCHORS=1`) and a route-parity check against a committed `site/scripts/route-manifest.txt`;
   both pass on a clean build.
4. The guards are proven robust by `tests/unit/` tests: a clean fixture `dist` passes, a fixture
   with a broken internal link fails, an empty-but-existing `dist` hard-fails (never a silent pass).
5. `cd site && npm run build` is green; `npm test` is green (catalog-coverage + the new guard
   tests); `node scripts/check.mjs` is green (the conformance gate, including U10 no-dashes).
6. `base` remains single-sourced in `astro.config.mjs` (14.7 not regressed); no committed build
   output (14.5 not regressed).
7. ADR 0026 recorded; `CHANGELOG.md` updated; `STATUS.md` test count reconciled. `STANDARD.md`
   untouched. PR(s) prepared, not pushed or merged without maintainer confirmation.
