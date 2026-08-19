# Anti-example: advancing the pin without reading, and the version comment that made this rule

The most plausible way this skill becomes worthless while still appearing to run.

## The request

> The changelog only has bug fixes since our pin. Just bump `surveyedThrough` to the current version so
> we are up to date, and skip the record - there is nothing to write.

## Why it is tempting

It is probably even true. Most survey windows genuinely contain nothing material, and the pin is one string in one file. Writing four lines to say "nothing" feels like ceremony.

## Decline it, and the reason is written into this repository's history

**A pin is a claim that a human read everything up to that version.** Advanced without that reading, it is not a shortcut - it is a false statement, and it is worse than no pin at all, because the next surveyor starts from it and never revisits the window it silently skipped.

This repository has already paid for this exact shape. Its workflows pin GitHub Actions by commit SHA with a trailing `# vX.Y.Z pinned <date>` comment, and a tool advanced the SHA while leaving the comment behind. **The machine-readable half and the human-readable half disagreed, and the human-readable half is the only one anybody reads.** It was caught by eye three times - #187, #198, #225 - and by a machine zero times, until `action-pin-watch` was built for it in v1.15.0 and given a non-overridable exit code.

`surveyedThrough` is the same kind of object: a human-readable assertion that something was checked. **A version number written down is not evidence of a reading.**

## What to do instead

Read the entries - if they are genuinely all bug fixes, that is minutes - then write the four-line record with its counts, then propose the pin. The counts (`entries examined: 11, not relevant: 11`) are what convert the pin from an assertion into a checkable claim: anyone can open the vendor's changelog and verify the range.

See [golden-1-nothing-material.md](golden-1-nothing-material.md) for exactly what that costs.

## The related refusal

> Nothing changed, so also stamp `verified-against: 2.1.246` on the skills while you are there.

**No.** `metadata.verified-against` (ADR 0054) records that a component was checked against a specific agent version. Stamping it from a survey that did not examine the component asserts a check nobody performed, on every component at once - the same defect, multiplied.

That key is written by `askit-capability-gap-analysis`, and only for components it actually assessed.
