# Phase 3A Design - Codex Contract + Silver Conformance Core

> Design doc (2026-05-27). Canonical inputs: `STANDARD.md` (v0.7), `agent-skills-toolkit-DESIGN.md` (v0.8), `RELEASE-PLAN.md` (Phase 3), the Codex spike note (`spikes/2026-05-27_codex-plugin-format.md`).
> Status: approved by maintainer 2026-05-27. Gitignored working doc.
> Phase 3 decomposition: **3A (this doc)** -> 3B (multi-agent emission spine) -> 3C (the eight builders). Each gets its own design + plan + build cycle.

## Goal

Lay the Silver foundation. Two coherent deliverables:

1. **Revise the Standard to v0.8** so the Codex emission contract reflects Codex v0.133's native plugin + marketplace system (R2/F-04 resolved by the 2026-05-27 spike), and update sec 12 to describe Codex's concrete native marketplace alongside Claude's.
2. **Add five Convergent (Silver) conformance checks** (S1-S5) to the validation spine, registered and tested. The toolkit stays declared `universal`; the new findings populate `tier-report`'s `blocked.convergent` list - turning the Phase 3 burndown into the tool's own output.

After 3A, nothing emits Codex yet (that's 3B); the contract is correct, the validators exist, and the climb-to-Silver to-do list is visible. The toolkit still passes its declared tier (Bronze) cleanly.

## Locked decisions (maintainer, 2026-05-27)

- **Phase 3 scope:** decomposed into 3A / 3B / 3C, sequentially. 3A is this design.
- **Standard sections to revise in 3A:** Codex contract (sec 3.2/3.3/3.9 + sec 10.1) AND sec 12 marketplace. Out of scope: sec 2.5 Silver row tweaks and sec 3 component-type sweeps (handled in 3B/3C as emission needs surface them).
- **Self-validation stance ("(b)"):** toolkit stays declared `universal`. Convergent findings populate `blocked.convergent` informationally; they do not fail the gate at the declared tier. This requires the small gate-runner tweak below (see "Self-validation impact").
- **S6 (per-target format presence) deferred to 3B** - it needs emission to validate.
- **Optional polish:** add `prefix: "askit-"` to `library.json` now. The prefix is optional at Universal and required at Convergent+; adopting it early preempts the S2 finding and matches the locked D17 decision.

## Architecture

### Standard revision (v0.8)

Targeted edits only - this is not a full re-draft.

- **Sec 3.2 (commands):** Codex command target = a skill packaged within a Codex plugin (`.codex-plugin/plugin.json` + `skills/<name>/SKILL.md`). The deprecated standalone-prompts caveat stays.
- **Sec 3.3 (subagents):** Codex subagents declared in `config.toml` `[agents.<name>]` + per-role `agents/*.toml`, distributed inside the emitted Codex plugin (so the plugin's `config.toml` augments the Codex user config when the plugin is loaded - to be verified against Codex docs as the emitter is built in 3B).
- **Sec 3.9 (MCP):** MCP server registration distributed in the Codex plugin (alongside the subagent config) rather than relying on user `config.toml`.
- **Sec 10.1 (layout):** add the Codex emission targets to the layout table - `.codex-plugin/plugin.json` (generated), the Codex plugin's `skills/` (skill files mirrored from the canonical `skills/`), and the marketplace `.agents/plugins/marketplace.json` separate from any single plugin.
- **Sec 12 (distribution + marketplaces):** describe both Claude and Codex native marketplaces. The separation rule still holds and now maps onto a concrete Codex artifact (`.agents/plugins/marketplace.json` in a separate marketplace repo). Add the observed Codex marketplace schema (`name`, `interface.displayName`, `plugins:[{name, source:{source,path}, policy, category}]`) as a normative example.
- **Appendix A:** mark F-04 RESOLVED with the spike findings (Codex v0.133 native plugin/marketplace).
- **Version banner:** bump to v0.8 with a one-line note explaining the Codex-contract revision.
- **Update `library.json` `"standard": "0.8"`** so the toolkit's own declaration matches.

The companion DESIGN doc (`docs/internal/DESIGN.md`) D19 entry gets a small "superseded by spike 2026-05-27" annotation - the decision-record proper graduates to numbered ADRs at Phase 4 (per Q-C), so a heavy rewrite is out of scope.

### Five new Convergent checks

Each check is a `.mjs` module exporting `meta = { id, tier: "convergent", reqId: "S<n>" }` and `check(ctx) -> Finding[]`. The S-prefix routes findings into `errorsByTier.convergent` automatically (the existing `tierForReq` already handles it).

| reqId | Module | What it checks | Standard | Conditional? |
|---|---|---|---|---|
| **S1** | `agent-targets.mjs` | `library.json.agent-targets` is a non-empty array of `"claude"` and/or `"codex"` | sec 5.1, sec 2.2 | No - always fires |
| **S2** | `prefix.mjs` | `library.json.prefix` is a non-empty kebab-case string ending in `-` | sec 8.2 | No - always fires |
| **S3** | `components-index.mjs` | `library.json.components` is present and each entry's `{name,path,version,tier,status}` agrees with the component on disk | sec 5.1, sec 10.3 | No - always fires |
| **S4** | `chain-contract.mjs` | `agents/_chain-permitted.yaml` integrity: every in-repo invocation listed (no orphans); every contract entry points at a real component (no phantoms) | sec 3.6 | **Yes** - fires iff any component declares a chain/invocation. A plugin with no chaining ships no contract and is NOT in violation. |
| **S5** | `workflow-skills.mjs` | Every skill referenced by a workflow exists on disk | sec 3.4 | **Yes** - fires iff `_workflows/` exists with content |

Each check uses the existing `loadPlugin` `PluginContext` (with new helpers if needed - e.g. reading `agents/_chain-permitted.yaml`, listing `_workflows/`). They use `relPath(ctx.root, abs)` for paths in findings (per the Phase 1/2 convention). All five are registered in `scripts/lib/registry.mjs`.

S4 and S5 detect their applicability from on-disk state, not from a flag - the Standard's conditional MUST in sec 3.6 maps to "fires iff there is something to validate."

### The gate-runner adjustment (the load-bearing tweak)

The existing `check.mjs` `runGate` counts all errors and exits 1 if any > 0. With Convergent checks added, a Universal plugin would suddenly fail the gate because S1/S2/S3 emit errors. That's wrong for the milestone-validity model.

**Fix:** `runGate` filters errors by the plugin's *declared-tier ceiling* (or below) when computing the exit code. Errors above the declared tier are surfaced in `findings` and aggregated into `tier-report`'s `blocked.<next-tier>`, but they do not contribute to the gate's failure count.

- Concretely: load `ctx.library?.data?.tier`, map to its index, and compute `errorCount` over findings whose tier (by `reqId` prefix) is `<= declaredTier`. `warnCount` and `findings` are unfiltered.
- A plugin declaring no tier (or `library.json` missing) is treated as "no ceiling" - all errors count - preserving today's behavior for the missing-library-json fixture.
- This change is small (one helper to map reqId → tier index, one filter), tested via two new cases in `check-runner.test.mjs`: a universal plugin with a convergent error must `exitCode 0`; the universal tests must still pass.

This is the gate-side of the same model `tier-report` already implements (capping satisfaction at declared tier). It keeps "the toolkit passes its declared-tier gate" honest as new tier checks land.

### Optional `prefix` polish on `library.json`

Adding `"prefix": "askit-"` to the root `library.json` is harmless at Universal and preempts the S2 finding from showing up in `blocked.convergent`. This matches the locked D17 (`askit-` prefix adopted) and lets the toolkit start with a smaller climb-to-Silver list.

## File structure (3A deliverables)

```
STANDARD.md                                  REVISE - v0.8 (sections above)
library.json                                 MODIFY - "standard": "0.8"; add "prefix": "askit-"
docs/internal/DESIGN.md                      REVISE - annotate D19 with "superseded by 2026-05-27 spike"
scripts/checks/agent-targets.mjs             NEW - S1
scripts/checks/prefix.mjs                    NEW - S2
scripts/checks/components-index.mjs          NEW - S3
scripts/checks/chain-contract.mjs            NEW - S4 (conditional; needs YAML parsing - reuse the `yaml` dep)
scripts/checks/workflow-skills.mjs           NEW - S5 (conditional)
scripts/lib/registry.mjs                     MODIFY - register the 5 new checks
scripts/check.mjs                            MODIFY - filter errorCount by declared-tier ceiling
scripts/tier-report.mjs                      (already correct; verify no change needed)
tests/unit/agent-targets.test.mjs            NEW
tests/unit/prefix.test.mjs                   NEW
tests/unit/components-index.test.mjs         NEW
tests/unit/chain-contract.test.mjs           NEW
tests/unit/workflow-skills.test.mjs          NEW
tests/unit/check-runner.test.mjs             EXTEND - declared-tier ceiling cases
tests/unit/seed-blocked-convergent.test.mjs  NEW - locks the climb-to-Silver list contract
tests/fixtures/golden/silver-fixture/        NEW - a Silver-shaped plugin (agent-targets, prefix, components index, chain contract, workflow) - golden for S1-S5
tests/fixtures/anti/no-agent-targets/        NEW - missing agent-targets (S1)
tests/fixtures/anti/no-prefix/               NEW - missing prefix (S2)
tests/fixtures/anti/components-drift/        NEW - components index disagrees with disk (S3)
tests/fixtures/anti/chain-orphan/            NEW - invocation not in chain contract (S4)
tests/fixtures/anti/workflow-missing-skill/  NEW - workflow references missing skill (S5)
```

## Documentation (dual-doc, first-class - per standing maintainer requirement)

Documentation deliverables are EXPLICIT tasks in the implementation plan, not afterthoughts. Per Standard sec 10.3 single-source-of-truth: structured facts (check ids, requirement ids, the new manifest schemas) live in exactly one canonical place; views generate from or link to it, never duplicate it.

**Agent-facing (canonical):**
- Each new check `.mjs` module carries a doc comment naming its `reqId`, the Standard section it enforces, and an example finding message. The `Finding.message` itself cites the section (e.g. `"... (Standard sec 5.1)"`) so an agent reading a report can navigate.
- `AGENTS.md`: append a line under the validation-spine description that Silver-tier checks now run (Convergent reqIds `S1`-`S5`), with the visible-burndown explanation in one sentence.

**Human-facing:**
- `docs/explanation/conformance-and-tiers.md`: extend with a "Silver checks (in 3A)" subsection summarising S1-S5, and an "Visible burndown" subsection explaining the `blocked.<next-tier>` mechanic.
- `docs/reference/askit-evaluate.md`: note that reports now include Convergent-tier findings; the report shape is unchanged (already designed to support multi-tier).
- `docs/reference/silver-checks.md` (NEW): a per-rule reference table for S1-S5 (id, what it checks, Standard section, conditional?, example fix). Mirrors the spirit of a future U-rules reference; serves as the human-readable rule book.
- `docs/how-to/climb-from-bronze-to-silver.md` (NEW): a short walkthrough that uses `tier-report --json | jq .blocked.convergent` (or equivalent) to read the to-do list and fix the items one by one. This is the human face of the visible-burndown insight.

**Spike + design docs (already written):**
- `spikes/2026-05-27_codex-plugin-format.md` (committed only at Phase 4 ADR graduation).
- `PHASE-3A-DESIGN.md` (this doc).
- The plan: `PHASE-3A-PLAN.md` (generated next via writing-plans).

**`INDEX.md`** stays at Bronze framing for now; it gets a Convergent-tier update when 3B/3C land and the toolkit actually declares Silver.

## Self-validation impact

After 3A, on the repo:
- `npm test` green (new check unit tests pass + existing 65 pass + the new declared-tier-ceiling gate tests).
- `node scripts/check.mjs` exits 0. The five new checks' findings about S1/S3 (and anything else still un-Silvered) appear in the printed `findings` list but do NOT fail the gate, because the toolkit is declared `universal`.
- `node scripts/tier-report.mjs --json` reports approximately:
  ```json
  { "tier": "universal", "satisfies": ["universal"],
    "blocked": { "convergent": ["S1: ...", "S3: ..."] } }
  ```
  exactly listing what 3B/3C must close to reach Silver.
- `tests/unit/seed-bronze.test.mjs` continues to pass (the repo still passes its declared-tier Bronze checks).
- A new `tests/unit/seed-blocked-convergent.test.mjs` asserts the expected S-ids appear in `blocked.convergent` - this locks the burndown contract and tells the next phase what's left.

## Exit gate (3A)

- Standard v0.8 committed; library.json `"standard": "0.8"` and `"prefix": "askit-"` set.
- Five new check modules unit-tested (golden + anti per check) and registered.
- `check.mjs` filters errorCount by declared-tier ceiling; old behavior preserved for tier-less plugins.
- `tier-report` shows `tier: universal`, `blocked.convergent: [...]` listing the Silver climb on the repo.
- New Diataxis docs (`silver-checks.md` reference + `climb-from-bronze-to-silver.md` how-to) shipped; `conformance-and-tiers.md` extended; `AGENTS.md` updated.
- CI green: `npm ci && npm test && node scripts/check.mjs` all 0 / exit 0.
- CHANGELOG entry under `[Unreleased]`.

## Explicitly deferred (so 3A stays bite-sized)

- **3B:** S6 per-target format presence; `gen-manifest` extended to emit `.codex-plugin/plugin.json` from `library.json`; Codex marketplace catalog generation; `--agent-target` on `build-skill`; local Codex round-trip validation (`codex plugin marketplace add --local ...`).
- **3C:** The eight builders, sequenced; shared builder harness extracted after the second; per-builder plans.
- **At 3B or 3C exit:** bump `library.json.tier` to `"convergent"`; `tier-report` prints Silver with empty `blocked`.
- **Q-A (public Silver preview)** decided at 3C exit.
- **D19 ADR migration** to numbered MADR files at Phase 4 (per Q-C).

## Risks

- **R2 (Codex packaging)**: largely retired by the spike. Residual: subagent + MCP config inside a distributed Codex plugin (vs in user `config.toml`) is a build-time confirm for 3B's emitter; the Standard revision in 3A flags it as such, not as a closed question.
- **Standard-revision scope creep**: the temptation to do a full re-draft. Mitigation: the design pins exactly which sections move (sec 3.2/3.3/3.9, sec 10.1, sec 12, Appendix A) and explicitly excludes sec 2.5/sec 3 sweeps.
- **The declared-tier gate filter is subtle**: easy to get wrong in a way that hides errors. Mitigation: dedicated tests asserting (a) universal-with-convergent-error exits 0 + finding visible, (b) universal-with-universal-error still exits 1, (c) no-library-json behavior unchanged.
- **Doc drift between Standard sec 5.1 schema and the new check messages**: mitigation - every Finding message cites the section it enforces; updating the section means updating the citation.
