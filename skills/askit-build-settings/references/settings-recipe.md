# Settings and permissions recipe (reference)

How a plugin declares settings, permissions, env, and hook registration, per target, at least privilege (Standard sec 9).

## Per-target surfaces

| Concern | Claude Code | Codex |
|---|---|---|
| Permissions | `settings.json` `permissions` (allow/deny lists) | `config.toml` (a supported subset) |
| Environment | `settings.json` `env` | `config.toml` env |
| Hook registration | `settings.json` `hooks` or plugin `hooks/hooks.json` | the Codex hook subset |

The Claude Code `settings.json` is the rich surface; Codex's `config.toml` supports a subset. Declare per target only what each supports.

## Least privilege (the rubric)

- Grant only what a component actually uses - the narrowest tool set and the tightest path/command scope. An allow entry no component exercises is an over-grant; remove it.
- Prefer deny-by-default with a specific allowlist over broad allows.
- Tighten matchers: a hook matcher or permission pattern should match exactly the intended surface, not a superset.

## Secret hygiene

Secrets MUST NOT appear in settings, frontmatter, samples, or any committed file (sec 9). A component needing a credential uses `env` indirection (the setting names the env var; the value lives in the environment, not the repo).

## Boundaries

`askit-build-hook` authors a hook; this skill wires its registration entry. `askit-build-statusline` owns the `statusLine` entry. This skill owns permissions, env, and the general settings surface.
