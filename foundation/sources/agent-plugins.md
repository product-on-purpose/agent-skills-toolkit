---
title: "Source record - Agent Plugins"
---

# Agent Plugins

A new, vendor-neutral specification, found and first read during the 2026-10-23 provider survey (see
[`../surveys.md`](../surveys.md)). Not previously tracked anywhere in this repository.

| | |
| --- | --- |
| **Surveyed through** | **1.0.0** |
| **Surveyed on** | 2026-10-23, by the maintainer, with Claude |
| **Method** | `read` |
| **Specification** | `https://agent-plugins.org/specification.md` |
| **Schema** | `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json` |
| **Governance** | `https://github.com/agentplugins/agent-plugins-spec/blob/main/GOVERNANCE.md` |

## What it is

The specification describes itself as defining **"the format for packaging reusable components that
extend AI agents into distributable plugins."** Read 2026-10-23: *"Agent Plugins v1 defines exactly two
component types"* - **skills and MCP servers** - and other component types fall outside the v1 format.
That is narrower than this Standard's own component model (skills, subagents, commands, hooks, MCP),
and narrower again than a single-vendor plugin format such as Claude Code's, which also ships output
styles, workflows, themes and mods.

## Governance, quoted because it is the comparison's load-bearing fact

Read 2026-10-23 from the governance document, section 2 ("Technical Governance Structure"): **"No single
vendor may control a majority of Core Maintainer seats."** The same section states that governance roles
are held by individuals, with no seats reserved for specific companies. This is the fact
[`docs/explanation/comparison.md`](../../docs/explanation/comparison.md) and
[RS-C6](../../docs/internal/roadmap.md#rs-c6-the-agent-plugins-root-manifest-spike-then-adr) need re-read
against, not assumed.

## What this re-opens, and what it does not

**RS-C6** (the Agent Plugins root manifest question, [`docs/internal/roadmap.md`](../../docs/internal/roadmap.md))
asks whether `gen-manifest` should emit a portable root `plugin.json`, with a dated-no branch that
reopens on "a future spec revision introducing a components mechanism". **1.0.0 does not arm that
trigger**: it covers skills and MCP servers only, the same two component types a draft read earlier
already covered, with zero occurrences of `commands`, `agents`, `hooks` or a broader `components` key.
Annotated there with this reading rather than duplicated as a new backlog entry.

**The positioning claim in `docs/explanation/comparison.md`** - that no other tool combines
whole-library scope, a climbable tier ladder, a deterministic model-free gate, multi-agent native
emission, self-proving CI and provenance-split findings - is **not disturbed by this spec alone**: Agent
Plugins packages two component types for one plugin at a time, with no tier, no gate and no library-wide
grading. It is a packaging format this toolkit could target as an output, not a competing grader.

**The claim that "OpenAI's docs point new packages at this format"** was not independently confirmed this
pass; `platform.openai.com/docs/guides/building-plugins` redirects to
`developers.openai.com/api/docs/guides/building-plugins`, which was not read before this record closed.
**Confidence: low on that specific claim.** The next survey should read the redirected page before
repeating it.

## What this surface holds up

Nothing in the spine yet. It is new evidence for two existing tracked items, both annotated with this
reading rather than duplicated: **RS-C6**'s dated-no branch
([`docs/internal/roadmap.md`](../../docs/internal/roadmap.md)) and the positioning claim in
[`docs/explanation/comparison.md`](../../docs/explanation/comparison.md).
