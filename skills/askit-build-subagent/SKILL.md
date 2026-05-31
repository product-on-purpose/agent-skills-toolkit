---
name: askit-build-subagent
description: Creates and improves Claude subagents (agents/<name>.md) to the Advanced Skill Library Standard. Use when you need to author a new subagent, scaffold an agents/ delegate, declare its tools and chain, or raise an existing subagent's conformance.
metadata:
  version: 0.1.0
  tier: universal
  audience: intermediate
---

# askit-build-subagent

## Purpose
Author conformant subagents. Two modes: `create` scaffolds a new `agents/<name>.md` (frontmatter + role body); `improve` raises an existing subagent toward the quality bar. Subagents are Claude-only for plugin distribution (Codex v0.135 plugins cannot ship `[agents.*]`; Standard sec 3.3), so this skill emits no Codex artifact. Authoring depth is in [references/authoring-subagents.md](references/authoring-subagents.md).

## When to use
When the user asks to create, scaffold, write, or improve a subagent (an `agents/<name>.md` delegate).

## create mode
1. Brief interview: ask for the subagent name (kebab-case), the bounded job it owns, the narrowest tools it needs, and which components (if any) it may invoke. Skip the interview if these inputs are already in context.
2. Copy `templates/agent.md` into `agents/<name>.md`.
3. Fill the frontmatter: `name` equal to the file basename; a `description` that states what AND when (Standard sec 8.1); `tools` as the narrowest set (sec 9); optional `model`; `chain` listing components it may invoke (omit if none); `metadata.version`, `metadata.tier`, `metadata.status`, and `metadata.agent-targets: [claude]` (sec 3.3 - subagents are Claude-only for plugin distribution).
4. Register the subagent in `library.json` `components.subagents` as `{ name, path, version, tier, status }`.
5. If the subagent declares a `chain`, add the entry to `agents/_chain-permitted.yaml` (`<name>: [<invoked>, ...]`) so S4 has no orphan.
6. Assess with `node scripts/evaluate.mjs . --json` and iterate until 0 errors (S3 components index + S4 chain contract must be clean).

## improve mode
1. Run `node scripts/evaluate.mjs . --json` and read the report.
2. For each finding: an S3 error -> declare/undeclare the subagent in `components.subagents` to match disk; an S4 orphan -> add the missing `caller -> callee` to `agents/_chain-permitted.yaml`; an S4 phantom (the contract names a component not on disk) -> remove that contract entry, fix a misspelled name, or create the missing component. For any other finding, read its message and apply the fix it states.
3. Re-run evaluate to confirm.

## Scope
Claude-only: a subagent is `agents/<name>.md` (Claude auto-discovers it). Codex does not ingest plugin-shipped subagents (Standard sec 3.3), so there is no Codex render. Authoring is performed inline by the running agent; the toolkit's own `askit-skill-author` subagent is the delegated authoring role for skills.
