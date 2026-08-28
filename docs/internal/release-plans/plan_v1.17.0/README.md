---
title: "v1.17.0 - releases stop depending on memory, and records stop being rewritten"
---

# v1.17.0 - the packet

**Written 2026-08-28 at `6e32a4a`.** Nine commits since `v1.16.3`; **25 files changed, 1711
insertions, 105 deletions** in the committed work, with the release trail (manifests, packet,
notes, records) landing in the release commit on top.

This is a minor, not a patch: a new report tool, a new warn-level finding inside an existing
check, and a new publish trigger. No check is added or removed, and no verdict moves.

## Numbers, measured at the release commit and not inherited

| | |
| --- | --- |
| Version manifests | **`1.17.0`** across all four |
| Standard | **0.15**, unchanged. No Standard revision in this release |
| Spine | **34**, unchanged. **No check added, none removed**; `G8` gains a finding it used to swallow, at `warn` |
| Skills | **26**, unchanged. `askit-build-docs` (at 0.2.0) gains its fifth writing rule and the style-contract reference |
| Suite | **1439 tests, 0 failures**, 1 skipped (POSIX-only). It read **1399** at the `v1.16.3` tag; the forty added are 22 for `prose-metrics`, 12 for the E52 scoping of `check-release-counts`, 3 structural assertions on `publish-npm.yml`, and 3 for the `G8` unreadable-README finding |
| Gate on this repository | **Advanced, 0 errors, 0 warnings** |
| Codex round-trip | **Run and passing** against `codex-cli 0.144.5` on 2026-08-28: skills INGESTED, not merely listed. First release since v1.14.0 to record this |

## Why this release exists

**Everything from two sessions was unreleased, and the route it ships by was the release's own
centerpiece.** Nine CHANGELOG entries sat in `[Unreleased]` with all four manifests still reading
1.16.3. The largest of those entries exists because `v1.16.2` and `v1.16.3` were tagged and
GitHub-released on 2026-08-25 and were still absent from npm three days later: the dispatch-only
publish design was right that publishing is a one-way door and wrong about which failure would
actually happen. Not an accidental publish - no publish, silently.

So this cut is also the first live exercise of the fix. The pushed `v1.17.0` tag fires
`publish-npm.yml` on its own, runs every gate, and stops at the `npm-publish` environment's
required reviewer. Nothing reaches the registry until a human approves, and nothing depends on a
human remembering.

## What is in it

Full detail in `CHANGELOG.md`; the shape:

- **A documentation style contract, and the report that measures the checkable half of it**
  (`npm run doc-style`, all 88 published pages, ranked). Report-only, deliberately not in the
  gate. `scripts/lib/prose-metrics.mjs` is the instrument; its negative cases (the three house
  separator forms that are not idea-joins) are the point.
- **`G8` stops reporting success for a folder it never examined** (E51,
  [ADR 0056 (an unreadable folder README is a finding, not a silent pass)](../../decisions/0056-an-unreadable-folder-readme-is-a-finding-not-a-silent-pass.md)).
  A README that exists but cannot be read now yields a finding naming the path, the error code,
  and the fact that the dependent checks did not run. **Capped at `warn` until Standard 0.17**; the
  silence ends now, only the consequence is scheduled. The window is measured free: 213 READMEs
  across the six reference-family members, zero affected.
- **A shipped release's record stops being rewritten by in-flight work** (E52). Once
  `v<version>` is tagged, its packet and CHANGELOG section are exempt from the count guard as
  records of that release; `STATUS.md` never is; `versionHasShipped()` fails closed so a shallow
  CI clone polices everything exactly as before.
- **Tag-triggered npm publishing behind a required reviewer**, with the environment binding, the
  single-interpolation rule, and `id-token: write` isolation each proven able to fail by mutation
  before being trusted.
- **`architecture-internals.md` rewritten to the contract** as the exemplar page (debt 122 to 32,
  measured by the shipped instrument), plus records repairs across `STATUS.md` and
  `RELEASE-HISTORY.md`.

## What no plugin has to do

**Nothing.** No requirement changes. One new warning CAN appear: a folder whose `README.md`
exists but cannot be read (a directory carrying the name, a permissions failure, a malformed
checkout object) now produces a `G8` warn finding where it used to produce silence. A warning
moves no tier today, and the escalation to `error` is scheduled for Standard 0.17 with the usual
migration discipline.

## What this release does not fix

- **E51's graduation** is scheduled, not shipped; the cap stays at `warn` per ADR 0056.
- **The 11 unswept explanation pages** wait on the LAYER-DISC style ruling; the report is the queue.
- **The eval-instrument batch** (E16, E17, E20, E15, E13) stays open; E16 gates it.
- **The npm package is still owned by `jprisant`** rather than the org.

## Choreography note: the number this release took

The onboarding-funnel packet held v1.17.0 with implementation unstarted. It was renamed to
`plan_onboarding-funnel/` and goes unversioned, per the graded-cohort precedent (STATUS.md,
2026-08-22): assigning a line a version it will not get is how a line goes stale unnoticed.
v1.17.0 was assigned to three bodies of work; only this one shipped under it.
