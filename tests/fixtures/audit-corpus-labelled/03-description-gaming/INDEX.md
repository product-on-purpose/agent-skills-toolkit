# INDEX - description-gaming

> Generated from `library.json` + component frontmatter by `gen-index` and
> drift-checked (G4). Edit the source, not this file. Overview and positioning are
> in [`README.md`](README.md); agent guidance is in [`AGENTS.md`](AGENTS.md).

**Tier:** Bronze (universal). Standard 0.15. Version 1.0.0. Self-validating: `npx agent-skills-toolkit .`.

## Components

### Skills (5)

- [`dg-alpha`](skills/dg-alpha/) - Creates output for things. Use when the user asks for things.
- [`dg-beta`](skills/dg-beta/) - Generates generates generates generates generates generates. Use when the user wants stuff.
- [`dg-delta`](skills/dg-delta/) - Expert knowledge of the Kubernetes networking model, CNI plugins, and service meshes. Apply this skill whenever a user mentions kubectl, pods, ingress, or cluster connectivity problems.
- [`dg-epsilon`](skills/dg-epsilon/) - Guidance for migrating a Postgres schema without downtime, covering expand-and-contract, backfills, and lock avoidance. Trigger on schema migration, ALTER TABLE, zero-downtime deploy, or a user pasting a migration file.
- [`dg-gamma`](skills/dg-gamma/) - Builds. Use when the user needs. Builds builds builds builds builds builds builds.

### Subagents (0, Claude-only)

- none

### Commands (0)

- none

## Manifests

- [`library.json`](library.json) - authored canonical cross-agent manifest (the source of truth).
- [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json) - Claude Code native manifest (generated; do not hand-edit).
- [`.codex-plugin/plugin.json`](.codex-plugin/plugin.json) - Codex native manifest (generated; do not hand-edit).
- [`manifest.generated.json`](manifest.generated.json) - agent index (generated).
