# Release plan - v1.16.0 "the evidence gets an address"

- **Type:** MINOR. No Standard version change, no new spine check, **no verdict movement for any plugin.** A structural promotion of the evidence this Standard rests on, plus the artifact that makes the tier ladder's dependencies visible.
- **Baseline:** `main` at the v1.15.0 tag, `9133014`. Gate Advanced 0/0, spine 34, Standard 0.15, 26 skills, 3 evaluation scopes, **suite 1359 / 0** (1 skipped), measured 2026-08-20 at that commit. **This read `1292 / 0` until 2026-08-20**, a number taken while the plan was drafted - before the tag existed. A baseline that names a commit it was written ahead of is a forward-dated measurement, and the 67 tests the review rounds added landed in between.
- **Branch:** `release/v1.16.0`, cut from `main` after the implementation PRs merge.
- **Thesis:** this repository grades other people against facts about software it does not control, and **the tier ladder is defined in those terms** - `STANDARD.md` sec 2.2 says Convergent means *"concepts both CC and CX support, but in different formats"*, and sec 2.3 says Advanced means *"often agent-specific"*. So the tier boundaries are a **synthesis of vendor capability**. That synthesis currently lives in a markdown file inside one skill's `references/` folder, guarded by nothing, and no artifact records which vendor fact each tier boundary actually rests on.

> **How this document is written.** It states **intent and acceptance criteria**. It is not a status
> report and will not be edited into one. State belongs in `README.md` in this folder, written **last,
> from the code**.

## Why this is not a documentation move

Three facts, each verified rather than asserted:

**1. Every other shared world-fact already lives centrally, and one does not.** `vendor-claims.json`, `upstream-pin.json`, `surveyed-pin.json`, `surveys.md` and the tool profiles all sit under `docs/internal/<topic>/`. `capability-matrix.md` sits inside `skills/askit-capability-advisor/references/`. It is the only outlier, and as of v1.15.0 **three skills depend on it.**

**2. The ownership is inverted, and v1.15.0 introduced that.** `askit-capability-gap-analysis` declares that it *owns* `../askit-capability-advisor/references/capability-matrix.md` - a cross-skill reach into another skill's `references/` that **no pre-existing skill in this repository does.** That was a convention broken, not extended, and it should not be left standing.

**3. The tier ladder rests on it and cannot see it.** Nothing connects "a vendor shipped a new component type" to "a tier boundary may need review." The v1.15.0 survey found three component types Codex documents and this Standard does not model - **Connectors, Browser extensions, Scheduled task templates** - and the ladder's own definition implies where each belongs (supported by both agents, or agent-specific) while nothing routes the question.

**Distribution cost of moving: zero.** The npm tarball ships only the gate (`scripts/`, `bin/`, `STANDARD.md`); skills and docs reach consumers through the plugin install, which carries the whole tree. Both the old and new locations are equally present.

## The layout

```
foundation/
  README.md                    what this is, the one rule, and how to read it

  sources/                     LAYER 1 - verified first-party references
    README.md
    claude-code.md             pages read, version, date, METHOD, and what depends on each
    claude-cowork.md
    codex.md
    agentskills-io.md

  claims/                      the machine-checkable subset
    vendor-claims.json         from docs/internal/vendor-watch/
    upstream-pin.json          from docs/internal/standards-watch/
    surveyed-pin.json          from docs/internal/capability-surveys/

  synthesis/                   LAYER 2 - what we concluded from layer 1
    capability-matrix.md       from skills/askit-capability-advisor/references/
    tier-basis.md              NEW

  surveys.md                   the dated record of what shipped
```

**`method` is a first-class field on every source record**, not a footnote. "Confirmed 2026-08-18" and "confirmed 2026-08-18 by reading the changelog" and "confirmed 2026-08-18 by running the reproduction" are three different strengths of evidence, and a reader deciding whether to trust a six-week-old entry needs to know which one it was.

## The workstreams

### W1 - Ratify the layout before moving anything (ADR)

ADR-first, per the pattern that paid in v1.14.0 where measurement overturned three of seven recommendations before implementation began. The ADR fixes: the folder layout, the per-source record format including `method`, `tier-basis.md`'s contract, and **what is deliberately NOT promoted** (ADRs, backlog, release plans and status stay in `docs/internal/` - they are maintainer working material, not evidence).

It must also settle the naming question this plan does not: `foundation/` versus `core/`. This plan uses `foundation/` because `core` reads as "core code" beside `scripts/` and `bin/` while this folder is entirely `.md` and `.json`; that is a preference, not a finding, and the ADR should record whichever is chosen and why.

> **DECIDED 2026-08-19, by the maintainer: `foundation/`.** Recorded here rather than left to the ADR to
> discover, because the plan asked the question and the answer arrived first.
>
> **No industry-standard term fits**, which was checked rather than assumed. The nearest candidate,
> `corpus/`, is **already taken in this repository** - it means the set of real plugins graded against the
> Standard (the fixture corpus, the v1.5.0 corpus-run workstream), and reusing it would collide with an
> established meaning. The genuinely descriptive alternatives are `evidence/` and `provenance/`; neither is
> a standard, both are preferences, and `foundation/` reads correctly beside `agents/ bin/ commands/ docs/
> scripts/ skills/`.
>
> **The ADR still records the decision and its reasoning, including that `corpus/` was unavailable** - a
> naming choice whose rejected alternatives are not written down invites the same debate at the next
> release. See [`W1-layout-adr/SPEC.md`](W1-layout-adr/SPEC.md).

### W2 - The migration, and it is a code change

`claims/` holds three files that are read **by path** from `scripts/lib/vendor-watch.mjs`, `scripts/lib/standards-watch.mjs`, `scripts/release-ready.mjs`, their unit tests, and `.github/workflows/vendor-watch.yml`. This is not a `git mv`.

Sequence, with the gate green at every step: move one artifact, update every reader, run the suite, commit. Never move two at once - a broken path in a release-blocking gate is the worst possible thing to debug in a batch.

**The monthly workflow is the trap.** `vendor-watch.yml` runs on cron and dispatch only, so **no pull-request check executes it.** A path change there is invisible to PR CI, exactly as the 2026-08-17 Dependabot triage established. It must be proved by the throwaway-branch drill: smallest honest stimulus, two-dot diff showing the step is byte-identical to what merges, dispatch twice, delete the branch.

### W3 - `tier-basis.md`, the artifact that did not exist

For each tier, the component types it requires and, per requirement, the vendor fact it rests on, where that fact is pinned, and when it was confirmed.

**Expect it to expose unevidenced boundaries, and record them as such rather than filling them in.** The Advanced tier requires hooks and the capability matrix says Codex supports "a subset" of Claude Code's events - that subset is not pinned anywhere and its confirmation date is unknown. A row reading `unverified` is a finding this release should surface, not a gap to paper over.

`askit-capability-gap-analysis` gains a fourth gate question: **does this finding touch a component type any tier requires?** If yes, it is a tier question and not merely a matrix update.

### W4 - One guard, because the matrix is now read by four things and checked by nothing

`capability-matrix.md` is consumed by three skills and a public documentation page. Nothing verifies they agree, which is the exact shape of the four drift defects found on 2026-08-18 and 2026-08-19: a hand-maintained rendering beside a machine-readable truth, with no guard between them.

Scope this narrowly and decide it in W1: a test asserting that every component type named in `STANDARD.md`'s tier sections appears in the matrix, and that every agent column in the matrix carries a confirmed-against version. **Not** a check in `scripts/checks/` - this grades this repository's own evidence, not any plugin, and introduces no `reqId`.

## Scope addition, 2026-08-20: onboarding and the documentation site

**Admitted to this release by the maintainer on 2026-08-20.** Recorded here as a note rather than as a
fifth workstream, because **the implementation and execution plan for it does not exist yet** and inventing
workstream numbers and acceptance criteria ahead of that plan would be the thing this document's own header
forbids. **Writing that plan is the next session's first job.**

> **SUPERSEDED IN PART, 2026-08-20 (later the same day). The plan now exists, and the scope moved to
> v1.17.0.** The note below stands as the record of what was admitted and why; only its release
> assignment changed.
>
> The maintainer settled five decisions on 2026-08-20 and asked for the funnel to be **a release
> centrepiece**. This release already carries four fully specified `foundation/` workstreams, whose ADR
> (0055, the `foundation/` layout) was ratified the same day to unblock W2, and a release cannot have
> two centrepieces. So the onboarding half was written as its own packet:
> **[`../plan_v1.17.0/RELEASE-PLAN.md`](../plan_v1.17.0/RELEASE-PLAN.md)**, v1.17.0 "what are you trying
> to do?".
>
> **v1.16.0's scope is therefore back to the four `foundation/` workstreams it was specified with.**
> Everything the note records below (what was admitted, the rejected tier-centred spine, the
> undocumented Action finding, and the measured interaction between the two halves) remains accurate and
> is carried into the v1.17.0 packet. **The measurement in "How the two halves interact" is the reason
> the split is cheap:** they were already structurally independent.

### What is being admitted

**1. The onboarding and documentation resource plan.** Four proposals plus five worked prototypes,
**held locally in `_local/onboarding/`, which is gitignored and is not a followable link from this file.**
The shape decided in its clarifying interview: job-shaped doors on a Start / Grow / Govern / Level-up
capability map, aimed at external adopters of the public gate, with proposals plus prototype artifacts
rather than proposals alone.

**The tier-centred "Ladder Program" spine was explicitly rejected**, and the reason is load-bearing for
anything built on top of it: **the tiers are self-declared, not canonical first-party gates.** Grading is
this project's instrument, never the adopter's journey. A spine that leads with Bronze / Silver / Gold
would misrepresent what the tier actually asserts.

**2. The Astro documentation site.** Already tracked at `site/` (21 files: `astro.config.mjs`, the three
guard scripts, `route-manifest.txt`, `public/`). Its content mirror under `site/src/content/docs/` is
generated by `gen-docs-site.mjs` and gitignored, so the site can never disagree with `docs/`.

### One finding it has already produced, and it is the proposal's own thesis

Drafting the "gate in CI" prototype door found that **the shipped GitHub Action in `action.yml` -
annotations, SARIF output, tier outputs - is publicly undocumented.** A capability this repository ships,
tests and gates on, that an adopter cannot discover. That is the onboarding argument found in the wild
rather than asserted, and it is the first candidate page whatever plan gets written.

### How the two halves interact, measured rather than assumed

**They barely do, and that is the useful part.**

`foundation/` is a **repository-root sibling** of `docs/`. `gen-docs-site.mjs` mirrors every subdirectory
of `docs/` **except** `internal/`, and nothing outside `docs/`. So **W1 through W4 cannot touch the site**,
and the migration needs no route work. Verified by reading the generator, not inferred from the layout.

The coupling runs the other way. Onboarding pages land **inside** the mirrored quadrants, and each one
carries a tracked-file cost beyond the page itself: its folder `README.md` for `G8`,
`site/scripts/route-manifest.txt`, and a `CHANGELOG.md` entry. **Four files for the first page in a
quadrant; a second page in the same quadrant shares three of them** - measured against `0360912`, which
added two `docs/reference/` pages and touched exactly one folder README, one manifest and one changelog
between them. Plus a **site build before route parity is checked**: an unbuilt site reports a new page as a
baseline route removed. The onboarding proposal contemplates a door set, so this is the number the
execution plan starts from.

### Deliberately not decided here

Workstream numbering, acceptance criteria, phasing, effort, which prototypes get promoted, and whether any
of it needs an ADR. **None of that is settled**, and this note asserts none of it. It records that the scope
grew, what it grew by, where the source material is, and the one measurement that constrains it.

1. **No plugin's verdict moves, and no plugin sees a new finding.** This release adds no check and changes no Standard requirement. Measured per family member before and after, not argued.
2. **`npm run release-ready` exits 0 at every commit**, not only at the end. It reads two of the three files being moved; a red gate mid-migration means the repository cannot cut a release until the migration finishes, which is an unacceptable window.
3. **The monthly `vendor-watch` workflow is proved by dispatch after the path change**, twice, from a throwaway branch. A green PR proves nothing about a cron-only workflow.
4. **Every moved artifact keeps its history.** Use `git mv` so `git log --follow` still works; a provenance file that loses its own provenance in the move is a poor joke.
5. **No cross-skill `references/` reach remains.** The inversion v1.15.0 introduced is closed, and skills reference `foundation/` by repo-relative path.
6. **`tier-basis.md` states `unverified` where the evidence is missing**, rather than omitting the row.
7. **Two adversarial review waves, the second pointed away from the first.** Wave 2 of v1.15.0 never ran, because the runtime returned a usage-limit error before the reviewer started; that criterion is still open and this release does not inherit its absence as satisfied.

## Out of scope, deliberately

- **Promoting `docs/internal/` wholesale.** ADRs, the backlog, release plans and `STATUS.md` are maintainer working material and stay put. Only evidence moves.
- **Any new spine check, Standard version bump, or tier reassignment.** Where `tier-basis.md` shows a boundary resting on nothing, that is a finding to file, not to fix here. Reassigning a tier is an ADR with a migration window and it is not this release.
- **Modelling Connectors, Browser extensions or Scheduled task templates.** Filed as `E46`-adjacent backlog work with a measure-first instruction; the population of real plugins shipping any of them is unmeasured.
- **Resolving `E46`** (the Standard defines a list-valued `metadata` key that fails validator parity). Real, filed, and independent of this layout.
