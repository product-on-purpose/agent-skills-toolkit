# 0022 - Release readiness and documentation discipline

## TL;DR
- **Decision:** Every tagged release passes a **deterministic release-readiness gate** that hard-fails unless README, CHANGELOG, RELEASE-NOTES, the architecture/decision docs, and the generated index/manifests are present, current, and version-consistent. The `askit-release` skill performs the updates automatically and the gate enforces them in CI, so the maintainer never has to ask for or hand-verify release docs.
- **Why:** The maintainer wants release documentation to be dependable and automatic, not a thing they remember to request. A self-hosting "validated example" must make its own release hygiene machine-checkable, the same way it makes conformance machine-checkable.
- **Status:** Accepted (2026-05-30).

- **Date:** 2026-05-30
- **Deciders:** maintainer (product-on-purpose)
- **Builds on:** ADR 0021 (docs strategy), STANDARD sec 4.3 (release gates), 7.4 (deterministic versioning), 10.6 (RELEASE-NOTES vs CHANGELOG), Gold G4 (generated index/manifests) and G5 (curated RELEASE-NOTES).

## Context

The release cadence (RELEASE-PLAN v0.2 Section 5) tags a public `0.x` at every wave boundary, so release-doc discipline runs many times, not once. The maintainer's requirement: README, CHANGELOG, RELEASE-NOTES, architecture, and the other release documents must be **dependably added to the plan and updated in the repo for each release without the maintainer mentioning it or validating it.** "Dependable" on this project means deterministic and gated, not a reminder.

## Decision outcome

### The release-readiness gate (a deterministic check, run by CI and by `askit-release`)

A new aggregate check, `scripts/checks/release-ready.mjs` (tier: Advanced, runs at release time; conditional - only on a release PR or tag), fails the release unless ALL hold:

1. **Version consistency:** `library.json.version` == `package.json.version` == the git tag == the CHANGELOG section being released. (Reuses the version-equality check from Wave A.)
2. **CHANGELOG:** a dated section exists for the version being released (the `[Unreleased]` content has been promoted), Keep a Changelog format.
3. **RELEASE-NOTES.md:** exists and has a curated, user-facing entry for the version (distinct from CHANGELOG, sec 10.6 / G5).
4. **README currency:** the README "Status" block matches the declared tier + version (drift = error).
5. **Generated surfaces:** `INDEX.md` and the native manifests are regenerated and drift-free (G4); no hand-edits.
6. **Architecture + decisions present and fresh:** `docs/explanation/architecture-overview.md` and `architecture-detailed.md` exist; every ADR carries its `## TL;DR` (ADR 0021 convention); any decision made in the release is recorded as an ADR.
7. **Docs build:** the Astro Starlight site builds cleanly (the deploy workflow's build step) and the Diataxis quadrants are non-empty (docs-presence).
8. **All tier-applicable conformance checks green** (the existing `check.mjs` gate).

The gate is the union of small deterministic checks (the project's existing model), so any failure names the offending file and the fix, and reproduces locally with one command (sec 4.4 parity).

### `askit-release` does the work, the gate proves it

`askit-release` (already planned) owns the *doing*: promote `[Unreleased]` to a dated CHANGELOG section, curate RELEASE-NOTES from it, regenerate `INDEX.md` + manifests, refresh the README status block, compute the version by the deterministic `max(component bump)` rule (sec 7.4), and confirm the architecture/ADR docs are current. The release-ready gate then *proves* it. The maintainer runs one command (or it runs in the release PR); they neither request nor validate the docs.

### The committed checklist

`docs/internal/RELEASE.md` is the human-readable, committed release checklist that mirrors the gate one-to-one, so the automated checks and the written procedure never diverge. It is the single place a maintainer (or an agent) looks to cut a release.

## Consequences

**Positive:** release docs become a hard precondition, not a hope; the cadence stays trustworthy across many `0.x` tags; the toolkit dogfoods release hygiene as a machine-checkable thing (a differentiator); the maintainer is freed from remembering or policing it.

**Negative / cost:** `release-ready.mjs` plus the docs-presence and version-equality checks are real build work (bounded; they reuse the existing check model); some checks (RELEASE-NOTES, architecture docs, docs-site) only become enforceable once those artifacts exist, so the gate is built incrementally and switched to error severity per item as each artifact lands.

## Implementation notes (by wave)

- **Wave A:** version-equality check (built now); stub `docs/internal/RELEASE.md`; CHANGELOG-section presence check.
- **Wave B+ (per `0.x` tag):** README-status drift check; INDEX/manifest drift (already exists, wire into release gate); ADR TL;DR-presence check.
- **Wave E (Gold):** RELEASE-NOTES (G5) + architecture overview/detailed presence + docs-site build + docs-presence flip to error; `release-ready.mjs` becomes the full Advanced-tier release gate.

## Provenance

Maintainer requirement (2026-05-30): rigid, dependable CI + release checklist so README, CHANGELOG, RELEASE-NOTES, architecture, and other docs are dependably updated for each release without the maintainer mentioning or validating it.
