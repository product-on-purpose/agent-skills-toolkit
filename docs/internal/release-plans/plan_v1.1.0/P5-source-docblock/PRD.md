# P5 - source docblocks + source-doc (G9) - PRD

> Add a four-field header docblock (what-it-is / what-it-does / why / used-by) to every in-scope hand-authored source file, then turn on the Gold `source-doc` (`G9`) check that asserts those four field keys are present. Normative sources this packet realizes: [`SPEC.md`](../SPEC.md) (R-CONV-3, R-CHECK-G9), [`CHECKS-SPEC.md`](../CHECKS-SPEC.md) sec "G9 - `source-doc`", and [ADR 0024](../../../decisions/0024-documentation-depth-and-discoverability.md) (D1.2, D4). The phase obeys author-before-enforce (SPEC R-SEQ-1).

## Problem / motivation

ADR 0024's first decision driver is **anti-rot / single source of truth**: a conformance toolkit that ships rotted or unexplained source undercuts its own thesis. ADR 0024 D1 resolves the "how do we document source files" fork: not a sibling `.md` per source file (that maps to roughly 141 dual-maintenance files, most beside intentional test fixtures, each of which would itself have to pass the gate), but **folder-READMEs plus header docblocks**. P4 lands the folder-README half (`G8`). P5 lands the docblock half.

The gap P5 closes: today a contributor opening `scripts/checks/anatomy.mjs` or `scripts/lib/tier.mjs` cold has no in-file statement of what the file is, what it does, why it exists, or what depends on it. The JSDoc that exists is per-function API doc, not a file-level orientation. A reader has to reconstruct the file's role from its code. ADR 0024 D1.2 fixes this with a four-field header docblock mapped directly from the maintainer's words - **what it is, what it does, why it matters, what uses it** - on every hand-authored `*.mjs` / `*.js` / `*.py` under the in-scope source roots.

Why it matters to a plugin author (the downstream user): `G9` is a Gold check that any library aspiring to the advanced tier will owe. It teaches a cheap, deterministic, language-agnostic convention (a labeled comment block in the first lines of a file) that makes a source tree self-orienting without a parallel docs tree to maintain. Why it matters to the toolkit as the reference implementation: the toolkit must author its own conforming docblocks before flipping `G9` (non-vacuous tier discipline, ADR 0024 driver). Shipping `G9` green on the toolkit's own ~41-file source surface is the proof that the convention is affordable and that the check is sound.

This is a presence check, never a quality check. Whether the prose in a docblock is actually good routes to the behavioral `askit-evaluate` path, never the deterministic gate (Design Principle 3). `G9` asserts the four field keys are present and non-empty in the first ~30 lines, nothing more.

## Goals

- Every in-scope hand-authored `*.mjs` / `*.js` / `*.py` file carries a header docblock with the four fields (what it is, what it does, why it matters, what uses it), recognized by labeled lines or by the `@what` / `@does` / `@why` / `@usedby` JSDoc tags or by `#`-comment lines (Python).
- A new Gold check `scripts/checks/source-doc.mjs` (`reqId: G9`, tier `advanced`) asserts the presence of the four field keys in the first ~30 lines of each in-scope source file, and never inspects prose quality.
- The check is conditional/vacuous: a plugin with no in-scope source files passes with zero findings.
- The check excludes `tests/fixtures/**`, generated output, lockfiles, `node_modules`, `dist`, `.astro`, and `site/node_modules`, so it never over-reaches into intentional fixtures or build artifacts.
- Golden + anti fixtures (`source-doc-ok`, `source-doc-missing-why`) and unit tests, including a `.py`-comment passing case and a `tests/fixtures/**` `.mjs` being ignored, ship in the same PR.
- The phase PR is individually green on the toolkit's own dogfood at the advanced tier (gate 0/0, `npm test` green).

## Non-goals

- **No prose-quality judgment.** `G9` checks presence of the four keys, not whether the description is accurate, well-written, or non-vacuous. Quality routes to the behavioral `askit-evaluate` path, not the gate (Design Principle 3). A docblock that says `what-it-is: a file` passes `G9`; that is by design and is the deterministic/behavioral boundary.
- **No sibling `.md` per source file.** ADR 0024 D1 explicitly rejected that; P5 does not revive it.
- **No coverage of non-source files.** `*.json` (including `manifest.generated.json`), `*.md`, `*.yaml`, `*.txt`, `.gitignore`, and lockfiles are out of scope; the docblock convention is for hand-authored code only.
- **No generated-output docblocks.** Files a generator writes (the emitted `site/src/content/docs/**`, the regenerated manifests) are out of scope; only the generator's own hand-authored source carries a docblock.
- **No new prefix skill and no new `askit-build-docs` mode.** P5 is a convention plus a check plus the authored docblocks. (The `folder-readme` mode is P4's addition; `source-doc` adds no mode.)
- **No re-formatting of existing JSDoc.** P5 adds a file-level header docblock; it does not touch the per-function JSDoc already present in files like `findings.mjs`.
- **No version bump and no Standard edit.** Those land in P6. P5 only authors docblocks and flips `G9`.

## Users and value

- **Plugin authors / downstream library maintainers.** Gain a cheap, language-agnostic, deterministic convention for keeping a source tree self-orienting, and a check that enforces it without a parallel docs tree to maintain.
- **Toolkit contributors.** Open any `scripts/**` file and read, in the first lines, what it is, what it does, why it exists, and what depends on it - the fastest possible cold-start orientation, and a refactor-safety net (the `used-by` field names the call sites).
- **The toolkit as the reference implementation.** Dogfoods ADR 0024 D1.2 on its own source surface; the Gold spine gains a fourth docs-depth check that proves non-vacuously.
- **Reviewers.** The `used-by` field makes the blast radius of a change legible at the top of the file.

## Scope

What lands in this phase (one PR vs protected `main`):

1. A four-field header docblock added to **every in-scope hand-authored source file that lacks one**. The enumerated target set is in [`SPEC.md`](./SPEC.md) "Content / artifacts to author"; it is primarily `scripts/**` (all 41 tracked `*.mjs`) and the two `site/scripts/**` link guards that currently use a prose header. The files already carrying a recognized docblock (`hooks/no-dashes.mjs` from P0, and the two `site/scripts/**` generator/guard files `gen-docs-site.mjs` and `check-generated-untracked.mjs`) are left as-is once confirmed conformant.
2. `scripts/checks/source-doc.mjs` - the Gold `G9` check module.
3. Its registration line in `scripts/lib/registry.mjs`.
4. Golden fixture `tests/fixtures/golden/source-doc-ok/` and anti fixture `tests/fixtures/anti/source-doc-missing-why/`, plus a `.py` golden case and a `tests/fixtures/**`-ignored case (realized as test assertions over the fixtures).
5. `tests/unit/source-doc.test.mjs` - unit tests.
6. Regenerated `INDEX.md` / `manifest.generated.json` only if the registry/check addition changes them (it adds no component, so likely no manifest delta; regenerate to confirm).

## Success metrics / definition of done

- [ ] `node scripts/check.mjs` -> Advanced, 0 errors / 0 warnings, with `source-doc` (`G9`) active.
- [ ] `npm test` green, including the new `tests/unit/source-doc.test.mjs` and the spine/registry assertions.
- [ ] Every in-scope hand-authored source file enumerated in SPEC carries a recognized four-field docblock (verified by the check passing over the real tree, the dogfood).
- [ ] The anti fixture `source-doc-missing-why` fails the check, naming the file and the missing field.
- [ ] A `.py` file with `#`-style fields passes; a `.mjs` under `tests/fixtures/**` is ignored.
- [ ] `git diff --name-only` shows only the intended files (docblocks + the check + fixtures + test + registry line + any regenerated manifest/index).
- [ ] No stale check-count claim is introduced (the `25 -> 30` count sweep is P6; P5 must not assert a count of its own).
- [ ] No em-dash (U+2014) or en-dash (U+2013) anywhere in the new content (U10 clean; the P0 hook also guards author-time).

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| The check over-reaches into `tests/fixtures/**` and flags intentional fixtures. | The scope walk excludes `tests/fixtures/**` by path, plus `node_modules`, `dist`, `.astro`, `site/node_modules`, and generated output. A unit test asserts a `.mjs` under `tests/fixtures/` is ignored. |
| The recognized label vocabulary is too narrow and rejects the docblocks already authored in P0 / P2b. | The check recognizes three styles per field: labeled lines (case-insensitive, hyphen or space separated, e.g. `what-it-is:` or `WHAT IT IS:`), `@what`/`@does`/`@why`/`@usedby` JSDoc tags, and `#`-comment lines (Python). The existing in-tree docblocks (uppercase `WHAT IT IS:` in `site/scripts/`, lowercase `what-it-is:` in `hooks/`) are both recognized. Confirmed against the real files before the flip. |
| A new source file added after P5 silently misses a docblock. | `G9` is repo-wide over the in-scope roots; any new in-scope file without the four fields fails the gate, so the convention is self-enforcing going forward. |
| The check false-passes a docblock that is below the body (not a header). | The check scans only the first ~30 lines (a header window), so a field key appearing deep in the file body does not satisfy it. Window size is a named constant. |
| The "first ~30 lines" window cuts off a long docblock and misses a field. | The toolkit's own docblocks are authored to fit the window; the window is generous (30 lines) and the four labeled lines are compact. The window constant is documented so a downstream author knows the budget. |
| The phase PR turns the check on before all docblocks are authored (gate red). | Author-before-enforce micro-order (IMPL): author every docblock first, run the gate without the check registered, then register `G9` last in the same PR and re-run. The check ships green on its own dogfood (R-SEQ-1). |
| The check is unsound (false pass or false fail). | Golden + anti fixtures plus an adversarial gate before merge (R-SEQ-2), the discipline that found soundness bugs at the Phase-5 Gold gate. |

## Dependencies and sequencing

- **Must already be on `main`:** the check architecture (`scripts/lib/registry.mjs`, `scripts/lib/findings.mjs`, `scripts/lib/fs-utils.mjs`), and the P0 hook (`hooks/no-dashes.mjs`, which was authored with the canonical docblock so it already satisfies `G9` when the check flips - IMPL-PLAN cross-phase dependency note). The P2b site scripts (`site/scripts/gen-docs-site.mjs`, `check-generated-untracked.mjs`) already carry recognized docblocks; the two link guards do not yet and are authored here.
- **Author-before-enforce order (within P5):** author all missing docblocks first (the gate stays green because `G9` is not registered yet), then add `source-doc.mjs` and its registry line last, then re-run the gate so it ships green on the toolkit's own dogfood. This realizes SPEC R-SEQ-1.
- **Downstream:** P6 enforces `G10`, bumps the Standard to v0.10, and does the `25 -> 30` count sweep. P5 must not pre-empt the count sweep or the Standard edit. P5 leaves `main` green at the 26-check-and-growing spine (the absolute count is P6's to finalize and assert).
- **Independence:** P5 is sequential after P4 in the careful repo-wide tail (IMPL-PLAN sec "Cross-phase dependencies"); it does not depend on P3 (diagrams) or the site build except that the two `site/scripts/` link guards it edits must keep working (a docblock comment addition does not change their behavior).
