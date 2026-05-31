# Phase 3C-2a Design - build-subagent + the shared component-emission harness (+ dogfood, S4 orphan, per-target S6)

> Design doc (2026-05-29). Canonical inputs: `STANDARD.md` (v0.8, on main; sec 3.3 subagent, 3.6 chain contract, 3.8 frontmatter contract, 10.1 layout), `RELEASE-PLAN.md` (Phase 3 builders, R4), `builder-skills-catalog.md` (Area 5), the on-disk state of main after `v0.2.0` (PR #53).
> Status: design + the three design calls approved by maintainer 2026-05-29. Four review refinements folded in 2026-05-29 (post-walkthrough): (1) the Codex subagent round-trip is INGESTION-verified and a build deliverable, not optional; (2) the delegating skills declare `chain:` in frontmatter (machine-checkable), not only a prose note; (3) versioning pinned (plugin stays 0.2.0, new components 0.1.0, no tag); (4) `builder-pattern.md` has one canonical home (`docs/reference/`). Gitignored working doc.
> Phase 3 decomposition: 3A (DONE) -> 3B (DONE) -> 3C-1 (Silver self-claim, DONE, v0.2.0) -> **3C-2 (the eight builders), itself sliced; 3C-2a = this doc (build-subagent + the harness)** -> 3C-2b+ (the remaining six builders).

## REVISION 2026-05-29 (Option A adopted - subagents are Claude-only)

Task A (the Codex spike) found that **Codex v0.135 plugins cannot ship subagents**: `plugin.json` has no `agents` field (component pointers are `skills`/`hooks`/`mcpServers`/`apps` only), and `[agents.*]` is read only from a user/project `config.toml` with no plugin -> config merge path. Detail in the spike note. Maintainer decision: **Option A - subagents are Claude-only for plugin distribution** (like `output-style`). This revises everything below:

- **Dropped from 3C-2a:** the Codex subagent renderers (`renderCodexAgentToml` / `renderCodexAgentsConfig`), the generated `agents/<name>.toml` + `.codex-plugin/config.toml [agents.*]`, the Codex branch of component-level S6 for subagents, the `missing-codex-subagent` anti-fixture, and the Codex subagent round-trip test. A Claude-only subagent has no Codex artifact to emit, check, or round-trip.
- **Harness consequence (the structural one):** because subagents have no per-target Codex render, `build-subagent` does NOT forge the shared per-target emission harness. So **`gen-subagent.mjs` is NOT built in 3C-2a** - it would have nothing to generate (the Claude `agents/<name>.md` is canonical and the only artifact). The shared harness (`gen-<type>.mjs` + `docs/reference/builder-pattern.md`) extraction MOVES to the first dual-target builder in 3C-2b (`build-command` / `build-hook` / `build-mcp`, which DO emit a real Codex artifact). 3C-2a's rationale narrows from "forge the harness" to "make the toolkit's Silver claim real via a real subagent chain."
- **Subagent components declare `agent-targets: [claude]`** (per-component, from 3B). Component-level S6 is then satisfied for them by the `.md` alone; the richer dual-target S6 is exercised by 3C-2b. Recommend: keep S6 plugin-manifest-level (as shipped in 3B) for now; defer the component/codex-artifact branch to 3C-2b.
- **Standard change (new 3C-2a task):** STANDARD sec 3.3 ("multi-target plugins MUST emit both formats" for subagents) and sec 10.1 (`.codex-plugin/config.toml`) must be revised - Codex subagents are config-level, not plugin-level.

**Re-scoped 3C-2a (Option A):** `build-subagent` (Claude subagent create/improve) + dogfood `skill-author` / `evaluator` as `agent-targets: [claude]` (the toolkit's first real chain) + complete S4 orphan detection (the real value) + `ctx.subagents` + `library.json components.subagents` + `agents/_chain-permitted.yaml` + STANDARD sec 3.3/10.1 revision + docs/CHANGELOG. No Codex subagent emission, no `gen-subagent.mjs`, no Codex subagent round-trip.

Everything below predates this revision; where it describes Codex subagent emission or `gen-subagent.mjs`, this banner overrides it. The fresh PLAN will be authored against this re-scope.

---

## Goal

Build the first of the eight builders, `build-subagent`, and in doing so force the **shared per-target component-emission harness** into existence (the release plan's locked "build-subagent second, extract the harness before the other six"; R4 mitigation). Dogfood it by authoring the toolkit's own `skill-author` + `evaluator` subagents (the convergent components deferred from Phase 2), which gives the toolkit its first real chain and real per-target components - making the two deferred convergent checks (S4 orphan detection, component-level per-target S6) genuinely exercisable, so they are completed here.

After 3C-2a: the toolkit ships 2 skills + 2 subagents (both emitted per target), a chain contract, and `build-subagent`; it still satisfies Silver (now with real convergent components, not vacuously); the harness is ready for the remaining six builders.

## Locked decisions (maintainer, 2026-05-29)

- **3C-2 slicing: 3C-2a = the full subagent slice** (build-subagent + harness + dogfood the toolkit's 2 subagents + S4 orphan completion + component-level per-target S6). The remaining six builders are 3C-2b+.
- **Canonical source = the Claude `agents/<name>.md`** (frontmatter + body). The Codex artifacts (`agents/<name>.toml` + the `.codex-plugin/config.toml` `[agents.<name>]` block) are GENERATED from it - the same authored-canonical -> generated-native model as `library.json` -> manifests. No third neutral subagent format.
- **The skills delegate to the new subagents** (`askit-build-skill` -> `skill-author`, `askit-evaluate` -> `evaluator`): this creates the toolkit's first real inter-component chain, which is what makes S4 orphan detection meaningful rather than vacuous. The delegation is DECLARED in each skill's frontmatter as a `chain:` list (sec 3.6) - that is the machine-checkable source S4 reads - with a prose "delegates to `<subagent>`" note in the body documenting the path. A prose note alone is not statically checkable, so the `chain:` frontmatter is the load-bearing part.
- **The harness is a new `scripts/generators/gen-subagent.mjs`** alongside `gen-manifest.mjs` (same pure-render + `--target` pattern, separate component type), NOT crammed into gen-manifest.

## Background: the subagent contract (from STANDARD.md, do not re-derive)

- **Subagent (sec 3.3, Convergent):** a bounded delegate with its own tools + prompt.
  - **Claude format:** `agents/<name>.md` (markdown + frontmatter; auto-discovered, @-mentionable).
  - **Codex format:** `config.toml [agents.<name>]` (`description`, `config_file`, optional `nickname_candidates`) + a per-agent role file `agents/<name>.toml`; distributed inside the Codex plugin so the plugin's `config.toml` augments the user config on load. (Standard sec 10.1 layout names `.codex-plugin/config.toml`.)
  - **Rule:** a subagent invoked by a skill MUST appear in a chain contract (3.6). Multi-target plugins MUST emit BOTH formats.
- **Subagent frontmatter (sec 3.8):** `name` (kebab, matches file), `description` (8.1 bar), `tools` (narrowest set; sec 9), `model` (OPTIONAL), `chain` (components it may invoke; 3.6), plus sec 3.7 metadata (`version` REQUIRED, `tier`, `status`, `agent-targets`, ...).
- **Chain contract (sec 3.6, conditional MUST):** `agents/_chain-permitted.yaml` mapping each caller -> the components it MAY invoke (optional `agents/_pairing.yaml`). Required iff chaining is used. Tooling MUST flag **orphans** (an actual invocation not covered by the contract) and **phantoms** (a contract entry pointing at a missing component).

## Architecture

### 1. The emission harness (load-bearing) - `scripts/generators/gen-subagent.mjs`

Canonical input: a parsed subagent definition from its `agents/<name>.md` (frontmatter + body), surfaced as `ctx.subagents` (see "supporting" below). Pure render functions, mirroring `gen-manifest`:

- `renderCodexAgentToml(def) -> string` - the per-agent role file `agents/<name>.toml` (role/prompt body + tool scoping in TOML form).
- `renderCodexAgentsConfig(defs) -> string` - aggregates ALL subagents' `[agents.<name>]` blocks (`description`, `config_file = "agents/<name>.toml"`, optional `nickname_candidates`) into `.codex-plugin/config.toml`.
- (Claude needs no render: `agents/<name>.md` is the canonical authored file. The harness only generates the Codex side, exactly as `gen-manifest` generates native manifests from the canonical `library.json`.)
- CLI: `node scripts/generators/gen-subagent.mjs <root> --write [--target=codex|all]`. Reads all `agents/*.md`, writes `agents/<name>.toml` per subagent + the aggregated `.codex-plugin/config.toml`.

**Why this IS the harness:** it is the per-target *component* emitter (canonical authored file -> generated per-target artifacts). `build-command`/`build-hook`/`build-workflow`/`build-mcp`/`build-agents-md` each follow the same shape (a `gen-<type>.mjs` with per-target render functions + a `--target` flag). 3C-2b+ plug into this pattern; 3C-2a establishes it. (`build-output-style` is Claude-only - no Codex render.) A short `docs/reference/builder-pattern.md` - the SINGLE canonical home (Diataxis reference, alongside `silver-checks.md`); each builder skill links to it rather than copying it - documents the canonical-authored -> generated-native + create/improve shape so the family stays consistent (the R4 mitigation made concrete).

### 2. `build-subagent` skill - `skills/askit-build-subagent/`

`SKILL.md` (+ `references/`), mirroring `askit-build-skill`'s create/improve shape:
- **create:** interview (name, purpose, tools-needed, what it may invoke) -> scaffold `agents/<name>.md` with the sec-3.8 subagent frontmatter (`name`, `description`, `tools` narrowest, optional `model`, `chain`) + a role body -> run `gen-subagent --write` to emit the Codex artifacts -> register the subagent in `library.json components.subagents` and, if it declares a `chain`, add the entry to `agents/_chain-permitted.yaml` -> `node scripts/evaluate.mjs <plugin> --json` and iterate to 0 errors.
- **improve:** consume `evaluate --json` findings and fix (tool over-scope, missing chain entry, description score, missing Codex artifact).
- Links to `docs/reference/builder-pattern.md` (the shared builder-family contract). Carries the `askit-` prefix (S2).

### 3. Dogfood - the toolkit's own subagents

Author `agents/skill-author.md` and `agents/evaluator.md` (the convergent components Phase 2 deferred):
- `skill-author`: the delegated authoring role behind `askit-build-skill` (tools: the file/scaffold set it needs; `chain`: may invoke `evaluator`).
- `evaluator`: the delegated assessment role behind `askit-evaluate` (tools: read + run `scripts/evaluate.mjs`).
- Generate their Codex artifacts (`agents/skill-author.toml`, `agents/evaluator.toml`, `.codex-plugin/config.toml`) via `gen-subagent`.
- `askit-build-skill` and `askit-evaluate` each declare the delegation in frontmatter (`chain: [skill-author]` and `chain: [evaluator]` respectively) AND add a prose "delegates to `<subagent>`" note in the body. The `chain:` frontmatter is what S4 reads to detect orphans against `agents/_chain-permitted.yaml`; the prose documents the delegated path. The subagents themselves are authored via `build-subagent` (the dogfood: the builder builds the toolkit's own subagents).

### 4. S4 orphan detection - complete `scripts/checks/chain-contract.mjs`

- `known` set = skills + subagents (currently skills only). Source subagent names from `ctx.subagents`.
- **Orphan rule:** for each component that declares an invocation - a subagent/skill with a `chain:` list in its frontmatter, or a `_workflows/*` step - every invoked target MUST appear under that caller in `agents/_chain-permitted.yaml`. An invocation not covered = an orphan ERROR (sec 3.6). (Phantom detection already exists; keep it.)
- The toolkit ships `agents/_chain-permitted.yaml` covering its real chain (`askit-build-skill -> skill-author`, `skill-author -> evaluator`, `askit-evaluate -> evaluator`), so S4 passes for the right reason.

### 5. Component-level per-target S6 - extend `scripts/checks/per-target-presence.mjs`

Beyond the plugin manifests (3B), for each declared subagent in `library.json components.subagents`, per its `agent-targets` (defaulting to the plugin's): claude -> `agents/<name>.md` present; codex -> `agents/<name>.toml` present AND a `[agents.<name>]` block present in `.codex-plugin/config.toml`. A missing per-target artifact = S6 ERROR (Standard sec 3.3 "MUST emit both formats", sec 10.1). Keep the existing plugin-manifest presence logic.

### 6. Supporting

- `scripts/lib/load-plugin.mjs`: add `ctx.subagents` (parse `agents/*.md` frontmatter+body, skipping `_chain-permitted.yaml`/`_pairing.yaml`/`*.toml`). Parallel to `ctx.skills`.
- `library.json`: add `components.subagents` (skill-author, evaluator with `{name, path, version, tier, status}`); the toolkit's `agent-targets` already `[claude, codex]`.
- Generated: `agents/*.toml` + `.codex-plugin/config.toml`.
- **Versioning (pinned, follows D-3C1-outward milestone-versioning):** the PLUGIN version stays `0.2.0` (3C-2a is incremental within the Silver milestone, not a new milestone) and NO tag is cut (`v0.2.0` already marks Silver). The three NEW components - `skill-author`, `evaluator`, `build-subagent` (the `askit-build-subagent` skill) - start at `0.1.0`; existing components keep their versions. Manifests are regenerated regardless because `library.json` changed (the `components` index gains subagents). Alternative if the maintainer prefers strict semver-per-feature: bump the plugin to `0.3.0` (still no tag) - a one-line flip, called out here so it is a deliberate choice, not a default.

## File structure (3C-2a deliverables)

```
scripts/generators/gen-subagent.mjs            NEW - per-target subagent emitter (the harness core)
scripts/lib/load-plugin.mjs                    MODIFY - expose ctx.subagents
scripts/checks/chain-contract.mjs              MODIFY - S4 orphan detection (+ subagents in `known`)
scripts/checks/per-target-presence.mjs         MODIFY - S6 component-level subagent presence
skills/askit-build-subagent/SKILL.md           NEW - the builder skill (create/improve)
skills/askit-build-subagent/references/        NEW - authoring-guide.md (skill-specific)
docs/reference/builder-pattern.md              NEW - shared builder-family contract (SINGLE home; both builder skills link to it)
agents/skill-author.md                         NEW (canonical) - dogfood subagent
agents/evaluator.md                            NEW (canonical) - dogfood subagent
agents/skill-author.toml, agents/evaluator.toml  GENERATED (Codex roles)
agents/_chain-permitted.yaml                   NEW - the toolkit's chain contract
.codex-plugin/config.toml                      GENERATED - [agents.*] blocks
library.json                                   MODIFY - components.subagents (+ regen manifests if version bumps)
skills/askit-build-skill/SKILL.md              UPDATE - delegates to skill-author
skills/askit-evaluate/SKILL.md                 UPDATE - delegates to evaluator
tests/unit/gen-subagent.test.mjs               NEW
tests/unit/chain-contract.test.mjs             EXTEND - orphan cases (+ subagents)
tests/unit/per-target-presence.test.mjs        EXTEND - component-level subagent cases
tests/unit/load-plugin.test.mjs                EXTEND - ctx.subagents
tests/unit/seed-*.test.mjs                      UPDATE if the repo's component set / tier-report shape changes
tests/fixtures/golden/subagent-fixture/        NEW - a plugin with a subagent emitted per target + chain contract
tests/fixtures/anti/chain-orphan/              NEW - an invocation not covered by the contract (S4 orphan)
tests/fixtures/anti/missing-codex-subagent/    NEW - declares a subagent, no Codex artifacts (S6)
tests/integration/codex-subagent-roundtrip.test.mjs  NEW - INGESTION-verified, graceful skip (mirrors 3B manifest round-trip)
docs/reference/askit-build-subagent.md         NEW
docs/how-to/build-a-subagent.md                NEW
docs/reference/silver-checks.md                UPDATE - S4 orphan + S6 component-level rows refined
AGENTS.md / INDEX.md                            UPDATE - the toolkit now ships subagents + a chain contract
CHANGELOG.md                                    entry
```

## Documentation (first-class, per standing requirement)

- Agent-facing: `gen-subagent.mjs` + the extended checks carry doc comments citing sec 3.3/3.6/10.1; `agents/skill-author.md` + `agents/evaluator.md` ARE agent-facing; AGENTS.md lists the new subagents + the chain contract + the delegation paths.
- Human-facing (Diataxis): NEW `docs/how-to/build-a-subagent.md`; NEW `docs/reference/askit-build-subagent.md`; refine `docs/reference/silver-checks.md` (S4 now does orphan detection; S6 now does component-level per-target presence); a NEW `docs/reference/builder-pattern.md` (the single shared home) documenting the shared builder family shape (the harness contract for 3C-2b+).

## Self-validation impact

After 3C-2a, on the repo:
- `npm test` green; `node scripts/check.mjs` exit 0 at the convergent ceiling; `node scripts/evaluate.mjs .` exit 0.
- The toolkit now has REAL convergent components: 2 subagents emitted per target, a valid chain contract (no orphans/phantoms), component-level S6 satisfied. Its Silver claim is no longer vacuous.
- `tier-report --json` still `{tier: convergent, satisfies: [universal, convergent], blocked: {}}`.
- A Codex subagent round-trip integration test (REQUIRED, not optional - a build deliverable) verifies the emitted artifacts are actually INGESTED by the live `codex` CLI (the subagent loads via the plugin's `config.toml`), not merely present on disk. It graceful-skips when `codex` is absent, mirroring the 3B manifest round-trip. This is the direct application of the listing != ingestion lesson (`codex-emission-gotchas`) to the new, unverified subagent config-merge surface.

## Exit gate (3C-2a)

- `gen-subagent.mjs` emits `agents/<name>.toml` + `.codex-plugin/config.toml` from the canonical `agents/<name>.md`; pure render functions unit-tested.
- `build-subagent` skill present, passes its own evaluate (0 errors), documents create/improve.
- The toolkit ships `agents/skill-author.md` + `agents/evaluator.md` (+ generated Codex artifacts) + `agents/_chain-permitted.yaml`; `askit-build-skill`/`askit-evaluate` reference the delegated subagents.
- S4 orphan detection complete + unit-tested (golden + anti orphan); S6 component-level subagent presence + unit-tested (golden + anti missing-codex-subagent).
- `library.json components.subagents` declared; `.codex-plugin/config.toml` generated; drift-clean.
- check + evaluate exit 0; tier-report convergent/empty-blocked; full suite green.
- A Codex subagent round-trip integration test verifies INGESTION (the subagent loads via the plugin's `config.toml`), not just file presence; graceful-skips when `codex` is absent (mirrors the 3B manifest round-trip; the listing != ingestion lesson).
- Docs (how-to + reference + builder-pattern + silver-checks refinements + AGENTS/INDEX) shipped; CHANGELOG.
- No em-dash / en-dash anywhere.

## Explicitly deferred (to 3C-2b+)

- The remaining six builders: `build-command`, `build-hook`, `build-workflow`, `build-chain-contract`, `build-mcp`, `build-agents-md`, `build-output-style` (Claude-only). Each reuses the harness established here.
- Workflows + `build-workflow` (so workflow-step orphan detection in S4, and S5 workflow-skills, get a real exercise) - 3C-2b+.
- The toolkit declaring `tier: advanced` / Gold work - Phase 5.
- Public go-public + marketplace registration - separate / Phase 5.

## Risks

- **Harness over-fit to subagents.** Designing the emitter narrowly to subagents could force a rewrite when `build-command`/`build-hook` arrive. Mitigation: keep `gen-subagent.mjs` shaped exactly like `gen-manifest.mjs` (pure `render*(def) -> string` + a `--target` switch + a `--write` loop) and capture the contract in `docs/reference/builder-pattern.md`, so the next builders copy a proven shape rather than refactor a premature abstraction. Do NOT build a generic "gen-any-component" framework speculatively (YAGNI) - extract commonality only once 2-3 builders exist.
- **Codex subagent TOML/config-merge unknown at the byte level.** The Standard pins the shape (`[agents.<name>]` + `agents/<name>.toml`) but the exact TOML keys/merge semantics should be re-verified against the live `codex` CLI before finalizing `renderCodexAgentToml` (a small spike, like the 3B manifest pin). Mitigation: the build's first task pins the real Codex subagent config from a bundled Codex plugin or the docs, the way 3B Task A pinned the manifest, AND verifies the subagent is actually INGESTED by the live CLI (not merely listed), per the listing != ingestion lesson - the same proof the required round-trip test then locks in.
- **S4 orphan false positives.** Over-eager orphan detection could flag legitimate non-invocations (e.g., a `chain:` listing a permitted target that IS in the contract). Mitigation: orphan = strictly "a declared invocation NOT in the contract"; unit-test both the covered (no finding) and uncovered (finding) cases, and the conditional (no chain anywhere -> no contract required -> silent).
- **Delegation changes skill behavior.** Making `askit-build-skill`/`askit-evaluate` delegate to subagents could regress their inline behavior. Mitigation: the subagents encapsulate the SAME logic; the skills reference them as the path, and the skills must still pass `evaluate` at 0 errors (their descriptions/budgets unchanged).
