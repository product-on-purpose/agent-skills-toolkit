---
title: Glossary
description: Define the toolkit's vocabulary - look up a term when a doc uses a word you do not yet know
audience: both
level: beginner
---

# Glossary

The vocabulary here is strict on purpose, because two axes never mix. **Structure** is what a thing physically is: a component, a plugin, a workspace, a marketplace. **Quality** is how good a plugin is once graded: the Bronze, Silver or Gold designation it earns. A *skill library* is a grade, not a separate artifact.

Every term below is defined in one sentence, and the sections run roughly in the order you meet these words elsewhere. Where you want the reasoning behind a rule rather than its meaning, the explanation pages carry that; where you want a check's history, [`universal-checks.md`](../reference/universal-checks.md) carries that.

## Structure - what a thing physically is

**Component** - the unit of reuse: one building block (a skill, command, subagent, hook, workflow, chain contract, or MCP server) that works standalone, droppable into any repo without adopting the rest.

**Skill** - the atomic capability: one `SKILL.md` directory packaging procedural knowledge an agent loads on demand.

**Plugin** - the unit of release: a package of components with a manifest and exactly one version, the installable artifact that carries the version.

**Workspace** - a directory holding several plugins developed together (for example `product-on-purpose/`), not itself installable.

**Marketplace** - a catalog that lists plugins for discovery and install, kept separate from any plugin it lists.

## Quality - how good a plugin is

**Skill library** - the grade a plugin earns by conforming to the Standard, a designation rather than an artifact you install.

**Tier** - a named rung of conformance the gate verifies and reports, each rung including every requirement of the rung below it.

**Bronze (Universal)** - the start line: portable, agent-agnostic files (valid skills, a minimal `library.json`, an `AGENTS.md`) that run unchanged on any agentskills.io-compliant agent, backed by checks `U1-U9` and `U11-U18`.

**Silver (Convergent)** - the multi-agent rung: the machinery (subagents, commands, workflows, chain contracts, per-target emission, semver governance) emitted in the right format for every target agent, backed by `S1-S8` on top of Bronze.

**Gold (Advanced)** - the self-proving summit: deep lifecycle plus self-hosting CI (documented hooks, regression-covered chains, drift-checked generated files, release notes, a deprecation policy), backed by `G1-G10` on top of Silver.

## The grading machinery

**The gate** - the deterministic core that decides pass or fail: `npx agent-skills-toolkit` runs the checks and exits with a real status code, so a plugin proves itself in CI rather than relying on an opinion.

**Check** - one validation rule implemented as a portable module under `scripts/checks/`, emitting `error` or `warn` findings, where the gate fails on any `error` and never on a `warn` alone.

**reqId** - the stable identifier a check backs, prefixed by tier (`U` Universal, `S` Convergent, `G` Advanced), so a finding points at exactly one requirement.

**Spine** - the 35 checks the toolkit ships: `U1-U9` and `U11-U18` (Universal), `S1-S8` (Convergent), and `G1-G10` (Advanced), the gap at `U10` being a check retired in Standard v0.11 whose number was never reused.

**Burndown** - the actionable list the tier report hands back naming exactly what blocks the next tier, keyed to reqIds, so the climb reads as a worklist rather than a guess.

**Conformance** - the property of meeting a tier's requirements as the gate verifies them, with any claim above what is actually met flagged.

**Eval (judgment-based evaluation)** - the behavioral and qualitative review the `askit-evaluate` skill can run beside the gate as opt-in evidence, which informs a decision but never makes one.

**Eval-set** - a skill's collection of cases proving it behaves and triggers correctly: golden examples, at least one anti-example, and a triggering set of `{query, should_trigger}` pairs.

## Emission and the canonical files

**library.json** - the authored single source of truth for a plugin's cross-agent metadata (name, version, tier, agent targets, prefix, component index), from which the native per-agent manifests are generated.

**Emission** - generating each component in the correct format for each target agent from that one `library.json`, so Claude Code and Codex stay in lockstep.

**Per-target manifest** - an agent's native manifest (Claude's `.claude-plugin/plugin.json`, Codex's `.codex-plugin/plugin.json`) generated from `library.json` and drift-checked, so a hand-edited one is an error.

**Chain contract** - the `agents/_chain-permitted.yaml` file declaring, per component, which other components it may invoke, required only when chaining is actually used.

**agentskills.io spec** - the open Agent Skills specification that the Standard is a strict superset of at the Universal tier, so a Bronze plugin's skills are portable across the broader ecosystem.

## See also

- [Conformance and tiers](conformance-and-tiers.md) - how the checks roll up into the tier a plugin satisfies.
- [Universal checks](../reference/universal-checks.md) - every Bronze check, with its source file and how each one is discharged.
- [`STANDARD.md`](../../STANDARD.md) - the normative (RFC-2119) definitions these terms summarize.
- [`README.md`](../../README.md) - the toolkit overview and the catalog of skills, subagents, and commands.
