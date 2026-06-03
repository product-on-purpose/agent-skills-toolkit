# P5 - source docblocks + source-doc (G9) - SPEC

> Realizes packet [`SPEC.md`](../SPEC.md) requirements **R-CONV-3** (the four-field source docblock convention) and **R-CHECK-G9** (the `source-doc` Gold check), per [`CHECKS-SPEC.md`](../CHECKS-SPEC.md) sec "G9 - `source-doc`" and [ADR 0024](../../../decisions/0024-documentation-depth-and-discoverability.md) D1.2 / D4. Cross-cutting: R-SEQ-1 (author-before-enforce) and R-SEQ-2 (adversarial gate). RFC 2119 language throughout.

## Requirements

### R-CONV-3 (expanded) - the four-field source docblock

**R-CONV-3.1** Every hand-authored `*.mjs` / `*.js` / `*.py` file under the in-scope source roots MUST carry a header docblock, within the file's first 30 lines, containing four non-empty fields mapped from the maintainer's words: **what it is**, **what it does**, **why it matters**, **what uses it**.
- *Acceptance:* `source-doc` (`G9`) returns zero findings over the toolkit's in-scope source tree; deleting any one field from any in-scope file makes `G9` fail, naming the file and the missing field.

**R-CONV-3.2** A field MUST be recognized in any of three equivalent styles, so the convention is language-agnostic and does not impose a single comment syntax:
1. a **labeled line** whose label is one of the field's recognized aliases (case-insensitive), followed by a colon and non-empty text (for example `// what-it-is: ...`, `// WHAT IT IS: ...`, `# why: ...`);
2. a **JSDoc tag** `@what` / `@does` / `@why` / `@usedby` followed by non-empty text;
3. the same labeled line inside a Python `#` comment (so `.py` files need no JSDoc).
- *Acceptance:* a `.mjs` with lowercase `what-it-is:` style passes; a `.mjs` with uppercase `WHAT IT IS:` style passes; a `.mjs` with `@what`/`@does`/`@why`/`@usedby` tags passes; a `.py` with `#`-comment labeled lines passes. (The first two and the `.py` case are covered by fixtures/tests; the JSDoc-tag alias is asserted by a focused unit test.)

**R-CONV-3.3** The check MUST assert **presence of the four field keys only**, never the quality, accuracy, or non-vacuity of the prose. Prose quality routes to the behavioral `askit-evaluate` path (Design Principle 3).
- *Acceptance:* a docblock whose field values are trivial-but-non-empty passes `G9`; there is no quality assertion in the module or its tests.

**R-CONV-3.4** The in-scope source roots MUST be exactly: `scripts/**` (the primary surface, including `scripts/checks/`, `scripts/generators/`, `scripts/lib/`, and the top-level `scripts/*.mjs` entrypoints), plus any hand-authored `*.mjs`/`*.js`/`*.py` directly under the G8 meaningful-folder allowlist roots, plus `site/scripts/**` (hand-authored site tooling). The check MUST exclude `tests/fixtures/**`, generated output (the emitted `site/src/content/docs/**`; `manifest.generated.json` is JSON and out of scope anyway), lockfiles, `node_modules`, `dist`, `.astro`, and `site/node_modules`.
- *Acceptance:* a `.mjs` placed under `tests/fixtures/` is ignored by the check; a file under `node_modules`/`dist`/`.astro` is never walked.

**R-CONV-3.5** The check MUST be conditional (vacuous): a plugin with no in-scope source files SHALL produce zero findings.
- *Acceptance:* the check over a fixture plugin that has no `scripts/`, `site/scripts/`, or other in-scope source returns an empty array.

### R-CHECK-G9 (expanded) - the `source-doc` module

**R-CHECK-G9.1** `source-doc` MUST be a synchronous, deterministic, zero-model module under `scripts/checks/`, exporting `meta = { id: "source-doc", tier: "advanced", reqId: "G9" }` and a synchronous `check(ctx)` that returns an array of `finding(...)` objects.
- *Acceptance:* the `registry-sync` test (which asserts every check returns synchronously) passes with `source-doc` registered; the module has no `async`, no `await`, no network, no import of a model.

**R-CHECK-G9.2** `source-doc` MUST be registered in the `CHECKS` array in `scripts/lib/registry.mjs` and MUST carry the `G9` reqId, which maps to the advanced tier (G-prefix => advanced).
- *Acceptance:* `tierForReq("G9")` resolves to `advanced`; `check.mjs`, `tier-report.mjs`, and the burndown pick the module up; the reqId-uniqueness assertion (CHECKS-SPEC "Registry + numbering integrity") finds no collision with `U1-U12`, `S1-S8`, `G1-G8`, `G10`.

**R-CHECK-G9.3** Each finding MUST be `finding(meta.id, SEVERITY.ERROR, message, { file, reqId: meta.reqId })`, where `file` is the repo-relative path (via `relPath`) and `message` names the file and the specific missing field.
- *Acceptance:* the anti fixture produces a finding whose `message` mentions the missing field name and whose `file` is the offending file's repo-relative path, with `severity === "error"` and `reqId === "G9"`.

## The check

**reqId:** `G9` | **tier:** `advanced` | **module:** `scripts/checks/source-doc.mjs`

### Exact asserts

For each in-scope source file (see scope below), read the file, take the first 30 lines (`HEADER_LINES = 30`), and confirm all four field keys are present and each has non-empty trailing text. If any field is missing, emit one finding per missing field (or one finding listing the missing fields - see "Finding shape" below), naming the file and the field(s). A file that carries all four fields produces no finding.

### Recognized field vocabulary (the constants)

A single named table maps each of the four logical fields to its recognized aliases. Matching is case-insensitive and tolerant of `-`, `_`, or single spaces inside a label, so `what-it-is`, `what it is`, `WHAT IT IS`, and `whatItIs` all match the same field. The table (authoritative):

| Logical field | Labeled-line aliases (case-insensitive, separator-insensitive) | JSDoc tag |
|---|---|---|
| what it is | `what-it-is`, `what it is`, `whatitis`, `what` | `@what` |
| what it does | `what-it-does`, `what it does`, `whatitdoes`, `does` | `@does` |
| why it matters | `why`, `why-it-matters`, `why it matters` | `@why` |
| what uses it | `used-by`, `usedby`, `used by`, `what-uses-it`, `what uses it`, `uses` | `@usedby` |

A field is satisfied when, somewhere in the header window, a line matches either:
- `<comment-marker>? <alias> :  <non-empty text>` (the labeled-line form, where `<comment-marker>` is `//`, `#`, `*`, or absent), or
- `@tag <non-empty text>` (the JSDoc form).

Keep the alias table in one exported constant (`FIELDS`) so it is testable and extensible. The labeled-line regex MUST normalize the label (lowercase it, collapse `-`/`_`/spaces) before comparing against the alias set, so a new separator variant does not require a new regex.

### Scope + the exact skip set

The check walks the in-scope roots and collects every `*.mjs` / `*.js` / `*.py` file:
- **In scope:** `scripts/**`, `site/scripts/**`, and hand-authored `*.mjs`/`*.js`/`*.py` directly under the G8 allowlist roots (repo root, `agents/`, `templates/**`, `evals/`, `.github/workflows/`, `hooks/`, `skills/*`). In practice today the in-scope set is `scripts/**` (41 files) plus `site/scripts/**` (4 files) plus `hooks/no-dashes.mjs` (1 file).
- **Excluded (the exact skip set), matched by basename during the walk:** `node_modules`, `.git`, `dist`, `.astro`, `_LOCAL`, `_local`, `_agent-context`, `.memsearch`; and matched by path: `tests/fixtures/**`, `site/src/content/docs/**` (generated), `site/node_modules`, `site/dist`, `site/.astro`. Reuse the U10 `SKIP_DIRS` basename set where it overlaps (import the shared constant rather than re-listing), and add the path-based `tests/fixtures` and generated-output exclusions on top, because `SKIP_DIRS` is a basename set and `tests/fixtures` is a path, not a basename.
- **Excluded by extension:** anything that is not `.mjs` / `.js` / `.py` (so `*.json`, `*.md`, `*.yaml`, `*.txt`, lockfiles are never inspected).

### Conditional / vacuous rule

If the walk finds zero in-scope source files (a plugin with no `scripts/`, no `site/scripts/`, and no hand-authored source under the allowlist roots), the check returns `[]` (vacuous pass). This mirrors the `mcp-valid` / `deprecation` precedent: a check that finds nothing to inspect passes.

### Edge cases

- **Docblock below the header window.** A field key that appears only after line 30 does NOT satisfy the check; the four fields MUST be in the header window. (Prevents a stray mention in the file body from false-passing.)
- **Shebang line.** A `#!/usr/bin/env node` first line is counted within the 30-line window like any other line; it does not displace the budget meaningfully and the toolkit's docblocks sit immediately under it (see `hooks/no-dashes.mjs`).
- **Mixed comment markers.** A `.js`/`.mjs` file may use `//` or `/* */`; a `.py` file uses `#`. The labeled-line matcher is marker-agnostic (it strips a leading `//`, `#`, or `*` before reading the label), so all three pass.
- **Empty field value.** A label present but with no trailing text (e.g. `// why:` with nothing after) does NOT satisfy the field; the trailing text MUST be non-empty after trimming.
- **Duplicate fields.** A field satisfied by more than one matching line is fine (first match wins; no penalty for repetition).
- **A `.py` with no JSDoc.** Recognized via the `#`-comment labeled-line form; no JSDoc is required for Python.
- **A file that is all generated.** Out of scope by the generated-output exclusion (the emitted docs tree) or, for `manifest.generated.json`, by the extension exclusion (it is JSON).

### Example pass (`.mjs`, labeled-line style)

```
// what-it-is:   the no-dashes universal check (U10).
// what-it-does: scans .md and .mjs under the plugin root for em-dash / en-dash characters and reports each hit.
// why:          the house no-dash rule is the toolkit's most-cited content-hygiene rule; this enforces it at rest.
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs; covered by tests/unit/no-dashes.test.mjs.
import { readFileSync } from "node:fs";
```

### Example pass (`.py`, `#`-comment style)

```
# what-it-is:   a helper that prints the tier burndown as a table.
# what-it-does: reads the findings JSON on stdin and writes a formatted table to stdout.
# why:          gives a non-Node consumer a portable view of the gate result.
# used-by:      invoked by the CI summary step; not imported by the Node spine.
import sys
```

### Example fail (`source-doc-missing-why`)

```
// what-it-is:   a sample module with only three of the four fields.
// what-it-does: demonstrates the anti case for the source-doc check.
// used-by:      tests/unit/source-doc.test.mjs as the anti fixture.
export function noop() {}
```
The `why` field is absent => `G9` emits a finding naming the file and the missing `why` (what it matters) field.

## Content / artifacts to author

### The four-field docblock format (normative, what authors write)

A comment block in the file's first lines, immediately under any shebang, with four labeled lines (canonical lowercase hyphen style; the check also accepts the other recognized styles):

```
// what-it-is:   <one line: what kind of thing this file is>
// what-it-does: <one line: the behavior or output>
// why:          <one line: why it matters / the problem it solves>
// used-by:      <one line: the call sites / what depends on it>
```

For Python, the same four labels behind `#`. For a file already using `/** ... */` JSDoc, the `@what`/`@does`/`@why`/`@usedby` tag form is acceptable.

### In-scope source files enumerated against the REAL tree

The in-scope source surface today is **46 files**: 41 under `scripts/**`, 4 under `site/scripts/**`, and 1 under `hooks/`. Status as of grounding (which already carry a recognized docblock vs which P5 must author):

**`scripts/` entrypoints (3) - author docblock:**
- `scripts/check.mjs`
- `scripts/evaluate.mjs`
- `scripts/tier-report.mjs`

**`scripts/checks/` (26) - author docblock on each:**
- `agent-targets.mjs`, `agentskills.mjs`, `anatomy.mjs`, `chain-contract.mjs`, `command-contract.mjs`, `components-index.mjs`, `components-mirror.mjs`, `deprecation.mjs`, `description-score.mjs`, `docs-frontmatter.mjs`, `frontmatter-valid.mjs`, `hook-documentation.mjs`, `index-drift.mjs`, `instruction-budget.mjs`, `library-json.mjs`, `library-regression.mjs`, `manifest-drift.mjs`, `mcp-valid.mjs`, `name-matches-dir.mjs`, `no-dashes.mjs`, `per-target-presence.mjs`, `prefix.mjs`, `reference-links.mjs`, `release-notes.mjs`, `self-hosting.mjs`, `version-match.mjs`, `workflow-skills.mjs`
  - (That list is 27 names; the registry imports 26 distinct check modules plus `docs-frontmatter` added in P2. Reconcile the exact count against `git ls-files scripts/checks` at execution time; the new P5 file `source-doc.mjs` is authored WITH its own docblock and counts too.)

**`scripts/generators/` (3) - author docblock:**
- `gen-index.mjs`, `gen-manifest.mjs`, `sync-agents-md.mjs`

**`scripts/lib/` (6) - author docblock:**
- `findings.mjs`, `frontmatter.mjs`, `fs-utils.mjs`, `load-plugin.mjs`, `registry.mjs`, `tier.mjs`

**`site/scripts/` (4):**
- `gen-docs-site.mjs` - ALREADY carries a recognized docblock (uppercase `WHAT IT IS:` / `WHAT IT DOES:` / `WHY IT MATTERS:` / `WHAT USES IT:`). Confirm recognized; do not rewrite.
- `check-generated-untracked.mjs` - ALREADY carries the same recognized uppercase docblock. Confirm recognized; do not rewrite.
- `check-rendered-links.mjs` - has a freeform prose header, NOT the four labeled fields. **Author the four-field docblock** (add four labeled lines under the existing prose header, or convert the prose header to the four fields). The clause-14.11 behavior MUST NOT change; this is a comment-only edit.
- `check-route-parity.mjs` - same as above: freeform prose header, NOT the four labeled fields. **Author the four-field docblock.** Comment-only edit; 14.11 behavior unchanged.

**`hooks/` (1):**
- `hooks/no-dashes.mjs` - ALREADY carries the canonical lowercase `what-it-is:` / `what-it-does:` / `why:` / `used-by:` docblock (authored in P0). Confirm recognized; do not rewrite.

**Net authoring in P5:** the four-field docblock on ~38 `scripts/**` files plus the 2 `site/scripts/**` link guards (`check-rendered-links.mjs`, `check-route-parity.mjs`), i.e. ~40 files; the remaining 4 (two site scripts, the P0 hook, plus the P5 check file authored with its own docblock) already conform or are authored conformant. (Exact count is reconciled at execution against `git ls-files`; the enumeration above is the authoritative target list.)

> **Spec decision the maintainer should confirm:** the recognized label vocabulary MUST include the uppercase spaced variant `WHAT IT IS:` / `WHAT IT DOES:` / `WHY IT MATTERS:` / `WHAT USES IT:` already authored in `site/scripts/gen-docs-site.mjs` and `check-generated-untracked.mjs`, in addition to the canonical lowercase hyphen style in `hooks/no-dashes.mjs`. The alias table above does this (case-insensitive, separator-insensitive). If instead the maintainer wants ONE canonical style, those two site files would need rewriting to the lowercase hyphen form; the recommendation here is to accept both styles (lower authoring churn, the convention is presence-not-format).

### Excluded (do NOT author docblocks here)

Generators' OUTPUT (the emitted `site/src/content/docs/**`), `manifest.generated.json` and other `*.json`, lockfiles (`package-lock.json`), `node_modules/**`, `site/node_modules/**`, `dist/**`, `site/dist/**`, `.astro/**`, and everything under `tests/fixtures/**` (except the two intentional P5 fixture files, which are authored to demonstrate pass/fail and live under `tests/fixtures/` so the real check ignores them by path).

### The check module + fixtures + test

- `scripts/checks/source-doc.mjs` (the module, itself carrying a four-field docblock).
- `tests/fixtures/golden/source-doc-ok/` - a fixture plugin containing a `scripts/`-style `.mjs` with all four fields and a `.py` with `#`-style fields, plus a minimal `library.json` (`standard: "0.10"`, `tier: "advanced"`), and a `.mjs` planted under `tests/fixtures/`-equivalent path to prove ignore (or assert ignore via the real tree).
- `tests/fixtures/anti/source-doc-missing-why/` - the three-field anti case.
- `tests/unit/source-doc.test.mjs` - the unit tests.

## Acceptance criteria

A checklist the executor verifies before opening / merging the PR:

- [ ] `node scripts/check.mjs` -> Advanced, 0/0, with `source-doc` (`G9`) registered and passing over the real source tree (the dogfood).
- [ ] `npm test` green, including `tests/unit/source-doc.test.mjs` and the existing `registry-sync` / reqId-uniqueness / spine assertions.
- [ ] The anti fixture `source-doc-missing-why` fails the check, the message naming the file and the missing `why` field; the golden `source-doc-ok` passes.
- [ ] A `.py` file with `#`-style fields passes; a `.mjs` under `tests/fixtures/**` is ignored (both asserted in tests).
- [ ] The JSDoc-tag alias (`@what`/`@does`/`@why`/`@usedby`) is recognized (focused test).
- [ ] Every enumerated in-scope source file carries a recognized four-field docblock (verified by the gate passing; spot-check `scripts/check.mjs`, `scripts/lib/tier.mjs`, and the two edited site link guards).
- [ ] The two `site/scripts/` link guards still pass the clause-14.11 checks after their comment-only docblock edits (the site build + the two guards run clean; no behavior change).
- [ ] `site` build is unaffected (P5 touches no site source behavior, only comments); run the site build if the link guards were edited, to confirm.
- [ ] `git diff --name-only` shows only intended files; no stale "25-check" / "G1-G7" count introduced (count sweep is P6).
- [ ] No em-dash (U+2014) or en-dash (U+2013) in any new or edited file (U10 clean; the P0 hook guards author-time).
- [ ] An adversarial gate (multi-agent read-only review) was run on the check + the docblock diff before merge (R-SEQ-2).

## Out of scope

- Prose-quality judgment of any docblock (routes to `askit-evaluate`, Design Principle 3).
- Any `*.json` / `*.md` / `*.yaml` file, including `manifest.generated.json` and lockfiles.
- Sibling `.md` files per source (rejected by ADR 0024 D1).
- The `G10` check, the Standard v0.10 edit, the version bump, and the `25 -> 30` count sweep (all P6).
- A new `askit-build-docs` mode (the `folder-readme` mode is P4; `source-doc` adds no mode).
- Re-flowing or re-formatting the existing per-function JSDoc in any file.

## Resolved during execution (2026-06-03)

Decisions and review-driven hardening reflected in the shipped `source-doc.mjs`:

1. **SCOPE_ROOTS is exactly `scripts`, `site/scripts`, `hooks`** - the only roots that hold in-scope source today. `agents`/`templates`/`evals`/`.github/workflows` carry `.md`/`.json`/`.yaml`, not source, so they are omitted (a root with no in-scope source would just contribute nothing, but keeping the list to the real source roots bounds the walk).
2. **Recognizer hardened after the P5 adversarial review.** The bare short aliases (`what`, `does`, `uses`) were DROPPED: only the full label forms (`what-it-is`/`whatitis`, `what-it-does`/`whatitdoes`, `why`/`whyitmatters`, `used-by`/`usedby`/`whatusesit`) and the `@what`/`@does`/`@why`/`@usedby` tags satisfy a field, so a stray one-word comment like `// uses: the foo helper` can no longer satisfy an omitted `used-by`. A field line MUST be a comment (`//`/`#`/`*`), so a code line such as `{ why: 1 }` cannot satisfy a field. A value of a single non-space character counts as non-empty (matching "non-empty after trimming").
3. **`site/astro.config.mjs` is the one hand-authored source file left ungraded** - it is `site/**` build tooling outside `site/scripts/`, explicitly excluded by the spec scope. Consciously left out of `G9` (a downstream consumer's Astro config is its own concern, and the family Astro preset will own it later).
