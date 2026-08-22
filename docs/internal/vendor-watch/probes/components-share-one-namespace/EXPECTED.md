---
title: "components-share-one-namespace - what each run observed"
---

# `components-share-one-namespace`

**The question.** When two installed plugins ship a component with the same name, do the names share one
pool, or does the agent namespace components by plugin?

**Why anyone cares, and note the direction.** ADR 0051 made this claim the stated reopening condition for
`marketplace-skill-collision` and `marketplace-command-collision`. **If a runtime starts namespacing by
plugin, those two checks should be RETIRED, not graduated** - this is the one claim whose change makes
the gate report LESS, not more.

## How to run it

1. Install **both** `probe-collision-a/` and `probe-collision-b/` into a scratch Claude Code environment.
   Installing one proves nothing.
2. Start a **fresh session**.
3. Invoke the skill named `probe-duplicate` and read which side answers.

## What to look for

Three distinguishable outcomes, and they mean different things:

| What you see | What it means |
| --- | --- |
| One `probe-duplicate` exists; it answers `I am side A` **or** `I am side B` | **Shared pool.** The claim holds. Which side wins is undefined and may differ between runs - note which one you got. |
| Two entries exist, distinguished by plugin | **Namespaced.** The claim has CHANGED. Stop and read `onChange`. |
| Installing the second plugin is refused as a conflict | **Neither.** The runtime rejects collisions rather than resolving them; that is a third behaviour and needs its own claim. |

> **2026-08-20 - this table is incomplete, and its second row is actively misleading.** The run of
> 2026-08-20 observed a FOURTH outcome that is not listed: **both entries appear in the listing under
> their plugin prefix AND the bare name still resolves silently to one of them.** Row 2 as written
> ("Two entries exist, distinguished by plugin" -> "the claim has CHANGED") fires on that observation
> and would have retired two shipped checks. Row 2 tests the **listing**; the claim is about
> **resolution**. Read it as applying only where the bare name fails to resolve or forces a
> disambiguation. The rows are left as written rather than rewritten, per this repository's supersede
> convention.

**Record which side won even when the claim holds.** The claim is that the winner is undefined, so a run
where A wins and a later run where B wins are both confirmations, and the pair is stronger evidence than
either alone.

## Run log

| Date | Result | Which side won |
| --- | --- | --- |
| 2026-08-12 | shared pool; the claim holds | not recorded at the time |
| 2026-08-19 | **PARTIAL - not a verification** | see below |
| 2026-08-20 | shared pool; the claim HOLDS. Installed A then B | **side A** |
| 2026-08-20 | shared pool; the claim HOLDS. Installed B then A | **side B** |

### 2026-08-19: one outcome ruled out, the question itself still open

**This run did NOT discharge the probe, and `verifiedOn` was deliberately NOT advanced.**

What it established: both plugins install cleanly at local scope, and `claude plugin details` reports
`Skills (1) probe-duplicate` for **each** of them. So the third possible outcome - *the runtime refuses
a colliding install* - **is ruled out**. Two plugins can be installed that both declare the same skill
name.

What it did not establish: **which one wins.** `claude plugin details` reports each plugin's own
inventory; it says nothing about resolution between plugins. Answering that needs a fresh session in
which `probe-duplicate` is actually invoked and one side answers.

**Recorded as partial on purpose.** Advancing the date here would reset a thirty-day clock on evidence
that does not exist, which is the one thing this whole mechanism is built to prevent.

### 2026-08-20: DISCHARGED. The claim holds, and the winner follows install order

**This run discharged the probe.** `verifiedOn` advanced to **2026-08-20**, which moves the blocking
date to **2026-09-20**. (Written as 2026-09-19 on the day and corrected 2026-08-22: the gate marks a
probe stale on `age > 30`, so blocking starts at `verifiedOn` + 31, not + 30.)

**The instrument was not the one this folder documents, and that is worth knowing.** The README's
procedure is an interactive fresh session. This run used **headless fresh sessions** instead, on
Claude Code 2.1.238:

```
claude -p '<prompt>' --permission-mode bypassPermissions --output-format stream-json --verbose
```

The substitution is strictly stronger evidence for this particular probe, because `stream-json`
records the **actual tool calls**. "The skill was invoked" becomes a receipt rather than a claim about
what the session did, and each `claude -p` is a genuinely fresh session, which is the condition the
probe requires. It is also faster than the documented path, so treat it as the default from here.

**Three runs, each closing exactly one question.**

1. **The listing, established with zero tool calls.** Asked only to list skills matching
   `probe-duplicate`. The event stream contains **no `tool_use` block of any kind** - no Read, Grep,
   Glob or Bash - so the answer came from the session's own prompt rather than from reading the
   fixture files, which sit inside this repository and are otherwise readable. That confound is real
   and had to be closed. Result: **two entries**, `probe-collision-a:probe-duplicate` and
   `probe-collision-b:probe-duplicate`.

2. **Bare-name invocation, A installed first.** The Skill tool input was recorded in the stream as
   `"skill":"probe-duplicate"` - the **bare** name, no plugin prefix. It resolved with no error and no
   disambiguation. The returned skill body carried its own path receipt:

   ```
   Base directory for this skill: ...\probes\components-share-one-namespace\probe-collision-a\skills\probe-duplicate
   # Probe duplicate, side A
   ```

3. **Bare-name invocation, B installed first.** Both fixtures uninstalled and reinstalled in the
   opposite order; nothing else changed. Same bare input `"skill":"probe-duplicate"`:

   ```
   Base directory for this skill: ...\probes\components-share-one-namespace\probe-collision-b\skills\probe-duplicate
   # Probe duplicate, side B
   ```

**What that establishes.** The winner **follows install order**, and alphabetical order is ruled out:
side B won when installed first, despite sorting second. The listing order flipped with it, and in
both runs the bare name resolved to whichever entry was listed first. Two runs where opposite sides
win is exactly the pair this file asks for, and it is the direct evidence for the claim's word
**undefined**: nothing either plugin's author can see or control decides the outcome.

**Why the two checks are NOT retired.** `onChange` retires `marketplace-skill-collision` and
`marketplace-command-collision` if a runtime namespaces components by plugin. Claude Code does
**both things at once**: it offers prefixed addressing, and it keeps a shared bare-name pool with a
silent winner. The prefix is an escape hatch, not a namespace that removes the collision. An adopter
typing the plain name still gets an arbitrary side, so the reopening condition stated in ADR 0051 (no
cross-member finding graduates to the spine) is **not met**, and both checks stand.

**Not established, and do not let it drift into being established.** Whether the two-entry prefixed
listing is new. The 2026-08-12 run recorded a result but not the listing, so this run cannot say
whether the entry count changed or was simply never looked at. The fourth outcome is not evidence of
a vendor change on this record.

Add a row every time, including confirming runs.
