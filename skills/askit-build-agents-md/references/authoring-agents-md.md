# Authoring AGENTS.md (reference)

The bar for a conformant, effective `AGENTS.md` (Standard sec 3.10, Universal tier).

## Sections that earn their place

- **What this is** - one short paragraph.
- **Current state** - read before assuming capabilities; what actually exists on disk.
- **Conventions** - runtime, manifest/source-of-truth, terminology, working scratch.
- **Build / test / lint** - the exact commands.
- **Where to look** - links to STANDARD/INDEX/README/key docs.

## Brevity is a feature

Empirical evidence (ETH Zurich, 2026) shows verbose, generated-looking AGENTS.md files REDUCE agent task success (~3%) and raise inference cost (20%+), and that long lists of negative "do not X" instructions frequently backfire. So:

- Keep it minimal and essential-only.
- Prefer positive, concrete instructions over prohibitions.
- Cut redundancy with the README/INDEX; AGENTS.md is the agent entrypoint, not a second copy of everything.
- Measure a change by whether it helps an agent act correctly, not by completeness.

## Keep it in sync

The component list should match `library.json`. `node scripts/generators/sync-agents-md.mjs` renders that section from the manifest, so regenerate it when components change rather than hand-editing (prevents drift, the same single-source-of-truth principle as the native manifests).

## Cross-tool

`AGENTS.md` is read by Claude Code, Codex, Gemini CLI, GitHub Copilot, and Cursor - the cheapest path to a credible "works with all major tools" surface. A `CLAUDE.md` sibling carries Claude-only guidance when needed.
