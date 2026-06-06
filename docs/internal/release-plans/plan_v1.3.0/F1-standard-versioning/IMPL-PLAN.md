# F1 - standard-versioning / standard-aware gate (ADR 0027) - implementation plan

> Per-feature cadence (PROGRAM-PLAN sec on release mechanics, ADR 0027 implementation sketch): branch from `main`; add a `since` annotation to every check `meta`; add a deterministic version-comparison helper; teach the gate to downgrade post-pin checks to `warn` while preserving tier filtering and the declared-tier ceiling; author the STANDARD.md "Standard versioning and compatibility" section; add golden + anti fixtures and unit tests; verify gate Advanced 0/0 with no version drift; run a 4-lens adversarial review; squash-merge. One PR vs protected `main`, individually green.
>
> F1 is COUPLED with F3 (per-rule config / profiles / suppressions) in the v1.3.0 "gate evolution" release: both add version-awareness and configurability to the deterministic gate. This plan delivers F1 standalone (it is the dependency F3 layers on); F3 has its own packet. F1 stays synchronous and model-free (Design Principle 3 / ADR 0023): the policy is pure version arithmetic, no model, no async.

## What F1 is (one paragraph)

Today `scripts/check.mjs` runs the live `CHECKS` array filtered only by the declared tier; `library.json.standard` is presence-validated by `U1` (`library-json`) and otherwise unused, so a plugin pinning an older Standard is silently re-graded against the newest spine (ADR 0027 Context, problem 1). F1 implements ADR 0027 option 1: each check declares the Standard version it was introduced at (`meta.since`); the gate compares the plugin's pinned `library.json.standard` against each finding's `since`; a finding from a check introduced AFTER the pinned version is downgraded to `warn` for that run (still reported, never gate-failing). The toolkit pins the current Standard (0.11), so every check's `since <= 0.11` and the toolkit grades at full strength - its own gate is unchanged.

## Author-before-enforce micro-order

F1 is not a new check, so "author the artifact, then flip the check" does not apply literally. The equivalent discipline here is **add the annotation everywhere, then read it in one place, so no intermediate state changes behavior**:

1. **Add `since` to every check `meta` first (data only).** Adding a `since` field to `meta` is inert: nothing reads it yet, the gate behaves identically, `npm test` stays green. This is the "author" step.
2. **Add the version helper unwired.** Create `scripts/lib/standard-version.mjs` (`parseStandard`, `compareStandard`, `isAfter`). It is dead code until imported. Unit-test it in isolation.
3. **Wire the downgrade into the gate (the flip).** Change `gateExitFromFindings` (and the warn-counting path) in `scripts/check.mjs` to apply the downgrade before the tier filter. Now `since` binds.
4. **Mirror the downgrade into `tier-report.mjs` and `evaluate.mjs`** so all three CLIs agree (the same way `evaluate.mjs` already reuses `gateExitFromFindings`).
5. **Fixtures + tests.** Golden (toolkit-like, pinned current, full strength), anti / scenario (pinned 0.10 vs 0.11; a post-pin check downgraded to warn).
6. **STANDARD.md section + version note.** No Standard version bump in F1 (see "No Standard bump" below).
7. **Verify** (gate Advanced 0/0, `npm test`, no version drift), adversarial review, squash-merge.

The toolkit's own gate is green at every step because step 1 is inert and step 3's downgrade can only turn an `error` into a `warn` (never the reverse): a plugin pinned at or above every check's `since` (the toolkit, at 0.11) sees zero downgrades and grades identically to today.

## Steps

Each step names the exact files. Paths are repo-relative to `E:\Projects\product-on-purpose\agent-skills-toolkit`.

### Step 1 - branch

```
git switch main && git pull
git switch -c f1-standard-versioning
```

### Step 2 - add `since` to every check's `meta`

Edit each module under `scripts/checks/*.mjs` (and `agentskills.mjs`) to add a `since` field to the exported `meta`. `since` is the Standard version at which the requirement was introduced. The spine predates explicit version annotation, so the baseline rule (ADR 0027 implementation sketch) is: **pre-existing checks are the `0.x` baseline (`"0.x"`); the four ADR 0024 checks are `"0.10"`.** Encode `"0.x"` as a sentinel that sorts BEFORE every real minor (the helper in Step 3 treats it as `-Infinity`), so a baseline check is never downgraded for any plugin that pins a real `standard`.

The exact `since` per check (`reqId` -> `since`):

| Module | reqId | tier | `since` | Rationale |
|---|---|---|---|---|
| `library-json` | U1 | universal | `"0.x"` | baseline |
| `anatomy` | U2 | universal | `"0.x"` | baseline |
| `frontmatter-valid` | U3 | universal | `"0.x"` | baseline |
| `name-matches-dir` | U4 | universal | `"0.x"` | baseline |
| `description-score` | U5 | universal | `"0.x"` | baseline |
| `reference-links` | U6 | universal | `"0.x"` | baseline |
| `instruction-budget` | U7 | universal | `"0.x"` | baseline |
| `manifest-drift` | U8 | universal | `"0.x"` | baseline (the U8 VERSION warn->error tightening shipped in v0.10/1.1.0 BEFORE this policy; ADR 0027 "Note on the v1.1.0 tightening"; it is grandfathered as baseline, not re-litigated here) |
| `version-match` | U9 | universal | `"0.x"` | baseline |
| `mcp-valid` | U11 | universal | `"0.x"` | baseline |
| `mermaid-valid` | U12 | universal | `"0.10"` | added in ADR 0024 / v0.10 |
| `agent-targets` | S1 | convergent | `"0.x"` | baseline |
| `prefix` | S2 | convergent | `"0.x"` | baseline |
| `components-index` | S3 | convergent | `"0.x"` | baseline |
| `chain-contract` | S4 | convergent | `"0.x"` | baseline |
| `workflow-skills` | S5 | convergent | `"0.x"` | baseline |
| `per-target-presence` | S6 | convergent | `"0.x"` | baseline |
| `command-contract` | S7 | convergent | `"0.x"` | baseline |
| `components-mirror` | S8 | convergent | `"0.x"` | baseline |
| `hook-documentation` | G1 | advanced | `"0.x"` | baseline |
| `self-hosting` | G2 | advanced | `"0.x"` | baseline |
| `library-regression` | G3 | advanced | `"0.x"` | baseline |
| `index-drift` | G4 | advanced | `"0.x"` | baseline |
| `release-notes` | G5 | advanced | `"0.x"` | baseline |
| `deprecation` | G6 | advanced | `"0.x"` | baseline |
| `docs-frontmatter` | G7 | advanced | `"0.10"` | added in ADR 0024 / v0.10 |
| `folder-readme` | G8 | advanced | `"0.10"` | added in ADR 0024 / v0.10 |
| `source-doc` | G9 | advanced | `"0.10"` | added in ADR 0024 / v0.10 |
| `docs-presence` | G10 | advanced | `"0.10"` | added in ADR 0024 / v0.10 |
| `agentskills` | (null) | universal | `"0.x"` | baseline; the component-scope agentskills.io map, not a spine reqId |

Note on `"0.x"` vs `"0.9"`: the pre-existing checks were not all introduced at one minor (U1-U9 existed pre-0.8; U11 arrived later). Pinning them all to a single sentinel is intentional - the policy only needs "this check is older than any pinned Standard a real consumer could declare." A consumer pins `0.10` or `0.11` (the only published values), so the sentinel `"0.x"` sorting below `0.10` guarantees baseline checks always grade at full strength. This matches ADR 0027's "pre-existing checks are '0.x baseline'."

Concrete edit (example, `scripts/checks/mermaid-valid.mjs`):

```js
export const meta = { id: "mermaid-valid", tier: "universal", reqId: "U12", since: "0.10" };
```

and (example, `scripts/checks/library-json.mjs`):

```js
export const meta = { id: "library-json", tier: "universal", reqId: "U1", since: "0.x" };
```

This is the largest-fan-out edit (30 modules) but each is a one-field addition. It changes no behavior on its own.

### Step 3 - the version-comparison helper (unwired)

Create `scripts/lib/standard-version.mjs`. It owns ALL Standard-version arithmetic so the comparison lives in one tested place, not inline in the gate (ADR 0027 decision driver: "enforceable as plain version comparison").

```js
// what-it-is:   Standard-version arithmetic for the standard-aware gate
// what-it-does: parses a "MAJOR.MINOR" Standard version, compares two, and answers "was check X
//               introduced AFTER the plugin's pinned Standard?" so the gate can downgrade post-pin checks
// why:          ADR 0027 - the gate must honor library.json.standard ("validate against the right ruleset"),
//               and the policy must be pure version arithmetic to keep the gate deterministic and model-free
// used-by:      scripts/check.mjs (the downgrade), tier-report.mjs, evaluate.mjs; covered by tests/unit/standard-version.test.mjs

/** The sentinel for a pre-policy baseline check (older than any real pinned minor). */
export const BASELINE = "0.x";

/**
 * Parse a Standard version "MAJOR.MINOR" into a comparable tuple.
 * The BASELINE sentinel parses to [-Infinity, -Infinity] (sorts before every real version).
 * A missing/unparseable input parses to null (treated as "unknown" by the callers).
 * @returns {[number,number]|null}
 */
export function parseStandard(v) {
  if (v === BASELINE) return [-Infinity, -Infinity];
  if (typeof v !== "string") return null;
  const m = /^(\d+)\.(\d+)$/.exec(v.trim());
  if (!m) return null;
  return [Number(m[1]), Number(m[2])];
}

/** -1 / 0 / 1 comparing a to b. Unparseable sorts last (treated as the highest, so it is never downgraded). */
export function compareStandard(a, b) {
  const pa = parseStandard(a), pb = parseStandard(b);
  if (pa === null && pb === null) return 0;
  if (pa === null) return 1;
  if (pb === null) return -1;
  if (pa[0] !== pb[0]) return pa[0] < pb[0] ? -1 : 1;
  if (pa[1] !== pb[1]) return pa[1] < pb[1] ? -1 : 1;
  return 0;
}

/**
 * True iff a check introduced at `since` is NEWER than the plugin's `pinned` Standard
 * (so its findings must be downgraded to warn for this run).
 * If `pinned` is missing/unparseable, return false (no downgrade: fall back to today's full-strength behavior).
 */
export function isAfter(since, pinned) {
  if (parseStandard(pinned) === null) return false; // no/garbage pin -> grade at full strength (back-compat)
  return compareStandard(since, pinned) > 0;
}
```

Decisions baked in (each is an adversarial-review target in Step 8):
- **Missing/unparseable pin -> no downgrade.** A plugin with no `standard` (already a `U1` error) or a garbage value still grades at full strength, exactly as today. F1 never makes the gate MORE lenient for a malformed pin.
- **Unparseable `since` -> never downgraded** (`compareStandard` sorts `null` last; `isAfter` returns false for a `since` that does not parse against a parseable pin only when `since` is the higher). The `since` values are author-controlled (Step 2 table), so this is a defense-in-depth default, not a live path.
- **`"0.x"` baseline sorts below every real minor**, so a baseline check is never downgraded for any real pin.

### Step 4 - wire the downgrade into the gate (the flip)

Edit `scripts/check.mjs`. The downgrade is a pure pre-pass over findings: map each finding's severity using its check's `since` and the plugin's pinned `standard`. The challenge: a `Finding` carries `reqId` but not `since`. Resolve `since` per finding via a `reqId -> since` lookup built once from the registry.

Add to `scripts/lib/registry.mjs` a derived map (so the gate does not re-walk modules):

```js
/** reqId -> since, built from each module's meta. Null-reqId modules (agentskills) are excluded. */
export const SINCE_BY_REQ = Object.fromEntries(
  CHECKS.filter((m) => m.meta?.reqId).map((m) => [m.meta.reqId, m.meta.since ?? "0.x"])
);
```

Then in `scripts/check.mjs`:

```js
import { SINCE_BY_REQ } from "./lib/registry.mjs";
import { isAfter } from "./lib/standard-version.mjs";

/**
 * Apply ADR 0027: a finding from a check introduced AFTER the plugin's pinned Standard is
 * downgraded error->warn for this run (still reported, never gate-failing). Pure, deterministic.
 * @param {Finding[]} findings @param {string|undefined} pinned library.json.standard
 * @returns {Finding[]} a new array; never mutates input.
 */
export function applyStandardDowngrade(findings, pinned) {
  return findings.map((f) => {
    if (f.severity !== "error" || !f.reqId) return f;
    const since = SINCE_BY_REQ[f.reqId] ?? "0.x";
    if (!isAfter(since, pinned)) return f;
    return { ...f, severity: "warn", downgraded: true, since };
  });
}
```

Then change `runGate` to apply the downgrade BEFORE counting and BEFORE the tier ceiling filter, so the ceiling and the version policy compose correctly:

```js
export function runGate(root, ctx = loadPlugin(root)) {
  const raw = runAllChecks(ctx);
  const findings = applyStandardDowngrade(raw, ctx?.library?.data?.standard);
  const { errorCount, exitCode } = gateExitFromFindings(findings, ctx?.library?.data?.tier);
  const warnCount = findings.filter((f) => f.severity === "warn").length;
  return { findings, errorCount, warnCount, exitCode };
}
```

`gateExitFromFindings` is UNCHANGED: it still filters by the declared-tier ceiling over whatever severities it is handed. The downgrade runs first, so a post-pin `error` becomes a `warn` and `gateExitFromFindings` no longer counts it (warns never gate). The two filters are orthogonal and compose: **a finding gates only if it is (still) an error AND its tier is within the declared ceiling.** Order does not matter for the exit code (warn is dropped by the severity filter either way), but applying the downgrade first is what makes `warnCount` and the printed lines correct.

Add an optional `--strict` flag that bypasses the downgrade (grades at full spine regardless of pin) for the maintainer / CI authoring the Standard:

```js
if (process.argv[1]?.endsWith("check.mjs")) {
  const root = process.argv.find((a, i) => i >= 2 && !a.startsWith("--")) ?? process.cwd();
  const ctx = loadPlugin(root);
  const strict = process.argv.includes("--strict");
  const raw = runAllChecks(ctx);
  const findings = strict ? raw : applyStandardDowngrade(raw, ctx?.library?.data?.standard);
  // ... existing format/print path, using `findings`
}
```

`--strict` is the escape hatch the toolkit's own CI uses if it ever wants to prove it passes the full live spine even when (hypothetically) pinned below it; documented in STANDARD.md and the verification table. Default (no flag) honors the pin.

Mark the printed lines that were downgraded so a reader sees WHY a former error is now a warn. In `format()`:

```js
function format(findings) {
  return findings
    .map((f) => `  [${f.severity}] ${f.check}${f.reqId ? " (" + f.reqId + ")" : ""}: ${f.message}` +
      `${f.downgraded ? ` [downgraded: introduced in Standard ${f.since}, after pinned ${"…"}]` : ""}` +
      `${f.file ? "  -> " + f.file : ""}`)
    .join("\n");
}
```

(Resolve the pinned value into the message at the call site, where `ctx` is in scope, rather than the placeholder above; keep the format function pure by passing the pinned version in, or stamp the pinned value onto the finding in `applyStandardDowngrade` as `f.pinned` so `format` stays single-arg. Prefer stamping `pinned` onto the downgraded finding.)

### Step 5 - mirror into tier-report and evaluate

So all three CLIs agree (the `registry-sync` and `evaluate` tests guard divergence):

- **`scripts/tier-report.mjs`**: `computeTierReport` takes `findings = runAllChecks(ctx)`. Apply the downgrade there too, reading `ctx.library?.data?.standard`, so the burndown does not list a post-pin check as a blocker. Change the default arg:

```js
import { applyStandardDowngrade } from "./check.mjs";
export function computeTierReport(root, ctx = loadPlugin(root), findings) {
  const resolved = findings ?? applyStandardDowngrade(runAllChecks(ctx), ctx.library?.data?.standard);
  // ... rest unchanged, using `resolved`
}
```

Guard the import cycle: `check.mjs` imports `tier-report.mjs` (`computeTierReport`, `humanLine`) for its CLI print, and now `tier-report.mjs` would import `applyStandardDowngrade` from `check.mjs`. ESM handles this cycle (both are function exports resolved at call time, not at module-eval time), but to avoid any risk, **put `applyStandardDowngrade` and `SINCE_BY_REQ` in a small leaf module** instead: `scripts/lib/standard-gate.mjs`, imported by `check.mjs`, `tier-report.mjs`, and `evaluate.mjs`. This removes the `check.mjs <-> tier-report.mjs` cycle entirely. Prefer this: it keeps `check.mjs` the consumer, not the source.

- **`scripts/evaluate.mjs`**: the plugin branch calls `runAllChecks(ctx)` then `computeTierReport`. Apply the downgrade to the findings it reports and passes into `computeTierReport` and `gateExitFromFindings`, reading `ctx.library?.data?.standard`. The CLI exit path already reads the declared tier from `library.json`; add the pinned `standard` read alongside it. Stamp `downgraded`/`since`/`pinned` onto findings so the `--json` report exposes them (this is forward-compatible with the E1 renderer, F2, which will render provenance per finding).

Final module layout for the helper:
- `scripts/lib/standard-version.mjs` - pure arithmetic (`parseStandard`, `compareStandard`, `isAfter`, `BASELINE`).
- `scripts/lib/standard-gate.mjs` - `SINCE_BY_REQ` (built from the registry) + `applyStandardDowngrade(findings, pinned)`. Imports `standard-version.mjs` and `registry.mjs`.
- `check.mjs`, `tier-report.mjs`, `evaluate.mjs` import `applyStandardDowngrade` from `standard-gate.mjs`.

### Step 6 - the STANDARD.md normative section

Add a new subsection to `STANDARD.md`, placed right after sec 7.5 (deprecation) as ADR 0027 directs ("near sec 7.4"). Number it **7.7 Standard versioning and compatibility** (7.4-7.6 are taken; 7.7 keeps it inside the lifecycle/governance section where versioning lives). Content (normative, no dashes):

```markdown
### 7.7 Standard versioning and compatibility

This section governs how the Standard ITSELF evolves (distinct from sec 7.4, which governs a plugin's own version).

**Versioning.** The Standard is versioned `MAJOR.MINOR`. A new tier requirement (a new U#/S#/G#) or a tightening of an existing one (a stricter rule, or a `warn` promoted to `error`) is an additive change that bumps the MINOR. Removing or relaxing a requirement is also a MINOR (the always-safe direction). A breaking redefinition of an existing requirement is reserved for a MAJOR.

**Burndown (warn-then-error, MUST for tightenings).** A newly introduced or tightened tier requirement ships as a `warn` for the one Standard MINOR that introduces it, then becomes a gate-failing `error` in the next MINOR. This gives a downstream library a one-version migration window before a tightening can fail its build. A requirement MAY instead be introduced directly as an `error` only in a MAJOR bump.

**Pinned-version grading (MUST).** Every check declares the Standard version it was introduced at (its `since`). Tooling MUST read `library.json.standard` and grade a plugin against the requirement set of the version it pins: a requirement introduced AFTER the pinned version is reported as a `warn` (surfaced, never gate-failing) for that run, not an `error`. A plugin opts into newer requirements by raising its pinned `standard`. This keeps the sec 5.1 promise that `standard` lets "tooling validate against the right ruleset."

**The Standard's authors grade at full strength.** A plugin that pins the current Standard (the toolkit itself does) sees no downgrades and is graded against the entire live spine. Tooling MAY offer a strict mode that grades against the full live spine regardless of the pin, for authors validating the Standard itself.
```

Also update the spine note near sec 2.6 only if wording about grading changes; F1 does NOT change the spine count (still 29) or any reqId, so leave the count line untouched.

### Step 7 - fixtures + tests

Three new fixtures plus two new test files. The committed fixtures must themselves pass the toolkit's self-scan (they live under `tests/fixtures/`, excluded from `folder-readme`/`source-doc` scopes), so each is a minimal but VALID plugin.

Fixtures (all minimal-skill-shaped, enough to be a `looksLikePlugin` target):

1. `tests/fixtures/golden/standard-pinned-current/` - `library.json` with `"standard": "0.11"`, `"tier": "advanced"`, a single trivially-conformant skill. Proves: pinned at current -> no downgrades -> grades at full strength (like the toolkit). Construct it so it is genuinely clean at advanced (or reuse the existing advanced seed shape).

2. `tests/fixtures/golden/standard-pinned-010/` - identical content but `"standard": "0.10"`. Used to prove that a plugin pinned at 0.10 is graded against the 0.10 spine: every `since: "0.10"` check (U12, G7-G10) is IN-scope (0.10 is not after 0.10), so no downgrade occurs for them either. This is the boundary case (equal, not after).

3. `tests/fixtures/anti/standard-pinned-009-postpin/` - `"standard": "0.9"`, but the plugin VIOLATES a `since: "0.10"` check (for example: it has a `docs/` tree with an empty Diataxis quadrant, which `G10` flags, and/or source files without docblocks, which `G9` flags). Because the plugin pins `0.9` (below `0.10`), those `G10`/`G9` errors are DOWNGRADED to `warn`: the gate exits 0 with warnings, NOT 1. The same fixture re-pinned to `0.11` (a second fixture, or a `library.json` mutation in a temp dir within the test) would gate-fail (exit 1) on the same defects. This is the core ADR 0027 scenario.

Test file `tests/unit/standard-version.test.mjs` (the pure helper):

1. `parseStandard parses "0.11" -> [0,11]`.
2. `parseStandard("0.x") sorts below every real minor` - `compareStandard("0.x","0.10") === -1`, `compareStandard("0.x","0.9") === -1`.
3. `compareStandard orders minors` - `compareStandard("0.9","0.10") === -1`, `compareStandard("0.11","0.10") === 1`, `compareStandard("0.10","0.10") === 0`.
4. `parseStandard returns null for garbage` - `"latest"`, `"1"`, `""`, `null`, `undefined`.
5. `isAfter is true only for a check newer than the pin` - `isAfter("0.10","0.9") === true`, `isAfter("0.10","0.10") === false` (equal is NOT after), `isAfter("0.x","0.9") === false`.
6. `isAfter returns false for a missing/garbage pin (back-compat full strength)` - `isAfter("0.10", undefined) === false`, `isAfter("0.10","latest") === false`.

Test file `tests/unit/standard-gate.test.mjs` (the downgrade + gate integration), modeled on `check-runner.test.mjs`:

7. `SINCE_BY_REQ has an entry for every spine reqId` - assert `Object.keys(SINCE_BY_REQ).length === 29` and that `U12`, `G7`, `G8`, `G9`, `G10` map to `"0.10"` and `U1` maps to `"0.x"` (guards the Step 2 table against drift).
8. `applyStandardDowngrade leaves a baseline error alone` - a synthetic `{severity:"error",reqId:"U1"}` with `pinned:"0.9"` stays an error.
9. `applyStandardDowngrade downgrades a post-pin error to warn and stamps provenance` - `{severity:"error",reqId:"G10"}` with `pinned:"0.9"` becomes `severity:"warn"`, `downgraded:true`, `since:"0.10"`, `pinned:"0.9"`; the original array is not mutated.
10. `applyStandardDowngrade does not downgrade when pinned equals since` - `{...reqId:"G10"}` with `pinned:"0.10"` stays an error.
11. `applyStandardDowngrade does not downgrade with no pin (back-compat)` - `pinned:undefined` leaves the error an error.
12. `the toolkit grades at full strength` - `runGate(REPO_ROOT)` (pinned `0.11`): `exitCode === 0`, and NO finding carries `downgraded === true` (every `since <= 0.11`). This is the dogfood invariant.
13. `a plugin pinned 0.9 with a post-pin defect does NOT gate-fail` - `runGate(anti/standard-pinned-009-postpin)`: `exitCode === 0`, `warnCount >= 1`, and at least one finding has `downgraded === true` with `reqId` in `{G9,G10}`.
14. `the same plugin pinned 0.11 DOES gate-fail` - copy the anti fixture to a temp dir, rewrite `library.json.standard` to `"0.11"`, `runGate(tmp)`: `exitCode === 1`, `errorCount >= 1`, no `downgraded` finding for that reqId.
15. `pinned 0.10 grades the 0.10 checks in-scope` - `runGate(golden/standard-pinned-010)`: the `since:"0.10"` checks are NOT downgraded (0.10 is not after 0.10); fixture is clean so `exitCode === 0` and no downgrades.
16. `--strict path: applyStandardDowngrade is bypassed` - call the strict branch logic (or factor the strict decision into a tiny exported helper and assert it returns the raw findings unchanged for a 0.9-pinned post-pin defect, so `errorCount >= 1`).

Extend `tests/unit/tier-report.test.mjs` and `tests/unit/evaluate.test.mjs`:

17. `tier-report does not list a post-pin check as a blocker` - over `anti/standard-pinned-009-postpin`, `computeTierReport(...).blocked` does NOT contain the downgraded `G9`/`G10` messages (they are warns now, not tier errors).
18. `evaluate --json exposes downgraded provenance` - `evaluate(anti/standard-pinned-009-postpin)` returns a report whose `findings` include a `downgraded:true` entry and whose `summary.errors === 0`.

Update `tests/unit/registry-sync.test.mjs`:

19. `every registered check declares a since` - add an assertion that every `m.meta.since` is a non-empty string (guards a future check that forgets `since`, which would default to `"0.x"` baseline and silently never downgrade). Keep the existing 29-count and unique-reqId assertions unchanged (F1 adds no check).

### Step 8 - regenerate only if needed

F1 touches no generated input (no component added, no `library.json` component list change, no `INDEX.md` source). Run the generators defensively and confirm no diff:

```
node scripts/generators/gen-manifest.mjs . --write --target=all
node scripts/generators/gen-index.mjs . --write
git diff --name-only
```

Expected: no change from the generators. If `manifest.generated.json` or `INDEX.md` changes, investigate before committing (it would mean F1 accidentally touched a tracked generated input).

## No Standard bump in F1 (and why)

F1 is **mechanism, not a requirement change**: it adds version-AWARENESS to the gate, but it neither adds, removes, nor tightens any tier requirement. The spine stays 29; every reqId and severity is unchanged for a plugin pinned at the current Standard (0.11). Therefore F1 does NOT bump `STANDARD.md` past 0.11 and does NOT bump `library.json.standard`. The STANDARD.md edit (Step 6) is the normative DESCRIPTION of the policy the gate now enforces, added at the current 0.11 line. (Contrast ADR 0028, which DID bump 0.10->0.11 because it relaxed a requirement. F1 changes no requirement.)

The plugin VERSION still bumps for the release: F1 is a user-facing gate feature, so the v1.3.0 version-bump PR (a separate PR, after F1 + F3 merge) moves `package.json`/`library.json` `version` to `1.3.0`. That bump is owned by the v1.3.0 release PR, not by F1's feature PR.

## The burndown window (documented, not yet exercised)

ADR 0027 prescribes warn-for-one-MINOR before a new requirement becomes an error. F1 ships the MACHINERY (the `since` annotation + the pinned-version downgrade) but does NOT itself introduce any new requirement, so there is no live burndown in this PR. The window is documented for the NEXT tightening:

- A future MINOR that adds, say, `U13` ships it with `meta.since` = that MINOR and severity `warn` (the check itself emits `SEVERITY.WARN`) for that one version. A plugin pinned at or above that MINOR sees a warn; a plugin pinned below sees the same warn via the downgrade path (a warn cannot be downgraded further). The toolkit, pinning current, sees the warn and the maintainer burns it down (fixes the toolkit) before the next MINOR.
- In the FOLLOWING MINOR, the check flips its own emitted severity to `SEVERITY.ERROR`; its `since` is unchanged (the version it was introduced at). Now a plugin pinned at or above that introduction version gates on it; a plugin pinned below still gets it as a `warn` via the downgrade. The window has elapsed.

So the downgrade path (F1) handles "older pin sees newer requirement as warn" forever; the per-check `warn->error` flip (a future PR per requirement) handles the one-version courtesy for plugins pinned AT the introduction version. Both are needed; F1 delivers the first and the policy text (Step 6) commits the maintainer to the second.

## Verification

Exact commands and expected results (run from the repo root unless noted):

| Command | Expected |
|---|---|
| `node scripts/check.mjs` | `Advanced`, `0 error(s), 0 warning(s)`; exit 0; NO `[downgraded ...]` line (the toolkit pins 0.11, every `since <= 0.11`). |
| `node scripts/check.mjs --strict` | Identical to above (the toolkit is clean at the full live spine; `--strict` just proves the downgrade was never the reason it passed). |
| `npm test` | All green, including `standard-version.test.mjs`, `standard-gate.test.mjs`, the extended `registry-sync`/`tier-report`/`evaluate` tests. Suite count rises by the new cases. |
| `node scripts/evaluate.mjs . --json` | `summary.errors: 0`; no finding has `downgraded: true`. |
| `node scripts/tier-report.mjs` | `Tier: Advanced (no blockers detected)`. |
| `node -e "import('./scripts/lib/standard-version.mjs').then(m=>console.log(m.isAfter('0.10','0.9'), m.isAfter('0.10','0.10'), m.isAfter('0.x','0.9')))"` | `true false false`. |
| `git grep -n "standard" library.json` | `"standard": "0.11"` unchanged (NO Standard bump in F1). |
| `git diff --name-only` | Only: `scripts/checks/*.mjs` (30 `meta` edits), `scripts/lib/standard-version.mjs` (new), `scripts/lib/standard-gate.mjs` (new), `scripts/lib/registry.mjs` (or `standard-gate.mjs` owns `SINCE_BY_REQ`), `scripts/check.mjs`, `scripts/tier-report.mjs`, `scripts/evaluate.mjs`, `STANDARD.md`, `tests/fixtures/golden/standard-pinned-current/**`, `tests/fixtures/golden/standard-pinned-010/**`, `tests/fixtures/anti/standard-pinned-009-postpin/**`, `tests/unit/standard-version.test.mjs`, `tests/unit/standard-gate.test.mjs`, `tests/unit/registry-sync.test.mjs`, `tests/unit/tier-report.test.mjs`, `tests/unit/evaluate.test.mjs`. |
| Adversarial probe: `git stash` a copy of the anti fixture, set its `standard` to `0.11`, run `node scripts/check.mjs tests/fixtures/anti/standard-pinned-009-postpin` | exit 1 (the defect gates at 0.11); restore the fixture to `0.9` and confirm exit 0. Proves the pin actually drives the downgrade. |

No version drift means: `library.json.version` and `package.json` version are equal and UNCHANGED by F1 (the v1.3.0 bump is a later PR); `library.json.standard` is `0.11` and UNCHANGED; `manifest.generated.json` and `INDEX.md` show no diff from the generators (Step 8). `U8`/`U9` (manifest-drift / version-match) stay green.

## Adversarial review

Run a 4-lens read-only review before merge (PROGRAM-PLAN release mechanics; Codex `/codex:review` is unreliable on this Windows setup per MEMORY, so use an own multi-agent read-only review). Lenses:

- **Soundness (false PASS / over-lenient).** Can the downgrade ever hide a defect it should gate? Confirm: a baseline (`"0.x"`) check is NEVER downgraded; a `since:"0.10"` check is downgraded ONLY when the pin parses and is strictly below 0.10; a missing/garbage pin yields full-strength grading (NOT a free pass). Confirm `applyStandardDowngrade` only ever turns error->warn, never the reverse, so it cannot turn a passing plugin into a failing one. Confirm a plugin cannot dodge a baseline (Bronze) error by pinning `"0.x"` literally in `library.json` (the table reserves `"0.x"` for check metadata; a plugin pinning a non-`MAJOR.MINOR` value parses to `null` -> full strength, so the sentinel is not a back door - add a test for `standard:"0.x"` in `library.json` grading at full strength).
- **Soundness (false FAIL / over-strict).** Does the toolkit itself, or any clean plugin pinned at current, see a spurious downgrade or a spurious error? Re-run `node scripts/check.mjs` and `--strict` and confirm byte-identical pass. Confirm the declared-tier ceiling still composes correctly (a downgraded advanced finding for a Silver-declared plugin behaves the same as today, since it was already out of the ceiling).
- **Determinism / sync.** Confirm `applyStandardDowngrade`, `parseStandard`, `compareStandard`, `isAfter` are synchronous, pure, and return arrays/scalars (no Promise, no I/O). The `registry-sync` "every check returns an array synchronously" test still passes (F1 added no check). Confirm no module-eval-time import cycle (the `standard-gate.mjs` leaf module avoids `check.mjs <-> tier-report.mjs`).
- **Contract / spec fidelity.** Confirm: no Standard version bump (still 0.11), no spine count change (still 29), no reqId added or renamed, no severity hardcoded differently in any check module. Confirm the STANDARD.md 7.7 text matches ADR 0027's decision outcome (burndown + pinned-version grading + authors-grade-full-strength). Confirm no em-dash / en-dash in any touched file (the PreToolUse hook guards Write, but sweep the diff). Confirm `library.json.standard` field doc in sec 5.1 still reads coherently with 7.7 (it already says "so tooling can validate against the right ruleset" - 7.7 now keeps that promise).

Fix every confirmed finding before merge; record the review.

## The PR

- **Title (Conventional Commit):** `feat(checks): standard-aware gate - per-check since + pinned-version downgrade (ADR 0027)`
- **Body outline:**
  - **What:** a `since` Standard-version annotation on every check `meta`; a pure `standard-version.mjs` arithmetic helper and a `standard-gate.mjs` downgrade pass; `scripts/check.mjs`, `tier-report.mjs`, and `evaluate.mjs` now read `library.json.standard` and downgrade post-pin checks error->warn; a `--strict` bypass; STANDARD.md sec 7.7; fixtures + tests.
  - **Why:** ADR 0027 - the gate ignored the pinned Standard and silently re-graded pinned-older plugins against the newest spine, breaking the sec 5.1 "validate against the right ruleset" promise. F1 honors the pin with pure version arithmetic, keeping the gate deterministic and model-free (Design Principle 3 / ADR 0023). Couples with F3 in the v1.3.0 gate-evolution release.
  - **How it stays green:** adding `since` is inert; the downgrade only ever turns error->warn; the toolkit pins the current Standard (0.11), so every `since <= 0.11` and it grades at full strength with zero downgrades (verified by gate Advanced 0/0 and a test asserting no `downgraded` finding).
  - **Scope guard:** no Standard version bump (still 0.11), no plugin version bump (the v1.3.0 bump is a later PR), no new/removed check (spine stays 29), no new component.
  - **Verification:** gate Advanced 0/0; `--strict` identical; `npm test` green; no version drift; the adversarial probe (re-pin the anti fixture to 0.11 -> exit 1) confirms the pin drives the gate; the 4-lens review ran.
  - **Trailer:** `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Commit / PR sequence (within the v1.3.0 program)

F1 is one PR vs protected `main`. The v1.3.0 release mechanics (PROGRAM-PLAN) sequence the whole program:

1. **F1 PR** (this plan) -> gate + CI green -> 4-lens adversarial review -> admin squash-merge. `main` stays at version 1.2.0, Standard 0.11.
2. **F3 PR** (per-rule config / profiles / suppressions; coupled, separate packet) -> same discipline -> squash-merge. F3 layers on F1's `since`/downgrade and on the linter-vs-judge config gaps.
3. **F4 PR** (housekeeping; separate packet) -> squash-merge.
4. **v1.3.0 version-bump PR** (the release PR, after F1+F3+F4): bump `library.json`/`package.json` `version` to `1.3.0`; regenerate native manifests + `manifest.generated.json` + `INDEX.md`; update `CHANGELOG` + `RELEASE-NOTES` + `STATUS`. `standard` stays `0.11` (no requirement changed in the gate-evolution release). Gate Advanced 0/0.
5. **Tag `v1.3.0`** -> `release.yml` mints the GitHub release behind the version-consistency guard -> re-pin the `product-on-purpose/agent-plugins` marketplace entry (new sha + version, registry `metadata` minor bump) -> install smoke-verify.

F1 does NOT cut a release on its own; it is the first merge of the v1.3.0 train. v1.4.0 (F2, the E1 report renderer) is a separate, larger release after the gate-evolution train ships.

## Rollback / risk notes

- **Independent PR.** If the downgrade proves unsound after merge (an over-lenient false pass or an over-strict false fail surfaces), revert the single F1 PR. F1 adds no check and bumps no version, so a revert strands nothing: the gate returns to today's behavior (grade at the live spine, ignore the pin), which is the documented pre-0027 status quo (ADR 0027 "until this lands ... option 3").
- **Pre-release safety.** F1 merges into `main` at version 1.2.0; nothing is tagged or published until the v1.3.0 release PR. A revert before the tag is clean.
- **Coupling with F3.** F1 is the dependency, not the dependent: F3 reads `since`/the downgrade but F1 does not need F3. If F3 slips, F1 can ship in v1.3.0 alone (or be held with it); either way F1 is internally complete and green.
- **Blast radius of the downgrade.** Because the downgrade only relaxes (error->warn) and only for plugins pinned BELOW a check's `since`, the only plugin whose grade can change is a third-party one pinned older than current; the toolkit is unaffected. The first real such consumer is the validation that the policy works as intended; until then the behavior is exercised solely by the anti fixture.
- **Sentinel choice.** If the maintainer later prefers per-check exact introduction versions over the `"0.x"` baseline sentinel (e.g. annotating U11 with its real introduction minor), that is a safe follow-up: tighten individual `since` values without touching the helper or the gate. The sentinel is the conservative default that guarantees no baseline check is ever downgraded for any real pin.
