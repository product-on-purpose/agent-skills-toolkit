---
title: "Emit a plugin for multiple agents"
description: "A plugin can target Claude Code, Codex, or both."
audience: engineer
level: intermediate
---

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
npx agent-skills-toolkit gen-manifest . --write --target=all
```
- `--target=all` writes `manifest.generated.json`, `.claude-plugin/plugin.json`, and `.codex-plugin/plugin.json`.
- `--target=claude` or `--target=codex` writes just one.

`.claude-plugin/plugin.json` carries the shared spine (name, version, description,
author, homepage, repository, keywords). `.codex-plugin/plugin.json` adds a
`"skills": "./skills/"` pointer and an `interface` marketplace block (displayName,
category) for the Codex plugin system.

An existing native manifest may already carry one of those fields with a
non-empty value that `library.json` does not supply. `gen-manifest --write`
then refuses to overwrite that file, rather than silently dropping the field.
This is [E72, adopting a plugin can wipe its hand-written manifest
fields](https://github.com/product-on-purpose/agent-skills-toolkit/blob/main/docs/internal/backlog/enhancements.md).
The refusal names every lost field and its target file, and nothing is
written. Add the field to `library.json`, or pass `--allow-field-loss` to
overwrite it anyway. See "Adopting a plugin with hand-written manifest
fields" below.

## 3. Validate

- `npx agent-skills-toolkit` runs S6 (per-target-presence): each declared target must
  have its native manifest on disk.
- U8 warns if a generated manifest's name/version drifts from `library.json` -
  regenerate to fix.

## 4. (Local) round-trip against Codex

With the `codex` CLI installed, `tests/integration/codex-roundtrip.test.mjs`
wraps the emitted `.codex-plugin/plugin.json` in a throwaway local marketplace,
installs it, and confirms the skill is ingested (not merely listed). It runs with
`npm test` locally and skips when `codex` is absent (for example in CI).

Marketplace catalog generation (publishing many plugins) is a separate, later step.

## 5. Adopting a plugin with hand-written manifest fields

`askit-migrate`'s adopt mode writes the smallest `library.json` that makes a
foreign repo gradeable: `name`, `version`, `description`, `standard`, and
`tier`. That thin manifest does not carry `homepage`, `repository`, `license`,
`author`, `keywords`, or a Codex display name. The repo's existing
`.claude-plugin/plugin.json` or `.codex-plugin/plugin.json` might already carry
them.

Running `gen-manifest --write` against that combination used to null out or
empty every one of those hand-written fields, because the regenerated object
always wins. It now refuses instead. When the existing file carries a
non-empty value that `library.json` does not supply, the whole run is
refused: no manifest is written, including the other target and
`manifest.generated.json`. The field and the target file are both named on
stderr. The process exits non-zero. Nothing is written until every named
field is resolved.

The check is not limited to the fields `library.json` can supply. It walks
every field the existing manifest carries, including a Codex interface key
neither renderer emits, such as `shortDescription` or `brandColor`. Those
have no `library.json` home at all, so their refusal line says so, and
`--allow-field-loss` is the only way through for them. The same applies to
a hand-written inline `mcpServers` object or a custom `skills` directory.
The one change the check forgives is a path spelled two ways, such as
`./skills` on disk where the renderer writes `./skills/`.

Two ways through:

1. **Copy the fields into `library.json` first** (recommended, where
   possible). Read the existing native manifest(s), add the missing
   `homepage`, `repository`, `license`, `author`, `keywords`, and the Codex
   display name and category to `library.json`'s top-level `displayName` and
   `category` keys (not a nested `interface` object), then rerun
   `gen-manifest --write`. `library.json` becomes the single source of truth
   those fields were always supposed to have. When the refusal names a field
   whose `library.json` key differs from its own name, such as
   `interface.displayName`, the refusal line says which key to set.
2. **Pass `--allow-field-loss`** when the loss is deliberate, for example a
   license you are intentionally dropping, or when the field has no
   `library.json` home at all. This writes through and overwrites the field,
   so use it only after reading the refusal's field list.

A value `library.json` already supplies is never refused, even when it
differs from what is on disk. That is a deliberate regeneration, not a loss.
