# F4 - actionable report UX (glossary + universal-checks page + sub-600px) - implementation plan

> Per-feature cadence: branch from `main`; add the glossary section to the renderer (sourced from `REPORT_META`); write `docs/reference/universal-checks.md` and wire it into the docs-site contract; add the `@media (max-width:600px)` block; regenerate golden snapshots; verify gate Advanced 0/0 and the site build + guards; run a 4-lens adversarial review; squash-merge. One PR (or two adjacent PRs) vs protected `main`, individually green.
>
> F4 is the user-facing companion to F1 in v1.6.0: F1 adds the `U13` check, F4 makes a grade that names `U13` explain and document it. F4 is **deterministic and zero-model** end to end (it renders a static table and ships a static page); it never touches the verdict.

## What F4 is (one paragraph)

A report tells you what passed and failed but not what each check means unless it has a finding. F4 renders a consolidated glossary once per report - every check, its tier, and its one-line `why` from the existing `REPORT_META` table - so a reader who has never read the Standard can understand any row. It adds `docs/reference/universal-checks.md` (the missing Bronze reference page, mirroring the Silver and Gold ones) including the new `U13`. And it adds a `@media (max-width:600px)` CSS block so the report is legible on a phone. None of it changes the grade.

## Steps

Paths are repo-relative to `E:\Projects\product-on-purpose\agent-skills-toolkit`.

### Step 1 - branch

```
git switch main && git pull
git switch -c f4-report-ux
```

(F4 sequences after F1's merge so `universal-checks.md` and `conformance-and-tiers.md` read the 30 / 0.12 spine; if developed in parallel, rebase on F1 before the count edits.)

### Step 2 - the glossary section in the renderer

Edit `scripts/lib/report-render.mjs`. The renderer already has `metaFor(reqId)` (returns `{why, fixPrompt, effort}` from `REPORT_META`) and a numbered-section helper. Add a glossary builder and section:

- **Build** an array `[{reqId, id, tier, tierName, why}]` for every reqId in the status matrix (`m.rows`), using `metaFor(r.reqId).why` and the registry-derived `id`/`tier` already on each row. Reuse the existing `m.rows` so the glossary set equals the matrix set by construction (R-GLOSS-1, R-GLOSS-3).
- **MD render:** a numbered section (placed after the evidence ledger, before methodology - confirm the numbering against the IA so downstream section numbers stay correct) with a table `| Check | Tier | What it verifies |` (`reqId id`, `tierName`, `why`). Reuse the existing `mdTable` helper.
- **HTML render:** a `<section id="glossary">` using the established section shell (`section(num, id, title, lead, body)` at line ~679), with a definition-list or compact table styled like the existing `.ledger`/`.tablecard`. Add the section to the TOC builder (the `targets`/rail nav) so the scroll-spy lists it (R-GLOSS-4).
- **No new source:** import nothing beyond `REPORT_META` (already imported via `metaFor`) and the registry metadata already in scope (R-GLOSS-2). No docblock parsing at render time.

Keep the glossary purely derived from `m.rows` + `metaFor`, so it cannot diverge from the matrix and adds no count.

### Step 3 - the universal-checks.md reference page

Create `docs/reference/universal-checks.md`, mirroring `silver-checks.md`/`gold-checks.md` exactly:

```markdown
---
title: "Universal (Bronze) conformance checks"
description: "Twelve checks (U1-U9, U11-U13) form the portable Bronze floor every plugin must pass."
audience: engineer
level: intermediate
tags: [conformance, bronze, universal, standard]
---

# Reference: Universal (Bronze) conformance checks

The Universal tier is the portable floor: every plugin must pass it, on any agent, regardless of house style. Each check fires findings tagged `reqId: "U<n>"`; `tier-report` buckets them into the `universal` tier and a Universal error fails the gate at every tier (Bronze gates Silver and Gold). U10 (no-dashes) was retired from the spine in v1.2.0 (ADR 0028).

| reqId | Module | What it checks | Standard | Conditional? | Example fix |
|---|---|---|---|---|---|
| U1 | `scripts/checks/library-json.mjs` | ... | sec 5.1 | no | ... |
| ... | ... | ... | ... | ... | ... |
| U13 | `scripts/checks/skill-registration.mjs` | every skill on disk is registered in the plugin's manifest (library.json components, else marketplace plugins); on-disk-but-unregistered is invisible to installers, registered-but-missing is undeliverable | sec (new U13 clause) | no | Add the unregistered skill to `library.json` `components.skills[]` (or the marketplace `plugins[]` catalog). |
```

Fill every `U1-U9`, `U11-U13` row from the check modules' actual behavior and Standard-section citations (cross-check each against its `scripts/checks/*.mjs` and the `REPORT_META.why`/`fixPrompt`). The `U13` row carries the burndown note (warn at 0.12, error at 0.13).

Wire the docs-site contract (R-UNIV-2):
- Add the page to the `## Inventory` list in `docs/reference/README.md` (G8).
- Add its route to `site/scripts/route-manifest.txt` (route parity).
- Confirm G7 frontmatter (no colon-space in `description` - the example above uses "U1-U13" not a colon).

### Step 4 - link it from conformance-and-tiers (R-UNIV-3)

Edit `docs/explanation/conformance-and-tiers.md`: add the `universal-checks.md` link beside the `silver-checks.md`/`gold-checks.md` links; add the `U13` row to its Universal table if it carries one; confirm its counts read 30 / Standard 0.12 (the F1 sweep; verified here so the doc set is internally consistent at release).

### Step 5 - the sub-600px responsive block

Edit the `<style>` block in `scripts/lib/report-render.mjs`, adding after the `@media (max-width:900px)` rule (line ~613) and before `@media print`:

```css
@media (max-width:600px){
  .rail nav{columns:1}
  .wrap{padding:0 16px}
  .mh-id h1{font-size:26px}
  .kpis,.meter-grid,.gtiles{grid-template-columns:1fr}
  .matrixzone .cells{grid-template-columns:1fr}     /* status matrix stacks */
  .imp .ifgrid{grid-template-columns:1fr}
  section{padding:30px 0 4px}
  .glossary table{min-width:0}                       /* glossary wraps, not scrolls, on a phone */
}
```

(Confirm the exact class names against the rendered HTML - the grep showed `.kpi`, `.meter`, `.gtile`, `.cell`, `.lrow`, `.imp`, `.ifgrid`; use the real container/grid class names.) Do not alter the `<=900px` or print blocks (R-RESP-1).

### Step 6 - regenerate golden snapshots

```
UPDATE_SNAPSHOTS=1 npm test
git diff -- tests/**/__snapshots__ tests/fixtures/**/*.html
```

Confirm the diff is confined to the `<style>` block (the new media query) and the new glossary section - no content, finding, count, or verdict change (R-RESP-2, R-GLOSS-3). Summarize the diff in the PR.

### Step 7 - verify

| Command | Expected |
|---|---|
| `node scripts/evaluate.mjs . --format=md` | the rendered MD contains a glossary section listing all 30 checks with their `why`. |
| `node scripts/evaluate.mjs . --format=html --out /tmp/r.html` | the HTML has a `#glossary` section in the TOC; opening it at 375px width shows no body overflow. |
| `node scripts/check.mjs .` | Advanced 0/0 on the 30-check spine (G7/G8 green for the new page). |
| `npm run build --prefix site` | succeeds; `universal-checks.md` renders at its route. |
| `node site/scripts/check-route-parity.mjs && node site/scripts/check-rendered-links.mjs` | both green. |
| `npm test` | green incl. the new glossary tests and the regenerated snapshots. |
| `git grep -nE "silver-checks\|gold-checks" docs/explanation/conformance-and-tiers.md` | now also matches `universal-checks`. |

## Adversarial review

4-lens read-only review before merge:

- **Fidelity (no verdict drift).** Confirm the glossary changes no count, status, tier, or finding; the fidelity test passes; the snapshot diff is style + glossary only. The glossary is derived from `m.rows`, so it cannot list a check the matrix does not.
- **Completeness / drift.** Confirm the glossary reqId set equals the spine set (30); confirm `universal-checks.md` documents exactly the universal-tier reqIds in `registry.mjs` (no missing/extra row); confirm the `U13` row matches the module and `REPORT_META`.
- **Docs-site contract.** Confirm G7 frontmatter (no colon-space in `description`), the README inventory entry, the route-manifest entry, the site build, and both guards. Confirm `conformance-and-tiers.md` reads 30 / 0.12 and links all three pages.
- **Responsive / determinism.** Confirm no horizontal overflow at 375px/600px; the `<=900px` and print blocks are byte-unchanged; the renderer remains synchronous and model-free; no new runtime dependency, no binary asset.

Fix every confirmed finding before merge; record the review.

## The PR

- **Title:** `feat(report): per-check glossary + universal-checks reference page + sub-600px responsive (E12)`
- **Body outline:**
  - **What:** a consolidated per-check glossary rendered once per report (HTML + MD) from `REPORT_META`; a new `docs/reference/universal-checks.md` documenting `U1-U13`; a `@media (max-width:600px)` block.
  - **Why:** backlog E12 - a grade is only actionable if the reader can learn what each check means; the Bronze tier had no reference page while Silver and Gold did; the report crowded below 600px.
  - **How it stays safe:** the glossary is derived from the status-matrix rows and the static `REPORT_META` table, so it adds no count and cannot move the verdict (fidelity test); the responsive change is CSS-only; the new page is graded by G7/G8 and the site guards.
  - **Cross-dependency:** assumes F1 merged (the `U13` row and the 30 / 0.12 counts); F1 owns the `U13` `REPORT_META` entry (renderer-coverage test), F4 owns the page and the glossary.
  - **Verification:** gate Advanced 0/0; site build + both guards green; snapshot diff is style + glossary only; the 4-lens review ran.
  - **Trailer:** `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Rollback / risk notes

- **Pure presentation + docs.** A revert removes the glossary section, the page, and the media query; no verdict, count, or check is affected, so a revert strands nothing.
- **Sequencing on F1.** F4's count edits (30 / 0.12) and the `U13` row assume F1. If F1 slips, hold F4's count edits and ship the glossary + responsive against the 29-check spine, backfilling `U13` when F1 lands. The release should not cut F1 without F4's `U13` documentation (shipping a graded requirement with no reference page is the rubric gap F4 closes).
- **Snapshot churn.** The golden HTML snapshots regenerate; the review confirms the diff is style + glossary only, so a content regression cannot hide in the snapshot update.
