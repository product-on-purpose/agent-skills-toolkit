# How to emit a plugin for multiple agents

A plugin can target Claude Code, Codex, or both. The `SKILL.md` files are portable
and shared; only the native manifests differ per agent. They are generated from the
canonical `library.json`, never hand-edited.

## 1. Declare the targets

In `library.json`:
```json
{ "agent-targets": ["claude", "codex"] }
```

## 2. Generate the native manifests

```
node scripts/generators/gen-manifest.mjs . --write --target=all
```
- `--target=all` writes `manifest.generated.json`, `.claude-plugin/plugin.json`, and `.codex-plugin/plugin.json`.
- `--target=claude` or `--target=codex` writes just one.

`.claude-plugin/plugin.json` carries the shared spine (name, version, description,
author, homepage, repository, keywords). `.codex-plugin/plugin.json` adds a
`"skills": "./skills/"` pointer and an `interface` marketplace block (displayName,
category) for the Codex plugin system.

## 3. Validate

- `node scripts/check.mjs` runs S6 (per-target-presence): each declared target must
  have its native manifest on disk.
- U8 warns if a generated manifest's name/version drifts from `library.json` -
  regenerate to fix.

## 4. (Local) round-trip against Codex

With the `codex` CLI installed, `tests/integration/codex-roundtrip.test.mjs`
wraps the emitted `.codex-plugin/plugin.json` in a throwaway local marketplace,
installs it, and confirms the skill is ingested (not merely listed). It runs with
`npm test` locally and skips when `codex` is absent (for example in CI).

Marketplace catalog generation (publishing many plugins) is a separate, later step.
