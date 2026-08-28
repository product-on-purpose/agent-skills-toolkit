---
title: "v1.17.0 - the plan: promote two sessions of merged work, then exercise the new publish path"
---

# v1.17.0 - release plan

**Written after the work**, as with the three releases before it. Everything in scope was already
merged to `main` and verified there; what remained was the cut itself, and the cut is the first to
run through a publish path that no longer depends on anyone remembering to start it.

## Scope

Promote the nine `[Unreleased]` CHANGELOG entries produced by the 2026-08-25..28 sessions:

- the documentation style contract and its report (`npm run doc-style`, report-only, deliberately
  not in the gate), with `scripts/lib/prose-metrics.mjs` as the measurement behind it;
- the fifth writing rule in `askit-build-docs` (orientation before mechanism);
- the E52 fix: a shipped release's packet and CHANGELOG section stop being policed once its tag
  exists, `docs/internal/STATUS.md` never is, and `versionHasShipped()` fails closed;
- the E51 fix under [ADR 0056 (an unreadable folder README is a finding, not a silent pass)](../../decisions/0056-an-unreadable-folder-readme-is-a-finding-not-a-silent-pass.md):
  `G8` emits a finding when a folder README exists but cannot be read, **capped at warn until
  Standard 0.17**;
- tag-triggered npm publishing behind a required reviewer on the `npm-publish` environment;
- the `architecture-internals.md` rewrite to the style contract, and the records repairs across
  `STATUS.md` and `RELEASE-HISTORY.md`.

One piece of choreography rides with the cut: the onboarding-funnel packet held the number v1.17.0
and had not started implementation, so it was renamed to `plan_onboarding-funnel/` and goes
unversioned, per the graded-cohort precedent (STATUS.md, 2026-08-22). Its three tracked
cross-references were repaired in the same commit.

## Why a minor, and why cut now

Feature-bearing three ways: a new report tool, a new (warn-level) finding in an existing spine
check, and a new publish trigger. No check is added or removed, the spine stays 34, the Standard
stays 0.15, and no verdict moves anywhere.

Cut now because everything from two sessions was sitting unreleased with all four manifests still
reading 1.16.3, and because two vendor probes expire 2026-09-24 and block releases once expired. A
cut that slips acquires a second problem.

## What is deliberately not done here

- **E51 does not graduate.** The finding ships at `warn` and moves to `error` at Standard 0.17,
  per ADR 0056. This cut leaves the cap exactly where the ADR put it.
- **The 11 remaining explanation pages are not swept.** The style direction (LAYER-DISC) is
  waiting on the maintainer; `npm run doc-style` is the queue when it lands.
- **The eval-instrument batch stays untouched.** E16 (two scoring keys, two scores, same
  advisory) gates it and is a design question.
- **npm package ownership** stays with `jprisant` rather than the org.

## Verification

- `npm test`: 1439 tests, 0 failures, 1 skipped (POSIX-only).
- `node scripts/check.mjs .`: Advanced, 0 errors, 0 warnings.
- `GITHUB_TOKEN` present, `node scripts/release-ready.mjs`: all five gates green.
- **Codex round-trip (Q-E gate): run and passing.** `CODEX_REQUIRED=1 npm test` against
  `codex-cli 0.144.5` on 2026-08-28; the emitted `.codex-plugin/plugin.json` round-trips and the
  skills are confirmed INGESTED, not merely listed. First release since v1.14.0 to record this.
- **The publish path is itself under test.** The pushed tag must fire `publish-npm.yml`, run
  every gate, stop at the `npm-publish` required-reviewer approval, and publish only after a human
  approves. Then: npm serves 1.17.0 with provenance, a consumer-position install from the live
  registry grades a plugin, and `repin-watch` prepares the registry re-pin.
