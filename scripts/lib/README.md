---
title: "scripts/lib - folder guide"
---

# scripts/lib

The shared library the checks, generators, and gate import: findings, frontmatter parsing, fs helpers, plugin loading, the check registry, and tier mapping.

## Inventory

- `action-pin-watch.mjs` - the deterministic half of action-pin-watch: the `uses:` parser, the per-pin verdict table, and the exit-code split that makes a label disagreement blocking and a behind pin advisory. Imports nothing at all, so the whole decision table is testable with no network.
- `advisory-score.mjs` - scoreAdvisory(): the seeded-defect precision/recall harness and its thin CLI (F3 R-AQ-2). Scores an already-written advisory result; dispatches no model.
- `audit-report.mjs` - classifyAudit(): the dependency-audit verdict as a pure function (#310). `npm audit` exits 1 for BOTH "you have a high-severity advisory" and "npm was down", so the exit status cannot tell the two apart; this reads the report BODY instead, because a successful audit always carries `metadata.vulnerabilities` and every outage shape observed - a 400 on the retiring `/security/audits/quick` endpoint, a 503 on `/security/advisories/bulk`, a refused connection - carries none of it while wording its error differently every time. Classifying on the report's presence rather than on npm's error text is what makes it hold against an outage shape nobody here has seen yet. Blocks at a threshold with an index `>=`, so `critical` blocks a `high` threshold, and an unrecognised threshold REFUSES rather than silently gating nothing.
- `config.mjs` - loadConfig() over the optional askit.config.json (F3 gate config).
- `craft-review.mjs` - the craft-review SAFE/JUDGMENT partitioner, phase-2 eligibility, and the consent-gated applier (ADR 0037).
- `eval-run-aggregate.mjs` - the eval-run record half: skeletons to eval-runs.md rows plus the dossier's measured range.
- `eval-run.mjs` - the deterministic eval-run half: pin verification, path normalization, the npm script seam, and the record skeleton.
- `findings.mjs` - finding() and the SEVERITY and PROVENANCE enums.
- `frontmatter.mjs` - parseFrontmatter() over YAML frontmatter.
- `fs-utils.mjs` - filesystem helpers (relPath and friends).
- `load-plugin.mjs` - loadPlugin() that builds the check context from a plugin root, plus looksLikePlugin(), the shared plugin shape test.
- `marketplace/` - the marketplace evaluation scope (ADR 0039): catalogue reading, member resolution, the cross-member analyses, and the collection orchestrator. Kept as a delimited subfolder so it travels as a unit if the Standard and runner relocate.
- `md-escape.mjs` - escapeMdCell(): the one Markdown table-cell escape, backslashes before pipes.
- `migrate-report.mjs` - migrateReport(): the migration (gap-by-tier) report object, a staged current-to-target bring-to-conformance plan.
- `profiles.mjs` - the built-in gate profiles (askit-library, plain-plugin, house-style).
- `prose-metrics.mjs` - measureText() over a markdown page: stacked sentences, heavy parentheticals, overlong paragraphs, and the mechanical vocabulary rules. Used by `doc-style-report.mjs`, never by a check. Sentence length is deliberately not the signal: the corpus already measures plain at a 12-word median and still read as hard, because the defect is one sentence carrying several ideas with its reason buried in brackets.
- `fetch-members.mjs` - fetchAtSha() and fetchMembers(): check marketplace members out at the shas their catalogue pins, into one directory the marketplace scope can resolve. Deliberately `init` + `fetch --depth 1 <sha>` rather than `clone`, because a clone brings a branch TIP and the tip is not what the catalogue pins - fetching the sha makes "graded at the pin" true by construction. A failed fetch is a RESULT, never a throw: somebody else's outage, rename or private repository is not a fact about this repository, and the caller degrades one row rather than failing.
- `tier-scope.mjs` - TIER_SCOPE_SENTENCE and LIMITATIONS_URL (RS-E3): the ONE canonical wording for what a tier does and does not certify, and where the long version lives. `limitations.md` and `conformance-and-tiers.md` always said it; nothing that PRESENTED a tier ever linked them, so the concession never travelled with the claim. It lives here rather than beside the generators because `sarif-render.mjs` ships in the npm tarball and cannot import a deploy-time module - and the SARIF a consumer's Security tab renders is the surface furthest from this repository's own docs, so it is where an unqualified tier claim would travel furthest unaccompanied.
- `registry.mjs` - the ordered CHECKS array, runAllChecks(), REQ_IDS, and provenanceByReq().
- `release-notes-section.mjs` - extractSection(): the one implementation of "find this version's `## <version>` section in RELEASE-NOTES.md", ported from the awk that used to live inline in `release.yml`. Shared by the pre-tag gate and the post-tag release-body step so the two cannot disagree about one file (E57). Accepts CRLF and LF, returns LF.
- `release-ready.mjs` - the deterministic half of release-ready: the gate list, which exit codes block, and the one override (unreachability only, never a gone-or-stale claim and never a disagreeing pin label). Pure, so the decision table is testable without a tag or a network.
- `release-report.mjs` - releaseReport(): the release-readiness report object, a deterministic go / no-go verdict.
- `report-meta.mjs` - the per-reqId explanation table (why-it-matters, fix prompt, effort) the evaluation report renderer joins at render time.
- `report-render.mjs` - renderMarkdown() and renderHtml(): the pure designed-report renderer over the evaluate() report object.
- `resolve-config.mjs` - resolveFindings(): profile + per-rule override + suppressions + published-verdict clamp, then the Standard ceiling last (ADR 0044).
- `sarif-render.mjs` - renderSarif(): a pure SARIF 2.1.0 serialization of runGate()'s findings, one reportingDescriptor per check (carrying its provenance) and one result per non-off finding.
- `standard-ceiling.mjs` - the ADR 0044 post-resolution ceiling: activeConstraints() over `since` and `until`, by severity rank.
- `standard-gate.mjs` - SINCE_BY_REQ, the reqId -> introduction-version map the ceiling resolves against (ADR 0027).
- `standard-version.mjs` - Standard-version arithmetic (parseStandard, compareStandard, isAfter).
- `standards-watch.mjs` - the deterministic upstream watch (STANDARD.md sec 6): pin reading, structural surface extraction, material/review/cosmetic classification, and the report, ADR-skeleton, and re-pin renderers. Write-incapable by construction.
- `stated-counts.mjs` - the one "stated count" parser: a boundary-aware integer token, thousands-separator normalization, and matchAll-backed extractors (extractLabeledCounts, extractTestCountClaims).
- `suppressions.mjs` - the baseline matcher (reqId + file glob + message substring).
- `tier.mjs` - the reqId-to-tier mapping and tier ordering.
- `vendor-agent-fields.mjs` - the vendor's field list for plugin-shipped agents, shared by U14 and the marketplace A6 reading (ADR 0045).
- `vendor-hook-handlers.mjs` - the per-agent hook handler-type support table (RS-C2, Standard 0.16): which `hooks.json` handler types actually EXECUTE on each target agent, and which are accepted by the parser and then skipped. Claude runs all five; Codex runs `command` and `mcp_tool` and **parses `prompt` and `agent` then skips them, silently** - no error, no warning, no runtime signal, so the gate is the only place an author can learn their hook never ran. Vendor-cited rather than house: the Codex half is pinned as claim `cx-hook-handler-support` and re-verified by `vendor-watch` on every run, so a widened or narrowed support set is reported rather than left to rot here. Also owns `targetsCodex()`, which accepts either signal - the `agent-targets` DECLARATION or an emitted `.codex-plugin` manifest - because a plugin can legitimately be at either lifecycle point and the author most wants the finding BEFORE the emit.
- `vendor-watch.mjs` - the deterministic half of vendor-watch: the claim verdict table, the freshness window, and the exit contract. Pure, so the whole decision table is testable offline.
