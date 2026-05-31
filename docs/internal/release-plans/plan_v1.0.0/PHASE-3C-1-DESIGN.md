# Phase 3C-1 Design - Silver self-claim + milestone tag (v0.2.0)

> Design doc (2026-05-28). Canonical inputs: `STANDARD.md` (v0.8, on main), `RELEASE-PLAN.md` (Phase 3 / Q-A), the 3A/3B designs, the on-disk state of main after PR #49.
> Status: scope + outward-scope + version approved by maintainer 2026-05-28 (tag the Silver milestone as v0.2.0, repo stays private). Gitignored working doc.
> Phase 3 decomposition: 3A (Codex contract + Silver core, DONE) -> 3B (emission spine, DONE) -> **3C, split into 3C-1 (this doc: Silver self-claim) + 3C-2+ (the eight builders)**.

## Goal

The toolkit declares AND satisfies Silver. After 3B the only open convergent gap is S3 (the `components` index); S1/S2/S6 pass and S4/S5 are conditional-untriggered (no chaining/workflows). 3C-1 closes S3, bumps to v0.2.0, flips `library.json` to `tier: convergent`, proves S1-S6 gate green at the convergent ceiling, and tags the Silver milestone (`v0.2.0`, repo stays private per the maintainer).

This is the strategic Silver preview milestone (Q-A=C), minus the public flip (deferred to a deliberate separate step).

## Locked decisions (maintainer, 2026-05-28)

- **Decompose 3C: Silver-claim first (3C-1), then the eight builders (3C-2+).** The toolkit BECOMING Silver is separable from shipping the builder tools; Silver is a conformance grade the plugin earns by passing S1-S6, not by offering builders.
- **Outward scope:** land the claim on main AND tag an annotated `v0.2.0` marking the Silver milestone. Repo STAYS PRIVATE; no go-public (that is a later, separate, deliberate step).
- **Version:** `0.2.0` (minor bump for the Silver-tier milestone; the components stay at their own versions).
- **S4 orphan-detection completion + component-level per-target S6 -> deferred to 3C-2** (the builders track), because nothing exercises them until chaining/subagents exist.

## Architecture (the changes)

### 1. `library.json`

- Add `"version": "0.2.0"` (was `0.1.0`).
- Add `"tier": "convergent"` (was `universal`).
- Add the `components` index (closes S3). Shape per Standard sec 5.1, keyed by component type; for the toolkit, only `skills`:
  ```json
  "components": {
    "skills": [
      { "name": "askit-build-skill", "path": "skills/askit-build-skill/SKILL.md", "version": "<from skill frontmatter>", "tier": "universal", "status": "active" },
      { "name": "askit-evaluate",    "path": "skills/askit-evaluate/SKILL.md",    "version": "<from skill frontmatter>", "tier": "universal", "status": "active" }
    ]
  }
  ```
  The S3 check (`components-index.mjs`) enforces the `name` <-> on-disk correspondence (bidirectional). The `path`/`version`/`tier`/`status` fields are populated per the Standard schema; their exact values are read from each skill's `SKILL.md` frontmatter at build time.

### 2. Regenerate native manifests

Run `node scripts/generators/gen-manifest.mjs . --write --target=all`. This propagates `version: 0.2.0` into `manifest.generated.json` + `.claude-plugin/plugin.json` + `.codex-plugin/plugin.json`, and the new `tier: convergent` into `manifest.generated.json`. (U8 stays clean: name/version still agree across all three.)

### 3. The gate flips to the convergent ceiling (load-bearing)

`gateExitFromFindings` uses `ceilingIndex(declaredTier)`. With `tier: convergent`, the ceiling rises to convergent, so S1-S6 errors NOW count toward the gate (previously filtered out at the universal ceiling). After S3 closes and with S1/S2/S6 passing and S4/S5 untriggered, there are zero convergent errors, so `check.mjs` exits 0. `tier-report` reports `tier: convergent`, `satisfies: ["universal", "convergent"]`, `blocked: {}` (no advanced checks exist, so nothing blocks above convergent).

### 4. Seed tests (TDD red-green against the bump)

- `tests/unit/seed-blocked-convergent.test.mjs` currently asserts `blocked.convergent == [S3]` at `tier: universal`. Repurpose it (rename to `seed-silver.test.mjs` or update in place) to assert the new contract: `tier == "convergent"`, `satisfies` includes both `universal` and `convergent`, `blocked` has no convergent entries.
- `tests/unit/seed-bronze.test.mjs` asserts `tier == "universal"` + S3 blocked. Update its tier assertion to `convergent` and drop the S3-blocked expectation (or assert no convergent blockers).
- Order: update the assertions FIRST (they fail against the still-universal repo), THEN make the `library.json` changes (components index + tier bump), THEN watch them pass. This proves S1-S6 are all green before the convergent ceiling sticks.
- The `minimal-skill`-based tests (`tier-report.test.mjs`, `evaluate.test.mjs`, `check-runner.test.mjs`) are unaffected (that fixture declares universal and has no agent-targets).

### 5. Documentation (first-class, per standing requirement)

- `AGENTS.md` "Current state": retire the "declares `tier: universal` (Bronze)" + bootstrap-universal framing; state the toolkit now declares `tier: convergent` (Silver) and self-validates at Convergent in CI.
- `README.md` / `INDEX.md`: update the tier framing from Bronze to Silver where stated.
- `docs/explanation/conformance-and-tiers.md`: note the toolkit itself is now Convergent (the burndown reached empty).
- `CHANGELOG.md`: `[Unreleased]` entry for the Silver self-claim + the v0.2.0 milestone; move/mark the prior `[Unreleased]` entries under a `## [0.2.0]` heading at tag time (Keep a Changelog convention).

### 6. Tag the Silver milestone

Annotated tag `v0.2.0` with a message marking the Silver milestone ("Silver milestone - toolkit self-validates at Convergent"), pushed to origin. Repo stays private. A GitHub release is optional (private repo; collaborator-visible); the annotated git tag is the milestone marker. No go-public.

## File structure (3C-1 deliverables)

```
library.json                                  MODIFY - version 0.2.0, tier convergent, components index (S3)
.claude-plugin/plugin.json                    REGENERATED - version 0.2.0
.codex-plugin/plugin.json                     REGENERATED - version 0.2.0
manifest.generated.json                       REGENERATED - version 0.2.0, tier convergent
tests/unit/seed-blocked-convergent.test.mjs   UPDATE/RENAME - convergent-satisfied contract
tests/unit/seed-bronze.test.mjs               UPDATE - tier convergent, no S3 blocker
AGENTS.md                                      UPDATE - current state = Silver/convergent
README.md                                      UPDATE - tier framing
INDEX.md                                       UPDATE - tier framing
docs/explanation/conformance-and-tiers.md     UPDATE - toolkit is now Convergent
CHANGELOG.md                                   entry + [0.2.0] heading at tag
(git)                                          annotated tag v0.2.0, pushed; repo stays private
```

## Self-validation impact

After 3C-1, on main:
- `npm test` green; `node scripts/check.mjs` exit 0 (now at the convergent ceiling); `node scripts/evaluate.mjs .` exit 0.
- `node scripts/tier-report.mjs --json` -> `{ "tier": "convergent", "satisfies": ["universal", "convergent"], "blocked": {} }`. The Silver burndown is empty - the toolkit IS a conformant Silver plugin.
- Tagged `v0.2.0`; repo private.

## Exit gate (3C-1)

- `library.json` declares `tier: convergent`, `version: 0.2.0`, and a `components` index that S3 accepts.
- All three native/resolved manifests regenerated to 0.2.0; U8 clean.
- S1-S6 all pass at the convergent ceiling; `check.mjs` + `evaluate .` exit 0; `tier-report` shows convergent satisfied, empty blocked.
- Seed tests updated to the convergent-satisfied contract; full suite green.
- Docs (AGENTS.md, README, INDEX, conformance) reflect Silver; CHANGELOG entry + `[0.2.0]` heading.
- Annotated `v0.2.0` tag pushed; repo still private.
- No em-dash / en-dash anywhere in the diff.

## Explicitly deferred (to 3C-2, the builders track)

- The eight builders: `build-subagent` (first, extracts the shared harness), `build-command`, `build-hook`, `build-workflow`, `build-chain-contract`, `build-mcp`, `build-agents-md`, `build-output-style` (Claude-only).
- S4 orphan detection completion (needs real chaining to validate).
- Component-level per-target S6 (needs subagents/commands to exist).
- The toolkit's own deferred subagents (`skill-author`, `evaluator`) - built via `build-subagent` once it exists.
- The public go-public flip + marketplace registration (Phase 5 for marketplace; go-public is a separate deliberate step).

## Risks

- **The tier bump is enforcement-irreversible in spirit:** once `tier: convergent`, CI fails on any convergent error. Mitigation: the seed-test red-green proves S1-S6 are all green before the bump; the change is verified by `check.mjs` exit 0 at the convergent ceiling.
- **Stale tier framing in prose docs** (README/INDEX/AGENTS still say Bronze/universal) would contradict the new tier. Mitigation: the doc updates are explicit deliverables; a grep for "universal"/"Bronze" in the entry-surface docs confirms none mislead.
- **CHANGELOG `[0.2.0]` heading vs `[Unreleased]`:** at tag time the accumulated `[Unreleased]` entries roll under `[0.2.0]`. Mitigation: do this as the final step alongside the tag so the changelog matches the tagged state.
