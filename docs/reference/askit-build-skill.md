# Reference: askit-build-skill

Creates and improves skills to the Standard. Emits for Claude and Codex.

- **create:** brief interview -> scaffold `skills/<name>/` from `templates/SKILL.md`
  -> fill frontmatter (name == directory; description that clears the 8.1 bar) ->
  evaluate.
- **improve:** consume `evaluate --json` -> resolve findings (description, samples,
  instruction budget) -> re-evaluate.
- **A la carte:** works inside any plugin; does not require the full anatomy and
  does not impose surrounding scaffold.
- **Authoring bar:** see the skill's `references/authoring-guide.md`.
- **Multi-agent emission:** declare `agent-targets` in `library.json` and run `gen-manifest.mjs --target=all` (or `--target=claude` / `--target=codex` for one). `agent-targets` is the declaration; there is no `--agent-target` flag. A dedicated authoring subagent is still a later addition.
