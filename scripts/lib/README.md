---
title: "scripts/lib - folder guide"
---

# scripts/lib

The shared library the checks, generators, and gate import: findings, frontmatter parsing, fs helpers, plugin loading, the check registry, and tier mapping.

## Inventory

- `config.mjs` - loadConfig() over the optional askit.config.json (F3 gate config).
- `craft-review.mjs` - the craft-review SAFE/JUDGMENT partitioner, phase-2 eligibility, and the consent-gated applier (ADR 0037).
- `eval-run.mjs` - the deterministic eval-run half: pin verification, path normalization, the npm script seam, and the record skeleton.
- `eval-run-aggregate.mjs` - the eval-run record half: skeletons to eval-runs.md rows plus the dossier's measured range.
- `findings.mjs` - finding() and the SEVERITY and PROVENANCE enums.
- `frontmatter.mjs` - parseFrontmatter() over YAML frontmatter.
- `fs-utils.mjs` - filesystem helpers (relPath and friends).
- `load-plugin.mjs` - loadPlugin() that builds the check context from a plugin root.
- `migrate-report.mjs` - migrateReport(): the migration (gap-by-tier) report object, a staged current-to-target bring-to-conformance plan.
- `profiles.mjs` - the built-in gate profiles (askit-library, plain-plugin, house-style).
- `registry.mjs` - the ordered CHECKS array, runAllChecks(), REQ_IDS, and provenanceByReq().
- `release-report.mjs` - releaseReport(): the release-readiness report object, a deterministic go / no-go verdict.
- `report-meta.mjs` - the per-reqId explanation table (why-it-matters, fix prompt, effort) the evaluation report renderer joins at render time.
- `report-render.mjs` - renderMarkdown() and renderHtml(): the pure designed-report renderer over the evaluate() report object.
- `resolve-config.mjs` - resolveFindings(): profile + per-rule override + suppressions + published-verdict clamp.
- `suppressions.mjs` - the baseline matcher (reqId + file glob + message substring).
- `standard-gate.mjs` - the ADR 0027 standard-aware downgrade: SINCE_BY_REQ and applyStandardDowngrade().
- `standard-version.mjs` - Standard-version arithmetic (parseStandard, compareStandard, isAfter).
- `tier.mjs` - the reqId-to-tier mapping and tier ordering.
