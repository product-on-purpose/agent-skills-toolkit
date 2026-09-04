---
title: "v1.18.0 - reach, second act: the toolkit starts checking its own work where it previously could not"
---

# v1.18.0 - the packet

**Written 2026-09-03 at `167fdbc`.** Ten commits since `v1.17.1`; **33 files changed, 1,767 insertions,
36 deletions**, with the release trail landing on top.

This is a **minor**. It adds capability - two CI jobs, a release gate, a scheduled watch, two deploy
generators and a documentation page - and changes no check, no Standard version and no verdict.

## Numbers, measured at the release commit and not inherited

| | |
| --- | --- |
| Suite | **1485 tests, 0 failures, 1 skipped** (1446 at `v1.17.1`) |
| Gate | Advanced, 0 errors, 0 warnings |
| `release-ready` | six gates green - the sixth is new this release |
| Standard | 0.15, unchanged |
| Spine | 34 checks, unchanged |
| Skills | 26, unchanged |
| Site | 89 pages, up from 88 |

## Why this release exists

It is cut 2 of the resolution plan ratified 2026-08-31, and every item shares one shape: **a rule that
existed and was correct, running somewhere it could not do its job.**

- The Action's own path was never exercised by this repository's CI, so it shipped broken to every
  consumer twice while every check stayed green.
- The RELEASE-NOTES section check ran on the pushed tag, after npm had already published.
- `standards-watch` worked and nothing ran it.
- The family registry was correct on the day it was hand-run and stale twenty days later.
- The pages that say what a tier does not certify were linked by nothing that presented a tier.

## What is in it

| Item | What changed |
| --- | --- |
| **RS-D1** (self-consume the Action) | `ci.yml` grades this repo through its own Action, in two jobs. `gate-via-action` is now a required check |
| **E57** (release-notes gate) | `release-ready` gains a sixth gate; the extraction moved out of `release.yml`'s inline awk into a portable script both callers share |
| **RS-F3** (standards-watch cron) | Monthly on the 15th, offset from `vendor-watch`'s 1st. No release gate; that deferral is E58 |
| **RS-D3** (published verdicts) | `tier-report.json`, the HTML report and an index, published beside the badge from the same sha |
| **RS-D3** (registry) | The family registry is measured at deploy time, at the shas the catalogue pins |
| **RS-E3** (tier scope) | One constant, five placements, including all 34 SARIF `helpUri`s |
| **Docs** | The Action is renamed *Agent Skills Toolkit Grader* and documented for the first time |

## What this release corrects about its own reasoning

**The justification for RS-D1's second CI job was committed as fact and then falsified by the run that
was supposed to confirm it.** The argument was that `uses: ./` structurally could not reproduce the
v1.16.2 defect. The mutation reddened both jobs, so the claim was simply false; what it actually
measured is that the two fail by *different mechanisms*, and only the published-ref job reproduces the
error consumers saw. `7efa47c` corrected four surfaces and the ratified spec was amended.

The lesson is ordering rather than accuracy: the mutation was cheap and available *before* a word of
justification was written.

## What this release did NOT close

- **RS-D2**, the Marketplace listing. Unblocked by RS-D1 and now tracked as issue #302, with two
  findings attached: the Action had no user-facing documentation until this release, and the first
  opt-in cannot be automated - the GitHub release API exposes no marketplace field.
- **RS-F3's first criterion.** It requires the **scheduled** run, not a dispatch. First cron:
  2026-09-15.
- **E58**, whether `standards-watch` should gate releases. Revisit after three clean scheduled runs.

## Three guards caught consequences the author had not reasoned about

Worth recording, because each one is an argument for asserting invariants as arithmetic rather than by
hand:

1. **R4's timeout arithmetic.** A sixth release gate widened the worst case where every gate hangs at
   once to exactly the job's 50-minute cap. Both jobs moved to 55.
2. **The npm tarball-reachability test, twice.** Both new `scripts/lib/` modules would have shipped to
   consumers with nothing in the package importing them.
3. **G8, the folder-README check.** Three times, on three new scripts.

A fourth caught its own author: RS-E3's wording test rejected a paraphrase in the release notes within
minutes of the rule being written.
