# P6 - docs-presence (G10) + G7 renumber + STANDARD v0.10 + v1.1.0 release - SPEC

> Realizes packet [`../SPEC.md`](../SPEC.md) requirements **R-CHECK-G10**, **R-CHECK-6**, **R-G7FIX-1**, **R-G7FIX-2**, **R-STD-1**, **R-STD-2**, and (cross-cutting) **R-SEQ-1/2**; depends on **R-CONTENT-1/4** and **R-FM-4** being satisfied on `main`. Per-check normative detail in [`../CHECKS-SPEC.md`](../CHECKS-SPEC.md) sections "G10 - `docs-presence`" and "The `G7` inclusion renumber". RFC 2119 language throughout.

## Requirements

Each requirement below restates and expands a packet-SPEC row into a full normative statement with a testable acceptance criterion. "The gate" = `node scripts/check.mjs`; "green" = exit 0, 0 errors, 0 warnings.

### R-CHECK-G10 - the `docs-presence` check (expanded)

**R-CHECK-G10.1 (Diataxis presence).** The `docs-presence` check (Gold, `reqId: G10`) MUST assert that each of `docs/tutorials`, `docs/how-to`, `docs/reference`, `docs/explanation` exists and is **non-empty**, where non-empty means the directory contains at least one tracked `*.md` page (a directory containing only a placeholder such as `.gitkeep`, or only subdirectories with no `*.md` leaf, MUST be treated as empty).
*Acceptance:* the golden fixture (all four quadrants populated) passes; an anti fixture with an empty `tutorials/` fails with a finding naming `docs/tutorials` and the "non-empty" rule.

**R-CHECK-G10.2 (ADR TL;DR).** The check MUST assert that every `docs/internal/decisions/NNNN-*.md` file **except `README.md`** contains a `## TL;DR` block, matched as an anchored markdown heading line (a `## TL;DR` at the start of a line), not a substring and not a match inside a fenced code block. This sub-rule is **conditional** on `docs/internal/decisions/` existing.
*Acceptance:* an anti fixture with one ADR missing `## TL;DR` fails, naming that file; a plugin with no `docs/internal/decisions/` directory does not fail on this sub-rule.

**R-CHECK-G10.3 (Architecture link).** The check MUST locate the page whose frontmatter carries `doc-role: architecture-overview` and assert it exists **and** contains a resolvable markdown link to the page whose frontmatter carries `doc-role: architecture-detailed`. "Resolvable" means the link target, resolved relative to the overview page, is the path of the page that carries `doc-role: architecture-detailed`. If **neither** page carries its marker, that is a **presence** failure (R-CONTENT-4), reported **distinctly** from a present-but-unlinked overview.
*Acceptance:* an anti fixture whose overview omits the link to the detailed page fails with an "unlinked" finding; a fixture missing the `doc-role` markers entirely fails with a distinct "presence" finding; the golden fixture (marked pair + resolvable link) passes.

**R-CHECK-G10.4 (conditional / tier).** The check MUST be a Gold (advanced-tier) check: it binds only a plugin that declares `advanced` and ships a `docs/` tree. A plugin with no `docs/` tree MUST pass vacuously.
*Acceptance:* a minimal fixture with no `docs/` produces zero `G10` findings.

### R-CHECK-6 - module discipline (applies to `docs-presence`)

The `docs-presence` module MUST be a **synchronous, deterministic, zero-model** ES module under `scripts/checks/`, export `meta = { id: "docs-presence", tier: "advanced", reqId: "G10" }` and a synchronous `check(ctx)` returning an array of `finding(...)` objects, be registered in the `CHECKS` array in `scripts/lib/registry.mjs`, and ship golden + anti fixtures plus a unit test.
*Acceptance:* `registry-sync` passes (the module returns an array synchronously); `npm test` covers the module; `check.mjs`'s exit code reflects it; no network, no `async`, no model call.

### R-G7FIX-1 - the inclusion renumber close-out

`STANDARD.md` sec 2.6 MUST state the tier-inclusion property (a Gold plugin satisfies every Bronze and Silver requirement) as an **unnumbered** structural statement, NOT as a numbered `G7` check; `G7` MUST denote the `docs-frontmatter` module. (This was performed in P2a; P6 MUST verify it and finish any residue.)
*Acceptance:* sec 2.6 contains the inclusion statement with no `G7` label; the only numbered `G`-checks are `G1-G10`; no module claims a duplicate reqId (the reqId-uniqueness assertion is green).

### R-G7FIX-2 - the stale-count correction

Every present-tense claim of the spine count or the Gold-check range in tracked human docs MUST read the correct **30-check spine (`U1-U12` / `S1-S8` / `G1-G10`)**; no present-tense "25 checks", "26 checks", "G1-G6", or "G1-G7" claim MAY remain. Explicitly historical references (version-history notes describing a prior version, ADR text describing the past) keep their period-correct numbers and MUST be unambiguously historical.
*Acceptance:* a repo grep over tracked human docs (README.md, AGENTS.md, docs/internal/STATUS.md, docs/**, badges) finds no stale present-tense count.

### R-STD-1 - STANDARD.md v0.10 (completion)

`STANDARD.md` MUST present the **final v0.10** surface: it MUST add `U12` (`mermaid-valid`, Bronze) to the Universal requirement set; it MUST add `G8` (`folder-readme`), `G9` (`source-doc`), `G10` (`docs-presence`) to the sec 2.6 Gold table alongside the already-present `G7` (`docs-frontmatter`); the required-checks-by-tier list in sec 4.2 MUST name the new Advanced checks (and `U12` under Universal); sec 8.4 (docs frontmatter taxonomy) MUST be present; the spine-count statement MUST read **30** (`U1-U12` + `S1-S8` + `G1-G10`); and a version-history note MUST record the completion. The header version stays **v0.10** (already set in P2a; P6 does not advance it further).
*Acceptance:* `STANDARD.md` header `v0.10`; sec 2.6 enumerates `G1-G10` and the unnumbered inclusion statement; sec 2.6 spine line reads `... = 30`; sec 4.2 names the Advanced additions; sec 8.4 present; a v0.10 history note records the `U12`/`G8-G10` completion.

### R-STD-2 - version bump + regeneration

`library.json` MUST read `version: "1.1.0"` (its `standard` is already `"0.10"`); `package.json` MUST read `version: "1.1.0"`; the native manifests (`.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`), `manifest.generated.json`, and `INDEX.md` MUST be regenerated from `library.json` + component frontmatter.
*Acceptance:* `version-match` (`U9`), `manifest-drift` (`U8`), and `index-drift` (`G4`) green; all version-bearing files read `1.1.0`; `standard` is `0.10`; `gen-manifest`/`gen-index` are idempotent (re-run produces no diff).

### R-SEQ-1/2 - sequencing (cross-cutting)

P6 MUST NOT enforce `G10` unless its conforming artifacts (the four populated Diataxis quadrants, the marked-and-linked architecture pair, the ADR TL;DRs) are already present on `main`; the P6 PR MUST ship green on its own dogfood and MUST pass an adversarial gate before merge.
*Acceptance:* the gate is green at the moment `G10` is registered; a recorded adversarial review precedes merge.

## The check

**reqId:** `G10` · **module:** `scripts/checks/docs-presence.mjs` · **tier:** `advanced` · **severity:** `error` (at the advanced tier).

**meta:**
```js
export const meta = { id: "docs-presence", tier: "advanced", reqId: "G10" };
```

**Exact asserts (three facts, in order):**

1. **Diataxis presence.** For each `name` in the recognized Diataxis set, `docs/<name>` MUST exist and contain at least one `*.md` file (recursively). The recognized set is a single named constant:
   ```js
   const DIATAXIS = ["tutorials", "how-to", "reference", "explanation"];
   ```
   "Non-empty" is computed by walking `docs/<name>` and finding at least one entry ending `.md`. A missing dir and an empty dir each produce one finding naming `docs/<name>`.
2. **ADR TL;DR.** If `docs/internal/decisions/` exists, every file matching `NNNN-*.md` (four leading digits, hyphen) **except** `README.md` MUST contain a line matching the anchored heading `^## TL;DR\s*$` (the match MUST ignore any occurrence inside a fenced ``` ``` ``` code block). Each ADR without it produces one finding naming the file.
3. **Architecture link.** Among the in-scope `docs/**` pages (excluding `docs/internal/**`), find the page with frontmatter `doc-role: architecture-overview` and the page with `doc-role: architecture-detailed`. If neither marker is found, emit one **presence** finding (R-CONTENT-4: the architecture pair is absent or unmarked). Otherwise, if the overview is present, parse its body for a markdown link whose target resolves (relative to the overview's directory, slash-normalized) to the detailed page's repo-relative path; if no such link exists, emit one **unlinked** finding. The presence finding and the unlinked finding carry distinct messages.

**Recognized constants / vocabularies:**
- `DIATAXIS = ["tutorials", "how-to", "reference", "explanation"]` (one named constant, the four quadrants).
- The `doc-role` markers `architecture-overview` and `architecture-detailed` (the R-FM-4 vocabulary; the check reads them via `parseFrontmatter`, path-independent).
- The TL;DR heading literal `## TL;DR` (Standard sec 10.4 / ADR 0021 decision-summary convention).

**Scope + the exact skip set:**
- Rule 1 reads only `docs/tutorials`, `docs/how-to`, `docs/reference`, `docs/explanation`.
- Rule 2 reads only `docs/internal/decisions/*.md`, skipping `README.md`.
- Rule 3 reads `docs/**/*.md` **excluding** `docs/internal/**` (governance, never published), the same exclusion `docs-frontmatter` (`G7`) uses; reuse the `docs/internal` prefix-skip from the `G7` module's pattern (`f.startsWith(internal + path.sep)`).
- No other repo trees are read. `tests/fixtures/**`, `node_modules`, `dist`, `.astro`, generated dirs are never walked because the check only descends `docs/`.

**Conditional / vacuous rule:**
- If `docs/` does not exist -> return `[]` (vacuous; same precedent as `G7`).
- If `docs/internal/decisions/` does not exist -> rule 2 contributes no findings (a plugin owes ADR TL;DRs only once it keeps decision records).
- Rules 1 and 3 still apply when `docs/` exists; a `docs/` tree that ships none of the Diataxis quadrants and no architecture pair fails (that is the point - it is an advanced-tier presence bar).

**Edge cases:**
- A Diataxis dir present but containing only a `.gitkeep` or only non-`.md` files -> empty -> fails (the "placeholder is not content" rule).
- A `## TL;DR` appearing inside a fenced code block in an ADR -> NOT a match (strip or skip fenced regions before the heading scan).
- An ADR named with a non-conforming name (no four-digit prefix) -> out of scope for rule 2 (only `NNNN-*.md`).
- The architecture pair markers on pages anywhere under `docs/**` (not `docs/internal/`) -> located by `doc-role`, not by filename (path-independent; default home `docs/explanation/architecture.md` + `architecture-internals.md` but not required to be there).
- An overview that links the detailed page via an absolute-from-root path vs a relative path -> the resolver normalizes both to the repo-relative path of the detailed page before comparing.

**Example pass** (the toolkit's own tree): `docs/tutorials/` has `build-your-first-skill.md` (and more); `docs/how-to/`, `docs/reference/`, `docs/explanation/` each have many pages; every `docs/internal/decisions/00NN-*.md` carries `## TL;DR`; `docs/explanation/architecture.md` carries `doc-role: architecture-overview` and links `[Architecture internals](./architecture-internals.md)`, which carries `doc-role: architecture-detailed`. -> zero findings.

**Example fail** (anti fixture `docs-presence-arch-unlinked`): the overview page carries `doc-role: architecture-overview` but its body contains no link resolving to the `architecture-detailed` page. -> one `G10` finding: "architecture overview (doc-role: architecture-overview) does not link the detailed page (doc-role: architecture-detailed); add a resolvable markdown link (R-CONTENT-4 / G10 rule 3)."

## Content / artifacts to author

P6 authors **no new docs content** (P1 did). It authors: the check module, its fixtures, its test, the STANDARD.md deltas, the version bumps + regenerated artifacts, the gold-checks.md rows, the wording sweep, and the release docs. Concretely:

### STANDARD.md sec deltas (v0.10 completion)

- **sec 2.5 / the Universal requirement list:** add `U12` (`mermaid-valid`, Bronze): "every fenced `mermaid` block parses; vacuous when there are none." (Bronze content-hygiene, same class as `U10`.)
- **sec 2.6 Gold table:** add three rows alongside the present `G7`:
  - `G8` - **Folder-README inventory.** Every meaningful folder carries a `README.md` with a frontmatter `title` and an inventory matching its actual immediate children (D1.1). | folder-readme check | -
  - `G9` - **Source docblocks.** Every hand-authored `*.mjs`/`*.js`/`*.py` under the in-scope source roots carries a four-field header docblock (what it is / what it does / why / used-by) (D1.2). | source-doc check | -
  - `G10` - **Docs presence.** The Diataxis dirs are non-empty, every ADR carries a `## TL;DR`, and the architecture overview links the detailed page. | docs-presence check | -
- **sec 2.6 inclusion statement:** confirm it reads as the unnumbered structural property (done P2a).
- **sec 2.6 spine line:** change `The Gold checks are G1-G7; the spine is U1-U11 + S1-S8 + G1-G7 = 26.` to `The Gold checks are G1-G10; the spine is U1-U12 + S1-S8 + G1-G10 = 30.` and the "MUST pass G1-G7 against itself" to `G1-G10`.
- **sec 4.2 required-checks-by-tier:** under **Universal** add "mermaid block validity"; under **Advanced (adds)** add "folder-README inventory; source docblock presence; docs presence (Diataxis non-empty, ADR TL;DR, architecture overview-to-detailed link)".
- **sec 8.4:** confirm the docs frontmatter taxonomy is present (added P2a); no change needed beyond verification.
- **version-history note (top of file):** extend the `v0.10` note to record the completion, e.g. "v0.10 (completed): `U12` `mermaid-valid` (Bronze) and `G8` `folder-readme` / `G9` `source-doc` / `G10` `docs-presence` (Gold) added; the spine is now `U1-U12` + `S1-S8` + `G1-G10` = 30." Keep the header version at v0.10.

### `docs/reference/gold-checks.md` rows

- Header: change "requirements G1-G7" to "requirements G1-G10" in the frontmatter `description`, the H1 lead paragraph, and any inline reference.
- Add three table rows after the `G7` row, in the existing column shape (`reqId | Module | What it checks | Standard | Conditional? | Example fix`):
  - `G8` | `scripts/checks/folder-readme.mjs` | folder README present + frontmatter `title` + inventory matches actual immediate children | sec 2.6 (G8), sec 8.4/D1.1 | yes (allowlisted folder exists) | Add/refresh the folder `README.md` so its inventory lists every immediate child; author with `askit-build-docs` `folder-readme` mode.
  - `G9` | `scripts/checks/source-doc.mjs` | hand-authored `*.mjs`/`*.js`/`*.py` under the in-scope roots carries the four-field header docblock | sec 2.6 (G9), D1.2 | yes (in-scope source files exist) | Add the four labeled lines (what-it-is / what-it-does / why / used-by) to the file header.
  - `G10` | `scripts/checks/docs-presence.mjs` | Diataxis dirs non-empty + every ADR carries `## TL;DR` + architecture overview links the detailed page | sec 2.6 (G10), sec 10.4 | yes (a `docs/` tree exists) | Populate the empty Diataxis quadrant / add the missing ADR `## TL;DR` / add the overview-to-detailed link.

### RELEASE-NOTES + CHANGELOG

- `RELEASE-NOTES.md`: add a **1.1.0** section (highlights-first, user-facing): the documentation build-out (dual-audience Diataxis set finished; generated docs site; README hero + diagrams); five new checks (`U12` Bronze + `G7-G10` Gold) taking the spine to 30; the demonstrative hook (`G1` non-vacuous); Standard v0.10. Keep it distinct from the CHANGELOG (G5).
- `CHANGELOG.md`: rename `## [Unreleased]` to `## [1.1.0] - 2026-06-03`; add the build-out bullets (the five checks, the docs content, the site generator, the hook, Standard v0.10, the renumber, the count correction); leave a fresh empty `## [Unreleased]` scaffold above it; add the `[1.1.0]` compare link at the bottom.

### The release + marketplace re-pin steps (mechanics; executed post-merge, maintainer-gated)

Mirrors the v1.0.0 launch (see `../../plan_v1.0.0/marketplace-launch/IMPL-PLAN.md` Phases 3-4 and `LAUNCH-RUNBOOK.md`), now a one-line sha+version update:

1. Merge the P6 PR to `main` (admin-squash).
2. On the merge commit: `git tag v1.1.0 && git push origin v1.1.0`. `release.yml` runs the version-consistency guard (now checking `1.1.0` across `package.json`, `library.json`, both native manifests) and mints the GitHub release from `RELEASE-NOTES.md`.
3. Capture the tag commit: `git rev-list -n1 v1.1.0`.
4. In `E:\Projects\product-on-purpose\agent-plugins` (use a git worktree to avoid the shared-worktree branch-switch hazard): update the existing `agent-skills-toolkit` entry in `.claude-plugin/marketplace.json`: `sha -> the v1.1.0 commit`, `version "1.0.0" -> "1.1.0"`; bump registry `metadata.version` one minor; add a CHANGELOG entry; update the README plugins-table row if it carries a version.
5. Validate: `GITHUB_TOKEN=$(gh auth token) node scripts/validate-registry.mjs` -> exit 0; PR; confirm `validate-registry` CI green; merge.
6. Install smoke: `/plugin marketplace add product-on-purpose/agent-plugins` then `/plugin install agent-skills-toolkit@product-on-purpose`; confirm the skills load.
7. Update `docs/internal/STATUS.md` to v1.1.0 shipped.

## Acceptance criteria

A checklist the executor verifies before declaring P6 done (the PR half; the release half is maintainer-gated):

- [ ] `node scripts/check.mjs` -> `Tier: Advanced (no blockers detected)`, 0/0, with the **30-check spine** (`U1-U12` + `S1-S8` + `G1-G10`).
- [ ] `node scripts/tier-report.mjs --json` -> `"tier":"advanced"`, `"blocked":{}`.
- [ ] `npm test` -> all green, including the three `docs-presence` cases, the `registry-sync` synchronous guard, the reqId-uniqueness assertion, and the spine-count expectation (now `30`).
- [ ] The three anti fixtures each bite for the right reason (empty Diataxis dir; ADR without `## TL;DR`; overview without the detailed link); the golden passes; the no-`docs/` fixture passes vacuously.
- [ ] `(cd site && npm run build)` builds; the two `site/scripts/` 14.11 guards (rendered-links + route-parity) pass on `dist`.
- [ ] `STANDARD.md` v0.10 surface complete (sec 2.5 `U12`; sec 2.6 `G8-G10` + unnumbered inclusion + spine line `30`; sec 4.2 additions; sec 8.4 present; v0.10 history note).
- [ ] `library.json` `1.1.0` / `0.10`; `package.json` `1.1.0`; native manifests + `manifest.generated.json` + `INDEX.md` regenerated, idempotent, drift-clean (`U8`/`U9`/`G4` green).
- [ ] `docs/reference/gold-checks.md` documents `G1-G10`.
- [ ] A repo grep finds no stale present-tense "25 checks" / "26 checks" / "G1-G6" / "G1-G7" claim.
- [ ] `CHANGELOG.md` `[1.1.0] - 2026-06-03` with a fresh `[Unreleased]`; `RELEASE-NOTES.md` 1.1.0 section.
- [ ] `git diff --name-only` shows only intended files.
- [ ] No em-dash (U+2014) or en-dash (U+2013) anywhere in the diff.

## Out of scope

- New docs content (P1), the site generator (P2), the diagrams (P3), folder READMEs (P4), source docblocks (P5) - those are prior phases; P6 only enforces `G10` and releases.
- Quality scoring of any doc (routes to `askit-evaluate`, never the gate).
- `G6` de-vacuuming (no component is deprecated yet; standing follow-up).
- The deferred v1.x items (sample threads, capability matrix, `starlight-versions`, video casts, the Gemini emitter, the shared family Astro preset).
- Reopening the v0.9-vs-v0.10 version-line decision.
