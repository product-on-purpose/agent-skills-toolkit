# agent-skills-toolkit: Foundation & Decision Log

> **ARCHIVAL / SUPERSEDED (2026-05-25).** Authoritative: [`agent-skills-toolkit-DESIGN.md`](../agent-skills-toolkit-DESIGN.md) (v0.6) + [`STANDARD.draft.md`](../STANDARD.draft.md) (v0.5). Retained as the detailed *decision-journey record*; where it differs from the canonical docs (older skill/bundle names, `validate` vs `evaluate`, `improve` as a standalone, library/plugin usage), the canonical docs win. Index: [`../README.md`](../README.md).
> **Terminology has since evolved:** "plugin" = the artifact / unit of release (holds the one version); "skill library" = the quality grade a plugin earns, not a separate artifact. Where this doc uses "library" structurally, read "plugin." (Internal cross-links may be relative-stale after archiving.)
>
> Living document. Status: v0.1 draft, 2026-05-24.
> Purpose: capture every decision domain, both parties' feedback, recommendations, status, and links. Working material, not the committed spec. Companion: [`architectural-approach.md`](./architectural-approach.md) (A/B/C comparison; Approach B locked).

---

## How to use this document

- Each **decision domain** has: the question, your feedback, my analysis, my recommendation, a status, and links.
- **Status legend:** `DECIDED` (locked) | `LEANING` (recommendation on the table, not confirmed) | `DISCUSSING` (open) | `RESEARCH` (needs investigation) | `DEFERRED` (post-v1).
- The two **inventories** (Capability Inventory, Candidate Skill Inventory) are the "list everything, then work back" artifacts. They are deliberately over-inclusive; we cut from them, we do not pad them.
- Append decisions to the **Change log** at the bottom as they settle.

---

## Part A: Vision and principles (settled context)

| Item | Statement | Status |
|---|---|---|
| What it is | A standalone, public-from-day-one plugin in the `product-on-purpose` marketplace: a toolkit to author, maintain, iterate, and scale best-in-class agent skill libraries. | DECIDED |
| Beyond bags-of-skills | The toolkit teaches and tooling-enforces *advanced* libraries: session lifecycle hooks, chained skills/workflows, chain contracts, subagents, CI. | DECIDED |
| Architecture | Approach B: self-hosting modular toolkit; a versioned Standard (`STANDARD.md`) is the spine; the plugin is built to its own Standard as the reference example. | DECIDED |
| Separation | Completely separate from `pm-skills` in every way. We may *reference* patterns from pm-skills/jp-library/plugin-dev where useful, but there is no shared code, versioning, or dependency. | DECIDED (this session) |
| Dual audience | Robust for beginners (portable core) and advanced users (full Claude-native stack) in one library. | DECIDED (this session) |
| Recursive scope | The repo both *contains* best-in-class components (subagents, hooks, workflows) AND *ships builder-skills* so users can author those same components. | DECIDED (this session) |
| agentskills.io | Maintain compliance with the agentskills.io specification as a hard requirement. | DECIDED (this session) |
| Philosophy guardrails | Composable over monolithic; every line of context earns its place (~150-200 instructions reliably followed); ship the smallest useful thing; agent-native not agent-translated; local-first where it matters. | DECIDED (portfolio-wide) |

---

## Part B: Decision domains

### D1 - Method: work back from a capability inventory
- **Your feedback:** Want extremely comprehensive; "don't know what I don't know"; want both the deep elements AND builder-skills; raised that not all agents support advanced features (hooks, subagents); proposed building a comprehensive functionality list and working back.
- **My analysis:** Agreed and adopted as the governing method. We cannot pick a defensible skill slice until we have mapped the capability surface. The capability surface also sorts by portability, which gives us the Standard's tier structure for free.
- **Recommendation:** Make the **Capability Inventory (Part C)** the root artifact. Every candidate skill must trace to a capability it authors, validates, applies, or releases.
- **Status:** DECIDED (method).

### D2 - Scope and the v1 slice
- **Your feedback:** Start from a comprehensive list of all potential skills, then work back. Not ready to commit to all of them. Comfortable with a "surprisingly robust v1."
- **My analysis:** The comprehensive list is **Part D**. The v1 cut is a separate, later decision we make *after* both inventories feel complete. "Surprisingly robust v1" suggests we aim higher than a token MVP but still cut hard from the full list.
- **Recommendation:** Defer the actual v1 line until Parts C and D stabilize. Tag every candidate skill with a provisional tier (`v1` / `later`) now, revise later.
- **Status:** DISCUSSING (v1 line deferred; inventory tagging in progress).

### D3 - Relationship to other resources
- **Your feedback:** Completely separate from pm-skills in every way; pull from other resources only if relevant.
- **My analysis:** pm-skills, jp-library (jp-skill-builder), and plugin-dev are *reference material* for patterns (chain contracts, validator suite shape, the 3-form script triplets, family contracts), not dependencies or code sources. We will re-derive generalized versions, not copy.
- **Recommendation:** Treat them as prior art to study and cite in this log, nothing more. Keep zero coupling.
- **Status:** DECIDED.

### D4 - The Standard (`STANDARD.md`) structure
- **Your feedback:** Unsure how to answer beyond the rest of this response.
- **My analysis:** Your other answers actually answer this. The capability inventory's portability layers give the Standard its backbone: define a portable core, then progressively Claude-native layers, each a conformance tier. Sections then follow the component types (skill anatomy, commands, subagents, hooks, workflows, chain contracts, CI/release, naming/frontmatter).
- **Recommendation:** Structure `STANDARD.md` as: (1) Principles, (2) Conformance tiers, (3) Component specs (skill, command, subagent, hook, workflow, chain contract), (4) Frontmatter + naming, (5) CI + release expectations, (6) agentskills.io conformance mapping. See proposed outline in Part E.
- **Tier model (revised post-research):** three layers driven by Part C's portability finding. **Bronze = Universal** (agentskills.io skills, references, AGENTS.md, MCP; same files run across ~50 agents). **Silver = Convergent** (subagents, plugins, workflows, commands, chain contracts; concepts both CC and CX support but in different formats, so the toolkit emits per `--agent-target`). **Gold = Advanced** (hooks, output styles, statusline, full self-hosting CI). Beginners live in Bronze; advanced users climb to Gold. The agentskills.io `compatibility` field is the spec-native way a skill self-declares its tier.
- **Status:** LEANING.

### D5 - Tooling stack and runtime
- **Your feedback:** Optimize for Claude Code primarily, Codex second. Optimize for token/context efficiency. Use the baseline Node version shipped with Claude/Codex, or a widely used Python version. Want extensible, portable, scalable. Be careful about GitHub Actions dependency (though there may be skills for that). Right-size for cross-agent compatibility.
- **My analysis:** This argues against pm-skills' 3-form `.md`/`.ps1`/`.sh` triplet suite (high maintenance, shell-portability tax). A single runtime is cleaner. Claude Code and Codex both run in Node-capable environments; Node is the lowest-friction choice and keeps tooling as portable CLI scripts callable from skills. Python is a reasonable alternative but adds an interpreter assumption. GitHub Actions should be *optional*: CI logic lives in runtime scripts that Actions merely invokes, so the same checks run locally, in any CI, or via a skill, with no lock-in.
- **Recommendation:** **Node-based single runtime** for all enforcement tooling (no triplets), authored as small composable scripts invoked by skills and by an optional CI wrapper. Keep each script single-purpose and dependency-light. Provide a thin `ci.yml` that only shells out to those scripts, so GitHub is a convenience, not a dependency. Revisit Python only if a specific need appears.
- **Research note:** Both Claude Code and Codex CLI ship/run in Node-capable environments (Codex CLI is also distributed via npm). The official agentskills validator `skills-ref` is a reference library we can wrap rather than reinvent. Node 20 LTS is a safe baseline assumption; confirm exact minimum during spec-writing.
- **Status:** LEANING (Node single-runtime, CI-agnostic; wrap `skills-ref` where possible).

### D6 - Bundle carve (author / validate / patterns / release)
- **Your feedback:** (implicit; reacting to the larger picture)
- **My analysis:** The four bundles need two additions surfaced by research: **iterate/** (eval-driven improvement; the competitive scan showed this is both a user-named lifecycle stage and a library-scale wedge) and a small cross-cutting **advise** capability (which agent supports what). So the lifecycle maps to five bundles: author -> validate -> patterns -> iterate -> release, plus advise.
- **Recommendation:** Five bundles (author / validate / patterns / iterate / release) + a light `advise` capability (`capability-advisor` subagent + `check-agent-support` skill). Confirm during Standard-writing.
- **Status:** LEANING (was four; iterate added post-competitive-scan).

### D7 - Docs surface
- **Your feedback:** Not sure.
- **My analysis:** pm-skills uses Astro + Starlight (heavy). For a v1 that values token/context efficiency and portability, markdown-first docs (the Standard + per-bundle guides, rendered fine on GitHub) are lighter and avoid a build dependency. A docs site can come later.
- **Recommendation:** **Markdown-first docs for v1**; defer any Astro/Starlight site. The Standard itself is the centerpiece doc.
- **Status:** LEANING.

### D8 - Marketplace registration timing
- **Your feedback:** Not sure.
- **My analysis:** Registering in `agent-plugins/.claude-plugin/marketplace.json` as `Discovery` early signals intent but exposes an unfinished plugin. Registering at first tagged release is cleaner for a public product.
- **Recommendation:** **Register at first tagged release** (v0.1.0). Keep building privately until then.
- **Status:** LEANING.

### D9 - agentskills.io compliance
- **Your feedback:** Definitely maintain compliance.
- **My analysis:** This is both a constraint (our scaffolders must emit compliant skills; our validators must check compliance) and a feature (a `validate-agentskills-compliance` skill is high value). It also anchors the portable core tier: agentskills.io-compliant markdown skills are the universal layer every agent can consume.
- **Recommendation:** Treat agentskills.io as the **foundation of the Bronze/Universal tier**. Wrap the official `skills-ref validate` tool inside our `validate-agentskills-compliance` skill instead of reimplementing frontmatter parsing. Use the spec's `compatibility` field as the tier-declaration mechanism.
- **Verified spec details:** required `name` (max 64, must match parent dir name) + `description` (max 1024); optional `license`, `compatibility` (max 500), `metadata` (arbitrary string map), `allowed-tools` (experimental). SKILL.md recommended < 500 lines. See Part C findings.
- **Status:** DECIDED (requirement + spec pinned).

### D10 - Dual audience (beginner and advanced)
- **Your feedback:** Robust library usable by beginners and advanced users.
- **My analysis:** Solved by the tier structure. Beginners operate at the portable core (author a compliant skill, validate it). Advanced users climb to hooks, subagents, chained workflows, CI. Skills are tagged by audience so the library reads as a ladder, not a wall.
- **Recommendation:** Tag every skill `beginner` / `intermediate` / `advanced`; ensure the `author` bundle has a friction-free beginner on-ramp (`scaffold-skill`) and the `patterns` bundle holds the advanced climbs.
- **Status:** LEANING.

### D11 - Cross-agent capability support (NEW, foundational)
- **Your feedback:** Not all agents support advanced functionality (hooks, subagents); be careful; right-size for compatibility.
- **My analysis:** This is the load-bearing constraint. We classify every capability by which agents support it (Part C). The Standard then declares tiers so a library can be "portable-core conformant" (runs anywhere) up to "Claude-native Gold" (uses the full stack). The toolkit advises users on what their target supports.
- **Recommendation:** Build the **agent-support matrix** in Part C now; let it drive tiers (D4), the advise capability (D6), and audience tagging (D10).
- **Status:** DECIDED (as foundational constraint); matrix drafting in Part C.

---

## Part C: Capability Inventory (VERIFIED 2026-05-24, work-back root)

Every capability an advanced skill library could use. Key correction from research: Claude Code and Codex have **converged** on a similar customization stack. The right axis is not "portable vs Claude-only" but **concept portability (the idea works across agents) vs format portability (the same file works across agents)**. Many concepts are universal; their file formats are not.

Columns: CC = Claude Code, CX = Codex CLI, ECO = broader agentskills.io ecosystem (~50 agents: Cursor, Gemini CLI, Copilot, Goose, OpenCode, etc.). Legend: Y = supported, ~ = supported via different format/mechanism, N = not supported.

| Capability | What it is | CC | CX | ECO | Format portable? | Tier | Toolkit relevance |
|---|---|---|---|---|---|---|---|
| Markdown skill (SKILL.md) | agentskills.io skill: frontmatter + instructions | Y | Y | Y | Yes (same file) | Universal (Bronze) | author, validate |
| `references/` progressive disclosure | Lazy-loaded deep content | Y | Y | Y | Yes | Universal | author, patterns |
| `scripts/` + `assets/` | Bundled executables / templates | Y | Y | Y | Yes | Universal | author |
| AGENTS.md | Cross-agent project instructions (32 KiB cap) | Y | Y | Y | Yes | Universal | release (sync), validate |
| MCP server | Model Context Protocol tools/resources | Y | Y | Y | Yes (config differs) | Universal | patterns (later) |
| `compatibility` frontmatter field | Spec-native env/product requirement declaration | Y | Y | Y | Yes | Universal | validate, tiers |
| Subagent | Named delegate w/ own tools + prompt | Y | Y | ~ | No: CC `agents/*.md` vs CX `.codex/agents/*.toml` | Convergent (Silver) | author, patterns; toolkit ships its own |
| Plugin bundle | Packaged components | Y | Y | ~ | No: CC `.claude-plugin/plugin.json` vs CX `plugin.json` | Convergent | author, release |
| Marketplace distribution | Plugin index/install | Y | Y | ~ | No: CC marketplace.json vs CX `codex marketplace add` | Convergent | release |
| Hooks (lifecycle/tool events) | Event-driven scripts | Y (31 events) | Y (~10 events) | N | No: different events + registration | Convergent (Gold) | patterns; toolkit uses its own |
| Slash command | Companion invocable command | Y `commands/*.md` | ~ "custom prompts" | ~ | No | Convergent | author, validate |
| Chain contracts | Declared safe skill/agent chaining | ~ (convention) | ~ (convention) | ~ | Convention (ours to define) | Gold | patterns, validate |
| Workflows | Chained multi-skill arcs | ~ (convention) | ~ (convention) | ~ | Convention (ours to define) | Silver/Gold | author, patterns |
| Output styles | Alternate response modes | Y | N | N | No | Agent-specific | patterns (later) |
| Statusline | Custom status line script | Y | N | N | No | Agent-specific | patterns (later) |
| Settings / permissions | Hook + permission config | Y settings.json | ~ config.toml | ~ | No | Agent-specific | author, validate |
| CI integration | Validators run in CI | Y | Y | Y | Yes (CI-agnostic scripts) | Universal | release |

### Verified research findings (2026-05-24)

- **agentskills.io spec (authoritative):** `SKILL.md` frontmatter fields are `name` (req, max 64, lowercase/digits/hyphens, no leading/trailing/consecutive hyphen, **must match parent dir name**), `description` (req, max 1024, what + when + keywords), `license` (opt), `compatibility` (opt, max 500, env/product requirements), `metadata` (opt, arbitrary string map), `allowed-tools` (opt, experimental, space-separated). Recommended: SKILL.md < 500 lines / < 5000 tokens instructions; metadata ~100 tokens. Optional dirs `scripts/` `references/` `assets/`. **Official validator exists: `skills-ref validate ./my-skill`** (github.com/agentskills/agentskills). pm-skills' `metadata: {phase, version, updated, ...}` is spec-compliant use of the arbitrary `metadata` map.
- **Claude Code hooks (authoritative):** 31 events across session lifecycle, user input, tool loop, errors, subagents/teams, file/config monitoring, notifications/MCP. Registration in `settings.json`, plugin `hooks/hooks.json` (with `${CLAUDE_PLUGIN_ROOT}`), or skill/subagent frontmatter (scoped). Hook types: `command`, `http`, `mcp_tool`, `prompt`, `agent`.
- **Codex CLI (authoritative):** five-layer stack: (1) AGENTS.md, (2) Skills as `SKILL.md` in `.agents/skills/`, (3) MCP via `config.toml [mcp_servers]`, (4) Subagents as TOML in `.codex/agents/` (built-ins: default/worker/explorer), (5) Plugins via `plugin.json` + `codex marketplace add`. Hook events: PreToolUse, PermissionRequest, PostToolUse, Pre/PostCompact, SessionStart, SubagentStart/Stop, UserPromptSubmit, Stop.
- **Design implication:** because Claude Code and Codex are concept-convergent but format-divergent, scaffolders and validators likely need an `--agent-target` (e.g., `claude`, `codex`, `both`) so the toolkit emits the right files per agent. The universal tier (skills, references, AGENTS.md, MCP) needs no targeting; the convergent tier does.

---

## Part D: Candidate Skill Inventory (draft, over-inclusive)

Tags: tier `[v1]`/`[later]` (provisional), audience `(B)`eginner/`(I)`ntermediate/`(A)`dvanced. Cut from this list; do not pad it.

### author/ (scaffolding)
- `scaffold-skill` - new agentskills.io-compliant SKILL.md + references. `[v1] (B)`
- `scaffold-plugin` - new plugin repo skeleton (plugin.json, dirs, README, CHANGELOG). `[v1] (I)`
- `scaffold-command` - companion slash command for a skill. `[v1] (I)`
- `scaffold-subagent` - new subagent definition + registration. `[v1] (A)`
- `scaffold-hook` - session/tool hook + settings.json wiring. `[later] (A)`
- `scaffold-workflow` - chained multi-skill workflow. `[later] (A)`
- `scaffold-marketplace` - marketplace.json index. `[later] (I)`
- `scaffold-mcp-server` - MCP server stub. `[later] (A)`

### validate/ (linting + auditing)
- `lint-frontmatter` - agentskills.io frontmatter correctness. `[v1] (B)`
- `validate-agentskills-compliance` - full spec conformance check. `[v1] (B)`
- `check-skill-structure` - dir layout, references, naming. `[v1] (I)`
- `score-description` - triggering-quality score for skill/command descriptions. `[v1] (I)`
- `check-instruction-budget` - flag bloat vs the ~150-200 instruction guideline. `[v1] (I)`
- `validate-command` - command frontmatter/args. `[later] (I)`
- `validate-subagent` - subagent definition + tool scoping. `[later] (A)`
- `validate-chain-contracts` - chain-permitted/pairing integrity. `[later] (A)`
- `audit-library` - aggregate audit (the pre-tag-validate analog). `[v1] (A)`
- `check-agent-support` - report which capabilities a target agent supports. `[later] (I)` (see D6/D11)

### patterns/ (apply advanced patterns; the "advanced reference")
- `add-session-lifecycle` - SessionStart/SessionEnd patterns. `[later] (A)`
- `add-tool-hooks` - PreToolUse/PostToolUse guards. `[later] (A)`
- `add-chained-workflow` - turn skills into an arc. `[later] (A)`
- `add-chain-contract` - declare safe chaining. `[later] (A)`
- `add-subagent-pairing` - pair skills with delegate agents. `[later] (A)`
- `design-skill-family` - family contract pattern. `[later] (A)`
- `add-progressive-disclosure` - references/ pattern done well. `[v1] (I)`

### release/ (packaging + scaling)
- `audit-library` (shared with validate; the release gate). `[v1] (A)`
- `curate-changelog` - changelog from git log. `[later] (I)`
- `release-gates` - guided pre-release runbook. `[later] (A)`
- `version-bump` - semver + consistency. `[later] (I)`
- `sync-agents-md` - generate/sync AGENTS.md from components. `[later] (I)`
- `package-marketplace` - prep marketplace entry. `[later] (I)`
- `validate-install` - post-install smoke check. `[later] (I)`

### iterate/ (eval-driven improvement; learned from skill-creator, rebuilt portable + library-scale)
- `eval-skill` - run a skill against eval prompts, grade outputs (portable; CC + Codex). `[later] (I)`
- `improve-skill` - analyze eval results, suggest targeted fixes. `[later] (A)`
- `benchmark-skill` - multiple runs + variance analysis for statistical confidence. `[later] (A)`
- `regression-check-library` - detect cross-skill/workflow breakage (does changing skill A break workflow B's chain?). `[later] (A)` (the unclaimed library-scale wedge)
- `eval-grader` (subagent) / `eval-executor` (subagent) - portable analogs of skill-creator's Grader/Executor. `[later]`

### toolkit's own subagents (ships in agents/, Gold-tier example)
- `skill-author` - drives scaffolding + drafting. `[v1]`
- `skill-critic` - adversarial review of a skill/library. `[v1]`
- `library-auditor` - runs the aggregate audit. `[v1]`
- `release-conductor` - walks release gates. `[later]`
- `capability-advisor` - advises on cross-agent support. `[later]`

---

## Part E: Proposed `STANDARD.md` outline (for D4)

1. **Principles** - composability, instruction budget, agent-native, portability-first.
2. **Conformance tiers** - Portable Core (Bronze) / Claude-Enhanced (Silver) / Claude-Native Advanced (Gold), defined by the Part C portability column.
3. **Component specs** - skill, command, subagent, hook, workflow, chain contract; each with required shape + validation rules.
4. **Frontmatter and naming** - agentskills.io frontmatter, naming conventions, file layout.
5. **CI and release** - required checks, CI-agnostic runner, release gates.
6. **agentskills.io conformance mapping** - how our Standard maps to and extends the upstream spec.

---

## Part F: Open research items
- [x] Pin exact agentskills.io spec + frontmatter shape. DONE (see Part C findings + D9). Official `skills-ref` validator exists.
- [x] Confirm Claude Code hook events + registration. DONE: 31 events; settings.json / plugin hooks.json / frontmatter; types command|http|mcp_tool|prompt|agent.
- [x] Confirm Codex support for commands, subagents, workflows, MCP. DONE: five-layer stack (AGENTS.md, skills, MCP, subagents TOML, plugins) + ~10 hook events.
- [~] Node baseline version. PARTIAL: Node 20 LTS safe assumption; confirm exact minimum at spec-writing.
- [~] Prior-art / differentiation survey. PARTIAL: agentskills ecosystem is ~50 agents with `skills-ref` as the only official validator; no dedicated "advanced multi-agent skill-library authoring toolkit" found yet. Deeper competitive scan still useful.

## Part G: Reference prior art (study, do not couple)
- `pm-skills` - validator suite (3-form triplets), chain contracts (`_chain-permitted.yaml`, `_pairing.yaml`), `_workflows/`, family validators, `pre-tag-validate` aggregator, agentskills.io migration.
- `jp-library` - `jp-skill-builder` (8-phase pipeline, Why Gate).
- `plugin-dev` - `skill-development`, `plugin-validator`, `skill-reviewer`, `plugin-structure`.

---

## Part H: Competitive landscape and differentiation (VERIFIED 2026-05-24)

### Direct authoring-tool competitors
| Tool | Owner | What it does | Unit | Agents | Gaps we exploit |
|---|---|---|---|---|---|
| skill-creator | Anthropic (official) | Create / Eval / Improve / Benchmark; Executor, Grader, Comparator, Analyzer agents; eval-driven iteration with variance analysis | One skill | Claude Code only | No library scale, no multi-agent, no hooks/subagents/workflows/release |
| plugin-dev | Anthropic (official) | 8-phase create-plugin; plugin-validator + skill-reviewer agents | One plugin | Claude Code | Single plugin; no library governance; no multi-agent emission |
| Plugin Creator | community (mcpmarket) | Scaffolds commands/agents/skills/MCP; templates; validation; marketplace sync | One plugin | Claude Code | Same |
| skills-ref | agentskills.io (official) | `validate` frontmatter + naming | One skill | Spec-level | Validation only; wrap it, do not rebuild |
| Pulser | community | Diagnostic CLI: 8 rules, auto-classify, prescribe fixes | One skill | Claude Code | Single-skill lint |
| ccpi / SkillKit / tonsofskills | community | Package manager + marketplaces (distribution) | Distribution | Multi | Not authoring; do not build a package manager |

### Curated collections (not tooling, for context)
- VoltAgent/awesome-agent-skills (1000+, multi-agent), rohitg00/awesome-claude-code-toolkit (curated, explicitly no authoring tooling), alirezarezvani/claude-skills (329, multi-agent via duplication), anthropics/skills (official, includes a `template-skill` starter).

### The wedge (where nobody is)
1. **The library is the unit**, not the skill or single plugin: counts, cross-references, family contracts, aggregate audit, release gates. (pm-skills hand-built exactly this; we generalize it.)
2. **Per-`--agent-target` format emission**: one source emits + validates Claude Code and Codex formats. Collections fake multi-agent via duplication; a tool that does it is novel.
3. **Advanced patterns first-class**: hooks, chained workflows, chain contracts, session lifecycle - taught and scaffolded. Competitors omit these entirely.
4. **Library-scale eval/iterate**: regression across skills/workflows (does changing skill A break workflow B's chain?), not just per-skill eval.
5. **Self-hosting reference**: the toolkit is itself a Gold-tier example, CI-verified.

### Build vs. interop posture (DECIDED 2026-05-24)
- **Decision:** agent-skills-toolkit is **self-contained and portable**. It **studies/learns from** `skill-creator` (the Create/Eval/Improve/Benchmark model + Executor/Grader/Comparator/Analyzer agents) and `skills-ref` (validation rules), but **does not depend on or wrap them** - because both are Claude-only and our differentiator is multi-agent.
- **Why:** a Claude-only dependency would leave Codex users with no create/eval/validate path, breaking the multi-agent thesis. Portability requires our own agent-agnostic implementations.
- **Practical consequence:** we re-derive a portable single-skill core (scaffold, validate, eval) AND build the library/multi-agent/advanced-pattern wedge on top. Distribution still defers to existing marketplaces / `ccpi` (not our problem to solve).

---

## Part I: New decision domain

### D12 - Positioning and build-vs-interop
- **Your feedback:** (pending) - you asked for a deeper competitive scan; this domain captures the result.
- **My analysis:** Leading with commoditized single-skill scaffolding/validation puts us head-to-head with Anthropic's free official tools. The defensible position is the library layer plus multi-agent emission plus advanced patterns - all unclaimed.
- **Recommendation:** Adopt the build-vs-interop posture above. Position agent-skills-toolkit as "the toolkit for building and governing advanced, multi-agent skill *libraries*," wrapping official single-skill tools rather than competing with them.
- **Your decision (2026-05-24):** Self-contained and portable. Learn from skill-creator and skills-ref while building the agent-skills-toolkit equivalents; depend on neither.
- **Status:** DECIDED.

### D13 - Component lifecycle and governance
- **Your feedback:** Flagged gaps: backlog for new components vs. enhancement backlog for existing ones; per-component changelog (not just library); best-in-class references/examples/samples; deprecation; versioning.
- **My analysis:** The docs specified component *structure* and cross-agent *format* but not lifecycle *governance over time*. That layer sits squarely in our wedge (the library as the unit, governed across its evolution), and pm-skills has prior art (samples-per-skill, `validate-skill-history`, CHANGELOG discipline) to generalize.
- **Recommendation / action taken:** Added Standard **Section 7** (intake/backlog with a "why gate", samples requirement, per-component history, versioning-propagation policy, deprecation/retirement, contribution) and catalog **Areas 18-21** (backlog/intake, samples, component history, deprecation).
- **Resolved (2026-05-24):** per-component history = frontmatter `version` + co-located `HISTORY.md`; backlog = structured markdown in-repo (`_backlog/`).
- **Status:** DECIDED (added). Remaining open in Standard Appendix A: sample count, version-propagation wording.

### D14 - Frontmatter, quality, and security standards
- **Your feedback:** Consider other areas that need adding (CI, frontmatter).
- **My analysis:** Frontmatter was specified for skills only; CI was shallow; description/triggering quality, naming/taxonomy, testing coverage, and least-privilege security were unspecified.
- **Recommendation / action taken:** Added Standard **Section 3.8** (frontmatter contract across all component types), expanded **Section 4** (4.4 local/CI parity, 4.5 result severity), added **Section 8** (description/triggering bar, naming/taxonomy, eval coverage by tier) and **Section 9** (security and least privilege); catalog **Area 22** (frontmatter/metadata, incl. `description-scorer`).
- **Status:** DECIDED (added). Open: the description-scoring rubric.

---

## Change log
- 2026-05-24 v0.8: Reviewed three initial-discovery docs; created [`discovery-integration.md`](./discovery-integration.md) (gap analysis: missing capability layers, dual-layer navigability, methodology-first tension, new competitors) and [`decision-guide.md`](./decision-guide.md) (master decision guide). Surfaced D15 (sequencing/blend) and D16 (dual-layer navigability) as open. Recommended blend: comprehensive Standard + roadmap, thin self-hosting v1.
- 2026-05-24 v0.7: Added governance + quality layer per user. STANDARD: §3.8 frontmatter contract (all components), §4.4/4.5 CI parity + severity, §7 component lifecycle & governance (backlog new-vs-enhancement, samples, per-component history, versioning policy, deprecation, contribution), §8 quality/discoverability, §9 security/least-privilege. Catalog: areas 18-22. Foundation: D13 (lifecycle governance) + D14 (frontmatter/quality/security), both DECIDED.
- 2026-05-24 v0.6: Created [`builder-skills-catalog.md`](./builder-skills-catalog.md) v0.1 - the build-the-builder breakdown: 18 functional areas, ~50 candidate builder skills, each tagged audience (B/A), agentskills.io output coverage, and CC/CX/ECO compat. Key takeaways: agentskills.io covers only 2 of 18 areas (skill + references); beginner on-ramp is ~5 areas; only output-style + statusline are Claude-only.
- 2026-05-24 v0.5: Drafted [`STANDARD.draft.md`](./STANDARD.draft.md) v0.1 (RFC-2119 normative): scope, principles, 3 conformance tiers, 6 component specs (skill/command/subagent/workflow/hook/chain-contract), conventional metadata keys, CI+release expectations, library manifest, agentskills.io mapping, open items. Destination is repo-root STANDARD.md once approved.
- 2026-05-24 v0.4: D12 DECIDED (self-contained + portable; learn from but do not depend on skill-creator/skills-ref). Added `iterate/` bundle (eval-driven, portable, library-scale) to inventory; bundle model now five (author/validate/patterns/iterate/release) + advise (D6).
- 2026-05-24 v0.3: Deeper competitive scan. Added Part H (landscape + wedge + build-vs-interop) and D12 (positioning). Key finding: all direct competitors are single-skill/single-plugin and Claude-only; library-scale + multi-agent + advanced-patterns is open white space. Flagged a library-scale eval/iterate gap in the inventory.
- 2026-05-24 v0.2: Ran research items F1-F3 (done), F4-F5 (partial). Corrected Capability Inventory with verified CC/CX/ecosystem support: key finding that CC and CX are concept-convergent but format-divergent. Revised tier model to Universal/Convergent/Advanced (Bronze/Silver/Gold). Pinned exact agentskills.io frontmatter; noted official `skills-ref` validator to wrap. Surfaced `--agent-target` design implication for scaffolders/validators.
- 2026-05-24 v0.1: Created. Locked: separation from pm-skills, dual-audience, recursive scope, agentskills.io requirement, capability-first method (D1), cross-agent constraint as foundational (D11). Leaning: Node single-runtime/CI-agnostic (D5), tier-structured Standard (D4), markdown-first docs (D7), register-at-release (D8), audience tagging (D10). Drafted Capability Inventory (C) and Candidate Skill Inventory (D).
