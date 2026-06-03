---
title: "Cut a release"
description: "Promote the changelog, curate notes, compute the version, and check readiness (Standard sec 4.3, 7.4, 10.6; ADR 0022)."
audience: engineer
level: intermediate
---

# How to cut a release

Promote the changelog, curate notes, compute the version, and check readiness (Standard sec 4.3, 7.4, 10.6; ADR 0022).

## 1. Compute the version

Invoke `askit-release` (version mode). It takes the max component bump since the last release (MAJOR beats MINOR beats PATCH, sec 7.4), applies it to `library.json`, and syncs `package.json` (U9).

## 2. Promote the changelog and curate notes

`askit-release` (changelog mode) promotes `[Unreleased]` to a dated `[X.Y.Z]`. `askit-release` (notes mode) writes the user-facing `RELEASE-NOTES.md` entry (distinct from the changelog).

## 3. Run the readiness gate

`askit-release` (gate mode), or the checklist in `docs/internal/RELEASE.md`: version consistency, a dated CHANGELOG section, RELEASE-NOTES present, README status current, generated surfaces drift-free, conformance gate green, no em/en dashes, and the Codex round-trip recorded. Tag only when it passes.

## Marketplace

Register only at the first Gold `v1.0.0` tag (D8). A pre-Gold release is a labeled `0.x`.

## See also

- [`askit-release` reference](../reference/askit-release.md)
- [release-workflow](../../skills/askit-release/references/release-workflow.md)
- [RELEASE.md checklist](../internal/RELEASE.md)
