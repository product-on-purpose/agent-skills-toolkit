# F4 - actionable report UX: the per-check glossary, the universal-checks reference page, and the sub-600px responsive pass - SPEC

> The feature SPEC for **F4** of the **v1.6.0 "manifest completeness + actionable reports"** release. F4 makes an evaluation grade actionable for an author improving a plugin: a consolidated **per-check explanation glossary** rendered once per report (every check, not only the failing ones), a new **`docs/reference/universal-checks.md`** page that closes the rubric gap (Silver and Gold reference pages exist; Universal/Bronze does not), and the **sub-600px responsive pass** that finishes the mobile work the `<=900px` table-scroll fix started.
> Created 2026-06-13. Owner: maintainer. Source of truth: backlog E12 (`docs/internal/backlog/enhancements.md`), the STATUS roadmap P2 item 6. Live status: [`docs/internal/STATUS.md`](../../../STATUS.md).
> Sibling in this release: [`F1-manifest-completeness`](../F1-manifest-completeness/) (the `U13` check). F4 documents and explains `U13`: F4's glossary renders `U13`'s `why` line and F4's `universal-checks.md` page carries its row, so the two ship together as the user-facing v1.6.0 cut. **Cross-dependency:** F1 must add a `U13` `REPORT_META` entry (the renderer-coverage test gates it); F4 owns the glossary that renders the full table and the reference page.

## What this delivers (plain language first)

**For anyone (non-engineer):** a grade is only useful if you can act on it. Today a report tells you which checks passed or failed, but if you have never seen the check before, "U6 failed" does not tell you what U6 is or why it matters. F4 adds a plain-language glossary to every report that explains, in one line each, what each check is for - so a person who has never read the Standard can still understand the result and fix it. It also adds a reference page for the foundational Bronze checks (the equivalent pages for the higher tiers already exist), and makes the report readable on a phone.

**For an engineer:** F4 renders a consolidated glossary section from the existing `REPORT_META` static table (`reqId -> {why, fixPrompt, effort}`), covering every spine check including the PASS/N/A rows that surface no inline `why` today; adds `docs/reference/universal-checks.md` documenting `U1-U13` in the same table format as `silver-checks.md`/`gold-checks.md`; and adds a `@media (max-width:600px)` block to the renderer CSS. All three are deterministic, zero-model, and add no new runtime dependency. The grade is untouched - F4 is presentation and documentation only.

## 1. Goal

Close backlog E12 (report/template UX) and the rubric documentation gap. After F1 adds a new graded requirement (`U13`), a report that names it must also explain it, and the Standard's foundational tier must have a reference page like its higher tiers. F4 does three independent things, none of which touches the deterministic gate or the verdict:

1. **A per-check explanation glossary** rendered once per report (HTML and Markdown), listing every spine check with its one-line `why`, so a reader understands what each PASS/FAIL/WARN/N/A row means without leaving the report.
2. **`docs/reference/universal-checks.md`** - the missing Bronze/Universal reference page, documenting `U1-U13` in the established silver/gold format.
3. **The sub-600px responsive pass** - a `@media (max-width:600px)` block so the report is legible on a phone, finishing the work the shipped `<=900px` table-scroll fix began.

## 2. Background

- **The inline `why` already exists but only on findings.** `scripts/lib/report-render.mjs` reads `metaFor(reqId).why` (from `scripts/lib/report-meta.mjs`'s `REPORT_META` table) and renders it beside a finding in the evidence ledger (HTML row and the Markdown `> Why <reqId> matters:` blockquote). A PASS or N/A row shows status but no `why`, so a reader cannot learn what a check that passed was even testing. The glossary fills that: one place, every check.
- **`REPORT_META` is the report's single source of reader-facing prose** (its docblock: "keeps human-facing remediation prose out of the deterministic check modules ... one table the MD and HTML renderers share so they never diverge"). A `registry-coverage` test in `tests/unit/report-render.test.mjs` fails CI if a spine reqId lacks a row, so the table is always complete. **SPEC refinement:** the STATUS roadmap phrased the glossary as "static from each check's docblock `why:` line"; F4 sources it from `REPORT_META.why` instead, because the docblock `why` is terse and internal-facing while `REPORT_META.why` is the polished reader-facing prose the report already uses. One source for report prose, kept complete by the coverage test. The check docblock `why` stays the code-facing rationale (graded for presence by `G9`).
- **The rubric reference pages are asymmetric.** `docs/reference/silver-checks.md` (S1-S7) and `docs/reference/gold-checks.md` (G1-G10) exist; there is no `universal-checks.md`. A reader climbing from Bronze has detail for the tiers above but not the floor.
- **Responsive state today.** `report-render.mjs` has `@media (max-width:1080px)` (masthead grid) and `@media (max-width:900px)` (rail goes static, two-column nav, `.tablecard{overflow-x:auto}` table scroll) plus `@media print`. Below ~600px the matrix cells, KPI grid, and import cards still crowd.

## 3. Requirements

RFC 2119 language; testable acceptance; stable ids.

### R-GLOSS-1 - a consolidated per-check glossary section renders in HTML and Markdown

The renderer MUST emit a glossary section (one per report) listing every spine check that appears in the status matrix, each with its `reqId`, its id/name, its tier, and its one-line `why` from `REPORT_META`. The section MUST render in both `--format=html` and `--format=md`, from the same data, so the two do not diverge.

- **Acceptance:** a fixture report rendered to MD contains a glossary entry for every reqId in the status matrix with its `why` text; the HTML render contains the same set; a test asserts the rendered glossary reqId set equals the spine reqId set (30 after F1).

### R-GLOSS-2 - the glossary is sourced from REPORT_META and adds zero model tokens

The glossary MUST be built from the static `REPORT_META` table (and the registry for id/tier), with no model call and no new data source. It MUST NOT re-parse check docblocks at render time.

- **Acceptance:** the glossary code path imports only `REPORT_META` and the registry-derived metadata; a grep confirms no model client import in the glossary path; rendering a report makes no network/model call (the renderer is already model-free, this preserves it).

### R-GLOSS-3 - the glossary does not alter the verdict, the matrix, or any count

The glossary is additive presentation. It MUST NOT change `report.tier`, `report.satisfies`, the status matrix, or any finding count. The fidelity check (rendered counts/statuses/tier match the gate output) MUST still pass.

- **Acceptance:** golden-snapshot tests for the existing sections are unchanged except for the added glossary section; the report's `summary`/`tier`/`byRule` are byte-identical pre/post F4; the fidelity test passes.

### R-GLOSS-4 - the glossary has a stable anchor and is in the TOC and the route IA

The glossary section MUST have a stable `id` and appear in the left-docked scroll-spy TOC (HTML) and the section ordering (MD), placed where it aids reading (recommended: after the status matrix / evidence ledger, before or within the methodology/reference block). It MUST carry a section number consistent with the report's numbered-section IA.

- **Acceptance:** the HTML TOC lists the glossary; clicking it scrolls to the section; the section `id` is stable across renders; the MD has the glossary under a numbered heading in the documented order.

### R-UNIV-1 - a new docs/reference/universal-checks.md page documents U1-U13

A new page `docs/reference/universal-checks.md` MUST document every Universal/Bronze check `U1-U9`, `U11-U13` (no `U10`, retired) in the same table format as `silver-checks.md`/`gold-checks.md` (columns: `reqId | Module | What it checks | Standard | Conditional? | Example fix`), with the intro paragraph explaining that Universal is the portable floor every plugin must pass and that these findings gate Bronze (so they gate every tier). It MUST include the new `U13` `skill-registration` row, noting its `warn`-at-0.12 burndown state.

- **Acceptance:** the page lists all 12 Universal reqIds with accurate module paths and Standard-section citations; the `U13` row states the manifest-vs-disk completeness rule and the burndown; a reviewer can diff the reqId set against `registry.mjs`'s universal-tier checks with zero discrepancy.

### R-UNIV-2 - the page satisfies the docs-site contract (G7/G8 + route parity)

The new page MUST carry G7 frontmatter (`title`, `description` with no colon-space, `audience`, `level`, `tags`), be listed in the `docs/reference/README.md` inventory (G8), and be added to `site/scripts/route-manifest.txt` (route parity). `npm run build --prefix site` and the two guards (`check-route-parity.mjs`, `check-rendered-links.mjs`) MUST pass.

- **Acceptance:** `node scripts/check.mjs .` stays Advanced 0/0 (G7/G8 green for the new page); `npm run build --prefix site` succeeds; both route/link guards pass; the page renders on the live site route.

### R-UNIV-3 - the conformance-and-tiers explanation links the new page

`docs/explanation/conformance-and-tiers.md` MUST link `universal-checks.md` beside its existing links to `silver-checks.md`/`gold-checks.md`, and its Universal table (if present) MUST gain the `U13` row, so the three tier reference pages are discoverable as a set.

- **Acceptance:** `conformance-and-tiers.md` links all three reference pages; its check counts read 30 / Standard 0.12 (the F1 sweep, verified here as an F4 acceptance so the doc set is internally consistent at release).

### R-RESP-1 - a sub-600px responsive pass

The renderer CSS MUST gain a `@media (max-width:600px)` block that keeps the report legible on a phone: the rail nav collapses to a single column, the status-matrix cells and KPI/meter/import grids stack to one column, oversized headings scale down, and horizontal padding tightens. It MUST NOT regress the `<=900px` or print behavior.

- **Acceptance:** a manual viewport check at 375px and 600px shows no horizontal overflow of the page body (tables still scroll within their `.tablecard`), the rail nav is single-column, and the KPI/matrix grids are stacked; the `@media print` and `@media (max-width:900px)` blocks are unchanged.

### R-RESP-2 - golden snapshots are regenerated and reviewed

If the responsive CSS changes the rendered HTML string (it does - the `<style>` block grows), the golden HTML snapshots MUST be regenerated (`UPDATE_SNAPSHOTS=1 npm test`) and the diff reviewed to confirm only the `<style>` block (and the new glossary section, R-GLOSS) changed, not any content/finding/verdict.

- **Acceptance:** the snapshot diff is confined to the `<style>` block and the glossary section; `npm test` green after regeneration; the diff is summarized in the PR.

### R-SEQ-1 - F4 lands as one PR (or two adjacent PRs), gate + CI green

F4 ships as one feature PR against protected `main` (or a glossary PR + a docs/responsive PR if cleaner), gate + CI green, behind a 4-lens adversarial review. F4 has no Standard-version implication of its own; the 0.12 bump is F1's. F4's `universal-checks.md` count (30 / 0.12) assumes F1 merged first.

- **Acceptance:** the PR(s) touch only `report-render.mjs`, `report-meta.mjs` (if the glossary needs a tiny helper), the new `universal-checks.md` + its README/route entries, `conformance-and-tiers.md`, the snapshot fixtures, and the renderer tests; gate Advanced 0/0; the review is recorded.

## 4. Fixtures and tests

- Extend `tests/unit/report-render.test.mjs`: the glossary renders in MD and HTML (R-GLOSS-1); the rendered glossary reqId set equals the spine set (R-GLOSS-1); the glossary path uses no model and no docblock re-parse (R-GLOSS-2); the existing section snapshots are unchanged except the added section (R-GLOSS-3); the TOC lists the glossary (R-GLOSS-4).
- Regenerate the golden HTML snapshots (R-RESP-2) and confirm the diff is style+glossary only.
- A docs/link test (the existing route-parity and rendered-links guards) covers `universal-checks.md` (R-UNIV-2).

## 5. Acceptance criteria (feature-level checklist)

- [ ] A glossary section renders once per report in HTML and MD, covering every spine check (30 after F1) with its `why`, sourced from `REPORT_META`, zero model tokens (R-GLOSS-1/2).
- [ ] The glossary does not change the verdict, matrix, or any count; the fidelity test passes (R-GLOSS-3).
- [ ] The glossary has a stable anchor, is in the TOC and the numbered-section order (R-GLOSS-4).
- [ ] `docs/reference/universal-checks.md` documents `U1-U9`, `U11-U13` in the silver/gold format, including `U13` and its burndown note (R-UNIV-1).
- [ ] The new page carries G7 frontmatter, is in the `docs/reference/README.md` inventory and `site/scripts/route-manifest.txt`; the site builds; both guards pass (R-UNIV-2).
- [ ] `conformance-and-tiers.md` links all three reference pages and reads 30 / 0.12 (R-UNIV-3).
- [ ] The `@media (max-width:600px)` block lands; no horizontal page overflow at 375px/600px; `<=900px` and print unchanged (R-RESP-1).
- [ ] Golden snapshots regenerated; the diff is style + glossary only (R-RESP-2).
- [ ] `node scripts/check.mjs .` Advanced 0/0; `npm test` green; no em-dash / en-dash; the 4-lens review ran (R-SEQ-1).

## 6. Out of scope

- **A per-check explanation static-site page beyond the report glossary** (E12's fuller "explanation glossary" vision as standalone docs) - F4 delivers the in-report glossary and the `universal-checks.md` reference; a separate explanation surface is a future pass.
- **Re-parsing check docblocks at render time** - rejected (R-GLOSS-2); `REPORT_META` is the report-prose source.
- **Changing the verdict, the matrix, or any finding** - F4 is presentation and documentation only.
- **A full design refresh of the report** - F4 is the sub-600px finish on the existing design, not a redesign.
- **The Gemini emitter, marketplace scope, and the E4-E10 security/SARIF/semver backlog** - unrelated, carried (PROGRAM-PLAN sec 6).

See the [`F4-report-ux/IMPL-PLAN.md`](./IMPL-PLAN.md) for the file-by-file build and the v1.6.0 [`PROGRAM-PLAN.md`](../PROGRAM-PLAN.md) for sequencing and the F1 cross-dependency.
