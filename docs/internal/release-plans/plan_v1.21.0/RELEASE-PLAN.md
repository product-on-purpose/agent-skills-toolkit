---
title: "v1.21.0 release plan - vendor currency and the adoption guard"
---

# v1.21.0 - release plan

**Class: minor.** A new refusal behaviour in `gen-manifest`, a new JSON field on two report surfaces,
and a lister fix that follows a vendor correction. No check is added or removed; the spine stays 35
and Standard stays 0.17. Per [ADR 0057](../../decisions/0057-unshipped-work-carries-a-name-never-a-version-number.md)
the number `1.21.0` is assigned here, at cut time, and appears nowhere earlier.

## Scope

| Item | Handle | PR |
| --- | --- | --- |
| `gen-manifest --write` refuses a native-manifest write that would lose a hand-written field | [E72 (adopting a plugin can wipe its hand-written manifest fields)](../../backlog/enhancements.md) | [#368](https://github.com/product-on-purpose/agent-skills-toolkit/pull/368) |
| `askit-migrate` adopt mode (0.2.0) instructs copying hand-written fields first | carried by E72 | [#368](https://github.com/product-on-purpose/agent-skills-toolkit/pull/368) |
| `isRuntimeAgentFile` stops excluding a colon in an agent's filename; vendor claim re-pinned | [E81 (the vendor's colon rule now names the frontmatter name, not the filename)](../../backlog/enhancements.md) | [#367](https://github.com/product-on-purpose/agent-skills-toolkit/pull/367) |
| Plugin-agent supported-fields list gains `autoCompactWindow` | [E83 (the supported-fields list gained autoCompactWindow)](../../backlog/enhancements.md) | [#367](https://github.com/product-on-purpose/agent-skills-toolkit/pull/367) |
| validator-parity harness skips the "Plugin directory checks" block | carried by the same vendor-currency pass as E81/E83 | [#367](https://github.com/product-on-purpose/agent-skills-toolkit/pull/367) |
| Publish-verify step widens its wait window | [E82 (the publish verify step gives up before the registry finishes processing)](../../backlog/enhancements.md) | [#364](https://github.com/product-on-purpose/agent-skills-toolkit/pull/364) |
| `check.mjs` / `evaluate.mjs` carry a newer-Standard-edition notice | [E77 (a toolkit grades a plugin that declares a newer Standard than it ships, and does not say so)](../../backlog/enhancements.md) | [#365](https://github.com/product-on-purpose/agent-skills-toolkit/pull/365) |
| README / `architecture-internals.md` drift (stale `v1.18.0`, "34 checks") corrected; own-plugins-first roadmap table refreshed; first-party provider survey filed as E84-E89 | docs and records only | [#366](https://github.com/product-on-purpose/agent-skills-toolkit/pull/366) |
| Dependabot: docs-site npm dependencies, CodeQL action pin label correction | CI and site only | [#357](https://github.com/product-on-purpose/agent-skills-toolkit/pull/357), [#358](https://github.com/product-on-purpose/agent-skills-toolkit/pull/358) |

## Acceptance criteria, written before the bump commit

1. `gen-manifest --write --target=all` regenerates this repository's own native manifests with no field
   loss and no refusal, carrying only the version bump.
2. `npm test` exits 0, with the stated total and failure count matching the suite's own TAP summary.
3. `node scripts/check.mjs .` reports Advanced, 0 errors, 0 warnings.
4. `GITHUB_TOKEN=<token> node scripts/release-ready.mjs .` exits 0 on all six gates, including
   `vendor-watch` (E81 must clear it) and `release-notes-section`.
5. The Codex round-trip (`CODEX_REQUIRED=1 npm test`) is run and recorded, not merely listed as
   intended.
6. The six reference-family plugins show no verdict movement from the colon-rule fix, measured rather
   than assumed.
7. CHANGELOG and RELEASE-NOTES carry a dated section for 1.21.0, each bullet checked against its PR.

## Gates

| Gate | Result |
| --- | --- |
| `release-ready` (six gates) | measured at cut time - see the packet README |
| Suite | measured at cut time - see the packet README |
| Codex round-trip | measured at cut time - see the packet README |
| Family blast radius (E81 colon fix) | measured at cut time - see the packet README |
| Docs site build | measured at cut time - see the packet README |

## After the tag

1. Approve the npm publish at the `npm-publish` environment's reviewer gate.
2. Confirm the agent-plugins re-pin watcher opens an issue, then review and merge the re-pin.
3. Verify from the consumer position: `npx agent-skills-toolkit@1.21.0` in a clean directory.
4. Resume "own plugins first" ([`roadmap.md`](../../roadmap.md)): E72 landing here was the toolkit-side
   blocker for the `pm-skills` adoption step.
