# v1.5.1 release plan - the batch-2 calibration patch

## Theme

A patch release that bundles the second eval-target corpus run's grading calibrations plus two reference deliverables. Every grading change is to HOW a check fires under outward grading (`--profile plain-plugin`), not to WHAT the Standard requires: a plugin graded the default way is unaffected, the toolkit self-grades Gold, the spine stays 29, and the Standard stays 0.11. Semver patch (precision fixes to existing checks, no new requirement).

## Scope

Bundles work that accumulated under `[Unreleased]` after v1.5.0:

- **ADR 0030 (#123):** U6 fenced-example + non-filesystem-scheme handling; U11 managed-connector warning; plain-plugin tier label.
- **ADR 0031 (#124):** U3 format-checks `name` only when it equals the directory; U4 advisory under plain-plugin, hard error under the default ladder.
- **ADR 0032 (this branch):** U6 ignores inline-code spans (single and multi-backtick); U12 skips non-live mermaid (pure `{{PLACEHOLDER}}` template slots and fence-aware HTML-commented blocks).
- **Comparison (#122):** the public comparison page + research corpus.
- **Token-usage dossier:** `docs/reference/token-usage-estimates.md`.

Corpus effect (C1, under `--profile plain-plugin`): 43 errors to 12 (the 12 a murkier example-link/output-path class, one a genuine link-rot defect, deliberately left flagged).

## Verification

- `npm test` = 388/388.
- `node scripts/check.mjs .` = Advanced, 0 errors / 0 warnings.
- Site builds (72 pages); route-parity and rendered-links pass (the new dossier route is registered).
- Three `codex:adversarial-review` passes on the Finding 5 work; all substantive findings resolved (one soundness hole, multi-backtick spans, a loose fence closer, the dossier wording), two theoretical 4+-backtick fence edges declined with documented rationale in ADR 0032.
- Manifests version-consistent at 1.5.1 (`library.json`, `package.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `manifest.generated.json`; INDEX.md regenerated).

## Runbook

1. Bump `library.json` + `package.json` to 1.5.1; regenerate native manifests + INDEX (`gen-manifest --target=all --write`, `gen-index --write`); `git checkout --` any CRLF-only churn (none this time - version-only diffs).
2. CHANGELOG `[Unreleased]` -> `[1.5.1]`; RELEASE-NOTES `## 1.5.1`; STATUS current-state.
3. PR `release/v1.5.1` -> protected `main`; admin squash-merge on CI green.
4. Tag `v1.5.1` at the squash commit; `release.yml` mints the GitHub release behind the 4-manifest version-consistency guard and the RELEASE-NOTES `## 1.5.1` extract.
5. Marketplace re-pin in `product-on-purpose/agent-plugins` (isolated clone): bump the `agent-skills-toolkit` entry sha + version to 1.5.1 AND registry `metadata.version` 1.15.0 -> 1.16.0; validate with `GITHUB_TOKEN=$(gh auth token) node scripts/validate-registry.mjs`.
6. Smoke-verify the install chain (marketplace.json -> pinned sha -> plugin.json 1.5.1).
7. Finalize STATUS (mark shipped).

## Rollback

A patch with no requirement change; a plugin graded the default way is byte-for-byte unaffected. If a calibration regresses real grading, revert the specific ADR's commit (each is independent) and cut v1.5.2; the Standard and spine are untouched, so no Standard-version rollback is involved.
