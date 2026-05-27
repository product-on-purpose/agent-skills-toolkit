# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`CHANGELOG.md` is the full technical history. A curated, user-facing
`RELEASE-NOTES.md` is added at Gold (Standard sec 10.6); the two are distinct.

## [Unreleased]

### Added
- Nothing yet. The Phase 1 validation spine (Node checks, generators, the
  aggregate gate, and CI wiring) is next.

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
