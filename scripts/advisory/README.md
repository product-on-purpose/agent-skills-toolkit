---
title: "scripts/advisory - folder guide"
---

# scripts/advisory

The advisory screen modules (ADR 0063): deterministic, model-free signals that report beside the tier
and never gate it. `scripts/lib/advisory-registry.mjs` declares ADV1-ADV4's metadata (advisoryId, title,
category, provenance) and runs whichever modules are registered here over a check context.

No screen module ships in this folder yet. ADV1-ADV4 exist today only as metadata in
`scripts/lib/advisory-registry.mjs`, with an empty module list; `scripts/check.mjs` already runs that
empty list beside the spine on every gate, so the layer, the `--no-advisory` flag, the
`advisoryLayer`/`advisoryFindings` report fields, and the partition that keeps advisory findings out of
`findings[]` all exist and are tested before the first module lands. A later change adds one module per
ADV ID here, plus ADV3's pattern catalogue as data, following the same `{ meta, check(ctx) }` shape every
`scripts/checks/*.mjs` module already uses.

## Inventory

(empty - no screen modules yet; the first one lands in a later change)
