---
name: askit-capability-whats-new
description: Surveys what the agent platforms shipped since this repository last looked, diffing each vendor's release feed forward from a recorded version pin, and writes a dated survey record without deciding anything. Use when asking what is new in Claude Code, Claude Cowork, Codex or the agentskills.io spec, before planning a release that claims to be current with the vendors, or on a periodic currency sweep.
metadata:
  version: 0.1.0
  tier: universal
  audience: advanced
---

# askit-capability-whats-new

## Purpose

This repository asserts facts about software it does not control: what a runtime loads, what a manifest may declare, which component types a plugin can ship. Those facts reach the gate as normative text and as shipped findings, and **every one of them was a page somebody read once.**

Two machines already re-verify what we have written down. [`askit-standards-watch`](../askit-standards-watch/SKILL.md) re-checks the agentskills.io specification against a pinned blob, and `npm run vendor-watch` re-checks pinned vendor sentences against the live page. Both answer the same question: **did a fact we already depend on stop being true?**

Neither answers the other question, and nothing did before this skill: **what did the vendor ship that we have not looked at yet?** A regression watch is blind to a new capability by construction, because a capability nobody has written down has no pin to fail.

This skill discovers and records. It owns `docs/internal/capability-surveys/`.

## When to use

When someone asks what is new in Claude Code, Cowork, Codex or the upstream spec; before a release that will claim currency with the vendors; on a periodic sweep; or when a decision is about to rest on "the vendor probably supports that."

## The one hard rule

**This skill DISCOVERS and DOCUMENTS. It decides nothing.**

It does not edit the capability matrix, a check module, `STANDARD.md`, `vendor-claims.json`, any pin other than its own proposed one, or a component's frontmatter. Deciding what a vendor change *means for us* is [`askit-capability-gap-analysis`](../askit-capability-gap-analysis/SKILL.md), and ratifying that is an ADR.

The separation is not bureaucratic. A survey that also proposed changes would be graded on how much it found, and a survey graded on volume stops reporting "nothing material", which is the most common and most useful result it produces.

## Procedure

### 1. Read the pin, and never survey from a date

`docs/internal/capability-surveys/surveyed-pin.json` records, per surface, the **version** last surveyed. Start there.

**A version, not a date, and the reason is load-bearing.** Every surface **this skill pins** publishes versioned release entries, so "everything after `2.1.208`" is exact, re-derivable by anyone, and unaffected by when you happen to run this. A date pin silently loses anything published out of order or backdated, and gives two people different answers for the same question.

**The agentskills.io spec is the exception, and it is not this skill's surface.** It has no versioned feed at all, which is exactly why [`askit-standards-watch`](../askit-standards-watch/SKILL.md) pins a git blob SHA-1 instead and stays a separate skill. Do not try to version-pin it here and do not treat its absence from your pin as a gap - see [references/surfaces.md](references/surfaces.md).

If a surface has no pin yet, say so and survey a stated window instead - then record what you surveyed **from**, so the next run has a floor.

### 2. Fetch each surface listed in [references/surfaces.md](references/surfaces.md)

That file is the static index: per surface, the release feed, the documentation index where one exists, and what in this repository depends on that surface. **Do not invent a URL.** If a surface is not in the index, it is not surveyed; add it to the index in a separate change first.

**A redirect is a finding, not a detour.** Follow it, and record the move. A vendor moving its documentation host is exactly the kind of silent change this skill exists to catch, and it has happened at least once already.

**If a surface cannot be read, the run REFUSES.** Report which surface and stop. A survey that quietly skips a vendor and reports the rest reads as coverage it does not have.

### 3. Classify every entry, and record the ones that are not capabilities too

For each release entry after the pin, assign exactly one class:

| Class | Means | Where it goes |
|---|---|---|
| **capability** | a component type, manifest field, discovery rule or invocation surface changed | the survey record, and it is the input to `askit-capability-gap-analysis` |
| **claim-bearing** | it touches a sentence or behaviour `vendor-claims.json` pins | the survey record, **plus a candidate claim** for that file |
| **environmental** | a host move, a rename, a docs restructure | the survey record only |
| **not relevant** | a bug fix or feature touching nothing this repository models | counted, not enumerated |

**Count the fourth class rather than listing it.** A survey that enumerates 40 irrelevant entries buries the two that matter, and the count is what proves the sweep was complete.

### 4. Confirm a capability entry against the documentation, not against the release note

A release note announces; a documentation page specifies. **A capability finding is not usable until you have read the page that describes it**, because the gap analysis needs the actual contract, not a one-line summary.

**And search the documentation even when no release announced anything.** A page can gain a section describing behaviour that shipped silently, and this is not hypothetical: the sentence establishing which component types a Codex plugin may contain sits on a documentation page and was announced by no release note.

### 5. Propose the survey record, including when nothing was found. Do not write it.

Emit one dated section for `docs/internal/capability-surveys/surveys.md`, in the format in [references/survey-record.md](references/survey-record.md), for a human to land **together with the pin from step 6**.

**Both artifacts are proposed and neither is written, which is the folder's stated contract** ([capability-surveys/README.md](../../docs/internal/capability-surveys/README.md)): a human lands them together so the pin and the reading move as one. A skill that wrote the record but only proposed the pin could leave the two describing different runs, which is the precise divergence the contract exists to prevent.

Never rewrite an existing section: a survey record is a dated measurement, and correcting a past one to today's numbers destroys the only evidence of what was true then.

**A survey that found nothing material still writes its section.** Six months on, a review that never ran and a review that found nothing are indistinguishable unless the second one said so.

### 6. Propose the new pin. Do not write it.

Emit the new `surveyed-pin.json` to stdout for a human to review and land alongside the record. **The pin is the claim that everything up to that version has been looked at.** A pin advanced by a tool that skipped a surface, or that read a release note without opening the page, is the same defect as a version comment nobody re-checked.

### 7. Stop

Hand the record to `askit-capability-gap-analysis`. Do not open the capability matrix, and do not start drafting an ADR.

## What this can and cannot do

It reliably reports **that** a version range contains entries, **which** entries touch something this repository models, and **where** the documentation describes them. Every step is re-derivable: the pin is a published version string and the sources are in a tracked index.

It does **not** decide whether a capability should be adopted, modelled in the Standard, or added to a check. It does not judge severity. And it cannot see a capability the vendor shipped and documented nowhere - that gap closes only by probing, which is `vendor-claims.json`'s `probe` mechanism and a different kind of work.

## Scope

One skill, one obligation: keep "what shipped upstream" an answerable question with a date and a version on it. It does not grade a plugin (`askit-evaluate`), advise which agent runs what (`askit-capability-advisor`), assess our gaps (`askit-capability-gap-analysis`), or cut a release (`askit-release`).
