# INDEX - entry-lie

> Generated from `library.json` + component frontmatter by `gen-index` and
> drift-checked (G4). Edit the source, not this file. Overview and positioning are
> in [`README.md`](README.md); agent guidance is in [`AGENTS.md`](AGENTS.md).

**Tier:** Silver (convergent). Standard 0.15. Version 1.0.0. Self-validating: `npx agent-skills-toolkit .`.

## Components

### Skills (3)

- [`el-skill-one`](skills/el-skill-one/) - Creates output for things. Use when the user asks for things.
- [`el-skill-three`](skills/el-skill-three/) - Creates output for things. Use when the user asks for things.
- [`el-skill-two`](skills/el-skill-two/) - Creates output for things. Use when the user asks for things.

### Subagents (1, Claude-only)

- [`el-agent-one`](agents/el-agent-one.md) - Inspects output for things. Use when delegating inspection of things.

### Commands (1)

- [`/el-run`](commands/el-run.md) - Run the skill.

## Manifests

- [`library.json`](library.json) - authored canonical cross-agent manifest (the source of truth).
- [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json) - Claude Code native manifest (generated; do not hand-edit).
- [`.codex-plugin/plugin.json`](.codex-plugin/plugin.json) - Codex native manifest (generated; do not hand-edit).
- [`manifest.generated.json`](manifest.generated.json) - agent index (generated).

## Documentation and governance

- [`CHANGELOG.md`](CHANGELOG.md) - full technical history; [`RELEASE-NOTES.md`](RELEASE-NOTES.md) - curated, user-facing notes.
- [`docs/`](docs/) - Diataxis docs (reference, how-to, explanation).
- [`agents/_chain-permitted.yaml`](agents/_chain-permitted.yaml) - the chain contract.
