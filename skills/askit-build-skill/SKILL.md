---
name: askit-build-skill
description: Creates and improves agentskills.io skills to the Advanced Skill Library Standard. Use when you need to author a new SKILL.md, scaffold a skill directory, or raise an existing skill's conformance and description quality.
chain:
  - askit-skill-author
metadata:
  version: 0.1.0
  tier: universal
  audience: beginner
---

# askit-build-skill

## Purpose
Author conformant skills. Two modes: `create` scaffolds a new skill that passes Bronze on first run; `improve` raises an existing skill toward the quality bar. Authoring depth is in [references/authoring-guide.md](references/authoring-guide.md).

## When to use
When the user asks to create, scaffold, write, or improve a skill.

## create mode
1. Brief interview: ask for the skill name (kebab-case), what it does, when to use it, and a few trigger keywords. Skip the interview if these inputs are already provided in context.
2. Create `skills/<name>/` and copy `templates/SKILL.md` into `skills/<name>/SKILL.md`.
3. Fill the frontmatter: `name` equal to the directory, and a `description` that states what AND when with concrete keywords (see [references/authoring-guide.md](references/authoring-guide.md) for the bar).
4. Scaffold `references/` if the skill needs depth. Samples in `examples/` are optional at Bronze - add them only if useful. Do not assume the surrounding plugin anatomy exists - this skill works a la carte.
5. Emit native manifests for the declared targets: set `agent-targets` in the plugin's `library.json` (for example `["claude", "codex"]`), then run `node scripts/generators/gen-manifest.mjs <plugin-root> --write --target=all`. To emit for one agent only, pass `--target=claude` or `--target=codex`. The plugin's `library.json` `agent-targets` (not a CLI flag) declares which targets it requires; `gen-manifest` writes `.claude-plugin/plugin.json` and/or `.codex-plugin/plugin.json` from `library.json`.
6. Assess the new skill with `node scripts/evaluate.mjs skills/<name> --json` (this is what the `askit-evaluate` skill runs), report the result, and iterate until it passes with 0 errors.

## improve mode
1. Run `node scripts/evaluate.mjs <skill> --json` and read the report.
2. For each finding: a samples warn -> add representative examples; a low description score (U5) -> rewrite the description to clear the bar; an over-budget warning (U7) -> move depth into `references/`. For any other finding, read its message and apply the fix it states.
3. Re-run evaluate to confirm the findings are resolved.

## Scope
Emits for Claude and Codex: `library.json.agent-targets` declares which targets the plugin requires, and `gen-manifest.mjs --target=all|claude|codex` generates the matching native manifests. This skill delegates authoring to the `askit-skill-author` subagent (permitted in `agents/_chain-permitted.yaml`), which in turn delegates assessment to `askit-evaluator`.
