# Release workflow (reference)

Cutting a conformant release (Standard sec 4.3, 7.4, 10.6; ADR 0022).

## Deterministic version (sec 7.4)

One plugin version. Its bump is the MAX of the component bumps since the last release:

- any component had a MAJOR change -> plugin MAJOR.
- else any component had a MINOR change -> plugin MINOR.
- else -> plugin PATCH.

`library.json` holds the version (source of truth); `package.json` must equal it (U9). This makes the public version deterministic, not a judgment call.

## CHANGELOG vs RELEASE-NOTES (sec 10.6)

- `CHANGELOG.md` - the full technical history (Keep a Changelog). `changelog` mode promotes `[Unreleased]` to a dated `[X.Y.Z]`.
- `RELEASE-NOTES.md` - curated, user-facing highlights, distinct from the changelog (Gold G5). `notes` mode writes the highlights entry.

## Release-readiness gate (ADR 0022)

Before tagging, all must hold (see `docs/internal/RELEASE.md`):
version consistency (U9), a dated CHANGELOG section, RELEASE-NOTES present, README status current, generated surfaces drift-free (G4), conformance gate green, no em/en dashes (U10), and the manual Codex round-trip recorded. The gate is built incrementally: version + dash + CHANGELOG-section now; the full deterministic `release-ready` check lands at Gold.

## Marketplace timing (D8)

Register in a marketplace only at the first Gold `v1.0.0` tag - never before. A pre-Gold release is a labeled `0.x` (repo/tag only).
