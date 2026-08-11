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
- `gha-action-outputs.mjs` - the outputs bridge behind `action.yml`; reads `check.mjs --json` and prints the `tier`/`errors`/`warnings` GITHUB_OUTPUT lines the published Action exposes, so the Action's own YAML holds no validation logic.
- `lib/` - the shared library used by the checks, generators, and gate.
- `standards-watch.mjs` - the upstream standards-watch CLI (compare the agentskills.io pin against what is current; prints, never writes).
- `tier-report.mjs` - the tier report (the satisfied tier plus the keyed burndown to the next).
- `verify-release-tag.mjs` - release-tag format guard (v1.11.0 pre-release review, Finding 1): rejects any `workflow_dispatch` tag input that is not exactly `vX.Y.Z`, including shell-metacharacter injection payloads; run by `.github/workflows/publish-npm.yml` before the tag is used anywhere else.
- `verify-tag-ancestry.mjs` - tag-reachability guard (v1.11.0 pre-release review, Finding 2): fails closed unless the checked-out commit is a proven ancestor of `origin/main` via `git merge-base --is-ancestor`; run by `.github/workflows/publish-npm.yml` before any live npm publish.
- `verify-tag-matches-manifests.mjs` - tag/version-manifest agreement guard: the four-manifest version comparison pulled out of `.github/workflows/publish-npm.yml`'s inline `run:` block and into a portable script (Standard sec 4.4); collects every disagreement rather than stopping at the first.
