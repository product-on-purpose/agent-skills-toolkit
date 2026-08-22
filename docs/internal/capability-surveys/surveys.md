---
title: "Capability surveys"
---

# Capability surveys

The dated record of what the agent platforms shipped and what a human made of it. Written by
[`askit-capability-whats-new`](../../../skills/askit-capability-whats-new/SKILL.md); findings route to
[`askit-capability-gap-analysis`](../../../skills/askit-capability-gap-analysis/SKILL.md).

**Append only.** A section is a dated measurement of what was true when it was written. If a later survey
shows an earlier one was wrong, the correction goes in the **later** section, dated, naming what it
corrects. Rewriting a past section to today's numbers destroys the only evidence of what was known then.

Newest first.

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
