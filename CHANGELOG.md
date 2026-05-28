# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`CHANGELOG.md` is the full technical history. A curated, user-facing
`RELEASE-NOTES.md` is added at Gold (Standard sec 10.6); the two are distinct.

## [Unreleased]

### Added
- Validation spine (Node, zero test-framework deps): `loadPlugin` context, `Finding` model, and a `yaml`-backed frontmatter parser.
- Eight Universal (Bronze) conformance checks (U1-U8): library.json schema, AGENTS.md presence, skill frontmatter validity, name-equals-directory, description scoring (0.7 warn), reference-link resolution, instruction-budget warning, and native-manifest drift. Composed behind a `checkAgentskills` seam (reimplemented per decision Q1.1).
- `tier-report` (machine JSON + human line; satisfied tier capped at the declared tier, blocked list keyed to requirement IDs) and an aggregate gate runner (`scripts/check.mjs`) that fails on error and surfaces warnings.
- Generators: `gen-manifest`, `gen-index`, and `sync-agents-md` (render functions; AGENTS.md write-back deferred to Silver).
- CI wired to run unit tests and the conformance gate via scripts only (local/CI parity).
- The repository now self-validates: it declares `tier: universal` and passes its own Bronze checks (`tests/unit/seed-bronze.test.mjs`), retiring risk R1.
- `scripts/evaluate.mjs`: conformance-core assessment report (plugin and component scope) composed over the checks; scope auto-detection; CLI + `--json`; npm `evaluate` script.
- `askit-evaluate` skill: natural-language front door that runs the assessment and presents per-rule findings, tier, and remediation.
- `askit-build-skill` skill: `create` and `improve` modes that author conformant skills and consume the evaluate report to fix findings (Claude target; subagent delegation and multi-agent emission deferred to Phase 3).
- `templates/SKILL.md` skeleton; `manifest.generated.json`; refreshed `INDEX.md` + `AGENTS.md` for the proof-loop skills.
- Widened the U5 description heuristic to recognize evaluate/assess/audit/check/report as action verbs (surfaced by dogfooding the toolkit's own evaluate skill).
- Dual documentation: per-skill `SKILL.md` + `README.md` + `references/`, and Diataxis `docs/how-to` + `docs/reference` + `docs/explanation` for the build/evaluate loop.
- The toolkit now contains and self-validates its own skills at Bronze - the `build-skill` -> `evaluate` -> `improve` proof loop works end to end (verified by a recorded manual dogfood).

## [0.1.0] - 2026-05-26

Phase 0 - repository bootstrap. The hand-authored Universal (Bronze) seed and the
promoted Standard. Not installable; not self-validating yet (see
`docs/internal/BOOTSTRAP.md` for the bounded exemption).

### Added
- `STANDARD.md` - the Advanced Skill Library Standard (v0.7), promoted to the
  repository root.
- `library.json` - authored canonical cross-agent manifest (`tier: universal`).
- `.claude-plugin/plugin.json` - Claude Code native manifest (hand-authored seed).
- `AGENTS.md` - agent navigation entrypoint (Standard sec 3.10).
- `INDEX.md` - human map of the repository.
- `README.md` - overview, positioning, and quickstart pointer.
- `docs/internal/DESIGN.md` - consolidated design and decision record (D1-D19).
- `docs/internal/BOOTSTRAP.md` - the self-hosting bootstrap exemption.
- `docs/internal/{decisions,rfcs,backlog}/` - governance directories.
- `.github/workflows/ci.yml` - CI stub that will shell out only to scripts.
- `skills/`, `scripts/`, `templates/` - placeholders for later phases.

[Unreleased]: https://github.com/product-on-purpose/agent-skills-toolkit/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/product-on-purpose/agent-skills-toolkit/releases/tag/v0.1.0
