# v1.1.0 (ADR 0024 build-out) - checks spec

> The per-check normative spec for the five new deterministic checks, the `G7` renumber, and the demonstrative hook's `G1`/`G3` contract. Grounded in the existing check architecture: every module under `scripts/checks/` exports `meta = { id, tier, reqId }` and a synchronous `check(ctx)` returning `finding(...)` objects; golden + anti fixtures live under `tests/fixtures/{golden,anti}/`; unit tests under `tests/unit/`; the `registry-sync` test asserts every check returns synchronously (the deterministic / no-model boundary). See [`SPEC.md`](./SPEC.md) for the requirement IDs and [`PROGRAM-PLAN.md`](./PROGRAM-PLAN.md) for the phase map.

## Shared contract (all five checks)

- **Deterministic + synchronous + zero-model.** No network, no LLM, no async. Portable Node only; no new runtime dependency beyond the existing `yaml`.
- **Severity = error** at the check's tier (a Gold check only binds a plugin that declares `advanced`; below that it is a burndown item, the existing tier-gating behavior).
- **Conditional where stated** (a check that finds nothing to inspect passes, the `mcp-valid`/`deprecation` precedent).
- **Registered** in the tier registry (`scripts/lib/` tier/registry module) so `check.mjs`, `tier-report.mjs`, and the burndown pick them up.
- **Fixtures**: at least one golden (passes) and one anti (fails, naming the exact defect) per check; the anti fixture is the test that the check actually bites.

---

## U12 - `mermaid-valid` (Bronze / Universal)

**reqId:** `U12` · **module:** `scripts/checks/mermaid-valid.mjs` · **tier:** universal

**Asserts:** every fenced ` ```mermaid ` block in the plugin's markdown surface is structurally well-formed.

**Why portable, not a full parse.** A true Mermaid parse needs the `mermaid` runtime (heavy, browser-oriented), which would violate the one-dependency spine. So the **portable gate** performs a **structural** validation, and the **full render-time validation** is the site build (`astro-mermaid`) - deterministic gate plus build-time evidence, the toolkit's own two-layer philosophy. The structural rules:

1. The block is non-empty after trimming.
2. The first non-blank line begins with a recognized diagram keyword: `flowchart`, `graph`, `sequenceDiagram`, `classDiagram`, `stateDiagram`(`-v2`), `erDiagram`, `journey`, `gantt`, `pie`, `mindmap`, `timeline`, `quadrantChart`, `gitGraph`, `C4Context` (keep the set in one named constant, easy to extend).
3. Brackets/parens/braces are balanced across the block (`[] () {}`), ignoring text inside quotes.
4. No tab characters (Mermaid is whitespace-sensitive; tabs are the common copy-paste break).

**Scope:** all tracked `*.md` and `*.mdx` files, via its own file walk. Note `U10` (`no-dashes`) scans only `.md`/`.mjs` (its `SCAN` regex has no `.mdx` branch), so `U12` cannot literally reuse that scanner - it adds `.mdx` (the site landing `site/src/content/docs/index.mdx` carries diagrams). Reuse the U10 directory skip-set **by basename** (`node_modules` at any depth, `.git`, `.memsearch`, `_LOCAL`/`_local`, `_agent-context`, `dist`, `.astro`) by importing the shared `SKIP_DIRS` constant rather than re-listing it (there is no literal `site/node_modules` entry; nested `node_modules` is matched by basename).

**Conditional:** a plugin with no `mermaid` blocks produces no findings (vacuous pass) - so `U12` never penalizes a diagram-free plugin.

**Fixtures:** `golden/mermaid-ok` (a valid `flowchart`); `anti/mermaid-bad` (unbalanced brackets and/or an unrecognized first keyword). **Tests:** valid passes; each structural rule's violation fails with a message naming the file + the rule; a no-diagram fixture passes.

---

## G7 - `docs-frontmatter` (Gold / Advanced)

**reqId:** `G7` · **module:** `scripts/checks/docs-frontmatter.mjs` · **tier:** advanced

> **Not** the component-frontmatter check. `frontmatter-valid.mjs` checks component `SKILL.md` / agent frontmatter (Bronze). `docs-frontmatter` checks `docs/**` **page** frontmatter (Gold). Distinct modules, distinct scopes, distinct reqIds - documented here and in the module header to prevent conflation (see PROGRAM-PLAN risk table).

**Asserts:** every page under `docs/**` **excluding `docs/internal/`** carries the D3 taxonomy:

- `title` (non-empty string), `description` (non-empty string, U5 shape: action-verb + use-when, no `": "` colon-space), `audience` in `{non-engineer, engineer, both}`, `level` in `{beginner, intermediate, advanced}`; `tags` optional, array of strings if present.

**Scope:** `docs/**/*.md` minus `docs/internal/**` (governance, never published). **Parsing:** reuse `scripts/lib/frontmatter.mjs` + `yaml`.

**Conditional:** if no public `docs/` pages exist, vacuous pass (a fresh plugin owes this only once it has a published docs tree).

**Fixtures:** `golden/docs-frontmatter-ok`; anti cases - missing `audience`; `level: expert` (out of vocabulary); `description` with a colon-space; non-array `tags`. **Tests:** each anti fails naming the field + page; golden passes; a page under `docs/internal/` is ignored.

---

## G8 - `folder-readme` (Gold / Advanced)

**reqId:** `G8` · **module:** `scripts/checks/folder-readme.mjs` · **tier:** advanced

**Asserts:** for each **meaningful folder**, a `README.md` exists that (a) has a frontmatter `title`, (b) states a one-to-two-sentence purpose, and (c) carries an **inventory** whose listed set of immediate children equals the actual immediate children. This is a **new inventory set-difference comparison** (new code, not a reuse): `index-drift` (a normalized whole-document string equality) and `manifest-drift` (per-field scalar compares) are precedent for the general generated-vs-on-disk **drift pattern**, but neither does set logic. The module computes the symmetric difference of the listed-children set and the on-disk-children set and reports each side (under-listed / phantom).

**Meaningful-folder allowlist (exact, from ADR 0024 D1):** the repo root, `scripts/**` (incl. `checks/`, `generators/`, `lib/`), `skills/*`, `agents/`, `templates/**` (incl. `seed-plugin/`), `docs/*` excluding `docs/internal/`, `evals/`, `.github/workflows/`, **and `hooks/`** (added by P0; a meaningful hand-authored folder). **Excluded:** `tests/fixtures/**`, any generated dir, lockfiles, `node_modules`, `dist`, `.astro`, `site/node_modules`.

**Inventory definition:** the set of immediate child names (files + subdirs) the README references (matched by backticked name or link), compared to `fs.readdirSync(folder)` minus the excludes and minus `README.md` itself. **Findings:** a child present on disk but absent from the inventory (under-listing); a child listed but absent on disk (phantom); a missing README; a README without a `title`.

**Conditional:** only folders in the allowlist that exist are checked; an allowlisted folder that does not exist is skipped (not an error).

**Fixtures:** `golden/folder-readme-ok` (folder + README whose inventory matches); anti - `folder-readme-missing-child` (a file on disk not listed), `folder-readme-phantom` (a listed child not on disk), `folder-readme-no-title`. **Tests:** each anti fails with the symmetric-difference detail; golden passes; a fixtures subfolder is ignored.

---

## G9 - `source-doc` (Gold / Advanced)

**reqId:** `G9` · **module:** `scripts/checks/source-doc.mjs` · **tier:** advanced

**Asserts:** every hand-authored `*.mjs` / `*.js` / `*.py` under the in-scope source roots carries a **header docblock** with the four fields, mapped from the maintainer's words: **what it is**, **what it does**, **why it matters**, **what uses it**.

**Docblock format (normative, parseable):** a comment block in the file's first ~30 lines containing four labeled lines (case-insensitive), each non-empty:

```
// what-it-is:   <one line>
// what-it-does: <one line>
// why:          <one line>
// used-by:      <one line>
```

(Equivalent JSDoc tags `@what` / `@does` / `@why` / `@usedby` are also accepted; the check looks for the four field keys, not a fixed comment style, so `.py` `#` comments work too.) The check asserts **presence and the four keys**, never prose quality - quality routes to the behavioral `askit-evaluate` path (Design Principle 3).

**In-scope source roots (exact):** `scripts/**` (the primary surface), plus any hand-authored `*.mjs`/`*.js`/`*.py` directly under the allowlisted roots in G8. **Excluded:** `tests/fixtures/**`, generated files (`manifest.generated.json` is JSON, not in scope; generators' *output* is excluded), lockfiles, `node_modules`, `dist`, `.astro`, `site/node_modules`, and `site/**` build tooling unless hand-authored under `site/scripts/`.

**Conditional:** a plugin with no in-scope source files passes vacuously.

**Fixtures:** `golden/source-doc-ok` (a `.mjs` with the four fields); anti - `source-doc-missing-why` (three fields only). **Tests:** missing any field fails naming the file + field; golden passes; a fixture `.mjs` under `tests/fixtures/` is ignored; a `.py` with `#`-style fields passes.

---

## G10 - `docs-presence` (Gold / Advanced)

**reqId:** `G10` · **module:** `scripts/checks/docs-presence.mjs` · **tier:** advanced

**Asserts three lifecycle-rigor facts:**

1. **Diataxis presence:** each of `docs/tutorials`, `docs/how-to`, `docs/reference`, `docs/explanation` exists and is non-empty.
2. **ADR TL;DR:** every `docs/internal/decisions/NNNN-*.md` (excluding `README.md`) contains a `## TL;DR` block - the mandatory 3-line decision summary (Standard sec 10.4 / ADR 0021).
3. **Architecture link:** the page with frontmatter `doc-role: architecture-overview` MUST exist and contain a resolvable link to the page with `doc-role: architecture-detailed`. The optional `doc-role` frontmatter key (see R-FM-4) makes the pair **deterministically locatable** by a path-independent identity, so this synchronous check finds them without guessing filenames. Default home: `docs/explanation/architecture.md` (overview) and `docs/explanation/architecture-internals.md` (detailed). If neither page carries the marker, that is a presence failure (R-CONTENT-4), reported distinctly from a present-but-unlinked overview.

**Conditional:** this is a Gold lifecycle check; it binds only a plugin that declares `advanced` and ships a `docs/` tree. The ADR-TL;DR sub-rule is conditional on `docs/internal/decisions/` existing.

**Fixtures:** `golden/docs-presence-ok`; anti - `docs-presence-empty-tutorials` (tutorials dir empty), `docs-presence-adr-no-tldr` (an ADR missing `## TL;DR`), `docs-presence-arch-unlinked` (overview without the detailed link). **Tests:** each anti fails naming the specific gap; golden passes.

---

## The `G7` inclusion renumber (P6, no module)

`STANDARD.md` sec 2.6 currently lists `G7 = "all Bronze + Silver by inclusion"` - a requirement with **no module** (it is the monotonic-tier property). P6 reclassifies it as an **unnumbered** tier-inclusion statement, so the number `G7` is free for the `docs-frontmatter` module. No code references `G7` as a module today (the Gold modules are `G1-G6`), so the renumber is a docs + reqId-assignment change, not a code migration. **Acceptance:** STANDARD.md sec 2.6 reads the inclusion statement without a `G7` label; `docs/reference/gold-checks.md` gains `G7-G10`; a grep finds no module claiming a duplicate reqId (`registry-sync`/a reqId-uniqueness test guards it).

---

## P0 demonstrative hook - the `G1` + `G3` contract

**Goal:** ship one real hook so `G1` (hook-documentation) grades a real artifact and `G6`-style vacuity is removed for `G1`.

**Files:**
- `hooks/hooks.json` - one `PreToolUse` hook, `matcher: "Write|Edit|NotebookEdit"`, action `command` pointing at the script. Well-formed per the `G1` shape (`type` per action, `matcher` for the tool-matched event).
- `hooks/no-dashes.mjs` (or `.py`) - reads the tool-call payload on stdin; if `new_string` / `content` / `new_source` contains U+2014 or U+2013, exits with a deny decision + a substitution reminder ("use ' - ' or restructure"); otherwise allows. Portable Node, no new dependency. Carries its own `source-doc` four-field docblock (so it passes `G9` at P5).
- `hooks/README.md` - frontmatter `title` + purpose + inventory (so `hooks/` passes `G8` at P4) and the prose documentation of the hook's **event / trigger / matcher / scope / failure behavior** (Standard sec 3.5).
- `evals/` - a `G3` regression case covering the `PreToolUse` hook event (e.g. `{ input_with_dash -> deny, clean_input -> allow }`), in the existing eval-set format so `library-regression` (`G3`) is satisfied.

**Check interactions:**
- `G1` (`hook-documentation`): now grades a real hook - passes because `type` + `matcher` are present and well-formed.
- `G3` (`library-regression`): the new hook event requires an eval; P0 ships it, so `G3` stays green (it would otherwise flag an uncovered hook event).
- `U10` (`no-dashes`): the hook prose + script obey the rule (and the hook itself enforces it going forward).
- `G8`/`G9` (later phases): `hooks/README.md` and the script's docblock are authored in P0 so the folder is already conformant when `G8`/`G9` flip.

**Acceptance:** `node scripts/check.mjs` stays green at advanced after P0; `G1` is demonstrably non-vacuous (removing the hook's `matcher` makes `G1` fail in a local probe); a dash in a `Write` payload is denied by the hook. **Fixtures/tests:** an existing-style hook fixture proves `G1` bites; an eval-coverage test proves `G3` requires the hook eval.

---

## Registry + numbering integrity (applies throughout)

- The new reqIds are `U12`, `G7`, `G8`, `G9`, `G10`. Confirm none collide with an existing module (today: `U1-U11`, `S1-S8`, `G1-G6`).
- Add a reqId-uniqueness assertion to the test suite if not already present (so a future duplicate is caught).
- The spine count moves `25 -> 30`; update the count anywhere it is asserted (tests that count checks, `tier-report` output expectations, docs).
