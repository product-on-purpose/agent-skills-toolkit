---
title: "schemas - folder guide"
---

# schemas

JSON Schemas for this toolkit's own machine-readable output. These are published contracts: a schema
here describes a shape external tooling can validate against, and a breaking change to one needs its
own versioned file (`report.v2.json`, never an in-place edit of `report.v1.json`) per ADR 0063 sec 5.

## Inventory

- `report.v1.json` - the JSON Schema for the report object `scripts/evaluate.mjs` builds for plugin and
  component scope (ADR 0063 sec 5: "the report object becomes versioned and additive"). Covers
  `schemaVersion`, `run`, `checks[]`, `components[]`, `blockedFindings[]`, `advisoryLayer`,
  `advisoryFindings[]` and `health{}`, alongside the pre-existing `findings[]`/`byRule`/`summary`
  shape. Deliberately does NOT cover the `--json` output of `scripts/check.mjs` (`buildJsonReport()`),
  which is a separate contract validated by `validateReport()` in `scripts/gha-action-outputs.mjs`
  (ADR 0063 sec 5), nor the marketplace collection report, which report.v1 does not describe.
