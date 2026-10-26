---
title: "tests/unit/spine-firing - folder guide"
---

# tests/unit/spine-firing

RS-B2 (mutation-proof the check spine, `docs/internal/roadmap.md` "## RS-B2"): a registry-driven
meta-test that proves every check in `scripts/lib/registry.mjs` (`CHECKS`, `REQ_IDS`) has at least one
test that makes it actually fire, rather than relying on each check's own unit test file to have
happened to cover that.

`spine-firing.test.mjs` is the runner. It asserts the union of the three band maps' reqIds equals
`REQ_IDS` exactly (no missing, no unknown, no duplicate), then replays each mapped case against only
that reqId's check, with ctx built the same way `scripts/check.mjs` builds it
(`loadPlugin(root)` via `scripts/lib/load-plugin.mjs`), and asserts a finding with the expected reqId
and severity. Run one band alone with
`node --test --test-name-pattern=convergent tests/unit/spine-firing/spine-firing.test.mjs`.

`universal.map.mjs`, `convergent.map.mjs`, and `advanced.map.mjs` are the three data maps (U*, S*, G*
respectively) a band agent fills in with `{reqId, fixture, expect}` cases - the case shape is documented
as the `FiringCase` JSDoc typedef at the top of `spine-firing.test.mjs`.

## Inventory table

Two separate counts, because they answer different questions:

- **Pre-existing firing-test gap: 0 of 35.** Every reqId already had at least one per-check unit test
  that makes its check fire somewhere in the suite, before this folder existed (the "pre-existing firing
  test(s)" column). Seven of those - U7, S3, S5, S6, G5, G6, G7 - are flagged `thin`: each rests on a
  single firing test (or, for G7, one test with several assertions), so a regression in that one test's
  fixture is the only thing standing between the check and silently becoming a no-op.
- **Cases added in this folder: 35 of 35, all firing green.** Three band agents filled
  `universal.map.mjs` (U\*), `convergent.map.mjs` (S\*) and `advanced.map.mjs` (G\*); the "case added
  here" column below names each case's fixture, reusing a committed `tests/fixtures/anti/` or
  `tests/fixtures/golden/` fixture wherever one already fires the check, and otherwise an inline ctx
  object or a fresh temp tree built in the case itself (no new fixture directory under
  `tests/fixtures/spine-firing/` was needed - every check fires from an existing fixture or a
  self-contained case). `node --test tests/unit/spine-firing/spine-firing.test.mjs` is 36 tests
  (the coverage test plus one per reqId), 0 failures.

**Thin-count reconciliation.** The measured inventory flags **6** single-test reqIds: U7, S5, S6, G5,
G6 and G7. That agrees with the 2026-09-04 audit finding recorded in `docs/internal/audit-intake.md`
("Moving `U5`'s threshold from 0.7 to 0.1 fails no test; six checks hang on one test each"). The plan
that commissioned this folder also named `S3` as thin, but that name came from the plan's own brief,
not from a measurement. The inventory found many firing cases for `S3` across four component types, so
its row reads **no**. Every one of the six now has a second firing case in this folder.

35 is the reqId count read from `REQ_IDS` in `scripts/lib/registry.mjs` as of 2026-10-25; this table
does not pin that number as a constant anywhere else, so a check added or removed later changes what the
coverage test in `spine-firing.test.mjs` requires without this README going stale on the count.

| reqId | check file | pre-existing firing test(s) | case added here | thin |
|---|---|---|---|---|
| U1 | `scripts/checks/library-json.mjs` | `tests/unit/library-json.test.mjs` | inline ctx: library.json missing required field `tier` | no |
| U2 | `scripts/checks/anatomy.mjs` | `tests/unit/anatomy.test.mjs` | inline ctx: no `AGENTS.md` at the repository root | no |
| U3 | `scripts/checks/frontmatter-valid.mjs` | `tests/unit/frontmatter-valid.test.mjs` | inline ctx: skill frontmatter missing required string `description` | no |
| U4 | `scripts/checks/name-matches-dir.mjs` | `tests/unit/name-matches-dir.test.mjs` | `tests/fixtures/anti/name-mismatch` | no |
| U5 | `scripts/checks/description-score.mjs` | `tests/unit/description-score.test.mjs`, `tests/unit/u5-calibration.test.mjs` | inline ctx: description scoring 0.65 (boundary-sensitive: above `READABLE_FLOOR` 0.1, below `THRESHOLD` 0.7) | no (boundary-sensitive: keep a case just below `THRESHOLD` 0.7) |
| U6 | `scripts/checks/reference-links.mjs` | `tests/unit/reference-links.test.mjs` | inline ctx: dangling relative link under a fresh, never-created temp path | no |
| U7 | `scripts/checks/instruction-budget.mjs` | `tests/unit/instruction-budget.test.mjs` | inline ctx: 600-line SKILL.md body (> the 500-line budget) | **yes** - one firing test |
| U8 | `scripts/checks/manifest-drift.mjs` | `tests/unit/manifest-drift.test.mjs` | inline ctx: `claudeManifest` version drift vs `library.json` | no |
| U9 | `scripts/checks/version-match.mjs` | `tests/unit/version-match.test.mjs` | `tests/fixtures/anti/version-mismatch` | no |
| U11 | `scripts/checks/mcp-valid.mjs` | `tests/unit/mcp-valid.test.mjs` | inline ctx: `.mcp.json` server declaring neither `command` nor `url` | no |
| U12 | `scripts/checks/mermaid-valid.mjs` | `tests/unit/mermaid-valid.test.mjs` | temp tree: a `.md` file with an unrecognized mermaid diagram keyword | no |
| U13 | `scripts/checks/skill-registration.mjs` | `tests/unit/skill-registration.test.mjs`, `tests/unit/catalogue-manifest-shape.test.mjs` | inline ctx: on-disk skill `orphan` absent from `library.json`'s `components.skills[]` | no |
| U14 | `scripts/checks/agent-restricted-fields.mjs` | `tests/unit/agent-restricted-fields.test.mjs` | inline ctx: plugin-shipped agent frontmatter declaring `hooks` | no |
| U15 | `scripts/checks/agents-dir-registerable.mjs` | `tests/unit/agents-dir-registerable.test.mjs` | inline ctx: an `agents/` doc with no matching subagent registration | no |
| U16 | `scripts/checks/metadata-placement.mjs` | `tests/unit/metadata-placement.test.mjs` | inline ctx: `version` declared at the top level of skill frontmatter instead of under `metadata` | no |
| U17 | `scripts/checks/catalogue-manifest-shape.mjs` | `tests/unit/catalogue-manifest-shape.test.mjs` | temp tree: `.claude-plugin/marketplace.json` with no `plugins` array | no |
| U18 | `scripts/checks/command-size-cap.mjs` | `tests/unit/command-size-cap.test.mjs` | inline ctx: codex agent-target, a `commands/*.md` file over the 4000-byte cap | no |
| S1 | `scripts/checks/agent-targets.mjs` | `tests/unit/agent-targets.test.mjs` | `tests/fixtures/anti/no-agent-targets` | no |
| S2 | `scripts/checks/prefix.mjs` | `tests/unit/prefix.test.mjs` | `tests/fixtures/anti/no-prefix` | no |
| S3 | `scripts/checks/components-index.mjs` | `tests/unit/components-index.test.mjs` | `tests/fixtures/anti/components-drift` | no (the plan named it thin, but the measured inventory found many firing cases across the four component types; see the reconciliation note above) |
| S4 | `scripts/checks/chain-contract.mjs` | `tests/unit/chain-contract.test.mjs`, `tests/unit/chain-contract-migration-cap.test.mjs` | `tests/fixtures/anti/chain-phantom` | no |
| S5 | `scripts/checks/workflow-skills.mjs` | `tests/unit/workflow-skills.test.mjs` | `tests/fixtures/anti/workflow-missing-skill` | yes - one firing test |
| S6 | `scripts/checks/per-target-presence.mjs` | `tests/unit/per-target-presence.test.mjs` | `tests/fixtures/anti/missing-codex-manifest` | **yes** - hangs on one test per the audit |
| S7 | `scripts/checks/command-contract.mjs` | `tests/unit/command-contract.test.mjs` | `tests/fixtures/anti/command-no-mapsto` | no |
| S8 | `scripts/checks/components-mirror.mjs` | `tests/unit/components-mirror.test.mjs` | `tests/fixtures/anti/status-disagree` | no |
| G1 | `scripts/checks/hook-documentation.mjs` | `tests/unit/hook-documentation.test.mjs` | `tests/fixtures/anti/hook-undocumented` | no |
| G2 | `scripts/checks/self-hosting.mjs` | `tests/unit/self-hosting.test.mjs` | `tests/fixtures/anti/ci-comment-only` | no |
| G3 | `scripts/checks/library-regression.mjs` | `tests/unit/library-regression.test.mjs` | `tests/fixtures/anti/regression-missing-eval` | no |
| G4 | `scripts/checks/index-drift.mjs` | `tests/unit/index-drift.test.mjs` | `tests/fixtures/anti/index-stale` | no |
| G5 | `scripts/checks/release-notes.mjs` | `tests/unit/release-notes.test.mjs` | `tests/fixtures/golden/minimal-skill` | yes - one firing test |
| G6 | `scripts/checks/deprecation.mjs` | `tests/unit/deprecation.test.mjs` | `tests/fixtures/anti/deprecated-incomplete` | yes - one firing test |
| G7 | `scripts/checks/docs-frontmatter.mjs` | `tests/unit/docs-frontmatter.test.mjs` | `tests/fixtures/anti/docs-frontmatter-bad` | yes - one test, four assertions |
| G8 | `scripts/checks/folder-readme.mjs` | `tests/unit/folder-readme.test.mjs` | `tests/fixtures/anti/folder-readme-missing-child` | no |
| G9 | `scripts/checks/source-doc.mjs` | `tests/unit/source-doc.test.mjs` | `tests/fixtures/anti/source-doc-missing-why` | no |
| G10 | `scripts/checks/docs-presence.mjs` | `tests/unit/docs-presence.test.mjs` | `tests/fixtures/anti/docs-presence-empty-tutorials` | no |

35 reqIds total as read from `REQ_IDS`: pre-existing firing coverage gap 0 of 35, with 6 thin
(single-test) reqIds, matching the 2026-09-04 audit's count. Cases added in this folder: 35 of 35, all
firing green.
