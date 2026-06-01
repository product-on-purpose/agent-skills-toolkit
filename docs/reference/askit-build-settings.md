# askit-build-settings (reference)

Creates and improves a plugin's settings and permissions per target, and recommends least-privilege allowlists.

## Modes
- `create` / `improve`: scaffold or tighten settings per target (Claude Code `settings.json` permissions/env/hooks; Codex `config.toml` subset).
- permission advice: recommend the minimal allowlist a component needs; flag over-grants (the `permission-advisor` role, folded in).

## Rules
Least privilege (grant only what is used) and secret hygiene (env indirection, never commit secrets) are Universal security rules (sec 9). Recipe + rubric: [settings-recipe](../../skills/askit-build-settings/references/settings-recipe.md).

## Boundaries
`askit-build-hook` authors hooks; this wires their registration. `askit-build-statusline` owns the `statusLine` entry. See the [build-settings how-to](../how-to/build-settings.md).
