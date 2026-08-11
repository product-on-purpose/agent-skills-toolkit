---
title: "scripts - folder guide"
---

# scripts

The portable, zero-runtime-framework Node tooling: the conformance gate, the tier report, the evaluator, and the check, generator, and shared-library modules they run on.

## Inventory

- `check.mjs` - the conformance gate entry point (runs every check, reports the tier and burndown).
- `check-readme-version.mjs` - README version drift guard; asserts the shields.io version badge in README.md equals the version in library.json.
- `check-release-counts.mjs` - release-time stated-test-count drift guard (backlog E27); runs the suite itself and fails on any hand-written test count that disagrees with the TAP-reported total.
- `checks/` - the per-requirement check modules.
- `eval-run.mjs` - the eval-run pipeline CLI (grade a pinned corpus target, then aggregate the day's runs into the tracked record).
- `evaluate.mjs` - the structured evaluator behind askit-evaluate.
- `generators/` - the artifact generators (INDEX, manifests, AGENTS.md).
- `lib/` - the shared library used by the checks, generators, and gate.
- `standards-watch.mjs` - the upstream standards-watch CLI (compare the agentskills.io pin against what is current; prints, never writes).
- `tier-report.mjs` - the tier report (the satisfied tier plus the keyed burndown to the next).
