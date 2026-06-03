---
title: "Build a command"
description: "A walkthrough of creating a conformant `commands/<name>.md` slash command, wiring"
audience: engineer
level: intermediate
---

# How to build a command

A walkthrough of creating a conformant `commands/<name>.md` slash command, wiring
it to its backing skill, and reaching 0 S3/S7 errors.

## When to add a command

A **skill** is a reusable instruction set invoked by name or natural language. A
**command** is an explicit `/name` entry point that maps one-to-one to a skill (or
workflow) and gives callers a typed shortcut with a declared description and optional
argument hint. Add a command when you want callers to invoke a skill via a predictable
slash-command name - especially for high-frequency operations where discoverability
matters.

Commands are Claude-native. On Codex the backing skill IS the invocable form (Standard
sec 3.2 parity): the skill's own name is used directly, and no Codex artifact is
generated. The one-target rule is absolute: a command MUST map to exactly one skill or
workflow.

Examples from this toolkit: `/askit-evaluate` maps to the `askit-evaluate` skill;
`/askit-build-skill` maps to `askit-build-skill`.

## 1. Create

Invoke `askit-build-command` (create mode). It asks for the command name (kebab-case,
becomes the `/name` callers type), the skill or workflow it maps to, an optional
argument hint, and a description mirroring the backing skill's intent. It then
scaffolds `commands/<name>.md` from `templates/command.md`.

You can also scaffold manually:

    cp templates/command.md commands/<name>.md

Then fill the frontmatter fields:

- `description` - what the command does AND when to use it, mirroring the backing
  skill's triggering intent (Standard sec 8.1). Must be non-empty.
- `maps-to` - the name of the backing skill or workflow (without extension, without
  path prefix). Must resolve to an on-disk component.
- `argument-hint` - optional; a short usage string shown to the caller (e.g.
  `"[path]"`).
- `allowed-tools` and `model` - optional overrides; omit unless the command needs them.
- `metadata.version` - start at `0.1.0`.

There is no `name` key in the frontmatter: the filename IS the command name.

Write a body that invokes the backing skill and passes `$ARGUMENTS`:

    Invoke the `<backing-skill-name>` skill to create or improve: $ARGUMENTS

## 2. Declare in library.json

Add the command to `library.json` under `components.commands`:

```json
"commands": [
  { "name": "<name>", "path": "commands/<name>.md", "version": "0.1.0", "tier": "convergent", "status": "active" }
]
```

S3 checks that every on-disk `commands/<name>.md` is declared here and that every
declared entry exists on disk. An undeclared command or a dangling declaration both
fail S3.

## 3. Validate

    node scripts/evaluate.mjs . --json

Look at the findings array. An S3 error means `components.commands` is out of sync
with disk - check the declared name and path match exactly. An S7 error has three
forms:

- `missing "description"` - the frontmatter `description` is absent or empty; fill it.
- `must declare "maps-to"` - the `maps-to` key is absent or empty; add it.
- `maps-to "<name>" but no skill or workflow by that name exists` - the target does not
  resolve; correct the name or create the missing component first.

S7 is conditional: it fires only when at least one command exists. It does not fire on
a plugin with no `commands/` content.

Iterate until the report shows `0 error(s)`.

## 4. Codex parity note

Because Codex realizes a command as its backing skill (Standard sec 3.2), no Codex
artifact exists for the command itself. The backing skill's entry in `.codex-plugin/plugin.json`
is the Codex form. `askit-build-command` never calls `gen-manifest.mjs` for the
command; the plugin-level manifests (`.claude-plugin/` and `.codex-plugin/`) are
unaffected. Run `gen-manifest.mjs --target=all` only when the backing skill itself
changes, not when you add a command.

## See also

- [`askit-build-command` reference](../reference/askit-build-command.md)
- [`askit-build-skill` reference](../reference/askit-build-skill.md)
- [Silver checks reference](../reference/silver-checks.md)
- [Builder pattern reference](../reference/builder-pattern.md)
- [How to build and evaluate a skill](build-and-evaluate-a-skill.md)
