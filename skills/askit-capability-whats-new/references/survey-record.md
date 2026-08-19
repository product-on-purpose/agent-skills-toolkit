# The survey record and the pin (reference)

Two artifacts, split the same way [`askit-standards-watch`](../../askit-standards-watch/SKILL.md) splits its own, because that split has already proved itself: a **machine half** that is exact and re-derivable, and a **human half** that carries the reading.

| Artifact | Half | Rewritten? |
|---|---|---|
| `docs/internal/capability-surveys/surveyed-pin.json` | machine | replaced wholesale each survey |
| `docs/internal/capability-surveys/surveys.md` | human | **append only, never edited** |

## The pin

```json
{
  "schema": "askit-capability-survey-pin/1",
  "about": "The last release of each surface that has been SURVEYED. Not the latest release that exists - the latest one a human has read. The gap between the two is the work.",
  "surfaces": {
    "claude-code": { "surveyedThrough": "2.1.235", "surveyedOn": "2026-08-18", "by": "<name>" },
    "cowork": { "surveyedThrough": "v1.32885.1", "surveyedOn": "2026-08-18", "by": "<name>" },
    "codex": { "surveyedThrough": "<version>", "surveyedOn": "<date>", "by": "<name>" }
  }
}
```

**`surveyedThrough` is a version string the vendor published, copied verbatim.** Not normalised, not parsed into semver, not decorated. A reader must be able to search the vendor's own changelog for that exact string and find the entry the survey stopped at.

**`surveyedOn` is when a human read it**, and it is a note rather than a gate. Nothing blocks on this file being old, deliberately: an old survey means work is waiting, not that a claim has expired. The mechanisms that *do* block on age are the `probe` claims in `vendor-claims.json`, and that asymmetry is intentional - a probe's age is its whole verification, whereas a survey's age is just a backlog.

**`by` is a person.** A survey is a reading, and readings have readers.

## The survey record

One appended section per survey, newest at the top of the release-by-release list:

```markdown
## Survey 2026-08-18 (claude-code 2.1.208 to 2.1.235, cowork v1.30096.1 to v1.32885.1)

Surveyed by: <name>. Entries examined: 29 Claude Code, 31 Cowork, N Codex.
Not relevant: 24 / 29 / N.

### Capability findings

- **[claude-code 2.1.232] Subagent forking is on by default.** `subagent_type: "fork"` inherits the
  full conversation and prompt cache. Confirmed on <docs page URL>. Touches: the capability matrix's
  subagent row; possibly `S4` chain-contract semantics. -> gap analysis.

### Claim-bearing findings

- **[cowork v1.32352.1] The wording around connector endpoints changed.** Touches
  `vendor-claims.json` claim `plugin-agent-unsupported-fields`. -> candidate claim, wording attached.

### Environmental findings

- **Codex documentation host moved.** `developers.openai.com/codex/plugins.md` now 308s to
  `learn.chatgpt.com/docs/plugins.md`. `references/surfaces.md` updated in this change.

### Nothing found for

- agentskills.io spec: no versioned feed; `npm run standards-watch` reports unchanged as of <date>.
```

### The four rules that make the record worth keeping

**Every section states what it examined and what it dismissed.** "Entries examined: 29, not relevant: 24" is what proves the sweep was complete. A record listing only findings cannot be distinguished from a record of a sweep that stopped early.

**A survey that found nothing still writes a section.** It says so, with its ranges and counts. Six months later, a survey that never ran and a survey that found nothing look identical unless the second one is on the page.

**A finding cites the documentation page, not the release note.** The release note is how you found it; the page is what the gap analysis has to reason about. A finding with no page reference is a lead, and it should say so rather than pretending to be a fact.

**Sections are never edited after they are written.** If a later survey shows an earlier one was wrong, the correction goes in the LATER section, dated, naming what it corrects. This repository has already established the rule in both directions: a stale claim must be corrected, and **a dated historical measurement must not be rewritten to today's numbers.**

## What the record is not

It is not a decision, a backlog, or a plan. Every finding routes somewhere else - to `askit-capability-gap-analysis` for a capability, to `vendor-claims.json` for a claim-bearing one - and this file keeps only the reading and the date.
