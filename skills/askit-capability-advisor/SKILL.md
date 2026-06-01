---
name: askit-capability-advisor
description: Reports which component types a target agent can run and recommends a conformance tier before a plugin is built, mapping Claude Code and Codex capabilities to the Advanced Skill Library Standard's component types. Use when choosing agent-targets, checking whether a component is portable across agents, or deciding which tier to aim for.
metadata:
  version: 0.1.0
  tier: universal
  audience: intermediate
---

# askit-capability-advisor

## Purpose
Tell a maintainer what their target agent supports before they build, so the plan fits the agent rather than failing at release. Two modes: `advise` takes the target agents (`claude`, `codex`, or both), reports which component types are plugin-distributable on each, flags the Claude-only types and the cross-agent asymmetries, and recommends a tier path; `check` takes a specific component or a whole plugin and reports which declared targets can actually run it, so a Claude-only component shipped under a Codex target is caught before release. The full matrix is in [references/capability-matrix.md](references/capability-matrix.md).

## When to use
When choosing `agent-targets`, checking whether a component is portable across agents, or deciding which conformance tier to aim for.

## advise mode
1. Read the target agents (`claude`, `codex`, or both).
2. For each, report the plugin-distributable component types and the asymmetries: subagents are Claude-only for plugin distribution (Codex ingests them only via user/project `config.toml`, Standard sec 3.3); output styles are Claude-only and the statusline differs (sec 2.3); a command's Codex form is its backing skill, explicitly invocable, not a separate artifact (sec 3.2); hooks are a Codex subset of Claude's event set (sec 3.5); skills, MCP, and AGENTS.md are portable on both (sec 3.1, 3.9, 3.10).
3. Recommend a tier path: Bronze (skills + references + AGENTS.md + MCP), Silver (adds subagents, commands, workflows, chain contracts, plugin packaging, the prefix, native manifests), Gold (adds hooks, output styles, self-hosting CI).

## check mode
1. Read the component (or every component in the plugin) and the plugin's declared `agent-targets`.
2. For each declared target, report whether the type is plugin-distributable there. Flag a Claude-only type (subagent, output style, statusline) carried under a `codex` target, since it cannot ship to Codex from a plugin.
3. Point each flag at the fix: set a per-component `agent-targets: [claude]` override (sec 3.7), or move the component into a Claude-only plugin.

## Scope
Advisory only: it reports capability and recommends a tier; it does not author components (the `askit-build-*` skills do) or grade conformance (`askit-evaluate` does). The matrix tracks the Standard's pinned agent versions (Codex CLI v0.135); when an agent adds a capability the matrix and this skill update together, so the advice never drifts ahead of what the agents actually support.
