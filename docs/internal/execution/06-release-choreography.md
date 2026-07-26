---
title: "Per-release cut runbook"
description: "The exact ordered choreography used to cut every release from v1.7.0 through v1.10.0, including the staged re-pin boundary"
status: draft
last-updated: "2026-07-06"
---

# Per-release cut runbook

This runbook is used four times, once per planned release (v1.7.0 through v1.10.0). Follow the steps in order; each step states its own verification before you proceed to the next. The underlying checklist lives in [`docs/internal/RELEASE.md`](../RELEASE.md); the proven v1.6.0 choreography is in [`docs/internal/release-plans/plan_v1.6.0/README.md`](../release-plans/plan_v1.6.0/README.md). This runbook operationalizes both for the program.

**What this delivers and why it matters.** Each release in this program ships to a public marketplace where users install agent-skills-toolkit by cloning a pinned commit. A release that lands with inconsistent version numbers, a missing RELEASE-NOTES section, or a stale marketplace pin either breaks installation silently or misrepresents the toolkit's capabilities to anyone who reads the grade. This runbook makes every cut reproducible: the `release.yml` version-consistency guard enforces the constraint in CI, but the sequence here ensures nothing reaches the tag step unless it was already verified to land cleanly. The staged re-pin section respects the program's hard boundary that this repo never writes to agent-plugins; the cut is fully autonomous within this repo, and the marketplace update waits for a maintainer.

---

## Step 1: Pre-cut gate

All of the following must be true before the bump commit is written. None is skippable.

- `npm test` exits 0 (all tests pass; note the current count as the baseline for the release entry).
- `node scripts/check.mjs .` exits 0, Advanced 0/0. The gate never weakens for a release.
- A 4-lens Claude adversarial panel (false-PASS, false-FAIL, determinism, contract-fidelity) has been run on every substantive PR merged since the last release, and every finding has been answered. No open finding remains.
- `CHANGELOG.md` `## [Unreleased]` is complete: every merged change is listed, grouped under `### Added`, `### Changed`, or `### Fixed`.
- Any ADR that implements features in this release is in `Proposed` state and ready to be ratified in the bump commit.
- The release plan packet `docs/internal/release-plans/plan_vX.Y.0/` exists; `RELEASE-PLAN.md` is drafted.

**Gate command:** `npm test && node scripts/check.mjs .` both exit 0 in one local run.

---

## Step 2: Version bump (surgical edit)

Bump the `"version"` field in exactly two files using `Edit` (never `node -e JSON.stringify` - it reformats the entire file, producing unintended diff noise):

- `library.json` top-level `version` field
- `package.json` top-level `version` field

Regenerate the native manifests and the index:

```
node scripts/generators/gen-manifest.mjs --target=all --write
node scripts/generators/gen-index.mjs --write
```

**Native manifest rule.** On a version bump the regenerated `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` carry the new version and must be committed. Use `git checkout -- .claude-plugin/plugin.json .codex-plugin/plugin.json` only when the diff is purely end-of-line churn with no version field change.

**Verification:** `grep -r '"version"' library.json package.json .claude-plugin/plugin.json .codex-plugin/plugin.json` must print the same version string on all four lines.

---

## Step 3: README version-refresh (H1 hygiene - new from v1.7.0)

Before the bump PR opens, assert that README badges and the "Status" prose match `library.json`. This step is introduced by H1 (hygiene batch) in v1.7.0; the exact invocation is `node scripts/check-readme-version.mjs`, specified by H1.1 in [04-releases/R1-v1.7.0-trust-and-craft.md](04-releases/R1-v1.7.0-trust-and-craft.md) and also wired into `npm test`. From v1.7.0 onward the assertion runs identically for every release.

If the assertion fails, fix the README drift before proceeding - do not open the bump PR with a stale badge.

**Verification:** the script exits 0. The README "Status" section and version badge reflect the new version and tier.

---

## Step 4: Document promotion

All of the following belong in the bump commit (alongside the version edit and regenerated manifests):

- **CHANGELOG.md.** Rename `## [Unreleased]` to `## [X.Y.0] - YYYY-MM-DD`. Add a blank `## [Unreleased]` section above it.
- **RELEASE-NOTES.md.** Add a `## X.Y.0` section with curated user-facing highlights. The `release.yml` `awk` extractor matches on this exact heading; if the section is absent when the tag is pushed, the workflow fails before publishing a release.
- **STATUS.md.** Update the "Current state" block to the new version, test count, and date. Add the cut entry.
- **RELEASE-HISTORY.md.** Append the release entry.
- **Implementing ADRs.** Ratify any ADR that is `Proposed` and was fully implemented in this release (status field `Proposed` -> `Accepted`). The pattern: ADR 0035 (manifest-vs-disk skill-registration completeness) was ratified in the v1.6.0 bump commit.
- **Release plan packet.** Finalize `docs/internal/release-plans/plan_vX.Y.0/RELEASE-PLAN.md` - a thin doc that records the actual shipped set vs. the planned set and links back to this packet. The packet is not a gate artifact; it is a history artifact.

**Verification:**
- `grep '^\[Unreleased\]' CHANGELOG.md` returns the blank placeholder.
- `grep "^## X\.Y\.0" RELEASE-NOTES.md` finds the new section.
- Every implementing ADR file reads `status: Accepted`.

---

## Step 5: PR, merge, tag, and GitHub release

1. Open a PR against protected `main` titled `release: vX.Y.0 - <theme>`. Paste the CHANGELOG section as the description body.
2. Wait for CI green (`validate` and `build-site` in `ci.yml`).
3. Merge: `gh pr merge --squash --admin`. Record the squashed commit SHA.
4. Tag at the squashed commit: `git tag vX.Y.0 <sha> && git push origin vX.Y.0`.
5. `release.yml` fires on the tag push. It re-runs `node scripts/check.mjs`, enforces the version-consistency guard (the tag version must equal `version` in `package.json`, `library.json`, `.claude-plugin/plugin.json`, and `.codex-plugin/plugin.json`), extracts the `## X.Y.0` section from `RELEASE-NOTES.md`, and publishes the GitHub release via `softprops/action-gh-release`.
6. Verify the release is live and **Latest** before proceeding to Step 6.

**Verification commands:**

```
git log --oneline -3
git ls-remote origin refs/tags/vX.Y.0
gh release view vX.Y.0 --json isLatest,tagName,publishedAt
```

---

## Step 6: Staged re-pin (boundary rule - this program never writes to agent-plugins)

Create `docs/internal/release-plans/plan_vX.Y.0/repin-instructions.md` containing the following exact steps. The maintainer applies these when ready; the orchestrator never executes them.

1. **Isolated clone.** `git clone <agent-plugins-url> E:/tmp/agent-plugins-repin-vX.Y.0`
2. **Edit the marketplace entry.** In `.claude-plugin/marketplace.json`, find the `agent-skills-toolkit` entry. Set `sha` to the squashed commit SHA from Step 5. Set `version` to `X.Y.0`.
3. **Re-check live registry metadata.version before bumping it.** The registry `metadata.version` increments on any member re-pin, not only askit re-pins. It is never a simple `+1` from the prior askit re-pin. Run `gh api /repos/product-on-purpose/agent-plugins/contents/.claude-plugin/marketplace.json` to read the current value, then increment by 1.
4. **Add the registry CHANGELOG entry.** Append a `[metadata.version]` entry recording the askit re-pin. Past re-pins left gaps that required backfill in v1.5.0 and v1.5.2; keep the record complete.
5. **Validate.** `export GITHUB_TOKEN=$(gh auth token) && node scripts/validate-registry.mjs`
6. **Publish the re-pin (maintainer actions in the maintainer's repo).** Commit the clone's changes on a branch (`chore/repin-askit-vX.Y.0`), push, open a PR against `product-on-purpose/agent-plugins`, and merge it once the `validate-registry` CI check is green. The orchestrator never performs these steps.
7. **Smoke-verify install resolution (only after the re-pin PR merges).**
   ```
   gh api /repos/product-on-purpose/agent-plugins/contents/.claude-plugin/marketplace.json \
     | jq -r '.content' | base64 -d | jq '.plugins[] | select(.name=="agent-skills-toolkit") | {sha,version}'
   # must print the new sha and "X.Y.0"

   gh api "/repos/product-on-purpose/agent-skills-toolkit/contents/.claude-plugin/plugin.json?ref=<entry-sha>" \
     | jq -r '.content' | base64 -d | jq '.version'
   # must print "X.Y.0"
   ```

**This program's own verification ends here.** After Step 5, confirm three things with read-only gh api calls:

- Tag is live: `git ls-remote origin refs/tags/vX.Y.0` (non-empty).
- GitHub release is Latest: `gh release view vX.Y.0 --json isLatest`.
- Current marketplace pin: `gh api /repos/product-on-purpose/agent-plugins/contents/.claude-plugin/marketplace.json | jq -r '.content' | base64 -d | jq '.plugins[] | select(.name=="agent-skills-toolkit") | {sha,version}'` - expected to still show the previous release until the maintainer applies the instructions.

---

## Step 7: Post-cut

1. **STATUS finalize PR.** Update `docs/internal/STATUS.md` "Current state" to mark the release fully shipped; record the squashed commit SHA, the tag, and (once applied) the marketplace re-pin PR number.
2. **Wrap session.** Close the session with `jp-wrap-session` - the skill writes the structured session log to `docs/internal/session-logs/` with a continuation prompt so the next session resumes without re-deriving context.
3. **Memory update.** Update the memory index via `memory-recall` to reflect the shipped release, the new version, the test count, and any new sensor readings or ADRs the release produced.

---

## Rollback procedures

### Bad tag pushed to origin before the release publishes

```
git tag -d vX.Y.0
git push origin :refs/tags/vX.Y.0
```

Fix the error, then re-tag and re-push. `release.yml` re-runs on every tag push.

### release.yml fails

Diagnose in the Actions log and select the matching recovery path:

- **Version-consistency guard fails.** One of the four manifests does not match the tag. Run the Step 2 verification `grep` to find the mismatch. Fix the manifest in a new PR (`fix: vX.Y.0 manifest version drift`), merge, delete the old tag, and re-tag at the new squash SHA.
- **RELEASE-NOTES section missing.** The `awk` extractor found no `## X.Y.0` heading. Add the section, push to main, delete the tag, and re-tag at HEAD.
- **Conformance gate regresses.** This should not reach the tag step if the pre-cut gate passed. Diagnose the regression, fix it with a new PR, and restart from Step 1 with the new commit.

### Version mismatch discovered after merge but before tagging

Open a hotfix PR (`fix: vX.Y.0 manifest version drift`), squash-merge it, and tag at the corrected commit. Do not tag the original squash commit.

### GitHub release published against a wrong commit

Do not delete a published GitHub release. Open a new tag on the correct commit following `release.yml`'s guard rules, and delete the incorrect release through the GitHub UI only after confirming the replacement is live and Latest.

---

## Planned cuts

| Release | Theme | Headline deliverables | Implementing ADRs |
|---|---|---|---|
| **v1.7.0** | trust and craft | H1 (hygiene batch), SP1 (builder craft pass), F2 (eval-run pipeline; E11) | allocated at land |
| **v1.8.0** | deep builders, measured advisory | SP2 (deepen complex builders + golden/anti examples), F3 (advisory quality measurement), F5 (authoring token measurements), corpus batch 3, real `evals/` fixtures, U6 message wording fix (sensor reading 8) | allocated at land |
| **v1.9.0** | marketplace scope | Marketplace-scope evaluation (ADR-first; the headline), SP3 (coherent-plugin authoring journey) | allocated at land |
| **v1.10.0** | manage and studio | SP4 (Manage gaps: `askit-deprecate` removal automation + build-workflow step-orphan check, ADR-gated), GUI read-only studio slice; stretch riders E4 (SARIF output), E9 (provenance output contract) | allocated at land |

**Relocation interlock.** If the standards program in agent-plugins fires its B2 (PR-C: askit re-adopt) mid-program, pause, reconcile engine-adjacent code against the relocated runner path per `relocation-addendum.md`, and re-verify the `node scripts/check.mjs .` invocation in Step 1 reflects the new path before proceeding.

---

## Change log

| Date | Change |
|---|---|
| 2026-07-06 | Created. |
