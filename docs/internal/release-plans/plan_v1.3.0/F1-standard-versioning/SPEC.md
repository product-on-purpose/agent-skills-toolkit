# F1 - Standard versioning + a standard-aware gate (ADR 0027 option 1) - SPEC

> The feature SPEC for **F1** of the **v1.3.0 "gate evolution"** release: implement [ADR 0027 (Standard versioning and compatibility policy)](../../../decisions/0027-standard-versioning-and-compatibility-policy.md), which is **Proposed** and recommends **option 1** (warn-for-one-minor burndown plus a standard-aware gate). F1 makes every check declare the Standard version it was introduced at, teaches the deterministic gate to read `library.json.standard`, and downgrades to `warn` any requirement a pinned-older plugin has not yet adopted - surfaced, never gate-failing - so the Standard becomes safe to evolve under downstream consumers.
> Created 2026-06-06. Owner: maintainer. Source of truth: ADR 0027. Live status: [`docs/internal/STATUS.md`](../../../STATUS.md).
> Sibling packets in this release: [`F3-gate-config`](../F3-gate-config/) (per-rule config / profiles / suppressions; **coupled to F1** - both add version-awareness and configurability to the deterministic gate). The E1 report renderer ([`F2`](../F2-report-renderer/)) ships in the separate **v1.4.0** cut and is out of scope here.

## 1. Goal

Close the contract gap ADR 0027 names: today `scripts/check.mjs` runs the live `CHECKS` array filtered only by the plugin's declared tier and never reads `library.json.standard`, so a plugin pinning an older Standard is silently re-graded against the newest spine. F1 honors the `standard` field that STANDARD.md sec 5.1 already documents as the field "so tooling can validate against the right ruleset," using **pure version arithmetic** - no model, fully synchronous - so the deterministic gate contract (Design Principle 3 / ADR 0023) is preserved exactly.

Concretely, F1 delivers three things:

1. **A `since` (Standard version) annotation on every check's `meta`** - the Standard version at which that requirement first became a gate-failing `error`.
2. **A standard-aware gate** - for a plugin pinned below the current Standard, any check whose `since` is greater than the pinned `standard` is **downgraded to `warn` for that run** (still reported, never gate-failing). A plugin pinned at or above the current Standard grades at full strength. A plugin with no pinned `standard` is graded at the current spine (no downgrade), preserving today's behavior for that edge.
3. **The warn-for-one-minor burndown** - a newly added or tightened requirement ships as `warn` for the one Standard minor that introduces it, then graduates to `error` in the next minor. F1 encodes this as a per-check `since` plus an `enforcedSince` the gate compares against, and documents the burndown contract in a new **STANDARD.md sec 7.7 "Standard versioning and compatibility"** section.

The spine stays at **29 checks** (`U1-U9` + `U11-U12` + `S1-S8` + `G1-G10`); F1 adds no checks and removes none. It changes how existing findings are *graded*, not what they assert.

## 2. Background and the exact gap (read this first)

ADR 0027 reproduced the gap against source; F1 fixes precisely it:

- `scripts/lib/load-plugin.mjs` already loads `library.json` into `ctx.library.data` (so `ctx.library.data.standard` is available), but no code reads it for grading. `U1 library-json` presence-validates the `standard` field and the gate otherwise renders it as a display string.
- `scripts/check.mjs` `gateExitFromFindings(findings, declaredTier)` filters `severity === "error"` by the **declared-tier ceiling** (`ceilingIndex` over `TIER_ORDER`). There is no second filter for the pinned Standard version.
- `scripts/tier-report.mjs` `computeTierReport` buckets `severity === "error"` findings by tier into the burndown. A finding downgraded to `warn` by the standard-aware step therefore correctly drops out of the burndown too, with no change to `tier-report.mjs` logic.

The fix is a single transform applied to the raw findings **before** `gateExitFromFindings` and **before** `computeTierReport` see them: rewrite the severity of any `error` finding whose owning check has `since > pinnedStandard` to `warn`. Because both the gate and the tier report consume the same already-transformed findings array, they stay in agreement (the invariant `evaluate.mjs` and `check.mjs` already rely on).

## 3. The `since` values for the existing 29 checks

The baseline rule from ADR 0027: checks that predate the first frozen-and-versioned tightening are **`0.x` baseline** (recorded as `since: "0.x"`, which compares as "always enforced, never downgraded"); the four ADR 0024 checks that landed at Standard v0.10 carry `since: "0.10"`.

| reqId | check module | tier | `since` | rationale |
|---|---|---|---|---|
| `U1` | `library-json` | universal | `0.x` | pre-0.10 baseline |
| `U2` | `anatomy` | universal | `0.x` | pre-0.10 baseline |
| `U3` | `frontmatter-valid` | universal | `0.x` | pre-0.10 baseline |
| `U4` | `name-matches-dir` | universal | `0.x` | pre-0.10 baseline |
| `U5` | `description-score` | universal | `0.x` | pre-0.10 baseline (warn-only check; downgrade is a no-op but `since` still set for uniformity) |
| `U6` | `reference-links` | universal | `0.x` | pre-0.10 baseline |
| `U7` | `instruction-budget` | universal | `0.x` | pre-0.10 baseline (warn-only) |
| `U8` | `manifest-drift` | universal | `0.10` | the VERSION-disagreement promotion from `warn` to `error` was the v0.10 tightening folded into 1.1.0 (ADR 0027 "Note on the v1.1.0 tightening"); the check itself predates 0.10, but its tightened-to-error VERSION rule is a 0.10 requirement (see sec 3.1) |
| `U9` | `version-match` | universal | `0.x` | pre-0.10 baseline |
| `U11` | `mcp-valid` | universal | `0.x` | pre-0.10 baseline |
| `U12` | `mermaid-valid` | universal | `0.10` | added in ADR 0024 at Standard v0.10 |
| `S1` | `agent-targets` | convergent | `0.x` | pre-0.10 baseline |
| `S2` | `prefix` | convergent | `0.x` | pre-0.10 baseline |
| `S3` | `components-index` | convergent | `0.x` | pre-0.10 baseline |
| `S4` | `chain-contract` | convergent | `0.x` | pre-0.10 baseline |
| `S5` | `workflow-skills` | convergent | `0.x` | pre-0.10 baseline |
| `S6` | `per-target-presence` | convergent | `0.x` | pre-0.10 baseline |
| `S7` | `command-contract` | convergent | `0.x` | pre-0.10 baseline |
| `S8` | `components-mirror` | convergent | `0.x` | pre-0.10 baseline |
| `G1` | `hook-documentation` | advanced | `0.x` | pre-0.10 baseline |
| `G2` | `self-hosting` | advanced | `0.x` | pre-0.10 baseline |
| `G3` | `library-regression` | advanced | `0.x` | pre-0.10 baseline |
| `G4` | `index-drift` | advanced | `0.x` | pre-0.10 baseline |
| `G5` | `release-notes` | advanced | `0.x` | pre-0.10 baseline |
| `G6` | `deprecation` | advanced | `0.x` | pre-0.10 baseline |
| `G7` | `docs-frontmatter` | advanced | `0.10` | added in ADR 0024 at Standard v0.10 |
| `G8` | `folder-readme` | advanced | `0.10` | added in ADR 0024 at Standard v0.10 |
| `G9` | `source-doc` | advanced | `0.10` | added in ADR 0024 at Standard v0.10 |
| `G10` | `docs-presence` | advanced | `0.10` | added in ADR 0024 at Standard v0.10 |

The current Standard is **0.11** (`library.json.standard: "0.11"`; STANDARD.md sec 2.6). The 0.11 change was a **relaxation** (U10 no-dashes retired, ADR 0028), which is the always-safe direction: no plugin that passed before can newly fail, so 0.11 introduces **no** new `since: "0.11"` requirement and needs no burndown. The toolkit pins `0.11` and grades at full strength.

### 3.1 The U8 tightening sub-case (granularity decision)

ADR 0027's "Note on the v1.1.0 tightening" promoted U8 `manifest-drift`'s VERSION disagreement from `warn` to `error` at v0.10, before the policy existed. F1 must decide whether `since` is per-check or per-rule-within-a-check, because U8 has older rules (the non-VERSION drift, baseline) and one 0.10 rule (the VERSION promotion).

**Decision: `since` is per-check, set to the version of the check's *most recent* tightening.** U8 therefore carries `since: "0.10"`. The consequence: a plugin pinning `0.9` would have **all** U8 errors downgraded to warn, not only the VERSION-drift error. This is accepted for v1.3.0 because (a) it keeps the model a single scalar per check (no per-finding `since`, which would push `since` onto the `finding()` shape and every call site), (b) the only realistic pinned-below consumer today is a hypothetical 0.9 plugin and the toolkit itself pins current, and (c) per-rule `since` is a clean future extension (a `finding({..., since})` override the gate prefers over the check's `meta.since` when present) recorded in **Out of scope**. R-SINCE-3 documents this granularity explicitly so a future reviewer does not read it as an oversight.

## 4. Requirements

RFC 2119 language. Each requirement carries a testable acceptance criterion. Requirement ids are stable handles for the IMPL-PLAN and the adversarial gate.

### R-SINCE-1 - every check declares a `since` in its `meta`

Every check module's exported `meta` MUST gain a `since` string field whose value is the Standard version at which that check's current requirement set first became a gate-failing `error`, per the table in sec 3. The field MUST be a plain string (e.g. `"0.10"`, `"0.x"`); the gate compares it, it is never a model input.

- **Acceptance:** every module in `CHECKS` exports `meta.since`; a new `registry-sync` assertion fails if any check's `meta` is missing `since` or if `since` is not one of the recognized forms (`"0.x"` or a `MAJOR.MINOR` numeric string); the 29 `since` values match sec 3 exactly (a table-driven test asserts the reqId -> since map).

### R-SINCE-2 - `since` values match the sec 3 table (baseline vs the ADR 0024 checks)

The pre-0.10 baseline checks (`U1-U7`, `U9`, `U11`, `S1-S8`, `G1-G6`) MUST carry `since: "0.x"`. The ADR 0024 checks (`U12`, `G7`, `G8`, `G9`, `G10`) and the U8 manifest-drift VERSION tightening (`U8`) MUST carry `since: "0.10"`. No check carries `since: "0.11"` (0.11 was a relaxation).

- **Acceptance:** the table-driven test in R-SINCE-1 asserts all 29 reqId -> since pairs; a reviewer can diff the test's map against sec 3 with zero discrepancies.

### R-SINCE-3 - `since` is per-check, with the U8 granularity documented

The `since` annotation is per-check (one scalar in `meta`), NOT per-finding. The gate MUST treat all findings a check emits as sharing that check's `since`. The U8 consequence (a pinned-below-0.10 plugin sees all U8 errors downgraded, not just the VERSION-drift error) MUST be documented in the IMPL-PLAN and in a code comment on the U8 `meta.since`.

- **Acceptance:** `finding()` in `scripts/lib/findings.mjs` is unchanged (no `since` field added to the finding shape); a comment on `manifest-drift.mjs` `meta` records the per-check granularity tradeoff and points at this SPEC R-SINCE-3.

### R-GATE-1 - the gate reads the pinned Standard and downgrades post-pin requirements to warn

A new pure function (proposed `applyStandardAwareness(findings, checks, pinnedStandard, currentStandard)` in a new module `scripts/lib/standard-aware.mjs`) MUST, for each `error` finding, look up the owning check by `reqId`, and if that check's `since` is **greater than** the plugin's pinned `standard`, rewrite the finding's `severity` from `error` to `warn`. All other findings pass through unchanged. The function MUST be synchronous and model-free.

- **Acceptance:** given a findings array containing a `G8` error and `pinnedStandard = "0.9"`, the function returns the same array with the `G8` finding's `severity === "warn"` and every other finding untouched; `since: "0.x"` checks are never downgraded for any pinned version; the function is a pure transform (same input -> same output, no I/O).

### R-GATE-2 - the gate and the tier report consume the transformed findings

`scripts/check.mjs` `runGate` MUST apply `applyStandardAwareness` to the raw `runAllChecks(ctx)` output **before** calling `gateExitFromFindings` and before computing `warnCount`, passing `ctx.library.data.standard` as the pinned version. `scripts/tier-report.mjs` `computeTierReport` MUST receive the same transformed findings (it already accepts an optional `findings` argument), so a downgraded finding drops out of the burndown automatically.

- **Acceptance:** for a fixture plugin pinned at `0.9` with a real G8 violation, `node scripts/check.mjs <fixture>` exits `0` (G8 downgraded to warn, so no gated error), prints the G8 issue as `[warn]`, and `tier-report` shows G8 NOT in the Advanced burndown; the same fixture pinned at `0.10` exits `1` with G8 as a gated `[error]` and G8 in the burndown. A single integration test asserts both runs.

### R-GATE-3 - no pinned standard grades at the current spine (preserve today's behavior)

If `library.json` has no `standard` field, or it is empty/unparseable, the gate MUST grade against the current spine with **no** downgrades (every `error` stays an `error`). This preserves the documented current behavior (ADR 0027 "until this lands, the documented current behavior is option 3") for the no-pin edge and avoids a silent weakening when the field is absent.

- **Acceptance:** a fixture with no `standard` field and a real G8 violation exits `1` with G8 as a gated error; a unit test on `applyStandardAwareness` with `pinnedStandard = undefined` returns findings unchanged.

### R-GATE-4 - a pinned standard at or above current never downgrades; an unknown-future pin is clamped

If the pinned `standard` is greater than or equal to the current Standard, no finding is downgraded (full-strength grading). A pinned version the gate does not recognize as <= current (a typo or a future version) MUST NOT silently weaken the gate: the comparison treats "pinned >= current" as full strength, so a forward pin grades at full strength rather than disabling checks.

- **Acceptance:** `applyStandardAwareness` with `pinnedStandard = "0.11"` (current) or `"0.12"` (future) returns findings unchanged; the toolkit's own gate (pins `0.11`) is byte-for-byte identical before and after F1 (R-DOGFOOD-1).

### R-VERCMP-1 - a dedicated, tested version comparator

A version comparison helper (proposed `compareStandard(a, b)` in `scripts/lib/standard-aware.mjs`, returning `-1 | 0 | 1`) MUST correctly order Standard versions of the forms used by this Standard: the `"0.x"` baseline sentinel (which MUST sort **below** every numeric version, so a baseline check is never downgraded), and `MAJOR.MINOR` numeric strings compared numerically per component (so `0.9 < 0.10 < 0.11` - the numeric trap that a naive string compare gets wrong, since `"0.9" > "0.10"` lexically).

- **Acceptance:** unit tests assert `compareStandard("0.x", "0.10") === -1`, `compareStandard("0.9", "0.10") === -1`, `compareStandard("0.10", "0.9") === 1`, `compareStandard("0.11", "0.11") === 0`, `compareStandard("0.10", "0.2") === 1`; a malformed input (non-numeric, non-`0.x`) is handled deterministically (treated as the maximum, so it never causes a spurious downgrade, consistent with R-GATE-4).

### R-BURNDOWN-1 - the warn-for-one-minor contract is encoded and documented

A newly added or tightened requirement MUST ship as `warn` for the one Standard minor that introduces it, then graduate to `error` in the next minor. F1 encodes this by letting a check carry, in addition to `since` (the version where the requirement was introduced as a warn), an OPTIONAL `enforcedSince` (the version where it graduates to error). The gate downgrades an `error` finding to `warn` when the **current** Standard is below the check's `enforcedSince` (the global burndown window) OR when the **pinned** Standard is below the check's `since` (the per-consumer compatibility downgrade of R-GATE-1). When `enforcedSince` is omitted it defaults to `since` (the requirement is enforced from the version it was introduced, the v0.10 precedent which was authored as immediate errors before this policy existed).

- **Acceptance:** a check authored with `since: "0.12"`, `enforcedSince: "0.13"` emits `warn` (not a gated error) when the current Standard is `0.12`, and a gated `error` when current is `0.13`, for a plugin pinned at current; a unit test covers both. The four ADR 0024 checks omit `enforcedSince` (so it defaults to `0.10`, matching their as-shipped immediate-error behavior), which a test confirms produces identical grading to pre-F1 for a current-pinned plugin.

### R-STD-1 - STANDARD.md gains a "Standard versioning and compatibility" section

STANDARD.md MUST gain a new normative section (proposed **sec 7.7**, appended as the final subsection of sec 7 "Component lifecycle and governance", since sec 7.7 "Contribution" already exists; this keeps the Standard's own version policy inside the lifecycle and governance section that also carries the plugin version-propagation policy of sec 7.4 "Versioning policy", which the new section cross-references so the two are not confused) stating: (a) the Standard uses `MAJOR.MINOR` versioning where a MINOR adds or tightens requirements and a MAJOR may remove or restructure them; (b) the warn-for-one-minor burndown rule for a new or tightened requirement; (c) the pinned-version grading contract (a plugin is graded against the requirements that existed at or before its pinned `standard`; requirements introduced after are surfaced as `warn`, never gate-failing, until the plugin re-pins); (d) that a relaxation (removing a requirement) is the always-safe direction and ships as a MINOR with no burndown (citing the 0.11 / ADR 0028 precedent); (e) that this policy is enforced by pure version comparison, keeping the gate deterministic and model-free.

- **Acceptance:** the new sec 7.7 exists with all five points; it cross-references sec 5.1 (`standard` field) and ADR 0027; a docs sweep confirms no contradiction with sec 7.4/7.5; the section carries no em-dash or en-dash.

### R-STD-2 - the `standard` field note in sec 5.1 is upgraded from descriptive to contractual

The sec 5.1 `standard` row note ("so tooling can validate against the right ruleset") MUST be updated to point at the new sec 7.7 and to state that the gate now honors the pinned version, so the field's documented promise and the gate's behavior agree (the contradiction ADR 0027 flagged).

- **Acceptance:** the sec 5.1 `standard` row references sec 7.7; the example value is updated to the current `"0.11"`; a grep finds no remaining "always grades at the newest spine" wording in STANDARD.md that contradicts sec 7.7.

### R-DOGFOOD-1 - the toolkit's own gate is unchanged (full strength at current)

The toolkit pins the current Standard (`library.json.standard: "0.11"`), so F1 MUST NOT change its own gate result: `node scripts/check.mjs .` stays **Advanced, 0/0**, with the 29-check spine, and no finding is downgraded for the toolkit itself.

- **Acceptance:** before and after F1, `node scripts/check.mjs .` is Advanced 0 errors / 0 warnings; `npm test` is green; a snapshot of the toolkit's own findings (count and severities) is identical pre/post F1.

### R-SEQ-1 - F1 lands as one PR against protected main, gate + CI green

F1 ships as a single feature PR against protected `main`, gate + CI green, behind a 4-lens adversarial Workflow before merge (Codex `/codex:review` is unreliable on this Windows setup), then the v1.3.0 version-bump PR carries the Standard version note. F1 alone does NOT bump the Standard version (no new requirement, no relaxation): it is gate plumbing plus a documentation section, so STANDARD.md stays `0.11` unless F3's coupled work introduces a `since: "0.12"` requirement that warrants the minor (decided in the v1.3.0 PROGRAM-PLAN, not here).

- **Acceptance:** the PR diff touches only the 29 `meta` blocks (adding `since`), the new `scripts/lib/standard-aware.mjs`, `scripts/check.mjs`, `scripts/tier-report.mjs` (the findings hand-through, if any), the new STANDARD.md sec 7.7 + sec 5.1 edit, the new fixtures + tests, and the `registry-sync` assertion; the gate is green at every commit.

## 5. The standard-aware transform (design detail)

`scripts/lib/standard-aware.mjs` exports two pure functions:

```js
// Compare two Standard versions. "0.x" sorts below every numeric version.
// MAJOR.MINOR compared numerically per component (so 0.9 < 0.10).
// An unrecognized input sorts as the maximum (never causes a downgrade).
export function compareStandard(a, b) { /* returns -1 | 0 | 1 */ }

// Pure transform: downgrade error -> warn for any finding whose owning check
// has since > pinnedStandard (per-consumer compat) OR enforcedSince > currentStandard
// (global burndown). Looks up the check by reqId via a reqId -> meta map built
// from the CHECKS array. No I/O, no model.
export function applyStandardAwareness(findings, checkMetaByReq, pinnedStandard, currentStandard) { /* returns Finding[] */ }
```

`CURRENT_STANDARD` is read once from a single source (proposed: a `CURRENT_STANDARD` constant exported from `scripts/lib/standard-aware.mjs`, kept equal to STANDARD.md's version, and asserted equal to `library.json.standard` by a test so the two never drift - the same single-source-of-truth ethos the manifests follow). The `checkMetaByReq` map is built from the imported `CHECKS` array (`Object.fromEntries(CHECKS.map(m => [m.meta.reqId, m.meta]))`), so a check that forgets `since` surfaces in R-SINCE-1's assertion rather than silently grading wrong.

`runGate` wiring (sketch):

```js
const raw = runAllChecks(ctx);
const findings = applyStandardAwareness(raw, checkMetaByReq, ctx?.library?.data?.standard, CURRENT_STANDARD);
const { errorCount, exitCode } = gateExitFromFindings(findings, ctx?.library?.data?.tier);
```

`computeTierReport(root, ctx, findings)` is then called with the same transformed `findings`, so the burndown and the gate exit agree by construction. `evaluate.mjs` is updated identically (it already centralizes its tier read through `computeTierReport` and its exit through `gateExitFromFindings`), so the evaluator and the gate stay in lockstep.

## 6. Fixtures and tests

- **`tests/fixtures/golden/pinned-old-plugin/`** - a minimal Gold-shaped plugin pinning `standard: "0.9"` with a real G8 (folder-readme) and G9 (source-doc) violation and no other errors. Asserts: exits `0`, the violations render as `[warn]`, G8/G9 absent from the burndown.
- **`tests/fixtures/anti/pinned-current-plugin/`** - the same shape pinning `standard: "0.10"`. Asserts: exits `1`, G8/G9 are gated `[error]`, present in the burndown.
- **`tests/unit/standard-aware.test.mjs`** - the `compareStandard` table (R-VERCMP-1), the `applyStandardAwareness` downgrade/no-downgrade cases (R-GATE-1/3/4), the burndown-window case (R-BURNDOWN-1), and the no-pin pass-through (R-GATE-3).
- **`tests/unit/registry-sync.test.mjs`** (extended) - asserts every check exports `meta.since`, the 29 reqId -> since pairs match sec 3, and `CURRENT_STANDARD === library.json.standard`.
- A `since`-coverage assertion folds into the existing registry-sync rather than a new file, to keep the "one ordered registry is the single place a check is turned on" property visible (registry.mjs docblock).

## 7. Acceptance criteria (feature-level checklist)

A checklist the executor verifies before opening the PR and again before merge:

- [ ] All 29 checks export `meta.since`; the values match sec 3; `registry-sync` enforces presence + the reqId -> since map.
- [ ] `scripts/lib/standard-aware.mjs` exists with `compareStandard` + `applyStandardAwareness`, both synchronous and pure (no `fs`, no `await`, no model).
- [ ] `compareStandard` orders `0.x < 0.9 < 0.10 < 0.11` correctly (the numeric-not-lexical trap is tested).
- [ ] `runGate` and `evaluate.mjs` apply the transform before exit/tier computation; `computeTierReport` receives the transformed findings; the gate and tier report agree.
- [ ] The two fixtures prove the pinned-0.9 plugin passes with warns and the pinned-0.10 plugin fails with gated errors, for the identical violation set.
- [ ] No-pin and forward-pin edges preserve full-strength grading (R-GATE-3, R-GATE-4).
- [ ] `enforcedSince` defaults to `since`; the burndown-window case (warn at current < enforcedSince, error at current >= enforcedSince) is tested.
- [ ] STANDARD.md gains sec 7.7 with the five points; sec 5.1 `standard` row references it and uses `"0.11"`; no contradictory "newest spine" wording remains.
- [ ] `node scripts/check.mjs .` is Advanced 0/0 with the 29-check spine, identical pre/post F1 (R-DOGFOOD-1).
- [ ] `npm test` green; no other test regresses.
- [ ] No em-dash (U+2014) or en-dash (U+2013) in any changed file (the author-time PreToolUse hook did not fire; note U10 is retired from the gate per ADR 0028, so author-time enforcement is the only layer).
- [ ] `git diff --name-only` shows only the intended files (sec R-SEQ-1).

## 8. Out of scope

- **Per-finding `since`** (a `finding({..., since})` override the gate prefers over the check's `meta.since`). F1 keeps `since` per-check (R-SINCE-3); per-finding granularity is the clean future extension if a single check ever needs to tighten one rule while leaving another at baseline. Recorded here so it is a deliberate deferral, not an omission.
- **Per-rule config, named profiles, and a suppressions/baseline file** - these are **F3** (`F3-gate-config`), the coupled sibling in this same v1.3.0 release. F1 provides the version-awareness; F3 provides the configurability. Where they touch (both read plugin-level config and both transform the findings array before the gate), the F3 SPEC sequences the integration; F1's transform runs first and F3's config layer composes over it.
- **The E1 evaluation-report renderer** (`--format=md|html` over the report object) - this is **F2**, shipped in the separate **v1.4.0** cut (a larger user-facing feature on its own). F1's standard-aware downgrades will appear in that report when it ships, but F1 builds no renderer.
- **The Gemini emitter** - a named v1.x cross-agent deferral; not built in this release, noted only so the scope line is explicit.
- **Deeper MCP secret scanning (E2)** - unrelated backlog item, not touched by F1.
- **Bumping the Standard version** - F1 is gate plumbing plus a documentation section and introduces no new requirement, so it does not move STANDARD.md off `0.11`. Any `0.12` bump in v1.3.0 would be justified by an F3 requirement and decided in the PROGRAM-PLAN, not by F1.
- **A behavioral or judge layer reading `since`** - the standard-aware logic is pure version arithmetic in the deterministic gate; the advisory LLM layers (ADR 0023, the linter-vs-judge note) are untouched and never decide a downgrade.

See the v1.3.0 PROGRAM-PLAN for how F1 and F3 sequence within the release, and the [`F3-gate-config`](../F3-gate-config/) SPEC for the coupled config/profile/suppressions work.
