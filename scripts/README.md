---
title: "scripts - folder guide"
---

# scripts

The portable, zero-runtime-framework Node tooling: the conformance gate, the tier report, the evaluator, and the check, generator, and shared-library modules they run on.

## Inventory

- `check.mjs` - the conformance gate entry point (runs every check, reports the tier and burndown).
- `checks/` - the per-requirement check modules.
- `evaluate.mjs` - the structured evaluator behind askit-evaluate.
- `generators/` - the artifact generators (INDEX, manifests, AGENTS.md).
- `lib/` - the shared library used by the checks, generators, and gate.
- `tier-report.mjs` - the tier report (the satisfied tier plus the keyed burndown to the next).
