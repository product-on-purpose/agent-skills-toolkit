# v1.9.0 marketplace re-pin - STAGED, not executed

**Status: awaiting the maintainer.** Ruling AU-2 (re-pins staged, never executed) was lifted by explicit instruction for the v1.6.1 and v1.7.0 re-pins only. The default has reverted.

**Note:** the v1.8.0 re-pin is also still staged (`../plan_v1.8.0/repin-instructions.md`). If both are applied at once, re-pin straight to v1.9.0 and record both versions in the registry CHANGELOG entry, rather than applying them in sequence.

## What shipped

| | |
|---|---|
| Version | `1.8.0` to `1.9.0` (or `1.7.0` to `1.9.0` if v1.8.0 was never pinned) |
| Spine / Standard | 30 / 0.12 (unchanged) |
| Skills | 23 to 24 (`askit-standards-watch` added) |
| Tests / gate | 601 passing / Advanced 0/0 |

## The edit

In `agent-plugins/.claude-plugin/marketplace.json`:

1. The `agent-skills-toolkit` entry: `source.sha` to the v1.9.0 squashed commit; `version` to `1.9.0`. `strict: true` preserved.
2. `metadata.version`: bump one minor from whatever it currently reads (`1.40.0` at the time of writing, so `1.41.0`). Re-read before editing.
3. Add the registry CHANGELOG entry. Check for gaps first: `[1.37.0]` had to be backfilled once because a bump shipped without one.

## Then

1. `GITHUB_TOKEN="$(gh auth token)" node scripts/validate-registry.mjs` must pass. It returns 403 anonymously on the sha-on-tag check.
2. Open and merge the re-pin PR against `agent-plugins`.
3. Smoke-verify: `marketplace.json` to the pinned sha to `.claude-plugin/plugin.json` reporting `1.9.0`.
4. Record the PR number and resulting `metadata.version` in [`../../STATUS.md`](../../STATUS.md).

## Checklist

- [ ] The pinned `sha` sits on release tag `v1.9.0`, and CI at that sha is green
- [ ] Versions agree: registry entry == release tag == `library.json` == both native manifests
- [ ] The plugin repo's `CHANGELOG.md` has the `[1.9.0]` entry
- [ ] Registry `metadata.version` bumped; entry added to the registry CHANGELOG
- [ ] `strict: true` preserved; `validate-registry` green
