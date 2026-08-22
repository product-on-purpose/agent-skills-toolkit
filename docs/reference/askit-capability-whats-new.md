---
title: "askit-capability-whats-new"
description: "Surveys what the agent platforms shipped since you last looked, diffing each vendor's release feed forward from a recorded version pin, and writes a dated survey record without deciding anything."
audience: engineer
level: advanced
tags: [governance, capability, upstream, vendors, survey]
---

# Reference: `askit-capability-whats-new`

The first of three skills in the **capability family**. It answers one question and refuses the next one.

| Skill | Question |
|---|---|
| **`askit-capability-whats-new`** | **what shipped upstream since we last looked?** |
| [`askit-capability-gap-analysis`](askit-capability-gap-analysis.md) | what does that mean for us? |
| [`askit-capability-advisor`](askit-capability-advisor.md) | what can an author build on a given agent? |

## Why it exists

A plugin standard asserts facts about software it does not control: what a runtime loads, what a manifest may declare, which component types can ship. Two kinds of machine keep those honest, and they are not the same kind.

A **watch** re-checks something already written down - `askit-standards-watch` against a pinned specification blob, `vendor-watch` against pinned vendor sentences. Both answer *"did a fact we depend on stop being true?"*

**Neither can see a capability nobody has written down yet**, because a capability with no pin has nothing to fail. That is this skill's question, and no watch can be extended to cover it.

## What it does

1. Reads a pin recording, per surface, the **version** last surveyed.
2. Fetches each surface named in its static index - never a constructed URL.
3. Classifies every release entry as **capability**, **claim-bearing**, **environmental**, or **not relevant** (counted, not listed).
4. Confirms a capability entry against the **documentation page**, not the release note.
5. Appends a dated section to the survey record - **including when it found nothing**.
6. **Proposes** a new pin. It does not write one.

## Three design choices worth knowing

**It pins a version, not a date.** Every surface publishes versioned entries, so "everything after `2.1.208`" is exact and re-derivable by anyone. A date pin silently loses anything published out of order and gives two readers different answers to the same question.

**It is a periodic human survey, not an automated diff.** Measured on 2026-08-18: one platform moved through 29 versions inside a single changelog window, and another carried 31 entries. **An alarm firing weekly on entries that almost never matter trains its reader to close it unread** - and then the alarm's existence is itself false assurance. The same reasoning is why `vendor-claims.json` pins sentences rather than hashing pages.

**It reads documentation pages, not just release feeds.** The single most useful finding of its first run was announced by no release note at all: a documentation page states which component types a Codex plugin may contain, and that sentence both corroborated something previously known only by experiment and named three component types the Standard does not model.

## What it will not do

Decide anything. It does not edit the capability matrix, a check, the Standard, a vendor claim, or a component's frontmatter. **A survey that also proposed changes would be graded on how much it found**, and a survey graded on volume stops reporting "nothing material" - which is its most common and most useful result.

It also cannot see a capability the vendor shipped and documented nowhere. That gap closes only by probing, which is a different mechanism with a different cost.

## Outputs

| Artifact | Nature |
|---|---|
| `foundation/surveys.md` | append-only dated record; never rewritten |
| `foundation/claims/surveyed-pin.json` | proposed, landed by a human alongside the record |
| candidate claims | routed to `vendor-claims.json`, not written by this skill |

**Nothing here blocks a release.** An old survey means work is waiting, not that a claim expired - which is deliberately unlike a stale `probe` claim, whose age is its whole verification.
