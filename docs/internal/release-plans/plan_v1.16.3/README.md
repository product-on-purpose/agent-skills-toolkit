---
title: "v1.16.3 - the Action documented a pin the toolkit had already moved off"
---

# v1.16.3 - the packet

**Written 2026-08-25**, hours after `v1.16.2` and for a related reason.

This is a patch. No check is added, none is removed, the spine stays at 34 and the Standard stays at 0.15. One line of a usage comment was out of date.

## Numbers, measured at the release commit and not inherited

| | |
| --- | --- |
| Version manifests | **`1.16.3`** across all four |
| Standard | **0.15**, unchanged. No Standard revision in this release |
| Spine | **34**, unchanged. **No check added, none removed** |
| Skills | **26**, unchanged. No skill's own version moves |
| Suite | **1399 tests, 0 failures**, 1 skipped (POSIX-only). Unchanged, and unchanged for the same reason as v1.16.2: no test in this repository reads the Action's usage comment |
| Gate on this repository | **Advanced, 0 errors, 0 warnings** |

## Why this release exists

`action.yml`'s usage comment showed consumers how to upload SARIF, and told them to use `github/codeql-action/upload-sarif@v3`.

That action targets Node 20. GitHub runners now force it onto Node 24 and emit a deprecation warning, and the v3 line itself is scheduled for deprecation in December 2026. A consumer who copied the example, as the example exists to be copied, got two deprecation annotations on every green run.

Meanwhile this repository's own `.github/workflows/codeql.yml` was already pinned to the v4 line, by SHA, at `v4.37.7`.

**The toolkit had moved to v4 for itself and left v3 in the instructions it hands other people.**

## The pattern, twice in one day

v1.16.2 fixed an Action that failed before it graded anything, and its packet named the shape: *the toolkit tests the path it uses on itself and ships the path other people use untested.*

This is the same shape in a quieter register. Nothing failed. Nothing was untested in a way a test could have caught, because the defect lives in a comment. But the divergence is identical: the internal path was maintained, the consumer-facing path was not, and only a consumer could notice.

`prisant-labs/prisant-utilities` noticed both, within an hour of each other, by being the first repository to wire the Action into CI and then read its own run annotations.

## What a consumer must do

If you copied the SARIF step from the usage comment, change `@v3` to `@v4`. If you never enabled SARIF, nothing changes for you.

## The open item is unchanged

v1.16.2's packet recorded a smoke consumer, a minimal repository whose CI runs the published Action and asserts a tier comes back, as the real closure for this class. This release does not add one, and does not pretend to. It would not have caught this defect either: a comment is not executed. What would catch it is a check that reads the pins inside `action.yml`'s documentation the way `action-pin-watch` already reads the pins inside workflows. That is a plausible thirty-fifth check and is deliberately not being bolted onto a patch.
