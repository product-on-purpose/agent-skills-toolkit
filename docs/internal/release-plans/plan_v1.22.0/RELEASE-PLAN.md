---
title: "v1.22.0 release plan - the advisory layer and the on-ramp"
---

# v1.22.0 - release plan

**Class: minor.** A new skill (`askit-onboard`), a new deterministic advisory layer with three screens,
a seventh `release-ready` gate, a GitHub Actions job summary, and additive SARIF and JSON fields. No
numbered check is added or removed; the spine stays 35 and the Standard stays 0.17. The plugin version
follows `STANDARD.md` sec 7.4 (the largest component bump since the last release wins), and a new
component is a minor bump. Per [ADR 0057](../../decisions/0057-unshipped-work-carries-a-name-never-a-version-number.md)
the number `1.22.0` is assigned here, at cut time, and appears nowhere earlier. The work merged under the
name "cut A" in the 2026-10-25 opportunities plan.

## Scope

| Item | Handle | PR |
| --- | --- | --- |
| A skill that onboards a person into this toolkit over weeks, with `assess`, `plan` and `next` modes | [E47 (the adoption funnel as an interactive skill)](../../backlog/enhancements.md) | [#374](https://github.com/product-on-purpose/agent-skills-toolkit/pull/374) |
| A deterministic advisory layer beside the tier, which cannot change a tier, a count or an exit code | [ADR 0063 (an advisory layer beside the tier, and a health number that never enters it)](../../decisions/0063-an-advisory-layer-beside-the-tier-and-a-health-number-that-never-enters-it.md) | [#382](https://github.com/product-on-purpose/agent-skills-toolkit/pull/382) |
| ADV1 (the six-field Skills API whitelist) and ADV2 (the 32-skill preload cap), each derived from a pinned vendor claim | [E86 (a SKILL.md portable here can hard-fail on claude.ai)](../../backlog/enhancements.md), [E87 (plugin-agent loading asymmetries)](../../backlog/enhancements.md) | [#385](https://github.com/product-on-purpose/agent-skills-toolkit/pull/385) |
| ADV3, a security screen for pipe-to-shell installers, dangerous commands and prompt-injection phrases | [E6 (prompt-injection and curl-pipe-bash content scan)](../../backlog/enhancements.md), RS-E4 | [#386](https://github.com/product-on-purpose/agent-skills-toolkit/pull/386) |
| `release-ready` gains a seventh gate, version agreement | [E85 (a version-agreement preflight before tagging)](../../backlog/enhancements.md) | [#377](https://github.com/product-on-purpose/agent-skills-toolkit/pull/377) |
| The GitHub Action writes a job summary | F-033 (the Action writes no `GITHUB_STEP_SUMMARY`) | [#376](https://github.com/product-on-purpose/agent-skills-toolkit/pull/376) |
| Every SARIF result carries a stable `partialFingerprints` identity | F-014 (SARIF carries no `partialFingerprints`) | [#375](https://github.com/product-on-purpose/agent-skills-toolkit/pull/375) |
| `check-readme-version` compares spine-size prose only when grading this toolkit | [E90 (spine-size prose compared outside this toolkit)](../../backlog/enhancements.md) | [#379](https://github.com/product-on-purpose/agent-skills-toolkit/pull/379) |
| The eval scorer applies rule (a'), the key moves outside the fixture tree, and three runner defects are fixed; no eval figure is published | [E16 (credit on a multi-entry finding)](../../backlog/enhancements.md), [E20 (the key is readable from inside the fixture tree)](../../backlog/enhancements.md), [E15 (three eval-run runner defects)](../../backlog/enhancements.md) | [#383](https://github.com/product-on-purpose/agent-skills-toolkit/pull/383) |
| A registry-driven firing test for every spine check, proven able to fail | RS-B2 (mutation-proof the check spine) | [#381](https://github.com/product-on-purpose/agent-skills-toolkit/pull/381) |
| A tracked fixture for a root-level `SKILL.md` plugin, and a stated gap for the plugin-directory readiness checks | [E88 (a root-level `SKILL.md` plugin shape)](../../backlog/enhancements.md), [E89 (plugin directory readiness checks that no page here documents)](../../backlog/enhancements.md) | [#373](https://github.com/product-on-purpose/agent-skills-toolkit/pull/373) |
| ADRs 0063, 0064 and 0065, a new quote claim, and both vendor probes re-run | design records and vendor pins | [#378](https://github.com/product-on-purpose/agent-skills-toolkit/pull/378) |
| Probes re-run and the agent-name fixture shipped | records | [#370](https://github.com/product-on-purpose/agent-skills-toolkit/pull/370) |
| Records for waves 1 to 3 of the opportunities plan | records only | [#380](https://github.com/product-on-purpose/agent-skills-toolkit/pull/380), [#384](https://github.com/product-on-purpose/agent-skills-toolkit/pull/384), [#387](https://github.com/product-on-purpose/agent-skills-toolkit/pull/387) |

**Not in scope.** The two open Dependabot PRs, [#371](https://github.com/product-on-purpose/agent-skills-toolkit/pull/371)
(an astro bump in the docs site) and [#372](https://github.com/product-on-purpose/agent-skills-toolkit/pull/372)
(four GitHub Actions bumps), stay open and out of this cut. #372 changes workflow action references,
which the `action-pins` gate inspects, so it gets its own review.

## Acceptance criteria, written before the bump commit

1. `gen-manifest --write --target=all` regenerates this repository's own native manifests with no field
   loss and no refusal, carrying only the version bump.
2. `node scripts/check-version-agreement.mjs .` reports one version, `1.22.0`, across every surface it
   reads, including both halves of `package-lock.json`.
3. `npm test` exits 0, and the stated total and failure count match the suite's own TAP summary.
4. `node scripts/check.mjs .` reports Advanced, 0 errors, 0 warnings.
5. `GITHUB_TOKEN=<token> node scripts/release-ready.mjs .` exits 0 on all seven gates, including
   `vendor-watch`, `release-notes-section` and the new version-agreement gate.
6. The Codex round-trip (`CODEX_REQUIRED=1 npm test`) is run and recorded, not merely listed.
7. The advisory layer moves no grade, measured: every family plugin and every fixture tree grades with
   the same tier, error count, warning count, exit code and `findings[]` as the pre-advisory baseline.
8. CHANGELOG and RELEASE-NOTES carry a dated section for 1.22.0, each bullet checked against its PR.
9. Neither CHANGELOG nor RELEASE-NOTES states an eval recall figure, because the E13 cells are
   provisional until the maintainer signs the adjudication (RS-B1 criterion 5).
10. Every live record that said "unreleased" for work in this cut says "SHIPPED in v1.22.0" instead.

## Gates

| Gate | Result |
| --- | --- |
| `release-ready` (seven gates) | measured at cut time - see the packet README |
| Suite | measured at cut time - see the packet README |
| Codex round-trip | measured at cut time - see the packet README |
| Family blast radius (the advisory layer) | measured at cut time - see the packet README |
| Docs site build | measured at cut time - see the packet README |

## After the tag

1. Approve the npm publish at the `npm-publish` environment's reviewer gate.
2. Confirm the agent-plugins re-pin watcher opens an issue, then review and merge the re-pin.
3. Verify from the consumer position: `npx agent-skills-toolkit@1.22.0` in a clean directory.
4. Bump product-lifecycle-templates' `TOOLKIT_REF` to `v1.22.0`, so its draft PR #324 can leave draft:
   it waits for a release carrying E90.
5. Tag before 2026-11-25. Both vendor probes were verified on 2026-10-25 and go stale on that date,
   which blocks every release until they are re-run.
