---
title: "v1.20.0 - Standard 0.17: the warning windows close, and the record agrees with itself"
---

# v1.20.0 - the packet

**Written 2026-09-30 at `94f2cc3`.** 119 commits since `v1.19.0`, 85 of them non-merge; **202 files changed, 6,546
insertions, 577 deletions**, with the release trail landing on top. The tag is pushed no earlier than 2026-10-01,
which is when the roadmap's migration window after cut 4 opens.

This is a **minor**. It ships one Standard revision and changes one exit code. It adds no numbered check.

## Numbers, measured at the release commit and not inherited

| | |
| --- | --- |
| Suite | **1672 tests, 1668 pass, 0 failures, 4 skipped** (1575 at `v1.19.0`) |
| Gate | Advanced, 0 errors, 0 warnings |
| `release-ready` | six gates green |
| Codex round-trip | `CODEX_REQUIRED=1 npm test` passed with `codex-cli 0.155.0` |
| Standard | **0.17**, from 0.16 |
| Spine | **35 checks**, unchanged |
| Skills | 26, unchanged |

## Why this release exists

Its name is **"Standard 0.17, the graduations"**. Standard 0.16 opened three warning windows, and 0.17 closes
them: `G1`, `G2` and `G8` become gate-failing errors for a plugin that pins 0.17, and change nothing for one
that does not. Two clauses were relaxed to what the tooling can honestly check.

The rest of the release makes the output agree with itself. An above-tier finding is now a notice on every
machine surface, not a red error beside a text verdict of 0 errors. A broken grader config exits `2`, an
operator error, not `1`, a failed plugin.

## The pre-cut audit, and what it found

The release decision was made on 2026-09-28 with the tag held for the migration window. The days between
were spent checking the record rather than trusting a green gate:

- Every `[Unreleased]` bullet was checked against its pull request. One consumer-visible change, #327
  (ADR 0060, the collision checks drop to warn), had no entry. Seven other statements were false. All were
  fixed in #349.
- The D-05 entry claimed one shared predicate behind every surface. Only SARIF used it. #349 made the
  claim true, and 48 outputs stayed byte-identical.
- Standard 0.17 itself required and recommended `HISTORY.md` in different sections. #350 fixed it.

## Blast radius

All six reference-family plugins were graded at the commits the marketplace catalogue pins, from real
clones, with `v1.19.0` and with this release. **No tier, error count, warning count or exit code moved.**
Raising each plugin that carries a `library.json` from edition 0.16 to 0.17 moved none of their verdicts
either.

## What is deliberately NOT in this release

- **The audit's five-item strengthening set**, which is named Standard 0.18 and is not scheduled.
- **E70 (`initialPrompt` on plugin agents)**, which waits for a Standard minor and a ruling.
- **E72 to E77**, filed during this cut. E72 (adopting a plugin can wipe its manifest fields) must land
  before any family plugin adopts the Standard, which is the work this release is followed by.
