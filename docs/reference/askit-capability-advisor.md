# askit-capability-advisor (reference)

Reports which component types a target agent can run and recommends a conformance tier, before a plugin is built.

## Modes
- `advise`: given target agents (`claude`, `codex`, or both), report the plugin-distributable component types per agent, the cross-agent asymmetries, and a recommended tier path.
- `check`: given a component or a whole plugin, report which declared targets can run it, and flag a Claude-only component shipped under a `codex` target.

## What it knows
The capability matrix (Claude Code and Codex; the Codex subagent constraint is pinned to CLI v0.135 in Standard sec 3.3): skills, MCP, AGENTS.md are portable on both; commands realize on Codex as the backing skill; subagents, output styles, and statuslines are Claude-only for plugin distribution; hooks are a Codex subset. See [capability-matrix](../../skills/askit-capability-advisor/references/capability-matrix.md).

## Boundary
Advisory only: it does not author components (`askit-build-*`) or grade conformance (`askit-evaluate`). See the [choose-agent-targets how-to](../how-to/choose-agent-targets.md).
