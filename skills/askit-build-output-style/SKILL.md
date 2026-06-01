---
name: askit-build-output-style
description: Creates and improves Claude Code output styles (Claude-only response-mode definitions) to the Advanced Skill Library Standard. Use when you need to author a custom output style for Claude Code, define a response mode, or improve an existing output style.
metadata:
  version: 0.1.0
  tier: universal
  audience: advanced
---

# askit-build-output-style

## Purpose
Author a Claude Code output style: a definition that changes how the agent formats and frames its responses (for example an explanatory or terse mode). Output styles are CLAUDE-ONLY - Codex and the wider agentskills.io ecosystem have no equivalent (Standard sec 2.3) - so this skill emits no Codex artifact and the authored component declares `agent-targets: [claude]`. Two modes: `create` scaffolds a new output style; `improve` refines an existing one. Authoring depth is in [references/authoring-output-styles.md](references/authoring-output-styles.md). Follows the shared builder contract ([../../docs/reference/builder-pattern.md](../../docs/reference/builder-pattern.md)).

## When to use
When the user asks to create, scaffold, write, or improve a Claude Code output style (a response mode or response-formatting definition).

## create mode
1. Brief interview: the style's purpose (when Claude should use it), the response shape it enforces (structure, tone, length), and any required elements. Skip if in context.
2. Scaffold the output-style markdown (copy `templates/output-style.md`): a name, a description of when it applies, and the response-formatting instructions.
3. Declare `agent-targets: [claude]` (Claude-only) and state the asymmetry plainly; do not emit a Codex artifact.
4. Register it in `library.json` `components.outputStyles` as `{ name, version, tier, status }`.
5. Evaluate (`node scripts/evaluate.mjs . --json`).

## improve mode
1. Run evaluate and read findings.
2. Tighten the description (when-to-use) and the formatting instructions; remove ambiguity about when the style applies and what it requires.
3. Re-run to confirm.

## Scope
Claude-only (sec 2.3). The build SKILL is portable, but the artifact it produces runs only on Claude Code; state this clearly rather than silently emitting nothing for other targets (the F-06 expectation-setting principle). Output styles are an Advanced, agent-specific capability.
