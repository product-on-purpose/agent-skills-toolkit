# v1.1.0 (ADR 0024 build-out) - implementation plan

> Phase-by-phase execution for the [v1.1.0 program](./PROGRAM-PLAN.md), keyed to [`SPEC.md`](./SPEC.md) and [`CHECKS-SPEC.md`](./CHECKS-SPEC.md). One PR per phase against branch-protected `main`, each individually green, each with an adversarial gate before merge. The ordering is **author-before-enforce**: a phase that turns a check on ships green on its own dogfood because the prior phase already authored the conforming artifacts.

## Per-phase cadence (every phase)

1. Branch from current `main` (`phase-<n>-<slug>`).
2. Make the edits; for any generated file run `node scripts/generators/gen-manifest.mjs . --write --target=all` and `node scripts/generators/gen-index.mjs . --write`.
3. `node scripts/check.mjs` (0/0) + `npm test` (all green) + `(cd site && npm run build)` where the site is touched + the two `site/scripts/` 14.11 guards.
4. `git diff --name-only` to confirm only intended files.
5. Commit (Conventional Commit, `Co-Authored-By: Claude Opus 4.8` trailer), push, PR.
6. **Adversarial gate** (a verification workflow) before merging any check or CI change; fix confirmed findings.
7. Admin-squash merge; confirm `main` green.

## P0 - the demonstrative hook (makes `G1` non-vacuous)

**Lands:** `hooks/hooks.json` (PreToolUse, `matcher: "Write|Edit|NotebookEdit"`), `hooks/no-dashes.mjs` (portable, with its own `source-doc` docblock), `hooks/README.md` (frontmatter `title` + purpose + inventory + the sec-3.5 event/trigger/matcher/scope/failure documentation), and an `evals/` `G3` case covering the hook event.
**Enforces:** no new check; `G1` now grades a real hook, `G3` now covers the hook event.
**Verify:** gate green at advanced; a local probe (delete the `matcher`) makes `G1` fail; a dash in a `Write` payload is denied; `library.json` components updated if hooks are inventoried there; regenerate INDEX/manifest.
**Note:** `hooks/` becomes a meaningful folder; record it so P4's `G8` allowlist includes it (the README authored here makes it pass when `G8` flips).

## P1 - the missing Diataxis content + frontmatter (author only)

**Lands:** the frontmatter taxonomy reference doc (R-FM-1); `title/description/audience/level` added to **every** existing `docs/**` page (excluding `docs/internal/`); new content via `askit-build-docs` modes - `QUICKSTART.md` (root), the `docs/tutorials/` quadrant, `glossary`, `faq`, `troubleshooting`, and the architecture **overview + detailed** pair (default `docs/explanation/architecture.md` + `architecture-internals.md`), each carrying its `doc-role` marker, the overview linking to the detailed (satisfying `G10` later).
**Enforces:** none (no check exists yet; gate stays green).
**Verify:** `U10` clean over new prose; the site still builds; the new pages render under the curated landing; `git ls-files docs/tutorials` non-empty.
**Scope guard:** content only - do not add the `docs-frontmatter` check here (that is P2). This is the "author" half of author-before-enforce for `G7`.

## P2 - `docs-frontmatter` (G7) + the generated Pattern S site

**Lands:** `scripts/checks/docs-frontmatter.mjs` (+ fixtures/tests per CHECKS-SPEC G7); register it (advanced); the site **generator** that emits the public `docs/` tree into `site/src/content/docs/` read by the stock `docsLoader()`; `.gitignore` the generated output; a CI assertion that the generated tree is not tracked (R-SITE-2); update `site/scripts/route-manifest.txt` for the new published routes. Also update `skills/askit-build-docs/SKILL.md` `site` mode + `references/docs-site-recipe.md` from the superseded in-place glob loader to the generated Pattern S mechanism (R-SITE-5; ADR 0024 D2), so the toolkit's own authoring skill matches the site it now ships.
**Enforces:** `G7` (green because P1 already added the frontmatter everywhere).
**Verify:** gate green at advanced; `docs-frontmatter` anti-fixtures fail; the site builds the generated pages; 14.11 guards pass on `dist`; no `docs/internal` content in `dist`; generated pages untracked.

## P3 - README hero rewrite + diagrams (enforces `U12`)

**Lands:** the README hero rewrite to the pm-skills / product-on-purpose pattern; the four diagrams (architecture, tier-climb, eval-boundary, build-evaluate-improve) as `mermaid`; `scripts/checks/mermaid-valid.mjs` (Bronze `U12`, + fixtures/tests); register it.
**Enforces:** `U12` (green because `U12` passes over **all** tracked `mermaid` blocks - the existing files that already carry diagrams plus the P1/P2-authored and new ones - swept and confirmed before the flip, not just the tier-climb diagram; `U12` is repo-wide Bronze).
**Verify:** gate green; `mermaid-valid` anti-fixture (unbalanced/unknown-keyword) fails; the site renders every diagram (astro-mermaid is the build-time second layer); `U12` is Bronze so it now also grades any downstream plugin's diagrams.

## P4 - folder READMEs (enforces `G8`)

**Lands:** a `README.md` (frontmatter `title` + purpose + matching inventory) in every meaningful folder per the allowlist (incl. `hooks/` from P0); the new `askit-build-docs` `folder-readme` mode used to scaffold them; `scripts/checks/folder-readme.mjs` (advanced `G8`, + fixtures/tests).
**Enforces:** `G8` (green because the READMEs were authored first, in this same PR's author-then-enforce micro-order, or split into P4a author / P4b enforce if the diff is large).
**Verify:** gate green; the `folder-readme` anti-fixtures (under-list, phantom, no-title) fail; every allowlisted folder has a matching README; fixtures folders are ignored.

## P5 - source docblocks (enforces `G9`)

**Lands:** the four-field header docblock in every in-scope `*.mjs`/`*.js`/`*.py` (primarily `scripts/**` and `site/scripts/**`); `scripts/checks/source-doc.mjs` (advanced `G9`, + fixtures/tests).
**Enforces:** `G9` (green because the docblocks were authored first).
**Verify:** gate green; `source-doc` anti-fixture (missing a field) fails; fixtures/generated/lockfiles are out of scope; the `.py`-comment path is covered.

## P6 - `docs-presence` (G10) + the renumber + STANDARD v0.10 + version bump (the release)

**Lands:**
- `scripts/checks/docs-presence.mjs` (advanced `G10`, + fixtures/tests).
- The `G7`-inclusion renumber in `STANDARD.md` sec 2.6 (unnumbered inclusion statement); `G7` now = `docs-frontmatter`.
- **`STANDARD.md` -> v0.10**: add `U12` + `G7-G10` normative requirements (sec 2.5/2.6 - the `G`-number enumeration lives in sec 2.6), the required-checks-by-tier list (sec 4.2; prose today, optionally converted to a table), the docs frontmatter taxonomy as a **new sec 8.4** (under sec 8 "Quality and discoverability"; this pins ADR 0024's vague "docs specification section" pointer), and a version-history note. **Use v0.10, not v0.9** (v0.9 is taken by ADR 0025; see PROGRAM-PLAN sec 2 and R-STD).
- `library.json`: `standard "0.9" -> "0.10"`, `version "1.0.0" -> "1.1.0"`; `package.json` version `-> 1.1.0`; regenerate native manifests + `manifest.generated.json` + `INDEX.md`.
- `docs/reference/gold-checks.md` gains `G7-G10`; the "25-check / G1-G7" wording corrected to "30-check / G1-G10" across README, AGENTS.md, STATUS, badges (R-G7FIX-2).
- `CHANGELOG.md` `[Unreleased] -> [1.1.0]`; `RELEASE-NOTES.md` 1.1.0 section.
**Enforces:** `G10` (green because P1 authored the Diataxis content + the architecture link, and the ADRs already carry TL;DRs).
**Verify:** `node scripts/check.mjs` -> Advanced 0/0 with the **30-check spine**; `tier-report` advanced, empty burndown; `npm test` (incl. the spine-count and reqId-uniqueness assertions) green; the site builds; a repo grep finds no stale "25 checks"/"G1-G7".

## Release + marketplace re-pin (after P6, if cutting v1.1.0)

The same mechanics as the v1.0.0 launch, now a one-line update:
1. Merge P6 -> `git tag v1.1.0 && git push origin v1.1.0` (`release.yml` mints the release behind the version-consistency guard, now checking `1.1.0`).
2. `git rev-list -n1 v1.1.0`.
3. In `agent-plugins`, update the existing `agent-skills-toolkit` entry: `sha -> the v1.1.0 commit`, `version "1.0.0" -> "1.1.0"`; bump registry `metadata.version` one minor; CHANGELOG entry. `validate-registry` green; PR; merge.
4. Update `STATUS.md` to v1.1.0 shipped.

## Cross-phase dependencies (the sort order)

```
P0 (hook)  ----------------------------> P4 (G8 allowlist includes hooks/, README authored in P0)
P1 (content + frontmatter)  -----------> P2 (G7 enforces frontmatter)  and  P6 (G10 needs Diataxis + arch link)
P3 (diagrams)  ------------------------> U12 enforced in P3 itself
P4 (folder READMEs)  ------------------> uses the build-docs folder-readme mode (D5)
P5 (docblocks)  -----------------------> includes hooks/no-dashes.mjs (docblock authored in P0)
P6 (G10 + renumber + v0.10 + bump)  ---> last; depends on P1 content + the G7 number being free
```

P0-P3 are independent enough to parallelize across worktrees if desired; P4-P6 are sequential (P6 must be last - it bumps the Standard and the version). Author-before-enforce holds within each check: the artifacts (P1 frontmatter, P0 hook docs, P4 READMEs, P5 docblocks) always precede the check that grades them.

## Notes captured during execution

- (append: the chosen home for glossary/faq/troubleshooting under the Diataxis tree; the exact site-generator design; any reqId/registry surprise; the final spine-count test location)
