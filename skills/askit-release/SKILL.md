---
name: askit-release
description: Builds and validates a plugin's release by computing the version, promoting the changelog, curating the release notes, and running the readiness gate, to the Advanced Skill Library Standard. Use when cutting a release, bumping the plugin version, updating the changelog or release notes, or checking release readiness.
metadata:
  version: 0.1.0
  tier: universal
  audience: advanced
---

# askit-release

## Purpose
Cut a conformant release. Four modes: `version` computes the plugin version by the deterministic rule (one plugin version = the max component bump since the last release, sec 7.4); `changelog` promotes the `[Unreleased]` section to a dated version (Keep a Changelog); `notes` curates a user-facing `RELEASE-NOTES.md` distinct from the changelog (sec 10.6); `gate` runs the release-readiness checks (ADR 0022) so docs and version are correct before tagging. Authoring depth is in [references/release-workflow.md](references/release-workflow.md); the committed checklist is [`../../docs/internal/RELEASE.md`](../../docs/internal/RELEASE.md).

## When to use
When the user asks to cut or tag a release, bump the version, update the CHANGELOG or RELEASE-NOTES, or check whether the plugin is ready to release.

## version mode
1. Determine each component's bump since the last release (MAJOR / MINOR / PATCH) from its version and HISTORY.
2. The plugin version bump is the MAX of the component bumps (MAJOR beats MINOR beats PATCH, sec 7.4). Apply it to `library.json` (the version source of truth) and sync `package.json` (U9 keeps them equal).

## changelog mode
1. Promote `[Unreleased]` to a dated `[X.Y.Z]` section (Keep a Changelog) and leave a fresh empty `[Unreleased]`.

## notes mode
1. Curate `RELEASE-NOTES.md`: a user-facing, highlights-first entry for the version, distinct from the full CHANGELOG (sec 10.6 / Gold G5).

## gate mode
1. Run the release-readiness gate (ADR 0022 / `docs/internal/RELEASE.md`): version consistency (U9), a dated CHANGELOG section, RELEASE-NOTES present, README status current, generated surfaces drift-free (INDEX and manifests, G4), the conformance gate green (`node scripts/check.mjs`), no em-dashes or en-dashes (U10), and the manual Codex round-trip recorded. Stop with an actionable message on any failure.

## Scope
`library.json` is the version source of truth; `package.json` follows (U9). The release-readiness gate is built incrementally (ADR 0022): version + dash + CHANGELOG-section now, the full Advanced gate at Gold. Marketplace registration happens only at the first Gold tag (D8); release does not register before then.
