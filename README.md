# agent-skills-toolkit

> A toolkit and standard for building advanced, cross-agent skill libraries -
> Claude Code and Codex - to a tiered quality bar (Bronze / Silver / Gold).

`agent-skills-toolkit` helps you author, validate, govern, and scale agent skills
past a flat pile of standalone files into a coherent, versioned **plugin** that
conforms to a defined quality standard - and works across more than one agent. It
is built to its own Standard and, at v1, validates itself against that Standard in
CI: the repository is meant to be the proof.

## Why

Most skill collections are flat, single-agent, and ungoverned: no shared quality
bar, no portability story, no lifecycle. This project addresses that with two
things working together:

- **The [Advanced Skill Library Standard](STANDARD.md)** - a normative (RFC-2119)
  definition of what a best-in-class, multi-agent skill library is: components,
  conformance tiers, manifest, CI, and lifecycle.
- **The toolkit** - skills, subagents, and portable Node validators that author
  components, grade a plugin against the Standard, and emit each component in the
  right format for each target agent.

The two credible differentiators are **cross-agent support** (Claude Code and
Codex, agentskills.io-compatible at the base tier) and a **tiered quality
standard** you can climb and verify.

## The tiers

| Tier | Name | What it means |
|---|---|---|
| Bronze | Universal | Identical files work across all agentskills.io-compliant agents (skills, `AGENTS.md`, MCP definitions). |
| Silver | Convergent | Concepts both agents support but in different formats (subagents, commands, workflows, chain contracts), emitted per agent target. |
| Gold | Advanced | Deep, lifecycle, often agent-specific capability (hooks, output styles, self-hosting CI), self-validating. |

Higher tiers include all lower-tier requirements. Tooling reports the highest tier
a plugin actually satisfies and lists exactly what blocks the next one.

## Status

**Public `0.x` preview (Silver).** This repository declares `tier: convergent`
(Silver) and self-validates at Convergent in CI - S1-S6 gate green, `tier-report`
reports `convergent` with an empty burndown. The Phase 0 Bronze bootstrap is
historical context (see [`docs/internal/BOOTSTRAP.md`](docs/internal/BOOTSTRAP.md)).
The toolkit is **not yet installable**. Marketplace registration is planned at the
first Gold-tagged release (`v1.0.0`).

## Quickstart

The validation spine is live. Validate a plugin against the Standard with:

```
node scripts/check.mjs
```

Install and usage instructions will be fleshed out as the toolkit becomes
installable as a plugin.

## Terminology (two axes)

- **Structure:** *component* (unit of reuse) < *plugin* (unit of release, holds the
  one version) < *workspace*; a *marketplace* catalogs plugins.
- **Quality:** a *skill library* is the grade a plugin earns by conforming to the
  Standard (Bronze/Silver/Gold) - a grade, not a separate artifact.

## Map

- [`STANDARD.md`](STANDARD.md) - the normative Standard.
- [`INDEX.md`](INDEX.md) - human map of the repository.
- [`AGENTS.md`](AGENTS.md) - agent navigation entrypoint.
- [`docs/internal/DESIGN.md`](docs/internal/DESIGN.md) - consolidated design and decision record.
- [`docs/internal/BOOTSTRAP.md`](docs/internal/BOOTSTRAP.md) - the self-hosting bootstrap exemption.
- [`CHANGELOG.md`](CHANGELOG.md) - release history.
