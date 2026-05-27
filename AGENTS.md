# AGENTS.md - agent-skills-toolkit

Project-level instructions and navigation for any agent (Claude Code, Codex, or
other agentskills.io-compatible agents) working in this repository. This is the
agent-facing counterpart to the human-facing [`INDEX.md`](INDEX.md).

## What this project is

`agent-skills-toolkit` is a self-hosting plugin and a versioned Standard for
authoring, validating, governing, and scaling cross-agent skill libraries. The
normative rules live in [`STANDARD.md`](STANDARD.md) (the Advanced Skill Library
Standard). The toolkit is built to its own Standard and, at v1, validates itself
against that Standard in CI.

The single source of truth for the rules is `STANDARD.md`. The consolidated
design and decision record is [`docs/internal/DESIGN.md`](docs/internal/DESIGN.md).

## Current state (read before assuming capabilities)

This repository is at **Phase 0** (repo bootstrap). It is a hand-authored
Universal (Bronze) seed: a minimal, conformant skeleton, human-reviewed without
tooling because the tooling does not exist yet. See
[`docs/internal/BOOTSTRAP.md`](docs/internal/BOOTSTRAP.md) for the bootstrap
exemption and exactly when self-validation begins (Phase 1).

Consequently, at this moment:
- There are **no skills** yet (`skills/` is an empty placeholder).
- There are **no validation scripts** yet (`scripts/` is an empty placeholder); the
  Node validation spine arrives in Phase 1.
- There are **no subagents, commands, hooks, or workflows** (those are Silver/Gold
  components, later phases).

Do not claim or invoke components that are not present on disk.

## Conventions

- **Runtime:** Node, baseline `>=20` (LTS). Validators and generators are plain,
  portable Node scripts (Standard sec 4.1); CI only shells out to them.
- **Skills:** agentskills.io `SKILL.md` format, portable across Claude Code and
  Codex unchanged (Standard sec 3.1).
- **Manifests:** [`library.json`](library.json) is the authored, canonical
  cross-agent manifest. Native manifests (`.claude-plugin/plugin.json`, and the
  Codex `plugin.json` later) are generated from it at Gold; in this seed they are
  hand-authored under the bootstrap exemption and MUST be kept consistent by hand.
- **Terminology (two axes, strict):** *structure* - component (unit of reuse) <
  plugin (unit of release, holds the one version) < workspace; a marketplace
  catalogs plugins. *Quality* - "skill library" is the grade a plugin earns by
  conforming to the Standard (Bronze/Silver/Gold), not a separate artifact.
- **Working scratch:** design drafts and session logs live in the gitignored
  `_local/` area and must never leak into the committed entry surface.

## Build / test / lint

No build or test commands exist yet (Phase 0). From Phase 1, the conformance
checks, generators, and the aggregate gate will all run as Node scripts under
`scripts/`, reproducible locally and in CI with identical results (Standard
sec 4.4). This section will be updated when those scripts land.

## Where to look

- [`STANDARD.md`](STANDARD.md) - the normative Standard (what conformance means).
- [`INDEX.md`](INDEX.md) - human map of the repository.
- [`README.md`](README.md) - overview and pitch.
- [`docs/internal/DESIGN.md`](docs/internal/DESIGN.md) - design and decision record.
- [`docs/internal/BOOTSTRAP.md`](docs/internal/BOOTSTRAP.md) - the bootstrap exemption.
- [`CHANGELOG.md`](CHANGELOG.md) - release history.
