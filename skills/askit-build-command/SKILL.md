---
name: askit-build-command
description: Creates and improves Claude slash commands (commands/<name>.md) that map to a skill, to the Advanced Skill Library Standard. Use when you need to give a skill an explicit /command entry point or raise an existing command's conformance.
metadata:
  version: 0.1.0
  tier: universal
  audience: intermediate
---

# askit-build-command

## Purpose
Author conformant commands. Two modes: `create` scaffolds a new `commands/<name>.md` that maps to an existing skill; `improve` raises an existing command toward the quality bar. On Codex a command is realized as its backing skill (Standard sec 3.2 parity), so this skill emits no Codex artifact. Follows the shared [builder pattern](../../docs/reference/builder-pattern.md). Authoring depth is in [references/authoring-commands.md](references/authoring-commands.md).

## When to use
When the user asks to create, scaffold, or improve a slash command for a skill.

## create mode
1. Brief interview: the command name (kebab-case, becomes `/name`), the skill (or workflow) it maps to, optional args, and a description mirroring the backing skill's intent. Skip if provided in context.
2. Copy `templates/command.md` into `commands/<name>.md`.
3. Fill the frontmatter: `description` (what AND when; Standard sec 8.1); `maps-to` equal to the backing skill or workflow name; optional `argument-hint`/`allowed-tools`/`model`; `metadata.version`. The filename is the command name (no `name` key). Write a body that invokes the backing skill, passing `$ARGUMENTS`.
4. Verify the `maps-to` target exists (a skill in `skills/` or a workflow in `_workflows/`).
5. Register the command in `library.json` `components.commands` as `{ name, path, version, tier, status }`.
6. Assess with `node scripts/evaluate.mjs . --json` and iterate until 0 errors (S3 components index + S7 command-contract must be clean).

## improve mode
1. Run `node scripts/evaluate.mjs . --json` and read the report.
2. For each finding: an S3 error -> declare/undeclare the command in `components.commands` to match disk; an S7 error -> add the missing `maps-to`, fix a `maps-to` that does not resolve, or add a missing `description`. For any other finding, read its message and apply the fix it states.
3. Re-run evaluate to confirm.

## Scope
Claude-native: a command is `commands/<name>.md`. Codex realizes a command as its backing skill (Standard sec 3.2), so there is no Codex artifact to generate; the backing skill is the invocable form on Codex. A command MUST map to exactly one skill or workflow.
