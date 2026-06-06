# F3 - per-rule config, profiles, and suppressions - implementation plan

> Per-feature cadence (PROGRAM-PLAN v1.3.0 sec "release mechanics"): branch from `main`; build the config layer additively so that **no config file => today's behavior, byte for byte**; thread config through `scripts/check.mjs` / a `scripts/lib/config.mjs` helper WITHOUT changing the tier gate's existing semantics; add a suppressions matcher; add a `provenance` field to every check `meta`; split the report into "real issues" vs "profile conformance"; ship golden + anti tests for every new behavior; run a 4-lens adversarial review; squash-merge one PR vs protected `main`; then the version-bump PR cuts `v1.3.0` WITH F1. F3 is the configurability half of the v1.3.0 "gate evolution" release; F1 (standard-versioning / standard-aware gate, ADR 0027) is the version-awareness half. The two are COUPLED: both add per-run, declared-input-driven modulation of the same `gateExitFromFindings` decision, so they share the resolution path built here. See sec 9.

## 1. What F3 adds (and what it must not break)

F3 makes the deterministic gate **configurable per rule** without making it any less deterministic. It is the "linter scenario" punch-list items 1, 2, 3, and 6 from `_local/notes/evaluator-linter-vs-judge-and-consistency.md` (per-rule config, provenance tags, the no-dashes-style preference moved to opt-in, and a suppressions baseline), built on the architecture the toolkit already has.

Five new capabilities:

1. **A config loader** (`scripts/lib/config.mjs`): read + validate an optional `askit.config.json` at the plugin root; return a frozen, fully-defaulted config object; absent or empty file => the default config, which is a no-op.
2. **Per-rule overrides + profiles** applied in one resolver (`scripts/lib/resolve-config.mjs`) that maps each raw finding to its effective severity (`error` / `warn` / `off`), honoring profile selection then per-rule overrides. The resolver runs AFTER `runAllChecks` and BEFORE `gateExitFromFindings`, so the existing tier-ceiling gate is untouched.
3. **A suppressions matcher** (`scripts/lib/suppressions.mjs`): match a finding against baseline entries (by `reqId` + `file` glob + optional `message` substring) and mark matched findings suppressed, so a team can waive a known finding durably.
4. **A `provenance` field on every check `meta`** (`objective` | `vendor-cited` | `house`), used to split the report into "real issues" (objective + vendor-cited errors that survive config) vs "profile conformance" (house-preference findings and anything downgraded by the active profile).
5. **A minimal published-verdict trust clamp** (a `mode` on the config + the resolver): in `published-verdict` mode the resolver clamps any `objective`/`vendor-cited` finding that config or a profile tried to turn `off` back up to at least `warn` (surfaced, with a `clampNotice`), so a graded subject cannot disable a real check to dodge a PUBLISHED verdict. The default `local` mode applies every override as written. Decided in for v1.3.0 (PROGRAM-PLAN sec 7.2); it is the minimal version of the SPEC's RQ-F3-TRUST-1 and closes the "a profile becomes a backdoor to weaken the spine" risk for published results. It is inert in the default (`local`, no-config) path, so it does not touch the back-compat baseline.

The invariant, restated from PROGRAM-PLAN and ADR 0023 / Design Principle 3: **the gate stays synchronous and model-free.** Config is plain JSON read once and frozen; resolution is pure data transformation over the finding array; nothing here calls a model or does async I/O inside a check. The five `meta` consumers (`registry`, `check.mjs`, `tier-report.mjs`, `evaluate.mjs`, the docs generators) keep working because `provenance` is additive and defaulted.

**Hard back-compat contract (the acceptance spine):** with NO `askit.config.json` present, `node scripts/check.mjs .` produces the exact same findings, the exact same tier line, the exact same error/warn counts, and the exact same exit code as `main` at v1.2.0. This is asserted by a dedicated test (sec 7, test G-BC) and is the first thing the adversarial review re-derives.

## 2. The config file shape (`askit.config.json`)

A single optional JSON file at the plugin root, parsed by `readJsonSafe` (the same fail-safe reader the loader already uses). All keys optional; an absent file, an empty `{}`, or any absent key falls back to the documented default. Shape:

```json
{
  "mode": "local",
  "profile": "askit-library",
  "rules": {
    "G9": "warn",
    "G8": "off",
    "U5": { "severity": "warn" }
  },
  "suppressions": [
    { "reqId": "G7", "file": "docs/legacy/**", "reason": "pre-taxonomy archive, waived 2026-06" },
    { "reqId": "U11", "file": ".mcp.json", "message": "bearer_token", "reason": "false positive on an allowlisted field" }
  ]
}
```

- **`profile`** (string, default `"askit-library"`): names a built-in profile. A profile is a named map of `reqId -> severity` (or `"off"`) plus a one-line description, defined in code (`scripts/lib/profiles.mjs`), NOT user-authored in v1.3.0 (custom profiles are a named deferral, sec 10). The default `askit-library` profile is the identity profile: every rule keeps the severity its module declares, so selecting it (or omitting `profile`) reproduces today's behavior exactly.
- **`rules`** (object, default `{}`): per-`reqId` overrides applied AFTER the profile. A value may be a bare string (`"error"` | `"warn"` | `"off"`) or an object `{ "severity": "..." }` (the object form reserves room for F1's future per-rule `since`/`minStandard` keys and F3-future per-rule scope, without a breaking shape change). Unknown `reqId` keys are a validation warning, not fatal (sec 3).
- **`suppressions`** (array, default `[]`): baseline entries. Each is `{ reqId, file?, message?, reason }`. `reqId` is required; `file` is a glob (default `**`, matches any file including `null`-file findings only when the glob is exactly `**`); `message` is an optional case-sensitive substring; `reason` is required (a waiver with no recorded reason is a validation warning, encouraging the durable-disposition discipline the linter-vs-judge note argues for).
- **`mode`** (string, default `"local"`): `"local"` or `"published-verdict"`. In `local` mode (a team running its own gate) every override and suppression applies as written. In `published-verdict` mode (the mode the toolkit uses when it grades a third party for a PUBLISHED conformance result) the trust clamp (sec 5, "The published-verdict clamp") prevents a subject from disabling an `objective`/`vendor-cited` finding to dodge the verdict. The CLI `--mode <local|published-verdict>` overrides this for one run. An unrecognized value is a validation `warn` and falls back to `"local"`.

Key names are chosen so an F1 follow-up adds `"standard"` handling at the loader and a per-rule `since`/`minStandard` at the resolver without renaming anything (sec 9).

## 3. Step 1 - the config loader (`scripts/lib/config.mjs`)

Create `scripts/lib/config.mjs`. It owns reading and validating the file and producing a frozen, fully-defaulted config plus a list of config-validation findings (so a malformed config surfaces in the same report, not as a crash).

```js
// what-it-is:   the gate config loader
// what-it-does: reads the optional askit.config.json at the plugin root, validates it, and returns a
//               frozen { profile, rules, suppressions } with every default filled in, plus any
//               config-validation findings (a bad config is surfaced, never thrown)
// why:          per-rule severity/enable and suppressions make the deterministic gate a framework for a
//               team's own house rules (linter-vs-judge note sec 4); reading once keeps checks model-free
// used-by:      scripts/check.mjs, scripts/evaluate.mjs, scripts/tier-report.mjs (via resolve-config.mjs)
import path from "node:path";
import { readJsonSafe } from "./fs-utils.mjs";
import { finding, SEVERITY } from "./findings.mjs";
import { PROFILES } from "./profiles.mjs";

export const CONFIG_FILENAME = "askit.config.json";
const SEVERITIES = new Set(["error", "warn", "off"]);

export const DEFAULT_CONFIG = Object.freeze({
  mode: "local",              // local (apply every override) | published-verdict (trust clamp on)
  profile: "askit-library",   // the identity profile (no-op)
  rules: Object.freeze({}),
  suppressions: Object.freeze([]),
});

/** @returns {{ config, findings: Finding[] }} - config is always a usable, frozen object. */
export function loadConfig(root) {
  const p = path.join(root, CONFIG_FILENAME);
  const { data, parseError } = readJsonSafe(p);
  const findings = [];
  if (parseError) {
    findings.push(finding("config", SEVERITY.ERROR, `${CONFIG_FILENAME} is present but not valid JSON: ${parseError}. Falling back to defaults.`, { file: CONFIG_FILENAME, reqId: null }));
    return { config: DEFAULT_CONFIG, findings };
  }
  if (data === null) return { config: DEFAULT_CONFIG, findings }; // absent => no-op default
  // ... validate + normalize (below); push WARN-severity findings for soft problems
  return { config: normalize(data, findings), findings };
}
```

Validation rules (each emits a `finding` so it shows in the report; none throw):

- `data` is not an object => one `error` finding "askit.config.json must be a JSON object", return defaults.
- `profile` present but not a key of `PROFILES` => one `warn` "unknown profile '<x>'; using 'askit-library'", fall back to the default profile (do NOT fail the gate on a config typo).
- `mode` present but not `"local"` or `"published-verdict"` => one `warn` "unknown mode '<x>'; using 'local'", fall back to `"local"` (never silently strengthen OR weaken on a typo; `local` is the safe default).
- `rules[reqId]` whose normalized severity is not in `SEVERITIES` => one `warn` "rule '<reqId>': '<v>' is not error/warn/off; ignored", drop that one override.
- `rules` key that is not a known `reqId` (validated against the registry's reqId set, passed in or imported) => one `warn` "unknown rule id '<x>' in config.rules; ignored" (catches typos like `G99`).
- `suppressions[i]` missing `reqId` => `warn` "suppression #i ignored: reqId is required", drop it.
- `suppressions[i]` missing `reason` => `warn` "suppression #i has no reason; record why a finding is waived", keep it (the waiver still applies; the warning nudges the durable-disposition discipline).

`normalize(data, findings)` returns a frozen object with the three keys, defaults filled, invalid entries dropped (having pushed their findings). The reqId allowlist is obtained from the registry: export a `REQ_IDS` set from `scripts/lib/registry.mjs` (a one-liner `export const REQ_IDS = new Set(CHECKS.map(m => m.meta.reqId))`) so the loader validates against the real spine and stays in sync automatically.

**Why a separate `config` check pseudo-source for findings:** config-validation findings carry `check: "config"`, `reqId: null`. A `null` reqId maps to `universal` in `tierForReq`, so a config `error` (only the not-an-object case) gates Bronze and therefore halts a clearly-broken config; the soft `warn`s never gate. This reuses the existing severity/tier machinery with no new gate path.

## 4. Step 2 - the profiles table (`scripts/lib/profiles.mjs`)

Create `scripts/lib/profiles.mjs`: a small, code-defined table of named profiles. Built-in profiles for v1.3.0:

```js
// what-it-is:   the built-in gate profiles
// what-it-does: names maps of reqId -> effective severity (or "off") so a plugin can be graded against
//               a chosen rubric (full library ladder, or a lighter "plain plugin" rubric)
// why:          grading against the wrong rubric is the largest source of evaluator noise
//               (linter-vs-judge note sec 2 mechanism 1); a profile removes it up front, deterministically
// used-by:      scripts/lib/config.mjs (validation), scripts/lib/resolve-config.mjs (application)
export const PROFILES = Object.freeze({
  // The identity profile: every rule keeps the severity its module declares. Default; a no-op.
  "askit-library": Object.freeze({
    description: "The full Bronze/Silver/Gold Advanced Skill Library Standard, as the modules declare it.",
    rules: Object.freeze({}),   // empty => no override; the module's own severity stands
  }),
  // A lighter rubric: grade a vanilla plugin on the portable, vendor-grounded checks only, turning the
  // library-scaffolding and house-preference Gold/Silver checks to "off". Names exact reqIds, never a
  // wildcard, so adding a future check does not silently change a profile's meaning.
  "plain-plugin": Object.freeze({
    description: "Portable correctness only: the structural + vendor-grounded checks; library-ladder and house checks off.",
    rules: Object.freeze({
      // Example shape; the exact off-list is settled in the SPEC's profile table and re-derived here.
      G7: "off", G8: "off", G9: "off", G10: "off",
      // ... per the profile table in F3-gate-config/SPEC.md
    }),
  }),
});
```

The profile is `reqId -> severity` only. It deliberately does NOT change tiers, reqIds, or the registry. The "plain-plugin" off-list is fixed in the SPEC (so it is reviewable as a contract, not invented at build time) and mirrored here. This is the durable home for what ADR 0028 / the linter-vs-judge note call out: a house preference lives in a profile that a consumer selects, not in the universal gate. (U10 itself was already retired from the spine in v1.2.0 per ADR 0028, so it is not in any profile; profiles are for future house rules and for the plain-plugin/library split.)

## 5. Step 3 - the resolver (`scripts/lib/resolve-config.mjs`)

Create `scripts/lib/resolve-config.mjs`. This is the single place config touches findings. It takes the raw findings array, the loaded config, a `reqId -> provenance` map (from the registry), and the suppressions matcher, and returns annotated findings WITHOUT dropping any (transparency: a suppressed or downgraded finding is still reported, just flagged).

```js
// what-it-is:   the config resolver
// what-it-does: annotates each raw finding with its effective severity (after profile + per-rule
//               override), a suppressed flag (after the baseline matcher), and provenance, leaving the
//               array intact so the report can show what was downgraded/waived rather than hiding it
// why:          one resolution path keeps check.mjs, evaluate.mjs, and tier-report.mjs consistent and
//               keeps the gate deterministic (pure data transform, no model, no I/O)
// used-by:      scripts/check.mjs, scripts/evaluate.mjs, scripts/tier-report.mjs
import { PROFILES } from "./profiles.mjs";
import { matchSuppression } from "./suppressions.mjs";

/**
 * @param findings raw Finding[] from runAllChecks
 * @param config   frozen config from loadConfig
 * @param provenanceByReq Map<reqId, "objective"|"vendor-cited"|"house">
 * @returns ResolvedFinding[] = Finding & { effectiveSeverity, suppressed, suppressionReason, provenance, downgradedFrom }
 */
export function resolveFindings(findings, config, provenanceByReq) {
  const profileRules = (PROFILES[config.profile] ?? PROFILES["askit-library"]).rules;
  const published = config.mode === "published-verdict";
  return findings.map((f) => {
    const declared = f.severity;
    const provenance = provenanceByReq.get(f.reqId) ?? "objective";
    // precedence: per-rule override beats profile beats the module's declared severity
    const overridden = normalizeSeverity(config.rules[f.reqId]);
    const profiled = profileRules[f.reqId];
    let effectiveSeverity = overridden ?? profiled ?? declared;
    let sup = matchSuppression(f, config.suppressions);
    // Published-verdict trust clamp (decided for v1.3.0): a subject cannot disable an
    // objective/vendor-cited finding to dodge a PUBLISHED verdict. Such a finding turned "off"
    // (by rule, profile, OR a suppression) is surfaced at "warn" with a notice. House findings
    // are never clamped (they stay freely tunable). Inert unless mode === "published-verdict".
    let clampNotice = null;
    if (published && provenance !== "house" && (effectiveSeverity === "off" || sup)) {
      clampNotice = `clamped to warn in published-verdict mode (provenance ${provenance}): a published verdict cannot disable an objective or vendor-cited check`;
      effectiveSeverity = "warn";
      sup = null; // surfaced, not suppressed
    }
    return {
      ...f,
      provenance,
      effectiveSeverity,
      downgradedFrom: effectiveSeverity !== declared ? declared : null,
      suppressed: !!sup,
      suppressionReason: sup ? sup.reason ?? null : null,
      clampNotice,
    };
  });
}

/** A finding GATES iff its effective severity is "error" AND it is not suppressed. */
export function gatingFindings(resolved) {
  return resolved.filter((f) => f.effectiveSeverity === "error" && !f.suppressed);
}
```

`normalizeSeverity` accepts the bare-string and `{severity}` object forms and returns `"error"`/`"warn"`/`"off"` or `undefined`. Precedence is fixed and documented: **per-rule override > profile > module-declared**, then a final, mode-gated **published-verdict clamp** that lifts any `objective`/`vendor-cited` finding resolved to `off` (or matched by a suppression) back to `warn` when `mode === "published-verdict"` (and only then). A `"off"` finding never gates and is counted separately in the report (sec 6).

### Wiring into `check.mjs` without breaking the tier gate

The existing `gateExitFromFindings(findings, declaredTier)` already filters by `severity === "error"` and the tier ceiling. F3 changes its INPUT, not its logic: feed it the gating findings re-projected onto the finding shape it expects (its `severity` becomes the effective severity, and suppressed findings are removed). Concretely, edit `scripts/check.mjs`:

```js
import { loadConfig } from "./lib/config.mjs";
import { resolveFindings, gatingFindings } from "./lib/resolve-config.mjs";
import { provenanceByReq } from "./lib/registry.mjs"; // new export, sec 6

export function runGate(root, ctx = loadPlugin(root)) {
  const raw = runAllChecks(ctx);
  const { config, findings: configFindings } = loadConfig(root);
  const all = [...configFindings, ...raw];
  const resolved = resolveFindings(all, config, provenanceByReq());
  const gating = gatingFindings(resolved);
  // project effectiveSeverity back to .severity so gateExitFromFindings is UNCHANGED
  const forGate = gating.map((f) => ({ ...f, severity: f.effectiveSeverity }));
  const { errorCount, exitCode } = gateExitFromFindings(forGate, ctx?.library?.data?.tier);
  const warnCount = resolved.filter((f) => f.effectiveSeverity === "warn" && !f.suppressed).length;
  return { findings: resolved, errorCount, warnCount, exitCode, config };
}
```

`gateExitFromFindings` itself is NOT edited - its tier-ceiling filter and exit logic are exactly as v1.2.0. With the default config, every finding's `effectiveSeverity === severity`, no finding is suppressed, `configFindings` is empty, so `forGate` is identical to the old `findings.filter(error)` input and the exit code is identical. That equivalence is the back-compat proof and is exactly what test G-BC asserts.

### The published-verdict clamp (minimal, decided for v1.3.0)

`mode` defaults to `"local"`, in which the resolver above applies every override and suppression as written (a team owns its own gate). The single difference in `"published-verdict"` mode is the clamp already shown in `resolveFindings`: an `objective`/`vendor-cited` finding that a rule, profile, or suppression tried to turn `off` is surfaced at `warn` with a `clampNotice`, never silently dropped. This is the **minimal** realization of the SPEC's RQ-F3-TRUST-1 (no separate trust file, no per-rule trust list, no `info` level): just "a published verdict cannot disable a real check."

Why it is sound and bounded:

- **It only ever surfaces, never silently hides, and only for published results.** The clamp raises an `off`-disabled objective/vendor finding `off`->`warn`, and surfaces a suppressed objective/vendor finding at `warn` (turning a would-be-hidden `error` into a visible non-gating `warn` with a `clampNotice`). It never raises a severity to `error`, so turning the mode on can never flip a passing gate into a failing one (a `warn` does not gate). The consequence is explicit: in published mode a subject can still de-gate an objective `error` (a gating error becomes a non-gating warn), but never silently - it is always surfaced with the notice. It is inert in `local` mode and inert with no config (so the back-compat baseline and the dogfood are untouched).
- **House findings are never clamped.** A consumer can still disable any `house`-provenance rule (the whole point of profiles per ADR 0028) even in a published verdict; only `objective`/`vendor-cited` truth is protected.
- **Transparency, not enforcement-by-hiding.** A clamped finding carries a `clampNotice` and is reported, so the published report can state plainly that the subject's config tried to disable an objective check and the grader surfaced it anyway. The report's `dispositions` (sec 6b) gain a `clamped` count for this.

CLI wiring: the bottom-of-file CLI block in `check.mjs` and `evaluate.mjs` parses `--mode <local|published-verdict>` (the existing positional-root-plus-`--`flag style) and, when present, resolves with the mode overridden: `resolveFindings(all, { ...config, mode }, provenanceByReq())`. A bad `--mode` value exits non-zero with a clear message before running checks. The toolkit's own CI runs in the default `local` mode (its own gate is clean either way; the dogfood is unaffected, test G-BC). `published-verdict` is set by the path that grades a third party for a published result (and, later, by the published-verdict path of `askit-evaluate`).

Ordering note (vs the SPEC): the SPEC's sec 4.3 lists the clamp as step 5 and suppressions as step 6 with the clamp re-applied to objective/vendor suppressions. This minimal design intentionally collapses both into the single mode-gated conditional `(effectiveSeverity === "off" || sup)` evaluated in one pass, so "suppressions then clamp" (sec 9 end-to-end precedence) and "clamp, then suppress with the clamp re-applied" (SPEC sec 4.3) produce the identical outcome here. The folded form is the canonical v1.3.0 behavior.

## 6. Step 4 - provenance on every check + the report split

### 6a. Add `provenance` to every check `meta`

Add a `provenance` field to the `meta` object of every check module under `scripts/checks/*.mjs` (29 modules). Allowed values, defined as a frozen enum in `findings.mjs` next to `SEVERITY`:

```js
export const PROVENANCE = Object.freeze({ OBJECTIVE: "objective", VENDOR: "vendor-cited", HOUSE: "house" });
```

Classification rule (the SPEC carries the authoritative per-check table; this is the principle, straight from ADR 0028 / the linter-vs-judge note sec 2 mechanism 4):

- **`objective`** - a defect that is true regardless of taste: a dead reference link (`reference-links`), manifest drift (`manifest-drift`), a malformed `.mcp.json` (`mcp-valid`), a missing required file, JSON that does not parse. Cannot be waived on preference grounds.
- **`vendor-cited`** - grounded in an external authority (Anthropic / Claude Code / Codex / agentskills.io): the SKILL.md anatomy and frontmatter rules, agent-target presence, the description shape derived from the platform's triggering guidance.
- **`house`** - the toolkit's own convention with no external mandate: folder-READMEs (`G8`), source docblocks (`G9`), docs-presence (`G10`), docs-frontmatter taxonomy (`G7`). Legitimate as a graded Gold convention, but flagged so a consumer knows it is the Standard's opinion, not a portability law.

Each addition is a one-line, additive `meta` edit, e.g. in `source-doc.mjs`:

```js
export const meta = { id: "source-doc", tier: "advanced", reqId: "G9", provenance: "house" };
```

Then export a provenance accessor from `registry.mjs`:

```js
export const REQ_IDS = new Set(CHECKS.map((m) => m.meta.reqId));
export function provenanceByReq() {
  return new Map(CHECKS.map((m) => [m.meta.reqId, m.meta.provenance ?? "objective"]));
}
```

`provenance ?? "objective"` keeps a hypothetical un-annotated future check safe (defaults to the strictest, never-waivable class). The `registry-sync` test gains an assertion that every check declares a `provenance` in the enum (sec 7, test C), so the field cannot silently go missing.

### 6b. The "real issues vs profile conformance" split in the report

In `scripts/evaluate.mjs`, the report object gains a `dispositions` block computed over the resolved findings, and `formatReport` prints the split. The split is defined as:

- **Real issues** = resolved findings with `effectiveSeverity === "error"`, NOT suppressed, AND `provenance !== "house"`. These are the portable, defensible failures (objective + vendor-cited) that survive config. This is the count a third-party consumer should care about first.
- **Profile conformance** = resolved findings that are `error` under the active profile but are `provenance === "house"`, PLUS findings downgraded by the profile/override (`downgradedFrom != null`). These are "you do not meet THIS Standard's conventions" rather than "this artifact is broken."
- **Suppressed** = resolved findings with `suppressed === true` (reported as a count + a one-line-per-entry ledger, never silently dropped).
- **Warnings** = `effectiveSeverity === "warn"`, not suppressed.

Wire it into `baseReport` so terminal, `--json`, and the future E1 renderer share one shape:

```js
function dispositions(resolved) {
  const live = resolved.filter((f) => !f.suppressed);
  const realIssues = live.filter((f) => f.effectiveSeverity === "error" && f.provenance !== "house");
  // Clamped findings (objective/vendor checks the subject's config tried to disable, surfaced at warn by
  // the published-verdict clamp) are their OWN disposition. They carry downgradedFrom, but they MUST NOT
  // fall into profileConformance: bucketing them there would hide the very thing the clamp exists to surface.
  const clamped = live.filter((f) => f.clampNotice != null);
  const profileConformance = live.filter(
    (f) => f.clampNotice == null && ((f.effectiveSeverity === "error" && f.provenance === "house") || f.downgradedFrom != null)
  );
  return {
    realIssues: realIssues.length,
    profileConformance: profileConformance.length,
    suppressed: resolved.filter((f) => f.suppressed).length,
    clamped: clamped.length,   // objective/vendor checks the subject tried to disable, surfaced at warn (published-verdict mode)
    warns: live.filter((f) => f.effectiveSeverity === "warn").length,
    byProvenance: countBy(live, "provenance"),
  };
}
```

`formatReport` adds the split after the existing summary, e.g.:

```
Real issues (objective + vendor-cited errors): 0
Profile conformance (house conventions, profile downgrades): 3   suppressed: 1
Clamped (objective/vendor checks this config tried to disable, surfaced at warn): 1   [published-verdict mode]
```

The headline tier line and the `N error(s), M warning(s)` line are KEPT (back-compat for any consumer parsing them); the split is additive. The **Clamped** line is printed only in `published-verdict` mode (or whenever `dispositions.clamped > 0`), so a published verdict names plainly which objective/vendor checks the subject's config tried to disable; it is deliberately a separate line from profile conformance, never folded into it. The E1 renderer (F2, v1.4.0) reads `report.dispositions` directly; F3 only produces the field, it does not render HTML.

### 6c. The tier-report split

`computeTierReport` must grade on the RESOLVED gating findings, not raw findings, so a config that turns `G9` off actually unblocks the tier. Change its signature to accept resolved findings (default-compute them so the CLI path and tests keep working):

```js
export function computeTierReport(root, ctx = loadPlugin(root), resolved = defaultResolved(root, ctx)) {
  // bucket by tier using f.effectiveSeverity === "error" && !f.suppressed  (was f.severity === "error")
  ...
}
```

where `defaultResolved` runs `runAllChecks` + `loadConfig` + `resolveFindings` so a caller that passes nothing gets the same answer the gate would. With the default config, `effectiveSeverity === severity` and nothing is suppressed, so the bucketed errors are identical to v1.2.0 and the tier/burndown are unchanged (test G-BC covers this for `tier-report` too). The burndown lines additionally tag each blocker with its provenance, so the climb worklist shows which blockers are house conventions vs portable defects.

## 7. Step 5 - the suppressions matcher (`scripts/lib/suppressions.mjs`)

Create `scripts/lib/suppressions.mjs`. Pure, synchronous, no I/O.

```js
// what-it-is:   the suppressions (baseline) matcher
// what-it-does: tests whether a finding matches a baseline entry (reqId + optional file glob + optional
//               message substring), so a team can durably waive a known finding
// why:          a persisted waiver is the stateful version of "this is intentional, here is why"
//               (linter-vs-judge note sec 2 mechanism 3); paid once, respected every run
// used-by:      scripts/lib/resolve-config.mjs
import path from "node:path";

/** Minimal, dependency-free glob: supports ** , * , and literal path segments (slash-normalized). */
export function globToRegExp(glob) { /* ** -> .*, * -> [^/]*, escape the rest */ }

/** @returns the first matching suppression entry, or null. */
export function matchSuppression(finding, suppressions) {
  for (const s of suppressions) {
    if (s.reqId !== finding.reqId) continue;
    if (s.message && !(finding.message ?? "").includes(s.message)) continue;
    if (s.file && s.file !== "**") {
      if (finding.file == null) continue;              // a file-scoped suppression never matches a null-file finding
      if (!globToRegExp(s.file).test(finding.file)) continue;
    }
    return s;
  }
  return null;
}
```

Matching rules, fixed so the matcher is auditable:

- `reqId` must match exactly (a suppression is always scoped to one rule; no wildcard reqId in v1.3.0).
- `file` is a slash-normalized glob over the finding's repo-relative `file`. `**` (the default) matches any finding including `file: null` ones; any narrower glob requires a non-null `file` and a path match. Findings already carry slash-normalized `file` via `relPath`, so no OS path divergence.
- `message` is an optional case-sensitive substring of the finding message (lets a team waive one specific manifestation of a multi-finding rule, e.g. one allowlisted MCP field, without disabling the whole rule).
- First match wins; the entry's `reason` rides along to the report ledger.

No autofix in F3 (the linter-vs-judge punch-list item for autofix is a separate, later enhancement; called out in sec 10).

## 8. Step 6 - golden + anti tests

New test file `tests/unit/config.test.mjs` plus targeted additions to `registry-sync.test.mjs`. Tests use the existing temp-dir + fixture patterns (mirroring `source-doc.test.mjs` and `check-runner.test.mjs`). Every test asserts on `reqId`, `effectiveSeverity`, and counts, never on prose.

| ID | Test (one line) | Asserts |
|---|---|---|
| **G-BC** | **no config => byte-identical behavior** (the back-compat spine) | over `golden/minimal-skill` AND the repo root: `runGate` findings, tier, errorCount, warnCount, exitCode equal a snapshot taken with the resolver bypassed; `loadConfig(noConfigDir).config === DEFAULT_CONFIG` (or deep-equals it) |
| **A** | **severity override** | temp dir with a real `error` finding (e.g. a missing reference link) + `askit.config.json` `{ "rules": { "<reqId>": "warn" } }`: that finding's `effectiveSeverity === "warn"`, `downgradedFrom === "error"`, exit code flips 1 -> 0, finding still PRESENT in the report |
| **B** | **a disabled rule** | same finding + `{ "rules": { "<reqId>": "off" } }`: `effectiveSeverity === "off"`, not in gating, not counted as error or warn, still present with `downgradedFrom` set |
| **C** | **a profile downgrades house checks** | a Gold fixture failing `G9` + `{ "profile": "plain-plugin" }`: `G9` resolves to `off`, real-issues count excludes it, tier no longer blocked by `G9`; with default profile the same fixture is blocked by `G9` |
| **D** | **a suppressed finding** | a fixture with one `G7` finding under `docs/legacy/x.md` + a suppression `{ reqId: "G7", file: "docs/legacy/**", reason: "..." }`: that finding `suppressed === true`, excluded from gating + counts, listed in the suppressed ledger; a suppression with a non-matching `file` glob does NOT suppress |
| **E** | **suppression specificity** | `message`-scoped suppression matches only the finding whose message contains the substring; `file: "**"` matches a `file: null` finding; a narrower glob does not |
| **F** | **provenance counts / report split** | over a fixture with mixed objective + house errors: `report.dispositions.realIssues` counts only objective + vendor-cited errors, `profileConformance` counts house errors + downgrades, `byProvenance` sums to the live-finding total |
| **G** | **provenance is declared on every check** (in `registry-sync.test.mjs`) | every `m.meta.provenance` is one of the `PROVENANCE` enum values; `provenanceByReq().size === CHECKS.length` |
| **H** | **malformed config is surfaced, not thrown** | a temp dir with invalid-JSON `askit.config.json`: `loadConfig` returns `DEFAULT_CONFIG` + one `config` error finding; an unknown `profile` / unknown rule id / valueless severity each yields a `warn` finding and a safe fallback, gate does not crash |
| **I** | **precedence** | `{ "profile": "plain-plugin", "rules": { "G9": "error" } }` where the profile turns `G9` off: the per-rule override wins, `G9` resolves to `error` (per-rule > profile > declared) |
| **J** | **published-verdict clamp** | an `objective` finding (e.g. a dead `reference-links`, `U6`) + `{ "rules": { "U6": "off" }, "mode": "published-verdict" }`: `U6` is clamped to `effectiveSeverity === "warn"`, carries a `clampNotice`, and is reported (not dropped); `dispositions.clamped === 1` AND `dispositions.profileConformance` does NOT count the clamped `U6` (it surfaces under `clamped`, never hidden as profile conformance). The SAME config in `local` mode (or default) drops it (`effectiveSeverity === "off"`, not reported as a gating issue). A `house` finding (`G9`) set `off` in `published-verdict` mode is NOT clamped (stays `off`, no notice). A suppression of `U6` in `published-verdict` mode also surfaces at `warn` with a notice (`suppressed === false`); in `local` mode it suppresses. |

Fixtures: reuse existing `golden/minimal-skill` and the Gold fixtures that already fail `G7/G8/G9`; add small committed fixtures only where a temp dir is awkward. Do NOT commit an `askit.config.json` at the repo root (the toolkit grades itself with the default no-op behavior; a committed config would change the dogfood gate and the back-compat baseline). Config-bearing cases are built in temp dirs, the `source-doc`/`no-dashes` precedent.

## 9. The F1 pairing (coupling, not merge)

F1 (standard-versioning / standard-aware gate, ADR 0027) and F3 modulate the SAME decision - which findings gate - from two declared inputs: F1 from `library.json.standard`, F3 from `askit.config.json`. They are built to compose, in this order at the resolver:

1. **F1 (when it lands):** a check whose `meta.since` is newer than the plugin's pinned `standard` is downgraded to `warn` (the burndown). This is a `meta.since` field added next to `meta.provenance` and a comparison in `resolveFindings` BEFORE the F3 profile/override step.
2. **F3:** the profile, then the per-rule override, then suppressions, as in sec 5.

Resolution precedence end to end becomes: **per-rule override > profile > standard-aware burndown > module-declared severity**, then suppressions remove from gating, then (in `published-verdict` mode only) the trust clamp lifts any `objective`/`vendor-cited` finding that a prior step turned `off` back to `warn`. F3 deliberately leaves the seam for F1: `meta` already gains one additive field (`provenance`) the exact way `since` will; `resolveFindings` is the one function F1 extends; the `rules` object form (`{ "severity": ... }`) already tolerates an F1 `minStandard` per-rule key. If F1 lands first, F3 slots its profile/override step after F1's burndown step in the same function. If F3 lands first (the assumed order, since F3 is the broader configurability change), F1 inserts its burndown step ahead of F3's profile step with no rename. Either way the two ship in the same `v1.3.0` cut. The version-bump PR (sec 11) only happens once both feature PRs are merged green.

## 10. Out of scope (named deferrals)

- **User-authored custom profiles** in `askit.config.json` (a `profiles` block defining new `reqId -> severity` maps). v1.3.0 ships only the two built-in profiles (`askit-library`, `plain-plugin`); custom profiles are a fast-follow once the built-in shape proves out.
- **Autofix** for mechanical rules (the linter-vs-judge punch-list item): not in F3; a separate enhancement.
- **F1's standard-aware burndown itself** (the `meta.since` comparison and the `library.json.standard` read): that is F1's deliverable. F3 only leaves the seam (sec 9).
- **The E1 HTML/MD report renderer** (F2, v1.4.0): F3 produces `report.dispositions`; it does not render it. The Gemini emitter remains a named v1.x deferral, untouched here.
- **Intent auto-detection** (linter-vs-judge mechanism 2): the profile is selected explicitly in config, not inferred.

## 11. Verification checklist + commit/PR sequence

### Verification (run from repo root unless noted)

| Command | Expected |
|---|---|
| `node scripts/check.mjs .` (NO config present) | `Advanced`, `0 errors, 0 warnings`; identical tier line + counts + exit 0 as v1.2.0 `main` (back-compat) |
| `node --test tests/unit/config.test.mjs` | all cases green (A-J + G-BC) |
| `npm test` | all green; `registry-sync` now asserts 29 checks AND every check declares a `provenance` |
| `node scripts/evaluate.mjs .` | terminal output keeps the tier + `N error(s), M warning(s)` lines AND adds the real-issues / profile-conformance / suppressed split |
| `node scripts/evaluate.mjs . --json` | report object has `dispositions` with `realIssues`, `profileConformance`, `suppressed`, `warns`, `byProvenance`; findings carry `effectiveSeverity`, `provenance`, `suppressed`, `downgradedFrom` |
| Adversarial probe 1 (override) | a temp plugin with a real error + `{ "rules": { "<id>": "warn" } }` => exit 0, finding present as warn |
| Adversarial probe 2 (off + tier) | `{ "rules": { "G9": "off" } }` over a G9-failing Gold fixture => tier unblocked, `G9` not in gating, still listed |
| Adversarial probe 3 (suppression) | a matching suppression removes a finding from gating + counts and lists it in the ledger; a non-matching `file` glob leaves it gating |
| Adversarial probe 4 (malformed) | invalid-JSON config => one `config` error finding + default behavior, no crash; unknown profile => warn + fallback |
| Adversarial probe 5 (published-verdict clamp) | a temp plugin with a dead link + `{ "rules": { "U6": "off" }, "mode": "published-verdict" }` => `U6` surfaces at `warn` with a `clampNotice` (not dropped); the same config in default/`local` mode drops it; a `house` rule set `off` is NOT clamped |
| `git diff --name-only` | only the intended files (below); NO committed `askit.config.json`; the toolkit's own dogfood gate unchanged |

### The single feature PR

One PR vs protected `main` (F3), separate from F1's PR.

- **Branch:** `git switch main && git pull && git switch -c v1.3.0-f3-gate-config`
- **Files added:** `scripts/lib/config.mjs`, `scripts/lib/profiles.mjs`, `scripts/lib/resolve-config.mjs`, `scripts/lib/suppressions.mjs`, `tests/unit/config.test.mjs`, plus any small fixtures under `tests/fixtures/`.
- **Files edited:** `scripts/lib/findings.mjs` (add `PROVENANCE`), `scripts/lib/registry.mjs` (add `REQ_IDS`, `provenanceByReq`), all 29 `scripts/checks/*.mjs` (one-line `provenance` on `meta`), `scripts/check.mjs` (load + resolve + gate on resolved, `--mode` flag), `scripts/tier-report.mjs` (grade on resolved), `scripts/evaluate.mjs` (`dispositions` + split in `formatReport`, `--mode` flag), `tests/unit/registry-sync.test.mjs` (provenance + accessor assertions), `docs/internal/backlog/enhancements.md` (note autofix + custom-profiles deferrals).
- **Docblocks:** each new `scripts/lib/*.mjs` carries the four-field header docblock (so `G9` stays green on the dogfood).
- **Author-before-enforce note:** F3 adds NO new gated check, only a `meta` field and a resolution layer; the dogfood gate must stay `Advanced 0/0` because the default config is a no-op and `provenance` is additive. There is no "flip" step; the gate equivalence (test G-BC) is the safety property.
- **Title:** `feat(gate): per-rule config, profiles, suppressions, provenance + published-verdict clamp [F3]`
- **Body:** What (the five capabilities, including the minimal published-verdict trust clamp, + the report split); Why (linter-vs-judge note sec 4 punch-list 1/2/3/6; ADR 0028's "house preference belongs in an opt-in surface"; the clamp closes the "profile as a backdoor" gameability risk for published verdicts); Back-compat (no config => identical behavior, test G-BC; the clamp is inert in the default `local` mode); The F1 pairing (sec 9, the shared resolver seam); Verification (the table above ran, including the clamp probe); Scope guard (no version bump - that is the joint v1.3.0 cut; no E1 renderer; no custom profiles; no new spine check). Trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Adversarial review:** a 4-lens own multi-agent read-only review before merge (Codex `/codex:review` is unreliable on this Windows setup, MEMORY): (1) **soundness/false pass + trust** - can config make the gate pass something genuinely broken in a way that misrepresents it? confirm objective findings are never silently dropped (only ever shown as suppressed/downgraded with a reason, never removed from the report), and confirm the published-verdict clamp lifts an `objective`/`vendor-cited` finding turned `off`/suppressed back to `warn` (a subject cannot disable a real check in a published verdict) while never clamping a `house` finding and never gate-failing a plugin; (2) **back-compat** - re-derive G-BC independently over the repo and the golden fixture, and confirm the clamp is inert in default/`local` mode; (3) **determinism/sync** - confirm `loadConfig`, `resolveFindings`, `matchSuppression` are synchronous and the `registry-sync` array-return guard still holds; (4) **precedence + matcher correctness** - per-rule > profile > declared, then the mode-gated clamp last; glob matcher does not over-match (`docs/legacy/**` does not match `docs/legacy.md`), `file: null` only matched by `**`. Fix every confirmed finding; record the review.
- **Merge:** admin squash once CI + gate green and the review is clean.

### The joint version-bump PR (after BOTH F1 and F3 are merged)

A separate PR cuts `v1.3.0` for the gate-evolution release (the proven release flow, PROGRAM-PLAN): bump `library.json` + `package.json` to `1.3.0` (and `library.json.standard` to the F1 value if F1 advances the Standard); regenerate the native manifests + `manifest.generated.json` + `INDEX.md`; update `CHANGELOG`, `RELEASE-NOTES`, `STATUS`. Then tag `v1.3.0` (release.yml mints the GitHub release behind the version-consistency guard), and re-pin the `product-on-purpose/agent-plugins` marketplace entry (new sha + version, registry metadata minor bump). F3's own feature PR does NOT bump any version; the bump is the joint cut with F1.

## 12. Definition of Done

- [ ] `scripts/lib/config.mjs`, `profiles.mjs`, `resolve-config.mjs`, `suppressions.mjs` exist, each synchronous, model-free, with a four-field docblock.
- [ ] Every check `meta` declares a `provenance` in the `PROVENANCE` enum; `registry-sync` asserts it; `provenanceByReq()` covers all 29 checks.
- [ ] `node scripts/check.mjs .` with no config is byte-identical to v1.2.0 (test G-BC green over the repo and the golden fixture).
- [ ] Per-rule severity override, a disabled rule, a profile downgrade, and a suppression all behave per the test table (A-J green); precedence is per-rule > profile > declared.
- [ ] The report (terminal + `--json`) carries the real-issues vs profile-conformance vs suppressed split via `report.dispositions`; the tier-report grades on resolved findings and tags blockers by provenance.
- [ ] The minimal published-verdict clamp ships: `mode` defaults to `local` (clamp inert, back-compat preserved); `published-verdict` mode lifts an `objective`/`vendor-cited` finding turned `off` (by rule, profile, or suppression) up to `warn` with a `clampNotice`, never clamps a `house` finding, and can never gate-fail a plugin (warn-only); `--mode` overrides the file; `dispositions.clamped` counts it; test J is green.
- [ ] A malformed / unknown-key config is surfaced as findings and never crashes the gate.
- [ ] `npm test` green; `node scripts/check.mjs .` -> `Advanced 0/0`; no committed `askit.config.json`.
- [ ] The F1 seam is documented (sec 9) and the `resolveFindings` precedence leaves room for F1's burndown step.
- [ ] The adversarial 4-lens review ran and findings are resolved; the PR merged; the joint `v1.3.0` cut is sequenced after F1 also merges.
