# v1.15.0 marketplace re-pin - STAGED, not executed

**Status: awaiting the maintainer**, and awaiting the tag itself. This file is written ahead of the tag so
the last step of the release is not the one nobody wrote down; the practice lapsed after v1.9.0 and five
releases shipped without it.

**Do not start until v1.15.0 is tagged, released and published.** The re-pin points the registry at a
commit that must already carry the tag, and `validate-registry` checks exactly that.

## Registry state, read live 2026-08-19

| | |
|---|---|
| Registry `metadata.version` | `1.66.0` |
| `agent-skills-toolkit` entry | `version: 1.14.0`, `source.sha: 90ceea8e...`, `strict: true` |

**Re-read before editing.** Other plugins bump `metadata.version` between releases, so the number above is
a reading, not a reservation.

## What shipped

| | |
|---|---|
| Version | `1.14.0` to `1.15.0` |
| Standard pin | 0.14 to **0.15** (two windowed requirements graduate `warn` to `error`) |
| Spine | 34 checks (unchanged - no check added or removed) |
| Skills | 24 to **26** (`askit-capability-whats-new`, `askit-capability-gap-analysis`) |
| Gate | Advanced, 0 errors / 0 warnings, at the repository's own new 0.15 pin |
| Release gates | `npm run release-ready` exits 0 on all **five** |

**No family verdict moves and no plugin sees a new gate failure without re-pinning.** That was measured per
member before and after, and it is the reason a Standard bump can re-pin without a migration note to
consumers.

## The edit

In `agent-plugins/.claude-plugin/marketplace.json`:

1. The `agent-skills-toolkit` entry: `source.sha` to the v1.15.0 squashed commit; `version` to `1.15.0`.
   **`strict: true` preserved.**
2. `metadata.version`: bump one minor from whatever it currently reads. Re-read first.
3. Add the registry CHANGELOG entry. **Check for gaps before writing it** - `[1.37.0]` had to be backfilled
   once because a bump shipped without one.

## Then

1. `GITHUB_TOKEN="$(gh auth token)" node scripts/validate-registry.mjs` must pass. It returns 403
   anonymously on the sha-on-tag check, so the token is not optional.
2. Open and merge the re-pin PR against `agent-plugins`.
3. Smoke-verify the whole chain: `marketplace.json` to the pinned sha to `.claude-plugin/plugin.json`
   reporting `1.15.0`.
4. Record the PR number and the resulting `metadata.version` in [`../../STATUS.md`](../../STATUS.md).

## Checklist

- [ ] The pinned `sha` sits on release tag `v1.15.0`, and CI at that sha is green
- [ ] Versions agree: registry entry == release tag == `library.json` == `package.json` == both native manifests
- [ ] The plugin repo's `CHANGELOG.md` carries the `[1.15.0]` entry
- [ ] Registry `metadata.version` bumped; entry added to the registry CHANGELOG
- [ ] `strict: true` preserved; `validate-registry` green
- [ ] `STATUS.md` updated with the PR number and the new registry version

## One thing specific to this release

**v1.15.0 raises the Standard pin.** A consumer installing from the registry gets 0.15, where `S3`'s
workflow mirror and `U17` are gate-failing rather than warnings. Both were windowed first, and the window
was observed working end to end - `thinking-framework-skills` declared its nine previously-undeclared
workflows one day after ADR 0047 ratified, inside the window that ADR created. That is why this re-pin does
not need a consumer migration note: the migration already happened, in the open, on the schedule the ADR
set.
