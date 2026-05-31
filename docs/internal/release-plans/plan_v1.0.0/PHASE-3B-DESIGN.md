# Phase 3B Design - Multi-Agent Emission Spine
> Design doc (2026-05-28). Canonical inputs: `STANDARD.md` (v0.8, on main), the Codex spike note (`spikes/2026-05-27_codex-plugin-format.md`, re-verified at CLI v0.133.0 on 2026-05-28), `PHASE-3A-DESIGN.md` (the just-shipped foundation), and the real bundled-plugin manifests captured below. Status: 6-item scope approved by maintainer 2026-05-27; the three implementation-detail positions confirmed 2026-05-28 (single-module generator, graceful-skip round-trip test, add agent-targets at 3B). Gitignored working doc. Phase 3 decomposition: 3A (Codex contract + Silver core) -> **3B (this doc)** -> 3C (the eight builders). Each gets its own design + plan + build cycle.
## Goal
3A made the Silver climb _visible_ (`tier-report.blocked.convergent == [S1, S3]`) without emitting anything. 3B makes the toolkit actually _emit per agent target_ and proves the Codex artifact round-trips against the real CLI.

One coherent deliverable in six parts:

1. Extend the generator to emit BOTH native manifests (`.claude-plugin/plugin.json` and `.codex-plugin/plugin.json`) from the canonical `library.json`.
  
2. Generate and commit those manifests for the toolkit itself.
  
3. Declare `agent-targets: ["claude", "codex"]` in `library.json` (closes S1).
  
4. Add the S6 conformance check (per-target manifest presence).
  
5. Prove the Codex manifest round-trips against the real `codex` CLI (graceful-skip integration test).
  
6. Teach `askit-build-skill` to emit per target (`--agent-target`) and ship first-class docs.
  

After 3B: S1 leaves the burndown; only S3 remains (closes at 3C). Tier stays `universal`. CI green.
## Locked decisions
From the maintainer (2026-05-27 scope approval + 2026-05-28 detail confirmations):

- **Scope is the 6-item emission spine.** NOT marketplace catalog generation (Phase 5), NOT S4 orphan detection (3C), NOT the tier bump to `convergent` (3C exit).
  
- **(a) Generator architecture = single module.** Extend `gen-manifest.mjs` with `renderClaudeNativeManifest` + `renderCodexNativeManifest` + a `--target` flag. No separate `gen-codex-manifest.mjs`.
  
- **(b) Round-trip test = graceful-skip integration test.** `tests/integration/codex-roundtrip.test.mjs` is part of `npm test`, runs for real locally when `codex` is present, and `test.skip()`s in CI. A `--require-codex` (env) flag turns a skip into a failure for runners that DO have Codex.
  
- **(c)** `library.json` **gains** `agent-targets` **at 3B**, since 3B honestly emits per target. This closes S1 now; the burndown shrinks from `[S1, S3]` to `[S3]`.
  
- **Codex schema source of truth:** CLI v0.133.0, re-verified 2026-05-28 (no drift from the spike; the plugin manifest convention and the bundled-plugin path are unchanged). Task A pins the exact `.codex-plugin/plugin.json` field set from a real bundled plugin plus the live round-trip.
  
## Background: the two manifest schemas (grounded, not assumed)
Captured from disk on 2026-05-28, not speculation:

**Claude native manifest** (`.claude-plugin/plugin.json`, currently hand-authored):

```json
{ "name", "version", "description", "author": { "name" }, "homepage", "repository", "keywords": [...] }
```

**Codex native manifest** (`.codex-plugin/plugin.json`, from the bundled `browser` plugin):

```json
{ "name", "version", "description", "author": { "name" }, "homepage", "repository",
  "license", "keywords": [...],
  "skills": "./skills/",
  "interface": { "displayName", "shortDescription", "longDescription", "developerName",
                 "category", "capabilities": [...], "websiteURL", "privacyPolicyURL",
                 "termsOfServiceURL", "defaultPrompt", "brandColor", "composerIcon",
                 "logo", "screenshots" } }
```

The two share a spine (`name` / `version` / `description` / `author` / `homepage` / `repository` / `keywords`). Codex adds exactly two things: (1) a `"skills": "./skills/"` pointer and (2) an `"interface"` block of marketplace-UI metadata. The `browser` example's interface is rich because it is a shipped marketplace product (icons, screenshots, brand color); the _minimal valid_ interface for a freshly generated plugin is pinned by Task A's round-trip (expected minimum: `displayName`, and likely `shortDescription` + `category`).

**Single-source consequence (a real refinement).** `library.json` today lacks `author` and `keywords`; those values are hand-typed in `.claude-plugin/plugin.json`. To generate BOTH manifests from `library.json` without inventing or silently dropping values, those fields move INTO `library.json` as canonical. See "6. library.json update" below. This keeps Standard sec 10.3 (single-source-of-truth) honest once `.claude-plugin/plugin.json` becomes generated.

**Plugin-root note.** For the toolkit's self-emission, the repo root IS the plugin root for both agents: `.claude-plugin/`, `.codex-plugin/`, and the shared `skills/` all sit at repo root, exactly as the Claude plugin already works. `"skills": "./skills/"` therefore resolves to the existing `skills/` directory; no skill mirroring is needed for the toolkit itself. (Multi-plugin libraries that nest plugin directories handle mirroring at 3C, when nested components actually exist.)
## Architecture
### 1. Generator (single module)
Extend `scripts/generators/gen-manifest.mjs`. Keep `renderManifest` (the resolved `manifest.generated.json` index). Add two pure render functions and a `--target` flag.

- `renderClaudeNativeManifest(ctx) -> string` - emits `.claude-plugin/plugin.json` from `ctx.library.data`.
  
- `renderCodexNativeManifest(ctx) -> string` - emits `.codex-plugin/plugin.json`: the shared spine + `"skills": "./skills/"` + a minimal `interface` block.
  
- CLI: `--target=resolved|claude|codex|all` (default `all`). `--write` writes the file(s); without it, prints to stdout. With `all`, writes `manifest.generated.json` + `.claude-plugin/plugin.json` + `.codex-plugin/plugin.json`.
  

Both render functions are pure (`ctx -> string`), independently unit-tested, and mirror the Phase 1 `renderManifest` pattern. Interface fields the toolkit does not carry are derived deterministically: `displayName` from a title-cased `name` (or an optional `library.json.displayName`), `category` defaulting to `"Engineering"` (or an optional `library.json.category`). Derivation rules live in the function doc comment and the reference doc; Task A confirms the minimal required set against the live CLI before the render function is finalized.
### 2. The Codex manifest schema (Task A: pin from disk + round-trip)
Task A reads a real `.codex-plugin/plugin.json` (the bundled `browser` plugin, already captured above) AND runs a minimal emitted manifest through the local round-trip to determine which `interface` fields Codex actually requires versus which are cosmetic. The pinned minimal field set is appended to the spike note so the emitter targets evidence rather than the rich `browser` example. Small but load-bearing: it decides exactly what `renderCodexNativeManifest` must emit.
### 3. New S6 check
`scripts/checks/per-target-presence.mjs`, `meta = { id: "per-target-presence", tier: "convergent", reqId: "S6" }`:

- For each agent in `library.json["agent-targets"]`, the native manifest must exist on disk: `claude` -> `.claude-plugin/plugin.json`; `codex` -> `.codex-plugin/plugin.json`.
  
- Conditional: only fires when `agent-targets` is declared. If `agent-targets` is absent, S1 fires instead (no double-finding).
  
- Presence only in 3B (locked D-P3B-4). Component-level per-target presence (subagents / commands / output-styles) lands in 3C, when those components exist.
  

The check uses the existing `loadPlugin` `PluginContext`; if needed it gains a `ctx.codexManifest` accessor parallel to the existing `ctx.claudeManifest`. Finding messages cite their Standard section (sec 5.1 / sec 10.1), per the project convention.

**Drift guard (companion to S6).** Name/version agreement between `library.json` and the two committed manifests is the drift concern. Extend the existing U8 `manifest-drift` check (currently Claude-only, WARN) to also compare `.codex-plugin/plugin.json` name/version against `library.json`. This keeps the established drift pattern (a check, not CI-only logic), and stays WARN so it never gates Bronze. Division of labor: **S6 = presence**, **U8 = name/version agreement**.
### 4. --agent-target on askit-build-skill
Update `skills/askit-build-skill/SKILL.md`: the agent may pass `--agent-target claude|codex|both` (default `both` after 3B). Mechanism: the skill scaffolds, fills frontmatter, then runs `node scripts/generators/gen-manifest.mjs <plugin> --write --target=all`, which regenerates whichever native manifests the plugin's `library.json.agent-targets` declares. `skills/askit-build-skill/references/authoring-guide.md` gets a short "multi-agent emission" section. The skill must continue to pass the gate (editing it must not introduce any convergent regression into the toolkit's own self-validation).
### 5. Local Codex round-trip test (graceful skip)
`tests/integration/codex-roundtrip.test.mjs` (`node:test` + `node:child_process`):

- Probe: run `codex --version`. If `codex` is not on PATH, `test.skip()` with a clear message. If `CODEX_REQUIRED` is set (the `--require-codex` intent), a missing `codex` is a failure instead (for CI runners that DO have Codex).
  
- When present: wrap the emitted `.codex-plugin/plugin.json` in a throwaway local marketplace, `codex plugin marketplace add <tmp>` (v0.135 takes a positional source path, not `--local`), `codex plugin list` (lists as installable), then `codex plugin add <plugin>@<mp>` and confirm INGESTION by checking the install cache: `plugin add` prints "Installed plugin root: <path>", and a correctly-ingested plugin has `<install-root>/skills/<name>/SKILL.md` resolved there (there is no `codex plugin show`). Clean up the plugin + marketplace in a `finally` block. The ingestion assertion is load-bearing: listing alone is a false pass (see the pm-skills bug in memory `codex-emission-gotchas`). Recipe verified at CLI v0.135.0; see the spike note.
  
- Part of `npm test`; skips gracefully in CI (Codex absent). Local devs run the real round-trip; one real local pass is recorded in the dogfood log for the PR.
  
### 6. library.json update
Add to `library.json`:

- `"agent-targets": ["claude", "codex"]` - the S1 closer; honest because 3B emits per target.
  
- `"author": { "name": "product-on-purpose" }` and `"keywords": [...]` - promoted from the hand-authored `.claude-plugin/plugin.json` so BOTH manifests generate from one canonical source (Standard sec 10.3).
  
- Optionally `"displayName"` / `"category"` only if Task A shows the Codex `interface` needs explicit values rather than derived defaults.
  

After this, `.claude-plugin/plugin.json` is regenerated from `library.json` (no longer hand-maintained); `.codex-plugin/plugin.json` is generated new. `seed-blocked-convergent.test.mjs` updates from `[S1, S3]` to `[S3]`.
## File structure (3B deliverables)
```
scripts/generators/gen-manifest.mjs           EXTEND - renderClaudeNativeManifest + renderCodexNativeManifest + --target CLI
scripts/checks/per-target-presence.mjs        NEW    - S6
scripts/checks/manifest-drift.mjs             EXTEND - also compare .codex-plugin/plugin.json name/version (U8)
scripts/lib/registry.mjs                      MODIFY - register S6
scripts/lib/load-plugin.mjs                   MODIFY (if needed) - expose ctx.codexManifest parallel to ctx.claudeManifest
.claude-plugin/plugin.json                    REGENERATED from library.json
.codex-plugin/plugin.json                     NEW (generated)
library.json                                  MODIFY - agent-targets + author + keywords (+ optional displayName/category)
skills/askit-build-skill/SKILL.md             UPDATE - --agent-target instructions
skills/askit-build-skill/references/authoring-guide.md  UPDATE - multi-agent emission section
tests/integration/codex-roundtrip.test.mjs    NEW    - local-only (graceful skip)
tests/unit/gen-manifest.test.mjs              EXTEND/NEW - the two new render fns
tests/unit/per-target-presence.test.mjs       NEW    - S6 unit tests (golden + anti)
tests/unit/manifest-drift.test.mjs            EXTEND/NEW - Codex name/version coverage
tests/unit/seed-blocked-convergent.test.mjs   UPDATE - now expects [S3] only
tests/fixtures/golden/silver-fixture/         UPDATE - add .codex-plugin/plugin.json so S6 passes
tests/fixtures/anti/missing-codex-manifest/   NEW    - declares codex target, no .codex-plugin manifest (S6)
docs/how-to/emit-for-multiple-agents.md       NEW
docs/reference/silver-checks.md               UPDATE - S6 row
docs/reference/askit-build-skill.md           UPDATE - --agent-target
docs/explanation/conformance-and-tiers.md     UPDATE - S6 in Silver-checks table; burndown note
CHANGELOG.md                                   entry under [Unreleased]
manifest.generated.json                       REGENERATED (if any shared field shifts)
AGENTS.md                                      UPDATE - per-target emission + S6 line
```
## Documentation (dual-doc, first-class - per standing maintainer requirement)
Explicit plan tasks, not afterthoughts. Standard sec 10.3 single-source-of-truth: the manifest schemas live in exactly one canonical place; views link or quote, never duplicate.

**Agent-facing (canonical):**

- `renderCodexNativeManifest` and `per-target-presence.mjs` carry doc comments naming the Standard section enforced, the derivation rules for interface fields, and an example finding message that cites its section.
  
- `AGENTS.md`: a line that the toolkit now emits per agent target and that S6 validates per-target manifest presence.
  

**Human-facing:**

- `docs/how-to/emit-for-multiple-agents.md` (NEW): a walkthrough of `--agent-target`, the `--target` flag, the two generated manifests, and a pointer to the local round-trip.
  
- `docs/reference/silver-checks.md`: add the S6 row (id, what it checks, Standard section, conditional?, example fix).
  
- `docs/reference/askit-build-skill.md`: document `--agent-target`.
  
- `docs/explanation/conformance-and-tiers.md`: add S6 to the Silver-checks table; one line that the burndown shrank from `[S1, S3]` to `[S3]`.
  
## Self-validation impact
After 3B, on the repo:

- `npm test` green (new unit tests + the round-trip test, which skips in CI / runs locally).
  
- `node scripts/check.mjs` exits 0; `node scripts/evaluate.mjs .` exits 0 (the 3A I1 fix holds).
  
- `library.json` declares `agent-targets: ["claude", "codex"]`; both `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` exist on disk (generated).
  
- S1 passes (agent-targets present). S6 passes (both manifests present). S3 remains in `blocked.convergent` (components index unaddressed - 3C).
  
- `node scripts/tier-report.mjs --json`: `tier: universal`, `satisfies: [universal]`, `blocked.convergent` shrinks to `["S3: ..."]` only.
  
- `seed-blocked-convergent.test.mjs` locks the new `[S3]`-only contract.
  
- Local Codex round-trip succeeded at least once on the maintainer's machine (recorded in the dogfood log), proving the emitted `.codex-plugin/plugin.json` is real-CLI-valid.
  
## Exit gate (3B)
- `gen-manifest.mjs` emits all three artifacts; the `--target` flag works; both render functions are unit-tested.
  
- `.claude-plugin/plugin.json` regenerated from `library.json`; `.codex-plugin/plugin.json` generated and committed; both agree with `library.json` (U8 clean).
  
- `library.json` declares `agent-targets` (+ `author` / `keywords` promoted).
  
- S6 registered + unit-tested (golden + anti fixture).
  
- `askit-build-skill` documents `--agent-target`; the gate still passes.
  
- Round-trip integration test present, runs for real locally, skips in CI; one real local pass recorded.
  
- `tier-report.blocked.convergent == ["S3: ..."]` only; `seed-blocked-convergent.test.mjs` updated.
  
- New how-to + reference/explanation doc updates shipped; CHANGELOG entry under `[Unreleased]`.
  
- CI green: `npm ci && npm test && node scripts/check.mjs` all pass / exit 0.
  
## Explicitly deferred (so 3B stays bite-sized)
- Marketplace catalog generation (`.agents/plugins/marketplace.json` + the Claude marketplace) -> Phase 5 (at first tag).
  
- S4 full orphan detection -> 3C (needs real workflows to test against).
  
- Component-level per-target presence (subagents / commands / output-styles) -> 3C.
  
- Declaring `tier: convergent` + the Silver claim -> 3C exit.
  
- Subagent / MCP config inside a distributed Codex plugin (`config.toml` augmentation semantics) -> confirmed as the emitter matures; already flagged in STANDARD v0.8 Appendix A as a build-time confirm.
  
## Risks
- **Codex** `interface` **required-field set is unknown until Task A.** The `browser` example shows a rich interface but does not reveal the minimal valid set. Mitigation: Task A runs the real round-trip with a minimal manifest and pins the required fields before `renderCodexNativeManifest` is finalized. If Codex rejects a minimal interface, the design adds the needed fields (and, if they are content rather than cosmetic, the corresponding `library.json` fields). This is the one place 3B could grow.
  
- **Codex CLI churn.** v0.133 re-verified 2026-05-28; it could move during the build. Mitigation: the round-trip test exercises the live CLI locally; if the format shifts, the test fails loudly on the maintainer's machine before merge.

- **Listing is not ingestion (the pm-skills failure mode).** A Codex plugin can list as installable while its components are invisible ("No plugin skills") because Codex reads components only from `.codex-plugin/plugin.json` and its load-bearing `"skills": "./skills/"` field, never the Claude manifest. A round-trip that asserts only "appears in the list" gives a false pass. Mitigation: the round-trip test installs the plugin and asserts the skill is discovered; the emitter always includes the `skills` pointer and omits any `commands` field (Claude-only legacy) or URL field that could 404. Captured in memory `codex-emission-gotchas`.
  
- **CI cannot run the round-trip** (no Codex on GitHub runners). Mitigation: graceful skip is the design; the structural unit tests (render-function output shape) run everywhere and carry the bulk of the proof; the round-trip is local belt-and-suspenders.
  
- **Single-source migration of** `author` **/** `keywords` could momentarily desync the regenerated Claude manifest from the prior hand-authored one. Mitigation: Task C regenerates and diffs against the committed file; any field the generator drops is either added to `library.json` or intentionally removed, and the diff is reviewed in the PR.
  
- `library.json` **scope creep** (cosmetic interface fields). Mitigation: prefer deriving `displayName` / `category` over storing them; store a field only if Task A proves Codex requires it.
