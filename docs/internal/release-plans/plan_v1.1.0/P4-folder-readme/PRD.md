# P4 - folder-READMEs + folder-readme (G8) - PRD

> Land a `README.md` in every meaningful folder (frontmatter `title` + a 1-2 sentence purpose + an inventory whose listed immediate children equal the actual immediate children), add the `askit-build-docs` `folder-readme` mode that scaffolds and refreshes those READMEs from the real directory listing, and flip on a new Gold check `folder-readme` (`G8`) that enforces the inventory match. Normative source you must not contradict: the packet [`SPEC.md`](../SPEC.md) (R-CONV-1/2/4, R-CHECK-G8), [`CHECKS-SPEC.md`](../CHECKS-SPEC.md) ("G8 - folder-readme"), and [ADR 0024](../../../decisions/0024-documentation-depth-and-discoverability.md) (D1, D4, D5).

## Problem / motivation

ADR 0024's first decision driver is **anti-rot / single source of truth**: a conformance toolkit that ships rotted or undiscoverable documentation undercuts its own thesis. ADR 0024 D1 resolves the "document every source file" fork by **rejecting** the sibling-`.md`-per-source-file rule (it would map to ~141 hand-maintained files, 84 under `tests/`, each its own dual-maintenance and gate-passing surface) in favor of two leaner conventions: **folder-READMEs** and **header docblocks**. P4 ships the first of those two.

The gap P4 closes: today the repository has only a handful of hand-written folder READMEs (`hooks/README.md` from P0, `skills/askit-build-skill/README.md`, `skills/askit-evaluate/README.md`, the governance READMEs under `docs/internal/`, and `templates/seed-plugin/README.md`). The structurally important folders a newcomer first opens - `scripts/`, `scripts/checks/`, `scripts/generators/`, `scripts/lib/`, `agents/`, `evals/`, `templates/`, the four `docs/` Diataxis quadrants, `.github/workflows/`, `site/scripts/`, and each `skills/*` - have no folder-level explainer, so the only way to learn what a folder holds is to read its files. Worse, nothing keeps such a README honest as files come and go: a README that lists yesterday's files is a rot surface, exactly the failure the toolkit exists to prevent.

ADR 0024 D1.1 fixes both halves at once: a folder `README.md` whose **listed inventory must match the actual immediate children**, enforced by a deterministic `folder-readme` check (`G8`) that computes the set difference of listed-vs-on-disk children and reports under-listed and phantom entries. This is the same drift-detection discipline already applied to `INDEX.md` (`index-drift`, `G4`) and the generated manifests (`manifest-drift`, `U8`), now applied to folder documentation: add or remove a child without updating its folder README and the gate goes red.

Why it matters to a **plugin author**: `G8` ships as reusable Gold capability. Any library a user grades at advanced gets the same self-documenting-folder guarantee, and the new `askit-build-docs` `folder-readme` mode gives them a one-command way to scaffold and refresh conforming READMEs from the real directory listing (no hand-listing, no drift). Why it matters to the **toolkit as the reference implementation**: the toolkit dogfoods its own anti-rot philosophy on its own tree, so "the repo documents itself folder by folder, without a rot surface" (ADR 0024 Consequences) becomes a fact the gate proves, not a claim in prose.

## Goals

- Author a conforming `README.md` (frontmatter `title`, a 1-2 sentence purpose, an inventory matching the actual immediate children) in **every meaningful folder** per the ADR 0024 D1 allowlist that exists on the current tree, enumerated concretely in this packet's SPEC (repo root, `scripts/` and its `checks/`/`generators/`/`lib/` subdirs, every `skills/*` skill dir, `agents/`, `templates/` and `templates/seed-plugin/`, the four `docs/` Diataxis quadrants, `evals/`, `.github/workflows/`, `site/scripts/`, and `hooks/` from P0).
- Add a `folder-readme` mode to `askit-build-docs` (no new `askit-` prefix skill, per ADR 0024 D5) that scaffolds and refreshes a folder README from the actual directory listing so the inventory starts matching and stays matching.
- Add a new, self-contained Gold check `scripts/checks/folder-readme.mjs` (`reqId: G8`, `tier: advanced`) that computes the symmetric set difference between the README's listed children and the on-disk immediate children, reporting **under-listed** (on disk, not listed) and **phantom** (listed, not on disk), plus a missing README and a README without a `title`.
- Ship `G8` green on the toolkit's own dogfood: author all READMEs first (author-before-enforce), then register the check in the same PR (or split P4a author / P4b enforce if the diff is large).
- Provide golden + anti fixtures (`folder-readme-ok`, `folder-readme-missing-child`, `folder-readme-phantom`, `folder-readme-no-title`) and unit tests covering each branch, the vacuous-pass case, and the fixtures-are-ignored case.

## Non-goals

- **No quality judgment.** `G8` asserts presence of a README, a `title`, and an inventory that *matches the directory* - never whether the purpose sentence or the per-child descriptions are *good*. Prose quality routes to the behavioral `askit-evaluate` path (ADR 0024 Design Principle 3), never the deterministic gate.
- **No source-file docblocks.** The four-field `// what-it-is / what-it-does / why / used-by` header docblock convention and its `source-doc` (`G9`) check are P5; P4 touches only folder READMEs.
- **No new `askit-` prefix skill.** The authoring capability lands as one new *mode* on the existing `askit-build-docs` skill (ADR 0024 D5).
- **No reuse of `index-drift` / `manifest-drift`.** Those compare a *generated* artifact to a freshly regenerated string (`index-drift`) or per-field scalars (`manifest-drift`); they do no set logic. `G8` is **new code** computing a set difference of names. Do not try to route folder READMEs through `gen-index`.
- **No scope creep into excluded directories.** `tests/fixtures/**`, generated dirs, `node_modules`, `dist`, `.astro`, `site/node_modules`, and lockfiles are out of scope and must not acquire a README or be checked.
- **No version, Standard, or renumber work.** `STANDARD.md` v0.10, the `G7`-inclusion renumber, and the `library.json` version bump are P6. P4 adds a check at the existing Standard line; the spine-count and STANDARD wording sweeps belong to P6.

## Users and value

- **A plugin author at Gold** gets a self-documenting-folder guarantee for their own library, plus a `folder-readme` mode that scaffolds and refreshes conforming folder READMEs from the directory listing - no hand-listing, no drift maintenance.
- **A newcomer to the toolkit** can open any meaningful folder and read, in one place, what the folder is for and what each immediate child is, with the gate guaranteeing that inventory is current.
- **The maintainer** gets a gate that goes red the moment a file is added or removed without updating its folder README, removing a silent rot surface and making "self-documenting repo" a checkable property.
- **The toolkit as reference implementation** demonstrably dogfoods ADR 0024 D1: the conformance gate proves the repo documents itself folder by folder.

## Scope

Lands in P4:

1. **Folder READMEs** in every meaningful folder per the enumerated allowlist (this packet's SPEC lists every README to author against the real current tree).
2. **The `askit-build-docs` `folder-readme` mode** (`skills/askit-build-docs/SKILL.md`) that scaffolds and refreshes a folder README from `fs.readdirSync`.
3. **The check** `scripts/checks/folder-readme.mjs` (`G8`, advanced), registered in `scripts/lib/registry.mjs`.
4. **Fixtures**: `tests/fixtures/golden/folder-readme-ok/`, `tests/fixtures/anti/folder-readme-missing-child/`, `tests/fixtures/anti/folder-readme-phantom/`, `tests/fixtures/anti/folder-readme-no-title/`.
5. **Unit tests**: `tests/unit/folder-readme.test.mjs`.
6. **Regenerated generated files** where a new README changes them (`INDEX.md`, manifests) - run `gen-index` / `gen-manifest` and commit the result if anything moves.

Out (other phases): the source docblocks + `G9` (P5); `docs-presence` + `G10` + the renumber + Standard v0.10 + version bump (P6); the README hero + diagrams + `U12` (P3); frontmatter taxonomy content + `G7` (P1/P2).

## Success metrics / definition of done

- [ ] `node scripts/check.mjs` -> Advanced, 0 errors / 0 warnings, with `folder-readme` (`G8`) registered and passing on the toolkit's own tree.
- [ ] Every meaningful folder in the enumerated allowlist that exists on the tree carries a `README.md` with a frontmatter `title`, a 1-2 sentence purpose, and an inventory whose listed immediate children exactly equal the actual immediate children (modulo `README.md` itself and the excludes).
- [ ] `npm test` green, including a new `tests/unit/folder-readme.test.mjs` whose anti fixtures each bite (`missing-child`, `phantom`, `no-title`) and whose golden passes; a fixtures subfolder is ignored; a tree with no allowlisted folders passes vacuously.
- [ ] The `folder-readme` mode exists in `skills/askit-build-docs/SKILL.md` and produces a README whose inventory matches the directory (R-CONV-4).
- [ ] Adding or removing a child in any allowlisted folder without updating its README makes `G8` fail (proven by the anti fixtures and a local probe).
- [ ] No stale counts introduced; no em-dash (U+2014) or en-dash (U+2013) anywhere in the new prose, fixtures, or code; the PreToolUse no-dash hook (P0) does not deny any P4 write.
- [ ] `git diff --name-only` shows only intended files; the generated site output stays gitignored and untracked.

## Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| The check over-reaches into `tests/fixtures/**` or generated dirs and flags fixtures missing a README | Medium | The allowlist is an explicit positive set (only listed roots are checked); `tests/fixtures/**`, `node_modules`, `dist`, `.astro`, `site/node_modules`, lockfiles are never in scope. A unit test asserts a fixtures subfolder is ignored. |
| Inventory matching is too brittle (a README that mentions a child in prose but not as an inventory item, or vice versa, false-fails) | Medium | The "listed" set is the union of backticked names and link targets that resolve to an immediate child name; the README body may be richer than the inventory (ADR 0024 D1: "only the inventory set is matched"). The match is by child *name*, set-equality after stripping `README.md` and the excludes. |
| `index-drift` / `manifest-drift` accidentally reused, producing wrong semantics (whole-string or scalar compare, not set logic) | Low | SPEC and CHECKS-SPEC both mandate **new code** computing a symmetric set difference; the IMPL skeleton spells it out; the adversarial gate checks for accidental reuse. |
| The new READMEs themselves drift the instant a later phase (P5) adds files to a folder | Medium | `G8` is exactly the guard against this: P5 adding `*.mjs` docblocks does not add or remove files, so the inventories stay valid; any genuinely new file in a later phase will be caught red by `G8` and must update the README. |
| A folder README's frontmatter conflicts with the docs-site generator or `G7` (`docs-frontmatter`) | Low | `G7` scopes to `docs/**` excluding `docs/internal/`; folder READMEs outside `docs/` are not in `G7` scope. A `docs/` quadrant README carries the full D3 taxonomy (it is a `docs/**` page) so it satisfies both `G7` and `G8`. |
| Em/en dash slips into the flood of new README prose | Medium | The P0 PreToolUse hook denies any write containing U+2014/U+2013, `U10` (`no-dashes`) scans at rest, and the per-phase adversarial gate sweeps. |

## Dependencies and sequencing

**Must already be on `main` before P4:**

- **P0** - the demonstrative hook, which makes `hooks/` a meaningful folder and authors `hooks/README.md` (frontmatter `title` + inventory). The allowlist in `G8` therefore includes `hooks/`, and that folder is already conformant when `G8` flips. (Recorded in IMPL-PLAN P0: "record it so P4's G8 allowlist includes it.")
- **P1/P2** - the public `docs/` Diataxis tree and the frontmatter taxonomy; the four `docs/` quadrant folders exist and their pages carry the D3 frontmatter, so a quadrant README is a normal `docs/**` page that also satisfies `G7`.
- **P3** is independent of P4 (diagrams + `U12`); it need not precede P4 but commonly will under the default cadence.

**Author-before-enforce order within P4** (ADR 0024 D6; R-SEQ-1): author every folder README first (the gate stays green because `G8` does not exist yet), add the `folder-readme` mode, then register and turn on `folder-readme` (`G8`) - it ships green on its own dogfood because the conforming READMEs already exist. If the README diff is large, split into P4a (author all READMEs + the mode) and P4b (add + register the check); each half is individually green. No phase enforces a check whose artifacts are not already present (R-SEQ-1), and the check-adding PR passes an adversarial gate before merge (R-SEQ-2).
