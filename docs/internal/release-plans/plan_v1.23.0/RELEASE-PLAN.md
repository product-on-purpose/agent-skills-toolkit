---
title: "v1.23.0 release plan - the health number beside the tier"
---

# v1.23.0 - release plan

**Class: minor.** Reports gain a health number beside the tier, a fourth advisory screen (ADV4, the
substance screen) and a versioned, additive report object with a JSON Schema. Two builder skills gain
documentation fixes. No numbered check is added or removed; the spine stays 35 and the Standard stays
0.17. The plugin version follows `STANDARD.md` sec 7.4 (the largest component bump since the last
release wins), and a new capability in an existing component is a minor bump. Per
[ADR 0057](../../decisions/0057-unshipped-work-carries-a-name-never-a-version-number.md) the number
`1.23.0` is assigned here, at cut time, and appears nowhere earlier. The work merged under the name
"W6" in the 2026-10-25 opportunities plan, and this release was called "cut B" until now.

## Scope

| Item | Handle | PR |
| --- | --- | --- |
| A health number beside the tier, with five categories and no cross-category average; every category reports `uncalibrated` on this ship | W6, [ADR 0063 (an advisory layer beside the tier, and a health number that never enters it)](../../decisions/0063-an-advisory-layer-beside-the-tier-and-a-health-number-that-never-enters-it.md) sec 3 and 4, [E61 (the tier certifies file shape)](../../backlog/enhancements.md) | [#394](https://github.com/product-on-purpose/agent-skills-toolkit/pull/394) |
| ADV4, the substance screen: a body word floor, duplicated sibling descriptions, and placeholder bodies | W6, [E61 (the tier certifies file shape)](../../backlog/enhancements.md) | [#394](https://github.com/product-on-purpose/agent-skills-toolkit/pull/394) |
| A versioned report object: `schemaVersion`, `run`, `checks[]`, `components[]`, `blockedFindings[]`, and `schemas/report.v1.json` | W6, ADR 0063 sec 5 | [#394](https://github.com/product-on-purpose/agent-skills-toolkit/pull/394) |
| A Health section and a richer component inventory in the Markdown and HTML reports | W6 | [#394](https://github.com/product-on-purpose/agent-skills-toolkit/pull/394) |
| 26 of the 46 labelled 2026-09-04 audit-corpus trees tracked as fixtures, so the calibration counts can be re-run | W6 | [#394](https://github.com/product-on-purpose/agent-skills-toolkit/pull/394) |
| `askit-build-skill` starts from a repository's own skill template when one exists | [E78 (step 2 copies the generic template where the consuming repository has its own)](../../backlog/enhancements.md) | [#390](https://github.com/product-on-purpose/agent-skills-toolkit/pull/390) |
| The phase-2 craft review works in fallback mode | [E79 (phase 2 delegates to a subagent a fallback-mode session does not have)](../../backlog/enhancements.md) | [#390](https://github.com/product-on-purpose/agent-skills-toolkit/pull/390) |
| ADR 0066 and ADR 0062, both Proposed, and two Proposed plans | design records, no behaviour change | [#391](https://github.com/product-on-purpose/agent-skills-toolkit/pull/391), [#392](https://github.com/product-on-purpose/agent-skills-toolkit/pull/392), [#393](https://github.com/product-on-purpose/agent-skills-toolkit/pull/393) |
| Records for v1.22.0 shipped and own plugins first complete | records only | [#389](https://github.com/product-on-purpose/agent-skills-toolkit/pull/389) |

**Not in scope.** The two open Dependabot PRs stay open and out of this cut:
[#372](https://github.com/product-on-purpose/agent-skills-toolkit/pull/372) (four GitHub Actions bumps)
and [#395](https://github.com/product-on-purpose/agent-skills-toolkit/pull/395) (three docs-site
dependency bumps). #372 changes workflow action references, which the `action-pins` gate inspects, so
it gets its own review. #371 (an astro bump) was closed by Dependabot on 2026-11-01, superseded by
#395.

## Acceptance criteria, written before the bump commit

1. `gen-manifest --write --target=all` regenerates this repository's own native manifests with no field
   loss and no refusal, carrying only the version bump.
2. `node scripts/check-version-agreement.mjs .` reports one version, `1.23.0`, across every surface it
   reads, including both halves of `package-lock.json`.
3. `npm test` exits 0, and the stated total and failure count match the suite's own TAP summary.
4. `node scripts/check.mjs .` reports Advanced, 0 errors, 0 warnings.
5. `GITHUB_TOKEN=<token> node scripts/release-ready.mjs .` exits 0 on all seven gates.
6. The Codex round-trip (`CODEX_REQUIRED=1 npm test`) is run and recorded, not merely listed.
7. The whole release moves no grade, measured: every family plugin and every fixture tree grades with
   the same tier, error count, warning count, exit code and `findings[]` under `v1.22.0` and under this
   release, with the advisory keys removed.
8. CHANGELOG and RELEASE-NOTES carry a dated section for 1.23.0, each bullet checked against its PR.
9. Neither CHANGELOG nor RELEASE-NOTES states a health band, a calibrated threshold or an eval recall
   figure, because every health category is `uncalibrated` and the E13 cells stay provisional until
   the maintainer signs the adjudication.
10. Every live record that said "unreleased" for work in this cut says "SHIPPED in v1.23.0" instead.
11. RELEASE-NOTES names which family plugins will see new ADV4 notices, measured, the way v1.22.0 did
    for ADV1.

## Gates

| Gate | Result |
| --- | --- |
| `release-ready` (seven gates) | measured at cut time - see the packet README |
| Suite | measured at cut time - see the packet README |
| Codex round-trip | measured at cut time - see the packet README |
| Family and fixture blast radius (the whole release against `v1.22.0`) | measured at cut time - see the packet README |
| Docs site build | measured at cut time - see the packet README |

## After the tag

1. Approve the npm publish at the `npm-publish` environment's reviewer gate.
2. Verify from the consumer position: `npx agent-skills-toolkit@1.23.0` in a clean directory.
3. Confirm the agent-plugins re-pin watcher opens an issue, then review and merge the re-pin.
4. Tag before 2026-11-25. Both vendor probes were verified on 2026-10-25 and go stale on that date,
   which blocks every release until they are re-run.
