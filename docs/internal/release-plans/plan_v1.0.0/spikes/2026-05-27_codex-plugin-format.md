# Spike: Codex round-trip / plugin packaging (R2 / F-04, Phase 3)

Date: 2026-05-27. Codex CLI v0.133.0 (local, Windows). Outcome: the assumed Codex emission contract is partly OUTDATED - Codex now has a native plugin + marketplace system. Concrete schema captured below. Standard + Phase 3 design need revising before building emitters.

## What the DESIGN/STANDARD assumed (from 2026-05-25, D19)
- Codex skills = agentskills.io `SKILL.md` discovered from repo `.agents/skills/` and `$HOME/.agents/skills`.
- Codex subagents = `config.toml [agents.<name>]` + per-role `agents/*.toml`.
- Codex command = a skill (custom prompts deprecated). No output-style. MCP via `config.toml`.
- Residual unknown (F-04/R2): exact on-disk layout a *distributed* Codex plugin uses to surface bundled skills.

## What Codex v0.133 actually does (verified on disk + via `codex` CLI)
Codex has a first-class **plugin + marketplace** system: `codex plugin add|list|remove` and `codex plugin marketplace add|list|upgrade|remove` (local OR git marketplaces).

**Marketplace catalog** = `.agents/plugins/marketplace.json`:
```json
{
  "name": "openai-bundled",
  "interface": { "displayName": "OpenAI Bundled" },
  "plugins": [
    { "name": "browser",
      "source": { "source": "local", "path": "./plugins/browser" },
      "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
      "category": "Engineering" }
  ]
}
```

**A Codex plugin** = a directory containing:
- `.codex-plugin/plugin.json` (native manifest - analogous to Claude's `.claude-plugin/plugin.json`)
- `skills/<name>/SKILL.md` (skills live INSIDE the plugin under `skills/`)
- `scripts/`, `docs/`, `assets/` as needed

Install lifecycle: `codex plugin add <name>@<marketplace>`; versioned (e.g. `26.521.10419`); status installed/enabled. `codex plugin list` shows marketplaces + plugins + roots.

## Why this matters (the headline)
Codex's distribution model is now **structurally almost identical to Claude Code's**:
- Claude: `.claude-plugin/plugin.json` + `skills/`; marketplace `.claude-plugin/marketplace.json`.
- Codex: `.codex-plugin/plugin.json` + `skills/`; marketplace `.agents/plugins/marketplace.json`.

So emitting for Codex is largely: generate a `.codex-plugin/plugin.json` from the canonical `library.json` (exactly parallel to how the Claude manifest is generated), and a Codex `marketplace.json` catalog entry. The `SKILL.md` files are already portable and just sit under the plugin's `skills/`. This is MUCH closer to "one generated manifest per agent" than the older "loose skills in .agents/skills + config.toml" picture.

## Round-trip is locally testable (answers Q3.2 partially)
`codex plugin marketplace add --local <path>` + `codex plugin add <plugin>@<mp>` + `codex plugin list` can validate an emitted Codex plugin/marketplace end to end on this machine. CI parity (Codex CLI in CI) is a separate question, but at minimum we can validate the emitted format structurally against this concrete schema, and do a real local round-trip in the spike/dev loop.

## Impact on the Standard (needs maintainer decision)
The Codex emission contract in STANDARD sec 3.2/3.3/3.9/10.1 and the marketplace section (sec 12), plus design D19, predate this. They should be revised to:
- Codex target plugin = `.codex-plugin/plugin.json` (generated from `library.json`) + `skills/` (portable) [+ subagents/MCP per the still-valid config.toml mechanisms].
- Codex marketplace = `.agents/plugins/marketplace.json` (a real, native catalog format) - the separation rule (sec 12) still holds and now maps onto a concrete Codex artifact.
- `manifest.generated.json` / native-manifest generation (G4) should add the Codex `.codex-plugin/plugin.json` alongside the Claude one.

## Recommendation
Before building Phase 3 emitters: cut a small Standard revision (v0.8) updating the Codex emission contract to the native plugin+marketplace model, then design Phase 3 emitters against the concrete schema above (largely a second generated manifest + a marketplace catalog, mirroring the Claude path). This turns the highest-uncertainty task (R2) into a well-specified one and de-risks the eight builders.

## Caveat
Codex v0.133 -> 0.134 is already available; this is a fast-moving CLI. Pin the observed schema to v0.133 and re-verify at build time. (`codex doctor` also flagged a local npm-prefix PATH mismatch - cosmetic, not relevant to the format.)

## Phase 3B pin (2026-05-28, re-verified at Codex CLI v0.135.0)

The CLI moved 0.133 -> 0.135 since the original spike; the plugin + marketplace FORMAT is unchanged (`.codex-plugin/plugin.json` + `.agents/plugins/marketplace.json`; bundled `browser` manifest byte-identical; `codex plugin add|list|marketplace|remove` surface identical). Bind to the format, not the version.

**Minimal accepted `.codex-plugin/plugin.json`** (round-tripped end to end and INGESTED):
```json
{
  "name": "askit-test",
  "version": "0.1.0",
  "description": "Round-trip probe plugin.",
  "skills": "./skills/",
  "interface": { "displayName": "ASKit Test", "category": "Engineering" }
}
```
No `shortDescription`, no URL fields, no `commands` field needed. `"skills": "./skills/"` is the load-bearing field (it is what makes Codex resolve skills).

**Working round-trip commands (v0.135 syntax - two corrections vs the original prose):**
```
codex plugin marketplace add <path>          # POSITIONAL source path, NOT --local (the --local flag is gone)
codex plugin list                            # shows "<plugin>@<mp>  not installed  <path>"
codex plugin add <plugin>@<marketplace>      # prints "Installed plugin root: <cache-path>"
codex plugin remove <plugin>@<marketplace>
codex plugin marketplace remove <marketplace-name>
```
There is NO `codex plugin show` and no `--json` on `plugin list` (it prints only PLUGIN/STATUS/VERSION/PATH).

**Ingestion proof (headless):** `codex plugin add` prints `Installed plugin root: <path>`; a correctly-ingested plugin has `<install-root>/skills/<name>/SKILL.md` resolved there. Verified: our minimal manifest produced `C:\Users\jpris\.codex\plugins\cache\askit-rt-test\askit-test\0.1.0\skills\probe\SKILL.md`. This is the headless check that distinguishes a real ingestion from the pm-skills "lists but No plugin skills" false pass.

**Marketplace.json that worked (auto-derives the marketplace name from its `name` field):**
```json
{ "name": "askit-rt-test", "interface": { "displayName": "ASKit RT Test" },
  "plugins": [ { "name": "askit-test", "source": { "source": "local", "path": "./plugins/askit-test" }, "policy": { "installation": "AVAILABLE" }, "category": "Engineering" } ] }
```

## Phase 3C-2a pin (2026-05-29, Codex CLI v0.135.0 - UNCHANGED). BLOCKER: a plugin cannot ship subagents.

Re-verified `codex --version` = `codex-cli 0.135.0` (same as the 3B pin; plugin/marketplace format unchanged). Task A goal: pin the Codex SUBAGENT config bytes for the 3C-2a harness (`renderCodexAgentToml` + `renderCodexAgentsConfig`). Outcome: the byte-level schema IS pinned (below) AND a blocking constraint surfaced - **a distributed Codex plugin cannot register subagents in v0.135**. The build is STOPPED at Task A pending a maintainer decision (design + Standard change).

### Authoritative subagent schema (pinned)
Source: Codex `main` - `codex-rs/config/src/config_toml.rs` + `codex-rs/core/src/config/agent_roles.rs` (via Context7 `/openai/codex`), corroborated by developers.openai.com/codex.

Custom agents live in a `config.toml` under `[agents]`:
- Top-level `[agents]` (AgentsToml): `max_threads`, `max_depth`, `job_max_runtime_seconds`, `interrupt_message` (all optional).
- Per-role `[agents.<name>]` (AgentRoleToml, `deny_unknown_fields`): `description` (string; required unless supplied by the role file), `config_file` (path to a role file; relative paths resolved relative to THE config.toml THAT DEFINES THEM), `nickname_candidates` (array of string). Nothing else is permitted on this table.
- The role file (the `config_file` target) carries: `name` (role_name), `description`, `developer_instructions` (the role/prompt body), `nickname_candidates`, plus nested ConfigToml overrides. Role-file values override the inline `[agents.<name>]` ones.

Example:
```toml
[agents.researcher]
description = "Research-focused role."
config_file = "./agents/researcher.toml"
nickname_candidates = ["Herodotus", "Ibn Battuta"]
```

### THE BLOCKER (the 3C-2a design's core assumption is false in v0.135)
The 3C-2a design and STANDARD sec 3.3 / sec 10.1 assume a multi-target plugin ships subagents via a bundled `.codex-plugin/config.toml [agents.*]` that Codex merges on load. It does NOT.

Evidence (two authoritative sources):
1. The Codex `plugin.json` field guide (`codex-rs/.../plugin-creator/references/plugin-json-spec.md`, current main) enumerates EVERY top-level field: `name, version, description, author, homepage, repository, license, keywords, skills, hooks, mcpServers, apps, interface`. The component-pointer fields are `skills`, `hooks`, `mcpServers`, `apps`. There is NO `agents` field - a plugin cannot point at bundled agents.
2. The bundled `browser` plugin's `.codex-plugin/plugin.json` has only `"skills": "./skills/"` (no agents field, no bundled config.toml). No installed plugin on this machine ships `[agents.*]`; a grep of all plugin caches for `[agents.` / `config_file` returned zero hits.
3. `[agents.<name>].config_file` resolves "relative to the config.toml that defines them" - the USER's `~/.codex/config.toml` or a PROJECT `.codex/config.toml` (trusted projects only). There is no plugin -> config.toml merge path.

Corroborating: Codex issues #16430 (plugin-local hooks implied by docs but runtime runs only the global hooks.json) and #22078 (local marketplace plugin enabled but its skills not exposed) show plugin-local contribution is fragile/incomplete in Codex generally - the same listing-vs-ingestion class as the pm-skills bug.

Conclusion: in Codex v0.135, subagents are a USER/PROJECT `config.toml` concern, not a plugin-distributable component. The toolkit (a plugin) cannot ship Codex-ingested subagents. The required ingestion round-trip (3C-2a review flag 1) is therefore UNACHIEVABLE for plugin-shipped Codex subagents - which is the round-trip requirement doing its job: it forced the false assumption to the surface BEFORE we built on it.

### Impact
- `renderCodexAgentsConfig -> .codex-plugin/config.toml [agents.*]` would emit an INERT file Codex never reads from a plugin.
- Component-level S6 for Codex subagents would enforce emitting that inert artifact (a check that mandates a no-op file).
- STANDARD sec 3.3 ("Multi-target plugins MUST emit BOTH formats" for subagents) is wrong for Codex as of v0.135; sec 10.1's `.codex-plugin/config.toml` is not a real ingestion path.
- The Claude side is UNAFFECTED: `agents/<name>.md` + chain contract + S4 orphan detection are real and plugin-native on Claude.

### Options for the maintainer (decision required - design + Standard change)
- **A. Subagents are CLAUDE-ONLY for plugin distribution** (like `output-style`). 3C-2a builds the Claude subagent slice + chain + S4 + `build-subagent`; NO Codex subagent render, no S6-codex-subagent, no Codex subagent round-trip. The dogfood subagents declare `agent-targets: [claude]`, so component-level S6 is satisfied by the `.md` alone (the per-component agent-targets machinery from 3B already supports this). STANDARD sec 3.3 updated: Codex subagents are config-level, not plugin-level.
- **B. Emit Codex role files + a documented opt-in.** Still generate `agents/<name>.toml` role files, but ship a documented snippet the user pastes into their `config.toml` (or the builder writes a project `.codex/config.toml`). The round-trip verifies the role file PARSES / is accepted by codex in a config.toml, NOT plugin auto-ingestion. STANDARD reframes "emit both" as "Claude plugin-native + Codex documented config".
- **C. Pause 3C-2a; cut a STANDARD revision first** (sec 3.3/10.1) redefining the Codex subagent contract against this reality, then re-plan 3C-2a against the revised Standard.

Recommendation: **A** (optionally B later). It keeps the slice shippable and the toolkit's Silver claim real on the Claude target, uses the existing per-component `agent-targets` machinery, and treats Codex subagents as config-level / out of plugin scope until Codex adds an `agents` manifest field. Re-verify at each codex bump (fast-moving CLI).

## Phase 3C-2b pin (2026-05-29, Codex CLI v0.135.0 - UNCHANGED). MCP IS plugin-distributable + ingested; sec 3.9 wrong; emission is LIGHT.

Re-verified `codex --version` = 0.135.0. Task: pin how a distributed Codex plugin registers an MCP server, for `build-mcp`. Sources: Context7 `/openai/codex` (`plugin-json-spec.md`, `config_tests.rs`, `mcp_types.rs`) + developers.openai.com/codex + GitHub issues (#17360, #22105, #6465). Outcome: good news + a design-relevant wrinkle.

### Pinned facts
1. **MCP IS plugin-distributable AND ingested** (unlike subagents). `plugin.json` HAS a top-level `"mcpServers": "./.mcp.json"` component pointer (alongside `skills`/`hooks`/`apps`). Issue #17360: "Plugin-installed MCP servers register in Codex runtime" (they may need extra auth/setup, but they DO load). So there is NO Option-A-style blocker for MCP - `build-mcp` is viable.
2. **Plugin registration = a bundled `.mcp.json`**, standard format (the same cross-tool `.mcp.json` Claude uses):
   ```json
   { "mcpServers": { "docs": { "command": "docs-mcp", "args": ["--stdio"] } } }
   ```
   NOT `config.toml`. `config.toml` `[mcp_servers.<name>]` (command/args/`[.env]`; HTTP: `url`, `bearer_token_env_var`, `http_headers`, `env_http_headers`) is the USER-level format; `codex mcp add|list|get|remove` manages those. A plugin's servers are launched from the plugin; user config only toggles on/off + tool policy under `plugins.<plugin>.mcp_servers.<server>`. (Issue #22105: the plugin `.mcp.json` uses the `mcpServers` wrapper key, not `mcp_servers`.)
3. **=> STANDARD sec 3.9 is WRONG for a plugin** (it says "the plugin's `config.toml` mcp_servers entries"). Correct it: a distributed plugin registers MCP via a bundled `.mcp.json` referenced by `plugin.json "mcpServers"`. Also fix the sec 10.1 layout line that names `.codex-plugin/config.toml` for MCP. (A correction within the v0.8 Codex contract; `standard` stays 0.8.)

### The design-relevant wrinkle (re-opens the 3C-2b harness-forger choice)
The plugin `.mcp.json` is the standard, **largely portable** MCP format. So a plugin's MCP registration is a mostly-SHARED `.mcp.json` + a per-manifest POINTER (`mcpServers` in each native manifest). That makes `build-mcp`'s emission LIGHT - structurally a `gen-manifest` extension (add the `mcpServers` pointer to the generated native manifests + author/validate the shared `.mcp.json`), NOT a rich per-target `gen-<type>.mjs` render harness. (At most a light per-target path-root substitution if Claude needs `${CLAUDE_PLUGIN_ROOT}` and Codex differs.)

**This undermines `build-mcp` as the HARNESS-FORGER** - the exact reason it was chosen - the same way Option A undermined `build-subagent`'s harness role. Both subagents (single-target) and MCP (portable shared file) turn out NON-divergent. The builder with genuinely DIVERGENT per-target component FILES, which is what forges a real per-target render harness, is **`build-command`**: Claude `commands/<name>.md` (a distinct command file) vs Codex (a command is realized as a SKILL.md) - two genuinely different artifacts (`renderClaudeCommand` + `renderCodexCommandSkill`). No ingestion blocker (CC commands + CX skills both plugin-distributable; skills proven in 3B).

### Decision needed (maintainer) - re-opens which builder forges the harness
- **A. Swap: `build-command` forges the harness (becomes 3C-2b); `build-mcp` is a separate lighter slice** (gen-manifest extension + sec 3.9 fix + `.mcp.json` authoring/validation + component-S6 + round-trip). Honors the original intent (forge the reusable harness FIRST); build-command is the genuinely divergent case.
- **B. Keep `build-mcp` as 3C-2b** (still valuable: corrects sec 3.9, ships MCP authoring, ingestion round-trip), ACCEPT it is a gen-manifest extension (no `gen-mcp.mjs`/`builder-pattern.md` harness), and forge the harness in 3C-2c via `build-command`.
- **C. Proceed with `build-mcp` AND still cut `gen-mcp.mjs` to seed the pattern** despite the light render (weak - forging a harness from a non-divergent case, the same anti-pattern as forging from a single-target one).

Recommendation: **A** - the first-builder pick exists to forge the harness; the spike shows `build-mcp` does not and `build-command` does. Re-verify `codex --version` at build time.

## SYNTHESIS (2026-05-29): the "per-target render harness" (R4) is largely a PHANTOM

Pulling the thread once more: `build-command` is ALSO non-divergent. STANDARD sec 3.2 + 3.8: a command MUST map to exactly one skill/workflow, and its Codex realization is "the backing skill, explicitly invocable" - i.e. the EXISTING skill. So `build-command` emits a NEW Claude `commands/<name>.md` but NO new Codex artifact (Codex reuses the backing skill). Claude-side only, like subagents/MCP in their own ways.

Three spikes, three "harness-forger" picks dissolved - the pattern is now definitive. **Across Codex's plugin model there is almost NO genuine per-target FILE divergence to render:**
- **Portable (shared file + per-manifest pointer, gen-manifest territory):** skills (3.1), MCP (3.9 - a bundled `.mcp.json`).
- **Claude-only (no Codex artifact):** subagents (3.3), output-style (3.5/Area 12), statusline.
- **Claude-side + Codex-via-existing-skill:** commands (3.2 - new CC `commands/<name>.md`; CX = the backing skill, no new file).
- **Claude-reliable only (Codex plugin-local broken):** hooks (#16430 - runtime runs only the global hooks.json).
- **Agent-agnostic (one file, no per-target form):** chain-contract (3.6), AGENTS.md (3.10), workflows (3.4, Claude-centric).

So the anticipated shared **`gen-<type>.mjs` per-target RENDER engine does not exist** - there is nothing substantial to render per target beyond what `gen-manifest` already does (the native-manifest pointers). What ACTUALLY generalizes across all the builders is the **builder-SKILL pattern**, not a render engine:

> create/improve modes; interview -> author the Claude-native canonical file (`commands/<name>.md`, `agents/<name>.md`, `mcp/<name>.json`, `_workflows/<name>.md`, ...) -> register it in `library.json components.*` -> run `gen-manifest` to wire any per-target manifest pointer -> `evaluate` to 0 errors. Each builder also ships its validator check.

**Implication for the remaining Phase 3 builders:** there is no render harness to "forge". `docs/reference/builder-pattern.md` documents the builder-SKILL pattern above (the real shared thing, the R4 mitigation correctly framed); `gen-manifest` owns the (manifest-level) per-target wiring; per-component `gen-<type>.mjs` files are NOT needed (build them only if a genuinely divergent, both-ingestible type ever appears - none among the v1 set). **So the "which builder forges the harness" question DISSOLVES** - any builder establishes the skill-pattern. Pick the first builder by VALUE, not by divergence.

This corrects the R4 assumption ("extract a shared per-target emission harness after the 2nd builder") that drove the 3C-2a/3C-2b slicing: the shared thing is the builder-skill shape, surfaced once in `builder-pattern.md`, not a code harness.

## Phase 3C-2b Task A pin (2026-05-29): Claude command frontmatter (build-command)

Source: code.claude.com/docs (slash-commands) via Context7 `/websites/code_claude`. A Claude custom command is `commands/<name>.md`; the FILENAME (minus `.md`) is the command name (no `name` frontmatter). Frontmatter fields (all optional except `description` in practice): `description` (string, shown in /help), `argument-hint` (string, e.g. `[issue-number] [priority]`), `allowed-tools` (comma-list, e.g. `Read, Grep, Glob`), `model` (string). Body = the prompt; `$ARGUMENTS` (all args) or `$1`/`$2` (positional); `!` for bash, `@` for file refs.

Reconcile with STANDARD sec 3.8 (command keys `args`, `maps-to`): the Standard's `args` ~= Claude's `argument-hint`; `maps-to` is a Standard-convention key (NOT native Claude) recording the backing skill/workflow. So a toolkit command file = Claude-native (`description` [+ optional `argument-hint`/`allowed-tools`/`model`]) + `maps-to` (top-level, Standard convention) + `metadata.version`. NO `name` frontmatter (the filename is canonical, the Claude-idiomatic way) - a small sec 3.8 nuance for commands (name from filename), not a redundant frontmatter key. The `command-contract` check (S7) keys off `frontmatter.maps-to` (required, resolves to an on-disk skill/workflow) + `description` (required) + the filename as the name. No Codex artifact (the command's Codex form is the backing skill, sec 3.2). LOW risk - no ingestion unknown.
