---
title: "askit-build-subagent"
description: "Creates and improves Claude subagents (`agents/<name>.md`) to the Standard."
audience: engineer
level: intermediate
---

# Reference: askit-build-subagent

Creates and improves Claude subagents (`agents/<name>.md`) to the Standard. Claude-only emission.

- **create:** brief interview (name, job, tools, chain) -> copy `templates/agent.md`
  to `agents/<name>.md` -> fill frontmatter (`name`, `description`, narrowest
  `tools`, optional `model`, `chain` only if it invokes another component) ->
  declare in `library.json components.subagents` -> if `chain` is declared, add the
  entry to `agents/_chain-permitted.yaml` -> run `node scripts/evaluate.mjs . --json`
  to 0 errors (S3 + S4 must be clean).
- **improve:** consume `node scripts/evaluate.mjs . --json` -> resolve findings
  (S3 index drift, S4 orphan/phantom, description quality) -> re-evaluate to 0
  errors.
- **Files touched:** `agents/<name>.md` (created or edited), `library.json`
  (`components.subagents` entry), `agents/_chain-permitted.yaml` (chain entry, if
  the subagent invokes another component).
- **Claude-only:** Codex v0.135 plugins cannot ship subagents (`plugin.json` has no
  `agents` field; Standard sec 3.3). The frontmatter declares
  `agent-targets: [claude]`. No Codex artifact is generated and `gen-manifest.mjs`
  is not called for the subagent itself.
- **Authoring depth:** see the skill's `references/authoring-subagents.md`.

## Orphan and phantom errors (S4)

S4 has two distinct failure modes:

- **Orphan:** a component's frontmatter `chain:` names a callee that is not in
  `agents/_chain-permitted.yaml` under that caller. Fix: add the
  `<caller>: [<callee>]` line to the contract.
- **Phantom:** the contract names a caller or callee that matches no on-disk
  component. Fix: remove the stale entry, correct a misspelled name, or create the
  missing component.

Both are S4 errors and block the convergent gate.
