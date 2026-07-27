# v1.8.0 marketplace re-pin - STAGED, not executed

**Status: awaiting the maintainer.** Ruling AU-2 (re-pins staged, never executed) was lifted by explicit instruction for the v1.6.1 and v1.7.0 re-pins only. The default has reverted, so this one is written down rather than applied.

## What shipped

| | |
|---|---|
| Version | `1.7.0` to `1.8.0` |
| Spine / Standard | 30 / 0.12 (unchanged) |
| Tests / gate | 561 passing / Advanced 0/0 |

## The edit

In `agent-plugins/.claude-plugin/marketplace.json`:

1. The `agent-skills-toolkit` entry: `source.sha` to the v1.8.0 squashed commit; `version` 1.7.0 to 1.8.0. `strict: true` preserved.
2. `metadata.version`: `1.40.0` to `1.41.0`. Re-read before editing in case another re-pin landed first.
3. Add the `[1.41.0]` registry CHANGELOG entry. Check for gaps first: `[1.37.0]` had to be backfilled during the v1.6.1 re-pin because a bump shipped without one.

## Then

1. `GITHUB_TOKEN="$(gh auth token)" node scripts/validate-registry.mjs` must pass. It returns 403 anonymously on the sha-on-tag check, so supply the token.
2. Open and merge the re-pin PR against `agent-plugins`.
3. Smoke-verify install resolution: `marketplace.json` to the pinned sha to `.claude-plugin/plugin.json` reporting `1.8.0`.
4. Record the PR number and the resulting `metadata.version` in [`../../STATUS.md`](../../STATUS.md).

## The checklist the registry's own CONTRIBUTING requires

- [ ] The pinned `sha` sits on release tag `v1.8.0`, and CI at that sha is green
- [ ] Versions agree: registry entry == release tag == `library.json` == both native manifests
- [ ] The plugin repo's `CHANGELOG.md` has the `[1.8.0]` entry
- [ ] Registry `metadata.version` bumped; entry added to the registry CHANGELOG
- [ ] `strict: true` preserved; `validate-registry` green
