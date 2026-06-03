---
title: "askit-build-agents-md"
description: "Authors and syncs a plugin's `AGENTS.md` (the agent navigation + instructions entrypoint, Standard sec 3.10)."
audience: engineer
level: intermediate
---

# askit-build-agents-md (reference)

Authors and syncs a plugin's `AGENTS.md` (the agent navigation + instructions entrypoint, Standard sec 3.10). Universal tier; the most portable cross-tool surface.

## Modes
- `create`: interview (what the project is, conventions, boundaries), author a tight AGENTS.md, render the component section via `sync-agents-md`, evaluate.
- `improve`: sync the component list to disk and trim redundancy / non-essential prohibitions.

## The bar
- Sections: what-this-is, current-state, conventions, build/test/lint, where-to-look.
- Brevity is a feature: verbose, generated-looking context files measurably reduce agent task success and raise cost; prefer positive instructions over long "do not" lists.
- Keep the component section in sync with `library.json` via `node scripts/generators/sync-agents-md.mjs` (no hand-edit drift).

## Cross-tool
`AGENTS.md` is read by Claude Code, Codex, Gemini CLI, Copilot, and Cursor. See the [build-agents-md how-to](../how-to/build-agents-md.md) and [authoring-agents-md](../../skills/askit-build-agents-md/references/authoring-agents-md.md).
