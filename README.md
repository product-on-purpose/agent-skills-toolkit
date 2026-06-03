<a id="readme-top"></a>

<div align="center">

# [agent-skills-toolkit](https://github.com/product-on-purpose/agent-skills-toolkit)

**Start, grow, govern, and level up an advanced cross-agent plugin over its whole lifecycle - climbing a Bronze / Silver / Gold standard, with a portable gate that proves the climb. For Claude Code and Codex.**

Most skill collections are a flat, single-agent, ungoverned pile. This is the Standard that defines what a best-in-class, multi-agent skill library actually is, plus the portable tooling that authors components, grades a plugin against the Standard, and emits each component in the right format for each agent. The repository is built to its own Standard and self-validates at Gold in CI: it is meant to be the proof.

<p>
  <a href="#install"><strong>Install</strong></a>
  &nbsp;&middot;&nbsp;
  <a href="#what-it-is"><strong>What it is</strong></a>
  &nbsp;&middot;&nbsp;
  <a href="#use-it"><strong>Use it</strong></a>
  &nbsp;&middot;&nbsp;
  <a href="#the-tier-model"><strong>Tiers</strong></a>
  &nbsp;&middot;&nbsp;
  <a href="#the-catalog"><strong>Catalog</strong></a>
  &nbsp;&middot;&nbsp;
  <a href="https://product-on-purpose.github.io/agent-skills-toolkit/"><strong>Live docs</strong></a>
</p>

<p>
  <a href="https://github.com/product-on-purpose/agent-skills-toolkit/issues/new?labels=bug">Report a Bug</a>
  &nbsp;&middot;&nbsp;
  <a href="https://github.com/product-on-purpose/agent-skills-toolkit/issues/new?labels=enhancement">Request a Feature</a>
  &nbsp;&middot;&nbsp;
  <a href="https://product-on-purpose.github.io/agent-skills-toolkit/">Read the Docs</a>
</p>

<p>
  <img src="https://img.shields.io/badge/status-active-success?style=flat-square" alt="Status: Active">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square" alt="License: Apache-2.0"></a>
  <img src="https://img.shields.io/badge/version-1.0.0-blue?style=flat-square" alt="Version 1.0.0">
  <img src="https://img.shields.io/badge/tier-Gold%20(Advanced)-yellow?style=flat-square" alt="Tier: Gold (Advanced)">
  <a href="#the-catalog"><img src="https://img.shields.io/badge/skills-23-brightgreen?style=flat-square" alt="Skills: 23"></a>
  <img src="https://img.shields.io/badge/checks-25-brightgreen?style=flat-square" alt="Validation checks: 25">
  <a href="https://agentskills.io/specification"><img src="https://img.shields.io/badge/spec-agentskills.io-orange?style=flat-square" alt="Agent Skills Spec"></a>
</p>

</div>

---

<details>
<summary><strong>Table of Contents</strong></summary>

- [Install](#install)
- [What it is](#what-it-is)
- [Use it](#use-it)
- [What makes it different](#what-makes-it-different)
- [The tier model](#the-tier-model)
- [The catalog](#the-catalog)
- [Find your way in](#find-your-way-in)
- [Documentation](#documentation)
- [Status](#status)
- [Terminology](#terminology)
- [Repository map](#repository-map)

</details>

## Install

```bash
# Add the marketplace once (by repo path)
/plugin marketplace add product-on-purpose/agent-plugins

# Install the toolkit (by marketplace identity)
/plugin install agent-skills-toolkit@product-on-purpose
```

You **add** the marketplace by its repo path and **install** by the marketplace identity (`@product-on-purpose`): the path is the address, the identity is the brand. The toolkit installs on Claude Code and Codex (it ships both native manifests). New here? Read [What it is](#what-it-is) first, then [Use it](#use-it).

<div align="right">(<a href="#readme-top">back to top</a>)</div>

## What it is

`agent-skills-toolkit` is two things working together, built for the **whole life of a plugin** - not just the moment you write a skill.

- **The [Advanced Skill Library Standard](STANDARD.md)** - a normative (RFC-2119) definition of what a best-in-class, multi-agent skill library is: components, conformance tiers, manifest, CI, and lifecycle. It is the bar you climb.
- **The toolkit** - skills, subagents, and portable Node validators that author every component type, grade a plugin against the Standard, and emit each component in the right format for each target agent (Claude Code and Codex). The validators run anywhere Node 22.12+ does, with a YAML parser as their only runtime dependency.

This is more than a skill builder. A single skill is where you start; the real work is **starting**, **growing**, **governing**, and **leveling up** a coherent, versioned plugin that works across more than one agent and holds together as it scales.

- **Start** - write your first skill, or scaffold a plugin from scratch: `askit-build-skill`, `askit-init-plugin`, `askit-init-marketplace`, or `askit-migrate` for an existing repo.
- **Grow** - add subagents, slash commands, MCP servers, hooks, workflows, chain contracts, output styles, status lines, and settings, through the `askit-build-*` family (emitted per agent).
- **Govern** - run the plugin over its lifetime: backlog with a why-gate, MADR decision records, releases, deprecations, templates, docs, and eval samples.
- **Level up** - climb Bronze to Silver to Gold by adding the machinery each tier certifies; a deterministic tier report names exactly what blocks the next rung.

The path is a flat pile of skills becoming a coherent, versioned **plugin** that conforms to a defined quality bar and works across more than one agent - and then keeps earning higher grades as it matures: **loose components into a plugin into a skill library.**

What it is, and is not:

- A **lifecycle toolkit** (start, grow, govern, level up a plugin), not a one-shot skill scaffolder.
- A **deterministic gate** that grades a whole library at once and reports the tier it earns, not a per-skill linter or style guide.
- **Cross-agent** from one canonical `library.json` emitted per agent (Claude Code and Codex), not a single-agent or Claude-only format.
- **Self-proving** (the repository validates itself against the Standard in CI), not an aspirational spec with no reference implementation.
- A **grade** a plugin earns (Bronze / Silver / Gold), not a separate artifact you install.

```mermaid
flowchart LR
    L["Loose components<br/>flat, single-agent, ungoverned"]
    B["Bronze (Universal)<br/>identical files, any agentskills.io agent"]
    S["Silver (Convergent)<br/>per-agent emission:<br/>subagents, commands, workflows"]
    G["Gold (Advanced)<br/>hooks, self-hosting CI, lifecycle,<br/>self-validating"]
    L --> B --> S --> G
    classDef bronze fill:#f3e9dc,stroke:#a97142,color:#111;
    classDef silver fill:#eceff1,stroke:#7c8a93,color:#111;
    classDef gold fill:#fff6da,stroke:#caa12a,color:#111;
    class B bronze;
    class S silver;
    class G gold;
```

### Two ways in, one ladder

The same tier ladder serves two audiences, and you can self-locate on it.

- **The beginner on-ramp.** Build your first agentskills.io skill, then scaffold it into a plugin that parses, self-describes, and runs unchanged on any compliant agent. The smallest commitment that turns a pile of skills into a gradeable, portable plugin: **Bronze**.
- **The advanced maintainer track.** Take a real multi-component plugin cross-agent with verified format parity, then make it self-proving with hooks, regression-covered chains, self-hosting CI, and a disciplined release and deprecation story: **Silver**, then **Gold**.

Because the tiers are monotonic, the beginner's first Bronze plugin is the exact foundation the advanced track builds on. Nobody starts over. The bar rises and the earlier work still counts.

## Use it

Once installed, grade a plugin by invoking the **`askit-evaluate`** skill - run the **`/askit-evaluate`** command, or just ask your agent "grade this plugin against the Standard." It runs the deterministic core and presents the tier, the burndown to the next tier, and per-rule remediation. Start a new plugin with `askit-init-plugin`, build any component with the `askit-build-*` family, and bring an existing repo up to the bar with `askit-migrate`.

Under the hood the same gate is a **portable script** you can run directly - in CI, a pre-commit hook, or a plain terminal, anywhere Node 22.12+ runs (one runtime dependency, a YAML parser). From a plugin's root:

```bash
node scripts/check.mjs              # the tier + what blocks the next one, on a real exit code
node scripts/tier-report.mjs --json # the same result as JSON for tooling
```

```
Tier: Advanced (no blockers detected)

0 error(s), 0 warning(s).
```

**Why a script, not only a skill:** a model can present the grade, but only a deterministic gate with a real exit code can run in CI and let a plugin **prove itself** (Gold `G2`) - the whole point of "a portable gate, not an LLM opinion." The skill is the door; the script is the engine, and both run the same checks.

<div align="right">(<a href="#readme-top">back to top</a>)</div>

## What makes it different

Cross-agent emission is increasingly common. The defensible, less-occupied position is **grading a whole library, deterministically, against a tier you can climb and verify**:

- **Library-level, not per-unit.** The gate grades the entire plugin - manifest, components, cross-agent emission, CI, and lifecycle - not one skill in isolation. The unit of governance is the library.
- **Deterministic, not vibes.** A portable Node gate with real exit codes, not an LLM opinion. Judgment-based evaluation (behavioral and qualitative) exists too, but it sits **beside** the gate as opt-in evidence and never decides a pass or fail.
- **Tiered and climbable.** Bronze, Silver, Gold are monotonic: each includes everything below it. The tier report hands back a burndown that names exactly what blocks the next tier, so the climb is a worklist, not a guess.
- **Cross-agent by construction.** One authored `library.json` is the single source of truth; the native per-agent manifests are generated from it, so Claude Code and Codex stay in lockstep.
- **Self-proving.** The repository is the Gold-grade reference implementation of its own Standard, and it runs that Standard against itself in CI.

<div align="right">(<a href="#readme-top">back to top</a>)</div>

## The tier model

A bare folder of agentskills.io skills is just **loose components**: the skills work a la carte, but the collection is not yet a plugin. The three tiers are the ladder that turns it into a best-in-class library, one rung at a time. They are **monotonic** - each tier includes everything below it - so a Bronze plugin grows into Silver and Gold without rework. The bar rises, and the earlier work still counts.

A tier is reported only when its checks actually pass; the tooling flags any claim above what is met. The spine is **25 checks** total (`U1-U11`, `S1-S8`, `G1-G6`); the Gold requirement `G7` is tier inclusion, satisfied structurally rather than by a separate check.

### At a glance

Three rungs, monotonic - each includes everything below it (per-tier detail follows):

- **Bronze - Universal (`U1-U11`, 11 checks).** Certifies identical, portable files that run unchanged on any agentskills.io agent. For the beginner on-ramp. Adds a minimal `library.json`, valid skill anatomy, and a description that clears the bar.
- **Silver - Convergent (`+ S1-S8`, 19).** Certifies the multi-agent machinery emitted in the right format for every target agent. For real multi-component plugins on both Claude and Codex. Adds subagents, commands, workflows, chain contracts, per-agent emission, and semver governance.
- **Gold - Advanced (`+ G1-G6`, 25).** Certifies that the plugin proves itself: deep lifecycle plus self-hosting CI. For maintainers running plugins at scale. Adds hooks, self-hosting CI, regression-covered chains, drift-checked generated docs, and a release and deprecation policy.

> **Read it as a climb.** Bronze makes a plugin *portable*. Silver makes it *genuinely cross-agent*. Gold makes it *self-proving*. Each rung is the floor the next one builds on.

### Bronze - Universal - the start line

> **Certifies:** the plugin parses and self-describes with portable, agent-agnostic files that run unchanged on any agentskills.io-compliant agent.

- **For:** beginners and first-time authors. The smallest commitment that makes a pile of skills a real plugin.
- **Requires (`U1-U11`):**
  - `U1` - a minimal `library.json` carrying at least `name`, `version`, and `tier`
  - `U2-U4` - valid agentskills.io skill anatomy and frontmatter, with each skill's name equal to its directory; a root `AGENTS.md` entrypoint is part of the required anatomy
  - `U5` - a description that clears the what-plus-when-plus-trigger quality bar
  - `U6-U7` - reference links that resolve, and an instruction-budget warning so context stays scarce
  - `U8-U10` - native-manifest and version agreement, plus the house no-em-dash / no-en-dash rule
  - `U11` - well-formed MCP entries that commit no secrets
- **Why it matters:** the manifest (`U1`) is the line between a reusable folder and a release unit that carries a version, so tooling can grade and version it. The description bar protects the one signal an agent uses to decide relevance; the reference-link and budget rules keep context scarce and progressively disclosed, which is how frontier models actually follow instructions.
- **Payoff:** a Bronze plugin is installable and behaves the same on Claude Code, Codex, and the broader agentskills.io ecosystem at once. Write once, run anywhere.

### Silver - Convergent - the multi-agent rung

> **Certifies:** the plugin adds the multi-agent machinery - subagents, commands, workflows, chain contracts - emitted in the correct format for every agent it targets.

- **For:** real multi-component plugins that need to compose safely and ship to more than one agent.
- **Requires (`+ S1-S8`):**
  - `S1-S2` - declared `agent-targets` and a short component `prefix` carried by every component
  - `S3`, `S8` - a components index that mirrors what is on disk, in both directions
  - `S4-S5` - valid chain contracts in `agents/_chain-permitted.yaml` with no orphans or phantoms, and workflow steps that reference skills that exist
  - `S6-S7` - per-target emission, with a native manifest and a command contract present for each declared target
  - plus governance stepping up: per-component `HISTORY.md`, a `CHANGELOG`, and semver throughout
- **Why it matters:** Claude and Codex support the same concepts in different file formats, so a single file cannot serve both - per-target emission (`S6`) is what keeps a plugin genuinely cross-agent instead of secretly Claude-only. The prefix (`S2`) stops generic names like `init` from colliding on agents that lack plugin namespacing. The index mirroring disk (`S3`, `S8`) keeps the manifest honest as the single source of truth, and chain contracts (`S4`) make inter-component calls explicit and safe.
- **Payoff:** a Silver plugin delivers the same intent across Claude and Codex with verified format parity and collision-proof names.

### Gold - Advanced - the self-proving summit

> **Certifies:** the self-proving bar - deep lifecycle capability plus CI that validates the plugin against this Standard and passes.

- **For:** maintainers running plugins at scale who need lifecycle guarantees: documented hooks, regression-protected chains, drift-free generated docs, and a disciplined release and deprecation story.
- **Requires (`+ G1-G6`, with `G7` = tier inclusion of all Bronze and Silver checks):**
  - `G1` - every hook documents its event, trigger, matcher, scope, and failure behavior
  - `G2` - the plugin ships self-hosting CI that runs the full tier-applicable gate and passes it
  - `G3` - each chain edge and hook carries at least one eval or regression case CI executes, so changing one component cannot silently break a consumer
  - `G4` - `INDEX.md` and the native manifests are generated from the authored sources and drift-checked, so a hand-edited generated file is an error
  - `G5` - a curated `RELEASE-NOTES.md` distinct from `CHANGELOG.md`
  - `G6` - a deprecation policy with `status` / `deprecated-by` / `remove-in` that tooling recognizes
- **Why it matters:** self-hosting CI (`G2`) closes the credibility loop - a Standard whose own reference plugin cannot pass its validators is not trustworthy, so the prover must be the proof. Regression coverage (`G3`) turns "changing X broke Y" from a surprise into a CI failure. Generating `INDEX` and the manifests from one authored source (`G4`) keeps the agent view and the human view from drifting apart at scale.
- **Payoff:** a Gold plugin is a maintainable, best-in-class library that demonstrably conforms to the Standard. It is the tier this toolkit itself declares (`tier: advanced`) and passes against itself, with an empty blocked list as the proof.

### Locate yourself

- **Loose skills, or none yet -> Bronze.** Use `askit-build-skill`, `askit-init-plugin`, or `askit-migrate`.
- **A Bronze plugin you want on both agents -> Silver.** Use the `askit-build-*` family, then `askit-evaluate` (or `node scripts/check.mjs`) for the burndown.
- **A Silver plugin you want self-proving -> Gold.** Use `askit-build-hook`, `askit-release`, `askit-deprecate`, plus self-hosting CI.

Invoke `askit-evaluate` (or run `node scripts/check.mjs`) at any point to see the highest tier you satisfy and exactly what blocks the next one.

<div align="right">(<a href="#readme-top">back to top</a>)</div>

## The catalog

**23 skills, 7 subagents, 2 commands** on disk. Skills carry the `askit-` prefix and emit for both agents unless a one-liner notes a Claude-only output; subagents and commands are Claude-only. Full per-component reference lives in [`docs/reference/`](docs/reference/) and on the [live docs site](https://product-on-purpose.github.io/agent-skills-toolkit/); [`INDEX.md`](INDEX.md) is the generated map.

### Authoring (11)

The `askit-build-*` family scaffolds and improves each component type to the Standard.

- **askit-build-skill** - author or improve an agentskills.io `SKILL.md`, scaffold a skill directory, and raise its conformance and description quality.
- **askit-build-subagent** - create or improve a Claude subagent in `agents/<name>.md`, declaring tools and chain (Claude-only).
- **askit-build-command** - create or improve a Claude slash command that maps to a skill, giving it an explicit `/command` entry point.
- **askit-build-mcp** - author or extend a portable `.mcp.json` server definition and wire the per-target `mcpServers` manifest pointer.
- **askit-build-hook** - add Advanced-tier event-driven hooks that guard tool or session events, inject context, and document failure behavior.
- **askit-build-chain-contract** - declare permitted inter-component invocations in `agents/_chain-permitted.yaml`; resolves `S4` orphan or phantom findings.
- **askit-build-agents-md** - author or sync `AGENTS.md`, the agent navigation entrypoint, aligning it with the component index.
- **askit-build-output-style** - author or improve a Claude Code output style defining a response mode (Claude-only).
- **askit-build-workflow** - formalize a recurring multi-skill sequence as a `_workflows` file with ordered steps and exit criteria; resolves `S5` findings.
- **askit-build-statusline** - author a Claude Code status line script and wire its settings registration (Claude-only).
- **askit-build-settings** - author per-target settings and permissions, scope least-privilege allowlists, wire env vars, and register hooks.

### Assessment (1)

Evaluating a skill or plugin against the Standard for conformance, behavior, and quality.

- **askit-evaluate** - audit a skill or plugin against the Standard in three modes: deterministic conformance plus tier, behavioral pass, and qualitative review.

### Docs and samples (2)

Authoring documentation and the sample/eval sets that prove a skill behaves and triggers correctly.

- **askit-build-docs** - author or refresh docs across modes (readme, tutorial, reference, faq, and more) and stand up an Astro Starlight docs site.
- **askit-build-samples** - create and validate a skill's golden examples, anti-examples, and triggering cases, and detect drift against current behavior.

### Governance and lifecycle (5)

Managing backlogs, decisions, releases, deprecations, and templates over a plugin's lifetime.

- **askit-backlog** - capture new-component proposals through the why-gate, prioritize backlog items, and prune stale or completed enhancements.
- **askit-decision** - record MADR architecture decision records and RFCs in `docs/internal`, plus the TL;DR companion for long decision docs.
- **askit-release** - cut a release: compute the version, promote the changelog, curate release notes, and run the readiness gate.
- **askit-deprecate** - record a component's deprecation (status, replacement, removal target) and keep it validating until removal.
- **askit-template-manager** - add or update the global templates directory and keep templates in sync with the shapes the scaffolders produce.

### Onboarding and adoption (4)

Starting new plugins and marketplaces, migrating existing repos, and advising on targets and tier.

- **askit-init-plugin** - scaffold a new Bronze-anatomy plugin from scratch and onboard the maintainer via interview, questionnaire, or hybrid mode.
- **askit-init-marketplace** - stand up or validate a marketplace index that catalogs plugins, checking each entry, plugin reference, and version.
- **askit-migrate** - assess an existing skills repo against the Standard, write the minimal manifest, and produce a staged bring-to-conformance plan.
- **askit-capability-advisor** - report which component types a target agent can run and recommend a conformance tier before a plugin is built.

### Subagents (7, Claude-only)

The bounded delegate roles the toolkit's skills invoke; each is Claude-only and cannot ship to Codex.

- **askit-skill-author** - author and improve agentskills.io skills to the Standard; the bounded delegate behind `askit-build-skill`.
- **askit-evaluator** - assess a skill or plugin against the Standard and report findings with remediation; the read-only role behind `askit-evaluate`.
- **askit-reviewer** - review a component or change for correctness, conformance, and quality, reporting findings with severity.
- **askit-quality-grader** - run a skill against its eval-set and grade the outputs; the opt-in LLM-judge behind `askit-evaluate`'s behavioral mode.
- **askit-explorer** - survey a repository broadly and report a structural map of its components and layout.
- **askit-file-search** - locate specific files, symbols, or text and report matching paths and lines.
- **askit-file-ops** - apply a specified set of file create and edit operations precisely; the bounded mutation role for authoring.

### Commands (2, Claude-only)

The Claude slash commands that give the core flows an explicit `/command` entry point.

- **/askit-evaluate** - invoke the `askit-evaluate` skill to report per-rule findings, the tier, and remediation for a path.
- **/askit-build-skill** - invoke the `askit-build-skill` skill to scaffold a new `SKILL.md` or raise an existing skill's conformance.

<div align="right">(<a href="#readme-top">back to top</a>)</div>

## Find your way in

- **Understand what a best-in-class library is** - [`STANDARD.md`](STANDARD.md) and [The tier model](#the-tier-model).
- **Grade a plugin you already have** - the `askit-evaluate` skill, or `node scripts/check.mjs` for the burndown.
- **Build your first skill** - `askit-build-skill` (or the `/askit-build-skill` command).
- **Start a brand-new plugin** - `askit-init-plugin`.
- **Bring an existing skills repo up to the Standard** - `askit-migrate`.
- **See whether your agent supports a component type** - `askit-capability-advisor`.
- **Read the full reference** - [`docs/`](docs/) and the [live docs site](https://product-on-purpose.github.io/agent-skills-toolkit/).

<div align="right">(<a href="#readme-top">back to top</a>)</div>

## Documentation

- [`STANDARD.md`](STANDARD.md) - the normative Standard that every tool here enforces (component model, tiers, manifest schema, CI and release expectations, lifecycle).
- [Live docs site](https://product-on-purpose.github.io/agent-skills-toolkit/) - the published Diataxis docs (Astro Starlight, deployed to GitHub Pages).
- [`docs/`](docs/) - tutorials, how-to guides, per-component reference, and explanation in-repo.
- [`INDEX.md`](INDEX.md) - the generated human map of every component.
- [`AGENTS.md`](AGENTS.md) - the agent navigation entrypoint.

<div align="right">(<a href="#readme-top">back to top</a>)</div>

## Status

**`v1.0.0`, Gold grade, installable.** The repository declares `tier: advanced` and self-validates at Advanced in CI: the full gate is green and `tier-report` prints `advanced` with an empty burndown, so the toolkit is a self-proving example of the Standard it defines. Two Gold checks (`G1` hooks, `G6` deprecation) are currently satisfied without exercise, since the toolkit ships no hooks and no deprecated components yet; a demonstrative hook is a planned follow-up. The toolkit installs from the `product-on-purpose` marketplace (see [Quick start](#quick-start)).

- **Version** - `1.0.0` (Standard `v0.9`).
- **Tier** - Advanced (Gold), self-validated.
- **Install** - `product-on-purpose` marketplace (`agent-plugins`).
- **Components** - 23 skills, 7 subagents, 2 commands.
- **Validation spine** - 25 checks (`U1-U11`, `S1-S8`, `G1-G6`).
- **Agents** - Claude Code and Codex; agentskills.io-compatible at Bronze.
- **License** - Apache-2.0.
- **Docs site** - [product-on-purpose.github.io/agent-skills-toolkit](https://product-on-purpose.github.io/agent-skills-toolkit/).

The Phase 0 Bronze bootstrap is historical context (see [`docs/internal/BOOTSTRAP.md`](docs/internal/BOOTSTRAP.md)).

<div align="right">(<a href="#readme-top">back to top</a>)</div>

## Terminology

The vocabulary is strict because two independent axes never mix.

- **Structure (what a thing physically is):** a *component* (the unit of reuse) sits inside a *plugin* (the unit of release, which carries the one version), which sits inside a *workspace*; a *marketplace* catalogs plugins for discovery and install.
- **Quality (how good a plugin is):** a *skill library* is the grade a plugin earns by conforming to this Standard (Bronze / Silver / Gold). It is a grade, not a separate artifact.

The path is **loose components into a plugin into a skill library**.

## Repository map

- [`STANDARD.md`](STANDARD.md) - the normative Standard.
- [`INDEX.md`](INDEX.md) - the generated map of the repository.
- [`AGENTS.md`](AGENTS.md) - the agent navigation entrypoint.
- [`scripts/`](scripts/) - the portable validation spine (`check.mjs`, `tier-report.mjs`; one runtime dependency, a YAML parser), the per-check modules, and the manifest and index generators.
- [`skills/`](skills/), [`agents/`](agents/), [`commands/`](commands/) - the components.
- [`docs/`](docs/) - tutorials, how-to, reference, and explanation; [`docs/internal/`](docs/internal/) holds the design record, decisions, and backlog.
- [`CHANGELOG.md`](CHANGELOG.md) - release history.

## License

Apache-2.0. See [`LICENSE`](LICENSE).

<div align="center">

Built with purpose by [Product on Purpose](https://github.com/product-on-purpose).

</div>

<div align="right">(<a href="#readme-top">back to top</a>)</div>
