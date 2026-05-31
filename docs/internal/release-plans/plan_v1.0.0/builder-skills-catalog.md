# Build-the-Builder: Functional Areas and Builder-Skill Catalog

> **SECONDARY (active reference, not canonical).** Companion to the canonical [`agent-skills-toolkit-DESIGN.md`](./agent-skills-toolkit-DESIGN.md) (v0.6) and [`STANDARD.draft.md`](./STANDARD.draft.md) (v0.5). Index: [`./README.md`](./README.md).
> Working draft v0.2 (2026-05-24). Purpose: the **full roadmap inventory** (~60 candidate builder skills across all areas). The **v1 subset** and final naming are defined in the DESIGN doc - the verb taxonomy (`init-<container>`, `build-<component>`), `evaluate` (generic assessor), `improve` as a `build-<type>` mode. Some catalog entries below use older names; the DESIGN doc is canonical for v1.
> **Terminology note:** the canonical docs use a strict two-axis model - "plugin" = the artifact / unit of release (holds the one version); "skill library" = the quality grade a plugin earns (Bronze/Silver/Gold), not a separate artifact. Where this catalog says "library" structurally, read "plugin"; the "Library" functional area = whole-plugin governance builders.

---

## How to read this catalog

- **Builder family lens.** Most components support a builder *family*: **brainstorm** (decide if and what), **create** (scaffold), **validate** (check), **improve/eval** (iterate). Not every area needs all four.
- **Meta note.** Every builder skill below is itself an agentskills.io-compliant `SKILL.md`, so each builder runs on Claude Code, Codex, and the wider ecosystem. The tag columns describe the **artifact the builder produces**, not the builder.

### Legend
- **Audience:** `B` beginner-friendly | `A` advanced | `B/A` spans both.
- **agentskills.io:** does the spec define the produced artifact? `Yes` | `No` | `Part` (partial/related standard).
- **Compatibility of the produced artifact:** `CC` Claude Code, `CX` Codex CLI, `ECO` other agentskills.io agents. Values: `Y` native | `~` supported via different format/subset | `N` not supported.

---

## Master summary (artifact compatibility at a glance)

| # | Functional area | Artifact | agentskills.io | CC | CX | ECO |
|---|---|---|---|---|---|---|
| 0 | Library (whole) | repo of components | No (superset) | Y | Y | ~ |
| 1 | Marketplace | marketplace index | No | Y | Y | ~ |
| 2 | Plugin | plugin bundle + manifest | No | Y | Y | ~ |
| 3 | Skill | SKILL.md (+references) | **Yes** | Y | Y | Y |
| 4 | Command / invocation | slash command / prompt | No | Y | ~ | ~ |
| 5 | Subagent | delegate definition | No | Y | Y | ~ |
| 6 | Hook | event-driven script + registration | No | Y | ~ | N |
| 7 | Workflow | chained multi-skill arc | No (convention) | ~ | ~ | ~ |
| 8 | Chain contract | permitted-chaining manifest | No (our convention) | ~ | ~ | ~ |
| 9 | MCP server | MCP tools/resources | Part (separate std) | Y | Y | Y |
| 10 | Instructions | AGENTS.md / CLAUDE.md | No (convention) | Y | Y | Y |
| 11 | References / assets | progressive-disclosure files | **Yes** | Y | Y | Y |
| 12 | Output style | response-mode definition | No | Y | N | N |
| 13 | Statusline | status line script | No | Y | N | N |
| 14 | Settings / permissions | settings + permission config | No | Y | ~ | ~ |
| 15 | Docs | README / CHANGELOG / site | No | Y | Y | Y |
| 16 | CI / validation / release | portable check scripts + gate | No | Y | Y | Y |
| 17 | Eval / regression | eval harness + library regression | No | Y | Y | ~ |
| 18 | Backlog / intake | new-component & enhancement backlogs | No | Y | Y | Y |
| 19 | Samples / examples | per-skill sample sets | Part (skill assets) | Y | Y | Y |
| 20 | Component history | per-component changelog/version | No | Y | Y | Y |
| 21 | Deprecation | status flags + retirement | No | Y | Y | Y |
| 22 | Frontmatter / metadata | cross-component frontmatter contract | Part (skills only) | Y | Y | Y |
| 23 | Onboarding / init | interview + scaffold a starting point | No | Y | Y | Y |
| 24 | Internal structure & navigability | _internal, decisions, rfcs, INDEX, generated manifest | No | Y | Y | Y |
| 25 | Templates | global templates directory | No | Y | Y | Y |
| 26 | Output contracts | house output structure for generated artifacts | No | Y | Y | Y |
| X | Advise (cross-cutting) | capability/target report | n/a | Y | Y | Y |

---

## Area 0 - Library (the whole thing)
The unit our toolkit is uniquely about. agentskills.io: superset. Compat: CC Y / CX Y / ECO ~.

| Builder skill | What it does | Audience | Output in agentskills.io? |
|---|---|---|---|
| `library-brainstorm` | Decide the library's theme, scope, target tier, and agent targets | A | No |
| `scaffold-advanced-library` (workflow) | Headline arc: scaffold a tiered, multi-agent library skeleton (manifest, dirs, AGENTS.md, CI, hooks) | A | No |
| `library-auditor` | Aggregate governance: counts, cross-references, manifest-vs-disk consistency | A | No |
| `library-tier-report` | Report the highest conformance tier the library actually satisfies | A | No |
| `adopt-library` | Assess an EXISTING repo against the Standard and recommend bring-to-conformance steps | A | No |

## Area 1 - Marketplace
What it is: a distribution index of plugins. agentskills.io: No. CC Y (marketplace.json) / CX Y (`codex marketplace add`) / ECO ~.

| Builder skill | What it does | Audience | Output in agentskills.io? |
|---|---|---|---|
| `marketplace-brainstorm` | Plan a marketplace's theme and plugin roster | A | No |
| `marketplace-creator` | Scaffold marketplace index for each target (CC `marketplace.json`, CX marketplace) | A | No |
| `marketplace-validator` | Validate entries, plugin refs, version/sha consistency | A | No |

## Area 2 - Plugin
What it is: a packaged bundle of components + manifest. agentskills.io: No. CC Y (`.claude-plugin/plugin.json`) / CX Y (`plugin.json`) / ECO ~.

| Builder skill | What it does | Audience | Output in agentskills.io? |
|---|---|---|---|
| `plugin-brainstorm` | Scope a plugin: which components, which tier, which targets | B/A | No |
| `plugin-creator` | Scaffold plugin structure + manifest + README/LICENSE/CHANGELOG per target | B | No |
| `plugin-validator` | Validate manifest schema, directory layout, file permissions | B | No |
| `plugin-improver` | Refactor/optimize an existing plugin toward the Standard | A | No |

## Area 3 - Skill
What it is: the atomic unit; a `SKILL.md`. agentskills.io: **Yes**. CC Y / CX Y / ECO Y.

| Builder skill | What it does | Audience | Output in agentskills.io? |
|---|---|---|---|
| `skill-brainstorm` | Discover intent, triggers, and whether a skill is even warranted (zone check) | B | Yes |
| `skill-creator` | Scaffold a compliant `SKILL.md` + `references/` skeleton | B | Yes |
| `skill-validator` | Frontmatter validity, name/dir match, description quality, instruction budget | B | Yes |
| `skill-improver` | Eval-informed targeted improvements (learned from skill-creator, rebuilt portable) | A | Yes |
| `skill-eval` | Run a skill against eval prompts and grade outputs | A | Yes |
| `skill-benchmark` | Multiple runs + variance analysis for statistical confidence | A | Yes |

## Area 4 - Command / invocation
What it is: an explicit user entry point to a skill. agentskills.io: No. CC Y (`commands/*.md`) / CX ~ (custom prompts) / ECO ~.

| Builder skill | What it does | Audience | Output in agentskills.io? |
|---|---|---|---|
| `command-creator` | Emit a companion command per target (CC command file, CX prompt) | B | No |
| `command-validator` | Frontmatter, args, one-command-maps-to-one-skill, description match | B/A | No |

## Area 5 - Subagent
What it is: a bounded delegate with its own tools/prompt. agentskills.io: No. CC Y (`agents/*.md`) / CX Y (`.codex/agents/*.toml`) / ECO ~.

| Builder skill | What it does | Audience | Output in agentskills.io? |
|---|---|---|---|
| `subagent-brainstorm` | Decide if a subagent (vs a skill) is warranted; define its bounded purpose | A | No |
| `subagent-creator` | Emit subagent in each target format (CC markdown, CX TOML) with narrow tool scope | A | No |
| `subagent-validator` | Purpose clarity, tool scoping, chain-contract registration | A | No |

## Area 6 - Hook
What it is: event-driven enforcement/context injection. agentskills.io: No. CC Y (31 events) / CX ~ (~10 events) / ECO N.

| Builder skill | What it does | Audience | Output in agentskills.io? |
|---|---|---|---|
| `hook-brainstorm` | Choose the event, justify the hook, define scope and failure behavior | A | No |
| `hook-creator` | Emit hook + registration (CC settings/`hooks.json`/frontmatter; CX equivalent) | A | No |
| `hook-validator` | Documented event/scope/failure, idempotency, actionable block messages | A | No |

## Area 7 - Workflow
What it is: an ordered arc chaining multiple skills. agentskills.io: No (convention). CC ~ / CX ~ / ECO ~.

| Builder skill | What it does | Audience | Output in agentskills.io? |
|---|---|---|---|
| `workflow-brainstorm` | Identify a recurring multi-skill arc worth formalizing | A | No |
| `workflow-creator` | Author `_workflows/*.md` with steps, handoffs, exit criteria | A | No |
| `workflow-validator` | Referenced skills exist; every step is chain-permitted | A | No |

## Area 8 - Chain contract
What it is: explicit declaration of safe inter-component invocation. agentskills.io: No (our convention). CC ~ / CX ~ / ECO ~.

| Builder skill | What it does | Audience | Output in agentskills.io? |
|---|---|---|---|
| `chain-contract-creator` | Author `_chain-permitted.yaml` (+ optional `_pairing.yaml`) | A | No |
| `chain-contract-validator` | Detect orphans (uncovered invocations) and phantoms (missing targets) | A | No |

## Area 9 - MCP server
What it is: external tools/resources via Model Context Protocol. agentskills.io: Part (separate standard). CC Y / CX Y / ECO Y.

| Builder skill | What it does | Audience | Output in agentskills.io? |
|---|---|---|---|
| `mcp-server-brainstorm` | Decide whether a need is tools (MCP) vs instructions (skill) | A | Part |
| `mcp-server-creator` | Scaffold an MCP server stub + per-target config (`.mcp.json` / `config.toml`) | A | Part |
| `mcp-server-validator` | Tool schema, config correctness, allowlist hygiene | A | Part |

## Area 10 - Instructions (AGENTS.md / CLAUDE.md)
What it is: durable project-level guidance. agentskills.io: No (convention). CC Y / CX Y (32 KiB cap) / ECO Y.

| Builder skill | What it does | Audience | Output in agentskills.io? |
|---|---|---|---|
| `instructions-creator` | Author a tight `AGENTS.md` (and CC `CLAUDE.md` if needed) | B | No |
| `instructions-sync` | Generate/sync instructions from the component index | I | No |
| `instructions-validator` | Size budget (incl. CX 32 KiB cap), instruction-count discipline | B/A | No |

## Area 11 - References / progressive disclosure / assets
What it is: on-demand depth bundled with a skill. agentskills.io: **Yes**. CC Y / CX Y / ECO Y.

| Builder skill | What it does | Audience | Output in agentskills.io? |
|---|---|---|---|
| `reference-builder` | Structure `references/` for clean progressive disclosure (one level deep) | B/A | Yes |
| `asset-manager` | Add templates/data/schemas under `assets/` with clear usage | B | Yes |

## Area 12 - Output style
What it is: an alternate response mode. agentskills.io: No. CC Y / CX N / ECO N.

| Builder skill | What it does | Audience | Output in agentskills.io? |
|---|---|---|---|
| `output-style-creator` | Author a Claude Code output style (Claude-only) | A | No |

## Area 13 - Statusline
What it is: a custom status line script. agentskills.io: No. CC Y / CX N / ECO N.

| Builder skill | What it does | Audience | Output in agentskills.io? |
|---|---|---|---|
| `statusline-creator` | Author a status line script + config (Claude-only) | A | No |

## Area 14 - Settings / permissions
What it is: permissions, env, and hook registration. agentskills.io: No. CC Y (`settings.json`) / CX ~ (`config.toml`) / ECO ~.

| Builder skill | What it does | Audience | Output in agentskills.io? |
|---|---|---|---|
| `settings-creator` | Scaffold settings (permissions, env) per target | I | No |
| `permission-advisor` | Recommend least-privilege permission allowlists | I | No |

## Area 15 - Docs
What it is: human-and-agent-facing documentation. agentskills.io: No. CC Y / CX Y / ECO Y (markdown universal).

| Builder skill | What it does | Audience | Output in agentskills.io? |
|---|---|---|---|
| `readme-creator` | Author a library/plugin README from the component index | B | No |
| `changelog-curator` | Draft CHANGELOG entries from git log (user-facing terms) | I | No |
| `docs-site-builder` | Optional: stand up a docs site (deferred; markdown-first for v1) | A | No |

## Area 16 - CI / validation / release tooling
What it is: the checks that keep a library healthy + the release gate. agentskills.io: No. CC Y / CX Y / ECO Y (CI-agnostic scripts).

| Builder skill | What it does | Audience | Output in agentskills.io? |
|---|---|---|---|
| `validator-creator` | Author a new portable check script (single runtime) | A | No |
| `ci-wrapper-creator` | Emit a thin CI config that only shells out to the scripts | A | No |
| `release-gate` | Run the aggregate, tier-applicable pre-tag validation | A | No |
| `version-bump` | Semver bump + consistency across manifest/docs | I | No |

## Area 17 - Eval / regression (library-scale)
What it is: evidence-based quality at the library level (the unclaimed wedge). agentskills.io: No. CC Y / CX Y / ECO ~.

| Builder skill | What it does | Audience | Output in agentskills.io? |
|---|---|---|---|
| `eval-harness-creator` | Scaffold an eval harness for skills/workflows | A | No |
| `library-regression-check` | Detect cross-skill/workflow breakage (does changing A break B's chain?) | A | No |

## Area 18 - Backlog / intake
What it is: the two standing backlogs that govern what gets built next (new components vs. enhancements to existing). agentskills.io: No. CC Y / CX Y / ECO Y.

| Builder skill | What it does | Audience | Output in agentskills.io? |
|---|---|---|---|
| `backlog-brainstorm` | Frame what belongs in the new-component vs enhancement backlog | A | No |
| `proposal-intake` | Capture a new-component proposal through the "why gate" (warranted? duplicate?) | B/A | No |
| `backlog-manager` | Maintain both backlogs with status/tier/agent-targets | I/A | No |
| `feature-request-triage` | Route an enhancement request to the right existing component | I | No |

## Area 19 - Samples / examples
What it is: representative input/output samples per skill (a best-in-class quality bar). agentskills.io: Part (live under `assets/`). CC Y / CX Y / ECO Y.

| Builder skill | What it does | Audience | Output in agentskills.io? |
|---|---|---|---|
| `samples-creator` | Generate >= 3 realistic samples demonstrating a skill | B/A | Part |
| `samples-validator` | Detect sample drift vs current skill behavior (drift = error) | A | Part |

## Area 20 - Component history / changelog
What it is: per-component version + dated change notes feeding the library CHANGELOG. agentskills.io: No. CC Y / CX Y / ECO Y.

| Builder skill | What it does | Audience | Output in agentskills.io? |
|---|---|---|---|
| `component-changelog` | Record per-component dated change notes | I | No |
| `history-validator` | Check component history vs library CHANGELOG consistency | A | No |

## Area 21 - Deprecation / retirement
What it is: lifecycle end-state management for components. agentskills.io: No. CC Y / CX Y / ECO Y.

| Builder skill | What it does | Audience | Output in agentskills.io? |
|---|---|---|---|
| `deprecation-manager` | Mark a component deprecated with replacement + `remove-in` target | A | No |
| `retirement-check` | Verify deprecated components still validate until removal | A | No |

## Area 22 - Frontmatter / metadata
What it is: the frontmatter contract across all component types (not just skills). agentskills.io: Part (skills only). CC Y / CX Y / ECO Y.

| Builder skill | What it does | Audience | Output in agentskills.io? |
|---|---|---|---|
| `frontmatter-architect` | Define/scaffold the frontmatter contract per component type | A | Part |
| `frontmatter-validator` | Validate YAML, required keys per type, metadata conventions | B/A | Part |
| `description-scorer` | Score description triggering quality against a rubric | B/A | Part |

## Area 23 - Onboarding / init
What it is: the front door - onboard a new user and scaffold a starting point. agentskills.io: No. CC Y / CX Y / ECO Y.

| Builder skill | What it does | Audience | Output in agentskills.io? |
|---|---|---|---|
| `init` (provisional name; prefix TBD) | Onboard a maintainer and scaffold a starting point. Three modes (below). | B | No |

**`init` modes (captured 2026-05-24, maintainer request):**
- **Mode 1 - `interview`:** live conversational Q&A; agent asks, maintainer answers, agent synthesizes a starting config + scaffolds.
- **Mode 2 - `questionnaire`:** emits a structured Markdown questionnaire (a default template) with per-section **"Maintainer feedback"** and **"Agent response"** blocks; maintainer fills it async, agent then processes it into a config + scaffold.
- **Mode 3 - `hybrid`:** maintainer supplies some context via chat; agent emits a **tailored** questionnaire MD (pre-filled with suggestions based on that context), still retaining maintainer-feedback + agent-response areas.

The questionnaire structure is a reusable **default template** (see Area 25, `onboarding-questionnaire.template.md`). The maintainer-feedback / agent-response collaborative-doc pattern dogfoods the way this very project was built (`` docs) and could generalize to other collaborative skills.

## Area 24 - Internal structure & navigability
What it is: the agent + human navigation surface and the internal-docs convention. agentskills.io: No. CC Y / CX Y / ECO Y.

| Builder skill | What it does | Audience | Output in agentskills.io? |
|---|---|---|---|
| `index-generator` | Generate `INDEX.md` (human map) from frontmatter | I | No |
| `manifest-generator` | Generate `manifest.generated.json` (agent index) from frontmatter, in CI | A | No |
| `agents-md-author` | Author/sync `AGENTS.md` agent-navigation entrypoint | I | No |
| `internal-docs-scaffold` | Scaffold `_internal/` (gitignored) + `decisions/` (MADR) + `rfcs/` | I | No |

## Area 25 - Templates
What it is: global templates the scaffolders consume. agentskills.io: No. CC Y / CX Y / ECO Y.

| Builder skill | What it does | Audience | Output in agentskills.io? |
|---|---|---|---|
| `template-manager` | Create/maintain global `templates/` (SKILL.md, ADR, eval-set, `onboarding-questionnaire.template.md`, etc.) | I | No |

Notable template: **`onboarding-questionnaire.template.md`** - a structured questionnaire with per-section "Maintainer feedback" + "Agent response" blocks, used by `init` modes 2 and 3 (Area 23). A reusable collaborative-doc pattern.

## Area 26 - Output contracts
What it is: the house structure for artifacts a library's skills produce. agentskills.io: No. CC Y / CX Y / ECO Y.

| Builder skill | What it does | Audience | Output in agentskills.io? |
|---|---|---|---|
| `output-contract-creator` | Define/validate a house output structure for generated artifacts | A | No |
| `release-notes-curator` | Curate user-facing `RELEASE-NOTES.md` (distinct from CHANGELOG) | I | No |

## Area X - Advise (cross-cutting)
What it is: tells the user what their target agent supports before they build. agentskills.io: n/a.

| Builder skill | What it does | Audience | Output in agentskills.io? |
|---|---|---|---|
| `capability-advisor` (subagent) | Map a target agent to supported capabilities and recommend a tier | I | n/a |
| `check-agent-support` | Report, for a given component, which targets can run it | I/B | n/a |

---

## Observations for design

1. **The agentskills.io-covered surface is small** (Areas 3 and 11 only). Everything else is convention or agent-specific. This confirms the wedge: our value is overwhelmingly in the *non-agentskills.io* components and in tying them together at library scale.
2. **The beginner on-ramp is narrow and clear:** Areas 3, 11, 2, 10, 15 (skill, references, plugin, instructions, docs) are where beginners live. Almost everything advanced is the Convergent/Advanced tiers (subagents, hooks, workflows, chain contracts, eval).
3. **Claude-only artifacts are few:** only output styles (12) and statusline (13) are CC-only. Most areas have a Codex path, which validates the multi-agent thesis and the `--agent-target` emission model.
4. **Builder families repeat a shape:** brainstorm -> create -> validate -> improve. This regularity is itself a candidate meta-pattern the toolkit could scaffold (a "builder-family generator").

## Open questions
- Do we want a brainstorm + validate skill for *every* area, or only create-skills for the long tail (with a single generic validator)? (Bloat vs completeness.)
- Should the builder families be individual skills or modes of one skill per area (e.g., `skill` with create/eval/improve modes, like skill-creator)? Modes reduce skill count; separate skills improve discoverability.
- Which areas are v1 vs later? (Feeds the v1-cut decision, D2.)
