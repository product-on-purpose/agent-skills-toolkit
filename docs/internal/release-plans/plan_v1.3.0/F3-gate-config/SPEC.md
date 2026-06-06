# F3 - per-rule config, profiles, suppressions, and provenance - SPEC

> Realizes the v1.3.0 "gate evolution" feature **F3**: turn the fixed, hardcoded-severity check spine into a configurable linter while keeping the gate deterministic, synchronous, and model-free (Design Principle 3 / ADR 0023). F3 is the proper home for opt-in house preferences - the place the retired `U10 no-dashes` rule should have lived ([ADR 0028](../../../decisions/0028-retire-u10-no-dashes-from-the-spine.md), D4 / option 4) - so a future preference is a toggle, not a law.
> Source analysis: [`_local/notes/evaluator-linter-vs-judge-and-consistency.md`](../../../../../_local/notes/evaluator-linter-vs-judge-and-consistency.md) sections 1, 4, 8 (the linter framing, the four missing mechanisms, the punch-list). F3 implements punch-list items 1, 2, 3, and 6.
> Coupling: F3 ships in the same v1.3.0 release as **F1** (standard-versioning / standard-aware gate, [ADR 0027](../../../decisions/0027-standard-versioning-and-compatibility-policy.md)). Both add version-awareness and configurability to the deterministic gate; this SPEC defines how F3's config composes with F1's `since`-based severity downgrade and with the existing declared-tier ceiling (section "Composition order"). The F2 designed report renderer is a separate v1.4.0 feature ([backlog E1](../../../backlog/enhancements.md)); F3 only adds the report FIELDS that renderer will surface, not the renderer.

## 1. Goal

Today the spine is a fixed ordered array (`scripts/lib/registry.mjs`) and each check hardcodes its severity (`SEVERITY.ERROR` / `SEVERITY.WARN`). A consumer cannot turn a rule off, downgrade it, scope it, accept a known finding, or grade against anything other than the toolkit's own Bronze/Silver/Gold ladder without editing source (linter-vs-judge note sec 4). F3 closes that with five additive mechanisms, each pure deterministic data + version/string arithmetic:

1. **Per-rule config** - a config source that maps a check to a severity (`error|warn|info|off`) or disables it outright.
2. **Named profiles** - a profile selects a check subset + a severity map, so a plain Claude Code plugin is graded as a plain Claude Code plugin, not against the askit library ladder.
3. **Suppressions / baseline** - a durable file that waives specific known findings so a team accepts them once instead of re-triaging every run.
4. **Provenance** - a `provenance` tag on every check meta (`objective | vendor-cited | house`) and a report that separates a **real-issues** count (objective + vendor-cited) from **profile conformance** (house + profile-selected).
5. **An `info` severity** - a non-gating, non-warning level for advisory/house findings, so a profile can surface a preference without it counting as a warning.

The gate stays model-free: every mechanism here is plain JSON-driven data and severity/string comparison, evaluated synchronously inside `runAllChecks`-equivalent code. No LLM is in the loop, and the deterministic verdict for a given (tree, config, profile, pinned-Standard) tuple is reproducible (linter-vs-judge note sec 5, Layer A).

## 2. Config location decision (read this first)

**Decision: a dedicated `askit.config.json` file at the plugin root, NOT new `library.json` fields.** Justification:

- **Separation of contract from preference.** `library.json` is the plugin's published identity and the artifact the Standard grades (`name`, `version`, `standard`, `tier`, `components`); `U1 library-json` validates a closed required-field set (`scripts/checks/library-json.mjs`). Gate configuration is the consumer's local grading preference, not part of what the plugin asserts about itself. Mixing them would mean a plugin ships its own severity overrides inside the file the gate reads to grade it - a plugin could weaken its own gate by editing the artifact under test. Keeping config in a separate file keeps `library.json` a clean published contract.
- **A graded plugin must not be able to relax its own gate.** When the toolkit grades a third party, the third party's `askit.config.json` is THEIR local preference for THEIR CI; when the toolkit publishes a conformance verdict it runs with config resolution scoped per section "Trust and the published-verdict mode" so a subject cannot downgrade `objective`/`vendor-cited` rules to dodge a real failure.
- **Precedent and discoverability.** Project-root config is the established linter ergonomic (`.eslintrc`, `.prettierrc`, and the visible `tsconfig.json` / `vite.config.js` family); the linter-vs-judge note named a config layer in the dotfile style (sec 4). The maintainer chose the **visible `askit.config.json`** over the dotfile form (decided 2026-06-06, PROGRAM-PLAN sec 7.2): it is more discoverable for a newcomer and pairs naturally with a future `askit.config.*`. It is opt-in by absence: no file means today's behavior exactly.
- **No schema churn on the published contract.** Adding fields to `library.json` would force a `U1` schema change and a Standard clause for each. `askit.config.json` carries its own versioned schema (`configVersion`) independent of the Standard version.

`askit.config.json` is parsed once into `ctx.config` by the loader (section "RQ-F3-LOAD-1"), the same fail-safe JSON read the loader already uses for `.mcp.json` / `.claude-plugin/plugin.json` (`readJsonSafe`, `scripts/lib/load-plugin.mjs`).

## 3. Requirements

RFC 2119 language. Each requirement carries a testable acceptance criterion. Requirement ids are `RQ-F3-*`.

### RQ-F3-LOAD-1 - the loader parses `askit.config.json` into `ctx.config`

`loadPlugin(root)` (`scripts/lib/load-plugin.mjs`) MUST read an optional `askit.config.json` at the plugin root via `readJsonSafe`, exposing `ctx.config = { path, data, parseError }` parallel to `ctx.library`. Absent file MUST yield `{ path, data: null, parseError: null }` and MUST NOT change any check result (today's behavior is the no-config baseline). A present-but-malformed `askit.config.json` MUST surface as a single `error` finding from a new `config-valid` validator (RQ-F3-VALID-1), NOT crash the gate.

- **Acceptance:** a unit test loads a tree with no `askit.config.json` and asserts `ctx.config.data === null` and that `runGate` output is byte-identical to the pre-F3 baseline (a golden snapshot of the toolkit's own findings); a tree with a valid `askit.config.json` exposes the parsed object; a tree with `{ bad json` yields exactly one `config-valid` error and the rest of the gate still runs.

### RQ-F3-VALID-1 - a `config-valid` check validates `askit.config.json` shape

The toolkit MUST ship `scripts/checks/config-valid.mjs` exporting `meta = { id: "config-valid", tier: "universal", reqId: "U13", provenance: "objective" }` and a synchronous `check(ctx)` returning `finding(...)` objects, registered in `CHECKS`. It MUST validate, when `ctx.config.data` is present:

1. `configVersion` is a recognized string (the current schema version constant, e.g. `"1"`).
2. `rules` (if present) is an object whose values are each one of `"error" | "warn" | "info" | "off"` (RQ-F3-RULES-1).
3. Every key under `rules` is a known check `id` or known `reqId` (RQ-F3-RULES-2 resolution); an unknown key is an `error` (a typo would otherwise silently no-op).
4. `profile` (if present) is one of the named profiles (RQ-F3-PROF-1) or `null`.
5. `suppressions` (if present) is a string path that resolves to an existing file, or an inline array (RQ-F3-SUPP-1).

- **Acceptance:** golden `askit.config.json` (valid) -> zero `config-valid` findings; anti cases (bad `configVersion`, a `rules` value of `"silent"`, a `rules` key `"U99"`, an unknown `profile`, a missing suppressions path) each -> one specific `config-valid` `error` naming the offending key. `meta.reqId === "U13"`, `meta.tier === "universal"` (a malformed local config is an objective defect that binds every plugin that ships one). The check is vacuous (zero findings) when `askit.config.json` is absent.

### RQ-F3-SEV-1 - the finding shape and the new `info` severity

`scripts/lib/findings.mjs` MUST add `INFO: "info"` to the `SEVERITY` enum and accept it in `finding(...)`. The finding object gains no new required field at construction time; provenance and effective-severity are attached during resolution (RQ-F3-RESOLVE-1), not by each check. `info` MUST be reportable, MUST NOT gate (it never contributes to `exitCode`), and MUST NOT be counted as a `warn` in `summary` (it gets its own `infos` count).

- **Acceptance:** `finding("x", SEVERITY.INFO, "m")` succeeds; `finding("x", "loud", "m")` still throws; `gateExitFromFindings` returns `exitCode 0` for a findings array whose only `error`-class entries are `info`; `evaluate.mjs` `summary` reports `{ errors, warns, infos }`.

### RQ-F3-PROV-1 - every check declares provenance, and the report splits real issues from conformance

Every check's `meta` MUST carry `provenance: "objective" | "vendor-cited" | "house"`. The assignment is normative and recorded in the provenance table (section "Provenance assignments"). `objective` = a defect true regardless of any standard (a dead reference link, malformed JSON, a manifest that disagrees with source). `vendor-cited` = backed by an external authority (Anthropic/Claude Code, OpenAI/Codex, agentskills.io) cited in the check's docblock. `house` = an askit-Standard convention or a style preference with no external authority.

The report object (`evaluate.mjs`) MUST add a `provenanceSummary` that splits the finding counts into:

- **realIssues** = count of `error`/`warn`-severity findings whose check provenance is `objective` or `vendor-cited`.
- **profileConformance** = count of findings whose provenance is `house` OR that fired only because of the selected profile/askit ladder.

- **Acceptance:** every entry in `CHECKS` has a `meta.provenance` in the allowed set (a `provenance-coverage` unit test iterates `CHECKS` and asserts membership); the provenance table in this SPEC matches the code (a test asserts table-vs-code agreement for at least the listed reqIds); a report run over a fixture with one `objective` error and one `house` error reports `realIssues: 1` and `profileConformance: 1`.

### RQ-F3-RULES-1 - per-rule severity override and disable

`askit.config.json` `rules` MUST let a consumer set a per-check effective severity to one of `error | warn | info | off`, keyed by check `id` (e.g. `"reference-links"`) or `reqId` (e.g. `"U6"`). `off` MUST drop every finding from that check entirely (the check still runs - it is synchronous and cheap - but its findings are discarded before aggregation, so disabling is observable only as their absence). `error`/`warn`/`info` MUST override the severity the check emitted, per finding, before gating and counting.

- **Acceptance:** with `rules: { "U6": "warn" }`, a tree that fails `reference-links` reports a `warn` (not `error`) for `U6` and the gate exit drops to 0 if `U6` was the only blocker; with `rules: { "reference-links": "off" }`, the same tree reports zero `U6` findings; with no `rules`, severities are exactly as the checks emit (baseline).

### RQ-F3-RULES-2 - id vs reqId resolution, precedence, and one-key-one-rule

A `rules` key MUST resolve to exactly one check. Resolution: match a check whose `meta.id` equals the key; else a check whose `meta.reqId` equals the key. If a key matches neither, `config-valid` flags it (RQ-F3-VALID-1.3). A check `id` key and that same check's `reqId` key MUST NOT both appear (ambiguous intent); `config-valid` MUST flag the collision as an `error`. Resolution MUST be case-sensitive and exact (no prefix matching), so `"U6"` never accidentally matches `"U6x"`.

- **Acceptance:** `rules: { "reference-links": "off", "U6": "warn" }` -> one `config-valid` `error` (collision, same check); `rules: { "G9": "off" }` resolves to `source-doc`; `rules: { "nope": "warn" }` -> one `config-valid` `error` (unknown).

### RQ-F3-PROF-1 - named profiles select a subset + a severity map

The toolkit MUST ship a small set of named profiles as static data (`scripts/lib/profiles.mjs`), each declaring (a) which checks are in scope (an id/reqId allowlist or the sentinel `"all"`) and (b) a base severity map applied before `rules`. At minimum:

- **`askit-library`** (the default; today's behavior) - all 29 checks, severities exactly as emitted, graded against the Bronze/Silver/Gold ladder. Selecting it MUST reproduce the pre-F3 gate result byte-for-byte.
- **`claude-code-plugin`** - the subset of checks that proxy a real Claude Code plugin outcome regardless of the askit Standard: the `objective` and `vendor-cited` checks (e.g. `frontmatter-valid`, `name-matches-dir`, `reference-links`, `description-score`, `mcp-valid`, `mermaid-valid`, `manifest-drift`, `anatomy`). The askit-ladder-specific scaffolding checks (e.g. `library-json` U1, `self-hosting` G2, `components-index`, the folder-README / source-doc / docs-presence Gold set) are out of this profile's subset (they grade against the askit library contract a plain plugin never adopted, per linter-vs-judge note sec 1 "Right scope"). Findings from in-subset checks keep their emitted severity; the excluded checks do not run for the verdict.
- **`house-style`** (opt-in, additive) - turns ON the optional house-preference checks that default to `off`/excluded elsewhere. This is the home ADR 0028 D4 named for a future re-homed dash rule or any team convention. Default state of the dash preference remains the shipped `hooks/no-dashes.mjs` hook (ADR 0028); the `house-style` profile is where a graded-time version would live, never in `askit-library`.

A profile MAY be combined additively with the active selection (e.g. `askit-library` + `house-style`); composition is union-of-subsets then `rules` override (section "Composition order").

- **Acceptance:** `profile: "claude-code-plugin"` over a tree that fails only `U1 library-json` (no `library.json`) and `self-hosting` reports those as **not run** (not in subset) and yields a clean verdict, while the same tree under `askit-library` fails U1; `profile: "askit-library"` (or absent) reproduces the baseline snapshot; an unknown profile name is a `config-valid` error.

### RQ-F3-PROF-2 - profile does not relax objective/vendor findings in published-verdict mode

A profile and `rules` MAY freely downgrade or disable `house`-provenance findings. They MUST NOT be able to downgrade an `objective`-provenance finding below `warn` when the gate runs in **published-verdict mode** (the mode the toolkit uses to grade a third party and to publish a conformance result, RQ-F3-TRUST-1). In published-verdict mode, an attempt to set an `objective` rule to `off`/`info` MUST be ignored (clamped to at least `warn`) and MUST emit one `config-valid` `warn` noting the clamp. In the default local mode (a consumer running their own CI), no clamp applies - a team owns its own gate.

- **Acceptance:** in published-verdict mode, `rules: { "reference-links": "off" }` still reports the dead-link finding (clamped to `warn`) plus a clamp notice; in local mode the same config drops it.

### RQ-F3-SUPP-1 - a durable suppressions / baseline file waives known findings

The toolkit MUST support a suppressions file (default `askit-suppressions.json`, or the path named by `askit.config.json` `suppressions`) listing waived findings. Each suppression entry MUST identify a finding by a stable **fingerprint** (RQ-F3-SUPP-2) and MUST carry a human `reason` string. A finding whose fingerprint matches an active suppression MUST be removed from gating and from the `errors`/`warns` counts, and MUST instead appear in a `suppressed` list on the report with its `reason`. A suppression of an `objective`/`vendor-cited` finding in published-verdict mode is subject to the same clamp as RQ-F3-PROF-2 (it surfaces as `warn` + a notice, never silently dropped).

- **Acceptance:** a fixture failing `G8 folder-readme` plus a suppressions entry matching that finding -> the finding moves to `report.suppressed` (with its `reason`), `errors` drops by one, gate exit reflects the drop (local mode); removing the entry restores the failure; a suppression whose fingerprint matches nothing is reported as a `stale` suppression (RQ-F3-SUPP-3).

### RQ-F3-SUPP-2 - the suppression fingerprint is stable and content-addressed

A finding fingerprint MUST be a deterministic function of `(reqId || check, file, a normalized message key)`, NOT the full message text (so reflowing a message does not silently un-suppress, and a line-number shift does not require re-baselining). The normalized message key MUST exclude volatile substrings (line numbers, counts) - checks MUST expose a stable `code` or the fingerprint MUST be computed over `(reqId, check, file)` plus an optional check-supplied `subject` (e.g. the missing field name). The fingerprint algorithm MUST be pure and documented so a `askit suppress` helper and the gate compute the identical value.

- **Acceptance:** the same defect produces the same fingerprint across two runs and across a message wording change that preserves `(reqId, check, file, subject)`; a unit test pins the fingerprint of a known finding; two distinct defects in the same file (e.g. two missing docblock fields) produce two distinct fingerprints via `subject`.

### RQ-F3-SUPP-3 - stale and expired suppressions are surfaced, not silent

A suppression whose fingerprint matches no current finding MUST be reported as `stale` (an `info`-level report note, never gating) so a baseline does not accumulate dead waivers. A suppression entry MAY carry an optional `expires` ISO date; an expired suppression MUST be treated as inactive (its finding re-fires) and reported as `expired`. Suppression matching and staleness detection MUST be deterministic (no clock dependence beyond the explicit `expires` comparison against the run date passed into the resolver, so a test can inject a fixed date).

- **Acceptance:** a suppressions file with one matching, one stale, and one `expires`-in-the-past entry -> the matching one waives, the stale one is listed under `report.staleSuppressions`, the expired one's finding re-fires and is listed under `report.expiredSuppressions`; injecting a fixed `now` makes the expiry deterministic.

### RQ-F3-RESOLVE-1 - one resolver applies provenance, profile, rules, suppressions, and (F1) `since`

A single pure function `resolveFindings(rawFindings, { config, profile, suppressions, since, mode, now })` in `scripts/lib/resolve.mjs` MUST take the raw findings from the checks and the loaded config, and produce the resolved findings (each annotated with `provenance`, `effectiveSeverity`, and an optional `suppressed`/`clampNotice`). The resolver MUST be synchronous, model-free, and side-effect-free, and MUST be the single place `check.mjs` and `evaluate.mjs` both call so the two CLIs cannot diverge (the existing shared-`gateExitFromFindings` discipline, extended). The composition order is fixed (section "Composition order").

- **Acceptance:** `check.mjs` and `evaluate.mjs` produce identical resolved findings for the same `(tree, config, profile, since)`; the resolver has no `async`/Promise and no `fs` writes; a property test (same inputs -> same output) passes across repeated runs.

### RQ-F3-GATE-1 - gating reads effective severity, tier ceiling unchanged

`gateExitFromFindings` (`scripts/check.mjs`) MUST gate on `effectiveSeverity === "error"` (post-resolution) instead of the raw emitted severity, while keeping the declared-tier ceiling filter (`tierForReq` + `ceilingIndex`, `scripts/lib/tier.mjs`) exactly as today. `info` and `warn` MUST NOT gate. The tier ceiling and F3 severity resolution are orthogonal and BOTH apply: a finding gates only if it is `effectiveSeverity === "error"` AND its tier is at or below the declared ceiling.

- **Acceptance:** a `G9` error downgraded to `warn` by `rules` does not gate even at advanced tier; a `U6` error left at `error` still gates at universal; the existing `gateExitFromFindings` unit tests pass unchanged when no config is present (the ceiling logic is untouched).

### RQ-F3-CLI-1 - CLI flags mirror the config for ad-hoc use

`check.mjs` and `evaluate.mjs` MUST accept `--profile <name>`, `--rule <key>=<sev>` (repeatable), `--suppress <path>`, and `--mode <local|published-verdict>` as ad-hoc overrides layered on top of `askit.config.json` (CLI wins over file, section "Composition order"). Flag parsing MUST stay in the existing positional-root-plus-`--`flag style (`process.argv.find((a,i) => i>=2 && !a.startsWith("--"))`); a bad flag value MUST exit non-zero with a clear message before running checks.

- **Acceptance:** `node scripts/check.mjs . --profile claude-code-plugin` grades with that profile; `--rule U6=warn` downgrades U6 for that run only; `--rule U6=loud` exits non-zero with a message; flags compose with `askit.config.json` per the documented order.

### RQ-F3-STD-1 - F3 composes with F1 standard-awareness without coupling logic

F3 MUST NOT re-implement F1's `since`-based downgrade. The resolver (RQ-F3-RESOLVE-1) accepts the `since`-derived severity map F1 computes (a check introduced after the plugin's pinned `library.json.standard` is downgraded to `warn` per ADR 0027) as an INPUT, applied in the fixed composition order before profile/rules. F3 owns config/profile/suppression/provenance; F1 owns the pinned-Standard-vs-`since` comparison. The two MUST be independently testable: F3 tests pass with a no-op `since` map; F1 tests pass with a no-op (empty) config.

- **Acceptance:** with an empty `askit.config.json` and an F1 `since` map that downgrades a post-pin check, the result equals F1 alone; with a no-op `since` map and a `rules` override, the result equals F3 alone; with both, the composition matches the documented order (a combined fixture test).

### RQ-F3-DOC-1 - the Standard and docs describe config as opt-in, not part of the contract

`STANDARD.md` MUST gain a short normative note that `askit.config.json` / suppressions / profiles are a CONSUMER-SIDE grading configuration, NOT part of the plugin contract a conformant library must satisfy (a plugin is conformant or not independent of how a grader is configured). The docs (`docs/how-to/` or `docs/reference/`) MUST document the config schema, the profile catalog, the suppression workflow, and the published-verdict clamp. No `docs/internal` frontmatter applies; public docs carry the D3 frontmatter (`G7`).

- **Acceptance:** `STANDARD.md` states config is consumer-side and non-normative for conformance; a public `docs/reference/gate-config.md` (or sibling) documents the `askit.config.json` schema, profiles, and suppressions and passes `G7 docs-frontmatter`; the gate stays Advanced 0/0 over the toolkit's own tree with its own (default/absent) config.

## 4. The mechanisms (design detail)

### 4.1 `askit.config.json` schema (configVersion "1")

```json
{
  "configVersion": "1",
  "profile": "askit-library",
  "rules": {
    "U6": "warn",
    "reference-links": "warn",
    "G9": "off"
  },
  "suppressions": "askit-suppressions.json",
  "mode": "local"
}
```

- `configVersion` (required when the file exists): the schema version, validated by `config-valid` (RQ-F3-VALID-1). Independent of the Standard version (a `askit.config.json` is not graded by the Standard).
- `profile` (optional, default `"askit-library"`): a named profile (RQ-F3-PROF-1). May be a single name or an array for additive composition (`["askit-library", "house-style"]`).
- `rules` (optional): a map of check `id`/`reqId` -> `"error"|"warn"|"info"|"off"` (RQ-F3-RULES-1/2).
- `suppressions` (optional): a path to a suppressions file (default `askit-suppressions.json` if that file exists), or an inline array of suppression entries.
- `mode` (optional, default `"local"`): `"local"` or `"published-verdict"` (RQ-F3-TRUST-1). The CLI `--mode` overrides this.

### 4.2 `askit-suppressions.json` schema

```json
{
  "suppressions": [
    {
      "fingerprint": "G8:folder-readme:docs/how-to:missing-readme",
      "reason": "how-to index is intentionally a generated landing, README authored upstream",
      "expires": "2026-12-31"
    }
  ]
}
```

- `fingerprint` (required): the stable content-addressed id (RQ-F3-SUPP-2), computed as `${reqId || check}:${check}:${file}:${subject || ""}` then optionally hashed (the human-readable form is preferred for reviewability; the resolver compares the canonical string). The exact format is pinned by a unit test so `askit suppress` and the gate agree.
- `reason` (required): a human justification (a suppression with no reason is a `config-valid` `error` - an unexplained waiver is the antipattern this prevents).
- `expires` (optional): an ISO date; past it, the finding re-fires (RQ-F3-SUPP-3).

A future `askit suppress` skill/helper (out of scope here, noted in F4 housekeeping) can append an entry; F3 ships the file format and the resolver that honors it.

### 4.3 Composition order (the one fixed pipeline)

`resolveFindings` applies, in this exact order, so the result is deterministic and explainable:

1. **Start** from the raw findings each check emitted (severity as coded), each annotated with its check's `meta.provenance`.
2. **Profile subset filter.** Drop findings from checks not in the active profile's subset (these checks may still have run; their findings are removed for this verdict, like `off`). Record which checks were excluded so the report can say "not run under profile X" rather than "passed".
3. **F1 `since` downgrade.** Apply the F1-provided `since` map: a check introduced after the pinned `library.json.standard` is downgraded to `warn` (ADR 0027 burndown). Input from F1; F3 does not compute it.
4. **Profile base severity map**, then **`askit.config.json` `rules`**, then **CLI `--rule`** - each overriding the prior for the same check (most specific wins: CLI > file `rules` > profile map > emitted).
5. **Published-verdict clamp** (RQ-F3-PROF-2 / RQ-F3-TRUST-1): if `mode === "published-verdict"`, clamp any `objective`/`vendor-cited` finding back up to at least `warn`, attaching a `clampNotice`.
6. **Suppressions.** Remove findings whose fingerprint matches an active (non-expired) suppression, moving them to `report.suppressed`; the same published-verdict clamp applies to objective/vendor suppressions. Stale/expired suppressions are recorded (RQ-F3-SUPP-3).
7. **Emit** resolved findings, each with `effectiveSeverity`, `provenance`, and optional `suppressed`/`clampNotice`. Gating (`gateExitFromFindings`) and counting read `effectiveSeverity`; the tier ceiling applies orthogonally (RQ-F3-GATE-1).

This order means: a profile decides WHAT is in scope, F1 decides the Standard-version baseline, config decides the SEVERITY, the trust clamp protects objective truth, and suppressions waive what remains - and a `house` finding is freely tunable at every step while an `objective` one is protected when the verdict is published.

### 4.4 Provenance assignments (normative)

Each `meta.provenance` value, with the basis. `objective` and `vendor-cited` are the **real-issues** set; `house` is the **profile-conformance** set. This table is the source of truth the `provenance-coverage` test checks against the code.

| reqId | check id | provenance | basis |
|---|---|---|---|
| U1 | library-json | house | the askit-Standard manifest contract (a plain Claude Code plugin has no `library.json`) |
| U2 | anatomy | objective | a component's on-disk shape is malformed or not (independent of any standard) |
| U3 | frontmatter-valid | vendor-cited | Claude Code / agentskills.io require valid `SKILL.md` frontmatter to load the skill |
| U4 | name-matches-dir | vendor-cited | the platform resolves a skill by directory name; a mismatch breaks loading |
| U5 | description-score | vendor-cited | the description is what triggers the skill; emptiness/shape harms triggering (Claude Code guidance) |
| U6 | reference-links | objective | a dead `references/` link is broken regardless of any standard |
| U7 | instruction-budget | vendor-cited | oversized instructions degrade the model context (platform guidance) |
| U8 | manifest-drift | objective | a generated manifest disagreeing with source is an objective inconsistency |
| U9 | agent-targets | house | the askit cross-agent emission contract |
| U11 | mcp-valid | objective | an empty/secret-bearing MCP URL is an objective defect (and a security one) |
| U12 | mermaid-valid | objective | a structurally broken diagram renders broken regardless of any standard |
| U13 | config-valid | objective | a malformed `askit.config.json` is an objective defect (F3, this SPEC) |
| S1-S8 | (convergent set) | house | askit convergent-tier conventions (prefix, components-index/mirror, chain/command contracts, workflow-skills, per-target presence, version-match) - askit-ladder, not vendor |
| G1 | hook-documentation | house | askit Gold convention |
| G2 | self-hosting | house | askit Gold convention (grade-yourself-in-CI) |
| G3 | library-regression | house | askit Gold convention |
| G4-G6 | (deprecation / mirror / index family) | house | askit Gold lifecycle conventions |
| G7 | docs-frontmatter | house | askit docs taxonomy convention |
| G8 | folder-readme | house | askit self-documentation convention |
| G9 | source-doc | house | askit self-documentation convention |
| G10 | docs-presence | house | askit Diataxis convention |

Notes: the precise `objective | vendor-cited` split per Universal check MUST be confirmed against each check's actual basis during implementation and the chosen value cited in that check's docblock (the docblock is the citation of record for `vendor-cited`). The table above is the design intent; the implementation PR records the final assignment and the `provenance-coverage` test pins it. The `house` classification of the entire convergent + Gold sets is deliberate: those grade the askit library ladder, which is exactly why `claude-code-plugin` excludes most of them and why the **profile-conformance** count exists separately from **real-issues** (linter-vs-judge note sec 1, 8).

### 4.5 Trust and the published-verdict mode (RQ-F3-TRUST-1)

The toolkit grades both itself and third parties, and it publishes conformance verdicts (the marketplace, the docs site, E1 reports). A consumer's own `askit.config.json` is legitimately theirs in their CI (local mode). But a PUBLISHED verdict must not be gameable: a subject could otherwise ship `rules: { "reference-links": "off" }` and the toolkit would publish "no objective issues" over a plugin with dead links.

- **RQ-F3-TRUST-1:** the resolver takes a `mode`. In `local` mode (default for a consumer running their own gate) all overrides apply as written. In `published-verdict` mode (set by the toolkit when it grades a third party for a published result, and by the published-verdict path of `askit-evaluate`) `objective` and `vendor-cited` findings are clamped to at least `warn` (steps 5-6) and the report records every clamp and every honored `house` override, so the verdict is transparent about what the subject's config changed.
- **Acceptance:** a fixture subject with a dead link and `rules: { "U6": "off" }` graded in `published-verdict` mode reports the dead link (at `warn`, with a clamp notice) and a transparency note that the subject tried to disable it; the same subject in `local` mode drops it. The toolkit's own gate (`G2 self-hosting`) continues to run in whatever mode CI invokes; default CI mode is documented in F4.

## 5. Report additions (for F2 to render later)

F3 does NOT build the E1 renderer (that is F2 / v1.4.0). F3 only enriches the report OBJECT `evaluate.mjs` already produces, so F2 has the fields to render and `--json` consumers get them now:

- `summary`: add `infos`, keep `errors`/`warns` (RQ-F3-SEV-1).
- `provenanceSummary`: `{ realIssues, profileConformance }` (RQ-F3-PROV-1).
- `profile`: the active profile name(s) and the list of checks excluded by it ("not run under profile X").
- `suppressed`: array of waived findings with `reason` and `fingerprint`; `staleSuppressions`, `expiredSuppressions`.
- `config`: the resolved effective config (profile, rules applied, mode) for reproducibility, plus any `clampNotice`s.
- each finding gains `provenance` and `effectiveSeverity`.

`formatReport` (the terminal renderer) MUST print a one-line provenance split (e.g. `Real issues: N (objective+vendor) | Profile conformance: M | Suppressed: K`) and MUST NOT regress the existing terminal output for the no-config case beyond adding that line.

- **Acceptance:** `evaluate.mjs --json` over a configured fixture includes all the fields above; `formatReport` prints the split line; the no-config terminal output is otherwise unchanged from baseline (snapshot test).

## 6. Acceptance criteria (the executor verifies before PR and before merge)

- [ ] `node scripts/check.mjs .` -> Advanced, 0 errors / 0 warnings over the toolkit's own tree with NO `askit.config.json` present (the no-config baseline is byte-identical to pre-F3; a committed golden snapshot proves it).
- [ ] `npm test` green: new suites for `config-valid`, `resolve` (composition order + property test), `profiles`, suppressions (fingerprint stability, stale/expired, published-verdict clamp), `provenance-coverage` (every `CHECKS` entry has an allowed `provenance`; the SPEC table agrees with code for the listed reqIds); `registry-sync` updated to 30 (U13 added) and passes.
- [ ] `SEVERITY.INFO` exists; `info` never gates and never counts as a warn; `gateExitFromFindings` gates on `effectiveSeverity` with the tier ceiling intact (existing exit-code tests pass unchanged with no config).
- [ ] `profile: "claude-code-plugin"` over a plain (no-`library.json`) plugin yields a clean verdict with the askit-ladder checks reported "not run under profile"; `profile: "askit-library"` (or absent) reproduces the baseline.
- [ ] Per-rule `rules` (id and reqId keys) override severity and `off` drops findings; an id/reqId collision and an unknown key are `config-valid` errors.
- [ ] A suppression with a `reason` waives a matching finding (local mode), surfaces a stale entry, re-fires an expired one with an injected fixed `now`; the fingerprint is stable across a message reflow.
- [ ] Published-verdict mode clamps an `objective`/`vendor-cited` override or suppression to `warn` + a notice; local mode does not.
- [ ] CLI `--profile`, `--rule k=sev` (repeatable), `--suppress path`, `--mode` work and compose with `askit.config.json` per the documented order; bad flag values exit non-zero pre-run.
- [ ] F3 composes with F1: empty config + an F1 `since` map equals F1 alone; no-op `since` + config equals F3 alone; both together match the composition order (combined fixture).
- [ ] `STANDARD.md` notes config is consumer-side and non-normative for conformance; a public `docs/reference/gate-config.md` documents schema + profiles + suppressions and passes `G7`.
- [ ] `evaluate.mjs` report object carries `summary.infos`, `provenanceSummary`, `profile`, `suppressed`/`staleSuppressions`/`expiredSuppressions`, `config`, and per-finding `provenance`/`effectiveSeverity`; `--json` exposes them; `formatReport` prints the split line; no em-dash / en-dash in any changed file.
- [ ] An adversarial 4-lens review (soundness/false-pass, soundness/false-fail, trust/gameability, determinism+sync) ran before merge and every confirmed finding is fixed.

## 7. Out of scope

- **The E1 report renderer (F2 / v1.4.0).** F3 adds the report FIELDS; the `--format=md|html` renderer, the HTML IA, and the sample-template parity are F2 ([backlog E1](../../../backlog/enhancements.md)).
- **F1's `since`/standard-aware comparison logic.** F3 consumes F1's `since` map; F1 owns computing it from `library.json.standard` (ADR 0027). The two ship in the same v1.3.0 release but are separate PRs.
- **Autofix.** The linter-vs-judge note (sec 4) lists autofix as a future linter capability; F3 ships config + provenance + suppressions, not fixers. Deferred (F4 / later).
- **A judge / LLM calibration loop.** Interactive clarifying-questions, learned preferences, panels, eval-the-grader (linter-vs-judge note sec 2, punch-list 7) are an explicitly opt-in advisory layer for a later release; F3 stays deterministic + model-free.
- **An `askit suppress` skill/helper to author suppressions.** F3 ships the file format + the resolver that honors it; a helper to append entries is F4 housekeeping.
- **Re-homing a dash rule into `house-style`.** ADR 0028 retired `U10` and named `house-style` as the eventual home; F3 creates the empty opt-in `house-style` profile and the mechanism, but does NOT re-add any dash check. The shipped `hooks/no-dashes.mjs` hook remains the dash preference's home (ADR 0028).
- **Deeper MCP secret scanning (E2)** and the **Gemini emitter** (a named v1.x deferral) are unrelated to F3.
- **Per-component (skill-scope) config.** `askit.config.json` is plugin-root scoped; a per-skill override file is not in F3 (noted as a possible future refinement).
