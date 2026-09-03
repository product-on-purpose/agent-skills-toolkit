---
title: "v1.18.0 release plan - reach, second act"
---

# v1.18.0 - release plan

**Class: minor.** New capability, no check added or removed, no Standard revision, no verdict moved.

Cut 2 of the resolution plan ratified 2026-08-31. Merged as
[PR #297](https://github.com/product-on-purpose/agent-skills-toolkit/pull/297) at `167fdbc` before this
release trail was written.

## Scope, as ratified

| Item | Handle | State |
| --- | --- | --- |
| RS-D1 | self-consume the Action | shipped; spec amended by measurement |
| RS-D3 | published verdicts + deploy-generated registry | shipped; live-site criterion verified from outside |
| RS-F3 | standards-watch cron | shipped; cron criterion opens 2026-09-15 |
| RS-E3 | tier-scope routing line | shipped; five of six placements, the sixth ships at cut 5 |
| RS-D2 | GitHub Marketplace listing | **not in this release** - tracked as issue #302 |
| E57 | release-notes gate ran after the tag | shipped, out of band; the defect was found by the v1.17.1 cut |

## Gates

| Gate | Result |
| --- | --- |
| `npm test` | 1485 tests, 0 failures, 1 skipped |
| `node scripts/check.mjs` | Advanced, 0 errors, 0 warnings |
| `npm run release-ready` | six gates green |
| Site build | 89 pages, route parity 89/89, 0 broken links or anchors |
| CI on the merged PR | all ten checks green, including both new Action jobs |
| Live site | `/reports/*` served, `tier-report.json` naming `167fdbc`, registry measuring 6/6 members |

**The sixth `release-ready` gate is new in this release and this is its first real use.** It requires
`RELEASE-NOTES.md` to carry a section for the version being cut, before the tag. v1.17.1 shipped a
literal format placeholder as its heading because the equivalent check ran after the tag.

## The tag route

1. This branch merges to `main`.
2. `v1.18.0` is tagged at the merge commit and pushed.
3. `release.yml` fires on the tag: re-runs the gate and `release-ready`, extracts this version's
   RELEASE-NOTES section **through the portable script rather than inline awk**, creates the release.
4. `publish-npm.yml` fires on the same tag, runs every gate, and **stops at the `npm-publish`
   required-reviewer approval**. It publishes only after a human approves.
5. `repin-watch` in `agent-plugins` prepares the registry re-pin PR.
6. Pushing to `main` also fires `deploy-pages.yml`, which regenerates the published reports and the
   family registry at this sha.

## What a reviewer of this release should check

- The Action's advertised pin in `action.yml` reads `v1.18.0`, since consumers copy that line.
- `RELEASE-NOTES.md`'s 1.18.0 section names the rename, because the display name changes and a
  consumer scanning for a breaking change should find the answer without reading the diff.
- The new how-to page's example pins `v1.18.0` and not a branch.

## Known-open after this release

- **RS-D2 (Marketplace listing)** - issue #302. Do the rename's documentation first; it is done.
- **RS-F3 AC1** - the scheduled run, 2026-09-15.
- **E58** - whether `standards-watch` should gate releases; revisit after three clean scheduled runs.
- **Two vendor probes expire 2026-09-24** and block every release from that morning.
