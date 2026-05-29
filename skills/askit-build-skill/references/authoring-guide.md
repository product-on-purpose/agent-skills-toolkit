# Skill authoring guide

See [STANDARD.md](../../../STANDARD.md) for the full Standard text.

## The description bar (Standard sec 8.1)
A description MUST state what the skill does AND when to use it, and SHOULD include concrete trigger keywords. Tooling scores it 0-1 and warns below 0.7.
- State the action/output ("Converts ...", "Generates ...").
- State the trigger ("Use when ...").
- Use words a user would actually say.
- Third person; no "helps with", no vague verbs; no angle brackets or ALL-CAPS.

## Layout (Standard sec 10.2)
`skills/<name>/SKILL.md` (canonical), optional `references/` (lazy depth, one level), `examples/` (>= 3 golden + 1 anti, recommended), `HISTORY.md` (recommended at Bronze).

## Budget
Keep `SKILL.md` lean (well under 500 lines); push depth into `references/`.

## Multi-agent emission (Standard sec 3.2, sec 10.1)
A plugin declares which agents it targets in `library.json.agent-targets` (`["claude", "codex"]`). The native manifests are generated from `library.json`, never hand-edited:
- `node scripts/generators/gen-manifest.mjs <plugin> --write --target=all` writes the resolved index plus `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json`.
- `--target=claude` or `--target=codex` writes just one.
The `SKILL.md` files are portable and shared - they live under the plugin's `skills/` and are not duplicated per agent. The S6 check enforces that each declared target has its native manifest on disk; U8 warns if a manifest's name/version drifts from `library.json`.
