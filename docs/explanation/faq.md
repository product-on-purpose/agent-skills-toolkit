---
title: "Frequently asked questions"
description: "Answers common questions about the toolkit, cross-agent support, deterministic grading, and the tier model."
audience: both
level: beginner
---

# Explanation: frequently asked questions

Short, accurate answers to the questions people ask first. For the normative
detail behind any answer, see [`STANDARD.md`](../../STANDARD.md); for the tier
mechanics, see [conformance and tiers](conformance-and-tiers.md).

## Is this Claude-only?

No. The toolkit is cross-agent: it targets **Claude Code and Codex** as
first-class, and stays compatible with the broader agentskills.io ecosystem at
the Universal (Bronze) tier. You author one canonical `library.json`, and the
native per-agent manifests are generated from it, so the two agents stay in
lockstep rather than drifting into a secretly-Claude-only plugin.

Some components are agent-specific by nature, and the Standard says so plainly:
subagents, slash commands, output styles, and status lines have a Claude form
that Codex either realizes differently or does not have an equivalent for. That
is a property of the agents, not a limit of the toolkit. Skills - the portable
core - run unchanged on both.

## Do I have to run a Node command to grade a plugin?

No. The everyday path is the **`askit-evaluate`** skill (or the
`/askit-evaluate` command): invoke it, or just ask your agent to "grade this
plugin against the Standard," and it reports the tier, the burndown to the next
tier, and per-rule remediation.

Under the hood the same checks are also a portable script
(`node scripts/check.mjs`), which is the CI engine. As the README puts it under
"why a script, not only a skill": a model can present the grade, but only a
deterministic gate with a real exit code can run in CI and let a plugin prove
itself. The skill is the door; the script is the engine, and both run the same
checks. You only reach for the script directly when you want grading in CI, a
pre-commit hook, or a plain terminal.

## What is the difference between a plugin and a skill library?

They live on two different axes, and the vocabulary keeps them apart on purpose.

- A **plugin** is structure: the unit of release. It packages components, carries
  the one version, and is the thing you install. A *component* (a skill, command,
  subagent, hook, workflow, chain contract, or MCP server) is the unit of reuse
  that sits inside it.
- A **skill library** is quality: the grade a plugin earns by conforming to the
  Standard (Bronze, Silver, or Gold). It is not a separate artifact you install.
  An *advanced skill library* is simply a plugin that has climbed to the high
  tiers.

The path is **loose components into a plugin into a skill library**. The same
plugin becomes a skill library by earning a grade; nothing new gets created.

## Why tiers?

Tiers turn "best-in-class" from an opinion into a worklist. A bare folder of
skills is loose components; the tiers (Bronze, Silver, Gold) are the rungs that
make it a coherent, portable, governed plugin, one rung at a time. Each rung
certifies a concrete capability:

- **Bronze (Universal)** makes a plugin *portable* - identical files that run on
  any compliant agent.
- **Silver (Convergent)** makes it *genuinely cross-agent* - the multi-agent
  machinery emitted in the right format for each agent.
- **Gold (Advanced)** makes it *self-proving* - hooks, self-hosting CI, eval and
  regression coverage, and a release and deprecation story.

Because the tier report names exactly what blocks the next rung, the climb is a
to-do list rather than a guess, and the same ladder serves both a beginner and an
advanced maintainer.

## Why deterministic grading instead of an LLM judge?

Trust and CI exit codes. A deterministic Node gate produces the same result every
run and exits non-zero on a real failure, which is what lets a plugin prove itself
in CI (Gold's `G2`, self-hosting CI). An LLM opinion cannot serve as a build gate
because it is not reproducible and has no exit code.

Judgment-based evaluation does exist in the toolkit - the behavioral and
qualitative modes of `askit-evaluate` - but it sits **beside** the gate as opt-in
evidence and never decides a pass or fail. The deterministic gate decides
conformance; the judgment layer adds color. They do not vote together.

## Does grading need the internet or a model?

No. The gate is portable Node with a single runtime dependency: a YAML parser. It
runs anywhere Node 22.12+ does, with no network call and no model invocation. That
is precisely what makes it suitable for CI and a pre-commit hook, where reaching
out to a model would be slow, costly, and non-deterministic.

The judgment-based modes are the exception by design - behavioral and qualitative
evaluation use a model - but they are opt-in and never gate a pass or fail, so the
deterministic core stays offline and model-free.

## How is this different from a per-skill linter?

A linter checks one file at a time. This gate grades the **whole library at
once** - the manifest, every component, cross-agent emission, CI, and lifecycle -
and reports the single tier the plugin earns. The unit of governance is the
library, not the skill. Rules like manifest-matches-disk, chain-contract
integrity, and self-hosting CI only make sense at the library level; a per-skill
linter has no way to express them.

## Can a Bronze plugin become Gold without rework?

Yes. The tiers are **monotonic**: each includes everything below it, so a Bronze
plugin grows into Silver and then Gold by *adding* the machinery each tier
certifies, never by redoing the earlier work. The beginner's first Bronze plugin
is the exact foundation the advanced track builds on. The bar rises, and the
earlier work still counts.

In practice you run `askit-evaluate` (or `node scripts/check.mjs`) at any point to
see the highest tier you satisfy and the burndown of what blocks the next one,
then close that list at your own pace while CI stays green throughout the climb.

## Where do I go next?

- [conformance and tiers](conformance-and-tiers.md) - how the checks and the tier
  report fit together.
- [`STANDARD.md`](../../STANDARD.md) - the normative (RFC-2119) Standard every tool
  here enforces.
- [`docs/how-to/`](../how-to/) - task guides for building components and climbing
  tiers.
- [`docs/reference/`](../reference/) - the per-component and per-check reference.
