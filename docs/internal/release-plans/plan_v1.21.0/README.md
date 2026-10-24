---
title: "v1.21.0 - vendor currency and the adoption guard"
---

# v1.21.0 - the packet

**Written 2026-10-23 at `774352a`.** 52 commits since `v1.20.0`, 34 of them non-merge; 45 files
changed, 2255 insertions, 1077 deletions.

This is a **minor**. It adds a refusal behaviour, a JSON field, and a lister fix. It adds no numbered
check and moves neither the spine size nor the Standard pin.

## Numbers, measured at the release commit and not inherited

| | |
| --- | --- |
| Suite | **1721 tests, 1717 pass, 0 failures, 4 skipped** (1672 at `v1.20.0`) |
| Gate | Advanced, 0 errors, 0 warnings |
| `release-ready` | six gates green |
| Codex round-trip | `CODEX_REQUIRED=1 npm test` passed with `codex-cli 0.155.0` |
| Standard | **0.17**, unchanged |
| Spine | **35 checks**, unchanged |
| Skills | 26, unchanged |
| Docs site build | NOT RUN locally - see "What was not measured locally" below |

## Why this release exists

Its name is **"vendor currency and the adoption guard"**. Two independent threads converged on one
cut: a 2026-10-23 re-read of Claude Code's own documentation corrected a vendor claim this toolkit had
read wrong for months ([E81](../../backlog/enhancements.md)), and the first real measurement of
adopting this Standard into a plugin with hand-written native manifests found that regeneration could
silently erase them ([E72](../../backlog/enhancements.md)). Both needed to ship before the
"own plugins first" migration ([`roadmap.md`](../../roadmap.md)) could move `pm-skills`, which has no
`library.json` yet and real hand-written manifests to lose.

## Scope

See [`RELEASE-PLAN.md`](RELEASE-PLAN.md) for the per-PR table and the acceptance criteria written
before this packet existed.

## What shipped

- **E72 (adopting a plugin can wipe its hand-written manifest fields), SHIPPED.** `gen-manifest --write`
  now refuses to drop, empty, or replace a non-empty field the existing native manifest carries that
  `library.json` does not supply, naming each field and its target file. `--allow-field-loss` overwrites
  on purpose. `askit-migrate`'s adopt mode (`0.2.0`) now tells the author to copy those fields into
  `library.json` first. Ships in [#368](https://github.com/product-on-purpose/agent-skills-toolkit/pull/368),
  after three review rounds, each of which found a defect in the previous round's fix - the fix code
  needed the same adversarial scrutiny the feature did.
- **E81 (the vendor's colon rule now names the frontmatter name, not the filename), SHIPPED.** The
  maintainer's ruling (2026-10-14) was option 1: measure, then change. The two-agent fixture ran in a
  Linux container on Claude Code 2.1.309 and the measurement went the way the newer vendor wording
  suggested: a colon in the filename does not stop the plugin loader. `isRuntimeAgentFile` now accepts
  any `.md` file. The retired claim is replaced by `plugin-agents-outside-skip-list`. Ships in
  [#367](https://github.com/product-on-purpose/agent-skills-toolkit/pull/367).
- **E83 (the supported-fields list gained `autoCompactWindow`), SHIPPED**, in the same PR as E81, from
  the same 2026-10-23 re-read of the vendor's plugin-components page.
- **E77 (a toolkit grades a plugin that declares a newer Standard than it ships, and does not say so),
  SHIPPED.** An informational `standardEditionNotice` line and field, changing no exit code, tier, or
  count. Ships in [#365](https://github.com/product-on-purpose/agent-skills-toolkit/pull/365).
- **E82 (the publish verify step gives up before the registry finishes processing), SHIPPED.** The
  window widens from 6 attempts 5 seconds apart to 24 attempts 10 seconds apart, after the v1.20.0
  publish itself demonstrated the old window was too short for a release that landed cleanly. Ships in
  [#364](https://github.com/product-on-purpose/agent-skills-toolkit/pull/364).
- **Records and docs, #366.** README and `architecture-internals.md` drift corrected (a stale `v1.18.0`
  line, "34 checks" where the registry ships 35); the own-plugins-first migration table in
  [`roadmap.md`](../../roadmap.md) refreshed with current facts; the 2026-10-23 first-party provider
  survey filed as [E84 through E89](../../backlog/enhancements.md). No CHANGELOG entry carries the
  roadmap or survey half, because neither is a change to shipped behaviour; the public-page drift
  corrections do carry one, following the v1.20.0 precedent for honesty-page corrections.
- **Dependency bumps, #357 and #358.** Docs-site npm dependencies and a CodeQL action pin label
  correction. CI and the docs site only; no CHANGELOG entry, following this repository's standing
  practice for routine Dependabot bumps.

## Blast radius

The colon-rule fix (E81) was measured at zero affected files across all six reference-family members
when it landed in [#367](https://github.com/product-on-purpose/agent-skills-toolkit/pull/367) and
recorded in the backlog entry; this packet cites that measurement rather than re-running it, since
nothing in this cut touches agent-file naming again. The `gen-manifest` refusal (E72) fires only when a
regeneration would lose a field `library.json` cannot replace: this repository's own manifests
regenerate with the version bump as the only change (verified below), and the pre-existing E72
measurement against `pm-skills` is cited in the CHANGELOG and backlog rather than re-run here. The
`standardEditionNotice` (E77) is informational on every surface it touches and was shown to move no
exit code, tier, or count when it shipped.

**This repository's own `gen-manifest --write --target=all` run for this cut** changed only the
`version` field in `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, and
`manifest.generated.json` - no refusal, no field loss, confirmed by `git diff --stat` against the
pre-bump tree.

## Review history

Every code PR in scope got an adversarial review plus a re-review of its fix commits, following this
project's standing practice. E72's PR ([#368](https://github.com/product-on-purpose/agent-skills-toolkit/pull/368))
needed three rounds: round 1 shipped a refusal with an allowlist that caught only 2 of 11 non-empty
Codex `interface` fields; round 2 generalised detection to every non-empty key but excused any
non-empty rendered value at a field with no `library.json` home, which could silently replace an inline
`mcpServers` object or a custom `skills` directory; round 3 narrowed that exemption to a pure
path-spelling difference and was approved by an independent review. Each round's fix was re-measured
against the `pm-skills` fixture rather than taken on trust.

## What was not measured locally

**The docs site build.** `site/package.json` requires Node `>=22.22.0` for its Astro dependency chain;
this machine's available Node versions (via `nvm4w`) are 22.11.0 and 22.12.0, both below the floor.
`npm run build` inside `site/` failed immediately with `Node.js v22.12.0 is not supported by Astro!
Please upgrade Node.js to a supported version: ">=22.22.0"`. The repository's own `.nvmrc` pins Node 24
for this job, and `ci.yml`'s `build-site` job runs it on every pull request against that pinned
version. `node scripts/check-generated-untracked.mjs` (the one site-tree assertion that does not need
Astro) was run directly and passed. This is recorded here rather than silently skipped, per this
project's own standard for a check that could not run: a refusal is reported, not assumed clean.

## On tag day

1. Merge this PR alone; do not chain a dispatch after the merge.
2. Tag `v1.21.0` at the merge commit and push the tag.
3. `release.yml` publishes the GitHub release; `publish-npm.yml` runs every gate and waits at the
   `npm-publish` environment's required reviewer.
4. The maintainer approves the npm publish.
5. Verify from the consumer position: `npx agent-skills-toolkit@1.21.0` in a clean directory outside
   this repository.
6. Review and merge the `agent-plugins` re-pin once `repin-watch` opens it.
7. Resume "own plugins first" ([`roadmap.md`](../../roadmap.md)): E72 landing here was the toolkit-side
   blocker named in that table's `pm-skills` row.
