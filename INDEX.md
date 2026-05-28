# INDEX - agent-skills-toolkit

Human map of this repository. The agent-facing counterpart is
[`AGENTS.md`](AGENTS.md). At Gold this file is generated (`gen-index`) and
drift-checked against on-disk components; at the current Bronze tier it is
hand-authored.

## Repository state

**Universal (Bronze), self-validating.** The validation spine (`scripts/`) and the
`askit-build-skill` -> `askit-evaluate` -> improve proof loop are in place; the
toolkit passes its own Bronze checks in CI. See
[`docs/internal/BOOTSTRAP.md`](docs/internal/BOOTSTRAP.md) for the one-time
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
| [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json) | Claude Code native manifest (hand-authored in the seed; generated at Gold). |

## Components

- **Skills:**
  - [`askit-build-skill`](skills/askit-build-skill/) - author and improve skills to the Standard (create + improve modes).
  - [`askit-evaluate`](skills/askit-evaluate/) - assess a skill or plugin against the Standard (per-rule findings + tier + remediation).
  - Core loop: `askit-build-skill` (create) -> `askit-evaluate` -> `askit-build-skill` (improve).
- **Scripts:** the Node validation spine in [`scripts/`](scripts/) - conformance checks, generators, `tier-report.mjs`, the aggregate gate `check.mjs`, and `evaluate.mjs`.
- **Subagents / commands / hooks / workflows:** none yet (Silver/Gold components, later phases).

## Governance

| Directory | Role |
|---|---|
| [`docs/internal/decisions/`](docs/internal/decisions/) | ADRs (MADR). D1-D19 graduate here at Phase 4. |
| [`docs/internal/rfcs/`](docs/internal/rfcs/) | Cross-cutting proposals. |
| [`docs/internal/backlog/`](docs/internal/backlog/) | New-component and enhancement backlogs (local-first). |
| [`templates/`](templates/) | Global templates consumed by scaffolders. Contains the `SKILL.md` skeleton. |
