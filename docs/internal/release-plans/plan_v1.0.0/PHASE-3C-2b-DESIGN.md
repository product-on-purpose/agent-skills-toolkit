# Phase 3C-2b Design - build-command + the builder-skill pattern (builder-pattern.md)

> Design doc (2026-05-29, v2 after the Codex spike). Canonical inputs: `STANDARD.md` (v0.8, on main; sec 3.2 command, sec 3.8 frontmatter, sec 5 component index, sec 10.1 layout), `RELEASE-PLAN.md` (Phase 3 builders, R4), `builder-skills-catalog.md` (Area 4), `PHASE-3C-2a-{DESIGN,PLAN}.md` (the slice + two-stage-review pattern to mirror), `spikes/2026-05-27_codex-plugin-format.md` (the SYNTHESIS section - why there is no render harness).
> Status: design + the key calls approved by maintainer 2026-05-29 (brainstorming, post-spike). Gitignored working doc (not committed, per the `_local` convention).
> Phase 3 decomposition: 3A/3B/3C-1 DONE -> 3C-2a (build-subagent + dogfood + S4 orphan, DONE, PR #63) -> **3C-2b = THIS (build-command + builder-pattern.md)** -> 3C-2c+ (the remaining builders: build-mcp, build-hook, build-workflow, build-chain-contract, build-agents-md, build-output-style; each reuses builder-pattern.md).

## The reframing that produced this design (from the spike SYNTHESIS)

Three spikes (subagents, MCP, commands) converged on a correction to the R4 assumption: **there is no shared per-target RENDER harness to forge.** Codex's plugin model distributes skills + MCP as PORTABLE files (wired by `gen-manifest` manifest pointers), treats subagents/output-styles as Claude-only, realizes commands via the EXISTING backing skill, and cannot reliably run plugin-local hooks (#16430). No v1 component type has genuinely divergent, both-ingestible per-target FILES to render. **What actually generalizes across all builders is the builder-SKILL pattern, not a `gen-<type>.mjs` engine.** So the harness-forger question dissolved; `build-command` was chosen as the first builder by VALUE (cross-agent invocation parity, beginner-facing, dogfoodable on the repo).

## Goal

Ship `build-command` (authors a Claude slash command that maps to an existing skill/workflow; on Codex the command is realized as the backing skill - no new Codex artifact, documented as functional parity per sec 3.2). In doing so, establish `docs/reference/builder-pattern.md` - the shared builder-skill contract (the R4 mitigation, correctly framed as a SKILL pattern not a render engine) that builders 3C-2c+ reuse. Dogfood by shipping the toolkit's own commands (`/askit-evaluate`, `/askit-build-skill`), making the new command-validator check (S7) and S3-commands real on the repo.

After 3C-2b: the toolkit ships 4 skills (+ `askit-build-command`), 2 subagents, 2 commands, a chain contract, `builder-pattern.md`, and a command-validator check (S7). It self-validates at **Silver** with commands as real Convergent components (the Silver claim strengthens). The builder-skill pattern is documented for the remaining builders.

## Locked decisions (maintainer, 2026-05-29 brainstorming, post-spike)

- **3C-2b = build-command** is the first builder, chosen by VALUE (the harness-forger question dissolved - see the reframing). Completes cross-agent invocation parity; Convergent; beginner-facing; dogfoodable on the repo.
- **The "harness" = the builder-SKILL pattern, documented in `docs/reference/builder-pattern.md`** (create/improve; interview -> author the Claude-native canonical file -> register in `library.json components.*` -> `gen-manifest` wires any manifest pointer -> `evaluate` to 0 errors). NOT a `gen-<type>.mjs` render engine (none needed - the spike SYNTHESIS). build-command establishes this pattern; 3C-2c+ copy it.
- **No Codex render / no round-trip for commands.** A command's Codex realization is the EXISTING backing skill (sec 3.2 parity), already shipped and ingestion-proven (3B). build-command emits a new Claude `commands/<name>.md` and NO new Codex artifact. The skill + docs DOCUMENT the parity (sec 3.2 parity note).
- **A command-validator check (S7, Convergent, conditional).** Commands are Convergent (sec 3.2); their validity is a Convergent requirement. New reqId S7 (next after S6). Conditional: fires only when `commands/` exist (like S4). The toolkit ships commands (dogfood), so S7 runs on the repo and passes.
- **Dogfood = ship `/askit-evaluate` + `/askit-build-skill` commands** (each maps-to its skill). Makes S7 + S3-commands real on the repo (not fixture-only). Authored via `build-command` (the builder builds the toolkit's own commands).
- **No STANDARD correction needed.** sec 3.2 (CC `commands/<name>.md`; CX = the backing skill) is accurate. (The sec 3.9 MCP correction the spike found is deferred to the build-mcp slice.)
- **Versioning (pinned, milestone-versioning):** plugin stays `0.2.0` (within Silver, no tag). New component `askit-build-command` at `0.1.0`. The two dogfood commands at `0.1.0`. Manifests regenerated because `library.json` changed.

## Background: the command contract (STANDARD sec 3.2 + 3.8, verified)

- **Command (sec 3.2, Convergent):** an explicit user-invocable entry point to a skill.
  - **CC format:** `commands/<name>.md` with command frontmatter and `$ARGUMENTS`/named args; the body is the prompt that invokes the backing skill.
  - **CX format:** the backing skill itself, explicitly invocable (the skill at `skills/<name>/SKILL.md` inside the Codex plugin). Standalone custom prompts are deprecated. So there is NO distinct Codex command artifact - the command "is" the skill on Codex.
- **Rules (sec 3.2):** a command MUST map to exactly one skill or workflow; its description MUST match the skill's triggering intent. Multi-target plugins MUST emit each target's form (CC: `commands/<name>.md`; CX: the backing skill, explicitly invocable).
- **Frontmatter (sec 3.8):** `args` (declared arguments), `maps-to` (the skill or workflow it invokes), plus the common `name`/`description` + sec 3.7 metadata. (Task A pins the exact Claude-native command frontmatter keys - `description`, `argument-hint`, `allowed-tools`, `model` - and reconciles them with the Standard's `args`/`maps-to`.)
- **Parity note (sec 3.2):** on Codex a command is realized as an explicitly-invocable skill, not a distinct artifact - functional parity, not identical UX. Tooling/docs MUST set this expectation.

## Architecture

### 1. Task A - pin the Claude command frontmatter (light, FIRST; not a blocking spike)

Pin the exact Claude Code command-file frontmatter contract (`description`, `argument-hint`, `allowed-tools`, `model`, `$ARGUMENTS`) via the `plugin-dev:command-development` skill / Codex+Claude docs, and reconcile with the Standard's sec 3.8 `args`/`maps-to`. Outcome: the canonical `commands/<name>.md` shape the template + `gen`/validator target. LOW risk (no Codex ingestion unknown - the Codex side is the existing backing skill, proven in 3B). Append to the spike note. Unlike 3C-2a/3C-2b-mcp Task A, this cannot surface an ingestion blocker.

### 2. `docs/reference/builder-pattern.md` (the real "harness" - the R4 mitigation)

The SINGLE canonical home (Diataxis reference, alongside `silver-checks.md`). Documents the builder-SKILL pattern every builder follows, so the family stays consistent without a code framework:
> **create:** interview the component's inputs -> copy the type's template -> author the Claude-native canonical file (`commands/<name>.md`, `agents/<name>.md`, `mcp/<name>.json`, ...) -> register it in `library.json components.<type>` -> run `gen-manifest --write` to wire any per-target manifest pointer -> `node scripts/evaluate.mjs . --json` and iterate to 0 errors.
> **improve:** consume `evaluate --json` findings and fix.
> **Cross-agent note:** skills + MCP are portable (manifest-pointer-wired); subagents/output-styles are Claude-only; a command's Codex form is its backing skill. There is NO per-component render engine - per-target wiring is `gen-manifest`'s job; Claude-only types have no Codex artifact.
Each builder skill links to it. This is R4 made concrete: the next builders copy a proven SKILL shape, not a premature code abstraction.

### 3. `build-command` skill - `skills/askit-build-command/`

`SKILL.md` (+ `references/`), mirroring `askit-build-skill`/`askit-build-subagent` create/improve shape:
- **create:** interview (command name; the skill/workflow it maps-to; args; a description matching the skill's intent) -> copy `templates/command.md` to `commands/<name>.md` and fill it (native frontmatter + `maps-to` + a body that invokes the backing skill) -> verify the `maps-to` target exists -> register in `library.json components.commands` -> document the Codex parity (the command is the backing skill on Codex; no Codex file) -> `node scripts/evaluate.mjs . --json` to 0 errors.
- **improve:** consume `evaluate --json` findings and fix (a `maps-to` that does not resolve, a description that does not match the backing skill, missing frontmatter).
- Links to `docs/reference/builder-pattern.md`. Carries the `askit-` prefix (S2).

### 4. command-validator check - `scripts/checks/command-contract.mjs` (NEW, Convergent, S7)

For each command in `commands/*.md` (sec 3.2/3.8): frontmatter valid; `maps-to` present AND resolves to an on-disk skill (`ctx.skills`) or workflow; the command maps to EXACTLY ONE target; `description` present (SHOULD match the backing skill's intent - a soft/warn heuristic, not a hard string match). Conditional: returns [] when no `commands/` exist. reqId S7, tier convergent. Registered in `scripts/lib/registry.mjs`.

### 5. ctx.commands - `scripts/lib/load-plugin.mjs`

Add `ctx.commands` (parse `commands/*.md` frontmatter+body via a `listCommandFiles` fs-utils helper, parallel to `listAgentFiles`). Parallel to `ctx.skills` / `ctx.subagents`.

### 6. S3 + library.json - `scripts/checks/components-index.mjs`

Add `components.commands` to `library.json`; extend `components-index` (S3) to validate it both ways (declared-missing + on-disk-undeclared), mirroring the skills/subagents branches.

### 7. Dogfood - the toolkit's own commands

Author `commands/askit-evaluate.md` (maps-to `askit-evaluate`) and `commands/askit-build-skill.md` (maps-to `askit-build-skill`) via `build-command`. Register in `library.json components.commands`. These make S7 + S3-commands real on the repo and demonstrate invocation parity (a `/askit-evaluate` slash command on Claude; the `askit-evaluate` skill is the invocable form on Codex).

### 8. gen-manifest / manifests

Claude auto-discovers `commands/*.md` (like `agents/`), so the native manifests need NO command list. Optionally extend `manifest.generated.json` (`renderManifest`) to index commands alongside skills (nice-to-have, not required; U8 only checks name/version so no drift either way). Decision: extend `manifest.generated.json` to list commands for completeness; native manifests unchanged. Regenerate after the dogfood.

### 9. Supporting

- `scripts/lib/fs-utils.mjs`: add `listCommandFiles(root)` (commands/*.md).
- `templates/command.md`: the canonical command scaffold (native frontmatter + `maps-to` + a body that invokes the backing skill).

## File structure (3C-2b deliverables)

```
docs/reference/builder-pattern.md              NEW - the shared builder-skill contract (the R4 "harness", single home)
scripts/checks/command-contract.mjs            NEW - command-validator (S7, Convergent, conditional)
scripts/lib/load-plugin.mjs                    MODIFY - expose ctx.commands
scripts/lib/fs-utils.mjs                       MODIFY - listCommandFiles
scripts/checks/components-index.mjs            MODIFY - S3 validates components.commands
scripts/lib/registry.mjs                       MODIFY - register command-contract
scripts/generators/gen-manifest.mjs            MODIFY (light) - manifest.generated.json indexes commands
skills/askit-build-command/SKILL.md            NEW - the builder skill (create/improve)
skills/askit-build-command/references/         NEW - authoring-commands.md
templates/command.md                           NEW - the canonical command scaffold
commands/askit-evaluate.md                     NEW (dogfood) - maps-to askit-evaluate
commands/askit-build-skill.md                  NEW (dogfood) - maps-to askit-build-skill
library.json                                   MODIFY - components.commands (+ askit-build-command in components.skills); regen manifests
tests/unit/command-contract.test.mjs           NEW
tests/unit/components-index.test.mjs           EXTEND - components.commands cases
tests/unit/load-plugin.test.mjs                EXTEND - ctx.commands
tests/unit/gen-manifest.test.mjs               EXTEND - manifest.generated.json commands index
tests/fixtures/golden/command-fixture/         NEW - a plugin with a valid command mapping to a skill
tests/fixtures/anti/command-orphan-mapsto/     NEW - maps-to points at a missing skill (S7 error)
tests/fixtures/anti/command-no-mapsto/         NEW - command missing maps-to (S7 error)
docs/reference/askit-build-command.md          NEW
docs/how-to/build-a-command.md                 NEW
docs/reference/silver-checks.md                UPDATE - add the S7 command-validator row
AGENTS.md / INDEX.md                            UPDATE - the toolkit now ships commands + build-command + builder-pattern.md
CHANGELOG.md                                   entry
```

## Self-validation impact

After 3C-2b, on the repo:
- `npm test` green; `node scripts/check.mjs` exit 0 at the convergent ceiling; `node scripts/evaluate.mjs .` exit 0.
- The toolkit ships 2 real commands (dogfood) -> S7 + S3-commands run on the repo and PASS for the right reason; commands are real Convergent components (the Silver claim strengthens). The chain contract / subagents from 3C-2a remain valid.
- `tier-report --json` still `{tier: convergent, satisfies: [universal, convergent], blocked: {}}`. No tag.

## Exit gate (3C-2b)

- Task A pinned the Claude command frontmatter in the spike note.
- `docs/reference/builder-pattern.md` shipped (the builder-skill pattern; linked by the builder skills).
- `build-command` skill present, passes its own evaluate (0 errors), documents create/improve + the Codex parity.
- `command-contract` check (S7, Convergent) registered + unit-tested (golden + anti maps-to-missing + anti no-maps-to); conditional (silent when no commands).
- `ctx.commands` in load-plugin; S3 validates `components.commands`; the toolkit's 2 dogfood commands shipped + registered.
- `manifest.generated.json` indexes commands; drift-clean.
- check + evaluate exit 0; tier-report convergent/empty-blocked; full suite green; seed tests green.
- Docs (builder-pattern + how-to + reference + silver-checks S7 row + AGENTS/INDEX) shipped; CHANGELOG.
- No em-dash / en-dash anywhere.

## Explicitly deferred (to 3C-2c+)

- `build-mcp` (a lighter slice: gen-manifest mcpServers pointer + sec 3.9 correction + `.mcp.json` authoring + the mcp-valid check + component-level S6 + an ingestion round-trip - full notes in the spike note).
- `build-hook` (Codex plugin-hook caveat #16430), `build-workflow` (+ S4 workflow-step orphan detection + S5 real exercise), `build-chain-contract`, `build-agents-md`, `build-output-style` (Claude-only). Each is a create/improve skill reusing `builder-pattern.md`.
- Component-level per-target S6 (lands with build-mcp, the first plugin-distributable dual-target component) and its repo dogfood.
- `tier: advanced` / Gold - Phase 5. Public go-public + marketplace - separate / Phase 5.

## Risks

- **Command frontmatter gap (Standard vs Claude-native).** sec 3.8 names `args`/`maps-to`; Claude-native command files use `description`/`argument-hint`/`allowed-tools`/`model`. Mitigation: Task A pins the union; the template carries both; the validator reads `maps-to` (the Standard convention) for S7. If a true contradiction appears, it is a small sec 3.8 clarification (not a contract change).
- **S7 conditional correctness.** Over-eager firing could flag a plugin with no commands. Mitigation: strictly conditional (no `commands/` -> []), unit-tested both ways; mirror the S4 conditional discipline.
- **maps-to resolution scope.** A command may map to a skill OR a workflow; the toolkit has no workflows yet. Mitigation: S7 resolves `maps-to` against `ctx.skills` now and (when workflows exist, 3C-2c+) `ctx.workflows`; until then a `maps-to` naming a non-skill is an error (correct - the toolkit ships no workflows).
- **builder-pattern.md drift from reality.** The pattern doc must match what the builders actually do. Mitigation: build-command is authored to the pattern and links it; each later builder links the same doc, so divergence surfaces in review.
- **Codex CLI is fast-moving.** Re-verify `codex --version` at build start (though build-command has no Codex ingestion dependency - its Codex form is the already-proven backing skill).
