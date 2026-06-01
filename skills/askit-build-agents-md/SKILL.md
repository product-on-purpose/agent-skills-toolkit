---
name: askit-build-agents-md
description: Creates and improves a plugin's AGENTS.md (the agent navigation and instructions entrypoint) to the Advanced Skill Library Standard. Use when you need to author or sync AGENTS.md, align it with the component index, or trim an overgrown one to essential, mostly-positive guidance.
metadata:
  version: 0.1.0
  tier: universal
  audience: intermediate
---

# askit-build-agents-md

## Purpose
Author and keep current a plugin's `AGENTS.md`: the project-level agent instructions and navigation entrypoint, the first thing an agent reads (Standard sec 3.10). It is the single most portable cross-tool surface (Claude, Codex, Gemini, Copilot, and Cursor all read `AGENTS.md`). Two modes: `create` authors a tight AGENTS.md; `improve` syncs it to the component index and trims it. Authoring depth is in [references/authoring-agents-md.md](references/authoring-agents-md.md). Follows the shared builder contract ([../../docs/reference/builder-pattern.md](../../docs/reference/builder-pattern.md)).

## When to use
When the user asks to author, write, sync, or trim `AGENTS.md` (or `CLAUDE.md`), or when components were added or removed and the navigation is stale.

## create mode
1. Brief interview: what the project is, the conventions (runtime, build/test/lint), and the boundaries. Skip if in context.
2. Author a TIGHT AGENTS.md: what-this-is, current-state (read before assuming capabilities), conventions, build/test/lint, where-to-look. Keep it minimal and essential-only, and prefer positive instructions over long "do not" lists. Verbose, generated-looking context files measurably reduce agent task success and raise cost, so brevity is a feature, not a shortcut.
3. Keep the component list aligned with `library.json` and the index. `node scripts/generators/sync-agents-md.mjs` renders the component section from the manifest so it does not drift.
4. Evaluate (`node scripts/evaluate.mjs . --json`); AGENTS.md presence is checked by U2 (anatomy), and the description and instruction-budget rules apply.

## improve mode
1. Run evaluate and read findings; sync the component list to disk.
2. Trim: remove redundancy and non-essential prohibitions; judge each change by whether it helps an agent act correctly, not by length.
3. Re-run to confirm.

## Scope
AGENTS.md is Universal-tier and the cheapest credible cross-tool surface. Keep it brief and current; the generated component section (`sync-agents-md`) prevents drift from the manifest. A `CLAUDE.md` is a Claude-specific sibling for the same purpose when a project needs Claude-only guidance.
