# askit-release (reference)

Runs a plugin's release (Standard sec 4.3, 7.4, 10.6; ADR 0022).

## Modes
- `version`: compute the plugin version as the max component bump since the last release (sec 7.4); apply to `library.json`, sync `package.json` (U9).
- `changelog`: promote `[Unreleased]` to a dated `[X.Y.Z]` (Keep a Changelog).
- `notes`: curate `RELEASE-NOTES.md` (user-facing highlights, distinct from the changelog, sec 10.6 / G5).
- `gate`: run the release-readiness checks (ADR 0022 / `docs/internal/RELEASE.md`); stop with an actionable message on any failure.

## Notes
`library.json` is the version source of truth; `package.json` follows (U9). The full deterministic `release-ready` check is built incrementally and completes at Gold; marketplace registration is reserved for the first Gold tag (D8). See the [cut-a-release how-to](../how-to/cut-a-release.md) and [release-workflow](../../skills/askit-release/references/release-workflow.md).
