---
title: "v1.22.0 - the advisory layer and the on-ramp"
---

# v1.22.0 - the packet

**Written 2026-10-29 from `e99befe`.** 17 commits since `v1.21.0`, 16 of them non-merge; 130 files
changed, 8297 insertions, 220 deletions, before this release's own commits.

This is a **minor**. It adds a skill, an advisory layer with three screens, a release gate, a GitHub
Actions job summary, and additive JSON and SARIF fields. It adds no numbered check and moves neither
the spine size nor the Standard pin.

## Numbers, measured at the release commit and not inherited

| | |
| --- | --- |
| Suite | **1935 tests, 1931 pass, 0 failures, 4 skipped** with `CODEX_REQUIRED=1` (1721 at `v1.21.0`) |
| Gate | Advanced, 0 errors, 0 warnings |
| `release-ready` | seven gates green, with a GitHub token |
| Codex round-trip | `CODEX_REQUIRED=1 npm test` passed with `codex-cli 0.155.0` |
| Version agreement | `check-version-agreement` reports 6 files agreeing on 1.22.0 |
| Standard | **0.17**, unchanged |
| Spine | **35 checks**, unchanged |
| Skills | **27**, up from 26 (`askit-onboard`) |
| Docs site build | NOT RUN locally - see "What was not measured locally" below |

## Why this release exists

Its name is **"the advisory layer and the on-ramp"**. A 2026-10-24 evaluation of what would most raise
this repository's value found two gaps: almost nobody outside this project uses the toolkit, and the
Gold badge certifies file shape rather than substance. The approved plan answers the first with a guided
start, [`askit-onboard`](../../../reference/askit-onboard.md), and begins the second with
[ADR 0063 (an advisory layer beside the tier, and a health number that never enters it)](../../decisions/0063-an-advisory-layer-beside-the-tier-and-a-health-number-that-never-enters-it.md):
signals that matter to a plugin's users, reported beside the tier and never inside it. This release
also carries [E90 (spine-size prose compared outside this toolkit)](../../backlog/enhancements.md),
which product-lifecycle-templates' move to Standard 0.17 waits for.

## Scope

See [`RELEASE-PLAN.md`](RELEASE-PLAN.md) for the per-PR table and the acceptance criteria written
before the bump commit.

## What shipped

- **The advisory layer, [#382](https://github.com/product-on-purpose/agent-skills-toolkit/pull/382).**
  `check.mjs` and `evaluate.mjs` report `advisoryFindings` beside `findings[]`, with an
  `advisoryLayer` marker, renderers in every output, `--no-advisory`, and an Action `advisory` input
  and `advisory-count` output. A partition test runs every verdict path with an error-severity stub
  module, and no tier, count or exit code moves.
- **Three screens, [#385](https://github.com/product-on-purpose/agent-skills-toolkit/pull/385) and
  [#386](https://github.com/product-on-purpose/agent-skills-toolkit/pull/386).** ADV1 notes `SKILL.md`
  keys outside the Skills API's six fields ([E86](../../backlog/enhancements.md)). ADV2 notes a
  subagent preloading more than 32 skills ([E87](../../backlog/enhancements.md)). ADV3 screens for
  pipe-to-shell installers, dangerous commands and prompt-injection phrases (RS-E4,
  [E6](../../backlog/enhancements.md)). ADV1's reserved-words half is not included; it waits on a
  ruling about a third vendor probe.
- **`askit-onboard`, [#374](https://github.com/product-on-purpose/agent-skills-toolkit/pull/374)**
  ([E47](../../backlog/enhancements.md)), with `assess`, `plan` and `next` modes.
- **Release and CI surfaces.** The seventh `release-ready` gate, version agreement
  ([#377](https://github.com/product-on-purpose/agent-skills-toolkit/pull/377),
  [E85](../../backlog/enhancements.md)); the Action job summary
  ([#376](https://github.com/product-on-purpose/agent-skills-toolkit/pull/376), F-033); and SARIF
  `partialFingerprints` ([#375](https://github.com/product-on-purpose/agent-skills-toolkit/pull/375),
  F-014).
- **Correctness.** E90's scoping fix
  ([#379](https://github.com/product-on-purpose/agent-skills-toolkit/pull/379)); the spine firing
  test (RS-B2, [#381](https://github.com/product-on-purpose/agent-skills-toolkit/pull/381)); the
  root-level `SKILL.md` fixture and the plugin-directory stated gap
  ([#373](https://github.com/product-on-purpose/agent-skills-toolkit/pull/373), E88 and E89).
- **Evidence, with no figure published,
  [#383](https://github.com/product-on-purpose/agent-skills-toolkit/pull/383).** The scorer applies
  rule (a') from [ADR 0065](../../decisions/0065-a-multi-entry-finding-earns-credit-only-where-its-own-correct-clause-verifies.md),
  the scoring key moved outside the fixture tree (E20), and three runner defects are fixed (E15). The
  E13 cells stay PROVISIONAL until the maintainer signs the adjudication draft, so neither the
  CHANGELOG nor RELEASE-NOTES states an eval figure (RS-B1 criterion 5).
- **Decisions and vendor pins, [#378](https://github.com/product-on-purpose/agent-skills-toolkit/pull/378)
  and [#370](https://github.com/product-on-purpose/agent-skills-toolkit/pull/370).** ADRs 0063, 0064
  and 0065, a new quote claim for the vendor's `plugin eval` scope, and both probes re-run.
- **Records, [#380](https://github.com/product-on-purpose/agent-skills-toolkit/pull/380),
  [#384](https://github.com/product-on-purpose/agent-skills-toolkit/pull/384) and
  [#387](https://github.com/product-on-purpose/agent-skills-toolkit/pull/387).** No CHANGELOG entry,
  because none changes shipped behaviour.

`STANDARD.md` gained one non-normative sentence in #382: advisory findings do not affect conformance.
The Standard edition stays 0.17.

## Blast radius

Three measurements, each graded with `scripts/check.mjs --json` and compared on tier, error count,
warning count, operator-error count, exit code and `findings[]`, with the advisory keys removed:

1. **The advisory layer, against the pre-layer baseline.** The six family plugins (this toolkit and its
   five marketplace siblings, at the commits used for the "own plugins first" work) and every fixture
   tree in this repository: 58 trees compared, **0 moved**. Four ADV3 fixture trees did not exist when
   the baseline was taken, so they have no before.
2. **The whole release, against `v1.21.0`.** The same 62 trees graded with the `v1.21.0` tag and with
   this release: every tier, error count, warning count, operator-error count and exit code is
   identical. `findings[]` differs on 58 trees in exactly one way: each finding now carries a `key`
   field, `null` unless a check supplies one, which #375's SARIF fingerprint uses. No finding was added
   or removed, and no other field changed.
3. **The 2026-09-04 audit corpus, never measured before.** 25 deliberately defective plugins graded
   with `v1.21.0` and with this release: every tier, count and exit code is identical, and the only
   difference is the same additive `key` field, on 10 of them.

**This repository's own `gen-manifest --write --target=all` run for this cut** changed only the
`version` field in `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json` and
`manifest.generated.json`, with no field-loss refusal.

**Advisory notices a family plugin will see.** Two family plugins will show ADV1 notes when they next
run this release: 7 in critique-skills and 3 in writing-style-catalog, as recorded in #385. They are
notes, not failures, and no threshold or family plugin was changed to reduce them.

## Review history

Every code PR in scope got an adversarial review and a re-review of its fix commits before merging.
The ADV3 timing tests were widened after review from 100,000- to 300,000-character adversarial lines,
because four bounded patterns cleared the 2000 ms bound by only 40 to 48 percent at the smaller size;
with one original unbounded matcher restored, the widened test reports 26,388 ms. G8's fixed roots
were widened for `scripts/advisory` during #382 and reverted before merging, because the widening would
have changed how third-party plugins earn Gold.

## What was not measured locally

**The docs site build.** `site/package.json` requires Node `>=22.22.0` for its Astro dependency chain,
and this machine still has only Node 22.11.0 and 22.12.0, both below that floor; the same constraint
stopped the v1.21.0 build. `ci.yml`'s `build-site` job runs the build on every pull request with the
Node version `.nvmrc` pins, so this PR's CI is the measurement. `node scripts/check-generated-untracked.mjs`,
the site-tree assertion that needs no Astro build, was run directly from `site/` (where CI runs it) and
passed.

## Not in this release

- The two Dependabot PRs, [#371](https://github.com/product-on-purpose/agent-skills-toolkit/pull/371)
  and [#372](https://github.com/product-on-purpose/agent-skills-toolkit/pull/372), stay open.
- ADV4 (substance signals) and the health number arrive with the versioned report object, the next
  workflow in the plan.

## On tag day

1. Merge this PR alone; do not chain a dispatch after the merge.
2. Tag `v1.22.0` at the merge commit and push the tag, before 2026-11-25.
3. `release.yml` publishes the GitHub release; `publish-npm.yml` runs every gate and waits at the
   `npm-publish` environment's required reviewer.
4. The maintainer approves the npm publish.
5. Verify from the consumer position: `npx agent-skills-toolkit@1.22.0` in a clean directory outside
   this repository.
6. Review and merge the `agent-plugins` re-pin once `repin-watch` opens its issue.
7. Bump product-lifecycle-templates' `TOOLKIT_REF` to `v1.22.0`, so its PR #324 can leave draft.
