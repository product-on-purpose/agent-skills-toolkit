# INDEX - no-history

> Generated from `library.json` + component frontmatter by `gen-index` and
> drift-checked (G4). Edit the source, not this file. Overview and positioning are
> in [`README.md`](README.md); agent guidance is in [`AGENTS.md`](AGENTS.md).

**Tier:** Silver (convergent). Standard 0.15. Version 1.0.0. Self-validating: `npx agent-skills-toolkit .`.

## Components

### Skills (3)

- [`nh-skill-one`](skills/nh-skill-one/) - Creates output for things. Use when the user asks for things.
- [`nh-skill-three`](skills/nh-skill-three/) - Creates output for things. Use when the user asks for things.
- [`nh-skill-two`](skills/nh-skill-two/) - Creates output for things. Use when the user asks for things.

### Subagents (1, Claude-only)

- [`nh-agent-one`](agents/nh-agent-one.md) - Inspects output for things. Use when delegating inspection of things.

### Commands (1)

- [`/nh-run`](commands/nh-run.md) - Run the skill.

## Manifests

- [`library.json`](library.json) - authored canonical cross-agent manifest (the source of truth).
- [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json) - Claude Code native manifest (generated; do not hand-edit).
- [`.codex-plugin/plugin.json`](.codex-plugin/plugin.json) - Codex native manifest (generated; do not hand-edit).
- [`manifest.generated.json`](manifest.generated.json) - agent index (generated).

## Documentation and governance

- [`CHANGELOG.md`](CHANGELOG.md) - full technical history; [`RELEASE-NOTES.md`](RELEASE-NOTES.md) - curated, user-facing notes.
- [`docs/`](docs/) - Diataxis docs (reference, how-to, explanation).
- [`agents/_chain-permitted.yaml`](agents/_chain-permitted.yaml) - the chain contract.
