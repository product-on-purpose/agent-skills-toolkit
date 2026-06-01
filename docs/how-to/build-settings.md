# How to build settings and permissions

Author a plugin's settings, permissions, and env with `askit-build-settings`.

## Scaffold (create)

Invoke `askit-build-settings` (create mode). It reads what the plugin needs (tools, paths, env, hooks) and scaffolds the settings per target: Claude Code `settings.json` (a `permissions` allow/deny set, `env`, and `hooks` registration); Codex `config.toml` for the subset it supports. Apply least privilege from the start - the allowlist grants only what a component uses.

## Tighten (improve / permission advice)

Invoke `askit-build-settings` (improve mode, or permission advice) to remove any granted permission no component uses, tighten an over-broad matcher, and recommend the minimal allowlist for a component. Secrets go through `env` indirection - never commit a secret (sec 9).

## See also

- [`askit-build-settings` reference](../reference/askit-build-settings.md)
- [settings-recipe](../../skills/askit-build-settings/references/settings-recipe.md)
