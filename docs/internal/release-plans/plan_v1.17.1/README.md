---
title: "v1.17.1 - the records patch: three P0 defects, two standing policies, and a guard proven against the bug it prevents"
---

# v1.17.1 - the packet

**Written 2026-09-01 at `e06373f`.** Ten commits since `v1.17.0`; **32 files changed, 779 insertions,
66 deletions** in the committed work, with the release trail landing in the release commit on top.

This is a **patch**, and the classification is the v1.10.1 "trust patch" precedent: every item is a
defect fix, a records fix, or an internal guard. No check is added or removed, no Standard revision,
no verdict moves except one that can only move a catalogue from failing to passing.

## Numbers, measured at the release commit and not inherited

| | |
| --- | --- |
| Version manifests | **`1.17.1`** across all four, plus `action.yml`'s advertised pin (the fifth surface) |
| Standard | **0.15**, unchanged. No Standard revision in this release |
| Spine | **34**, unchanged. **No check added, none removed.** The new `check-claim-citations.mjs` is repo hygiene wired into `npm test` beside `check-doc-enumerations`, NOT a spine check - it polices this repository's records, not a graded plugin's shape |
| Skills | **26**, unchanged |
| Suite | **1446 tests, 0 failures**, 1 skipped (POSIX-only). It read **1439** at the `v1.17.0` tag; the seven added are 4 for the `command` source kind (three unit, one catalogue-level) and 3 for the claim-citation guard |
| Gate on this repository | **Advanced, 0 errors, 0 warnings** |
| Codex round-trip | **Run and passing** against `codex-cli 0.144.5` on 2026-09-01: skills INGESTED, not merely listed. Run because this cut edits `foundation/sources/codex.md` and the synthesis files |

## Why this release exists

This is cut 1 of the resolution plan ratified on 2026-08-31, and the first execution of anything from
the 2026-08-28 audit. Its job is the cheapest trust repair available: fix what is provably wrong before
building anything new on top of it.

**Three P0 defects were live.** A valid marketplace was being falsely REDDED because the gate did not
know a source kind the vendor shipped in v2.1.229. Four tracked surfaces asserted a vendor claim was
pinned when `git log -S` shows the id never existed in the ledger at any commit. The published family
registry described a toolkit six releases old and graded trees the catalogue does not pin.

## What is in it

- **The `command` marketplace source kind.** Pin semantics settled by the file's own precedent, not by
  choice: an archive requires a digest because it CAN be verified; a command source has no artifact to
  digest, so it takes the npm branch. Blast radius measured, not argued - byte-identical reports across
  all six family members, and zero catalogue entries use the kind.
- **The phantom-citation repair, and the guard that prevents recurrence, in one change.** The guard was
  written FIRST and run against the unfixed tree, where it named all four phantom citations; that corpus
  is committed so it stays proven. Its scoop was measured twice - an earlier design caught one of four
  and did not ship.
- **The family registry regenerated at the pins**, so all six rows read `in sync` and are reproducible.
- **Nine execution files** stopped calling two shipped flagships "stretch riders".
- **Two standing policies**: no forward version numbers (ADR 0057), and the audit-intake index.

## What this release corrects about the audit that commissioned it

Three of the audit's own statements did not survive contact with the tree, and the corrections are on
the record rather than absorbed silently:

1. **The registry's "false RED" was not false.** The audit said the page carried a false failure for a
   member fixed on 2026-08-15. `git merge-base --is-ancestor` says the catalogue pins `9aab9f3` -
   v0.13.0, dated 2026-06-25 - which is not a descendant of that fix. The member genuinely fails at the
   sha it is pinned to. **The stale thing is the registry pin, not the verdict.**
2. **"Six" stretch-label files are nine.** Two under `04-releases/` were in nobody's list.
3. **RS-B4's specified scoop would have caught one phantom in four.** Measured against the real lines
   before shipping, which is the only reason it did not ship.

## What this release did NOT close

**RS-A3's live-page criterion.** The acceptance criterion is that the *deployed* page shows the new
measurement date; that is checkable only after the docs deploy runs on `main`, and it is tracked as
open rather than reported done.

## The adversarial review, and what it caught

Seven agents re-checked every numbered acceptance criterion in RS-A, RS-B and RS-F independently. Zero
confirmed blockers against the engineering; three defects in what the cut had WRITTEN DOWN, all fixed
before merge. The sharpest: **the documentation for the anti-phantom-reference guard contained a phantom
reference** - a citation to a backlog entry "E57" that does not exist - in the one place the guard
structurally cannot look. The review also planted a mixed-case phantom citation and watched the guard
pass it in silence; the token match is now case-insensitive, measured at zero additional findings.
