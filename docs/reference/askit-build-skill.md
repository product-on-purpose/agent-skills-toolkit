# Reference: askit-build-skill

Creates and improves skills to the Standard. Claude target (v1).

- **create:** brief interview -> scaffold `skills/<name>/` from `templates/SKILL.md`
  -> fill frontmatter (name == directory; description that clears the 8.1 bar) ->
  evaluate.
- **improve:** consume `evaluate --json` -> resolve findings (description, samples,
  instruction budget) -> re-evaluate.
- **A la carte:** works inside any plugin; does not require the full anatomy and
  does not impose surrounding scaffold.
- **Authoring bar:** see the skill's `references/authoring-guide.md`.
- **Out of scope (v1):** multi-agent (`--agent-target`) emission and a dedicated
  authoring subagent - both arrive in a later phase.
