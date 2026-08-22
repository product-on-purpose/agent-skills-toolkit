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

## Cowork, and why it is here at all

Cowork is **not** a plugin-distribution target the way Claude Code and Codex are, so it has no column in
the table above. It is documented here because **two shipped checks already accommodate its behaviour**,
which means the gate models an agent the matrix did not:

| What | Where | What it assumes about Cowork |
|---|---|---|
| `U6` `reference-links` | `SKIP_SCHEME` includes `computer:` | that `computer:` is a local-artifact scheme, so a link using it is not a broken repo-relative path |
| `U11` `mcp-valid` | a typed `http` server with no `url` is a warning, not an error | the managed-connector pattern, where the host supplies the endpoint at runtime |

**Both assumptions are currently undocumented by the vendor.** A survey of Cowork's changelog on
2026-08-18 found no mention of the `computer:` scheme at all, and the connector language present there
concerns settings and UI rather than runtime endpoint injection. The full documentation set has not been
swept, so this is *not found* rather than *does not exist*.

That matters for what happens next. A documented behaviour becomes a `quote` claim in
[`vendor-claims.json`](../claims/vendor-claims.json) and costs nothing
recurring; an undocumented one can only be a `probe`, whose age is its whole verification and which
blocks releases past a 30-day window. **Spend the search before filing a probe**, and never file one
whose reproduction nobody will actually re-run.

## Keeping the matrix honest

**Confirmed against these agent versions**, and this block exists because for a long time the sentence
below claimed a version pin while the file recorded no version anywhere - a currency claim with no
currency evidence, which is the same defect class as a SHA pin whose comment nobody re-checked.

| Agent | Confirmed against | On | How |
|---|---|---|---|
| Claude Code | `2.1.235` | 2026-08-18 | changelog and documentation read |
| Codex | plugins documentation page as published | 2026-08-18 | `learn.chatgpt.com/docs/plugins.md`, reached via a 308 from the former host |
| Cowork | `v1.32885.1` | 2026-08-18 | changelog read; **the two behaviours below are NOT documented there** |

When an agent adds a capability (for example, if Codex gains an `agents` manifest field), update this
file, the versions above, and `advise`/`check` together so the advice never claims more than the agents
actually support. [`askit-capability-gap-analysis`](../../skills/askit-capability-gap-analysis/SKILL.md) owns
that update; this skill reads the result.
