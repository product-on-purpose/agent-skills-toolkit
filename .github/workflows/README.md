---
title: ".github/workflows - folder guide"
---

# .github/workflows

The CI and release automation: the conformance gate and a non-deploying site build on every PR, the GitHub Pages deploy, and the tag-driven release.

## Inventory

- `ci.yml` - the PR and push gate: the conformance run on a Node `[22.12.0, 24]` matrix, a Windows run, `npm audit`, a non-deploying site build, and the gating validator-parity job.
- `codeql.yml` - CodeQL static analysis (javascript-typescript suite, advanced setup); the committed file is the configuration source of truth, not the repository Settings toggle.
- `deploy-pages.yml` - builds the Astro site and deploys it to GitHub Pages.
- `publish-npm.yml` - the workflow_dispatch-only npm publish (dry-run by default; never fires on a tag push).
- `release.yml` - the tag-driven release: re-runs the gate and `release-ready`, then publishes the GitHub release.
- `vendor-watch.yml` - monthly re-verification of the pinned vendor claims; opens an issue rather than editing anything, because deciding what a vendor change MEANS is an ADR.
