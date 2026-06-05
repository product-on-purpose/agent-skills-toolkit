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

This repository declares `tier: advanced` (Gold) and **self-validates against its
own Standard in CI** - the deterministic validation spine lives in `scripts/`. The
full gate (Bronze U1-U9, U11-U12, Silver S1-S8, Gold G1-G10) is green and `tier-report`
reports `tier: advanced` with an empty burndown, so the toolkit is a self-proving
example of the Standard. See
[`docs/internal/BOOTSTRAP.md`](docs/internal/BOOTSTRAP.md) for historical context:
the one-time Bronze bootstrap that ended once the spine existed.

Components present on disk:
- **Skills:** `askit-evaluate` (assess a skill or plugin against the Standard) plus
  the `askit-build-*` builder family - one builder per component type (skill,
  subagent, command, mcp, hook, chain-contract, agents-md, output-style, and more as
  the catalog fills), each with `create`/`improve` modes following
  `docs/reference/builder-pattern.md`. Core loop: `askit-build-skill` (create) ->
  `askit-evaluate` -> `askit-build-skill` (improve). The exact current component
  list lives in `library.json` and [`INDEX.md`](INDEX.md) (this section stays terse
  on purpose - brevity is a feature).
- **Subagents:** `askit-skill-author` (the bounded authoring delegate behind
  `askit-build-skill`) and `askit-evaluator` (the read-only assessment delegate behind
  `askit-evaluate`). Both are Claude-only (`agent-targets: [claude]`; Standard
  sec 3.3) and carry the `askit-` prefix like every other component (sec 8.2). The
  chain contract `agents/_chain-permitted.yaml` permits:
  `askit-build-skill` -> `askit-skill-author`, `askit-evaluate` -> `askit-evaluator`, and
  `askit-skill-author` -> `askit-evaluator`.
- **Commands:** `/askit-evaluate` (maps-to: `askit-evaluate`) and
  `/askit-build-skill` (maps-to: `askit-build-skill`). Commands are Claude-native;
  on Codex the backing skill is the invocable form (Standard sec 3.2).
- **Scripts:** the Node validation spine in `scripts/` - conformance checks,
  generators (`gen-index`, `gen-manifest`, `sync-agents-md`), `tier-report.mjs`,
  the aggregate gate `check.mjs`, and `evaluate.mjs`.
- **Silver checks (Convergent, reqId S1-S8)** and **Gold checks (Advanced, reqId G1-G10)** gate the declared `tier: advanced`
  alongside the Universal ones. S3 now validates `components.skills`,
  `components.subagents`, and `components.commands` against disk. S4 orphan
  detection is complete: a frontmatter `chain:` invocation not permitted by
  `agents/_chain-permitted.yaml` is an orphan error; a contract entry naming a
  missing component is a phantom error. S6 checks per-target manifest presence at
  the plugin level. S7 (`command-contract`) checks that every command declares a
  non-empty `description` and a `maps-to` resolving to exactly one on-disk skill or
  workflow (conditional on commands existing).
- **Hooks, workflows:** none yet (later phases).

Do not claim or invoke components that are not present on disk.

## Conventions

- **Runtime:** Node, baseline `>=22.12.0` (the family floor; Node 24 Active LTS pinned via `.nvmrc`). Validators and generators are plain,
  portable Node scripts (Standard sec 4.1); CI only shells out to them.
- **Skills:** agentskills.io `SKILL.md` format, portable across Claude Code and
  Codex unchanged (Standard sec 3.1).
- **Manifests:** [`library.json`](library.json) is the authored, canonical
  cross-agent manifest. The native manifests (`.claude-plugin/plugin.json` and
  `.codex-plugin/plugin.json`) are GENERATED from it via
  `node scripts/generators/gen-manifest.mjs . --write --target=all`; do not hand-edit
  them. S6 checks per-target presence; U8 warns on name/version drift.
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
- [`docs/reference/builder-pattern.md`](docs/reference/builder-pattern.md) - the shared builder-skill contract (all `askit-build-<type>` skills follow this shape).
- [`docs/how-to/build-a-command.md`](docs/how-to/build-a-command.md) - how to author a slash command and reach 0 S3/S7 errors.
- [`docs/reference/askit-build-command.md`](docs/reference/askit-build-command.md) - reference for the `askit-build-command` skill.
