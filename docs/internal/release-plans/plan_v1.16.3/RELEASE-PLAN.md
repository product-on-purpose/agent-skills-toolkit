---
title: "v1.16.3 - the plan, one line of documentation"
---

# v1.16.3 - release plan

**Written after the work**, as with the two releases before it.

## Scope

One line. `action.yml`'s usage comment moves its SARIF example from `github/codeql-action/upload-sarif@v3` to `@v4`.

Everything else is the version trail this repository's gates require: four manifests, `README.md`'s badge and Status section, the toolkit pin advertised in `action.yml`'s own usage comment, a regenerated `INDEX.md`, `CHANGELOG.md`, `RELEASE-NOTES.md`, and this packet.

## Why a patch, and why cut at all

No check added, none removed, spine 34, Standard 0.15 unrevised. No grade moves anywhere.

The argument for not cutting at all is real: it is a comment. The argument for cutting is that this particular comment is an interface. It exists to be copied, it is the only SARIF wiring instruction the toolkit publishes, and leaving it stale means every consumer who adopts SARIF from this point inherits two deprecation warnings and a line that stops working in December 2026.

A comment that is copied is code with extra steps.

## Why not pin by SHA in the example

This repository's own `codeql.yml` pins `github/codeql-action` by SHA, which is stricter and is right for a workflow that actually runs. The usage comment stays on the floating `@v4` tag deliberately: it is illustrative, a reader substitutes their own pinning policy, and a SHA in an example ages into a confusing artifact the moment it drifts, with nothing to police it. The tag communicates the intent, which is "the v4 line, not v3".

## What is deliberately not done here

**No check is added for documented pins.** `action-pin-watch` reads pins inside workflow files and would have caught this had the example been a workflow. Extending it to read fenced examples inside `action.yml`'s comments is a plausible thirty-fifth spine entry and a genuinely good idea, and it is a minor's worth of design: what counts as a documented pin, which files are scanned, how a deliberately-frozen historical example is exempted.

Bolting it onto a patch would mean designing it in an afternoon and shipping it in the same release that motivated it, with no one having used it. That is the shape of decision this repository's own release discipline exists to prevent. Recorded as an open item instead.

## Verification

- `npm test`: 1399 tests, 0 failures, 1 skipped.
- `node scripts/check.mjs .`: Advanced, 0 errors, 0 warnings.
- `node scripts/release-ready.mjs .`: all gates green.
- `prisant-labs/prisant-utilities` v0.4.2 already made the same change in its own workflow and its CI run is green with no deprecation annotations, which is the consumer-side confirmation that `@v4` is the correct target.
