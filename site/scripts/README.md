---
title: "site/scripts - folder guide"
---

# site/scripts

The Astro site build-time tooling: the generated Pattern S docs generator and the clause-14.11 link, route, and untracked guards.

## Inventory

- `check-generated-untracked.mjs` - asserts the generated docs tree stays gitignored (R-SITE-2).
- `check-rendered-links.mjs` - the clause-14.11 rendered-link guard.
- `check-route-parity.mjs` - the clause-14.11 route-parity guard.
- `gen-docs-site.mjs` - emits the public docs/ tree into the gitignored Pattern S content collection.
- `route-manifest.txt` - the committed baseline of published routes.
