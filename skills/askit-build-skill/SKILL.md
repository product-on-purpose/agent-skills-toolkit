---
name: askit-build-skill
description: Creates and improves agentskills.io skills to the Advanced Skill Library Standard. Use when you need to author a new SKILL.md, scaffold a skill directory, or raise an existing skill's conformance and description quality.
metadata:
  version: 0.1.2
  tier: universal
  audience: beginner
  chain:
    - askit-skill-author
    - askit-reviewer
---

# askit-build-skill

## Purpose
Author conformant skills. Two modes: `create` scaffolds a new skill that passes Bronze on first run; `improve` raises an existing skill toward the quality bar. Authoring depth is in [references/authoring-guide.md](references/authoring-guide.md).

## When to use
When the user asks to create, scaffold, write, or improve a skill.

## create mode
1. Brief interview: ask for the skill name (kebab-case), what it does, when to use it, and a few trigger keywords. Skip the interview if these inputs are already provided in context.
2. Delegate the drafting to the `askit-skill-author` subagent (the declared chain) when running in a harness that can dispatch it; otherwise perform the steps below inline. Either way the procedure is the same: create `skills/<name>/` and copy `templates/SKILL.md` into `skills/<name>/SKILL.md`.
3. Fill the frontmatter: `name` equal to the directory, and a `description` that states what AND when with concrete keywords (see [references/authoring-guide.md](references/authoring-guide.md) for the bar).
4. Scaffold `references/` if the skill needs depth. Samples in `examples/` are optional at Bronze - add them only if useful. Do not assume the surrounding plugin anatomy exists - this skill works a la carte.
5. Emit native manifests for the declared targets: set `agent-targets` in the plugin's `library.json` (for example `["claude", "codex"]`), then run `node scripts/generators/gen-manifest.mjs <plugin-root> --write --target=all`. To emit for one agent only, pass `--target=claude` or `--target=codex`. The plugin's `library.json` `agent-targets` (not a CLI flag) declares which targets it requires; `gen-manifest` writes `.claude-plugin/plugin.json` and/or `.codex-plugin/plugin.json` from `library.json`.
6. Assess the new skill with `node scripts/evaluate.mjs skills/<name> --json` (this is what the `askit-evaluate` skill runs), report the result, and iterate until it passes with 0 errors.

## improve mode
1. Run `node scripts/evaluate.mjs <skill> --json` and read the report. As in create mode, the rewrite work itself may be delegated to `askit-skill-author` or done inline; the steps below are the procedure either way.
2. For each finding: a samples warn -> add representative examples; a low description score (U5) -> rewrite the description to clear the bar; an over-budget warning (U7) -> move depth into `references/`. For any other finding, read its message and apply the fix it states.
3. Re-run evaluate to confirm the findings are resolved. That closes phase 1 (conformance).

## improve mode, phase 2: the craft review (optional)
Phase 1 proves the skill obeys the rules. Phase 2 asks whether it is any good as a teacher. It is OPTIONAL, it is OFFERED not assumed, and it never edits meaning. Decision and contract: ADR 0037 (the builder craft pass), `docs/internal/decisions/0037-builder-craft-pass-and-safe-judgment-partition.md`.

1. **Check eligibility.** Phase 2 is offered only when the deterministic gate is already clean. Pass the phase-1 gate result (`{ exitCode, errors, warns }`) to `phaseTwoEligible()` from `scripts/lib/craft-review.mjs`. If it returns ineligible, say why and go back to phase 1; the craft pass is never a way around a conformance failure.
2. **Offer it, and stop.** Tell the user what the craft review costs (one advisory subagent run, see `docs/reference/token-usage-estimates.md`) and what it produces. Run it only on an explicit yes.
3. **Dispatch the reviewer.** Delegate to the `askit-reviewer` subagent (the declared chain), briefed with [references/skill-craft-rubric.md](references/skill-craft-rubric.md). It scores five dimensions - description and trigger quality, instruction clarity, example depth including golden and anti-example presence, reference structure, token economy - and returns findings in the rubric's contract.
4. **Render a durable report.** Write the findings through `toReviewAdvisory()` to a JSON file, then render: `node scripts/evaluate.mjs <skill> --report=review --advisory <file.json> --format=md --out <report.md>` (use `--format=html` for the shareable page). The craft review is an artifact, not chat output. It renders BESIDE the verdict and cannot change it.
5. **Partition.** Call `partitionCraftFindings()`. SAFE is a closed allowlist of three mechanical categories (broken link, formatting, missing bookkeeping frontmatter field), each needing a bounded single-line fix. Everything else, including any category the allowlist does not name, is JUDGMENT.
6. **Offer the SAFE subset only, item by item.** Show each SAFE fix as the exact before and after. On explicit consent, call `applySafeFixes(<skill>, safe, { consent: true })`. Without `consent: true` it writes nothing, and it refuses any finding that is not SAFE even if it is handed one.
7. **Report the JUDGMENT findings, do not act on them.** Present each with its recommended change and leave the files untouched. If the user asks for one, that is ordinary improve-mode work (step 2), consciously chosen.
8. **Re-run the gate** (`node scripts/evaluate.mjs <skill> --json`) to confirm it is still clean after the apply, and say so.

## Scope
Emits for Claude and Codex: `library.json.agent-targets` declares which targets the plugin requires, and `gen-manifest.mjs --target=all|claude|codex` generates the matching native manifests. This skill delegates authoring to the `askit-skill-author` subagent (permitted in `agents/_chain-permitted.yaml`), which in turn delegates assessment to `askit-evaluator`, and delegates the optional phase-2 craft review to `askit-reviewer` (the same subagent `askit-evaluate` uses for its advisory review layer).
