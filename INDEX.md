# INDEX - agent-skills-toolkit

Human map of this repository. The agent-facing counterpart is
[`AGENTS.md`](AGENTS.md). At Gold this file is generated (`gen-index`) and
drift-checked against on-disk components; in this Phase 0 seed it is hand-authored.

## Repository state

**Phase 0 - hand-authored Universal (Bronze) seed.** The minimal conformant
skeleton, human-reviewed without tooling. See
[`docs/internal/BOOTSTRAP.md`](docs/internal/BOOTSTRAP.md).

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
| [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json) | Claude Code native manifest (hand-authored in the seed; generated at Gold). |

## Components

- **Skills:** none yet. `skills/` is an empty placeholder; skills arrive from Phase 2.
- **Scripts:** none yet. `scripts/` is an empty placeholder; the Node validation spine arrives in Phase 1.
- **Subagents / commands / hooks / workflows:** none (Silver/Gold components, later phases).

## Governance

| Directory | Role |
|---|---|
| [`docs/internal/decisions/`](docs/internal/decisions/) | ADRs (MADR). D1-D19 graduate here at Phase 4. |
| [`docs/internal/rfcs/`](docs/internal/rfcs/) | Cross-cutting proposals. |
| [`docs/internal/backlog/`](docs/internal/backlog/) | New-component and enhancement backlogs (local-first). |
| [`templates/`](templates/) | Global templates consumed by scaffolders (populated from Phase 2). |
