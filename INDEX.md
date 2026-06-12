# INDEX - agent-skills-toolkit

> Generated from `library.json` + component frontmatter by `gen-index` and
> drift-checked (G4). Edit the source, not this file. Overview and positioning are
> in [`README.md`](README.md); agent guidance is in [`AGENTS.md`](AGENTS.md).

**Tier:** Gold (advanced). Standard 0.11. Version 1.5.2. Self-validating: `node scripts/check.mjs`.

## Components

### Skills (23)

- [`askit-backlog`](skills/askit-backlog/) - Creates, triages, and prunes a plugin's two backlogs (new-component proposals and enhancements) to the Advanced Skill Library Standard. Use when capturing a new-component proposal through the why-gate, prioritizing backlog items, or removing stale or completed entries.
- [`askit-build-agents-md`](skills/askit-build-agents-md/) - Creates and improves a plugin's AGENTS.md (the agent navigation and instructions entrypoint) to the Advanced Skill Library Standard. Use when you need to author or sync AGENTS.md, align it with the component index, or trim an overgrown one to essential, mostly-positive guidance.
- [`askit-build-chain-contract`](skills/askit-build-chain-contract/) - Creates and improves a plugin's chain contract (agents/_chain-permitted.yaml) to the Advanced Skill Library Standard. Use when a skill or subagent invokes another component and you need to declare the permitted inter-component invocations, or to resolve S4 orphan or phantom findings.
- [`askit-build-command`](skills/askit-build-command/) - Creates and improves Claude slash commands (commands/<name>.md) that map to a skill, to the Advanced Skill Library Standard. Use when you need to give a skill an explicit /command entry point or raise an existing command's conformance.
- [`askit-build-docs`](skills/askit-build-docs/) - Creates and improves a plugin's documentation across modes (readme, quickstart, tutorial, how-to, reference, glossary, faq, troubleshooting, architecture, folder-readme, and an Astro Starlight docs site) to the Advanced Skill Library Standard. Use when authoring or refreshing docs, scaffolding a folder README, standing up a docs site, or aligning documentation with the component index.
- [`askit-build-hook`](skills/askit-build-hook/) - Creates and improves event-driven hooks (Advanced tier) for a plugin to the Advanced Skill Library Standard. Use when you need to add a hook, enforce a guard on a tool or session event, inject context, or document a hook's event, scope, and failure behavior.
- [`askit-build-mcp`](skills/askit-build-mcp/) - Creates and improves MCP server definitions (a portable .mcp.json) for a plugin to the Advanced Skill Library Standard. Use when you need to add an MCP server to a plugin, author or extend .mcp.json, or wire the per-target mcpServers manifest pointer.
- [`askit-build-output-style`](skills/askit-build-output-style/) - Creates and improves Claude Code output styles (Claude-only response-mode definitions) to the Advanced Skill Library Standard. Use when you need to author a custom output style for Claude Code, define a response mode, or improve an existing output style.
- [`askit-build-samples`](skills/askit-build-samples/) - Creates and validates a skill's sample sets and eval sets (golden examples, anti-examples, and triggering cases) and detects drift against current behavior. Use when generating samples for a skill, building an eval set, or checking samples for drift.
- [`askit-build-settings`](skills/askit-build-settings/) - Creates and improves a plugin's settings and permissions per target and recommends least-privilege allowlists. Use when authoring settings, scoping permissions, wiring environment variables, or registering hooks in settings.
- [`askit-build-skill`](skills/askit-build-skill/) - Creates and improves agentskills.io skills to the Advanced Skill Library Standard. Use when you need to author a new SKILL.md, scaffold a skill directory, or raise an existing skill's conformance and description quality.
- [`askit-build-statusline`](skills/askit-build-statusline/) - Creates and improves a Claude Code status line script and its settings registration. Use when authoring a status line, customizing what the status line shows, or wiring its settings entry.
- [`askit-build-subagent`](skills/askit-build-subagent/) - Creates and improves Claude subagents (agents/<name>.md) to the Advanced Skill Library Standard. Use when you need to author a new subagent, scaffold an agents/ delegate, declare its tools and chain, or raise an existing subagent's conformance.
- [`askit-build-workflow`](skills/askit-build-workflow/) - Creates and improves workflows (an ordered multi-skill arc) for a plugin to the Advanced Skill Library Standard. Use when a recurring sequence of skills is worth formalizing as a workflow, when you need to author a _workflows file with steps and exit criteria, or to resolve S5 workflow findings.
- [`askit-capability-advisor`](skills/askit-capability-advisor/) - Reports which component types a target agent can run and recommends a conformance tier before a plugin is built, mapping Claude Code and Codex capabilities to the Advanced Skill Library Standard's component types. Use when choosing agent-targets, checking whether a component is portable across agents, or deciding which tier to aim for.
- [`askit-decision`](skills/askit-decision/) - Creates and maintains a plugin's decision records (MADR ADRs) and RFCs in docs/internal, and the summary TL;DR companion for long decision docs. Use when recording an architecture decision, drafting an RFC to evolve the Standard, or generating the TL;DR for a decision doc.
- [`askit-deprecate`](skills/askit-deprecate/) - Validates and records a component's deprecation (status, replacement, and removal target) and keeps deprecated components validating until removal. Use when deprecating a component, recording its replacement, or checking the deprecation contract.
- [`askit-evaluate`](skills/askit-evaluate/) - Evaluates a skill or plugin against the Advanced Skill Library Standard across three modes, producing deterministic conformance findings and a tier, an opt-in behavioral pass, and a qualitative review. Use when you want to audit conformance, judge whether a skill behaves and triggers correctly, get a qualitative review, or see what blocks the next tier.
- [`askit-init-marketplace`](skills/askit-init-marketplace/) - Creates and validates a marketplace index that catalogs plugins for Claude Code and Codex, checking each entry, its plugin reference, and version consistency. Use when standing up a marketplace, adding a plugin to a marketplace, or validating marketplace entries.
- [`askit-init-plugin`](skills/askit-init-plugin/) - Creates a starting plugin that satisfies the Bronze anatomy and onboards the maintainer, in three modes (interview, questionnaire, hybrid). Use when starting a new plugin from scratch, onboarding a maintainer, or generating a scaffolding questionnaire.
- [`askit-migrate`](skills/askit-migrate/) - Assesses an existing skills repository against the Advanced Skill Library Standard, produces a staged bring-to-conformance plan, and writes the minimal canonical manifest so the repo becomes gradeable. Use when adopting a foreign or ad-hoc skills repo, migrating a Claude-only plugin toward cross-agent conformance, or planning a Bronze-to-Silver upgrade path.
- [`askit-release`](skills/askit-release/) - Builds and validates a plugin's release by computing the version, promoting the changelog, curating the release notes, and running the readiness gate, to the Advanced Skill Library Standard. Use when cutting a release, bumping the plugin version, updating the changelog or release notes, or checking release readiness.
- [`askit-template-manager`](skills/askit-template-manager/) - Creates and maintains a plugin's global templates directory so the scaffolders produce consistent components. Use when adding a template, updating an existing one, or keeping templates in sync with the component shapes they scaffold.

### Subagents (7, Claude-only)

- [`askit-evaluator`](agents/askit-evaluator.md) - Assesses a skill or plugin against the Advanced Skill Library Standard and reports findings with remediation. Use when delegating conformance assessment - the bounded read-only role behind askit-evaluate.
- [`askit-explorer`](agents/askit-explorer.md) - Surveys a repository broadly and reports a structural map of its components and layout. Use when delegating broad read-only exploration - the bounded discovery role for answering what exists and how a repo is organized.
- [`askit-file-ops`](agents/askit-file-ops.md) - Applies a specified set of file create and edit operations precisely, reading each target first. Use when delegating bounded file mutations - the role that carries out write and edit work an authoring skill has already decided on.
- [`askit-file-search`](agents/askit-file-search.md) - Locates specific files, symbols, or text patterns and reports the matching paths and lines. Use when delegating a targeted search - the bounded read-only role for answering where something is, distinct from the broad survey askit-explorer runs.
- [`askit-quality-grader`](agents/askit-quality-grader.md) - Judges whether a skill triggers and behaves correctly by running it against its eval-set and grading the outputs. Use when delegating a behavioral evaluation - the opt-in LLM-judge role behind askit-evaluate's behavioral mode, distinct from the deterministic conformance core.
- [`askit-reviewer`](agents/askit-reviewer.md) - Reviews a component or a change for correctness, Standard conformance, and quality, and reports findings with severity. Use when delegating a judgment review that goes beyond the deterministic checks - the qualitative counterpart to askit-evaluator.
- [`askit-skill-author`](agents/askit-skill-author.md) - Authors and improves agentskills.io skills to the Advanced Skill Library Standard. Use when delegating skill creation or conformance work - the bounded role behind askit-build-skill.

### Commands (2)

- [`/askit-build-skill`](commands/askit-build-skill.md) - Create or improve an agentskills.io skill to the Advanced Skill Library Standard. Use to scaffold a new SKILL.md or raise an existing skill's conformance and description quality.
- [`/askit-evaluate`](commands/askit-evaluate.md) - Evaluate a skill or plugin against the Advanced Skill Library Standard and report per-rule findings, the tier, and remediation. Use to audit conformance or see what blocks the next tier.

## Manifests

- [`library.json`](library.json) - authored canonical cross-agent manifest (the source of truth).
- [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json) - Claude Code native manifest (generated; do not hand-edit).
- [`.codex-plugin/plugin.json`](.codex-plugin/plugin.json) - Codex native manifest (generated; do not hand-edit).
- [`manifest.generated.json`](manifest.generated.json) - agent index (generated).

## Documentation and governance

- [`STANDARD.md`](STANDARD.md) - the Advanced Skill Library Standard (normative).
- [`README.md`](README.md) - overview, positioning, quickstart.
- [`CHANGELOG.md`](CHANGELOG.md) - full technical history; [`RELEASE-NOTES.md`](RELEASE-NOTES.md) - curated, user-facing notes.
- [`docs/`](docs/) - Diataxis docs (reference, how-to, explanation).
- [`docs/internal/decisions/`](docs/internal/decisions/) - ADRs; [`docs/internal/backlog/`](docs/internal/backlog/) - backlog; [`docs/internal/STATUS.md`](docs/internal/STATUS.md) - live tracker.
- [`agents/_chain-permitted.yaml`](agents/_chain-permitted.yaml) - the chain contract; [`templates/`](templates/) - scaffolder templates.
- [`scripts/`](scripts/) - the Node validation spine (conformance checks, generators, gate, evaluate).
