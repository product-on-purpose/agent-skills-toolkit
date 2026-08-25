---
title: "The builder pattern"
description: "Every `askit-build-<type>` skill follows one shape."
audience: engineer
level: advanced
---

# The builder pattern (reference)

Every `askit-build-<type>` skill follows one shape.

There is no per-component "render engine". What a component becomes on each agent is fixed by its type:

- **Skills and MCP servers** are portable files. The native manifests wire them up.
- **Subagents and output styles** are Claude-only.
- **A command** has no separate Codex file. On Codex, its backing skill is the invocable form.

So the shared thing is the builder skill pattern, and it is captured here once.

## The shape (create mode)
1. Interview the component's inputs (or read them from context).
2. Copy the type's template from `templates/` to the canonical file (`commands/<name>.md`, `agents/<name>.md`, `skills/<name>/SKILL.md`, ...).
3. Author the Claude-native canonical file: frontmatter (per Standard sec 3.8 for the type) + body.
4. Register the component in `library.json` `components.<type>` as `{ name, path, version, tier, status }`.
5. Wire any per-target manifest pointer by running `npx agent-skills-toolkit gen-manifest . --write --target=all` (skills/MCP are referenced by the native manifests; Claude auto-discovers `commands/` and `agents/`).
6. Assess: `npx agent-skills-toolkit evaluate . --json` and iterate to 0 errors.

## The shape (improve mode)
1. `npx agent-skills-toolkit evaluate . --json` and read the findings.
2. Fix each finding per its message (a missing `maps-to`, an over-scoped tool set, a description below the bar, a drifted manifest).
3. Re-run to confirm.

## Cross-agent emission (what each type does)
- **Skill / MCP:** portable file, referenced by each native manifest (`gen-manifest`). Plugin-distributable on both agents.
- **Subagent / output style:** Claude-only (`agent-targets: [claude]`); no Codex artifact (Standard sec 3.3).
- **Command:** a new Claude `commands/<name>.md`; on Codex the backing skill IS the invocable form (Standard sec 3.2 parity) - no separate Codex file.
- **Chain contract / AGENTS.md:** agent-agnostic; one file, no per-target form.

There is no `gen-<type>.mjs` render engine - per-target wiring is `gen-manifest`'s job, and Claude-only types have no Codex artifact. Add a per-target renderer ONLY if a genuinely divergent, both-ingestible type ever appears (none in the v1 set).
