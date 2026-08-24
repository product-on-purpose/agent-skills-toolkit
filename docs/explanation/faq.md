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
(`npx agent-skills-toolkit`), which is the CI engine. As the README puts it under
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

In practice you run `askit-evaluate` (or `npx agent-skills-toolkit`) at any point to
see the highest tier you satisfy and the burndown of what blocks the next one,
then close that list at your own pace while CI stays green throughout the climb.

## The gate says my plugin has 0 errors. Is it good?

No. It says the plugin has the shape the Standard requires. The gate never reads
for sense, so a plugin can pass every check at Gold and still contain a skill
whose instructions are wrong. That boundary is deliberate and is set out in
[what this toolkit cannot do](limitations.md#1-the-gate-checks-structure-never-quality).
The judgment pass is `--report=review`, and it renders beside the verdict rather
than inside it.

## The gate reported hundreds of errors on someone else's plugin. Did I break it?

Almost certainly you used the wrong profile. The default ladder includes
`house`-provenance checks that encode this project's own conventions, and a
plugin that never adopted the Standard has no reason to satisfy them. Grade a
plugin you do not own with `--profile plain-plugin`. On one real third-party
target the same tree scored **10 errors** under `plain-plugin` and **1034**
under the full ladder.

## It printed a clean pass but I do not think it read anything

On Windows, check your path separators. A backslash path makes `check.mjs`
silently grade an empty directory and report a clean pass. Use forward slashes.
The target is also **positional**, not a flag: `npx agent-skills-toolkit .`

## A check fired on something that is deliberately not live. Is that a bug?

Probably not, and the checks have been calibrated for exactly this. Links inside
fenced or inline code are stripped before `U6` scans. Mermaid blocks that are
pure `{{PLACEHOLDER}}` template slots, or commented out in HTML, are skipped by
`U12`. If a check fires on genuinely non-live content outside those cases, that
is worth reporting: the principle is that a check validates live content only.

## Why is my non-English skill description capped below the bar?

Because `U5` currently assumes English, and this is a known defect rather than a
judgment about your description. Its use-when trigger pattern is English-only, so
a description in another language cannot earn that 0.35 and is capped at 0.65
against a 0.7 bar. Measured on a French corpus, the pattern matched **0 of 346**.
`U5` is `house` provenance, so `--profile plain-plugin` drops it entirely, and it
warns rather than errors. Tracked as [E14, U5 assumes English and is unpassable in a language it does not know](https://github.com/product-on-purpose/agent-skills-toolkit/blob/main/docs/internal/backlog/enhancements.md).

## Does it work on a plugin that is not JavaScript?

Yes. The Standard is about structure, not implementation language, and a plugin
whose scripts are Python is graded the same way. Two practical notes: the gate
itself needs Node to run, and `G8` (folder-readme) will ask you to document every
folder, which is how build-artifact directories such as `__pycache__` tend to
surface. Gitignore those rather than documenting them.

## How do I grade a whole marketplace at once?

You cannot yet. The gate has plugin and component scopes only, so a catalogue is
graded by looping over its members, and anything that exists only *between*
members stays invisible. The workflow that does work, and what it misses, is in
[manage several plugins](../how-to/manage-multiple-plugins.md).

## The Standard added a check. Does my plugin fail now?

No. Your plugin declares `"standard": "<version>"` and the gate downgrades to a
warning any check introduced after that pin, so you are graded against the ruleset
you adopted rather than silently retightened under. You pick up new requirements
when you bump the pin. To see what a bump would cost first, run with `--strict`,
which grades against the newest spine regardless of pin.

## Should a brand-new plugin pin an older Standard?

No. The pin exists to protect an existing plugin from retroactive tightening, and
a new plugin has no legacy to protect. Start on the current Standard; starting
behind means inheriting warnings you never earned.

## Where do I go next?

- [what this toolkit cannot do](limitations.md) - the honest boundary, in full.
- [conformance and tiers](conformance-and-tiers.md) - how the checks and the tier
  report fit together.
- [`STANDARD.md`](../../STANDARD.md) - the normative (RFC-2119) Standard every tool
  here enforces.
- [`docs/how-to/`](../how-to/) - task guides for building components and climbing
  tiers.
- [`docs/reference/`](../reference/) - the per-component and per-check reference.
