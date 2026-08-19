# Release plan - v1.16.0 "the evidence gets an address"

- **Type:** MINOR. No Standard version change, no new spine check, **no verdict movement for any plugin.** A structural promotion of the evidence this Standard rests on, plus the artifact that makes the tier ladder's dependencies visible.
- **Baseline:** `main` at the v1.15.0 tag. Gate Advanced 0/0, spine 34, Standard 0.15, 26 skills, 3 evaluation scopes, suite 1292 / 0.
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

## Acceptance criteria

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
