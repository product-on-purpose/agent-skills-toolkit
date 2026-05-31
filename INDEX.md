# INDEX - agent-skills-toolkit

Human map of this repository. The agent-facing counterpart is
[`AGENTS.md`](AGENTS.md). At Gold this file is generated (`gen-index`) and
drift-checked against on-disk components; at the current Silver tier it is
hand-authored.

## Repository state

**Convergent (Silver), self-validating.** The validation spine (`scripts/`) and the
`askit-build-skill` -> `askit-evaluate` -> improve proof loop are in place; the
toolkit declares `tier: convergent` and passes all Silver checks (S1-S7) in CI -
`tier-report` reports `convergent` with an empty burndown. See
[`docs/internal/BOOTSTRAP.md`](docs/internal/BOOTSTRAP.md) for the one-time Bronze
bootstrap exemption (now ended).

## Foundation documents

| Document | Role |
|---|---|
| [`STANDARD.md`](STANDARD.md) | The Advanced Skill Library Standard (normative). |
| [`README.md`](README.md) | Overview, positioning, quickstart pointer. |
| [`docs/internal/DESIGN.md`](docs/internal/DESIGN.md) | Consolidated design + decision record (D1-D19). |
| [`docs/internal/BOOTSTRAP.md`](docs/internal/BOOTSTRAP.md) | The self-hosting bootstrap exemption (Phases 0-1). |
| [`CHANGELOG.md`](CHANGELOG.md) | Release history. |

## Manifests

| File | Role |
|---|---|
| [`library.json`](library.json) | Authored canonical cross-agent manifest (source of truth). |
| [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json) | Claude Code native manifest - generated from `library.json` via `gen-manifest.mjs --target=claude`. Do not hand-edit. |
| [`.codex-plugin/plugin.json`](.codex-plugin/plugin.json) | Codex native manifest - generated from `library.json` via `gen-manifest.mjs --target=codex`. Do not hand-edit. |

## Components

- **Skills:**
  - [`askit-build-skill`](skills/askit-build-skill/) - author and improve skills to the Standard (create + improve modes).
  - [`askit-evaluate`](skills/askit-evaluate/) - assess a skill or plugin against the Standard (per-rule findings + tier + remediation).
  - [`askit-build-subagent`](skills/askit-build-subagent/) - author and improve Claude subagents (create + improve modes).
  - [`askit-build-command`](skills/askit-build-command/) - author and improve Claude slash commands (create + improve modes).
  - Core loop: `askit-build-skill` (create) -> `askit-evaluate` -> `askit-build-skill` (improve).
- **Subagents (Claude-only):**
  - [`askit-skill-author`](agents/askit-skill-author.md) - bounded authoring delegate behind `askit-build-skill`; carries `Read`/`Write`/`Edit`/`Bash`.
  - [`askit-evaluator`](agents/askit-evaluator.md) - read-only assessment delegate behind `askit-evaluate`; carries `Read`/`Bash` only.
  - Chain contract: [`agents/_chain-permitted.yaml`](agents/_chain-permitted.yaml) - permits `askit-build-skill` -> `askit-skill-author`, `askit-evaluate` -> `askit-evaluator`, and `askit-skill-author` -> `askit-evaluator`.
- **Commands (Claude-native):**
  - [`/askit-evaluate`](commands/askit-evaluate.md) - maps to `askit-evaluate`; assess a skill or plugin.
  - [`/askit-build-skill`](commands/askit-build-skill.md) - maps to `askit-build-skill`; create or improve a skill.
  - On Codex the backing skill is the invocable form (Standard sec 3.2); no Codex command artifact.
- **Scripts:** the Node validation spine in [`scripts/`](scripts/) - conformance checks, generators, `tier-report.mjs`, the aggregate gate `check.mjs`, and `evaluate.mjs`.
- **Hooks / workflows:** none yet (later phases).

## Governance

| Directory | Role |
|---|---|
| [`docs/internal/decisions/`](docs/internal/decisions/) | ADRs (MADR). D1-D19 graduate here at Phase 4. |
| [`docs/internal/rfcs/`](docs/internal/rfcs/) | Cross-cutting proposals. |
| [`docs/internal/backlog/`](docs/internal/backlog/) | New-component and enhancement backlogs (local-first). |
| [`templates/`](templates/) | Global templates consumed by scaffolders. Contains the `SKILL.md`, `agent.md`, and `command.md` skeletons. |
| [`docs/reference/builder-pattern.md`](docs/reference/builder-pattern.md) | The shared builder-skill contract (all `askit-build-<type>` skills follow this shape). |
| [`docs/how-to/build-a-command.md`](docs/how-to/build-a-command.md) | How to author a slash command and reach 0 S3/S7 errors. |
| [`docs/reference/askit-build-command.md`](docs/reference/askit-build-command.md) | Reference for the `askit-build-command` skill (create/improve, S7 error types). |
