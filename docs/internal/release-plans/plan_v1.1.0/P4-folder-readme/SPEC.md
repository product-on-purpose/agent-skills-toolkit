# P4 - folder-READMEs + folder-readme (G8) - SPEC

> Realizes packet [`SPEC.md`](../SPEC.md) requirements **R-CONV-1**, **R-CONV-2**, **R-CONV-4**, and **R-CHECK-G8** (with **R-CHECK-6** for the shared check-module contract), per [`CHECKS-SPEC.md`](../CHECKS-SPEC.md) section "G8 - folder-readme" and [ADR 0024](../../../decisions/0024-documentation-depth-and-discoverability.md) D1 / D4 / D5. RFC 2119 language throughout: MUST / SHOULD / MAY.

## Requirements

### R-CONV-1 (expanded) - every meaningful folder carries a matching-inventory README

Every **meaningful folder** (R-CONV-2 allowlist) that exists on the tree MUST carry a `README.md` that:

- **R-CONV-1a** MUST begin with YAML frontmatter containing a non-empty `title` (string). For a folder README **inside** `docs/**` (excluding `docs/internal/`), the README is also a `docs/**` page and therefore MUST additionally carry the full D3 taxonomy (`description`, `audience`, `level`; `tags` optional) so it satisfies `G7` as well. For a folder README **outside** `docs/`, only `title` is required by `G8` (the file is not a `docs/**` page, so `G7` does not apply).
- **R-CONV-1b** MUST state the folder's purpose in one to two sentences in the body.
- **R-CONV-1c** MUST carry an **inventory** whose listed set of immediate children **equals** the set of actual immediate children of the folder on disk, after excluding `README.md` itself and the R-CONV-2 excludes.
  - *Acceptance:* `folder-readme` (`G8`) reports 0 findings for the folder; adding a child file/subdir without adding it to the inventory yields an **under-listed** finding; listing a child that is not on disk yields a **phantom** finding; removing the `title` yields a no-title finding; deleting the README yields a missing-README finding.

The README body MAY be richer than the inventory (extra prose, usage notes, links); only the inventory set is matched (ADR 0024 D1). The inventory SHOULD give each listed child a one-line "what it is" (ADR 0024 D1.1), but `G8` asserts only the **set match** of names, not the presence or quality of the per-child descriptions (a quality concern routed to `askit-evaluate`, Design Principle 3).

### R-CONV-2 (expanded) - the meaningful-folder allowlist is exact

The set of folders `G8` checks MUST be **exactly** the ADR 0024 D1 allowlist, with `hooks/` added by P0:

- the repo **root**;
- `scripts/` and its `checks/`, `generators/`, `lib/` subdirectories;
- every `skills/*` skill directory (each immediate child of `skills/` that is a skill folder);
- `agents/`;
- `templates/` and `templates/seed-plugin/`;
- each immediate child of `docs/` **excluding `docs/internal/`** (today: `docs/tutorials/`, `docs/how-to/`, `docs/reference/`, `docs/explanation/`);
- `evals/`;
- `.github/workflows/`;
- `site/scripts/`;
- `hooks/` (added by P0).

The check MUST **exclude** `tests/fixtures/**`, any generated directory, lockfiles, `node_modules` (at any depth), `dist`, `.astro`, and `site/node_modules`. *Acceptance:* the module's scope set equals this allowlist; a fixtures subfolder without a README does not fail; an allowlisted folder that does not exist on the tree is skipped, not an error (R-CONV-2 conditional).

### R-CONV-4 (expanded) - the `folder-readme` authoring mode

`askit-build-docs` MUST gain a `folder-readme` mode that scaffolds and refreshes a folder README **from the actual directory listing** (so the inventory starts matching and stays matching), with **no new `askit-` prefix entry**. *Acceptance:* the mode is documented in `skills/askit-build-docs/SKILL.md`; following it produces a README whose inventory matches `fs.readdirSync(folder)` minus the excludes and `README.md`; running it again after a file is added refreshes the inventory to match.

### R-CHECK-G8 (expanded) - the `folder-readme` Gold check

`folder-readme` (Gold, `G8`) MUST assert R-CONV-1 and R-CONV-2 as a synchronous, deterministic, zero-model module under `scripts/checks/`, registered in the tier registry, with golden + anti fixtures and unit tests (R-CHECK-6). It MUST compute the **symmetric set difference** of the README's listed-children set and the on-disk-children set and report **each side distinctly** (under-listed vs phantom). It MUST NOT reuse `index-drift` (whole-document string equality) or `manifest-drift` (per-field scalar compares); it is new set-difference code. Severity is `error` at the advanced tier (a Gold check binds only a plugin that declares `advanced`; below that it is a burndown item, the existing tier-gating behavior).

## The check

**reqId:** `G8` · **tier:** `advanced` · **module:** `scripts/checks/folder-readme.mjs`

**`meta`:** `export const meta = { id: "folder-readme", tier: "advanced", reqId: "G8" };`

**Signature:** `export function check(ctx) -> Finding[]`, synchronous. `ctx.root` is the plugin root (absolute). Findings via `finding(meta.id, SEVERITY.ERROR, msg, { file, reqId: meta.reqId })` from `scripts/lib/findings.mjs`. Relative, slash-normalized paths via `relPath(root, abs)` from `scripts/lib/fs-utils.mjs`. Frontmatter via `parseFrontmatter(text)` from `scripts/lib/frontmatter.mjs`.

### Scope resolution (the allowlist, computed at runtime)

The module MUST build its list of folders-to-check **from the on-disk tree**, not a hardcoded list of leaf paths, so the per-`skills/*` set is correct on any plugin:

1. **Fixed roots** (checked if they exist): `.` (repo root), `scripts`, `scripts/checks`, `scripts/generators`, `scripts/lib`, `agents`, `templates`, `templates/seed-plugin`, `evals`, `.github/workflows`, `site/scripts`, `hooks`.
2. **Glob-expanded roots:** every immediate subdirectory of `skills/` (each `skills/<name>/`); every immediate subdirectory of `docs/` **except `internal`** (so `docs/tutorials`, `docs/how-to`, `docs/reference`, `docs/explanation`, and any future public quadrant).
3. An allowlisted folder that **does not exist** is skipped (not a finding) - the R-CONV-2 conditional.

The exact **skip set** for *children-of-a-folder* (names never counted as inventory items, never requiring a README) MUST be: `README.md` (the inventory file itself), and any name in the excluded set - `node_modules`, `dist`, `.astro`, plus the lockfile names (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`) and dotfiles MAY be excluded from the inventory at the maintainer's discretion (keep the exclude list in one named constant `INVENTORY_SKIP`, easy to extend). `tests/fixtures/**` is excluded **at the folder-selection layer** (it is never an allowlisted root and never a glob-expanded root), so a fixtures subfolder is ignored regardless of its contents.

### Per-folder asserts

For each in-scope folder:

1. **README presence.** If `README.md` is absent, emit one finding: `meaningful folder has no README.md (Standard sec 8.4 / ADR 0024 D1.1); scaffold one with: askit-build-docs folder-readme`. (path = the folder's `README.md` relative path.)
2. **Title presence.** Parse the README frontmatter. If `parseError` or no `frontmatter` or `title` is not a non-empty string, emit: `folder README must carry a frontmatter "title" (ADR 0024 D1.1).`
3. **Inventory set match.** Compute:
   - `onDisk` = `fs.readdirSync(folder)` minus `INVENTORY_SKIP` minus `README.md`.
   - `listed` = the set of immediate-child **names** the README references, taken as the union of (a) backticked tokens `` `name` `` that equal a child name on disk-or-not and (b) markdown link targets `[...](./name)` / `[...](name)` whose basename equals a child name. (Match by **name**; the README may reference a child either way.)
   - **under-listed** = `onDisk \ listed` -> one finding per name: `child "<name>" exists on disk but is not in the README inventory (under-listed); add it or refresh with askit-build-docs folder-readme.`
   - **phantom** = `listed \ onDisk` -> one finding per name: `README inventory lists "<name>" but it is not present on disk (phantom); remove it or refresh with askit-build-docs folder-readme.`

All findings carry `{ file: <relPath of the folder README>, reqId: "G8" }` and `SEVERITY.ERROR`.

### Recognized constants / vocabularies

- `INVENTORY_SKIP` (named `Set`): `README.md`, `node_modules`, `dist`, `.astro`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`. Extensible; the source of truth for "not an inventory item."
- `FIXED_ROOTS` (named array): the relative paths in "Scope resolution" step 1.
- `GLOB_ROOTS` (named structure): `{ parent: "skills", exclude: [] }` and `{ parent: "docs", exclude: ["internal"] }` - each expands to its existing immediate subdirectories.

### Conditional / vacuous rule

If **none** of the allowlisted folders exist (a bare plugin with no `scripts/`, `skills/`, `docs/`, etc.), `check` returns `[]` (vacuous pass) - consistent with the shared "a check that finds nothing to inspect passes" precedent. A plugin that has some allowlisted folders is checked only on those; a missing allowlisted folder is skipped.

### Edge cases

- **A folder README inside `docs/`** is also a `G7` page; `G8` checks only `title` + inventory, `G7` checks the rest of the taxonomy. The two are complementary, not conflicting.
- **An empty meaningful folder** (only a `README.md`, no other children): `onDisk` is empty, so an inventory listing nothing is a valid match (vacuous inventory). The README is still required to exist with a `title`.
- **A subdirectory child** (e.g. `scripts/checks` as a child of `scripts/`) is an inventory item of its parent's README **and** an allowlisted root in its own right - both the `scripts/README.md` inventory must list `checks` and `scripts/checks/README.md` must exist. No double-counting bug: each folder is evaluated independently.
- **`.gitkeep`-only folders** (`scripts/`, `skills/`, `templates/` historically carried `.gitkeep`): once a README is authored the `.gitkeep` MAY remain; if present on disk it is a child and MUST be in the inventory (or added to `INVENTORY_SKIP` if the maintainer prefers - decide once, document in the module). *Spec decision flagged below.*
- **Symlinks / non-regular entries** are read by name like any other child (the check is name-based; it does not stat-recurse).

### Example pass

`scripts/lib/README.md`:

```
---
title: scripts/lib - shared check libraries
---

# scripts/lib

Shared, dependency-light helpers the check modules and generators import: finding construction, frontmatter parsing, filesystem walks, plugin loading, and the tier registry.

## Inventory

- `findings.mjs` - the `finding()` factory and `SEVERITY`.
- `frontmatter.mjs` - `parseFrontmatter()` over a `---` fenced block.
- `fs-utils.mjs` - path/JSON/listing helpers.
- `load-plugin.mjs` - assembles the `PluginContext` a check receives.
- `registry.mjs` - the ordered `CHECKS` array.
- `tier.mjs` - tier gating and burndown.
```

On disk `scripts/lib/` holds exactly those six `.mjs` files (plus the README). `listed == onDisk`, `title` present -> 0 findings.

### Example fail

Same README, but `scripts/lib/` also contains a new `cache.mjs` not in the inventory, and the inventory still lists a removed `legacy.mjs`. `G8` emits two findings: `child "cache.mjs" exists on disk but is not in the README inventory (under-listed)` and `README inventory lists "legacy.mjs" but it is not present on disk (phantom)`.

## Content / artifacts to author

### The folder READMEs (enumerated against the real current tree)

Each README MUST carry frontmatter `title`, a 1-2 sentence purpose, and an inventory matching the folder's actual immediate children at author time. The list below enumerates every README P4 must author against the tree as it stands on this branch; the executor MUST re-run the directory listing at author time and reconcile (the count below is the planning baseline, not a frozen contract - files may have moved by execution).

**Already conformant from prior phases (do not re-author, verify only):**
- `hooks/README.md` (P0) - title `Hooks`, inventory `hooks.json`, `no-dashes.mjs`.
- `skills/askit-build-skill/README.md`, `skills/askit-evaluate/README.md` - **verify** they carry a frontmatter `title` and an inventory matching their dirs; these were authored as human overviews and MAY lack the `title` frontmatter or an inventory, in which case P4 brings them into conformance.

**Fixed roots to author (12):**
1. `README.md` (repo root) - **the hero README is rewritten in P3**; P4 MUST ensure the root README carries a frontmatter `title` and an inventory of the repo's immediate children (the top-level files and folders: `scripts`, `skills`, `agents`, `commands`, `templates`, `docs`, `evals`, `hooks`, `site`, `tests`, `library.json`, `STANDARD.md`, `INDEX.md`, `QUICKSTART.md`, `README.md`-excluded, `package.json`, etc.). *Coordinate with P3 so the hero rewrite keeps the `title` and the inventory section.* *Spec decision flagged below: scope of the root inventory.*
2. `scripts/README.md` - inventory: `check.mjs`, `evaluate.mjs`, `tier-report.mjs`, `.gitkeep` (if kept), `checks`, `generators`, `lib`.
3. `scripts/checks/README.md` - inventory: the 27 check modules (`agent-targets.mjs` ... `workflow-skills.mjs`, including `docs-frontmatter.mjs`; plus `folder-readme.mjs` added in this same PR - author the inventory to include it).
4. `scripts/generators/README.md` - inventory: `gen-index.mjs`, `gen-manifest.mjs`, `sync-agents-md.mjs`.
5. `scripts/lib/README.md` - inventory: `findings.mjs`, `frontmatter.mjs`, `fs-utils.mjs`, `load-plugin.mjs`, `registry.mjs`, `tier.mjs`.
6. `agents/README.md` - inventory: `_chain-permitted.yaml`, `askit-evaluator.md`, `askit-explorer.md`, `askit-file-ops.md`, `askit-file-search.md`, `askit-quality-grader.md`, `askit-reviewer.md`, `askit-skill-author.md`.
7. `templates/README.md` - inventory: `SKILL.md`, `adr.md`, `agent.md`, `chain-permitted.yaml`, `command.md`, `eval-set.json`, `hooks.json`, `mcp.json`, `onboarding-questionnaire.template.md`, `output-style.md`, `workflow.md`, `.gitkeep` (if kept), `seed-plugin`.
8. `templates/seed-plugin/README.md` - **already exists**; verify it carries `title` + an inventory matching its contents (`AGENTS.md`, `CHANGELOG.md`, `library.json`, `README.md`-excluded). It is a *seed* README, so its inventory MUST cover the seed-plugin's own files, not act as a template token. *Spec decision flagged below.*
9. `evals/README.md` - inventory: the six `*.eval.json` files (`build-skill-to-author.eval.json`, `evaluate-to-evaluator.eval.json`, `evaluate-to-quality-grader.eval.json`, `evaluate-to-reviewer.eval.json`, `no-dashes-hook.eval.json`, `skill-author-to-evaluator.eval.json`).
10. `.github/workflows/README.md` - inventory: `ci.yml`, `deploy-pages.yml`, `release.yml`. *Note:* GitHub renders `.github/workflows/README.md` harmlessly; it is a workflow-folder explainer, not a workflow file.
11. `site/scripts/README.md` - inventory: `check-generated-untracked.mjs`, `check-rendered-links.mjs`, `check-route-parity.mjs`, `gen-docs-site.mjs`, `route-manifest.txt`.

**Glob-expanded `skills/*` (24 skill dirs; author a README in each that lacks one):**
`askit-backlog`, `askit-build-agents-md`, `askit-build-chain-contract`, `askit-build-command`, `askit-build-docs`, `askit-build-hook`, `askit-build-mcp`, `askit-build-output-style`, `askit-build-samples`, `askit-build-settings`, `askit-build-skill` (exists - verify), `askit-build-statusline`, `askit-build-subagent`, `askit-build-workflow`, `askit-capability-advisor`, `askit-decision`, `askit-deprecate`, `askit-evaluate` (exists - verify), `askit-init-marketplace`, `askit-init-plugin`, `askit-migrate`, `askit-release`, `askit-template-manager`. Each skill README's inventory MUST list that skill's immediate children (typically `SKILL.md`, and `references/` if present). *Note:* `skills/` also tracks a `.gitkeep`; `skills/` itself is **not** an allowlisted root (the allowlist is `skills/*`, the individual skill dirs), so `skills/.gitkeep` needs no parent README and `skills/` is not checked. *Spec decision flagged below.*

**Glob-expanded `docs/*` quadrants (4; these READMEs are also `G7` pages):**
`docs/tutorials/README.md`, `docs/how-to/README.md`, `docs/reference/README.md`, `docs/explanation/README.md`. Each MUST carry the **full D3 taxonomy** (`title`, `description` no colon-space, `audience`, `level`, optional `tags`) so it passes `G7`, plus an inventory listing the quadrant's pages. *Spec decision flagged below: whether `docs/` itself (the public docs root) gets a README - the allowlist is `docs/*` (the quadrants), not `docs/` the root, so by the literal allowlist `docs/` the root is NOT checked.*

### The `folder-readme` mode (SKILL.md addition)

Add a `## folder-readme mode` section to `skills/askit-build-docs/SKILL.md` and update the skill `description` + the Diataxis mode list to include `folder-readme`. The mode steps:
1. Read `fs.readdirSync(folder)`, drop `INVENTORY_SKIP` and `README.md`.
2. If `README.md` exists, parse its frontmatter and inventory; refresh the inventory list to the current children, preserving existing one-line descriptions and the purpose paragraph; otherwise scaffold a new README with a `title` derived from the folder path, a one-sentence purpose placeholder for the author to fill, and an inventory line per child.
3. Emit the README so `folder-readme` (`G8`) passes; do not invent descriptions for quality (the author fills the "what it is" text; the mode guarantees the set match).

## Acceptance criteria

A checklist the executor verifies before opening the PR:

- [ ] `node scripts/check.mjs` -> **Advanced, 0/0**, with `folder-readme` (`G8`) registered and green on the toolkit's own tree.
- [ ] `node scripts/tier-report.mjs` -> advanced, empty burndown (no `G8` burndown item).
- [ ] `npm test` green; `tests/unit/folder-readme.test.mjs` present and passing; `registry-sync` still green (the new check returns an array synchronously).
- [ ] The three anti fixtures bite: `folder-readme-missing-child` (under-listed finding), `folder-readme-phantom` (phantom finding), `folder-readme-no-title` (title finding); the golden `folder-readme-ok` passes with 0 findings; a fixtures subfolder is ignored; a no-allowlisted-folder plugin passes vacuously.
- [ ] Every allowlisted folder that exists on the tree has a conforming `README.md`; the `docs/` quadrant READMEs also pass `G7`.
- [ ] `(cd site && npm run build)` still succeeds and the **14.11 guards** (`check-rendered-links.mjs`, `check-route-parity.mjs`, `check-generated-untracked.mjs`) pass - new `docs/` quadrant READMEs are emitted to the generated site and must not break links or route parity; update `site/scripts/route-manifest.txt` if a quadrant README publishes a new route.
- [ ] `gen-index` / `gen-manifest` re-run; `INDEX.md` and the manifests are consistent (`index-drift` `G4`, `manifest-drift` `U8` green); no stale check count introduced anywhere by P4 (the `25 -> 30` count and `G1-G10` wording are P6's sweep, not P4's).
- [ ] No em-dash (U+2014) / en-dash (U+2013) anywhere in the new READMEs, fixtures, mode prose, or check code; the P0 hook denies none of P4's writes.
- [ ] `git diff --name-only` shows only the intended files; the generated `site/src/content/docs/**` stays untracked.

## Out of scope

- Source-file docblocks + `source-doc` (`G9`) - **P5**.
- `docs-presence` (`G10`), the `G7`-inclusion renumber, `STANDARD.md` v0.10, the `library.json`/`package.json` version bump to `1.1.0`, and the "25-check / G1-G7" -> "30-check / G1-G10" wording sweep - **P6**.
- The README hero rewrite and the four mermaid diagrams + `U12` - **P3** (P4 only guarantees the root README keeps a `title` + inventory; coordinate, do not duplicate).
- Any quality judgment of README prose or per-child descriptions - routes to `askit-evaluate` (behavioral), never `G8`.

## Spec decisions flagged for maintainer confirmation

1. **`docs/` root README.** The ADR 0024 D1 allowlist reads `docs/*` (the immediate children of `docs/`, i.e. the four Diataxis quadrants), **not** `docs/` the root. This SPEC follows the literal allowlist: the four quadrant folders are checked; `docs/` the root is **not** an allowlisted folder and gets no `G8`-mandated README. Confirm this is intended (alternative: also require `docs/README.md` as a landing for the public docs tree).
2. **`.gitkeep` and inventory.** Several folders historically carry a `.gitkeep` (`scripts/.gitkeep`, `skills/.gitkeep`, `templates/.gitkeep`). This SPEC's default is to **list `.gitkeep` in the inventory** if it remains on disk (it is a real immediate child), or to add `.gitkeep` to `INVENTORY_SKIP` once. Recommendation: add `.gitkeep` to `INVENTORY_SKIP` (it is scaffolding, not content) and delete the now-redundant `.gitkeep` from any folder that gains a README. Confirm the preference.
3. **`skills/` is not itself checked.** The allowlist is `skills/*` (each skill dir), so the `skills/` parent folder is not an allowlisted root and needs no README; `skills/.gitkeep` therefore needs no parent inventory. Same logic for `templates/seed-plugin` being checked while not forcing `templates/` to list seed-plugin's internals (it lists `seed-plugin` as one child). Confirm.
4. **`templates/seed-plugin/README.md` dual role.** That README is part of a *seed* plugin (scaffolding copied into a new plugin). Its inventory documents the seed-plugin's own files. Confirm it should be a real folder README (subject to `G8`) rather than a templated token file excluded from the check.
