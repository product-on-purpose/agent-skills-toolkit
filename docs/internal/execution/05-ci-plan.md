---
title: "CI evolution plan"
description: "Ten hardening changes to ci.yml, release.yml, and the Dependabot config landing in the R1 v1.7.0 window"
status: draft
last-updated: "2026-07-06"
---

# CI evolution plan

**What this delivers and why it matters (plain language).** The three GitHub Actions workflows that guard this repo are correct but spartan: they run tests and check conformance, but they leave a gap between the Node version the repo claims to support and the one it actually proves, they ignore security advisories in dependencies until someone notices, and they retry every pull request redundantly if you push twice. This plan closes those gaps with ten focused changes, all landing as one or two hygiene PRs inside the R1 (v1.7.0 "trust and craft") window. The result is a CI system that is faster on warm caches, provably correct on the declared Node floor, secure against dependency supply-chain risk, and cheaper to operate because redundant runs cancel themselves.

The one invariant this plan preserves above all else: **no validation logic lives in YAML.** Every check that matters runs as a `node scripts/` invocation orchestrated by the workflows; a contributor can reproduce any CI failure locally with the same command. This property is specified in Standard section 4.1 and 4.4, encoded in the comments at the top of ci.yml and release.yml, and must survive every change below unchanged.

## Current state inventory

| Workflow | Jobs | Notes |
|---|---|---|
| ci.yml | `validate`, `build-site` | `validate`: no npm cache, no Node matrix, single pin via `.nvmrc` (24). `build-site`: npm cache on `site/package-lock.json`. No concurrency group. No audit step. No coverage. |
| release.yml | `release` | Re-runs conformance gate + version guard + publishes via `softprops/action-gh-release@v3` (tag-pinned, not SHA-pinned). No npm cache. |
| deploy-pages.yml | `build`, `deploy` | npm cache on `site/package-lock.json`. Concurrency group `pages` (cancel-in-progress: false) already present. |

No `.github/dependabot.yml` exists. No CodeQL workflow exists.

## The ten changes

All changes land in the R1 v1.7.0 release window unless noted otherwise. They are bundled into at most two PRs: one YAML-only hygiene PR (changes 1-8; this is R1's PR-0 in [04-releases/R1-v1.7.0-trust-and-craft.md](04-releases/R1-v1.7.0-trust-and-craft.md)) and the H1 (hygiene batch) feature PR that also adds the README-version assertion (change 10; R1's PR-2). Change 9 is a covenant, not a code change. R1's release exit gate carries a CI-hardening acceptance line pointing back at this plan.

---

### 1. Dependabot for npm and GitHub Actions

**What.** Add `.github/dependabot.yml` with three entries: the `npm` ecosystem for the repo root, the `npm` ecosystem for `site/` (the Astro site has its own `package.json` and lock file), and the `github-actions` ecosystem for all three workflow files.

**Why.** Without Dependabot the `yaml` dependency, the `softprops/action-gh-release` action, and the `actions/*` family all drift silently until a vulnerability or a breaking change surfaces at an inconvenient time. Automated weekly PRs keep the surface current with minimal effort.

**Exact mechanics.** Set `schedule.interval: weekly` for all three. Group minor and patch bumps under a single PR per ecosystem (`groups: minor-and-patch: patterns: ["*"] update-types: ["minor", "patch"]`) so routine bumps arrive as one PR rather than a flood. Major bumps remain separate PRs.

**Rollback.** Delete `.github/dependabot.yml`. No runtime effect; Dependabot PRs can be closed individually.

---

### 2. Node version matrix on the validate job

**What.** Extend the `validate` job in ci.yml to a matrix over `[22.12.0, 24]` using `actions/setup-node@v5` with `node-version:` (not `node-version-file:`) on the matrix leg.

**Why.** `package.json` declares `engines: { "node": ">=22.12.0" }` but the current single-pin run only proves behavior on Node 24. The floor claim is untested. A matrix run proves both the floor and the current pin, so the published compatibility claim is actually true.

**Alternative considered.** Raising the floor to 24 in `package.json` would eliminate the matrix. This was not chosen because the floor is a documented public contract and raising it is a breaking change requiring a Standard-version bump under ADR 0027 (standard-aware gate). The matrix costs one extra CI minute per PR and is the lower-friction option.

**Exact mechanics.** Replace the `node-version-file: .nvmrc` step with a matrix declaration (`strategy.matrix.node: [22.12.0, 24]`) and `node-version: ${{ matrix.node }}`. The `.nvmrc` file remains unchanged; it controls local development and the `build-site`/`deploy-pages` jobs.

**Rollback.** Revert the matrix declaration; both legs collapse back to the single `.nvmrc` pin.

---

### 3. npm audit at high severity (blocking)

**What.** Add `npm audit --audit-level=high` as a step in the `validate` job, after `npm ci`, before the unit tests.

**Why.** A YAML-only workflow that never checks its own dependency tree is incomplete security hygiene for a public repo. Blocking at `high` (not `critical`) is the right threshold: critical-only misses high-severity supply-chain paths, and blocking at `moderate` generates noise on transitive-only advisories.

**Recommendation: blocking, not report-only.** A report-only step produces output that is easy to ignore and easy to forget. The purpose of the step is to catch vulnerabilities before they land on the default branch; making it advisory defeats that purpose. If a legitimate high-severity advisory fires in a dependency with no fix available, the correct response is to add a targeted `npm audit --audit-level=high --ignore ...` temporary exception with a comment and a linked issue, not to demote the gate.

**Exact mechanics.** Single step: `run: npm audit --audit-level=high`. No flags beyond `--audit-level`. Fails CI on CVSS high or critical.

**Rollback.** Remove the step. The gate reverts to its previous behavior.

---

### 4. Concurrency group on ci.yml

**What.** Add a top-level `concurrency` block to ci.yml: `group: ci-${{ github.ref }}`, `cancel-in-progress: true`.

**Why.** Without a concurrency group, pushing a fixup commit while a PR run is in progress queues a second run in parallel. For a repo where CI takes ~2 minutes per run this is waste, not a feature. Canceling the stale run saves runner time and avoids a race between a stale result and a fresh one appearing in the same PR status.

**Contrast with deploy-pages.yml.** That workflow already has `concurrency: group: pages, cancel-in-progress: false` - the opposite policy - because a mid-deploy cancel would leave the Pages site in an inconsistent state. For CI (a pure read-only gate), cancel-on-new-push is always safe.

**Exact mechanics.** Add the `concurrency:` key at the workflow root (not per-job). Group string uses `github.ref` so feature branches do not cancel each other's runs.

**Rollback.** Remove the `concurrency:` block. Previous behavior restored immediately.

---

### 5. npm cache on validate and release jobs

**What.** Add `cache: npm` and `cache-dependency-path: package-lock.json` to the `actions/setup-node@v5` step in the `validate` job (both matrix legs) and in the `release` job.

**Why.** `build-site` and `deploy-pages` already cache `site/package-lock.json`. The root `validate` and `release` jobs do not, so every run reinstalls from scratch. The root `package.json` has only one production dependency (`yaml: ^2.5.0`) and the test runner is built-in, but caching is still faster than fetching and the infrastructure is already in use.

**Exact mechanics.** Same pattern already in `build-site`: `cache: npm` + `cache-dependency-path: package-lock.json`. The Node matrix legs share the cache key for their respective lock file, which is correct because the lock file is the same regardless of which Node version runs.

**Rollback.** Remove the `cache:` and `cache-dependency-path:` keys. No correctness effect.

---

### 6. SHA-pin softprops/action-gh-release

**What.** Replace `softprops/action-gh-release@v3` in release.yml with a full 40-character commit SHA plus an inline comment naming the version and the pin date.

**Why.** A tag reference like `@v3` is mutable: the action author can silently replace it with a different commit. A SHA reference is immutable. For a step that publishes a GitHub release with `contents: write` permission, this is the highest-value single change for supply-chain security in the current workflows.

**First-party actions (`actions/*`) stay tag-pinned.** The GitHub-owned `actions/checkout`, `actions/setup-node`, `actions/upload-pages-artifact`, and `actions/deploy-pages` are maintained by GitHub under a transparency commitment that makes tag mutation detectable. For third-party actions from other publishers, SHA-pinning is the standard practice. Dependabot (change 1) will keep the SHA current as new releases ship, so the pin does not become a maintenance burden.

**Exact mechanics.** Run `gh api repos/softprops/action-gh-release/git/refs/tags/v3` (or equivalent) to resolve the current tag to a SHA at the moment the PR is authored. Format: `softprops/action-gh-release@<full-sha> # v3 pinned YYYY-MM-DD`. Add the `github-actions` ecosystem to Dependabot so the pin stays current automatically.

**Rollback.** Revert to `@v3`. Slightly less secure but functionally identical.

---

### 7. c8 coverage as a report-only step

**What.** Add a coverage step in the `validate` job that runs `npx c8 --reporter=text-summary node --test` and always exits 0 (report-only, no threshold gate).

**Recommendation: include it.** The cost is near-zero: c8 wraps the existing `node --test` invocation, no additional install required, and the summary prints in the CI log. Recording coverage per-run gives the maintainer a trend even without a hard gate. Introducing a threshold gate later is a one-line change once a baseline is established.

**Why no gate now.** Setting a coverage threshold without a baseline is arbitrary. The threshold can be added in a later release once a few run records establish a real floor.

**Exact mechanics.** Step after `Unit tests`: `run: npx c8 --reporter=text-summary node --test || true`. The `|| true` makes the step advisory without suppressing the coverage output. A dedicated `check:coverage` script entry in `package.json` is not added at this stage; that is a meaningful public contract change and belongs in a future scope.

**Rollback.** Remove the step.

---

### 8. CodeQL (advanced setup via a committed workflow file)

**What.** Add `.github/workflows/codeql.yml` - GitHub's "advanced setup" variant, meaning a committed workflow file in the repo. (The alternative, "default setup", is a repository-Settings toggle configured outside the repo; it is not used here because an in-repo file matches the boundary rule and keeps the configuration reviewable.) Target the `javascript-typescript` query suite.

**Recommendation: include it.** This repo is public and primarily JavaScript. The committed workflow is small, runs on push and schedule, and posts results to the Security tab. For a public repo with a `contents: write` action in its release workflow, zero-maintenance static analysis is worth having. This is recorded as a decision-register item at first use.

**Decision-register item.** The choice to enable CodeQL (or not) is logged in [07-decision-register.md](07-decision-register.md) as a program-level decision. If the maintainer opts out, the rationale is recorded there rather than left implicit.

**Exact mechanics.** A single workflow file using `github/codeql-action/init@v3` (SHA-pinned per change 6's logic) and `github/codeql-action/analyze@v3`. Triggers: `push: branches: [main]`, `pull_request: branches: [main]`, `schedule: cron: '0 3 * * 1'` (weekly Monday 03:00 UTC). Permissions: `security-events: write`, `actions: read`, `contents: read`.

**Rollback.** Delete the workflow file. No effect on any other job.

---

### 9. The INVARIANT: no validation logic in YAML (covenant)

This is not a code change. It is the standing rule that governs every past and future modification to the three workflow files.

**Statement.** No CI workflow may implement a validation rule of its own. Checks, assertions, conformance gates, format tests, link checks, and route-parity tests all live as `node scripts/` invocations. The YAML invokes those scripts; it does not duplicate or replace them. A contributor with only Node and npm installed can run every CI check locally and get the same result.

**Why it matters.** Validation logic embedded in YAML is invisible to the local developer, invisible to the conformance spine, and breaks portability across CI providers. The spec files at `docs/internal/release-plans/plan_v1.6.0/F2-eval-run-pipeline/SPEC.md` rely on this invariant: the eval-run pipeline ships as a portable `node scripts/run-eval.mjs` invocation, not a bespoke Actions workflow.

**Scope of the invariant.** It covers the `validate`, `build-site`, and `release` jobs in ci.yml and release.yml. It does not cover the deploy mechanism in `deploy-pages.yml`, where GitHub Pages upload and deploy steps have no portable local equivalent.

---

### 10. README-version consistency assertion in validate

**What.** Add a step in the `validate` job that asserts the version string displayed in README.md matches the `version` field in `library.json` (the canonical source of truth, matching R1's H1.1 spec; the release guard keeps the four manifests equal, so a single source suffices). This step is specified and owned by H1 (hygiene batch) in R1 (v1.7.0).

**Why it belongs here.** M7 (success metric 7 in [02-prd.md](02-prd.md)) requires that README drift become impossible silently. A CI assertion is the mechanical enforcement. Without it, a bump PR that forgets to update the README badge passes CI and ships silently stale.

**Operationalize, do not duplicate.** The full assertion design (what to match, how to handle badge URLs vs prose mentions, the exact script name) is owned by the H1 spec in [04-releases/R1-v1.7.0-trust-and-craft.md](04-releases/R1-v1.7.0-trust-and-craft.md). This plan records only that the resulting `node scripts/` invocation runs as a `validate` step and that it must satisfy the INVARIANT in change 9: the assertion lives in the script, not inline in YAML.

**Rollback.** Remove the step. README drift becomes possible again.

---

## What is deliberately NOT changed

**OS matrix stays ubuntu-only.** The scripts under `scripts/` are pure Node with no OS-specific behavior (all paths use `path.join`, no shell-specific constructs). A macOS or Windows matrix leg would test OS-level file permissions and path separators that the scripts do not exercise. The cost is non-trivial (macOS runners are billed at a higher rate), and the signal-to-noise ratio is low. If a future check introduces OS-sensitive logic, an OS matrix can be scoped to that check alone.

**No artifact retention changes.** The only artifact the CI system produces is the Pages upload in `deploy-pages.yml`; `ci.yml` and `release.yml` produce no build artifacts. Artifact retention policies are not applicable and are not added.

**No merge queue.** A merge queue requires branch protection settings that the solo-maintainer model of this repo does not currently support cleanly. This is tracked as a future option in [09-backlog.md](09-backlog.md).

**deploy-pages.yml is untouched.** It already caches correctly and carries a concurrency group. Its permissions are already scoped (`pages: write`, `id-token: write`). It does not execute any validation logic of its own. No changes are needed.

## Change log

| Date | Change |
|---|---|
| 2026-07-06 | Created. |
