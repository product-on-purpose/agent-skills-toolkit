# v1.6.1 marketplace re-pin - STAGED, not executed

**Status: awaiting the maintainer.** This repository never writes to `agent-plugins`. Until these steps are applied, the marketplace keeps serving v1.6.0 and nothing breaks; the v1.6.1 GitHub release is already live and installable by tag.

## What shipped

| | |
|---|---|
| Version | `1.6.0` -> `1.6.1` |
| Tag / commit | `v1.6.1` at `cd12e107e437cdfbc127ac1cd7a1465691aeff2c` |
| Release | https://github.com/product-on-purpose/agent-skills-toolkit/releases/tag/v1.6.1 (live, Latest) |
| Spine / Standard | 30 / 0.12 (unchanged) |
| Tests / gate | 442 passing / Advanced 0/0 |

## The edit

In `agent-plugins/.claude-plugin/marketplace.json`:

1. **The `agent-skills-toolkit` entry** (verified present, `source.source: "url"`, `strict: true`):
   - `source.sha`: `c2bcbe28fd887b8884bb83736415e986e903b90a` -> `cd12e107e437cdfbc127ac1cd7a1465691aeff2c`
   - `version`: `1.6.0` -> `1.6.1`
   - `description`: unchanged.
2. **`metadata.version`**: `1.38.0` -> `1.39.0` (read live on 2026-07-25; re-read before editing in case another re-pin landed first).
3. **The registry CHANGELOG**: add the `[1.39.0]` entry. Check for gaps first - past re-pins have repeatedly needed backfill for versions bumped without an entry.

## Then

1. `node scripts/validate-registry.mjs` in `agent-plugins` must pass.
2. Open the re-pin PR against `agent-plugins` and merge it.
3. Smoke-verify install resolution: `marketplace.json` -> `cd12e10` -> `.claude-plugin/plugin.json` reports `1.6.1`.
4. Record the registry PR number and the resulting `metadata.version` in [`../../STATUS.md`](../../STATUS.md).

## Why this is staged rather than done

Writes outside `agent-skills-toolkit` are out of bounds for work running in this repository (the boundary ruling recorded as AU-2 in the pending program packet, applied here as the standing release practice). Re-pinning is a deliberate maintainer action against a registry that other plugins share, so it gets a human at the keyboard. A lagging pin is a no-op, not an outage.
