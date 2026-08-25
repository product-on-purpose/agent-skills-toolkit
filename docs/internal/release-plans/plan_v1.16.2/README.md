---
title: "v1.16.2 - the Action failed before it graded anything"
---

# v1.16.2 - the packet

**Written 2026-08-25.** Ten files changed in the release commit, 65 insertions, 13 deletions, on top of four commits landed since `v1.16.1`.

This is a patch, not a minor. No check is added, none is removed, the spine stays at 34 and the Standard stays at 0.15. One step inside the published Action was failing before the gate ran.

## Numbers, measured at the release commit and not inherited

| | |
| --- | --- |
| Version manifests | **`1.16.2`** across all four |
| Standard | **0.15**, unchanged. No Standard revision in this release |
| Spine | **34**, unchanged. **No check added, none removed** |
| Skills | **26**, unchanged. No skill's own version moves |
| Suite | **1399 tests, 0 failures**, 1 skipped (POSIX-only). Unchanged from the `v1.16.1` tag: this release adds no test, because the defect is not reachable from any test this repository can run against itself |
| Gate on this repository | **Advanced, 0 errors, 0 warnings** |

## Why this release exists

**Every consumer of the reusable Action got a red check that never graded anything.**

The Action's `Set up Node` step asked `actions/setup-node` to cache npm, pointing `cache-dependency-path` at `${{ github.action_path }}/package-lock.json`. The lockfile is real and it is checked in. The path form is the problem: `setup-node` resolves that input as a glob **relative to `GITHUB_WORKSPACE`**, and `github.action_path` is an absolute path outside the workspace, `/home/runner/work/_actions/product-on-purpose/agent-skills-toolkit/v1.16.1/`. The pattern never matched.

An unresolved path is an error in `setup-node`, not a warning. So the composite step failed, and everything after it was skipped: the dependency install, the gate, the SARIF, the outputs.

What a consumer saw was maximally misleading. A red required check named "Advanced Skill Library Standard", a log complaining about dependency caching, and no findings, no tier, no counts. The obvious reading is "my repository failed the Standard". The truth was that the Standard was never applied.

## How it was found, and why this repository never caught it

`prisant-labs/prisant-utilities` wired the Action into CI for the first time on 2026-08-25 and its first run failed this way.

This repository could not have caught it. Its own CI runs the gate **directly**, through `scripts/check.mjs`, because it vendors itself. The Action is the one artifact here that only executes in somebody else's repository, and nothing in the suite exercises the composite as GitHub actually assembles it. That is worth stating plainly rather than filing as bad luck: **the published interface had no test that ran the way a consumer runs it.**

The five `action.yml` unit tests that do exist all assert on the file's parsed content, not on its runtime behaviour, which is why 1399 passing tests sat alongside an Action that could not start.

## Why the cache is removed rather than repaired

There is no workspace-relative path that can point at the Action's own lockfile. That is precisely why the absolute form was reached for in the first place, so "fix the path" has no target.

The install being cached is a single package, `yaml`, which is `check.mjs`'s only runtime dependency. The cache was saving a second or two and costing an entire failure mode.

The install itself is untouched: still `npm ci --omit=dev` with `working-directory: ${{ github.action_path }}`, still the Action's own lockfile, never the consumer's. The isolation reasoning in the header comment above that step stands unchanged; only the caching in front of it is gone.

## What a consumer must do

Bump the `uses:` pin to `v1.16.2`. Nothing else. No grade moves, because no grade was being produced.
