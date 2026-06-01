# 0024 - Documentation depth, discoverability conventions, and the full docs-site mount

## TL;DR
- **Decision:** Run the documentation, learning, and discoverability build-out as a full-scope but staged effort that finishes ADR 0021 and adds three new conventions. Three forks resolved: (1) source files are documented by **folder-READMEs + header docblocks**, never a sibling `.md` per source file; (2) the Astro Starlight site becomes the **generated in-place-glob view of `docs/**`** (ADR 0021 D3) with a curated landing on top; (3) all of it is in scope, delivered as a sequence of small, individually-green PRs under an **author-before-enforce** ordering. Add **five new deterministic checks** (one Bronze, four Gold), taking the spine from 25 to **30 checks (U1-U12 / S1-S8 / G1-G10)**. No new prefix skills - new capability is checks + conventions + `askit-build-docs` modes. Fix the long-standing G7 requirement-vs-check confusion.
- **Why:** ADR 0021 specified a dual-audience Diataxis documentation set but only half of it shipped; the maintainer's bar is two-doors (non-engineer and engineer) beginner-to-advanced empowerment; and the toolkit should apply its own deterministic-gate-plus-behavioral-evidence philosophy to its own documentation surface - without manufacturing doc-rot. A literal sibling-`.md`-per-source-file rule fights that philosophy (~141 files, most beside intentional test fixtures, each a dual-maintenance surface that must itself pass the gate).
- **Status:** Accepted (2026-06-01). Extends ADR 0021; supersedes ADR 0021's v1.x deferral of the docs-presence check and its unbuilt mermaid-check timing.

- **Date:** 2026-06-01
- **Deciders:** maintainer (jprisant), with Claude (Opus 4.8)
- **Builds on:** ADR 0021 (documentation, examples, docs-site strategy), ADR 0023 (full v1 scope), ADR 0020 (packaging, naming, consolidation).

## Context

ADR 0021 D1 specified a dual-audience, multi-level Diataxis information architecture. Verified current state on `main` (public, tier advanced, v0.3.0): the `how-to/` (28 files) and `reference/` (24 per-component files) quadrants are full, but the artifacts ADR 0021 D1 explicitly required are **missing** - the entire `tutorials/` quadrant, a root `QUICKSTART`, `glossary`, `faq`, `troubleshooting`, and the architecture overview+detailed pair. The docs site is a hand-curated landing in `site/src/content/`, not the in-place-glob **generated view of `docs/**`** that ADR 0021 D3 specified (it was curated as a stopgap because `docs/reference|how-to` files lack the frontmatter `title` Starlight needs). The `mermaid-valid` check that ADR 0021 D6 marked "a CHECK ... in v1" was never built - it is not among the 25 checks. The `docs-presence` check was deferred to v1.x.

The maintainer's new brief asks for: a more visually appealing, instructional, comprehensive README matching the pm-skills and product-on-purpose standards; mermaid diagrams added thoughtfully throughout; a README in every meaningful folder explaining its files, with CI to keep these in sync with the corresponding Astro pages; a deep `docs/` learning surface (getting-started, "try this", onboarding, examples) structured for progressive discovery for both non-engineer and engineer audiences; a same-named explainer `.md` for every `.json/.mjs/.py/.js` source file; and consistently applied frontmatter so people can explore beginner-to-advanced from different perspectives.

A pre-design review (a 5-agent verification + critique workflow) established two facts that shape this decision: the executable spine is really **G1-G6 (25 checks)** mislabeled "G1-G7" in the session log, commit message, and PR title - "G7" is an inclusion *requirement* in STANDARD.md sec 2.6 with no dedicated module; and the literal sibling-`.md` rule maps to roughly **141 files, 84 of them under `tests/` (40 under `tests/fixtures/`)** - intentionally malformed anti/golden fixtures - so a `.md` beside each would be low-value noise that must itself pass `no-dashes` and the description checks. An Explore study of the named style references confirmed pm-skills does **not** keep a sibling file per source: it generates readable docs from a single source (`SKILL.md`) and uses folder-level navigation, with Astro Starlight + astro-mermaid as the standard.

## Decision drivers

- **Two-doors empowerment** (non-engineer and engineer, beginner to advanced) is the explicit bar (ADR 0021).
- **Anti-rot / single source of truth.** A conformance toolkit that ships rotted documentation undercuts its own thesis. Prefer generation and inventory-matching over hand-duplicated parallel files.
- **Design Principle 3** - deterministic gate for structure, behavioral / LLM evidence beside the gate for quality. A presence-check must never masquerade as a quality-check (the exact "greenlight a hollow stub" failure the toolkit exists to prevent).
- **Non-vacuous tier discipline** - every check backs a normative STANDARD.md requirement; never declare a tier without passing its checks; author the artifacts before enforcing the check.
- **R6 (scope / burnout).** Full scope is accepted (the ADR 0023 maximal-v1 pattern), but must be staged into independently-green PRs against branch-protected `main` (linear history, `validate` required, an adversarial gate per new check).
- **ADR 0020 / 0021 consolidation** - prefer modes and checks over new prefix skills.

## Decision outcome

### D1 - Source-file documentation: folder-READMEs + docblocks (not sibling-per-file)

Reject the literal sibling-`.md`-per-source-file rule. Document source two ways instead:

1. **Folder-README convention.** Every *meaningful* folder carries a `README.md` that (a) states the folder's purpose in one or two sentences and (b) lists each immediate child (file or subdirectory) with a one-line "what it is." The `folder-readme` check asserts the README exists, has a frontmatter `title`, and that **its listed inventory matches the actual immediate children** - the same drift-detection mechanism as `INDEX.md` and the generated manifest, so the README cannot silently rot. The README body may be richer than the inventory; only the inventory set is matched.
2. **Source docblock convention.** Every hand-authored `.mjs / .js / .py` file under the in-scope source roots carries a header docblock with four fields, mapped directly from the maintainer's words: **what it is, what it does, why it matters, what uses it.** The `source-doc` check asserts the docblock is present and carries the four fields (deterministic presence and shape). Whether the prose is actually good routes to the behavioral `askit-evaluate` path, never the deterministic gate.

**"Meaningful folder" predicate.** Tracked directories that hold hand-authored source or documentation: the repo root, `scripts/**` (and `checks/`, `generators/`, `lib/`), `skills/*`, `agents/`, `templates/` (and `seed-plugin/`), `docs/*` excluding `docs/internal/`, `evals/`, and `.github/workflows/`. **Excluded:** `tests/fixtures/**` (intentional anti/golden fixtures), any generated directory, lockfiles, `node_modules`, `dist`, `.astro`, and `site/node_modules`. The `source-doc` scope is the source files under those same roots (primarily `scripts/**`); fixtures, lockfiles, and generated files are out.

Rationale: this reaches the maintainer's real goal - nothing in the repo is unexplained or undiscoverable - at roughly 15-20 folder READMEs plus docblocks, instead of ~141 hand-maintained sibling files, and it matches how the named style reference actually works.

### D2 - The site is the generated view of `docs/` (mount the tree)

Adopt ADR 0021 D3 as originally decided: add frontmatter `title` (and the D3 taxonomy below) to every `docs/**` page, then mount the Diataxis tree via the in-place glob loader so the folder tree **is** the published IA, with the curated landing page kept on top. The maintainer's "CI to keep docs and Astro pages in sync" requirement is then satisfied **structurally** - the site is a view of `docs/`, not a second content store, so there is nothing to drift. The residual CI concern (a `docs/**` page that cannot mount because it lacks a `title`, or is silently excluded) is covered by the `docs-frontmatter` check in D4.

### D3 - Frontmatter taxonomy (consistent, audience-aware)

Define a normative frontmatter schema for `docs/**` (excluding `docs/internal/`), shipped as a reference document the way pm-skills ships `frontmatter-schema.yaml`:

- `title` (string, required) - the published page title; required for the mount.
- `description` (string, required) - one line, reusing the U5 "action verb + use-when" shape; no colon-space.
- `audience` (enum, required) - one of `non-engineer`, `engineer`, `both`.
- `level` (enum, required) - one of `beginner`, `intermediate`, `advanced`.
- `tags` (array of strings, optional).

This single taxonomy unlocks both the site mount and the audience/level grouping and filtering that delivers the two-doors, beginner-to-advanced exploration goal.

### D4 - Five new checks, their tiers, and the G7 cleanup

All five are **deterministic structure checks**; quality stays in the behavioral path (Design Principle 3). Each backs a new normative requirement added to STANDARD.md v0.9.

| reqId | Check | Tier | Asserts | MUST/SHOULD |
|---|---|---|---|---|
| U12 | `mermaid-valid` | Bronze (Universal) | every fenced `mermaid` block parses | MUST (vacuously passes when there are no diagrams) |
| G7 | `docs-frontmatter` | Gold | the D3 taxonomy is present and from the controlled vocabulary across `docs/**` | MUST at Gold |
| G8 | `folder-readme` | Gold | folder README present + frontmatter title + inventory matches actual children (D1.1) | MUST at Gold |
| G9 | `source-doc` | Gold | header docblock present with the four fields (D1.2) under the in-scope source roots | MUST at Gold |
| G10 | `docs-presence` | Gold | Diataxis dirs non-empty + ADR TL;DR block + architecture overview-to-detailed link | MUST at Gold |

**Tier rationale.** `mermaid-valid` is a portable content-hygiene check on the universal markdown surface, the same class as `no-dashes` (U10), so it sits at Bronze and applies to any plugin a user builds; it never penalizes a plugin with no diagrams. The other four are docs-depth and lifecycle rigor that only a Gold-aspiring library should owe, so they bind at Gold and do not burden Bronze or Silver plugins.

**G7 cleanup.** Today the executable spine is U1-U11 + S1-S8 + G1-G6 = 25 checks, while STANDARD.md sec 2.6 lists a requirement "G7 = all Bronze + Silver by inclusion" that has no module. This is the monotonic-tier property, not a check. STANDARD.md v0.9 reclassifies it as an explicit tier-inclusion statement (unnumbered), freeing the G7+ numbers for real modules. The new spine is **U1-U12 (12) + S1-S8 (8) + G1-G10 (10) = 30 checks**, and the "25-check spine / G1-G7" wording in the session log, commit history, and any docs is corrected to the real counts.

### D5 - No new prefix skills; `askit-build-docs` modes carry the authoring

Hold the ADR 0020/0021 consolidation line. The human-facing authoring already lives in `askit-build-docs` (modes: readme, quickstart, tutorial, how-to, reference, explanation, glossary, faq, troubleshooting, architecture, capability-matrix, site). This effort adds at most one mode, `folder-readme`, to scaffold and refresh a folder README from the actual directory listing (so the inventory starts matching). Everything else is a check or an existing mode. No new `askit-` prefix entries.

### D6 - Author-before-enforce, staged as gated PRs (the phase map)

Full scope, delivered as a sequence of small, individually-green PRs. The ordering principle: **author the artifacts in one PR (the gate stays green because no new check exists yet), then turn the corresponding check on in the next PR (it ships green on its own dogfood).** This is what makes "everything in scope" compatible with branch-protected `main` and the adversarial-gate-per-check rule, and keeps the gate from ever going red between steps.

| Phase | Lands | New check enforced |
|---|---|---|
| P1 | frontmatter taxonomy doc; `title/description/audience/level` added to all `docs/**`; author QUICKSTART, `tutorials/`, glossary, faq, troubleshooting, architecture overview+detailed (via `askit-build-docs`) | none |
| P2 | `docs-frontmatter` (G7) + mount the full `docs/` tree as the in-place-glob view | G7 |
| P3 | README hero rewrite (pm-skills pattern) + the architecture / tier-climb / eval-boundary / build-evaluate-improve diagrams | U12 (`mermaid-valid`) |
| P4 | folder READMEs authored (via the new `folder-readme` mode) | G8 (`folder-readme`) |
| P5 | source docblocks added under the in-scope roots | G9 (`source-doc`) |
| P6 | `docs-presence` (G10) + G7-inclusion renumber + STANDARD.md v0.9 + version bump; regenerate INDEX/manifest; confirm gate green at advanced with the 30-check spine | G10 |

Each phase keeps the per-slice cadence (`gen-* --write` -> `node scripts/check.mjs` + `npm test` both green -> commit with a `Co-Authored-By: Claude Opus 4.8` trailer) and runs an adversarial gate before merging any check or CI change. P1-P3 are the must-ship visible win (content + frontmatter + site + README + diagrams); P4-P6 are the careful repo-wide tail. All six are in scope per the maintainer's full-scope decision.

## Consequences

**Positive:** finishes the dual-audience Diataxis set ADR 0021 promised; the site becomes a true generated view of `docs/` with the folder tree as the IA; the repo documents itself folder-by-folder and file-by-file without a rot surface; five new checks deepen the self-proving Gold reference and ship as reusable capability for any plugin a user builds; the long-standing G7 labeling error is corrected; and the toolkit dogfoods its own deterministic-structure-plus-behavioral-quality philosophy on its own documentation.

**Negative / to manage:** five new checks is the largest single addition to the gate since the Gold spine; each new MUST means the toolkit must author its own conforming artifacts before flipping the check, so the content/README/folder-README/docblock work is real labor budgeted across P1-P5; STANDARD.md v0.9 and a version bump touch the normative spec; and the staged delivery is several PRs against protected `main`, each needing its own adversarial gate.

## Scope and R6

- **Pulled into v1 now:** the missing ADR 0021 D1 content; the full site mount; the frontmatter taxonomy; `mermaid-valid` (was decided in v1, never built); `docs-presence` (was v1.x); the two new conventions (folder-README, source docblock) and their checks.
- **Net new skills = 0** (one new `askit-build-docs` mode). **Net new checks = +5** (25 -> 30).
- **Stays out (v1.x):** the example "threads" / samples build-out (ADR 0021 D5), the interactive capability matrix, `starlight-versions`, and video casts.

## STANDARD.md v0.9 delta (summary)

- Add U12 `mermaid-valid` to the Bronze/Universal requirements.
- Add G7 `docs-frontmatter`, G8 `folder-readme`, G9 `source-doc`, G10 `docs-presence` to the Gold/Advanced requirements, each with its normative MUST and the convention it enforces (the frontmatter taxonomy, the folder-README inventory-match, the four-field docblock, the Diataxis-presence and ADR TL;DR rules).
- Reclassify the former "G7 = inclusion" as an unnumbered tier-inclusion statement.
- Document the audience/level frontmatter taxonomy in the docs specification section.
- Bump the version stamp to v0.9.

## Provenance

A pre-design review workflow (build/test/version + inventory + git-state verification, plus continuation-prompt and log-quality critiques) established the real spine count, the sibling-`.md` scope, and the G7 confusion. An Explore study of `../pm-skills` and the product-on-purpose portfolio established the documentation conventions to match (hero README, Diataxis docs tree, Astro Starlight + astro-mermaid, generation over duplication, folder-level navigation). This ADR resolves the three forks the maintainer chose (folder-READMEs + docblocks; mount the tree; full staged scope) into a build plan that holds the consolidation and non-vacuous-tier lines.
