# v1.0.0 marketplace launch - implementation plan

> Execution order for the [v1.0.0 marketplace launch](./RELEASE-PLAN.md), keyed to the [`SPEC.md`](./SPEC.md) requirement IDs. Two PRs across two repos, with a forced tag-dependency between them.

## Phase 0 - branch (DONE)

- `git checkout -b release-v1.0.0 main` in `agent-skills-toolkit` (main @ `08207b8`, the Astro conformance merge; clean).
- Packet authored under `docs/internal/release-plans/plan_v1.0.0/marketplace-launch/`.

## Phase 1 - toolkit content (one PR: WS A + B + C + D)

Order matters: edit the source-of-truth files, then regenerate, then gate.

### 1a. README reposition + tier legibility (WS A; R-README-1..6)

- Rewrite the hero `tagline` and "What it is" to lead with the lifecycle: **start -> grow -> manage -> level up** an advanced cross-agent plugin; keep the "two things" (Standard + toolkit) but subordinate them to the lifecycle story.
- Keep an explicit **beginner on-ramp** (build your first skill / start a plugin) and an **advanced/leveling-up** path (add subagents, commands, hooks, workflows, CI, governance; climb Bronze -> Silver -> Gold).
- Replace the dense "The tier model" prose with a **comparison table + tight per-tier cards** (certifies / requires / why / who for). Source the structure from the `readme-reframe-panel` workflow synthesis; verify every claim against `library.json` and `scripts/`.
- Update the badges: version `0.3.0` -> `1.0.0`; "tier Gold (Advanced)" stays; the Standard reference to `v0.9`.
- Update the "Status" section and the "Quick start" (install) per WS C below.

### 1b. Version bump + generated artifacts (WS B; R-VER-1..8)

1. Edit `library.json`: `version` -> `1.0.0`, `standard` -> `0.9`.
2. Edit `package.json`: `version` -> `1.0.0`.
3. Regenerate:
   - `node scripts/generators/gen-manifest.mjs . --write --target=all`
   - `node scripts/generators/gen-index.mjs . --write`
4. Edit `CHANGELOG.md`: rename `## [Unreleased]` to `## [1.0.0] - 2026-06-02`; add the launch bullets (installable via marketplace; Standard 0.9 in library.json; release CI; README reposition). Leave a fresh empty `## [Unreleased]` scaffold above it.
5. Edit `RELEASE-NOTES.md`: turn "Unreleased - public Gold-grade preview" into the **1.0.0** notes (what you can do, highlights, the install line); remove "the formal v1.0.0 Gold release tag is pending".
6. Edit `STATUS.md`: `Installable: not yet` -> installable at v1.0.0; move the "cut the v1.0.0 tag + marketplace registration" item from Remaining to Done-by-this-release; bump the version line to `1.0.0` (Standard `v0.9`).

### 1c. Install docs (WS C; R-DOCS-1..5)

- `README.md` Quick start: add the two-step install (add marketplace by path, install by `@product-on-purpose` identity) above/with the existing `node scripts/check.mjs` grade-what-you-have flow. Drop "not yet installable; marketplace registration planned at the first Gold-tagged release (v1.0.0)".
- `site/src/content/docs/getting-started.md`: add an **Install** section with the same commands.
- `site/src/content/docs/index.mdx`: add an install affordance (a hero action or a card).

### 1d. Standardized CI (WS D; R-CI-1..4)

- Add `.github/workflows/release.yml`:
  - `on: push: tags: ['v*']`; `permissions: contents: write`.
  - Checkout `@v5`; setup-node `@v5` with `node-version-file: .nvmrc`.
  - **Guard step:** derive `TAG=${GITHUB_REF_NAME#v}`; read `version` from `package.json`, `library.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`; fail with `::error::` if any differs from `TAG`.
  - Create the release with `softprops/action-gh-release@v3` (pin a major), `body_path: RELEASE-NOTES.md`, `draft: false`.
- Do not touch `ci.yml` / `deploy-pages.yml` (R-CI-3).

### 1e. Local verification (gate before push)

- `node scripts/generators/gen-manifest.mjs . --write --target=all` and `gen-index` are idempotent (re-run -> no diff).
- `node scripts/check.mjs` -> `Tier: Advanced (no blockers detected)`, 0/0.
- `node scripts/tier-report.mjs --json` -> `"tier":"advanced"`, `"blocked":{}`.
- `npm test` -> all pass.
- `(cd site && npm ci && npm run build)` -> builds; run the two `site/scripts/` guards on `dist`.
- `git diff --name-only` -> only the intended files.

## Phase 2 - adversarial verification (WS verification)

Run the verification workflow (multi-dimension reviewers, each adversarial): README accuracy + no-dashes + terminology; version completeness across all 5 files; generated-file drift; `release.yml` guard soundness (does it actually fail on a mismatch?); install-command accuracy vs the marketplace's real identity; site build + link integrity; `RELEASE-NOTES`/`CHANGELOG` distinctness (G5). Fix every confirmed finding; re-gate.

## Phase 3 - toolkit PR + tag (R-SEQ-1)

1. Commit (Conventional Commit), push `release-v1.0.0`, open the PR to `main`. Confirm `CI` (validate + build-site) green.
2. Merge (maintainer admin-squash per the repo's flow).
3. On the merge commit: `git tag v1.0.0 && git push origin v1.0.0`. `release.yml` runs the guard and mints the GitHub release from `RELEASE-NOTES.md`.
4. Capture the tag commit sha for Phase 4: `git rev-parse v1.0.0^{commit}`.

## Phase 4 - marketplace registration (separate PR in agent-plugins; WS E; R-MKT-*)

1. In `E:\Projects\product-on-purpose\agent-plugins`: `git checkout -b add-agent-skills-toolkit main`.
2. Edit `.claude-plugin/marketplace.json`: append the `agent-skills-toolkit` entry (https `url` source, `sha` = the Phase 3 tag commit, `version` `1.0.0`, `strict: true`); bump `metadata.version` 1.2.0 -> 1.3.0.
3. Edit `README.md` (add the plugins-table row, status `listed`) and `CHANGELOG.md`.
4. Validate: `GITHUB_TOKEN=$(gh auth token) node scripts/validate-registry.mjs` -> exit 0.
5. Commit, push, open the PR; confirm `validate-registry` CI green; merge.
6. **Install smoke:** `/plugin marketplace add product-on-purpose/agent-plugins` then `/plugin install agent-skills-toolkit@product-on-purpose`; confirm the skills load.

## Done-criteria

The [`RELEASE-PLAN.md` sec 11](./RELEASE-PLAN.md) checklist, all boxes green. Update `STATUS.md` and write a session log on completion.

## Notes / decisions captured during execution

- **README framing** was produced by a 3-way judge panel (workflow `readme-reframe-panel`) - lifecycle / audience-journey / capability-ladder framings, critiqued for accuracy and clarity, synthesized into the shipped "What it is" + tier model. The panel caught the "zero-dependency" overclaim (`package.json` has `yaml`), so the accurate "one runtime dependency, a YAML parser" wording is used in the README, `getting-started.md`, and the site `catalog.md`.
- **Verification** ran a 5-reviewer adversarial workflow (`v1-launch-verification`) over both repos. CI soundness: clean. Fixes applied: the `[1.0.0]` CHANGELOG self-contradictions (carried-forward bullets that still said "library.json targets 0.8" / "sec 4.1 states >=20" / "the v1.0.0 tag is a separate step"); a RELEASE-NOTES `(G1-G7)` -> `(G1-G6)` consistency nit; and the marketplace `CONTRIBUTING.md` `github`-shorthand example -> the https `url` form (R4a).
- **In-flight honesty decision.** The reviewers correctly flagged that present-tense "installable" is not yet true (no tag, no registry entry). Resolution: STATUS.md (the live-truth doc) states the launch is **in flight** and lists the registry PR as Remaining; the released-state docs (README / RELEASE-NOTES / CHANGELOG) describe v1.0.0's install capability and reach `main` only when the maintainer runs the coordinated launch. So nothing false lands publicly before it is true.
- **Execution boundary.** A pushed tag + public GitHub release is irreversible and outward-facing, so this pass drives both PRs to green and hands the maintainer an exact runbook (below); it does **not** cut the tag or merge. See `LAUNCH-RUNBOOK.md`.
- **Captured tag sha:** _(fill after `git push origin v1.0.0`: `git rev-list -n1 v1.0.0`)_
