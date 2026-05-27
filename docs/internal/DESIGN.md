# agent-skills-toolkit - Comprehensive Design Document

> **Committed design record.** Promoted from the project's gitignored working docs to `docs/internal/DESIGN.md` on 2026-05-26 (Phase 0, issue #2). This is the durable record of the vision and the v1 decision set (D1-D19). The normative, enforced rules live in the repository-root [`STANDARD.md`](../../STANDARD.md), which is the canonical pair to this document; where the two ever diverge, `STANDARD.md` wins.
>
> **Decision graduation.** The inline decision record (D1-D19) is captured here as a single consolidated document. At Phase 4, once the `decision` skill exists, these graduate into individually numbered MADR ADRs under [`docs/internal/decisions/`](./decisions/) (per decision Q-C). Until then, this file is the authoritative decision record.
>
> **Stale links note.** Some in-body cross-links below point at working-doc filenames (for example `STANDARD.draft.md`, the working-docs `README.md` index) that live in the gitignored working area and are not part of the committed repository. They are retained as historical provenance; follow `STANDARD.md` at the repo root for anything normative.

> Version 0.8 (2026-05-25). **This is the consolidated master - read this one.**
> Canonical pair: this doc + `STANDARD.draft.md` (v0.5). Secondary: `builder-skills-catalog.md` (roadmap inventory). Superseded working docs (`decision-guide`, `foundation-and-decisions`, `discovery-integration`, `architectural-approach`) now live in `archive/`, retained for provenance.
> Status: design record, decision-complete for v1. Deferred items listed in Section 12.

## Table of contents
1. Vision
2. Positioning and the wedge
3. Strategy: the Blend
4. Architecture: Approach B (self-hosting modular)
5. The Advanced Skill Library Standard (the spine)
6. Cross-agent support
7. The v1 toolkit
8. Builder catalog (the roadmap)
9. Cross-cutting decisions
10. Competitive landscape
11. Decision record
12. Open and deferred items
13. Next steps

---

## 1. Vision

`agent-skills-toolkit` is a standalone, public, open-source plugin in the `product-on-purpose` marketplace. Its job is to let anyone **author, maintain, iterate, and scale a plugin into a best-in-class, advanced, multi-agent skill library** - one that goes beyond a flat collection of standalone skills by using session-lifecycle hooks, chained skills/workflows, chain contracts, subagents, governance, and CI.

It is completely separate from `pm-skills` (which is a reference implementation to study, never a dependency). It targets **Claude Code and OpenAI Codex as first-class**, and stays compatible with the broader agentskills.io ecosystem (~50 agents) at its base tier.

**Terminology (two axes).** The vocabulary is strict because two independent axes never mix:

*Structure - what a thing physically IS:*
- *Skill* - one `SKILL.md`. The atomic capability.
- *Component* - any single building block: a skill, command, subagent, hook, workflow, chain contract, or MCP server. The **unit of reuse** (usable standalone in any repo, no buy-in).
- *Plugin* - a package of components with a manifest and a version; the installable artifact. The **unit of release**, and the thing that **carries the version**. This is the ecosystem's real unit.
- *Workspace* - a directory holding several plugins developed together (e.g., `product-on-purpose/`). Not installable.
- *Marketplace* - a catalog that lists plugins for discovery/install. Separate from the plugins it lists.

*Quality - how GOOD a plugin is, per the Standard:*
- *Skill library* - **not a separate artifact.** The designation for a plugin that conforms to this Standard, graded Bronze/Silver/Gold. "Library" is a grade, not a thing; an *advanced skill library* is a plugin that reaches the high tiers.

The path is **loose components -> plugin -> skill library** (a pile, then packaged + versioned, then governed to the Standard). `pm-skills` is a plugin that is also a skill library. There is exactly one **plugin (release) version**, carried on the plugin manifest; individual components also carry their own component versions, which roll up into it (§5.5 / Standard §7.4).

## 2. Positioning and the wedge

The market has many **single-skill / single-plugin tools** (Anthropic's `skill-creator` and `plugin-dev`, `skills-ref`, Plugin Creator, Pulser) and many **curated collections** (VoltAgent, Jamie-BitFlight/claude_skills, awesome-* lists). None of them own:

1. **The whole plugin as the governed unit** - governance across all of a plugin's components (counts, cross-references, chain contracts, aggregate audit, release gates), not one skill at a time.
2. **Multi-agent emission** - one source emitting + validating both Claude and Codex formats (collections fake this via duplication).
3. **Advanced patterns first-class** - hooks, chained workflows, chain contracts, session lifecycle.
4. **Plugin-scale governance** - backlog, samples bar, per-component history, versioning policy, deprecation.
5. **A self-hosting reference** - a toolkit that is itself a CI-verified, Gold-tier example of its own Standard.

That gap is the wedge. The unit of credibility is "does this define and prove how to govern a whole plugin into an advanced skill library," not skill count.

## 3. Strategy: the Blend

We ship neither a pure methodology document nor an unbounded everything-at-once toolkit. We ship the **Blend**:
- **Comprehensive Standard + roadmap catalog** - fully specified up front (the durable, defensible artifact).
- **Comprehensive, foundations-sequenced v1 code** - a self-proving core built first (Standard, anatomy, frontmatter contract, naming/prefix, `evaluate` + script suite, self-hosting CI), then the `build-*` creators, then governance/release. Breadth is additive within that locked frame.
- **A bounded deferral line** - the long-tail builders, multi-tier eval, docs site, and conformance badges are roadmap, not v1 (Section 7.1 "Deferred").

Rationale: a versioned Standard is the durable, defensible artifact (convention-as-deliverable, like Conventional Commits / semver), while a self-hosting reference repo provides the working proof a pure document lacks. v1 is comprehensive but ordered foundations-first so the toolkit is self-valid at every milestone, not only at the end. What stays deferred (coalition scale, long-tail components) is revisited after v1 based on reception and maintainer energy.

## 4. Architecture: Approach B (self-hosting modular)

One plugin, organized around a versioned Standard, **built to its own Standard**:
- `STANDARD.md` is the spine; every tool enforces a clause of it.
- Capability bundles (conceptual): author / validate / patterns / iterate / release + advise.
- The plugin is **self-hosting**: it ships its own hooks, chain contracts, and CI that validates the toolkit against the Standard. The repo is the worked example.

### 4.1 Design principles (the rules that shaped the toolkit)
1. **A la carte adoption.** Any one piece is usable without the rest. `build-skill` works inside an existing plugin with no `init-plugin`, no tier buy-in. (Mirrors the portfolio's "pull one piece without inheriting the rest.") Creators MUST NOT assume the full anatomy exists; they create the component and *offer*, never impose, the surrounding scaffold.
2. **Collapse uniform analysis; keep authoring per-type.** Assessment logic is uniform across component types (rules are data), so it is one generic skill (`evaluate`). Authoring expertise forks hard by type (a great skill vs subagent vs hook is different knowledge), so creation AND improvement stay per-type (`build-<type>` with `create` + `improve` modes).
3. **Deterministic where objective; LLM where judgment.** Conformance, portability, and security are objective -> deterministic scripts (CI-safe, no LLM). Domain-fit, beginner-approachability, and output quality are judgment -> LLM (reviewer lenses, quality-grader).
4. **One intelligent dispatcher over N, with deterministic machinery beneath.** A natural-language front-end (`evaluate`) scopes a request and routes to shared deterministic scripts - which CI also calls directly. Humans/agents get conversational UX; CI gets reproducible gates, from one set of checks.

## 5. The Advanced Skill Library Standard (the spine)

Normative (RFC-2119) document; full text in `STANDARD.draft.md`. Structure:

### 5.1 Principles
Composability; instruction budget (~150-200 instructions); progressive disclosure; agent-native; portable-by-default/advanced-by-choice; self-evidence.

### 5.2 Conformance tiers (by format portability)
The intuition: a skill written as plain `SKILL.md` runs on ~50 agents unchanged (Universal). A subagent or plugin expresses the *same idea* on Claude and Codex but in *different files*, so it must be emitted per agent (Convergent). Hooks and self-hosting CI are deep and often agent-specific (Advanced). So the tiers are not arbitrary levels - they fall out of *how portable each artifact's file actually is*. The same ladder doubles as the beginner-to-advanced path and the conformance grade.

| Tier | Name | Contains | Portability |
|---|---|---|---|
| Bronze | Universal | agentskills.io skills, references, AGENTS.md, MCP | Same files run on ~50 agents |
| Silver | Convergent | subagents, plugin packaging, commands, workflows, chain contracts | Same concept, emitted per `--agent-target` |
| Gold | Advanced | hooks, output styles, statusline, self-hosting CI | Often agent-specific |
Tiers double as the beginner->advanced ladder and the conformance grading. Declared via the agentskills.io `compatibility` field + the plugin manifest (`library.json`).

### 5.3 Components
Specs for: skill, command, subagent, workflow, hook, chain contract, **MCP server, and AGENTS.md** - each with purpose, structure, fields, per-agent format, validation rules, tier (MCP + AGENTS.md added in Std §3.9-3.10 so the v1 `build-mcp` and `build-agents-md` builders have normative targets). Plus recognized-but-not-yet-specced layers (roadmap): LSP, monitors, channels, themes, output styles, CLAUDE.md.

### 5.4 Frontmatter contract (all components)
agentskills.io fields for skills (`name` <=64 matching dir; `description` <=1024; optional `license`, `compatibility`, `metadata`, `allowed-tools`) plus a cross-component contract for commands/subagents/hooks/workflows, plus Claude-specific skill behaviors (`disable-model-invocation`, `user-invocable`, `context: fork`, `agent`, `arguments`). Conventional metadata keys: `version`, `updated`, `tier`, `audience`, `category`, `agent-targets`, `status`, `deprecated-by`, `remove-in`.

### 5.5 Lifecycle and governance
- **Backlog:** two backlogs - new-component (with a "why gate") and enhancement - as structured markdown in `docs/internal/backlog/`.
- **Samples:** each skill SHOULD ship >=3 golden + >=1 anti-example; drift on any present sample is a CI error.
- **Per-component history:** frontmatter `version` (machine pointer) + co-located `HISTORY.md` (human record); must not contradict the plugin CHANGELOG.
- **Versioning policy:** semver, one version on the plugin manifest. The plugin's version bump = the largest component bump since the last release (component MAJOR -> plugin MAJOR, MINOR -> MINOR, PATCH -> PATCH), as a MUST. A component MAJOR includes breaking a chain contract.
- **Deprecation:** `status: deprecated` + `deprecated-by` + `remove-in`; removal is a plugin MAJOR.

### 5.6 Quality and discoverability
Description/triggering bar (3rd person, what + when + trigger keywords, no angle brackets, no ALL-CAPS, 20+ `{query, should_trigger}` eval); naming/taxonomy incl. a **multi-agent name prefix** rule; eval coverage by tier.

### 5.7 Security
Least-privilege tool sets; hooks fail safe with actionable messages; no secrets in frontmatter/samples; 4-phase threat awareness (Creation/Distribution/Deployment/Execution).

### 5.8 Plugin anatomy (the conformant layout)
A fully-conformant plugin (an advanced skill library) looks like this:
```
<plugin>/
  STANDARD.md                    the Handbook
  library.json                   canonical cross-agent manifest (tier, agent-targets, prefix, component index)  [agent]  (source of truth)
  .claude-plugin/plugin.json     Claude manifest (generated from library.json)  [agent]
  plugin.json + config.toml      Codex emission (generated): native plugin.json; subagents = config.toml [agents.*] + agents/*.toml; skills surfaced for .agents/skills discovery  [agent]  (multi-agent)
  README.md  QUICKSTART.md       user docs              [human]
  AGENTS.md                      agent nav entry        [agent]
  INDEX.md                       human skill map        [human]
  CHANGELOG.md  RELEASE-NOTES.md full history + curated highlights
  manifest.generated.json        structured index (CI)  [agent]
  skills/<skill>/                SKILL.md · HISTORY.md · README.md(opt) · references/ · examples/{golden,anti} · output/ · evals/ · assets/
    (non-skill components: simple single-file form, OR rich co-located dir with own HISTORY/examples/evals - recommended at Gold)
    (dual representation: agent view = SKILL.md/frontmatter/AGENTS.md/manifest; human view = README/INDEX/docs - single source of truth, no duplication)
  agents/                        subagents + _chain-permitted.yaml (chain contract, when chaining)
  commands/                      slash commands (CC: commands/*.md; CX: backing skill)
  _workflows/                    multi-skill workflows (3.4)
  hooks/hooks.json
  templates/                     global templates (SKILL.md, ADR, eval-set, onboarding-questionnaire)
  docs/internal/                 committed maintainer governance:  decisions/ (MADR) · rfcs/ · backlog/
  docs/{tutorials,how-to,reference,explanation}/   public Diataxis docs  [human]
  scripts/                       CI-agnostic Node validators/generators
  .github/workflows/ci.yml       invokes scripts only
  _LOCAL/                        working scratch (GITIGNORED)
```
Agent-facing canonical = SKILL.md / AGENTS.md / frontmatter / manifest; human-facing = README / INDEX / docs. Single source of truth: data lives once; human views are generated or linked, never duplicated (dual-layer navigability).

### 5.9 Output contracts
A skill that generates artifacts declares an output contract (co-located `output/output-contract.md` or a frontmatter `output:` block) with: `format`, `frontmatter` (required keys on the produced artifact), `structure` (sections+order or JSON schema), `naming`, `location`; plus sample outputs in `output/`. For component-producing skills, the output contract IS the relevant component spec (Section 5.3).

### 5.10 CI and release
CI-agnostic scripts (run locally / any CI / from a skill); local/CI parity; results `error`/`warn` with `error` gating; semver release gates; Keep-a-Changelog + curated RELEASE-NOTES.

## 6. Cross-agent support

Claude Code and Codex are **concept-convergent, format-divergent**. Verified surface (Codex specifics confirmed against OpenAI's official Codex docs, 2026-05):

| Capability | Claude Code | Codex | Ecosystem | Format portable? |
|---|---|---|---|---|
| Skill (SKILL.md) | Y | Y (agentskills.io-compatible: `SKILL.md` + `scripts/`/`references/`/`assets/`; repo `.agents/skills/`, user `$HOME/.agents/skills`) | Y | **yes** |
| references/assets, AGENTS.md, MCP | Y | Y (AGENTS.md global + repo; MCP) | Y | yes |
| Subagent | Y (`agents/*.md`) | Y (declared in `config.toml` `[agents.<name>]` + per-role `agents/*.toml`) | ~ | no |
| Plugin / marketplace | Y | Y (Codex docs: *"plugins = distribution unit; skills are the authoring format"*) | ~ | no |
| Slash command | Y (`commands/*.md`) | **via skill** - Codex custom prompts (`~/.codex/prompts/*.md`, `/prompts:name`) are **deprecated in favor of skills** | ~ | no |
| Hooks | Y (31 events) | Y (~10 events) | N | no |
| Output styles | Y | **N - no Codex equivalent (Claude-only)** | N | no |
| Statusline | Y (custom script) | Y (built-in picker; `config.toml` `tui.status_line`, not scriptable) | N | no |
Implication: scaffolders/validators take an `--agent-target` (`claude`/`codex`/`both`). The universal tier needs no targeting; convergent tier does. Two confirmations matter for v1: (a) **Codex skills are agentskills.io-compatible**, so identical `SKILL.md` files run on both agents (the Universal tier is real, not aspirational); (b) the Codex command target is a **skill**, since custom prompts are deprecated - so no emitter is blocked on an unknown format.

## 7. The v1 toolkit

### 7.0 Worked walkthrough (how it feels to use)

Meet Dana, who wants a "research-skills" plugin for her team, usable on Claude Code and Codex, "solid but not heavy."

1. **Onboard.** Dana runs `init-plugin` in *hybrid* mode and types a paragraph about what she wants. It emits a tailored `onboarding-questionnaire.md` (pre-filled, with per-section **"Maintainer feedback"** + **"Agent response"** blocks), and from her filled-in answers proposes tier **Silver**, three starter skills, prefix `rs-`, then scaffolds `research-skills/` - the full anatomy (`plugin.json` + `.codex/`, `AGENTS.md`, `INDEX.md`, `docs/internal/{decisions,rfcs,backlog}`, `templates/`, skill dirs, `_chain-permitted.yaml`, `ci.yml`). It passes its own checks on the first run.

2. **Build a component.** `build-skill` interviews Dana briefly about "interview-synthesis," then emits a compliant `SKILL.md` (Claude) **and** the Codex form, with a description scored against the triggering bar and `references/`/`examples/` scaffolded.

3. **Assess.** `evaluate` the skill -> report (frontmatter OK, description 0.82, samples missing = warn). `evaluate` the whole plugin -> audit + "**Tier: Silver** (Gold blocked: no eval coverage)."

4. **Improve.** She reruns `build-skill` in its `improve` mode, which adds the missing samples and tightens triggering.

5. **Adopt an existing plugin.** She points `migrate` at her old `pm-research` repo (the `explorer` subagent maps the unknown structure, the `evaluator` scores it) -> "Bronze; to reach Silver: add `agent-targets`, chain contracts, a manifest." `migrate` then decouples its embedded marketplace and walks the bring-to-conformance steps. (Foreign-repo onboarding lives in `migrate`, not `evaluate`: an unknown repo is a discovery-first, different-evidence job.)

6. **Distribute.** `init-marketplace` stands up a *separate* catalog; she lists `research-skills` there - never embedding the marketplace in the plugin.

The point: à la carte for beginners (just `build-skill` inside any existing plugin), a full path for advanced maintainers - on a toolkit that is itself a Gold-tier, multi-agent plugin doing exactly this.

### 7.1 What ships (comprehensive v1, foundations-first build order)
- **STANDARD.md** (the Handbook) + **README** + **QUICKSTART**.
- **Skills (~17):**
  - Bootstrap: `init-plugin`, `init-marketplace`
  - Build (per-type, modes `create` + `improve`, multi-agent emission): `build-skill`, `build-subagent`, `build-command`, `build-hook`, `build-workflow`, `build-chain-contract`, `build-mcp`, `build-agents-md`, `build-output-style`
  - Assess: `evaluate` (conformance audit core + optional behavioral + optional review; operates on a known/local component or plugin; includes the marketplace-coupling check)
  - Advise: `capability-advisor`
  - Govern: `backlog` (intake/triage/prune modes), `decision` (adr/rfc modes)
  - Lifecycle: `release` (changelog/notes/version/gate modes), `migrate` (foreign-repo onboarding via `explorer` + decouple an embedded marketplace + bring-to-conformance)
- **Subagents (7):** `skill-author` (authoring); `reviewer` (judgment - domain + beginner lenses); `quality-grader` (judgment - behavioral output); `evaluator`, `explorer`, `file-search`, `file-ops` (context isolation). Governed by `_chain-permitted.yaml`.
- **Scripts (shared by `evaluate` and CI):** generators (`gen-index`, `gen-manifest`, `sync-agents-md`) + deterministic checks (frontmatter, structure, agentskills-compliance, anatomy/drift, chain-contracts, portability/Codex-emission, security, marketplace-coupling, tier-report).
- **Self-hosting at Gold:** the toolkit ships its own hooks + chain contracts + CI, emits/validates Codex, and passes its own Standard.
- **Codex emitter research (RESOLVED 2026-05-25, per OpenAI Codex docs):** all v1 emitters are unblocked.
  - **Skills, AGENTS.md, MCP, subagents, hooks** - confirmed Codex formats; emit directly. Codex skills are agentskills.io-compatible (`SKILL.md` + `scripts/`/`references/`/`assets/`), repo `.agents/skills/`. Codex subagents = `config.toml` `[agents.<name>]` + per-role `agents/*.toml`.
  - **`build-command`** - Codex custom prompts are **deprecated in favor of skills**, so the Codex command target emits a **skill with explicit invocation** (not the deprecated prompts format). The legacy prompt format MAY be offered behind a flag with a deprecation warning, but is not the default.
  - **`build-output-style`** - Codex has **no output-style feature**, so this builder is **Claude-only** (no Codex target exists, not "pending").
  - **`build-statusline`** (deferred) - when built, its Codex target writes `config.toml` `tui.status_line` (built-in picker), since Codex statuslines are config-based, not scripts.
  - Net: nothing is research-gated; no emitter ships against an unconfirmed format because no unconfirmed format remains.
- **Build order (anti-rework):** foundations first - Standard, plugin anatomy, frontmatter contract, naming/prefix, `evaluate` + the script suite, self-hosting CI - THEN the `build-*` creators, THEN governance/release. Breadth is additive within the locked frame.
- **Deferred (roadmap):** `build-statusline`; `deprecate`; LSP/monitors/channels/themes builders; multi-tier eval (Static/LLM-Judge/Monte-Carlo); docs site; conformance badges.

### 7.2 Full repo scaffold
(As in Section 5.8, populated with the v1 skills above.)

### 7.3 The `init-plugin` skill (bootstraps a plugin; 3 modes)
`init-plugin` scaffolds **one new plugin** (a plugin is the releasable artifact; a plugin that conforms to the Standard earns the grade "skill library"; e.g., `pm-skills`). It creates a new directory named after the plugin, or initializes the current directory - it does NOT nest under a `_library/` path, and it does NOT embed a marketplace (see marketplace separation, Section 9). Managing many plugins is the workspace + marketplace level (`product-on-purpose/` holds many; `agent-plugins` indexes them). Verb taxonomy: `init-` bootstraps a container (plugin, marketplace); `build-` creates a component. Modes:
- **`interview`:** live conversational Q&A -> synthesized config + scaffold.
- **`questionnaire`:** emits a structured Markdown questionnaire (a default template) with per-section "Maintainer feedback" + "Agent response" blocks; filled async, then processed.
- **`hybrid`:** maintainer gives context via chat; agent emits a tailored, pre-filled questionnaire MD with suggestions, retaining the feedback/response areas.
The questionnaire is a reusable `onboarding-questionnaire.template.md`; the maintainer/agent collaborative-doc pattern dogfoods how this project was built.

### 7.4 Self-hosting / Gold proof
A visitor can install the toolkit, point it at a repo, and watch it scaffold/audit/adopt - and watch the toolkit's own CI validate the toolkit against the Standard. That is the credibility argument for v1: the toolkit is its own best-in-class, Gold-tier, multi-agent example. (Prerequisite: the Standard's Gold criteria - now frozen as G1-G7 in Std §2.6 - must be fully satisfied before the toolkit claims Gold; see decision D2a.)

### 7.5 Skills: shape and the per-component lifecycle (LOCKED)
- **`build-<type>` are per-type, with two modes:** `create` (scaffold a new conformant component, per `--agent-target`) and `improve` (make an existing one better - both *complete* it, adding samples/references/output-contract, and *refine* it, eval-driven). Both modes draw on type-specific authoring expertise, which is why they live together per type rather than as generic skills.
- **`evaluate` is the generic assessment dispatcher** (Design Principle 2 + 4): natural-language front door, scope-detected (component / plugin), operating on a **known/local** plugin. Its uniform core is the **conformance audit** (deterministic scripts that `evaluate` and CI both call - CI needs no LLM); it adds an **optional behavioral mode** (delegated to `quality-grader`) and an **optional review mode** (delegated to `reviewer`). It asks for clarification when ambiguous and reports per-rule pass/warn/error + tier + remediation. The thing that is "collapsed" per Principle 2 is the conformance rule-engine (rules are uniform data); the judgment work is explicitly delegated, not absorbed. It absorbs what used to be `check` and `audit-library`. **Foreign-repo `adopt` is NOT part of `evaluate`** - it moves to `migrate` (an unknown repo with no manifest is a discovery-first, different-evidence job; see §7.5 migrate).
- **Per-component lifecycle: `build` (create) -> `evaluate` -> `improve`.** Assessment is generic (`evaluate`); authoring (create + improve) is per-type. This is the principle applied cleanly, not the old three-mode design (which wrongly made `check` a mode too).
- **`migrate` owns external work:** it onboards a foreign/unknown repo (using `explorer` to map structure and `evaluator` to score against the Standard), decouples an embedded marketplace, and walks bring-to-conformance. This gives `migrate` a coherent identity ("onboard + remediate external work") and keeps `evaluate` focused on known/local assessment.
- **Ops skills use modes** to avoid sprawl: `backlog` (intake/triage/prune), `decision` (adr/rfc), `release` (changelog/notes/version/gate).

### 7.6 Subagents (7), mapped to three jobs
- **Authoring:** `skill-author` - drives `build-*` flows.
- **Judgment (LLM):** `reviewer` - qualitative review via lenses (domain-fit, beginner-approachability); `quality-grader` - judges behavioral output against eval-set expectations.
- **Context isolation (token management):** `evaluator` - the focused worker `evaluate` (and `migrate`) delegates heavy whole-plugin conformance scans to; `explorer` - analyzes an unknown/foreign repo and returns a summary (the `migrate` onboarding path); `file-search`, `file-ops` - Haiku-backed mechanical delegation.
- The former "synthetic coalition" split by judgment type: **portability + security became deterministic scripts** in `evaluate`; **domain + beginner became `reviewer` lenses**. All subagents governed by `_chain-permitted.yaml`.

## 8. Builder catalog (the roadmap)

~60 candidate builder skills across 22+ functional areas, each tagged audience (B/A), agentskills.io coverage, and CC/CX/ECO. Areas: Plugin governance, Marketplace, Plugin packaging, Skill, Command, Subagent, Hook, Workflow, Chain contract, MCP, Instructions, References/assets, Output style, Statusline, Settings, Docs, CI/release, Eval/regression, Backlog/intake, Samples, Component history, Deprecation, Frontmatter/metadata, Onboarding/init, Internal structure & navigability, Templates, Output contracts, Advise. Full table in `builder-skills-catalog.md`. Builder families follow brainstorm -> create -> validate -> improve, realized as **modes** of one skill per component type, with a few standalone skills where triggering precision wins.

## 9. Cross-cutting decisions

- **Skill shape:** `build-<type>` are per-type with `create` + `improve` modes; `evaluate` is the generic assessment dispatcher (conformance core + optional delegated behavioral/review, known/local) while `migrate` owns foreign-repo onboarding; ops skills (`backlog`, `decision`, `release`) use modes. No per-component check mode (that is `evaluate`).
- **Naming / verb taxonomy:** `init-` bootstraps a container (`init-plugin`, `init-marketplace`); `build-` creates a component (`build-skill`, ...). Every component carries a short unique **prefix** for multi-agent disambiguation; token deferred (avoid `ast-` = abstract syntax tree; lean `askit-`).
- **Stack:** Node, single runtime, no triplets, CI-agnostic, wraps `skills-ref`.
- **Docs:** markdown-first, Diataxis-structured; defer a docs site.
- **Marketplace - separation rule (from lived pm-skills v3 pain):** a marketplace is a catalog, **separate from the plugins it lists**. A plugin MUST NOT embed a marketplace that lists itself. `init-plugin` produces a listable plugin with no embedded marketplace; `init-marketplace` builds the catalog separately; `evaluate` warns on the coupling anti-pattern; `migrate` decouples an already-coupled repo. Register a plugin in a marketplace at first tagged release.
- **Governance docs layout:** committed `docs/internal/{decisions (MADR), rfcs, backlog}`; public `docs/{tutorials,how-to,reference,explanation}` (Diataxis); gitignored `_LOCAL/` scratch.
- **Audience:** every skill tagged beginner/intermediate/advanced; beginner on-ramp = `build-skill` (a la carte) + references + `init-plugin` + `build-agents-md` + docs.

## 10. Competitive landscape

Direct tools (skill-creator, plugin-dev, Plugin Creator, skills-ref, Pulser) are single-unit and mostly Claude-only. Collections (VoltAgent, Jamie-BitFlight/claude_skills [36 skills + 8 agents - closest comprehensive third-party], wshobson/agents [eval framework], MintMCP [governance]) ship skills, not a standard for governing a whole plugin into a skill library. Distribution is handled by marketplaces + `ccpi`. No one owns the whole-plugin-governance / multi-agent / advanced-pattern wedge.

## 11. Decision record

| ID | Decision | Status | Resolution |
|---|---|---|---|
| Vision/Arch | What it is / Approach B | LOCKED | self-hosting modular; Standard is the spine |
| D3 | Separate from pm-skills | LOCKED | prior art only |
| D9 | agentskills.io compliance | LOCKED | wrap skills-ref; anchors Universal tier |
| D11 | Cross-agent | LOCKED | concept-convergent, format-divergent; `--agent-target` |
| D12 | Build vs interop | LOCKED | self-contained + portable; learn from, depend on neither |
| D13 | Lifecycle governance | LOCKED | backlog/samples/history/versioning/deprecation (Std S7) |
| D14 | Frontmatter/quality/security | LOCKED | Std 3.8, 4.4-4.5, 8, 9 |
| D15 | Sequencing | LOCKED | the Blend (ambition revisited post-v1) |
| B2 | Coalition | LOCKED | solo + synthetic coalition; split: portability/security -> deterministic scripts, domain/beginner -> `reviewer` lenses |
| B3 | Skill shape + lifecycle | LOCKED | `build-<type>` per-type with `create`+`improve` modes; `evaluate` = generic assessment dispatcher (conformance core + optional delegated behavioral/review; absorbs check/audit) on known/local; foreign-repo `adopt` moves to `migrate`; `evaluator` subagent. Per-component lifecycle build->evaluate->improve. (2026-05-25: evaluate scope refined per Codex - judgment modes delegated, adoption pulled out.) |
| B5 | Conformance tiers | LOCKED (model) | tier model fleshed out (Std 2.5); grading/badges deferred |
| D2 | v1 cut | LOCKED | comprehensive v1: ~17 skills + 7 subagents + script suite + Standard + self-hosting Gold; foundations-first. (2026-05-25: confirmed comprehensive over a thinner core; "thin" framing removed from §3. Risk acknowledged: maximal-ambition path - build order must keep the toolkit self-valid at every milestone.) |
| D2a | Self-hosting tier at v1 | LOCKED | Gold retained (not downgraded to Silver). PREREQUISITE MET (2026-05-25): the Gold requirement set is now frozen as G1-G7 in Std §2.6 (required-baseline vs deferred-elaboration line drawn), so the toolkit builds against a stable, fully-specified proof target (resolves Codex circularity). Remaining build-time work is implementing the G1-G7 checks, not deciding criteria. |
| D4 | Standard structure | LOCKED | tiers + components + governance + quality + security + anatomy |
| D5 | Tooling stack | LOCKED | Node single-runtime, CI-agnostic, wraps skills-ref |
| D6 | Bundle taxonomy | LOCKED | conceptual: author/validate/patterns/iterate/release + advise |
| D7 | Docs | LOCKED | markdown-first + Diataxis; defer site |
| D8 | Marketplace timing + separation | LOCKED | marketplace separate from plugins (no embedded self-listing); register at first tagged release |
| D10 | Audience | LOCKED | tag all skills; beginner on-ramp = `build-skill` a la carte |
| D16 | Dual-layer navigability | LOCKED | adopt |
| Terminology | plugin vs library (two axes) | LOCKED | **Structure** (what it is): component (unit of reuse) < plugin (unit of release, holds the one version) < workspace; marketplace catalogs plugins. **Quality** (how good): "skill library" = a plugin conforming to the Standard, graded Bronze/Silver/Gold - a grade, NOT a separate artifact. Path: loose components -> plugin -> skill library. (2026-05-25: sharpened from "lead with plugin" to the strict two-axis model; resolves plugin/library muddiness.) |
| Naming | verb taxonomy | LOCKED | `init-` = container, `build-` = component; per-component prefix (token deferred) |
| D18 | Manifest model | LOCKED | canonical `library.json` holds the Standard's cross-agent metadata (tier, agent-targets, component index, prefix); native manifests (`.claude-plugin/plugin.json`, Codex `plugin.json`) are GENERATED from it. (2026-05-25, per Codex + §10.3 single-source-of-truth.) Resolves the unstable-manifest finding. |
| D19 | Codex emitter targets | LOCKED | Research-resolved against OpenAI Codex docs (2026-05). Codex skills are agentskills.io-compatible (repo `.agents/skills/`); subagents via `config.toml` `[agents.*]` + `agents/*.toml`; hooks/MCP/AGENTS.md confirmed. **Custom prompts deprecated -> `build-command` Codex target = a skill** (legacy prompt behind a flag only). **No Codex output-style -> `build-output-style` is Claude-only.** Codex statusline is config-based (`tui.status_line`). Nothing remains research-gated. |
| Layout | history / backlog / governance | LOCKED | frontmatter `version` + `HISTORY.md`; committed `docs/internal/{decisions(MADR),rfcs,backlog}`; gitignored `_LOCAL/` |
| init-plugin | onboarding feature | LOCKED | 3 modes (interview/questionnaire/hybrid) + `onboarding-questionnaire.template.md` |
| Principles | design principles | LOCKED | a la carte; collapse-analysis/keep-authoring-per-type; deterministic-where-objective; one-dispatcher (DESIGN §4.1) |
| D17 | Name prefix token | DEFERRED | lean `askit-`; avoid `ast-` |

## 12. Open and deferred items
- **All design decisions LOCKED** as of 2026-05-25.
- **Deferred (roadmap):** D17 prefix token (lean `askit-`); `build-statusline`; `deprecate`; long-tail component builders (LSP/monitors/channels/themes); multi-tier eval (Static/LLM-Judge/Monte-Carlo); docs site; conformance badges.
- **Standard Appendix A - RESOLVED 2026-05-25:** Gold criteria frozen (G1-G7, Std §2.6); manifest model = canonical `library.json` + generated native manifests (D18); sample count (>=3 golden + >=1 anti); Node baseline (>=20 LTS); version-propagation (one plugin version = max component bump, MUST); description-scoring rubric (0.7 warn threshold); tier-reporting format (machine + human, keyed to G-IDs); backlog + history locations.
- **Standard Appendix A - RESOLVED 2026-05-25 (this round):** Codex formats researched (D19 - prompts deprecated so command target = skill; no Codex output-style so Claude-only; skills agentskills-compatible at `.agents/skills/`); `library.json` field schema pinned (Std §5); chain-contract MUST scope decided (Std §3.6/§2.2). Conformance **badges** remain deferred (v1 reports the tier, does not brand it).
- **All Standard Appendix A items are now resolved or explicitly deferred.** Two Codex-review judgment calls also resolved (F-02: minimal `library.json` required at all tiers; F-05: MCP + AGENTS.md specs added). **One item intentionally carried to the release plan:** F-07 - define milestone-validity criteria (which tier the toolkit self-validates at each milestone) for the comprehensive-v1 + Gold build. Remaining work is the release plan + promotion to git, not open design questions.

## 13. Next steps
1. Finalize the Standard's Appendix A open items.
2. Promote `STANDARD.draft.md` to repo-root `STANDARD.md` and this design to the committed design record.
3. Invoke `writing-plans` to turn this into a phased, foundations-first implementation plan for v1.
4. Build v1, dogfooding the Standard; let reception drive the roadmap.

## Change log
- 2026-05-25 v0.8: Codex-review judgment calls F-02 + F-05 resolved (F-07 carried to the release plan). **F-02:** a minimal `library.json` (`name`/`version`/`tier`) is now REQUIRED at every tier including Bronze (Std §5/§2.1/§2.5) - it is the artifact that makes a directory a *plugin*; a folder of skills without it is "loose components" (still usable a la carte). **F-05:** added normative component specs for **MCP server** (Std §3.9) and **AGENTS.md** (Std §3.10) so the v1 `build-mcp` and `build-agents-md` builders have targets; §5.3 updated. F-07 (milestone-validity criteria for the comprehensive-v1+Gold build) is a release-plan item, not a doc fix.
- 2026-05-25 v0.7: Second Codex review (follow-up) - clear-cut consistency fixes applied. F-09 "exactly one *plugin* version" wording (§1/Std §0); F-08 added `commands/`/`_workflows/`/chain-contract paths to the anatomies (§5.8/Std §10.1); F-04 reconciled Codex emission paths to one contract (config.toml `[agents.*]` + `agents/*.toml`, native `plugin.json`, `.agents/skills` discovery), residual packaging note in Appendix A; F-01 clarified `library.json` is authored SoT not generated (Std §2.6 G4); F-03 history rule made coherent (version all tiers; HISTORY required Silver+, recommended Bronze; match-when-present); F-06 added command parity note (Std §3.2); F-10 added 20+ trigger-eval SHOULD (Std §8.3). Three findings flagged for decision (F-02 Bronze manifest/version, F-05 build-mcp/build-agents-md specs, F-07 milestone-validity criteria). No CRITICAL/HIGH-strategy findings - the wedge held.
- 2026-05-25 v0.6: Final Appendix A items resolved (research-backed). **Codex formats researched against OpenAI Codex docs (D19, §6):** Codex skills are agentskills.io-compatible (repo `.agents/skills/`) confirming the Universal tier; custom prompts are **deprecated in favor of skills** so `build-command`'s Codex target is a skill; **no Codex output-style** so `build-output-style` is Claude-only; Codex statusline is config-based; subagents via `config.toml` `[agents.*]`. The §7.1 emitter research-gate is fully lifted - nothing remains gated. (External validation: OpenAI's own docs call plugins the "distribution unit" and skills the "authoring format", matching our two-axis terminology.) **`library.json` field schema pinned** (Std §5.1). **Chain contracts = conditional MUST** (required iff chaining is used; Std §3.6). All Standard Appendix A items now resolved or explicitly deferred (badges).
- 2026-05-25 v0.5: Terminology deep-dive + Standard finalization calls. **Two-axis terminology locked** (§1, decision record): *structure* (component = unit of reuse < plugin = unit of release, holds the one version < workspace; marketplace catalogs plugins) vs *quality* ("skill library" = a plugin conforming to the Standard, graded Bronze/Silver/Gold - a grade, not an artifact). Swept §2/§5/§7.3/§10 + anatomy so structural references say "plugin" and only grade references say "library"; renamed §5.8 "Library anatomy" -> "Plugin anatomy", root `library/` -> `<plugin>/`. **Item 3 (version-propagation) applied** (§5.5): one version on the plugin manifest, bump = max component bump (MUST). Standard finalization quick-calls applied (companion STANDARD v0.4): sample count (>=3 golden + >=1 anti), Node >=20 LTS, description rubric (0.7 warn), tier-reporting format (machine+human, G-ID-keyed), Gold criteria frozen (G1-G7). §12 open list trimmed to what genuinely remains (Codex formats research, `library.json` field schema, chain-contract MUST question).
- 2026-05-25 v0.4: Codex-review resolutions (groups A + B).
  - Group A (consistency): §7.0 `improve` now reads as a `build-skill` mode; stale `auditor` -> `evaluator`; backlog unified to `docs/internal/backlog/` (§5.5). Companion Standard fix: `version` required at all tiers; backlog under `docs/internal/backlog/`.
  - Group B (decisions): **v1 stays comprehensive** - removed the contradictory "thin" framing from §3, reframed as comprehensive + foundations-sequenced + bounded deferral line. **Self-hosting stays Gold** (D2a) with a hard prerequisite to freeze the §2.5 Gold criteria before build start. **`evaluate` refined** (B3): conformance-core dispatcher with optional delegated behavioral/review on known/local; foreign-repo `adopt` moved to `migrate` (§7.0/§7.1/§7.5/§7.6/§9). **Manifest model locked** (D18): canonical `library.json` + generated native manifests (§5.8/§12). **Codex emitters research-gated** (§7.1): `build-command`/`build-output-style` Codex emission waits on confirmed formats; Claude target still ships.
- 2026-05-25 v0.3: Consolidation pass. All decisions LOCKED. Terminology -> lead with "plugin". v1 reconciled: `init-plugin`/`init-marketplace` + 9 `build-*` creators (modes `create`+`improve`) + `evaluate` (generic, absorbs check/audit/adopt) + `capability-advisor` + `backlog`/`decision` (govern) + `release`/`migrate` (lifecycle); ~17 skills. 7 subagents (skill-author, reviewer, quality-grader, evaluator, explorer, file-search, file-ops). Coalition split into deterministic checks + reviewer lenses. Added §4.1 Design Principles (a la carte; collapse-analysis/keep-authoring-per-type; deterministic-where-objective; one-dispatcher). Marketplace separation rule + anti-pattern. Verb taxonomy (init-/build-). Reversed earlier missteps: `improve` is a `build-<type>` mode (not generic); subagent is `evaluator` (not `auditor`).
- 2026-05-24 v0.2: Review-round updates. Locked B2 (solo + synthetic coalition), B3 (unified validate/audit), B5 (tier model fleshed), comprehensive v1 (foundations-first), `docs/internal/` layout. Strengthened: version required per component; per-component anatomy + two-form rule + dual-representation; concrete output-contract structure; terminology (library=plugin/workspace/marketplace); `init` initializes a library. Added human layer: worked walkthrough (7.0) + tier intuition prose.
- 2026-05-24 v0.1: Consolidated master created from the six working docs.
