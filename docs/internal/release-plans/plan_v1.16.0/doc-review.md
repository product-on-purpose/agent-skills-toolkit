# Pre-tag documentation review, v1.16.0

**Question asked:** are the repo and release documents actually useful, and are the ones written for
humans legible and understandable?

**Method:** measured rather than read. Sentence length and paragraph length were computed across
every tracked public markdown file with code fences stripped; every reqId range in prose was
expanded and compared against `scripts/lib/registry.mjs`. Two of the sweeps below were re-run after
the first pass, because the first pass was truncated and its conclusion ("three stale files, one
correct") was wrong by more than half.

## Finding 1 - eight public files stated a check spine the toolkit does not ship

**Severity: release-blocking.** This is a false public record, the class this repo already treats as
a blocker.

The gate ships **34 checks**: `U1-U9` and `U11-U17` Universal (16), `S1-S8` Convergent (8),
`G1-G10` Advanced (10). Ten claims across eight public files named an older set.

| File | Said | True |
| --- | --- | --- |
| `README.md:225` | `U1-U9`, `U11-U13`, **12 checks** | `U11-U17`, 16 checks |
| `README.md:236` | Requires (`U1-U9`, `U11-U13`) | `U11-U17` |
| `AGENTS.md:22` | Bronze `U1-U9`, `U11-U13` | `U11-U17` |
| `docs/explanation/glossary.md:32` | backed by checks `U1` through `U12` | spans retired `U10` |
| `docs/explanation/glossary.md:46` | 34-check backbone, list expanding to 31 | 34 |
| `docs/explanation/conformance-and-tiers.md:49` | "The full Universal set (`U1-U9`, `U11-U13`)" | `U11-U17` |
| `docs/explanation/architecture-internals.md:33` | `U1`-`U9`, `U11`-`U13` | `U11`-`U17` |
| `docs/reference/frontmatter-taxonomy.md:114` | `U1-U9`, `U11-U14` | `U11-U17` |
| `docs/tutorials/start-a-plugin-and-reach-bronze.md:12` | `U1` through `U12` | spans retired `U10` |
| `site/src/content/docs/catalog.md:26` | `U11`-`U14`, "a 34-check spine" | `U11`-`U17` |

Three things about this are worth keeping.

**The README contradicted itself six lines apart.** Line 219 said "The spine is 34 checks total
(`U1-U9`, `U11-U17`, `S1-S8`, `G1-G10`)". Line 225, inside the same `## The tier model` section,
said "Bronze - Universal (`U1-U9`, `U11-U13`, 12 checks)". A reader looking up the tier model got
the wrong answer; a reader looking at `## Status` got the right one.

**Internal consistency is what hid it.** `U1-U9` plus `U11-U13` really is 12 checks. The count and
its list agreed with each other perfectly. Nothing compared either one to the registry.

**`U14` through `U17` had no description anywhere in the README.** The Bronze bullet list stopped at
`U13`, so the four newest Universal requirements - including the `agents/` phantom-subagent rule and
the catalogue-manifest rule, the headline items of v1.14.0 and v1.15.0 - were undocumented in the
front door. They now have bullets.

### Why the existing guard could not have caught it

`check-readme-version.mjs` does machine-check a spine claim, which is why `## Status` was correct.
But it scopes itself to the `## Status` section, and every stale claim sat outside that section,
including the one 170 lines above it in the same file.

This is the v1.15.0 defect recurring. That release fixed `docs/reference/universal-checks.md`, which
"had stopped at `U13`, missing four checks across two releases", and shipped the fix with **no sweep
and no guard**. One release later the same staleness was live in eight more files.

### The guard

`scripts/check-doc-enumerations.mjs` expands every reqId range in the public docs and compares it
against the registry. It is wired into `npm test` and available as `npm run doc-enumerations`.

It was birthed failing on the tree before anything was fixed, and it found **two sites the manual
sweep missed**. Three design notes:

- **Completeness is read from shape, not from English.** An author writes two spans for one tier
  ("`U1-U9`, `U11-U13`") only when spelling out a whole set with a hole in it. A single span is a
  subset by construction. An earlier draft tested the line for "full"/"every"/"all" and fired on two
  README bullets where "every shipped skill" describes the checks' subject.
- **A range naming a check that does not exist is wrong regardless of intent.** `U10` was retired in
  Standard v0.11, so no correct Universal range spans it. This rule needed no intent-guessing, caught
  the two "`U1` through `U12`" lines that every shape rule missed, and will keep working after any
  future retirement without the guard being touched.
- **There is deliberately no per-line exemption marker,** and the reasoning is recorded in the file.
  Prose illustrating the syntax will trip this guard: the first draft of its own inventory entry in
  `scripts/README.md` did exactly that. Rewording costs one edit and fails loudly in CI; an exemption
  marker would be a silent-miss surface.

`tests/unit/doc-enumerations.test.mjs` covers it with 12 cases, five of them negative. Suite
1376 to 1388.

## Finding 2 - the quick start's own step 1 broke its step 2

**Severity: high.** Not a style problem; the instructions did not work.

Step 1 installed the toolkit as a plugin (`/plugin install`). Step 2 then said "From the plugin's
root:" and gave `node scripts/check.mjs`. A reader who followed step 1 has no such file: they
installed a plugin, they did not clone a repository.

`npx agent-skills-toolkit`, the path that needs no install at all and the one `README.md:86` already
documents, appeared **zero times** in `QUICKSTART.md`.

Fixed by leading with the npx form, verified live against the published package before it was
written in:

```
npx --yes agent-skills-toolkit@latest .   ->   Tier: Advanced (no blockers detected), 0 error(s)
```

The clone-based commands are kept and correctly labelled "From a clone", which is what CI and
pre-commit hooks use.

## Finding 3 - the glossary was the least legible document in the repo

**Severity: medium.** The one document whose entire job is explaining words to someone who does not
know them had the longest sentences of anything published: median **32 words**, with **30 percent**
over 35 words.

It also stated a contract about itself and broke it. The intro promised "Each term below is defined
in one sentence"; **9 of 23 entries** were not. The `Spine` entry was a 50-word changelog carrying
the introduction version of four individual checks, history that
`docs/reference/universal-checks.md` already carries properly.

Rewritten: every term is one sentence, version history moved out, and the `U10` gap explained in a
clause so a reader does not stall on it.

| | before | after |
| --- | --- | --- |
| glossary median sentence | 32 words | **19 words** |
| glossary sentences over 35 words | 30% | **17%** |
| glossary entries breaking its one-sentence promise | 9 of 23 | **0 of 23** |
| `QUICKSTART.md` longest paragraph | 885 chars | **357 chars** |
| `QUICKSTART.md` sentences over 35 words | 14% | **0%** |

## Reported, not fixed

Ranked by measured density. These are reference and how-to pages: correct, and denser than they need
to be. None blocks a tag, and rewriting them was out of scope for a pre-tag pass.

| File | longest para | median sentence | over 35 words |
| --- | --- | --- | --- |
| `docs/how-to/install-and-run-via-npm.md` | 458 | 28 | 35% |
| `docs/reference/evaluation-reports.md` | 526 | 26 | 28% |
| `docs/reference/askit-standards-watch.md` | 621 | 16 | 28% |
| `docs/how-to/choose-agent-targets.md` | 413 | 20 | 33% |
| `docs/reference/gold-checks.md` | 515 | 16 | 27% |
| `docs/reference/askit-build-docs.md` | 375 | 20 | 40% |

`docs/explanation/README.md` and `docs/how-to/README.md` measure worst of all on paper. They are
index pages of five long index lines each; the number is a small-sample artifact, not dense prose.

## Deliberately untouched

- **`CHANGELOG.md` and the pre-1.14 `RELEASE-NOTES.md` sections.** Append-only history that correctly
  states the numbers of its own day. The guard exempts them, and exempts blockquoted version notes
  for the same reason: `STANDARD.md`'s "> v0.13: `U14` added" lines are dated records, not claims
  about today.
- **`STANDARD.md` normative text.** Its current spine statement at line 142 was checked and is
  correct, so it needed no edit. Normative changes require maintainer merge authority regardless.
- **`skills/` and `templates/`.** Both the sweep and the guard exclude them on purpose: a golden
  or anti example legitimately quotes the spine of the day it was written, and rewriting one would
  falsify the example. Checked separately all the same, since these are shipped instructions:
  **0 lines across 129 tracked files** name a check that does not exist.
- **The generated half of the docs site.** 86 files are on disk under `site/src/content/docs/`, 6 are
  tracked; the rest are generated from `docs/` by `gen-docs-site.mjs`, so fixing `docs/` fixes them.
  Only the authored `catalog.md` needed its own edit. Route parity re-checked after: 88 of 88.

## State after this pass

- Gate: **Advanced, 0 errors, 0 warnings**
- Suite: **1397 tests, 0 failures** (**1388** when this review was written, which is also what v1.16.0 was tagged at; the later E53/E54/E55 pass added six)
- `check-doc-enumerations`: every spine claim in the public docs matches the registry
- `check-release-counts`: agrees everywhere checked, version 1.16.0
- Site route parity: 88 of 88
