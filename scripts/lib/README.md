---
title: "scripts/lib - folder guide"
---

# scripts/lib

The shared library the checks, generators, and gate import: findings, frontmatter parsing, fs helpers, plugin loading, the check registry, and tier mapping.

## Inventory

- `advisory-score.mjs` - scoreAdvisory(): the seeded-defect precision/recall harness and its thin CLI (F3 R-AQ-2). Scores an already-written advisory result; dispatches no model.
- `config.mjs` - loadConfig() over the optional askit.config.json (F3 gate config).
- `craft-review.mjs` - the craft-review SAFE/JUDGMENT partitioner, phase-2 eligibility, and the consent-gated applier (ADR 0037).
- `eval-run.mjs` - the deterministic eval-run half: pin verification, path normalization, the npm script seam, and the record skeleton.
- `eval-run-aggregate.mjs` - the eval-run record half: skeletons to eval-runs.md rows plus the dossier's measured range.
- `findings.mjs` - finding() and the SEVERITY and PROVENANCE enums.
- `frontmatter.mjs` - parseFrontmatter() over YAML frontmatter.
- `fs-utils.mjs` - filesystem helpers (relPath and friends).
- `load-plugin.mjs` - loadPlugin() that builds the check context from a plugin root, plus looksLikePlugin(), the shared plugin shape test.
- `marketplace/` - the marketplace evaluation scope (ADR 0039): catalogue reading, member resolution, the cross-member analyses, and the collection orchestrator. Kept as a delimited subfolder so it travels as a unit if the Standard and runner relocate.
- `migrate-report.mjs` - migrateReport(): the migration (gap-by-tier) report object, a staged current-to-target bring-to-conformance plan.
- `profiles.mjs` - the built-in gate profiles (askit-library, plain-plugin, house-style).
- `registry.mjs` - the ordered CHECKS array, runAllChecks(), REQ_IDS, and provenanceByReq().
- `release-report.mjs` - releaseReport(): the release-readiness report object, a deterministic go / no-go verdict.
- `report-meta.mjs` - the per-reqId explanation table (why-it-matters, fix prompt, effort) the evaluation report renderer joins at render time.
- `md-escape.mjs` - escapeMdCell(): the one Markdown table-cell escape, backslashes before pipes.
- `report-render.mjs` - renderMarkdown() and renderHtml(): the pure designed-report renderer over the evaluate() report object.
- `resolve-config.mjs` - resolveFindings(): profile + per-rule override + suppressions + published-verdict clamp, then the Standard ceiling last (ADR 0044).
- `sarif-render.mjs` - renderSarif(): a pure SARIF 2.1.0 serialization of runGate()'s findings, one reportingDescriptor per check (carrying its provenance) and one result per non-off finding.
- `suppressions.mjs` - the baseline matcher (reqId + file glob + message substring).
- `standard-ceiling.mjs` - the ADR 0044 post-resolution ceiling: activeConstraints() over `since` and `until`, by severity rank.
- `vendor-agent-fields.mjs` - the vendor's field list for plugin-shipped agents, shared by U14 and the marketplace A6 reading (ADR 0045).
- `standard-gate.mjs` - SINCE_BY_REQ, the reqId -> introduction-version map the ceiling resolves against (ADR 0027).
- `standards-watch.mjs`
- `vendor-watch.mjs` - the deterministic half of vendor-watch: the claim verdict table, the freshness window, and the exit contract. Pure, so the whole decision table is testable offline. - the deterministic upstream watch (STANDARD.md sec 6): pin reading, structural surface extraction, material/review/cosmetic classification, and the report, ADR-skeleton, and re-pin renderers. Write-incapable by construction.
- `standard-version.mjs` - Standard-version arithmetic (parseStandard, compareStandard, isAfter).
- `stated-counts.mjs` - the one "stated count" parser: a boundary-aware integer token, thousands-separator normalization, and matchAll-backed extractors (extractLabeledCounts, extractTestCountClaims).
- `tier.mjs` - the reqId-to-tier mapping and tier ordering.
