# v1.1.0 (ADR 0024 build-out) - spec

> The contract for the [v1.1.0 program](./PROGRAM-PLAN.md). Each requirement carries an ID, a testable acceptance criterion, and its source ([ADR 0024](../../decisions/0024-documentation-depth-and-discoverability.md) decision number, or this program). The per-check normative detail lives in [`CHECKS-SPEC.md`](./CHECKS-SPEC.md); [`IMPL-PLAN.md`](./IMPL-PLAN.md) maps these to phases.

## Conventions

- **MUST / SHOULD / MAY** per RFC 2119.
- "The gate" = `node scripts/check.mjs`; "green" = exit 0, 0 errors, 0 warnings.
- "Diataxis dirs" = `docs/{tutorials,how-to,reference,explanation}`.
- The frontmatter taxonomy = the D3 schema (`title`, `description`, `audience`, `level`, optional `tags`).

## R-CONTENT - the missing Diataxis content (P1)

| ID | Requirement | Acceptance | Source |
|---|---|---|---|
| R-CONTENT-1 | `docs/tutorials/` MUST exist and be non-empty (a learning-oriented path, beginner to advanced). | `git ls-files docs/tutorials` is non-empty; each page renders in the site build. | ADR 0021 D1; ADR 0024 P1 |
| R-CONTENT-2 | A root `QUICKSTART.md` MUST exist (fastest path from install to first graded plugin). | `QUICKSTART.md` present at repo root; linked from README. | ADR 0024 P1 |
| R-CONTENT-3 | `glossary`, `faq`, and `troubleshooting` docs MUST exist under `docs/`. | The three files present (e.g. `docs/explanation/glossary.md`, `docs/how-to/faq.md` or a chosen home) and reachable from the site. | ADR 0024 P1 |
| R-CONTENT-4 | An architecture **overview** doc and a **detailed** doc MUST exist (default `docs/explanation/architecture.md` + `architecture-internals.md`), each carrying its `doc-role` marker (R-FM-4), with the overview linking to the detailed. | Both present and marked; the overview contains a resolvable link to the detailed doc (the deterministic `G10` rule). | ADR 0024 D4/P1 |
| R-CONTENT-5 | New content MUST be authored via `askit-build-docs` modes and obey the house no-dash rule and the U5 description shape. | `U10` clean over the new files; descriptions are action-verb + use-when, no colon-space. | ADR 0024 D5 |

## R-FM - frontmatter taxonomy (P1, enforced P2 as G7)

| ID | Requirement | Acceptance | Source |
|---|---|---|---|
| R-FM-1 | A normative frontmatter schema MUST be documented as a reference (the way pm-skills ships `frontmatter-schema.yaml`). | A reference doc defines `title`/`description`/`audience`/`level`/`tags` with types and controlled vocabularies. | ADR 0024 D3 |
| R-FM-2 | Every page under `docs/**` (excluding `docs/internal/`) MUST carry `title` (string), `description` (string), `audience` (`non-engineer`\|`engineer`\|`both`), `level` (`beginner`\|`intermediate`\|`advanced`); `tags` optional (string array). | `docs-frontmatter` (`G7`) green; a probe page missing/violating a field fails it. | ADR 0024 D3/D4 |
| R-FM-3 | `description` MUST follow the U5 shape (action verb + use-when) and contain no colon-space. | Consistent with `description-score` philosophy; checked by `docs-frontmatter`. | ADR 0024 D3 |
| R-FM-4 | An optional `doc-role` frontmatter key MAY mark a page's structural role; the architecture pair MUST carry `doc-role: architecture-overview` and `architecture-detailed` so `docs-presence` (`G10`) locates them deterministically (path-independent). | Vocabulary `{architecture-overview, architecture-detailed}` (extensible); the two architecture pages carry them; a page may omit `doc-role`. | ADR 0024 D3/D4; G10 rule 3 |

## R-SITE - generated Pattern S docs site (P2)

| ID | Requirement | Acceptance | Source |
|---|---|---|---|
| R-SITE-1 | A generator MUST emit the public `docs/` tree (Diataxis + component sources) into `site/src/content/docs/`, read by the stock `docsLoader()`. | A generator script produces the pages; `npm run build` renders them; the curated landing remains on top. | ADR 0024 D2 |
| R-SITE-2 | Generated output MUST be gitignored and rebuilt every build (no committed generated pages, no drift surface). | The emitted paths are in `.gitignore`; `git ls-files` shows none of the generated pages tracked; a CI assertion guards it. | ADR 0024 D2 |
| R-SITE-3 | `docs/internal/**` MUST NOT be emitted to the site (governance/public split). | No `docs/internal` content appears in `dist`; the generator reads only the public tree. | ADR 0024 D2 |
| R-SITE-4 | The site MUST still satisfy the clause-14.11 link + route guards after generation. | `check-rendered-links.mjs` + `check-route-parity.mjs` pass on the built `dist`; the route manifest is updated for new published routes. | clause 14.11; ADR 0026 |
| R-SITE-5 | The toolkit's own `askit-build-docs` `site` mode and `references/docs-site-recipe.md` MUST be updated from the superseded in-place glob loader to the generated Pattern S mechanism, so the toolkit does not self-host a recipe it no longer uses (a docs-rot surface against ADR 0024's own anti-rot driver). | The skill + recipe describe emitting into `site/src/content/docs/` read by the stock `docsLoader()`; no remaining "in-place glob loader" / "mounts `./docs` in place" instruction. | ADR 0024 D2 |

## R-CONV - folder-README + source-docblock conventions (P4, P5)

| ID | Requirement | Acceptance | Source |
|---|---|---|---|
| R-CONV-1 | Every **meaningful folder** MUST carry a `README.md` with a frontmatter `title`, a one-to-two-sentence purpose, and an inventory listing each immediate child with a one-line "what it is"; the inventory MUST match the actual immediate children. | `folder-readme` (`G8`) green; adding/removing a child without updating the README fails it. | ADR 0024 D1.1/D4 |
| R-CONV-2 | The "meaningful folder" set MUST be exactly the ADR 0024 allowlist (repo root, `scripts/**`, `skills/*`, `agents/`, `templates/**`, `docs/*` excluding `docs/internal/`, `evals/`, `.github/workflows/`); fixtures, generated dirs, lockfiles, `node_modules`, `dist`, `.astro`, `site/node_modules` are excluded. | The check's scope set equals the allowlist; a fixture folder without a README does not fail. | ADR 0024 D1 |
| R-CONV-3 | Every hand-authored `.mjs`/`.js`/`.py` file under the in-scope source roots MUST carry a header docblock with the four fields: **what it is, what it does, why it matters, what uses it**. | `source-doc` (`G9`) green; a source file missing a field fails it; fixtures/generated/lockfiles are out of scope. | ADR 0024 D1.2/D4 |
| R-CONV-4 | `askit-build-docs` MUST gain a `folder-readme` mode that scaffolds/refreshes a folder README from the actual directory listing. | The mode exists and produces a README whose inventory matches the directory; no new `askit-` prefix entry. | ADR 0024 D5 |

## R-CHECK - the five new deterministic checks (enforced across P2-P6)

| ID | Requirement | Acceptance | Source |
|---|---|---|---|
| R-CHECK-U12 | `mermaid-valid` (Bronze, `U12`) MUST assert every fenced `mermaid` block parses; vacuous when there are none. | Golden (valid diagram) passes; anti (malformed diagram) fails; a plugin with no diagrams passes. | ADR 0024 D4 |
| R-CHECK-G7 | `docs-frontmatter` (Gold, `G7`) MUST assert R-FM-2 across `docs/**`. | Per R-FM-2 acceptance. | ADR 0024 D4 |
| R-CHECK-G8 | `folder-readme` (Gold, `G8`) MUST assert R-CONV-1/2. | Per R-CONV-1 acceptance. | ADR 0024 D4 |
| R-CHECK-G9 | `source-doc` (Gold, `G9`) MUST assert R-CONV-3. | Per R-CONV-3 acceptance. | ADR 0024 D4 |
| R-CHECK-G10 | `docs-presence` (Gold, `G10`) MUST assert: Diataxis dirs non-empty + each ADR carries a TL;DR block + the `doc-role: architecture-overview` page links to the `architecture-detailed` page. | Golden passes; anti (empty `tutorials/`, an ADR without TL;DR, an overview without the link) each fails. | ADR 0024 D4 |
| R-CHECK-6 | Each new check MUST be a synchronous, deterministic, zero-model module under `scripts/checks/`, registered in the tier registry, with golden + anti fixtures and unit tests. | The `registry-sync` test passes; `npm test` covers each; `check.mjs` exit code reflects them. | Standard sec 4.1/4.5; Design Principle 3 |

## R-G7FIX - the G7 cleanup (P6)

| ID | Requirement | Acceptance | Source |
|---|---|---|---|
| R-G7FIX-1 | The former `G7 = "all Bronze + Silver by inclusion"` MUST be reclassified as an **unnumbered** tier-inclusion statement in `STANDARD.md` sec 2.6 (it is the monotonic property, not a module). | STANDARD.md sec 2.6 states inclusion without a `G7` number; `G7` now denotes `docs-frontmatter`. | ADR 0024 D4 |
| R-G7FIX-2 | The "25-check spine / G1-G7" wording MUST be corrected to "30-check spine / G1-G10" wherever it appears (README, AGENTS.md, STATUS, docs, badges). | A repo grep finds no stale "25 checks" / "G1-G7" claim in tracked human docs. | ADR 0024 D4 |

## R-HOOK - the demonstrative hook (P0)

| ID | Requirement | Acceptance | Source |
|---|---|---|---|
| R-HOOK-1 | The toolkit MUST ship one real hook in `hooks/hooks.json` (a `PreToolUse` hook on `Write`\|`Edit`\|`NotebookEdit` enforcing the no-em-dash/no-en-dash rule). | `hooks/hooks.json` valid; the hook script runs; a dash in a `Write` payload is denied with a substitution reminder. | this program; ADR 0024 driver "non-vacuous tier" |
| R-HOOK-2 | The hook MUST document its event, trigger, matcher, scope, and failure behavior so `G1` (hook-documentation) grades a real hook and the toolkit stays green. | `hook-documentation` (`G1`) green over the real hook; `G1` is no longer vacuous. | Standard sec 3.5; check `G1` |
| R-HOOK-3 | The hook event MUST carry at least one `G3` (library-regression) eval/regression case. | `library-regression` (`G3`) green; an `evals/` case covers the hook event. | Standard `G3` |
| R-HOOK-4 | The hook MUST be portable and add no runtime dependency the spine does not already carry. | The hook script is Node (or pure), no new dependency in `package.json`. | Standard sec 4.1 |

## R-STD - Standard v0.10 (P6)

| ID | Requirement | Acceptance | Source |
|---|---|---|---|
| R-STD-1 | `STANDARD.md` MUST advance to **v0.10** (not v0.9 - already taken by ADR 0025) and add `U12` + `G7-G10` as normative requirements with their conventions, plus the docs frontmatter taxonomy as a **new sec 8.4** (under sec 8 "Quality and discoverability"). This pins ADR 0024's vague "docs specification section" pointer to a concrete home. | STANDARD.md header `v0.10`; the `G`-number reqId enumeration in sec 2.6 and the required-checks-by-tier list in sec 4.2 (prose today; may convert to a table) both updated; new sec 8.4 added; version-history note added. | ADR 0024 sec "STANDARD.md delta"; PROGRAM-PLAN sec 2 |
| R-STD-2 | `library.json` MUST move `standard: "0.9" -> "0.10"` and `version -> "1.1.0"`; `package.json` version MUST match; native manifests + `manifest.generated.json` + `INDEX.md` regenerated. | `U9`/`U8`/`G4` green; all version-bearing files read `1.1.0`; `standard` is `0.10`. | Standard sec 5; checks U8/U9/G4 |

## R-SEQ - author-before-enforce sequencing (cross-cutting)

| ID | Requirement | Acceptance | Source |
|---|---|---|---|
| R-SEQ-1 | No phase MAY enforce a check whose conforming artifacts are not already present on `main`. | Each check-flipping PR ships green on its own dogfood; `main` is green at every phase exit. | ADR 0024 D6 |
| R-SEQ-2 | Each check-adding or CI-changing PR MUST pass an adversarial gate before merge. | A recorded adversarial review per such PR (the Phase-5 discipline). | ADR 0024 D6; Standard sec 4 |
