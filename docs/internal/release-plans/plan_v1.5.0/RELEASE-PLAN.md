# v1.5.0 release plan - outward grading

> The plan and runbook for v1.5.0, the **outward-grading** release: the changes that came out of the first eval-target corpus run, which make the gate legitimate and usable against plugins the toolkit does not own.
> Created 2026-06-09. Owner: maintainer (jprisant), with Claude (Opus 4.8). Source of truth: [ADR 0029 (reclassify U2/U5 as house)](../../decisions/0029-reclassify-u2-u5-as-house-provenance.md), the corpus-run findings (`_local/audit/anchor-runs/2026-06-09/FINDINGS.md`, gitignored). Live status: [`docs/internal/STATUS.md`](../../STATUS.md).
> Unlike the v1.0.0-v1.3.0 packets, this is a small, post-hoc release of two already-built and already-merged changes, so it is one document, not a multi-feature packet.

## 1. Goal

v1.0.0-v1.4.1 made the toolkit a self-proving Gold reference and gave it a configurable, Standard-aware gate and a designed report. v1.5.0 is the first release driven by **pointing that gate outward**. The eval-target corpus run (batch 1: `anthropics/skills`, `obra/superpowers`, `wshobson/agents`, `lst97/claude-code-sub-agents`) confirmed the gate works at scale and catches real defects, but also that the default outward-grading experience was dominated by non-portable askit findings: Anthropic's own reference repo showed 23 findings, almost all house scaffolding rather than defects. v1.5.0 ships the two changes that fix that, so a third-party grade is a short, credible list of real issues.

The invariant: **no plugin's conformance grade changes.** Both changes affect only how the gate is invoked (a new flag) and how two findings are classified (provenance). A plugin graded under the default `askit-library` profile scores exactly as it did in 1.4.1. The spine stays 29; the Standard stays 0.11; there is no new check.

## 2. Scope (what ships)

| Change | What | Origin | PR |
|---|---|---|---|
| `--profile` flag | `check.mjs` and `evaluate.mjs` accept `--profile <name>` to grade a plugin under a chosen profile (e.g. `plain-plugin`) without writing `askit.config.json` into its tree. Mirrors `--mode`; unknown profile exits 2. | corpus finding A-1 | #118 |
| U2/U5 reclassification | `U2` (root `AGENTS.md` anatomy) `objective -> house`; `U5` (description scorer) `vendor-cited -> house`. Both added to `plain-plugin`'s off-set; both still fire under `askit-library`. A new invariant test asserts the `plain-plugin` off-set equals the house-provenance set. | corpus findings A-2, A-3; [ADR 0029](../../decisions/0029-reclassify-u2-u5-as-house-provenance.md) | #119 |

Net user-facing effect: `node scripts/check.mjs <third-party-plugin> --profile plain-plugin` surfaces only portable defects. Anthropic's `skills` repo drops from 23 findings (default) to 1 (the real `U3` description-over-spec-cap defect).

## 3. Not in scope (deferred, recorded so the next pass picks them up)

- **U5 scorer recalibration.** ADR 0029 reclassifies U5 as house, which removes it from third-party grading, but the scorer itself still clusters good descriptions at 0.65 (it likely saturates). Recalibrating the scoring function is a separate investigation, tracked in ADR 0029's follow-up note.
- **Corpus batch 2.** The per-component-type exemplars (`anthropics/claude-code/plugins`: hooks, output styles), the 222-plugin official marketplace (`anthropics/claude-plugins-official`, the renderer's real scale + the intentionally-incomplete `session-report` sub-fixture), and the MCP-heavy targets (`levnikolaevich`, C-series) remain to run. Anchor list: `_local/notes/eval-target-anchor-list.md`.
- **Gemini emitter.** Still the named, unbuilt v1.x cross-agent target; not part of v1.5.0.

## 4. Verification (done before tagging)

- Suite 358/358 (was 346 at v1.4.1: +7 for `--profile`, +5 for the reclassification, fewer when counted against the right baseline; see CHANGELOG).
- Gate Advanced 0/0 on the toolkit itself (the prover still proves itself).
- Guard test: the default `askit-library` profile still fires U2 and U5 (no conformance change), and the `plain-plugin` off-set equals the house-provenance set (no drift).
- End-to-end on a real target: `anthropics/skills --profile plain-plugin` surfaces only the real U3 defect.
- Version consistency across the four release-guarded manifests (`package.json`, `library.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`) plus `manifest.generated.json` and `INDEX.md`; `RELEASE-NOTES.md` carries a `## 1.5.0` section.
- Dash sweep clean.

## 5. Release runbook

1. Bump `library.json` + `package.json` to `1.5.0`; regenerate `.claude-plugin` / `.codex-plugin` / `manifest.generated.json` / `INDEX.md` (`gen-manifest --target=all`, `gen-index`).
2. Promote `CHANGELOG.md` `[Unreleased] -> [1.5.0]`; add the `RELEASE-NOTES.md` `## 1.5.0` section; update `STATUS.md`.
3. Verify (sec 4): version consistency, gate 0/0, suite green, RELEASE-NOTES section present, dash sweep.
4. Open the release-bump PR vs protected `main`; merge on green (admin squash).
5. Tag `v1.5.0` at the merged commit and push; `release.yml` enforces the version-consistency guard across the four manifests, extracts the `## 1.5.0` RELEASE-NOTES section, and publishes the GitHub release (Latest).
6. Re-pin the marketplace: in an isolated `agent-plugins` clone, set the `agent-skills-toolkit` entry to the `v1.5.0` commit and version `1.5.0`, bump registry `metadata.version` `1.13.0 -> 1.14.0`, validate (`scripts/validate-registry.mjs` with `GITHUB_TOKEN`), PR + merge.
7. Smoke-verify the resolution chain: `marketplace.json -> commit -> plugin.json 1.5.0`.
8. Finalize `STATUS.md` (record v1.5.0 shipped) via a follow-up PR.

## 6. Rollback

Both changes are additive and reversible. `--profile` is a new optional flag (omitting it reproduces 1.4.1 behavior exactly). The U2/U5 reclassification changes no default grade, so a revert (restoring `objective`/`vendor-cited` and removing them from `HOUSE_REQIDS`) is safe and the `house-provenance.test.mjs` invariant catches a partial revert. If a marketplace re-pin regresses, re-pin to the prior `v1.4.1` commit; the GitHub release can be marked not-latest without unpublishing.
