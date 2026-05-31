# Discovery Integration: Prior Docs vs. Current Foundation

> **ARCHIVAL (2026-05-25):** a one-time gap analysis whose conclusions are folded into [`agent-skills-toolkit-DESIGN.md`](../agent-skills-toolkit-DESIGN.md) (v0.6) + [`STANDARD.draft.md`](../STANDARD.draft.md) (v0.5). Retained for provenance only. Index: [`../README.md`](../README.md).
> **Terminology note:** the canonical docs now use a strict two-axis model ("plugin" = artifact/release unit; "skill library" = the grade a plugin earns). Where this doc says "library" structurally, read "plugin."
>
> Working draft v0.1 (2026-05-24). Maps three prior discovery documents against the foundation. Companion: [`foundation-and-decisions.md`](./foundation-and-decisions.md).

## Sources reviewed
1. **architecture-guide** (`chatgpt_marketplace_plugin_skill_architecture_guide.md`) - a full layered architecture guide of the Claude Code ecosystem.
2. **strategy-brief** (`claude_skill-ecosystem-toolkit-strategy-brief.md`, Apr 16 2026) - market + sequencing strategy; argues methodology-first.
3. **discovery-questions** (`claude_skill-plugin-discovery-questions.md` v0.2, May 23 2026) - ~175-question discovery set with a research snapshot and repo strawman.

## Verdict
They add substantial material in four buckets: (A) missing capability layers, (B) a major missing framing (dual-layer navigability), (C) a strategic sequencing tension that needs your decision, and (D) many enrichments to existing sections. They largely confirm our architecture (B + self-hosting + versioned Standard) and our governance additions, while exposing real gaps.

---

## Part 1: New material, mapped to our docs

| New item (source) | What it is | Where it lands | Priority |
|---|---|---|---|
| LSP servers, Monitors, Channels, Themes (architecture-guide 4.6-4.10) | Capability layers we never inventoried | Capability Inventory (Part C); catalog new areas | HIGH |
| CLAUDE.md as an always-on instruction layer (architecture-guide 4.1) | Distinct from AGENTS.md; the persistent context layer | Capability Inventory; Standard component note | MED |
| Rich skill frontmatter: `disable-model-invocation`, `user-invocable`, `context: fork`, `agent`, `arguments` (architecture-guide 4.2; discovery 1.4) | Claude Code skill behaviors beyond agentskills.io | Standard 3.1/3.8 frontmatter contract | HIGH |
| **Dual-layer navigability** (discovery 3) | Plugin-level vs skill-level truth, navigable by humans AND agents; INDEX.md, AGENTS.md, generated manifest; no-duplication / no-orphan rules | New Standard section; reshapes repo skeleton | **HIGH** |
| Config scopes: user / project / local / managed (architecture-guide 7) | Where a capability lives and who gets it | Standard new subsection | MED |
| Multi-tier eval: Static / LLM-Judge / Monte-Carlo (discovery 1.6, Q122) | Eval maturity model (wshobson/agents) | Standard 8.3; iterate bundle | MED |
| Description craft specifics (discovery 1.3, Group G) | 3rd person, what+when, positive/negative triggers, 100-200 words, avoid angle brackets, avoid ALL CAPS, 20+ {query,should_trigger} eval, improve-loop | Standard 8.1; `description-scorer` | MED |
| Diataxis docs framework (discovery 1.8, Group P) | tutorial/how-to/reference/explanation | D7 docs; Standard docs note | MED |
| Security 4-phase lifecycle: Creation/Distribution/Deployment/Execution (discovery 1.9, Group U) | Threat model per phase; Bash-bypass gap | Standard 9 (expand) | MED |
| AAIF / Linux Foundation governance (discovery 1.1) | agentskills.io is AAIF-governed; MCP, AGENTS.md, Goose are AAIF projects | Foundation context; Standard 6 (track upstream) | MED |
| Conventional Commits + release-please/Changesets + tag schemes (discovery 1.7, Group N) | Concrete release tooling conventions | Standard 4/7; release bundle | MED |
| JSON Schemas on schemastore for plugin/marketplace manifests (discovery Group R, refs) | Existing schemas to validate against | validate bundle; Standard 5 | MED |
| Marketplace strict vs non-strict + version behavior (architecture-guide 6; discovery 1.2) | plugin.json wins over marketplace entry; SHA-as-version | Standard 5; marketplace area | MED |
| Namespace/prefix naming (discovery Q21) | e.g., `jp-pm-okr-drafter` | Standard 8.2 naming | LOW-MED |
| Cross-harness portability test matrix (discovery Group T) | Test portability, do not just claim it | Standard 4; tier model | MED |
| Meta-library recursion trap (discovery Q5) | "skills that build skills" risk of self-dependence | Foundation principle; self-hosting already mitigates | MED |
| Anti-patterns + maturity path + decision heuristics (architecture-guide 9,10,13,15) | "where should a feature live" decision guide | Could become a toolkit skill (`capability-advisor` / a decision-guide skill) | MED |

---

## Part 2: The strategic tension (NEEDS YOUR DECISION)

The **strategy-brief** argues, with evidence, that the highest-leverage contribution is a **methodology document** (a "Skill Library Maintainer's Handbook"), and that **all tooling should be deferred** until the methodology is published and its reception validated. Its 80/20: ship the methodology in 6-8 weeks (Approach A), then decide on a composable toolkit (B) or coalition (C). Reasoning: convention-as-deliverable precedents (Conventional Commits, Keep a Changelog, semver) shaped whole industries as documents; methodology is ~5x value/hour vs tooling; solo toolkit work is the highest burnout risk.

This is in **tension with your stated direction**: a comprehensive, batteries-included, public-from-day-one *toolkit*.

How to reconcile (my read):
- These are less opposed than they look. **Our Approach B already makes a versioned Standard the spine.** The brief is really an argument about **sequencing and the v1 cut**: lead with the Standard (which doubles as the "Handbook"), ship only a thin self-hosting slice of tooling at first, and let reception decide how far to build.
- That is a very natural v1 definition: **v1 = the Standard + the self-hosting reference + a minimal author/validate slice**, with the broad builder catalog as the post-validation roadmap.
- The brief also raises **coalition** (Approach C) as the highest-ceiling path. That is a genuinely different operating model (recruit 3-5 cross-domain maintainers) you have not yet weighed.

Decision needed: does the brief change your sequencing (Standard/methodology-first, thin tooling) or do you hold the comprehensive-toolkit-v1 line? Tracked as **D15**.

---

## Part 3: Conflicts and alignments to resolve

- **Per-component changelog naming.** Discovery strawman uses per-skill `CHANGELOG.md`; we chose `HISTORY.md` + frontmatter `version`. Align on one name. The dual-layer doc's anti-duplication rule (library vs skill changelog must not restate) reinforces our 7.3 consistency rule.
- **Tier model.** Our Universal/Convergent/Advanced (by format portability) and the discovery doc's AAIF-strict-vs-extended posture are complementary; fold the discovery doc's "strict adherence vs additive extension" framing into Standard 2.4 / 6.
- **Repo skeleton.** Discovery strawman is richer than ours (per-skill `examples/`, `evals/`, `decisions/`, top-level `INDEX.md`, `manifest.generated.json`, `rfcs/`, `tools/`). Adopt the parts that serve the dual-layer model.
- **agentskills.io minimalism confirmed.** Both discovery doc and our research agree the spec is "deliciously tiny"; the differentiation is the agent-readable extension layer (exactly our wedge).

---

## Part 4: Proposed expansions per doc

**STANDARD.draft.md**
- Add capability coverage for LSP, monitors, channels, themes, output styles, CLAUDE.md (as recognized component types, with tier + portability).
- Expand 3.8 frontmatter to include Claude Code skill behaviors (`disable-model-invocation`, `user-invocable`, `context: fork`, `agent`, `arguments`).
- New section: **Dual-layer navigability** (plugin-level vs skill-level truth; AGENTS.md + INDEX.md + generated manifest; single-source-of-truth, no-orphan, no-duplication rules; agent-traversal conventions).
- New subsection: configuration scopes (user/project/local/managed).
- Expand 8.1 (description craft specifics + eval-set), 8.3 (multi-tier eval), 9 (4-phase security lifecycle + Bash-bypass note), 6 (AAIF upstream-tracking).

**builder-skills-catalog.md**
- New areas: LSP, Monitors, Channels, Themes, CLAUDE.md/instructions (distinct from AGENTS.md), Navigability (INDEX/manifest generators), Decision-guide ("where should this live").
- New builder skills: `lsp-config-creator`, `monitor-creator`, `channel-creator`, `theme-creator`, `index-generator`, `manifest-generator`, `decision-guide` (capability placement), `description-eval-set` (trigger eval pairs).

**foundation-and-decisions.md**
- Capability Inventory (Part C): add LSP, monitors, channels, themes, output styles, CLAUDE.md rows.
- Part H: add competitors found here - Jamie-BitFlight/claude_skills (36 skills, 8 agents; closest third-party comprehensive toolkit), wshobson/agents (eval framework), MintMCP (governance), plus tools cclint/skilllint/release-please/Changesets/skill-semver.
- New D15 (methodology-first sequencing) and D16 (dual-layer navigability adoption).

---

## Part 5: New prior-art / competitors (for Part H)
- **Jamie-BitFlight/claude_skills** - closest third-party comprehensive toolkit (36 skills, 8 agents, plugin-creator). Direct competitor; study closely.
- **wshobson/agents** - three-layer eval framework + scheduled "skill garden" drift detection.
- **MintMCP** - commercial governance/audit layer (enterprise).
- Tooling: `cclint`, `skilllint`, `release-please`, `Changesets`, `skill-semver`, JSON Schemas on schemastore.
- Community marketplaces: claudemarketplaces.com, Smithery, LobeHub, SkillsMP, skills.rest, claude-plugins.dev.

## Part 6: Recommended next actions
1. **Resolve D15 first** (methodology-first sequencing vs comprehensive-toolkit-v1) - it determines how much of Parts 4 we build vs document now.
2. Then fold HIGH-priority additions (dual-layer navigability, missing capability layers, frontmatter) into the Standard.
3. Add MED enrichments (eval tiers, description craft, Diataxis, security phases, scopes) in a second pass.
4. Update Part H competitors and Capability Inventory.

## Change log
- 2026-05-24 v0.1: Created from review of the three initial-discovery docs.
