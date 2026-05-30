# Authoring commands (reference)

A command is a Claude slash command at `commands/<name>.md` - an explicit, user-invocable entry point to a skill. The filename (minus `.md`) is the command name; there is no `name` frontmatter. Standard sec 3.2, 3.8.

## Frontmatter
- `description` (REQUIRED; what + when + trigger keywords; sec 8.1; mirror the backing skill's intent).
- `maps-to` (REQUIRED; the Standard convention key naming the ONE backing skill or workflow this command invokes).
- `argument-hint` (OPTIONAL; e.g. `[path]` - what args the command takes).
- `allowed-tools`, `model` (OPTIONAL Claude-native fields).
- `metadata.version` (REQUIRED, semver).

## Body
The command body is the prompt. Invoke the backing skill and pass `$ARGUMENTS` (all args) or `$1`/`$2` (positional). Keep it thin - the command is a wrapper that hands off to the skill.

## Codex parity (sec 3.2)
On Codex a command is realized as its backing skill (custom prompts are deprecated). So a command emits NO Codex artifact: the backing skill (already a portable, explicitly-invocable skill) is the Codex form. Tooling and docs set this expectation rather than implying a byte-for-byte command on both agents.

## One target (sec 3.2, S7)
A command MUST map to exactly one skill or workflow. The `command-contract` check (S7) errors if `maps-to` is missing or names a target with no on-disk skill/workflow.
