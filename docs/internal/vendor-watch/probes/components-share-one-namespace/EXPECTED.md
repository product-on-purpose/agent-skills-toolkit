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

**Record which side won even when the claim holds.** The claim is that the winner is undefined, so a run
where A wins and a later run where B wins are both confirmations, and the pair is stronger evidence than
either alone.

## Run log

| Date | Result | Which side won |
| --- | --- | --- |
| 2026-08-12 | shared pool; the claim holds | not recorded at the time |
| 2026-08-19 | **PARTIAL - not a verification** | see below |

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

Add a row every time, including confirming runs.
