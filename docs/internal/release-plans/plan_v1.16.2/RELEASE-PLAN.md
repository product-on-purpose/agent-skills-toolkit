---
title: "v1.16.2 - the plan, written after the work, for a one-step fix"
---

# v1.16.2 - release plan

**Written after the work, like `v1.16.1` before it, and for the same reason.** This release is one defect found from a consumer's position, not a planned workstream. A forward-looking plan backfilled into the past tense would be a false record.

## Scope

One fix. `action.yml`'s `Set up Node` step drops `cache: npm` and `cache-dependency-path:`; every other line of the composite is unchanged.

The supporting changes are the version trail this repository's own gates require: four manifests, `README.md`'s badge and Status section, the pin advertised in `action.yml`'s own usage comment, a regenerated `INDEX.md`, `CHANGELOG.md`, `RELEASE-NOTES.md`, and this packet.

## Why a patch and not a minor

The version rules here put a Standard revision or a spine change into a minor. Neither happened:

- **No check added, none removed.** The spine stays at 34.
- **The Standard stays at 0.15**, unrevised.
- **No requirement changes for any plugin.** The change cannot move a grade in either direction, because the step it fixes ran before any grading.

Patch precedent in this line: 1.16.1, 1.12.1, 1.11.1, 1.10.1, 1.6.1, 1.5.1, 1.4.1.

## The uncomfortable part

This defect shipped in `v1.16.1`, a release whose own headline was *"Gold was unreachable for anyone who did not vendor the gate."* That release existed to make the Action usable by consumers who do not vendor the toolkit. It then handed exactly those consumers an Action that could not start.

Both defects have the same shape: **the toolkit tested the path it uses on itself, and shipped the path other people use untested.** `G2` recognised only the vendored spelling of the gate command. The Action was only ever exercised by unit tests reading its file, never by running it the way GitHub assembles a composite.

Fixing the second instance one release after the first is worth recording, because the pattern is the finding, not the individual bug.

## What is deliberately not done here

**No test is added.** The honest options were a fixture that shells out to a real runner, which this suite cannot do, or another assertion about `action.yml`'s parsed content, which is the same class of test that already passed while the Action was broken. A test that could not have caught this is worse than no test: it converts a known gap into a false sense of coverage.

The real closure is a smoke consumer, a minimal repository whose CI runs the published Action against a fixture plugin and asserts a tier comes back. That is a release's worth of work on its own, it needs a second repository, and it belongs in a planned minor rather than bolted onto a patch that exists to stop the bleeding.

Recorded here so the gap is a known open item rather than an oversight.

## Verification

- `npm test`: 1399 tests, 0 failures, 1 skipped.
- `node scripts/check.mjs .`: Advanced, 0 errors, 0 warnings.
- `node scripts/release-ready.mjs .`: all gates green.
- The fix itself is confirmed by the consumer that found it: `prisant-labs/prisant-utilities` repins to `v1.16.2` and its "Advanced Skill Library Standard" check must go green, having failed on `v1.16.1`. That is the only end-to-end proof available, and it lives outside this repository by construction.
