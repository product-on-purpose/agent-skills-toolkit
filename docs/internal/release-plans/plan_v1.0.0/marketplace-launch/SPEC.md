# v1.0.0 marketplace launch - spec

> The contract for the [v1.0.0 marketplace launch](./RELEASE-PLAN.md). Each requirement carries an ID, a testable acceptance criterion, and its source. The [`IMPL-PLAN.md`](./IMPL-PLAN.md) maps these to file edits.

## Conventions

- **MUST / SHOULD / MAY** per RFC 2119.
- Acceptance is **deterministic where possible**: a command + expected output, or a grep-able assertion.
- "The gate" = `node scripts/check.mjs`. "Green" = exit 0, 0 errors, 0 warnings.

## R-README - repositioning and legibility (WS A)

| ID | Requirement | Acceptance | Source |
|---|---|---|---|
| R-README-1 | The hero/intro MUST frame the repo as starting, growing, managing, and leveling up an advanced cross-agent plugin over its lifecycle, not only authoring skills. | The hero tagline and "What it is" name the lifecycle (start/grow/manage/level up) and cross-agent plugin; a reader sees "more than a skill builder" in the first screen. | Maintainer ask 1 |
| R-README-2 | The README MUST keep an explicit beginner on-ramp AND an advanced-maintainer path. | A "build your first skill"/"start a plugin" entry and an advanced lifecycle/leveling-up path are both present and findable. | Maintainer ask 1 |
| R-README-3 | The tier-model section MUST be scannable: what each tier certifies, requires, why, and who for, without dense inline-ID prose walls. | The section leads with a comparison table; per-tier detail is tight (cards/bullets), not multi-sentence paragraphs with inline `U1-U11` runs. | Maintainer ask 2 |
| R-README-4 | Every factual claim MUST match the catalog and the gate. | Component counts (23 skills, 7 subagents, 2 commands), check IDs (U1-U11, S1-S8, G1-G6; 25-check spine), and tier names match `library.json` + `scripts/`. | Standard sec 5; verification WS |
| R-README-5 | The README MUST keep the strict two-axis terminology (component < plugin < workspace; marketplace catalogs; skill library = a grade). | No structural use of "library" to mean the package; "skill library" used only as the grade. | README Terminology; DESIGN sec 1 |
| R-README-6 | No em-dashes or en-dashes anywhere in the README. | `node scripts/checks/no-dashes.mjs` clean / U10 green; manual grep for U+2014/U+2013 finds none. | House rule; check U10 |

## R-VER - version bump and release artifacts (WS B)

| ID | Requirement | Acceptance | Source |
|---|---|---|---|
| R-VER-1 | `library.json` `version` MUST be `1.0.0`. | `jq -r .version library.json` = `1.0.0`. | D1 |
| R-VER-2 | `library.json` `standard` MUST be `0.9`. | `jq -r .standard library.json` = `0.9`. | D4; STANDARD.md v0.9 |
| R-VER-3 | `package.json` `version` MUST equal `library.json` `version`. | U9 green; both read `1.0.0`. | check U9 |
| R-VER-4 | Both native manifests MUST be regenerated to `1.0.0` and MUST agree with `library.json` (name+version). | U8 green; `.claude-plugin` + `.codex-plugin` `version` = `1.0.0`; the Codex `skills` + `interface` pointers still present. | check U8; G4; Codex ingestion |
| R-VER-5 | `manifest.generated.json` and `INDEX.md` MUST be regenerated (no hand edits) and drift-free. | `index-drift` (G4) + `manifest-drift` (U8) green; regenerating again produces no diff. | checks U8/G4 |
| R-VER-6 | `CHANGELOG.md` MUST have a dated `[1.0.0]` section; `[Unreleased]` content promoted. | A `## [1.0.0] - 2026-06-02` heading exists; Keep-a-Changelog format preserved. | Standard sec 10; D1 |
| R-VER-7 | `RELEASE-NOTES.md` MUST read as the 1.0.0 user-facing notes, distinct from CHANGELOG. | G5 (`release-notes`) green; not byte-identical to CHANGELOG; "v1.0.0" framing replaces "Unreleased preview / tag pending". | check G5; Standard sec 10.6 |
| R-VER-8 | The gate MUST stay green and the tier claim non-vacuous after the bump. | `check.mjs` 0/0; `tier-report` = `advanced`, empty burndown; `npm test` all pass. | Standard sec 4; self-hosting G2 |

## R-CI - standardized CI (WS D)

| ID | Requirement | Acceptance | Source |
|---|---|---|---|
| R-CI-1 | A `release.yml` workflow MUST create a GitHub release on a `v*` tag push. | Workflow exists, triggers on `push: tags: ['v*']`, uses a pinned `@v*` release action, body from `RELEASE-NOTES.md`. | D3; pm-skills reference |
| R-CI-2 | `release.yml` MUST guard tag/version consistency before publishing. | A step fails the job when `${tag#v}` differs from `package.json`, `library.json`, `.claude-plugin/plugin.json`, or `.codex-plugin/plugin.json` version. | D3 |
| R-CI-3 | The new workflow MUST hold no validation logic of its own beyond the guard, and MUST not weaken existing CI. | `ci.yml` validate + build-site jobs and `deploy-pages.yml` unchanged; `release.yml` only orchestrates. | Standard sec 4.1/4.4 |
| R-CI-4 | The workflow MUST resolve Node from `.nvmrc` (single CI source of truth) and pin actions to `@v5` where applicable. | `setup-node` uses `node-version-file: .nvmrc`; checkout/setup-node at `@v5`. | clause 14.6; ci.yml precedent |

## R-DOCS - install documentation (WS C)

| ID | Requirement | Acceptance | Source |
|---|---|---|---|
| R-DOCS-1 | The README Quick start MUST show the marketplace install (add by repo path, install by marketplace identity) and MUST drop "not yet installable". | `/plugin marketplace add product-on-purpose/agent-plugins` + `/plugin install agent-skills-toolkit@product-on-purpose` present; no "not yet installable" / "registration planned at v1.0.0" left. | D2; pm-skills README pattern |
| R-DOCS-2 | The site `getting-started.md` MUST gain an Install section with the same commands. | The page shows the add + install commands; build green. | D2 |
| R-DOCS-3 | The site landing (`index.mdx`) SHOULD surface install as a primary action or card. | An install affordance is present on the splash. | D2 |
| R-DOCS-4 | The Status surfaces (README Status, STATUS.md) MUST state the toolkit is installable at v1.0.0. | Both say installable; STATUS "Installable: not yet" removed. | D1/D2 |
| R-DOCS-5 | Install docs MUST distinguish "add the marketplace by path" from "install the plugin by `@product-on-purpose` identity". | The two-step distinction is stated (mirrors the marketplace README's "path is the address, identity is the brand"). | agent-plugins README |

## R-MKT - marketplace registration (WS E, agent-plugins repo)

| ID | Requirement | Acceptance | Source |
|---|---|---|---|
| R-MKT-1 | A `plugins[]` entry for `agent-skills-toolkit` MUST be added, pinned to the `v1.0.0` tag commit via the https `url` source form. | Entry present; `source.source` = `url`; `source.url` ends `.git`; `source.sha` is the 40-char `v1.0.0` commit. | registry-maintenance.md |
| R-MKT-2 | The entry MUST pass every enforcing `validate-registry` check, including check 5 (sha is a release-tag target) and check 7 (pinned plugin.json has name/version/description/license). | `node scripts/validate-registry.mjs` exits 0 (with `GITHUB_TOKEN`). | validate-registry.mjs |
| R-MKT-3 | The entry `version` MUST equal the plugin's released version (`1.0.0`) and `strict` MUST be `true`. | Fields match; check 6 (no placeholder, strict requires pinned sha) passes. | CONTRIBUTING.md |
| R-MKT-4 | The registry `metadata.version` MUST be bumped (plugin added). | `metadata.version` 1.2.0 -> 1.3.0. | registry versioning |
| R-MKT-5 | The `agent-plugins` README plugins table and CHANGELOG MUST list the new plugin. | README row added (status `listed`); CHANGELOG entry added. | agent-plugins README/CHANGELOG |
| R-MKT-6 | The one-way rule MUST hold: the toolkit repo does not reference the marketplace. | The toolkit ships no marketplace pointer back; association lives only in `agent-plugins/marketplace.json`. | CONTRIBUTING.md |

## R-SEQ - sequencing (cross-cutting)

| ID | Requirement | Acceptance | Source |
|---|---|---|---|
| R-SEQ-1 | Registration MUST NOT precede the `v1.0.0` tag + GitHub release. | The `agent-plugins` PR is opened only after `git tag v1.0.0` is pushed and the release exists. | RELEASE-PLAN sec 4 |
| R-SEQ-2 | Defects after tagging MUST be fixed forward (no force-moved tags). | If a fix is needed post-tag, it ships as `v1.0.1`; `v1.0.0` is immutable. | SemVer; registry pinning |
