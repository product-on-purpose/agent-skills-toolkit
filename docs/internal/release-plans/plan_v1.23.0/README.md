---
title: "v1.23.0 - the health number beside the tier"
---

# v1.23.0 - the packet

**Written 2026-11-01 from `6dd7f43`.** 6 commits since `v1.22.0`, all squash merges; 751 files
changed, 13020 insertions, 242 deletions, before this release's own commits. Most of the file count is
the 26 audit-corpus trees W6 tracked as fixtures.

This is a **minor**. It adds a health number beside the tier, a fourth advisory screen, and a versioned,
additive report object with a JSON Schema. It adds no numbered check and moves neither the spine size
nor the Standard pin.

## Numbers, measured at the release commit and not inherited

| | |
| --- | --- |
| Suite | **1984 tests, 1980 pass, 0 failures, 4 skipped** with `CODEX_REQUIRED=1` (1935 at `v1.22.0`) |
| Gate | Advanced, 0 errors, 0 warnings |
| `release-ready` | seven gates green, with a GitHub token |
| Codex round-trip | `CODEX_REQUIRED=1 npm test` passed with `codex-cli 0.155.0` |
| Version agreement | `check-version-agreement` reports 6 files agreeing on 1.23.0 |
| Standard | **0.17**, unchanged |
| Spine | **35 checks**, unchanged |
| Skills | **27**, unchanged |
| Docs site build | NOT RUN locally - see "What was not measured locally" below |

## Why this release exists

Its name is **"the health number beside the tier"**. The 2026-09-04 external audit's headline finding
was that the tier certifies file shape: a plugin of 33 placeholder files earns Gold with no errors and
no warnings. [ADR 0063 (an advisory layer beside the tier, and a health number that never enters it)](../../decisions/0063-an-advisory-layer-beside-the-tier-and-a-health-number-that-never-enters-it.md)
ruled the answer: report a reading beside the tier that such a plugin cannot score well on, and never
let it change the tier or the badge. v1.22.0 shipped the advisory layer and its first three screens.
This release ships the rest of that ruling, ADR 0063 sections 3 to 5, under the workstream name W6.

## Scope

See [`RELEASE-PLAN.md`](RELEASE-PLAN.md) for the per-PR table and the acceptance criteria written
before the bump commit.

## What shipped

- **The health number, ADV4 and the versioned report object,
  [#394](https://github.com/product-on-purpose/agent-skills-toolkit/pull/394)** (W6,
  [E61 (the tier certifies file shape)](../../backlog/enhancements.md)). `evaluate.mjs`'s report gains
  `health{}` with five categories (substance, budget, portability, security, Standard currency), each
  with its own state, raw measurement and component count, and no cross-category average. ADV4 flags a
  skill body at or under 20 words, sibling descriptions at or above 0.7 Jaccard similarity, and a body
  that is a catalogued placeholder phrase. The report object gains `schemaVersion: 1`, `run`,
  `checks[]`, `components[]` and `blockedFindings[]`, described by `schemas/report.v1.json`; nothing is
  removed or renamed, and `check.mjs --json` is unchanged. The Markdown and HTML reports gain a Health
  section. **Every category reports `uncalibrated`**, because none has 5 labelled positive trees once
  the two falsifiable-test fixtures are held out; the cut points were pre-registered on 2026-10-30, before
  any measurement, in commit `16a5323` on the PR's branch (kept in the PR's history, since the PR was
  squash-merged), and have not moved. `tests/fixtures/audit-corpus/potemkin-gold` scores 0 on
  substance while its tier stays Advanced, which is ADR 0063's falsifiable test.
- **Builder fixes, [#390](https://github.com/product-on-purpose/agent-skills-toolkit/pull/390)**
  ([E78 (step 2 copies the generic template where the consuming repository has its own)](../../backlog/enhancements.md),
  [E79 (phase 2 delegates to a subagent a fallback-mode session does not have)](../../backlog/enhancements.md)).
  A repository's own skill template governs over this toolkit's, and the phase-2 craft review says
  what to do when no `askit-reviewer` agent type exists.
- **Decision records and plans, no behaviour change,
  [#391](https://github.com/product-on-purpose/agent-skills-toolkit/pull/391),
  [#392](https://github.com/product-on-purpose/agent-skills-toolkit/pull/392) and
  [#393](https://github.com/product-on-purpose/agent-skills-toolkit/pull/393).**
  [ADR 0066 (the goal is the builder whose libraries are proven to work, and "best" is measured, not claimed)](../../decisions/0066-the-goal-is-the-builder-whose-libraries-are-proven-and-best-is-measured.md)
  and [ADR 0062 (a marketplace's Standard floor lives in its own sidecar)](../../decisions/0062-a-marketplaces-standard-floor-lives-in-its-own-sidecar-and-reds-below-it.md)
  are both **Proposed**, and so are two named plans. None is ruled, so neither CHANGELOG nor
  RELEASE-NOTES describes them as decisions.
- **Records, [#389](https://github.com/product-on-purpose/agent-skills-toolkit/pull/389).** No
  CHANGELOG entry, because it changes no shipped behaviour.

## Blast radius

**The whole release, against `v1.22.0`.** Every target was graded with `scripts/check.mjs --json`
twice: once with a worktree at the `v1.22.0` merge commit `49a03e0`, and once with this release's
code. The comparison covers tier, error count, warning count, operator-error count, exit code and the
full `findings[]`, with the advisory keys removed. **92 targets, 0 moved.** The targets are:

- the six family plugins at the commits the `agent-plugins` marketplace pins,
- the six family plugins at their latest `main`, plus the `agent-plugins` registry itself,
- this toolkit, both at `main` and at `v1.22.0`, and
- every fixture plugin tree in this repository, enumerated from `main`, which includes the corpus trees
  W6 added.

The "after" side ran from `main` at `6dd7f43`. This release's own commits change no file under
`scripts/`, `schemas/` or `bin/`, so the code that grades is the same as the release's.

**Advisory notices a family plugin will see.** Compared with v1.22.0, one family plugin gains one
advisory notice: pm-skills, an ADV4 note that `tool-design-sprint-readiness` and
`tool-foundation-sprint-readiness` have descriptions 75 percent similar. It appears at both the pinned
release and `main`. The ADV1 notes v1.22.0 reported (7 in critique-skills, 3 in writing-style-catalog)
are unchanged. No threshold or family plugin was changed to reduce any notice.

**This repository's own `gen-manifest --write --target=all` run for this cut** changed only the
`version` field in `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json` and
`manifest.generated.json`, with no field-loss refusal.

## Review history

W6 got an adversarial review (13 findings, each fixed in its own commit and shown failing first), then
a re-review of only the fix code (2 findings, both verified and fixed before merge). Linux CI then found
a cross-platform defect that both Windows-run reviews could not see: `components[].sizeBytes` counted
CRLF bytes, so ten golden report snapshots differed by platform. Sizes now count CRLF as LF, and a test
writes the same fixture with both line endings and requires identical sizes. Three post-registration
observations are recorded in [`docs/reference/health-score.md`](../../../reference/health-score.md)
without changing any label or cut point: the substance false positive on the audit's controls is
systematic, the budget category catches one of three budget-gaming shapes, and ADV4 is slower on very
large plugins.

## What was not measured locally

**The docs site build.** `site/package.json` requires Node `>=22.22.0` for its Astro dependency chain,
and this machine still has only Node 22.11.0 and 22.12.0, both below that floor; the same constraint
stopped the v1.21.0 and v1.22.0 builds. `ci.yml`'s `build-site` job runs the build on every pull
request with the Node version `.nvmrc` pins, so this PR's CI is the measurement.
`node scripts/check-generated-untracked.mjs`, the site-tree assertion that needs no Astro build, was
run directly from `site/` (where CI runs it).

## Not in this release

- The two open Dependabot PRs, [#372](https://github.com/product-on-purpose/agent-skills-toolkit/pull/372)
  (four GitHub Actions bumps) and [#395](https://github.com/product-on-purpose/agent-skills-toolkit/pull/395)
  (three docs-site dependency bumps), stay open.
- Tracking the six labelled audit-corpus trees that were measured but not stored, filed at this cut as
  [E91 (six labelled audit-corpus trees are measured but not tracked)](../../backlog/enhancements.md).

## On tag day

1. Merge this PR alone; do not chain a dispatch after the merge.
2. Tag `v1.23.0` at the merge commit and push the tag, before 2026-11-25.
3. `release.yml` publishes the GitHub release; `publish-npm.yml` runs every gate and waits at the
   `npm-publish` environment's required reviewer.
4. Approve the npm publish at that gate.
5. Verify from the consumer position: `npx agent-skills-toolkit@1.23.0` in a clean directory outside
   this repository.
6. Review and merge the `agent-plugins` re-pin once `repin-watch` opens its issue.
