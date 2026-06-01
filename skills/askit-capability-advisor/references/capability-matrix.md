# Capability matrix (reference)

What each target agent can run, by component type, for a *distributed plugin*. Pinned to Claude Code and Codex CLI; the load-bearing Codex constraint (a plugin manifest has no `agents` field) is fixed to Codex CLI v0.135 in Standard sec 3.3. "Plugin-distributable" means the component ships inside the plugin and the agent ingests it; a capability that exists only via user/project config is not plugin-distributable.

## By component type

| Component | Standard | Claude Code | Codex | Notes |
|---|---|---|---|---|
| Skill | 3.1 (Universal) | yes | yes | agentskills.io `SKILL.md`; portable on both. |
| References / assets | 3.1 (Universal) | yes | yes | Progressive-disclosure files bundled with a skill. |
| MCP server | 3.9 (Universal) | yes | yes | One portable `.mcp.json`; each native manifest carries the `mcpServers` pointer. |
| AGENTS.md | 3.10 (Universal) | yes | yes | Identical format; both read root `AGENTS.md`. Keep it tight. |
| Command | 3.2 (Convergent) | yes (`commands/<name>.md`) | yes, as a skill | On Codex the backing skill is the invocable form (functional parity, not identical UX). |
| Subagent | 3.3 (Convergent) | yes (`agents/<name>.md`) | no (plugin) | Codex subagents are user/project `config.toml` only; the Codex plugin manifest has no `agents` field. Plugin subagents are Claude-only; declare `agent-targets: [claude]`. |
| Workflow | 3.4 (Convergent) | yes | yes | Convention (`_workflows/<name>.md`); a workflow SHOULD declare its `agent-targets`. |
| Chain contract | 3.6 (Convergent) | yes | yes | Agent-agnostic single file (`agents/_chain-permitted.yaml`); conditional MUST (required iff chaining is used). |
| Hook | 3.5 (Advanced) | yes (31 events) | subset | Codex supports a smaller event set (PreToolUse, PostToolUse, Pre/PostCompact, SessionStart, SubagentStart/Stop, UserPromptSubmit, Stop, PermissionRequest). |
| Output style | 2.3 (Advanced) | yes | no | Codex has no output-style feature; Claude-only. |
| Statusline | 2.3 (Advanced) | yes (custom script) | differs | Codex configures a built-in picker via `config.toml tui.status_line`, not a shipped script; treat the script component as Claude-only. |

## The Claude-only set

Subagents, output styles, and statuslines do not ship to Codex *from a plugin*. The limit is plugin distribution, not the feature: Codex still has user/project subagents (`config.toml [agents.*]`) and built-in roles (default/worker/explorer), and configures a built-in statusline picker; they just are not carried inside a distributed plugin. A plugin that targets `codex` (or both) must give each such component a per-component `agent-targets: [claude]` override (sec 3.7); their absence on Codex is not a conformance failure (sec 2.3). This is what `check` mode checks.

## Tier path

| Tier | Adds (component types) |
|---|---|
| Universal (Bronze) | skills + references/assets, AGENTS.md, MCP |
| Convergent (Silver) | + subagents, commands, workflows, chain contracts, plugin packaging, the prefix, native manifests |
| Advanced (Gold) | + hooks, output styles, self-hosting CI |

`advise` recommends a tier from the target agents and the components planned: a single-agent skills-and-docs plugin sits comfortably at Bronze; a cross-agent plugin with packaging and a components index is Silver; hooks and self-hosting CI move it to Gold.

## Keeping the matrix honest

The matrix is pinned to specific agent versions. When an agent adds a capability (for example, if Codex gains an `agents` manifest field), update this file and `advise`/`check` together so the advice never claims more than the agents actually support.
