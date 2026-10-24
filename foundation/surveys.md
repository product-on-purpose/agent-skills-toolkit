---
title: "Capability surveys"
---

# Capability surveys

The dated record of what the agent platforms shipped and what a human made of it. Written by
[`askit-capability-whats-new`](../skills/askit-capability-whats-new/SKILL.md); findings route to
[`askit-capability-gap-analysis`](../skills/askit-capability-gap-analysis/SKILL.md).

**Append only.** A section is a dated measurement of what was true when it was written. If a later survey
shows an earlier one was wrong, the correction goes in the **later** section, dated, naming what it
corrects. Rewriting a past section to today's numbers destroys the only evidence of what was known then.

Newest first.

---

## Survey 2026-10-23 (first-party provider survey, six clusters)

Surveyed by: jprisant, with Claude. **Scope: a targeted cluster read, not a full re-sweep** - it covers
six named clusters rather than every page on every surface. Claude Code CLI version at read time:
**2.1.309**, drifting to 2.1.310 partway through (`check-parity.test.mjs`'s own CLI run reported
2.1.310 in the same session).

**Clusters and pages read.** Claude Code mods (`plugins/mods/overview.md`); the plugin CLI verbs
(`plugins/cli-reference.md`, `plugin eval`/`plugin eval init`/`plugin tag`/`plugin test`/`plugin
validate` sections); the Skills API frontmatter whitelist and Claude-Code-only fields
(`skills.md`, and `platform.claude.com`'s Agent Skills overview for the Skills API's own `name` and
`description` rules); plugin agent loading asymmetries (`sub-agents.md`); plugin directory readiness
(`plugins/marketplace-reference.md`, `plugins/manifest-reference.md`); and the Agent Plugins
open-standard spec (`agent-plugins.org/specification.md` and its `GOVERNANCE.md`). The Codex component
list (`learn.chatgpt.com/docs/plugins.md`) and the Codex subagent configuration page
(`learn.chatgpt.com/docs/agent-configuration/subagents.md`) were also re-read end to end.

**What changed since the last read of each.** The Codex plugin-parts list dropped from six to four
(Connectors and Scheduled task templates are gone; Skills, MCP servers, Browser extensions, Hooks
remain) - `foundation/sources/codex.md` was last read 2026-08-18/v1.15.0 and said six. A Codex
standalone-agent surface now exists at `.codex/agents/*.toml` with `[agents]` defaults in
`config.toml`, not previously named in this repository's record of that surface. Agent Plugins is now
a ratified **1.0.0** spec with a governance document; this repository had no dated read of it at any
version before today. Everything else in the six clusters was new ground for this repository: no
previous survey or source record covered mods, the CLI verbs, the Skills API whitelist, the plugin
agent asymmetries, or the directory-readiness checks.

**Where each finding went.** The two Codex facts and the Agent Plugins read went to
[`foundation/sources/codex.md`](sources/codex.md) and the new
[`foundation/sources/agent-plugins.md`](sources/agent-plugins.md) (new file, listed in
[`sources/README.md`](sources/README.md)'s inventory). The Agent Plugins finding also annotated
[`docs/internal/roadmap.md`](../docs/internal/roadmap.md)'s RS-C6 (the root-manifest question),
because that is the item it bears on and duplicating it as a second backlog entry was judged worse
than annotating the existing one. The plugin-eval CLI verb corroborated roadmap.md's RS-C5 and
annotated it the same way. Six findings needed a decision or a build rather than a documentation fix,
and became [E84 through E89](backlog/enhancements.md#first-party-provider-survey-2026-10-23) (Claude
Code mods; the `plugin tag` version-agreement preflight; the Skills API frontmatter whitelist; plugin
agent loading asymmetries; the unchecked root-`SKILL.md` plugin shape; plugin directory readiness). One
finding (Codex's hook handler types versus Claude Code's five) was folded into `E48` as a dated note
rather than a new entry, because it is the same surface `E48` already tracks on an adjacent axis.

**What this survey did NOT do.** Re-sweep every page on any of the four pinned surfaces end to end;
confirm, beyond a redirect this pass did not follow, whether OpenAI's own docs point new packages at
the Agent Plugins format (recorded as low confidence in the new source record); or resolve any of the
six new backlog entries, all of which are open.

---

## Survey 2026-08-18 (the first, and a partial one)

Surveyed by: jprisant, with Claude (Opus 5). **Scope: partial, and stated as such** - this survey ran as
the verification pass behind the design of these two skills, not as a routine sweep. It established
whether the surfaces were surveyable at all, and it was not a full read of every version range.

Entries examined: Claude Code changelog structure and its most recent entries; Cowork changelog, 31
entries in window; Codex plugins documentation page. **Codex's version range was not read end to end**,
and its pin is recorded as `null` rather than guessed.

### Capability findings

- **[codex, announced by no release note] The documented plugin component list contains no subagents, and
  names three component types this Standard does not model.** Verbatim:

  > "A plugin can contain one or more of these parts: Skills, Connectors, MCP servers, Browser extensions,
  > Hooks, [and] Scheduled task templates."

  Source: `learn.chatgpt.com/docs/plugins.md`, read 2026-08-18.

  Touches the capability matrix's Codex column two ways. It **corroborates** the existing "Codex subagents
  are `config.toml` only; the plugin manifest has no `agents` field" row, which until now rested on
  round-trip testing alone. And it names **Connectors, Browser extensions and Scheduled task templates**,
  none of which this Standard models. Routed to gap analysis; filed there as a backlog item with a stated
  re-measurement trigger rather than an ADR, because the population of real plugins shipping any of the
  three is unmeasured.

### Claim-bearing findings

- **The Codex subagent absence is now QUOTABLE.** It can move from probe-derived knowledge to a `quote`
  claim in `foundation/claims/vendor-claims.json`, which costs nothing recurring - whereas a probe's age is its
  whole verification and blocks releases past a 30-day window. **Candidate claim, not yet filed.**

### Environmental findings

- **The Codex documentation host has moved.** `developers.openai.com/codex/plugins.md` returns a **308**
  to `learn.chatgpt.com/docs/plugins.md`. Recorded in the skill's `references/surfaces.md`. A host move is
  a documentation edit rather than a change of meaning, the same disposition `vendor-claims.json` already
  carries for the equivalent Claude Code move.
- **A documentation index exists for LLM consumption**, `claude.com/docs/llms.txt`, enumerating the
  available pages. It is what makes step 4 of the survey procedure possible without inventing URLs.

### The finding that costs, and it is about us

**Two shipped checks rest on Cowork behaviour with no quotable source.** `U6` (`reference-links`) skips
Cowork's `computer:` local-artifact scheme and `U11` (`mcp-valid`) tolerates its managed-connector pattern.
A search of Cowork's changelog on 2026-08-18 found **no mention of the `computer:` scheme at all**; the
connector language present is about settings and UI, not about an endpoint supplied at runtime.

The full Cowork documentation set was **not** swept, so this is "not found in the changelog" and not "does
not exist". Before either behaviour is filed as a `probe` claim, spend that search: a documented behaviour
is a `quote` and costs nothing recurring.

### What this survey did NOT do

Read Codex's version range end to end. Sweep the Cowork documentation set. File the candidate claim. Those
are the next survey's floor, and the pin records `codex: null` so the gap is visible rather than assumed
closed.
