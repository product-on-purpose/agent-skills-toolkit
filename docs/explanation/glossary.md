---
title: Glossary
description: Define the toolkit's vocabulary - look up a term when a doc uses a word you do not yet know
audience: both
level: beginner
---

# Glossary

The vocabulary here is strict on purpose, because two independent axes never mix. **Structure** is what a thing physically is - a component, a plugin, a workspace, a marketplace. **Quality** is how good a plugin is once graded against the Standard - the Bronze / Silver / Gold designation a plugin earns. A *skill library* is a grade, not a separate artifact. Keeping the two axes apart is what keeps the rest of the docs unambiguous.

Each term below is defined in one sentence. The terms are grouped by axis, then by the toolkit's machinery (the gate, the checks, emission, the files), so related ideas sit together; if you prefer to scan, the headings are roughly the order you meet these words while reading the rest of the docs.

## Structure - what a thing physically is

**Component** - the unit of reuse: any single building block (a skill, command, subagent, hook, workflow, chain contract, or MCP server) that works standalone, droppable into any repo without adopting the rest.

**Skill** - the atomic capability: one `SKILL.md` directory packaging procedural knowledge an agent loads on demand.

**Plugin** - the unit of release: a package of components with a manifest and exactly one version, the installable artifact that carries the version components roll up into.

**Workspace** - a directory holding several plugins developed together (for example `product-on-purpose/`); it is not itself installable.

**Marketplace** - a catalog that lists plugins for discovery and install, kept as a separate concern from any plugin it lists (a plugin must never embed a marketplace that lists itself).

## Quality - how good a plugin is

**Skill library** - the grade a plugin earns by conforming to the Standard (Bronze, Silver, or Gold); it is a designation, not an artifact you install, so a plugin can also be a skill library at the same time.

**Tier** - a named rung of conformance the gate verifies and reports; the three tiers are monotonic, so each one includes every requirement of the tier below it and earlier work always still counts.

**Bronze (Universal)** - the start line: certifies portable, agent-agnostic files (valid skills, a minimal `library.json`, an `AGENTS.md`) that run unchanged on any agentskills.io-compliant agent, backed by checks `U1` through `U11`.

**Silver (Convergent)** - the multi-agent rung: certifies the machinery (subagents, commands, workflows, chain contracts, per-target emission, semver governance) emitted in the right format for every target agent, backed by checks `S1` through `S8` on top of Bronze.

**Gold (Advanced)** - the self-proving summit: certifies deep lifecycle plus self-hosting CI (documented hooks, regression-covered chains, drift-checked generated files, release notes, a deprecation policy), backed by checks `G1` through `G7` on top of Silver.

## The grading machinery

**The gate** - the deterministic core that decides pass or fail: `node scripts/check.mjs` runs the requirement checks and exits with a real status code, so a plugin can prove itself in CI rather than rely on an opinion.

**Check** - one validation rule implemented as a portable module under `scripts/checks/`, emitting `error` or `warn` findings (the aggregate gate fails on any `error`, never on a `warn` alone).

**reqId** - the stable identifier a check backs, prefixed by tier - `U` for Universal, `S` for Convergent, `G` for Advanced (for example `U5` is the description-quality rule and `G2` is self-hosting CI) - so a finding points to exactly one requirement.

**Spine** - the 26-check backbone the toolkit ships (`U1`-`U11`, `S1`-`S8`, `G1`-`G7`); the `G7` slot is the `docs-frontmatter` check (Standard v0.10), and tier inclusion of Bronze and Silver is a structural property of the monotonic tiers, not a numbered check.

**Burndown** - the actionable list the tier report hands back naming exactly what blocks the next tier, keyed to reqIds, so the climb reads as a worklist rather than a guess (for example `blocked.gold: ["G3: no eval cases for chain rs-synthesis"]`).

**Conformance** - the property of meeting a tier's requirements as the gate verifies them; the tooling reports the highest tier a plugin actually satisfies and flags any claim above what is met.

**Eval (judgment-based evaluation)** - the behavioral and qualitative review the `askit-evaluate` skill can run beside the gate as opt-in evidence; it informs but never decides a pass or fail, which stays with the deterministic gate.

**Eval-set** - a skill's collection of cases that prove it behaves and triggers correctly: golden examples, at least one anti-example (a case it should not handle), and a triggering set of `{query, should_trigger}` pairs, executed in CI at the Advanced tier.

## Emission and the canonical files

**library.json** - the authored single source of truth for a plugin's cross-agent metadata (name, version, tier, agent targets, prefix, component index); the native per-agent manifests are generated from it, never hand-maintained in parallel.

**Emission** - generating each component in the correct format for each target agent from the one canonical `library.json`, so Claude Code and Codex stay in lockstep instead of drifting into a secretly single-agent plugin.

**Per-target manifest** - an agent's native manifest (Claude's `.claude-plugin/plugin.json`, Codex's `.codex-plugin/plugin.json`) generated from `library.json` and drift-checked, so a hand-edited generated file is an error.

**Chain contract** - the `agents/_chain-permitted.yaml` file that declares, per component, which other components it may invoke, making inter-component calls explicit and safe; it is required only when chaining is actually used.

**agentskills.io spec** - the open Agent Skills specification (the skill format and frontmatter rules) that the Standard is a strict superset of at the Universal tier; a Bronze plugin's skills are, by definition, agentskills.io-compliant and portable across the broader ecosystem.

## See also

- [Conformance and tiers](conformance-and-tiers.md) - how the checks roll up into the tier a plugin satisfies.
- [`STANDARD.md`](../../STANDARD.md) - the normative (RFC-2119) definitions these terms summarize.
- [`README.md`](../../README.md) - the toolkit overview and the catalog of skills, subagents, and commands.
