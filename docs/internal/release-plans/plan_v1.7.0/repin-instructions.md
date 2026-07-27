# v1.7.0 marketplace re-pin

**Status: to be EXECUTED this session.** The standing boundary (AU-2: re-pins staged, never executed) was lifted by explicit maintainer instruction on 2026-07-26. The default reverts to stage-do-not-execute absent a fresh instruction, so a later release should not read this page as precedent.

## What shipped

| | |
|---|---|
| Version | `1.6.1` -> `1.7.0` |
| Tag / commit | `v1.7.0` at the squashed release commit |
| Spine / Standard | 30 / 0.12 (unchanged) |
| Tests / gate | 516 passing / Advanced 0/0 |

## The edit

In `agent-plugins/.claude-plugin/marketplace.json`:

1. **The `agent-skills-toolkit` entry** (`source.source: "url"`, `strict: true`):
   - `source.sha`: `cd12e107e437cdfbc127ac1cd7a1465691aeff2c` -> the v1.7.0 squashed commit
   - `version`: `1.6.1` -> `1.7.0`
   - `description`: unchanged.
2. **`metadata.version`**: `1.39.0` -> `1.40.0`. Re-read before editing in case another re-pin landed first.
3. **The registry CHANGELOG**: add the `[1.40.0]` entry. Check for gaps first: the `[1.37.0]` entry had to be backfilled during the v1.6.1 re-pin because a bump shipped without one.

## Then

1. `GITHUB_TOKEN="$(gh auth token)" node scripts/validate-registry.mjs` must pass in `agent-plugins`. It 403s anonymously on the sha-on-tag check, so supply the token.
2. Open the re-pin PR against `agent-plugins` and merge it.
3. Smoke-verify install resolution: `marketplace.json` -> the pinned sha -> `.claude-plugin/plugin.json` reports `1.7.0`.
4. Record the registry PR number and the resulting `metadata.version` in [`../../STATUS.md`](../../STATUS.md).

## The checklist the registry's own CONTRIBUTING requires

- [ ] The pinned `sha` sits on release tag `v1.7.0`, and CI at that sha is green
- [ ] Versions agree: registry entry == release tag == `library.json` == `.claude-plugin/plugin.json` == `.codex-plugin/plugin.json`
- [ ] The plugin repo's `CHANGELOG.md` has the `[1.7.0]` entry
- [ ] Registry `metadata.version` bumped; entry added to the registry CHANGELOG
- [ ] `strict: true` preserved; `validate-registry` green
