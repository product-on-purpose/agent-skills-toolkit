# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`CHANGELOG.md` is the full technical history. A curated, user-facing
`RELEASE-NOTES.md` is added at Gold (Standard sec 10.6); the two are distinct.

## [Unreleased]

## [0.2.0] - 2026-05-28

### Changed
- The toolkit now declares and satisfies Silver: `library.json` `tier: convergent` with a `components` index (closes S3). All Convergent checks (S1-S6) gate green; `tier-report` reports `convergent` with an empty burndown. Version bumped to 0.2.0.

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
- Standard revised to v0.8: Codex emission contract updated to Codex's native plugin + marketplace model (sec 3.2/3.3/3.9/10.1 + Appendix A, per 2026-05-27 spike against Codex CLI v0.133); sec 12 describes Codex's concrete native marketplace alongside Claude's.
- Five Convergent (Silver) conformance checks (S1-S5): agent-targets, prefix, components-index drift, chain-contract integrity (phantom + workflows-without-contract), workflow skill-existence. Composed via the existing registry; tagged with the `S` reqId prefix so tier-report buckets them into the convergent tier automatically.
- `scripts/lib/tier.mjs`: shared TIER_ORDER + tierForReq + ceilingIndex helpers used by tier-report and the gate runner.
- Gate runner (`check.mjs`) filters errorCount by the declared-tier ceiling: convergent errors on a Bronze plugin appear in the printed findings + `tier-report.blocked.convergent`, but do not fail CI. This is the milestone-validity model on the gate side.
- The repository's own `tier-report` now prints the Silver burndown - exactly the items 3B/3C must close to declare `tier: convergent`.
- Documentation: `docs/reference/silver-checks.md` (per-rule reference), `docs/how-to/climb-from-bronze-to-silver.md` (walkthrough), `conformance-and-tiers.md` extended with Silver subsection + visible-burndown, `askit-evaluate.md` notes multi-tier findings, AGENTS.md updated.
- library.json bumped to standard 0.8 with prefix askit- declared.
- Multi-agent emission spine (Phase 3B): `gen-manifest.mjs` now emits `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` from `library.json` via a `--target=resolved|claude|codex|all` flag; the Claude manifest is now generated rather than hand-authored.
- `library.json` declares `agent-targets: ["claude", "codex"]` (closes S1) and carries canonical `author`/`keywords` for both native manifests.
- S6 (per-target-presence) Convergent check: each declared `agent-targets` entry must have its native manifest on disk (conditional on `agent-targets`). U8 manifest-drift extended to cover the Codex manifest.
- `askit-build-skill` documents multi-agent emission (`library.json.agent-targets` + `gen-manifest.mjs --target=...`).
- Local Codex round-trip integration test (`tests/integration/codex-roundtrip.test.mjs`): installs the emitted manifest into a throwaway local marketplace against the real `codex` CLI and asserts the skill is ingested (not just listed); runs locally, skips in CI (set `CODEX_REQUIRED=1` to fail instead). Re-verified against Codex CLI v0.135.0.
- Docs: `docs/how-to/emit-for-multiple-agents.md`; `silver-checks.md` and `conformance-and-tiers.md` add S6; AGENTS.md and INDEX.md note generated native manifests.
- The repository's Silver burndown shrank from `[S1, S3]` to `[S3]` - only the components index remains before declaring `tier: convergent` (3C).

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

[Unreleased]: https://github.com/product-on-purpose/agent-skills-toolkit/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/product-on-purpose/agent-skills-toolkit/releases/tag/v0.2.0
[0.1.0]: https://github.com/product-on-purpose/agent-skills-toolkit/releases/tag/v0.1.0
