# Release checklist

> The committed, one-to-one mirror of the automated release-readiness gate (ADR 0022). An agent or maintainer cuts a release by following this; CI enforces every item so nothing here depends on anyone remembering it. `askit-release` performs the doing; the gate proves it.

## How releases work here

A public `0.x` tag ships at every wave boundary (RELEASE-PLAN v0.2 Section 5); `v1.0.0` is the Gold capstone. Each tag is a real, gate-green release. The release-readiness gate (`scripts/checks/release-ready.mjs`, built incrementally Wave A -> E) is a hard precondition: a release cannot be tagged until it passes.

## Checklist (each item is a gated check, not a reminder)

- [ ] **Version consistent** across `library.json`, `package.json`, the git tag, and the CHANGELOG section. (version-equality check, Wave A.)
- [ ] **CHANGELOG** has a dated section for this version (the `[Unreleased]` content promoted), Keep a Changelog format.
- [ ] **RELEASE-NOTES.md** has a curated, user-facing entry for this version, distinct from the CHANGELOG (sec 10.6 / G5).
- [ ] **README "Status"** matches the declared tier + version (drift = error).
- [ ] **INDEX.md + native manifests** regenerated and drift-free; no hand-edits (G4).
- [ ] **Architecture docs** (`docs/explanation/architecture-overview.md` + `architecture-detailed.md`) present and current.
- [ ] **Decisions** recorded: any decision made this release is an ADR carrying its `## TL;DR` (ADR 0021 convention).
- [ ] **Docs site** builds cleanly (Astro Starlight) and the Diataxis quadrants are non-empty.
- [ ] **All tier-applicable conformance checks green** (`node scripts/check.mjs`).
- [ ] **No em-dashes / en-dashes** anywhere in committed text (no-dashes check, Wave A).
- [ ] **Codex round-trip** run manually for this tag (Q-E gate): `CODEX_REQUIRED=1 npm test`; record the result in the release notes.

## One-command release (target)

`node scripts/release.mjs <version>` (or the `askit-release` skill) promotes the CHANGELOG, curates RELEASE-NOTES, regenerates INDEX + manifests, refreshes the README status, computes the version by the deterministic `max(component bump)` rule (sec 7.4), runs the release-readiness gate, and stops with an actionable message on any failure. Until that skill lands (Wave C), this checklist is run check-by-check via the individual scripts.

## Status of enforcement (incremental, per ADR 0022)

- **Wave A:** version-equality + no-dashes + CHANGELOG-section-presence checks live.
- **Wave B+:** README-status drift + INDEX/manifest drift (exists) + ADR TL;DR-presence wired into the release gate.
- **Wave E:** RELEASE-NOTES + architecture-presence + docs-site build + docs-presence flip to error; `release-ready.mjs` becomes the full Advanced release gate.
