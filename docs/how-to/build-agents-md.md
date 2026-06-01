# How to build AGENTS.md

Author the agent navigation + instructions entrypoint (Standard sec 3.10) and keep it in sync.

## 1. Create

Invoke `askit-build-agents-md` (create mode). It asks what the project is, its conventions, and its boundaries, then authors a tight AGENTS.md with the standard sections: what-this-is, current-state, conventions, build/test/lint, where-to-look.

## 2. Keep it brief and positive

Verbose, generated-looking AGENTS.md files measurably reduce agent task success and raise cost, and long "do not X" lists backfire. Keep it essential-only and prefer positive, concrete instructions.

## 3. Sync the component section

    node scripts/generators/sync-agents-md.mjs

renders the component list from `library.json` so it does not drift. Regenerate it when components change instead of hand-editing.

## 4. Validate

    node scripts/evaluate.mjs . --json

AGENTS.md presence is checked by U2 (anatomy); the description and instruction-budget rules apply.

## See also

- [`askit-build-agents-md` reference](../reference/askit-build-agents-md.md)
- [authoring-agents-md](../../skills/askit-build-agents-md/references/authoring-agents-md.md)
