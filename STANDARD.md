# The Advanced Skill Library Standard

> **Standard version 0.11**, amended 2026-06-05 (promoted to the repository root at v0.8 on 2026-05-26). This is the normative Standard that every tool in `agent-skills-toolkit` enforces; the version-history notes below record how the frozen draft converged.
> v0.11: `U10` (`no-dashes`) retired from the conformance spine (ADR 0028, house style is not a portability requirement). The no-em-dash / no-en-dash rule is a stylistic house preference with no portability or vendor basis (agentskills.io, Claude Code, and Codex impose no such rule), so it is no longer a graded requirement of a skill/plugin standard. A plugin MAY still enforce it for itself with an opt-in `PreToolUse` hook (the toolkit ships one in `hooks/`); the gate no longer flags em or en dashes in any plugin it evaluates. The Universal checks are now `U1-U9`, `U11`, `U12`; the spine is `U1-U9` + `U11-U12` + `S1-S8` + `G1-G10` = **29**.
> v0.10: The documentation-depth build-out (ADR 0024). `G7` is reclassified from the tier-inclusion statement (now an unnumbered structural property) to the **`docs-frontmatter`** check; the docs frontmatter taxonomy is pinned in sec 8.4. The build-out adds five checks: `U12` (`mermaid-valid`, Bronze - every fenced mermaid block is structurally valid) and `G8` (`folder-readme`), `G9` (`source-doc`), `G10` (`docs-presence`) at Gold, alongside `G7` (`docs-frontmatter`). The Gold checks are now `G1-G10` and the spine is `U1-U12` + `S1-S8` + `G1-G10` = **30**.
> v0.9: Runner Node baseline raised from EOL Node 20 to >=22.12.0; recommended pin Node 24. See ADR 0025.
> v0.8: Codex contract revised to the native plugin + marketplace model (sec 3.2/3.3/3.9/10.1 + Appendix A), per the 2026-05-27 spike against Codex CLI v0.133. Sec 12 marketplace updated to describe Codex's concrete native marketplace alongside Claude's (in a separate task).
> v0.7: Codex-review judgment calls applied - a minimal `library.json` (name/version/tier) is now REQUIRED at every tier (5/2.1/2.5; "loose components" without it are not a plugin); added component specs for **MCP server** (3.9) and **AGENTS.md** (3.10).
> v0.6: Second Codex review consistency fixes - `library.json` clarified as authored SoT not generated (2.6 G4); component-history rule made coherent (version all tiers; HISTORY required Silver+, recommended Bronze; match-when-present - 3.7/7.3/2.5); Codex emission paths reconciled to one contract (10.1; residual packaging note in Appendix A); chain-contract location pinned to `agents/_chain-permitted.yaml` (3.6/10.1); `_workflows/` added to layout (10.1); command parity note (3.2); 20+ trigger-eval SHOULD (8.3); "one plugin (release) version" wording (0).
> v0.5: Final open items resolved (research-backed). Codex command target = a **skill** (custom prompts deprecated; 3.2); Codex subagents via `config.toml` `[agents.*]` + per-role `.toml` (3.3); **output styles are Claude-only**, statusline differs (2.3); Codex skills agentskills.io-compatible (3.1). **`library.json` field schema pinned** (5.1). **Chain contracts = conditional MUST** - required iff chaining is used (3.6, 2.2). Appendix A: all items resolved or deferred (badges).
> v0.4: **Two-axis terminology** (Section 0) - *structure* (component = unit of reuse, plugin = unit of release that holds the one version, workspace, marketplace) vs *quality* ("skill library" = a plugin conforming to this Standard, graded Bronze/Silver/Gold - a grade, not an artifact). Swept the document so requirement subjects say "plugin"; "library" is reserved for the grade, the Standard's name, and the `library.json` filename. Renamed Section 10 "Library anatomy" -> "Plugin anatomy" (root `library/` -> `<plugin>/`) and Section 5 "Library manifest" -> "Plugin manifest". **Version-propagation pinned** (7.4): one plugin version = max component bump since last release (MUST). Quick-calls resolved in Appendix A (Node >=20 LTS, sample count, description rubric 0.7, tier-reporting format).
> v0.3: Codex-review fixes - `version` now REQUIRED at every tier (3.7, matching 7.3; added to the 2.5 Bronze cell); backlog location unified to `docs/internal/backlog/` (7.1 + Appendix A, matching 10.1); manifest model resolved to canonical `library.json` + generated native manifests (5, 10.1, 10.3, Appendix A); Codex emitter research-gate noted in Appendix A; **Gold criteria frozen as G1-G7 in new Section 2.6** (required-baseline vs deferred-elaboration line drawn), Appendix A Gold item resolved.
> v0.2: added principle 7 (a la carte adoption), tier requirements (2.5), per-component anatomy + dual representation (10.2-10.3), output-contract structure (11), version-required (3.7), Section 12 (distribution and marketplaces + the embedded-marketplace anti-pattern), and `docs/internal/` governance layout.
> Status: normative, decision-complete for v1. Canonical pair with the committed design record [`docs/internal/DESIGN.md`](docs/internal/DESIGN.md). Decision-journey provenance is retained in the project's gitignored working docs.
> This document defines what a best-in-class, advanced, multi-agent skill library is, and is the source of truth every tool in agent-skills-toolkit enforces.

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are used as defined in RFC 2119.

---

## 0. Scope and intent

This Standard describes how to structure a **plugin** as an advanced skill library that goes beyond a flat collection of standalone skills. It defines components (skills, commands, subagents, hooks, workflows, chain contracts), the conformance tiers that make a plugin portable across agents, and the CI and release expectations that keep a plugin healthy at scale.

It targets two agents as first-class: **Claude Code (CC)** and **OpenAI Codex CLI (CX)**, and remains compatible with the broader agentskills.io ecosystem (~50 agents) at its Universal tier.

A plugin MAY conform at any single tier. Higher tiers include all requirements of lower tiers.

### Terminology (two axes)
The vocabulary is strict because two independent axes never mix.

*Structure - what a thing physically IS:*
- **Skill** - one `SKILL.md`. The atomic capability.
- **Component** - any single building block: a skill, command, subagent, hook, workflow, chain contract, or MCP server. The **unit of reuse** (usable standalone in any repo).
- **Plugin** - a package of components with a manifest and a version; the installable artifact. The **unit of release**, and the thing that **carries the version**.
- **Workspace** - a directory holding several plugins developed together (e.g., `product-on-purpose/`). Not installable.
- **Marketplace** - a catalog that lists plugins for discovery and install. Separate from the plugins it lists.

*Quality - how GOOD a plugin is, per this Standard:*
- **Skill library** - **not a separate artifact.** The designation for a plugin that conforms to this Standard, graded Bronze/Silver/Gold. "Library" is a grade, not a thing; an *advanced skill library* is a plugin that reaches the high tiers. (Example: `pm-skills` is a plugin that is also a skill library.)

The path is **loose components -> plugin -> skill library**. There is exactly one **plugin (release) version**, carried on the plugin manifest; components also carry their own local versions, which roll up into it (Section 7.4).

---

## 1. Principles

1. **Composable over monolithic.** Each component MUST do one thing and be usable independently.
2. **Instruction budget.** Frontier models reliably follow on the order of 150 to 200 instructions. A plugin SHOULD treat context as scarce; every instruction MUST earn its place.
3. **Progressive disclosure.** Detail MUST load on demand (references, scripts, assets), not up front.
4. **Agent-native.** Components MUST be written for an agent reader, not as human docs an agent happens to consume.
5. **Portable by default, advanced by choice.** A plugin MUST be usable at the Universal tier on any compliant agent, and MAY add agent-specific power at higher tiers.
6. **Self-evidence.** A plugin SHOULD be able to validate itself against this Standard in CI.
7. **A la carte adoption.** Any single component MUST be usable without adopting the rest of the plugin or the Standard. A skill dropped into an existing plugin works on its own; library conformance is something a plugin climbs toward, not a precondition for using one piece.

---

## 2. Conformance tiers

Tiers reflect a verified reality: Claude Code and Codex support the same *concepts* but in different *file formats*. The tier of a component is fixed by how portable its artifact is.

### 2.1 Tier 1 - Universal (Bronze)
Components whose **identical files** work across all agentskills.io-compliant agents.
- agentskills.io skills (`SKILL.md` + `references/`, `scripts/`, `assets/`)
- `AGENTS.md` project instructions
- MCP server definitions (the server is portable; only its registration location differs)

A Universal-tier plugin MUST:
- Contain only agentskills.io-compliant skills (see Section 3.1).
- Carry a minimal `library.json` (at least `name`, `version`, `tier`) - the manifest that makes it a plugin (Section 5).
- Carry an `AGENTS.md` at the repository root.
- Declare `compatibility` on skills that have environment requirements.
- Keep its authored markdown structurally valid where it carries diagrams: every fenced `mermaid` block MUST be structurally well-formed (a recognized diagram keyword, balanced brackets, no tabs), so it renders rather than showing a broken box (`U12`, `mermaid-valid`; conditional on the plugin carrying diagrams).

### 2.2 Tier 2 - Convergent (Silver)
Concepts both CC and CX support, but in **different formats**, so they MUST be emitted per agent target.
- Subagents, slash commands, plugin packaging, workflows, chain contracts.

A Convergent-tier plugin MUST, in addition to Tier 1:
- Declare its **agent targets** (`claude`, `codex`, or both) in the plugin manifest (`library.json`, Section 5).
- Provide each Convergent component in the correct format for every declared target (Section 3).
- Declare chain contracts for any skill or subagent that invokes another (Section 3.6) - a conditional MUST: required when chaining is used, not otherwise.

### 2.3 Tier 3 - Advanced (Gold)
Deep, lifecycle, and often agent-specific capability.
- Hooks (session lifecycle, tool-use guards), output styles, statusline, and full self-hosting CI.

Some Advanced capabilities exist on only one agent, which is exactly why they sit at the agent-specific tier: **output styles are Claude-only** (Codex has no equivalent), and the **statusline differs** (Claude uses a custom script; Codex configures a built-in picker via `config.toml` `tui.status_line`). A plugin claims these only for the agents that support them; their absence on an agent is not a conformance failure.

An Advanced-tier plugin MUST, in addition to Tier 2:
- Document every hook, its event, and its scope (Section 3.5).
- Provide CI that validates the plugin against this Standard (Section 4).
- Pass its own validation (self-hosting).

### 2.4 Declaring a tier
A skill declares its portability with the agentskills.io `compatibility` field. A plugin declares its overall tier and agent targets in its manifest (Section 5). Tooling MUST be able to verify a claimed tier and MUST report the highest tier a plugin actually satisfies.

**Report format.** Tooling MUST emit both a machine-readable and a human-readable form. The machine form names the tier achieved, the tiers satisfied, and - for the next tier up - the specific blocking requirements keyed to their requirement IDs (e.g., the `G1`-`G10` of Section 2.6):
```json
{ "tier": "silver",
  "satisfies": ["bronze", "silver"],
  "blocked": { "gold": ["G3: no eval cases for chain rs-synthesis"] } }
```
The human form is a one-line summary naming the tier and what blocks the next one, e.g. `Tier: Silver (Gold blocked: G3 eval coverage missing for 1 chain)`. The `blocked` list is the actionable payload: it is a to-do list to the next tier, not just a grade. (Formal tier badges are a later addition; v1 reports the tier, it does not brand it.)

### 2.5 Tier requirements (concrete)
| Dimension | Bronze (Universal) | Silver (Convergent) | Gold (Advanced) |
|---|---|---|---|
| Components allowed | agentskills.io skills + references/assets, AGENTS.md, MCP | + subagents, commands, workflows, plugin packaging, chain contracts | + hooks, output styles, self-hosting CI |
| Hard requirements | valid frontmatter; name=dir; description meets the 8.1 bar; references one level deep; AGENTS.md present; minimal `library.json` (name/version/tier); component `version` present | + declares `agent-targets`; emits each convergent component per target; chain contracts valid (no orphans/phantoms); manifest matches disk; semver | + hooks documented (event/scope/failure); CI validates the plugin against this Standard and passes; eval/regression coverage for chains and hooks; generated INDEX + manifest |
| Governance | samples optional | + two backlogs, per-component HISTORY, CHANGELOG | + RELEASE-NOTES, deprecation policy |
| Audience | beginner on-ramp | intermediate | advanced |
Higher tiers include all lower-tier requirements. A plugin at Gold is, by construction, a self-proving example of this Standard (an advanced skill library).

### 2.6 Gold (Advanced) requirements - frozen (v1 build target)
Because a Gold plugin is the self-proving reference for this Standard, every Gold requirement is a hard, testable build target rather than an aspiration. This subsection **freezes** the Gold criteria and draws the line between the **baseline v1 requires** and the **advanced elaboration the toolkit roadmap defers** - resolving the otherwise circular case where the prover and the proof criteria are defined in parallel. A plugin claiming Gold MUST satisfy every item below, and tooling MUST verify each.

| # | Requirement (MUST, in addition to Bronze + Silver) | Satisfied by | Deferred elaboration (NOT required at Gold) |
|---|---|---|---|
| G1 | **Hooks documented.** Every hook present documents its event, trigger, matcher (if applicable), scope, and failure behavior (3.5). | hook-documentation check | - |
| G2 | **Self-hosting CI that passes.** The plugin ships CI that runs the full tier-applicable check suite via the portable scripts (Section 4) and passes it. "Self-hosting" = the plugin passes its own validators. | CI green + self-hosting check | - |
| G3 | **Eval/regression coverage for chains and hooks (baseline).** Each chain contract and each hook has at least one eval/regression case; CI executes them; a regression check confirms that changing one component does not silently break a chained consumer or a hook. The bar is structural + behavioral *presence and execution*. | eval sets present + run in CI; chain-contract integrity check | the multi-tier eval **engine** (Static / LLM-Judge / Monte-Carlo). Baseline presence is required; the advanced judging system is roadmap. |
| G4 | **Generated INDEX + manifests.** `INDEX.md`, the native plugin manifests (`.claude-plugin/plugin.json`, Codex `plugin.json`), and `manifest.generated.json` are generated from the **authored** `library.json` + component frontmatter (`gen-index`, `gen-manifest`) and drift-checked; a hand-edited generated file is an `error`. (`library.json` itself is authored canonical, NOT a generated artifact - see Section 5; its `components` index MAY be synced from on-disk frontmatter and is drift-checked the same way.) | gen-index / gen-manifest + drift check | - |
| G5 | **RELEASE-NOTES.** The plugin maintains `RELEASE-NOTES.md` (curated, user-facing), distinct from `CHANGELOG.md` (10.6). | release-notes presence check | - |
| G6 | **Deprecation policy.** The plugin defines and follows a deprecation policy: `status: deprecated` + `deprecated-by` + `remove-in` handling (7.5), and tooling recognizes deprecated components. | frontmatter handling + deprecation check | a dedicated `deprecate` **automation skill**. The *policy and frontmatter handling* are required; *automating* them is roadmap. |
| G7 | **Docs frontmatter taxonomy.** Every published `docs/**` page (excluding `docs/internal/`) carries the Section 8.4 taxonomy: `title`, `description` (no colon-space), `audience`, `level`, and optional `tags` / `doc-role`. Conditional on a published docs tree. | docs-frontmatter check | - |
| G8 | **Folder-README inventory.** Every meaningful folder (the repo's source and component folders) carries a `README.md` with a frontmatter `title` and an inventory whose listed immediate children set-equal the folder's actual immediate children (ADR 0024 D1.1). Conditional on the allowlisted folder existing. | folder-readme check | - |
| G9 | **Source docblocks.** Every hand-authored `*.mjs` / `*.js` / `*.py` under the in-scope source roots carries a four-field header docblock (what it is / what it does / why / what uses it) in its first lines (ADR 0024 D1.2). Presence of the four fields, never prose quality. Conditional on in-scope source existing. | source-doc check | - |
| G10 | **Docs presence.** The four Diataxis quadrants (`docs/{tutorials,how-to,reference,explanation}`) are non-empty, every ADR (`docs/internal/decisions/NNNN-*.md`) carries a `## TL;DR`, and the `doc-role: architecture-overview` page resolvably links the `architecture-detailed` page (ADR 0024 D4 / sec 10.4). Conditional on a published docs tree. | docs-presence check | - |

**Tier inclusion** (a Gold plugin satisfies every Bronze and Silver requirement) is a structural property of the monotonic tiers, not a numbered check; it was carried as "G7" before v0.10 and is now an unnumbered statement, freeing `G7` for `docs-frontmatter`. The Gold checks are `G1-G10`; the spine is `U1-U9` + `U11-U12` + `S1-S8` + `G1-G10` = **29** (`U10` no-dashes retired in v0.11; see the version note at the top).

Conformance **badges/branding** are not a Gold requirement at v1: tooling reports the tier it verifies (2.4); it does not brand it. The toolkit targets Gold at v1 and MUST pass `G1-G10` against itself before release.

---

## 3. Component specifications

Each component spec gives: purpose, required structure, fields, per-agent format, validation rules, tier.

### 3.1 Skill (Universal)
- **Purpose:** package procedural knowledge an agent loads on demand.
- **Structure:** a directory whose name equals the skill `name`, containing `SKILL.md`; OPTIONAL `references/`, `scripts/`, `assets/`.
- **Frontmatter (agentskills.io):**
  - `name` (REQUIRED): 1-64 chars, lowercase `a-z`/`0-9`/`-`, no leading/trailing/consecutive hyphen, MUST equal parent directory name.
  - `description` (REQUIRED): 1-1024 chars; MUST state what the skill does AND when to use it, with trigger keywords.
  - `license` (OPTIONAL).
  - `compatibility` (OPTIONAL): 1-500 chars; environment/product requirements; used for tier declaration.
  - `metadata` (OPTIONAL): arbitrary string map; this Standard's conventional keys are defined in Section 3.7.
  - `allowed-tools` (OPTIONAL, experimental).
- **Validation rules:** frontmatter MUST validate; `SKILL.md` SHOULD be < 500 lines and instructions < ~5000 tokens; deep content MUST move to `references/` (one level deep).
- **Per-agent format:** identical across agents. Both Claude Code and Codex consume agentskills.io-compatible skills (Codex reads them from `.agents/skills/` in-repo and `$HOME/.agents/skills` globally), so the same `SKILL.md` runs on both unchanged - this is what anchors the Universal tier.

### 3.2 Slash command / invocation (Convergent)
- **Purpose:** give a skill an explicit, user-invocable entry point.
- **CC format:** `commands/<name>.md` with command frontmatter and `$ARGUMENTS`/named args.
- **CX format:** the Codex target is a **skill packaged inside a Codex plugin** (`.codex-plugin/plugin.json` plus the skill at `skills/<name>/SKILL.md` within the plugin), explicitly invocable. Standalone custom prompts (`~/.codex/prompts/*.md`) remain deprecated in favor of skills; tooling MAY emit the legacy prompt behind an explicit flag with a deprecation warning, but the default Codex target is a skill within a plugin.
- **Rules:** a command MUST map to exactly one skill or workflow; its description MUST match the skill's triggering intent. For multi-target plugins, a command MUST be emitted in each target's format (CC: `commands/<name>.md`; CX: the backing skill, explicitly invocable).
- **Parity note:** on Codex a "command" is realized as an explicitly-invocable skill, not a distinct command artifact. This is **functional parity, not identical UX** - the same intent is invocable on both agents, but Codex users invoke a skill rather than a `/command`. Tooling and docs MUST set this expectation rather than implying byte-for-byte command equivalence.

### 3.3 Subagent (Convergent)
- **Purpose:** a bounded delegate with its own tools and prompt.
- **CC format:** `agents/<name>.md` (markdown + frontmatter; auto-discovered, @-mentionable).
- **CX format:** Codex custom agents are declared in a `config.toml` `[agents.<name>]` table (`description`, `config_file`, optional `nickname_candidates`) with the role defined in a per-agent TOML (e.g., `agents/<name>.toml`). **As of Codex CLI v0.135 these are a USER/PROJECT `config.toml` concern, NOT a plugin-distributable component:** the Codex plugin manifest (`plugin.json`) has no `agents` field (its component pointers are `skills`/`hooks`/`mcpServers`/`apps`), and `[agents.*].config_file` resolves relative to the `config.toml` that defines it, with no plugin-to-config merge path. A distributed plugin therefore CANNOT ship Codex-ingested subagents; subagents are effectively a Claude-only component for plugin distribution until Codex adds an `agents` manifest field. Built-in Codex roles include default/worker/explorer.
- **Rules:** a subagent MUST declare its purpose and the narrowest tool set it needs. A subagent that may be invoked by skills MUST appear in a chain contract (3.6). A subagent declares its target agents via `agent-targets` (3.7); because Codex does not ingest plugin-shipped subagents (above), a subagent distributed in a plugin targets Claude (`agent-targets: [claude]`). The "emit both formats" rule applies to components Codex CAN ingest as a plugin (skills, hooks, MCP); it does NOT apply to subagents under the current Codex plugin model.

### 3.4 Workflow (Convergent)
- **Purpose:** an ordered arc chaining multiple skills toward an outcome.
- **Format:** `_workflows/<name>.md` defining ordered steps, the skill invoked at each step, inputs/outputs handed between steps, and exit criteria.
- **Rules:** every skill referenced MUST exist; every chaining step MUST be permitted by a chain contract (3.6); a workflow SHOULD declare which agent targets it supports.

### 3.5 Hook (Advanced)
- **Purpose:** event-driven enforcement or context injection.
- **CC:** 31 events (session lifecycle, tool loop, subagents, file/config, notifications). Registered in `settings.json`, plugin `hooks/hooks.json` (using `${CLAUDE_PLUGIN_ROOT}`), or component frontmatter. Types: `command`, `http`, `mcp_tool`, `prompt`, `agent`.
- **CX:** a smaller event set (PreToolUse, PostToolUse, Pre/PostCompact, SessionStart, SubagentStart/Stop, UserPromptSubmit, Stop, PermissionRequest).
- **Rules:** each hook MUST document its event, trigger, scope, and failure behavior. A blocking hook (e.g., PreToolUse deny) MUST emit an actionable message. Hooks MUST be idempotent where the event can repeat.

### 3.6 Chain contract (Convergent)
- **Purpose:** make safe inter-component invocation explicit rather than implicit.
- **Format:** an `agents/_chain-permitted.yaml` declaring, per skill/subagent, which other components it MAY invoke; and an OPTIONAL `agents/_pairing.yaml` declaring recommended skill+subagent pairings.
- **Rules:** chain contracts are a **conditional MUST** - required if and only if chaining is used. Any component that invokes another MUST be listed in a chain contract; a plugin that contains **no** inter-component invocation is NOT required to ship a `_chain-permitted.yaml` (no empty governance files for plugins that do not chain). Tooling MUST flag invocations not covered by a contract (orphans) and contract entries pointing at missing components (phantoms). This conditional rule is what makes the contract a safety mechanism rather than ceremony: it binds exactly when there is an invocation to make safe.

### 3.7 Conventional `metadata` keys
Within the agentskills.io arbitrary `metadata` map, this Standard defines these keys. `version` is REQUIRED on every component at every tier. A `HISTORY.md` is RECOMMENDED at Bronze and REQUIRED at Silver+ (Section 2.5); **when a `HISTORY.md` is present, `version` MUST equal its latest entry** (tooling enforces agreement when present). The rest are RECOMMENDED for governance:
- `version` (string, semver), `updated` (date), `tier` (`universal`|`convergent`|`advanced`), `audience` (`beginner`|`intermediate`|`advanced`), `category` (string), `agent-targets` (list), `status` (`active`|`deprecated`|`experimental`), `deprecated-by` (component name, when status is deprecated), `remove-in` (target plugin version).

### 3.8 Frontmatter contract (all component types)
Only skills are governed by agentskills.io frontmatter (3.1). This Standard extends a consistent frontmatter contract to every other component type so tooling can validate them uniformly.
- **Common to all components:** `name` (kebab-case, matches file/dir), `description` (what + when + trigger keywords; see Section 8.1), plus applicable Section 3.7 metadata keys.
- **Command:** `args` (declared arguments), `maps-to` (the skill or workflow it invokes).
- **Subagent:** `tools` (narrowest set; see Section 9), `model` (OPTIONAL), `chain` (components it may invoke; see 3.6).
- **Hook:** `event`, `matcher` (when applicable), `type` (`command`|`http`|`mcp_tool`|`prompt`|`agent`), `on-failure` (block behavior).
- **Workflow:** `steps` (ordered skill references), `agent-targets`, `exit-criteria`.
- **Rules:** frontmatter MUST be valid YAML; required keys MUST be present; `description` MUST satisfy the discoverability bar (8.1).

### 3.9 MCP server (Universal)
- **Purpose:** connect the plugin to external tools, data, or prompts via the Model Context Protocol. The server definition is portable; only its registration location differs per agent.
- **Structure:** a server entry declaring `name`, `transport` (`stdio` | `http`), the `command`/`args` (or URL) that launches/reaches it, optional `env`, and the `tools`/`resources`/`prompts` it exposes.
- **Per-agent format:** the server definition is the same; **registration differs in mechanism, not location.** A distributed plugin registers MCP via a bundled `.mcp.json` at the plugin root (the standard portable `{ "mcpServers": { ... } }` format, holding all of the plugin's servers) that each native manifest references through its `mcpServers` pointer. This is the path for both Claude and Codex. The user-level `config.toml` `mcp_servers` table is a separate, non-plugin path (managed by `codex mcp add|list`) and is NOT how a distributed plugin registers its servers. Multi-target plugins MUST emit the `mcpServers` pointer for each declared target.
- **Validation rules:** the server entry MUST be present and well-formed; secrets MUST NOT be committed (use `env` indirection, Section 9); a referenced `command` SHOULD be resolvable.
- **Tier:** Universal (the server is portable; only registration location varies).

### 3.10 AGENTS.md (Universal)
- **Purpose:** the project-level agent instructions + navigation entrypoint - the first thing an agent reads.
- **Structure:** `AGENTS.md` at the repository root (OPTIONAL nested `AGENTS.md` for directory-specific overrides); markdown.
- **Content:** conventions, build/test/lint commands, review expectations, and a pointer into the plugin's components (it is the agent-facing counterpart to the human `INDEX.md`).
- **Per-agent format:** identical - both Claude Code and Codex read root `AGENTS.md`.
- **Validation rules:** REQUIRED at the repository root at every tier; internal links MUST resolve; its component/count references MUST stay in sync with the manifest and on-disk components (drift is an `error`, Section 10.3).
- **Tier:** Universal.

---

## 4. CI and release expectations

### 4.1 CI-agnostic runner
All checks MUST be implemented as portable scripts (single runtime) runnable locally, in any CI, or invoked by a skill. The runner targets **Node, baseline Node >= 22.12.0**; the recommended pinned runtime is **Node 24** (Active LTS), declared via a committed `.nvmrc` / `.node-version`, and CI SHOULD run on that pinned version. A validator/generator has no need for bleeding-edge APIs, but the baseline MUST NOT recommend an end-of-life runtime: Node 20 reached EOL on 2026-04-30 and is below the `>=22.12.0` floor that Astro 6 (the basis of every family documentation site) requires. A co-located plugin core's runtime floor follows this clause, not its documentation site (ADR 0025). A CI configuration (e.g., GitHub Actions) MUST only shell out to those scripts; the plugin MUST NOT depend on a specific CI provider for correctness.

### 4.2 Required checks (by tier)
- **Universal:** frontmatter validity; `name`/directory match; description quality; instruction-budget warning; reference-link validity; mermaid-block validity (`U12`).
- **Convergent (adds):** per-target format presence for every Convergent component; chain-contract integrity (no orphans/phantoms); workflow skill-existence.
- **Advanced (adds):** hook documentation completeness; self-hosting check (the plugin passes its own validators); count/cross-reference consistency across README/AGENTS.md/manifest; docs frontmatter taxonomy (`G7`); folder-README inventory (`G8`); source-docblock presence (`G9`); docs presence - Diataxis non-empty, ADR TL;DRs, architecture overview-to-detailed link (`G10`).

### 4.3 Release gates
A release SHOULD pass an aggregate gate (all tier-applicable checks) before tagging. Versioning MUST be semver. A changelog SHOULD describe what changed, in user-facing terms.

### 4.4 Local / CI parity
Every check MUST produce identical results run locally or in CI. The CI configuration MUST contain no validation logic of its own; it MUST only invoke the portable scripts. This guarantees a contributor can reproduce any CI failure locally with the same command.

### 4.5 Check results and severity
Checks MUST emit machine-readable results with a severity of `error` or `warn`. The aggregate gate MUST fail on any `error` and MUST NOT fail on `warn` alone (warnings are surfaced, not blocking). Each finding SHOULD name the offending file and the remediation.

---

## 5. Plugin manifest (`library.json`)

**Every conformant plugin, at any tier, MUST carry a `library.json`** with at least `name`, `version`, and `tier` - this is the artifact that makes a directory a *plugin* (a release unit with a version), per Section 0. A bare folder of agentskills.io skills without a `library.json` is **loose components**, not a Bronze plugin; the individual skills remain usable a la carte (Principle 7), but the collection only becomes a conformant plugin once it carries the manifest.

At **Convergent tier and above** the manifest MUST additionally declare:
- `agent-targets`, the component name `prefix` (Section 8.2), and a component index (skills, commands, subagents, workflows, hooks).

`library.json` is the **single source of truth** for the plugin's cross-agent metadata. (The filename follows the `package.json` precedent: a manifest is named for what it *describes* - the plugin's library-conformance metadata - not for an artifact it creates.) The agent-native manifests - Claude's `.claude-plugin/plugin.json` and Codex's `plugin.json` - MUST be **generated from `library.json`**, not hand-maintained in parallel, so the same facts are never duplicated across schemas this Standard does not own (consistent with the single-source-of-truth rule in Section 10.3). All manifests MUST be consistent with what is actually present on disk and with each other (tooling enforces this).

### 5.1 `library.json` field schema
| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | REQUIRED | kebab-case; equals the plugin directory name. |
| `version` | string (semver) | REQUIRED | The single plugin version (Section 7.4); the manifest's version is authoritative. |
| `description` | string | REQUIRED | What the plugin is and when to use it; meets the 8.1 bar. |
| `standard` | string | REQUIRED | The version of THIS Standard the plugin targets (e.g. `"0.11"`, the current version), so tooling can validate against the right ruleset. The gate honors this pin per sec 7.7: a requirement introduced after the pinned version is surfaced as a `warn`, never a gate-failing `error`, until the plugin re-pins. |
| `tier` | `"universal"` \| `"convergent"` \| `"advanced"` | REQUIRED | The declared target tier; tooling verifies the tier actually satisfied (Section 2.4) and MUST flag a claim above what is met. |
| `agent-targets` | array of `"claude"` \| `"codex"` | REQUIRED at Convergent+ | Agents this plugin emits for. Omitted at Universal (skills are agent-agnostic). |
| `prefix` | string | REQUIRED at Convergent+ | The multi-agent component name prefix (Section 8.2). |
| `components` | object | REQUIRED at Convergent+ | Component index, keyed by type (`skills`, `commands`, `subagents`, `hooks`, `workflows`, `chain-contracts`, `mcp`); each value an array of component entries (below). |
| `engines` | object | OPTIONAL | Runner constraints, e.g. `{ "node": ">=20" }` (Section 4.1). |
| `license` | string (SPDX id) | OPTIONAL | - |
| `repository` | string (URL) | OPTIONAL | Source location; used by marketplaces, never embedded as one (Section 12). |
| `homepage` | string (URL) | OPTIONAL | - |

A **component entry** (within `components.<type>[]`):
| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | REQUIRED | Unique within the plugin; carries the `prefix`. |
| `path` | string | REQUIRED | Repo-relative path to the component. |
| `version` | string (semver) | REQUIRED | Matches the component's frontmatter `version` and `HISTORY.md` (Section 7.3). |
| `tier` | tier enum | REQUIRED | The component's own tier. |
| `status` | `"active"` \| `"deprecated"` \| `"experimental"` | REQUIRED | Mirrors frontmatter (Section 3.7). |
| `agent-targets` | array | OPTIONAL | Per-component override of the plugin default (e.g. a Claude-only `output-style`). |

`library.json` MUST NOT contain a marketplace listing (Section 12). Tooling MUST validate `library.json` against this schema, and MUST flag any component entry whose `path`, `version`, or `status` disagrees with the component on disk.

---

## 6. agentskills.io conformance mapping

This Standard is a strict superset of the agentskills.io specification at the Universal tier:
- Every Universal-tier skill is, by definition, an agentskills.io-compliant skill and MUST pass `skills-ref`-equivalent validation.
- The Convergent and Advanced tiers add structure (subagents, workflows, hooks, chain contracts, CI) that agentskills.io does not specify, without violating it.
- Where agentskills.io evolves, the Universal tier MUST track it; higher tiers remain this Standard's domain.

---

## 7. Component lifecycle and governance

A plugin is not a snapshot; it evolves. This section governs that evolution. (The whole plugin is our unit of governance; this is the heart of the wedge.)

### 7.1 Intake and backlog
A plugin SHOULD maintain two distinct backlogs, stored as **structured markdown in-repo** under `docs/internal/backlog/` (one file for new-component proposals and one for enhancements). Local-first and version-controlled; no external tracker dependency.
- **New-component backlog:** proposals to add a skill, command, subagent, hook, workflow, etc. Each item MUST record: proposed `name`, component type, target `tier`, `agent-targets`, rationale, and status.
- **Enhancement backlog:** features, fixes, and refinements to *existing* components. Each item MUST reference the target component and describe the change.

A new-component proposal SHOULD pass a "why gate" before entering the backlog: it MUST justify why it is warranted and confirm it does not duplicate an existing component.

### 7.2 Samples and examples
Each skill SHOULD ship representative samples (RECOMMENDED: at least 3 golden examples plus at least 1 anti-example) showing realistic inputs and outputs. The anti-example demonstrates a case the skill should NOT handle (teaching when not to fire). The count is a SHOULD, not a MUST - a trivial skill is not blocked from conformance over example count - but any sample that IS present MUST remain consistent with the current skill behavior and MUST be validated in CI (a drifted sample is an `error`). Samples are part of the best-in-class quality bar, not optional decoration.

### 7.3 Per-component history
Each component MUST carry its current `version` (semver) in frontmatter (`metadata.version`) at every tier, and MUST maintain dated change notes in a **co-located history file** (`HISTORY.md` beside the component) **at Silver and above** (RECOMMENDED at Bronze). The frontmatter version is the machine-readable pointer; the history file is the human-readable record. When both exist, the frontmatter version MUST equal the latest `HISTORY.md` entry (Section 3.7). The plugin-level CHANGELOG aggregates component histories; the frontmatter version, history file, and CHANGELOG MUST NOT contradict each other (tooling enforces this).

### 7.4 Versioning policy
Components and the plugin MUST use semver. There is exactly one plugin version, carried in the plugin manifest (`library.json`); a component's version is local to that component.

**Propagation (deterministic, MUST).** The plugin's version bump for a release MUST equal the **largest component bump since the last release**, mapped one-to-one:
- any component MAJOR (breaking its interface or breaking a chain contract) -> plugin MAJOR;
- otherwise any component MINOR -> plugin MINOR;
- otherwise (PATCH-only changes) -> plugin PATCH.

This is a MUST, not a SHOULD, so tooling can *compute* the correct plugin version from component histories and verify the release version rather than merely suggesting it. (The previous SHOULD left the bump unverifiable - the change to a deterministic `max()` is what makes versioning a CI-gateable check, which a self-hosting plugin requires.)

### 7.5 Deprecation and retirement
A component MAY be marked `status: deprecated` with `deprecated-by` (its replacement) and `remove-in` (the target plugin version for removal). Deprecated components MUST still validate and function until removed. Removal MUST be a plugin MAJOR and MUST be announced in the CHANGELOG.

### 7.6 Contribution
A plugin SHOULD document how proposals enter the backlog, the gates they pass, and who decides. This keeps "best-in-class" reproducible by contributors, not just the original author.

### 7.7 Standard versioning and compatibility
This section governs how the Standard ITSELF evolves, distinct from sec 7.4, which governs a plugin's own version.

**Versioning.** The Standard is versioned `MAJOR.MINOR`. Adding a new tier requirement (a new `U#`/`S#`/`G#`) or tightening an existing one (a stricter rule, or a `warn` promoted to `error`) is an additive change that bumps the MINOR. Removing or relaxing a requirement is also a MINOR (the always-safe direction). A breaking redefinition of an existing requirement is reserved for a MAJOR.

**Burndown (warn-then-error, MUST for tightenings).** A newly introduced or tightened tier requirement SHOULD ship as a `warn` for the one Standard MINOR that introduces it, then become a gate-failing `error` in the next MINOR. This gives a downstream library a one-version migration window before a tightening can fail its build. A requirement MAY instead be introduced directly as an `error` only in a MAJOR bump.

**Pinned-version grading (MUST).** Every check declares the Standard version it was introduced at (its `since`). Tooling MUST read `library.json.standard` and grade a plugin against the requirement set of the version it pins: a requirement introduced AFTER the pinned version is reported as a `warn` (surfaced, never gate-failing) for that run, not an `error`. A plugin opts into newer requirements by raising its pinned `standard`. This keeps the sec 5.1 promise that `standard` lets "tooling validate against the right ruleset."

**Relaxations are always safe.** Removing a requirement cannot make a previously passing plugin newly fail, so a relaxation ships as a MINOR with no burndown (the v0.11 retirement of the no-dashes rule, ADR 0028, is the precedent).

**Determinism.** This policy is enforced by pure version comparison (a `MAJOR.MINOR` ordering where a pre-policy baseline sentinel sorts below every real version), so the gate that applies it stays synchronous and model-free.

**Consumer-side configuration (non-normative for conformance).** A grader MAY accept consumer-side configuration (a local `askit.config.json` that selects a named profile, sets per-rule severities, and lists a suppressions baseline) to scope HOW it grades. This configuration is the grader's local preference, NOT part of the plugin contract: a plugin is conformant or not independent of how any grader is configured. A PUBLISHED conformance verdict MUST NOT let a graded subject disable an objective or vendor-cited finding to dodge it (a published-verdict mode clamps such an override to at least a `warn`, surfaced with a notice). This profile and suppression mechanism is also the opt-in home for house preferences a tier requirement should not impose (the home ADR 0028 named for the retired no-dashes rule).

---

## 8. Quality and discoverability

### 8.1 Description and triggering bar
A component's `description` is its primary discovery signal; the agent decides relevance from it alone. A description MUST state what the component does AND when to use it, and SHOULD include specific trigger keywords. Anti-patterns (e.g., "Helps with X") MUST be avoided.

Tooling SHOULD score descriptions against this rubric, producing a 0-1 score and emitting a `warn` (never an `error`) below **0.7** - description quality is judgment, so a heuristic score must not hard-gate:
- **States what** the component does (action/output) - required signal.
- **States when** to use it / the trigger condition - required signal.
- **Concrete trigger keywords** present (words a user would actually say) - weighted.
- **Third-person** phrasing (not "I"/"you") - check.
- **No anti-patterns** (vague verbs like "helps with", "handles") - penalty.
- **No angle brackets, no ALL-CAPS**; within 1024 chars and not trivially short - check.

### 8.2 Naming and taxonomy
Beyond the agentskills.io `name` rules, a plugin SHOULD adopt consistent, documented naming: kebab-case, optional family/phase prefixes (e.g., `verb-noun`), and bundle naming. Names MUST be unique within the plugin. Tooling MUST flag collisions and SHOULD flag taxonomy drift.

**Multi-agent namespace prefix.** Generic names (`init`, `skill`, `plugin`, `subagent`) collide across plugins. Claude Code namespaces plugin skills automatically (`plugin-name:skill`), but Codex and the wider ecosystem do not all do so. Therefore an advanced multi-agent plugin SHOULD carry a **short, unique name prefix** on every component (e.g., `<prefix>-init`), so names disambiguate on every agent, not only where plugin namespacing exists. The prefix is declared once in the plugin manifest (`library.json`).

### 8.3 Testing and eval coverage (by tier)
- **Universal:** SHOULD provide samples (7.2), and SHOULD provide a **triggering eval set of >= 20 `{query, should_trigger}` cases** per skill that verify the description fires when it should and stays silent when it should not.
- **Convergent:** SHOULD provide eval prompts exercising chained behavior across components.
- **Advanced:** MUST provide regression coverage for chains and hooks (does changing one component break another?).

---

### 8.4 Documentation frontmatter taxonomy
Every published documentation page under `docs/**` (excluding `docs/internal/`, which is committed maintainer governance and never published) MUST carry a YAML frontmatter block with: `title` (non-empty string); `description` (a non-empty string following the 8.1 shape, with no colon-space); `audience` (one of `non-engineer`, `engineer`, `both`); `level` (one of `beginner`, `intermediate`, `advanced`); and the OPTIONAL `tags` (array of strings) and `doc-role` (a path-independent structural marker, e.g. `architecture-overview` / `architecture-detailed`). The `docs-frontmatter` check (G7) enforces this and is conditional on a published `docs/` tree (a plugin with none passes vacuously). The taxonomy makes the docs tree audience-aware and lets the documentation site generate each page.

## 9. Security and least privilege

- A component MUST request the narrowest tool set it needs. Subagents and hooks MUST document why each granted capability is required.
- A hook that can block (e.g., a PreToolUse deny) MUST fail safe and MUST emit an actionable message.
- Permissions and settings SHOULD follow least privilege.
- Secrets MUST NOT appear in frontmatter, samples, or committed files; hooks needing credentials MUST use environment indirection.

---

## 10. Plugin anatomy and internal structure

### 10.1 Repository layout
A conformant plugin SHOULD follow this layout (components present per declared tier):
```
<plugin>/
  library.json                   canonical cross-agent manifest (authored SoT)  [agent]
  .claude-plugin/plugin.json     Claude manifest (generated from library.json)  [agent]
  .codex-plugin/plugin.json      Codex native manifest (generated from library.json)  [agent]
  .mcp.json                      portable MCP server definitions (all servers in one file), referenced by each native manifest's mcpServers pointer (3.9). NOTE: Codex subagents ([agents.*]) are NOT plugin-shipped (3.3) - they are user/project config.toml only.  [agent]
  AGENTS.md                      agent navigation entrypoint           [agent]
  INDEX.md                       human map of all skills               [human]
  README.md                      overview / pitch                      [human]
  CHANGELOG.md                   full release history                  [both]
  RELEASE-NOTES.md               curated user-facing highlights        [human]
  manifest.generated.json        structured skill index (CI-built)     [agent]
  STANDARD.md                    Standard + tier targeted
  skills/<skill>/                per-skill layout (10.2)
  agents/ commands/ hooks/ _workflows/   components per tier (subagents/commands/hooks/workflows)
  agents/_chain-permitted.yaml   chain contract (3.6), when chaining is used
  templates/                     global templates (SKILL.md, ADR, eval-set)
  docs/
    internal/                    committed maintainer governance       [maintainer]
      decisions/                 ADRs (MADR)
      rfcs/                      cross-cutting proposals
      backlog/                   new + enhancement backlogs (local-first)
    {tutorials,how-to,reference,explanation}/   Diataxis public docs  [human]
  scripts/ (or tools/)           CI-agnostic validators/generators
  .github/workflows/ci.yml       invokes scripts only
  _LOCAL/                        working scratch (gitignored)          [both]
```

### 10.2 Per-component layout
Every component follows the same sub-structure (shown for a skill; adapted per type):
```
skills/<skill>/
  SKILL.md       agent-canonical instructions + frontmatter   [agent]
  HISTORY.md     version + change notes (matches frontmatter) [both]
  README.md      OPTIONAL human overview                       [human]
  references/    lazy-loaded knowledge (agentskills)           [agent]
  examples/      >= 3 golden/ + anti/ samples                  [both]
  output/        output contract (11) + sample outputs         [both]
  evals/         trigger + behavior eval sets (advanced tier)  [agent]
  assets/        templates, schemas, data (agentskills)
  decisions/     OPTIONAL per-component ADRs
```
**Two forms per component type.** Non-skill components MAY use a *simple* single-file form (`agents/<name>.md`, `commands/<name>.md`, `hooks/hooks.json`) for trivial cases, or a *rich co-located directory* (`agents/<name>/` containing the definition plus its own `HISTORY.md`, `examples/`, `evals/`). The rich form is RECOMMENDED at Gold so every component carries its own history, examples, and evals.

### 10.3 Dual representation: agent-facing vs human-facing (single source of truth)
Every level of the plugin has an **agent view** and a **human view**, and structured facts MUST live in exactly one canonical place; the other view is generated from or linked to it, never duplicated.

| Level | Agent view (canonical) | Human view (generated / linked) |
|---|---|---|
| Plugin | `library.json` (manifest SoT), `AGENTS.md`, frontmatter; `manifest.generated.json` + native plugin manifests are generated | `INDEX.md`, `docs/`, `README.md` |
| Component | `SKILL.md` / `<component>.md` + frontmatter | `README.md`, rendered `examples/` |

This realizes dual-layer navigability: both a human and an agent can traverse the plugin without the two views drifting. Tooling MUST flag drift (e.g., an `INDEX.md` entry whose description no longer matches the skill's frontmatter).

### 10.4 Internal and working documentation
Two independent axes govern documents: **committed vs gitignored** (does it persist in version control?) and **internal-audience vs public-audience** (who is it for?). These are not the same; ADRs are internal-audience but MUST be committed.
- **Committed, maintainer-facing governance:** grouped under **`docs/internal/`** - `decisions/` (ADRs in MADR format, numbered, immutable once accepted), `rfcs/` (cross-cutting proposals), and `backlog/` (new + enhancement, local-first). Maintainer-audience but committed - transparency means committing the durable decision record.
- **Public docs:** `docs/{tutorials,how-to,reference,explanation}/` (Diataxis).
- **Gitignored, ephemeral working scratch:** design drafts, session logs, agent-context material live in a gitignored **`_LOCAL/`** directory (the portfolio convention) and MUST NOT pollute the entry surface.
- **Promotion flow:** scratch in `_LOCAL/` -> accepted decision -> committed ADR in `docs/internal/decisions/`. The gitignored area holds only what has not (yet) earned a durable home.

### 10.5 Templates
A plugin SHOULD provide a `templates/` directory holding global templates (SKILL.md skeleton, ADR template, eval-set template, etc.) that scaffolders consume, so generated components are consistent by construction.

### 10.6 Release notes vs changelog
`CHANGELOG.md` is the full technical history (Keep a Changelog style). `RELEASE-NOTES.md` is curated, user-facing highlights per release. They are distinct artifacts and MUST NOT be conflated.

### 10.7 Onboarding
A plugin SHOULD provide an onboarding entrypoint (an `init`/onboarding skill) that interviews a new user (target agent, tier, domain, first components) and scaffolds a starting point. This is RECOMMENDED, not required.

---

## 11. Output contracts

Skills that generate artifacts SHOULD declare an **output contract** - a co-located declaration (an `output/output-contract.md`, or an `output:` block in the skill's frontmatter) specifying:
- `format`: `md` | `json` | `yaml` | ...
- `frontmatter`: required keys on the produced artifact
- `structure`: required sections + order (for markdown) or a JSON schema (for json)
- `naming`: output filename pattern
- `location`: where the output is written

Sample outputs live in `output/` (or `examples/`). For component-producing skills (the meta case), the output contract IS the relevant component spec in Section 3, so the plugin produces exactly what it specifies. Tooling SHOULD validate generated outputs against their declared contract.

---

## 12. Distribution and marketplaces

A **marketplace** is a catalog that lists plugins for discovery and install. It is a **separate concern from any plugin**.

- A plugin MUST NOT embed a marketplace that lists itself. Coupling distribution into the artifact forces a painful later decoupling (a real, observed failure mode).
- A marketplace SHOULD be its own repository (or a workspace-level catalog) that lists many plugins by source/version.
- Versioning: when both a marketplace entry and a plugin manifest declare a version, the plugin manifest wins; an omitted version may fall back to the git commit SHA for git sources.
- A plugin SHOULD be registered in a marketplace at its first tagged release, not before.

**Concrete marketplace formats.**
- **Claude Code:** `.claude-plugin/marketplace.json` at the marketplace repository root catalogs plugins by source/version.
- **Codex (v0.133+):** `.agents/plugins/marketplace.json` at the marketplace repository root. Example schema:
  ```json
  {
    "name": "<marketplace-id>",
    "interface": { "displayName": "<Display Name>" },
    "plugins": [
      { "name": "<plugin>",
        "source": { "source": "local" | "git", "path": "./plugins/<plugin>" },
        "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
        "category": "<Engineering|Productivity|Research|...>" }
    ]
  }
  ```
  Codex installs via `codex plugin marketplace add <name> <local-path|git-url>` then `codex plugin add <plugin>@<marketplace>`.

The separation rule applies to BOTH formats: a plugin MUST NOT embed a marketplace that lists itself, regardless of which agent's marketplace format is used.

**Anti-pattern (named):** a plugin repository that also serves as its own marketplace. Tooling MUST warn when it detects a plugin embedding a self-listing marketplace, and SHOULD offer a decoupling path.

---

## Appendix A: Open items for this draft
- RESOLVED (2026-05-25): Gold (Advanced) requirement set frozen as G1-G7 in Section 2.6 (later expanded to G1-G10 at Standard v0.10, ADR 0024), with the required-baseline-vs-deferred-elaboration line drawn (eval engine, `deprecate` skill, and badges are deferred; their baselines are required). Resolves the prover-vs-proof circularity (design D2a). Remaining build-time work is implementing the checks, not deciding the criteria.
- RESOLVED (2026-05-25, per OpenAI Codex docs): Codex custom prompts are **deprecated in favor of skills**, so the command spec's Codex target is a **skill with explicit invocation** (3.2), not the legacy prompt. Codex has **no output-style** feature, so `build-output-style` is **Claude-only**. Codex skills are agentskills.io-compatible (repo `.agents/skills/`, user `$HOME/.agents/skills`); subagents declared in `config.toml` `[agents.*]` + per-role `.toml` (3.3). No emitter remains gated.
- BUILD-TIME CONFIRM (small residual): the canonical Codex emission *contract* is fixed (skills, `config.toml [agents.*]` + `agents/*.toml`, native `plugin.json`), but the exact on-disk layout a *distributed Codex plugin* uses to surface its bundled skills to `.agents/skills` discovery should be verified against current Codex plugin-packaging docs when the emitter is built. Does not block the design; affects only generator file placement.
- RESOLVED (2026-05-25): chain contracts are a **conditional MUST** - required if and only if chaining is used (Section 3.6); a plugin with no inter-component invocation ships none. Chosen over a blanket Convergent MUST to avoid empty governance files and honor a la carte minimalism.
- RESOLVED (2026-05-25): manifest model = canonical `library.json` (cross-agent SoT) + native manifests generated from it (Section 5); field schema pinned in Section 5.1 (top-level fields + component-entry shape).
- RESOLVED (2026-05-25): tier-reporting format pinned (Section 2.4) - machine (JSON) + human one-liner, with a `blocked` list keyed to the requirement IDs. Conformance **badges/branding** remain deferred (v1 reports the tier, does not brand it).
- RESOLVED (2026-05-25): Node baseline = Node >= 20 (LTS); CI also exercises current Active LTS (Section 4.1). SUPERSEDED (2026-06-01, ADR 0025, Standard v0.9): baseline raised to Node >= 22.12.0, recommended pin Node 24 (Node 20 EOL plus the Astro 6 floor).
- RESOLVED (2026-05-25): sample count = SHOULD >= 3 golden + >= 1 anti-example (Section 7.2).
- RESOLVED (2026-05-25): version-propagation pinned (Section 7.4) - one plugin version; plugin bump = the largest component bump since last release (MAJOR>MINOR>PATCH), as a MUST so tooling can compute and verify it.
- RESOLVED (2026-05-25): description-scoring rubric pinned with a 0.7 warn threshold (Section 8.1).
- RESOLVED (2026-05-24): per-component history = frontmatter `version` + co-located `HISTORY.md` (Section 7.3).
- RESOLVED (2026-05-25): backlog = structured markdown in-repo under `docs/internal/backlog/` (Sections 7.1 + 10.1).
- RESOLVED (2026-05-27, via spike): Codex CLI v0.133 ships a native plugin + marketplace system. A Codex plugin is a directory with `.codex-plugin/plugin.json` (native manifest, parallel to Claude's `.claude-plugin/plugin.json`) plus `skills/<name>/SKILL.md` within it. A Codex marketplace is `.agents/plugins/marketplace.json` (`{name, interface.displayName, plugins:[{name, source:{source,path}, policy, category}]}`). Round-trip locally testable via `codex plugin marketplace add --local <path>` + `codex plugin add <plugin>@<mp>`. F-04 closed. Build-time confirm remaining: exact distribution semantics for subagent + MCP `config.toml` augmentation when a plugin is loaded - to be verified by the 3B emitter against current Codex docs.
