# v1.5.2 release plan - the eval-run patch

## Theme

A patch release whose every change came out of the historical evaluation-run record (`docs/internal/eval-runs/`, eleven recorded advisory runs, seventeen sensor readings) and its observe -> verify-against-ground-truth -> calibrate loop. Two calibrations, a doc-fix batch, the record/methodology/dossier deliverables, and a render fix. No requirement changes: pass/fail verdicts do not move under the default ladder, the spine stays 29, the Standard stays 0.11. Semver patch (precision fixes to existing behavior, no new requirement).

## Scope

Bundles work that accumulated under `[Unreleased]` after v1.5.1:

- **ADR 0033 (#133):** the U5 description-scorer recalibration against the eval-run corpus (warnings 98 -> 18 across five corpora; survivors verified as the intended catch).
- **ADR 0034 (#135):** component scope resolves gate config (`--profile` / `--mode` honored instead of silently dropped; one root for findings and config so file-scoped suppressions waive the gate exit). Landed behind two Codex adversarial-review rounds (round 1 caught the root mismatch; round 2 a missing exit-code assertion).
- **Doc-fix batch (#135):** askit-reviewer runs targeted `evaluate.mjs`; the behavioral derive-from-description fallback documented (askit-evaluate + askit-quality-grader); behavioral `summary` counter semantics fixed in the public reference; askit-build-skill's declared chain has an explicit delegate step. Touched components 0.1.1.
- **Eval-run record + methodology (#127/#129/#131/#134):** `docs/internal/eval-runs/` (record, conventions, METHODOLOGY) and backlog E11 (dependable eval-run pipeline).
- **Token dossier MEASURED (#127/#129/#131/#134):** eleven measured advisory rows (33k-103k per run) and the model-tier lessons including the completed same-target triple.
- **Responsive tables (#131):** report table cards scroll at <=900px; golden snapshots regenerated (CSS-only).

## Verification

- `npm test` = 401/401.
- `node scripts/check.mjs .` = Advanced, 0 errors / 0 warnings.
- ADR 0034 landed behind two `codex:adversarial-review` rounds; all findings resolved, one suggestion declined with recorded rationale.
- Manifests version-consistent at 1.5.2 (`library.json`, `package.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `manifest.generated.json`; INDEX.md regenerated; version-only diffs, no CRLF churn).

## Runbook

1. Bump `library.json` + `package.json` to 1.5.2; regenerate native manifests + INDEX (`gen-manifest --target=all --write`, `gen-index --write`); `git checkout --` any CRLF-only churn (none - version-only diffs).
2. CHANGELOG `[Unreleased]` -> `[1.5.2]`; RELEASE-NOTES `## 1.5.2`; STATUS current-state; this release doc.
3. Release PR -> CI green (validate + build-site) -> admin squash merge.
4. Tag `v1.5.2` at the squash commit; `release.yml` mints the GitHub release behind the 4-manifest version-consistency guard (extracts the `## 1.5.2` RELEASE-NOTES section).
5. Marketplace re-pin in `product-on-purpose/agent-plugins` (isolated clone): entry sha -> the squash commit, entry version 1.5.1 -> 1.5.2, registry `metadata.version` 1.19.0 -> 1.20.0, registry CHANGELOG entry added (keep it complete); `GITHUB_TOKEN=$(gh auth token) node scripts/validate-registry.mjs`; PR + merge.
6. Smoke-verify the chain (marketplace.json -> tag sha -> plugin.json 1.5.2); STATUS finalize PR; memory update.
