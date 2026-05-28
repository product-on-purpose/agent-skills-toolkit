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

This repository declares `tier: universal` (Bronze) and **self-validates against
its own Standard in CI** - the deterministic validation spine lives in `scripts/`.
See [`docs/internal/BOOTSTRAP.md`](docs/internal/BOOTSTRAP.md) for the one-time
bootstrap exemption (it ended once the spine existed).

Components present on disk:
- **Skills:** `askit-build-skill` (author and improve skills) and `askit-evaluate`
  (assess a skill or plugin against the Standard). Core loop: `askit-build-skill`
  (create) -> `askit-evaluate` -> `askit-build-skill` (improve).
- **Scripts:** the Node validation spine in `scripts/` - conformance checks,
  generators (`gen-index`, `gen-manifest`, `sync-agents-md`), `tier-report.mjs`,
  the aggregate gate `check.mjs`, and `evaluate.mjs`.
- **Subagents, commands, hooks, workflows:** none yet (Silver/Gold components, and
  the authoring/scanning subagents arrive in a later phase).

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

- `npm test` - run the unit suite (`node:test`, zero test-framework deps).
- `node scripts/check.mjs` - the aggregate conformance gate over the repo (fails on
  any `error`, surfaces `warn`). This is what CI runs.
- `node scripts/evaluate.mjs <path>` - assess a single skill directory or a whole
  plugin and print per-rule findings + tier + remediation (`--json` for the report
  object).

All checks run as portable Node scripts, reproducible locally and in CI with
identical results (Standard sec 4.4). CI only shells out to these scripts.

## Where to look

- [`STANDARD.md`](STANDARD.md) - the normative Standard (what conformance means).
- [`INDEX.md`](INDEX.md) - human map of the repository.
- [`README.md`](README.md) - overview and pitch.
- [`docs/internal/DESIGN.md`](docs/internal/DESIGN.md) - design and decision record.
- [`docs/internal/BOOTSTRAP.md`](docs/internal/BOOTSTRAP.md) - the bootstrap exemption.
- [`CHANGELOG.md`](CHANGELOG.md) - release history.
