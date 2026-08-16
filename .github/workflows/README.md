---
title: ".github/workflows - folder guide"
---

# .github/workflows

The CI and release automation: the conformance gate and a non-deploying site build on every PR, the GitHub Pages deploy, and the tag-driven release.

## Inventory

- `ci.yml` - the ci.yml config.
- `codeql.yml`
- `vendor-watch.yml` - monthly re-verification of the pinned vendor claims; opens an issue rather than editing anything, because deciding what a vendor change MEANS is an ADR. - CodeQL static analysis (javascript-typescript suite, advanced setup).
- `deploy-pages.yml` - the deploy-pages.yml config.
- `publish-npm.yml` - the workflow_dispatch-only npm publish (dry-run by default; never fires on a tag push).
- `release.yml` - the release.yml config.
