# Reference: askit-build-command

Creates and improves Claude slash commands (`commands/<name>.md`) to the Standard.
Claude-native; no Codex artifact.

- **create:** brief interview (command name, backing skill or workflow, optional
  argument hint, description) -> copy `templates/command.md` to `commands/<name>.md`
  -> fill frontmatter (`description`, `maps-to`, optional `argument-hint`/
  `allowed-tools`/`model`, `metadata.version`) -> write a body invoking the backing
  skill via `$ARGUMENTS` -> declare in `library.json components.commands` -> run
  `node scripts/evaluate.mjs . --json` to 0 errors (S3 + S7 must be clean).
- **improve:** consume `node scripts/evaluate.mjs . --json` -> resolve findings
  (S3 index drift, S7 missing `maps-to`/unresolved target/empty description) ->
  re-evaluate to 0 errors.
- **Files touched:** `commands/<name>.md` (created or edited), `library.json`
  (`components.commands` entry).
- **Codex parity:** on Codex a command is realized as its backing skill (Standard
  sec 3.2). The backing skill's entry in `.codex-plugin/plugin.json` is the Codex
  form. No Codex artifact is generated for the command itself and `gen-manifest.mjs`
  is not called for the command.
- **Authoring depth:** see the skill's `references/authoring-commands.md`.

## S7 command-contract errors

S7 has three distinct failure modes, all errors:

- **Missing description:** `commands/<name>.md` has no `description` or it is empty.
  Fix: add a non-empty `description` to the frontmatter (Standard sec 8.1).
- **Missing maps-to:** `commands/<name>.md` has no `maps-to` key or it is empty.
  Fix: add `maps-to: <skill-or-workflow-name>` to the frontmatter.
- **Unresolved maps-to:** the declared `maps-to` value names no on-disk skill or
  workflow. Fix: correct the name to match an existing `skills/<name>/SKILL.md` or
  `_workflows/<name>.yaml`, or create the missing component first.

S7 is conditional: it fires only when `commands/` contains at least one command. A
plugin with no commands passes S7 automatically.

## One-target rule

A command MUST map to exactly one skill or workflow. There is no multi-target
`maps-to`; if a caller needs to route to different backing components, use separate
commands.
