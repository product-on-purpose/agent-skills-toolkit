---
title: "scripts - folder guide"
---

# scripts

The portable, zero-runtime-framework Node tooling: the conformance gate, the tier report, the evaluator, and the check, generator, and shared-library modules they run on.

## Inventory

- `check.mjs` - the conformance gate entry point (runs every check, reports the tier and burndown; `--json`/`--sarif`/`--gha` emit machine-readable serializations of the same result).
- `check-parity.mjs` - the first-party validator parity harness (ADR 0042): runs `claude plugin validate` and the skills-ref reference validator, round-trips every skill's `metadata.*` through the reference PARSER (not just the validator's exit code), and reports both validator identities and any pin skew. Report-only in this release; never gates.
- `check-readme-version.mjs` - README version drift guard; asserts the shields.io version badge in README.md equals the version in library.json.
- `check-release-counts.mjs` - release-time stated-test-count drift guard (backlog E27); runs the suite itself and fails on any hand-written test count that disagrees with the TAP-reported total.
- `checks/` - the per-requirement check modules.
- `eval-run.mjs` - the eval-run pipeline CLI (grade a pinned corpus target, then aggregate the day's runs into the tracked record).
- `evaluate.mjs` - the structured evaluator behind askit-evaluate.
- `gen-tier-badge.mjs` - the CI-generated tier badge: serializes the tier `tier-report.mjs` already computes plus the graded sha, the plugin's pinned Standard, and a date into a shields.io endpoint-badge JSON document; run by `.github/workflows/deploy-pages.yml`.
- `generators/` - the artifact generators (INDEX, manifests, AGENTS.md).
- `gha-action-outputs.mjs` - the outputs bridge behind `action.yml`; reads `check.mjs --json`, validates its shape (fails closed on a schema-incomplete report rather than defaulting), and prints the `tier`/`errors`/`warnings` GITHUB_OUTPUT lines the published Action exposes, so the Action's own YAML holds no validation logic.
- `gha-sarif-guard.mjs` - the SARIF artifact guard behind `action.yml` (v1.11.0 pre-release review, round 2): validates a completed `check.mjs --sarif` document's structural shape as its own signal, separate from exit-code agreement with the JSON gate, before `sarif-path` may be published; deletes the file on any rejection so a partial or disagreeing artifact never survives.
- `lib/` - the shared library used by the checks, generators, and gate.
- `standards-watch.mjs`
- `release-ready.mjs` - the release-blocking gate aggregate (review wave 2, H2): runs the conformance gate, the README drift guard, the release-count guard and `vendor-watch`, reports all four, and exits 1 if the tag must not be cut. Run by `release.yml` on the pushed tag and by `publish-npm.yml` on the candidate tree, so the checklist lines it replaced are enforced rather than remembered.
- `vendor-watch.mjs` - re-verifies every VENDOR CLAIM this repository asserts as fact against the live page; write-incapable, exits 1 when a claim is gone or stale and 2 when a page could not be read. - the upstream standards-watch CLI (compare the agentskills.io pin against what is current; prints, never writes).
- `tier-report.mjs` - the tier report (the satisfied tier plus the keyed burndown to the next).
- `verify-release-tag.mjs` - release-tag format guard (v1.11.0 pre-release review, Finding 1): rejects any `workflow_dispatch` tag input that is not exactly `vX.Y.Z`, including shell-metacharacter injection payloads. Run by `.github/workflows/publish-npm.yml` from a `trust-root/` checkout of protected `main` - never the candidate tag's own tree - before the tag is used anywhere else (round 2 fix: the candidate must not supply the code that checks it).
- `verify-tag-ancestry.mjs` - tag-reachability guard (v1.11.0 pre-release review, Finding 2): fails closed unless a commit is a proven ancestor of `origin/main` via `git merge-base --is-ancestor`. Run by `.github/workflows/publish-npm.yml` from the same `trust-root/` checkout, against the tag's resolved sha, before the candidate is checked out at all and before any live npm publish (round 2 fix: this is the trust root's own code proving the candidate, not the candidate proving itself).
- `verify-tag-matches-manifests.mjs` - tag/version-manifest agreement guard: the four-manifest version comparison pulled out of `.github/workflows/publish-npm.yml`'s inline `run:` block and into a portable script (Standard sec 4.4); collects every disagreement rather than stopping at the first. Takes `root` as a parameter, so `.github/workflows/publish-npm.yml` runs main's own copy (from `trust-root/`) with `root` pointed at the candidate's checked-out files - reading them as data rather than executing the candidate's own copy of this script.
