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
| 2026-08-24 | shared pool; the claim HOLDS. Installed A then B | **side A** |

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

## 2026-08-24: re-run, unchanged, and it corroborates the install-order refinement

Both plugins were installed A then B, and both report a skill named `probe-duplicate` in their own inventory. The resolution question was answered headlessly, which records the actual tool call rather than an assertion about it:

```
grep -o '"skill":"[^"]*"'   ->  "skill":"probe-duplicate"
grep -o 'Probe duplicate, side [AB]'  ->  Probe duplicate, side A
```

**The Skill tool fired under the BARE name**, with no plugin prefix and no disambiguation, and side A answered. That is the first outcome in the table: a shared pool, one winner, silently.

Installing A before B and getting A **matches the install-order refinement** the 2026-08-20 pair established. It is a third data point in the same direction rather than a new finding. `verifiedOn` advances to 2026-08-24.

## 2026-09-17: **CHANGED.** The bare name no longer resolves - it is refused with a disambiguation

Run on **Claude Code 2.1.275**. The 2026-08-24 run was the third consecutive observation of a shared
pool resolving silently to one side. That is no longer what happens.

Both plugins still report a skill named `probe-duplicate` in their own inventory, and installing the
second was **not** refused as a conflict. The change is in RESOLUTION:

```
CALL probe-duplicate   is_error=true
  -> <tool_use_error>Unknown skill: probe-duplicate. Several skills match that name:
     probe-collision-a:probe-duplicate, probe-collision-b:probe-duplicate - invoke one by its full name.</tool_use_error>
```

**This is the raw `tool_result`, not the model's account of it.** That distinction is the point of
running headless with `stream-json`: the session's own summary of this run was accurate, but it did not
have to be, and a probe that rests on a model's narration is not evidence.

**Reproduced with the install order reversed** (B then A), per this folder's own protocol. Identical
refusal; only the order the two candidates are LISTED IN follows install order. So the install-order
refinement established on 2026-08-20 and corroborated on 2026-08-24 no longer has anything to refine -
there is no winner to follow the order.

| | 2026-08-24 (and the two runs before it) | 2026-09-17 |
| --- | --- | --- |
| Bare `probe-duplicate` | fired, silently, side A answered | **refused, `is_error=true`** |
| Prefixed names | not exercised | both resolve: `probe-collision-a:probe-duplicate`, `probe-collision-b:probe-duplicate` |

**This is the corrected row 2, and it is the case the 2026-08-20 note was written to protect.** That note
warned that row 2 tests the LISTING while the claim is about RESOLUTION, and said to read row 2 as
applying **only where the bare name fails to resolve or forces a disambiguation**. That is exactly what
was observed. The 2026-08-20 fourth outcome - prefixed entries listed while the bare name still resolved
silently - is not what happened here: the bare name was tried and it failed.

## `verifiedOn` is NOT advanced, and that is the whole point

Per this folder's README, a date is refreshed **as a record of a reading, never to make a run green**.
The claim did not survive the reading, so bumping the date would convert a vendor change into a silent
renewal - the single failure mode the probe mechanism exists to prevent. The probe therefore still
blocks from **2026-09-24**, and that deadline is now a feature: it forces the decision.

## What this does NOT settle

**Do not retire anything on this record alone.** `onChange` says a namespacing runtime means
`marketplace-skill-collision` and `marketplace-command-collision` should be RETIRED rather than
graduated, and ADR 0051 says so explicitly. Two things must be answered first, and neither is answered
here:

1. **The claim is conditional on the agent.** Its own wording is "on any agent that **does not namespace
   components by plugin**". This run measured **Claude Code only**. Codex is the other target this
   project emits for, and whether it shares a namespace is untested. Retiring a marketplace check that
   still protects Codex adopters on evidence gathered from Claude Code would be reasoning past the
   measurement.
2. **A refusal is not the same as no cost.** The harm the two checks warn about - the wrong component
   silently winning - does appear to be gone on Claude Code. But a collision now makes the bare name
   **unusable for every consumer of both plugins**, which is a different and still real cost. "Retire"
   and "downgrade to a warn that describes the new failure" are different rulings and the choice
   between them belongs in an ADR.

Evidence for both runs was captured headlessly and the fixtures were removed afterwards
(`claude plugin marketplace remove askit-probe-fixtures`, verified with `claude plugin list`).


## RESOLVED the same day by [ADR 0060](../../decisions/0060-a-runtime-that-refuses-a-collision-downgrades-the-check-it-does-not-retire-it.md)

**The section above is preserved exactly as written, including its statement that `verifiedOn` is NOT advanced.** That was true at the moment of the reading and is the honest record of it: the claim had failed and nothing had yet decided what the failure meant. Rewriting it now would erase the gap between observing a change and ruling on it, and that gap is what this whole mechanism exists to hold open.

**What changed after it.** ADR 0060 ruled the change a **DOWNGRADE, not the retirement** that `onChange` and ADR 0051 anticipated:

- `marketplace-skill-collision` and `marketplace-command-collision` go `error` to `warn`.
- Their message stops claiming *which one wins is undefined*, because nothing wins.
- Both keep `reqId: null` and stay off the spine. ADR 0051's unilateral-remedy test is untouched by a severity change.
- The claim text is rewritten to the measured behaviour and **`verifiedOn` advances to 2026-09-17** - on the strength of the reproduction actually run that day, not to clear the wall. The wall is what forced the ADR instead of a silent renewal.

**Blast radius measured, not argued.** The real `agent-plugins` catalogue was graded before and after the change: **byte-identical**. Three collection errors both times, all `marketplace-version-agreement`, zero collection warnings, verdict RED. No catalogue in the family currently has a skill or command collision, so this change is preventive and has never fired in anger. That is exactly why the severity is pinned by a unit test proven able to fail in both directions - restoring `SEVERITY.ERROR` fails it, and restoring the *shared pool / which one wins is undefined* wording fails it - rather than left for a catalogue to catch.

## 2026-10-13: re-run, unchanged, on Claude Code 2.1.296

Headless `claude -p --output-format stream-json --verbose`, one fresh session per install order. Each
session made exactly one tool call, `Skill`, read no file, and got back the raw `tool_result`:

```
A then B:  <tool_use_error>Unknown skill: probe-duplicate. Several skills match that name:
           probe-collision-a:probe-duplicate, probe-collision-b:probe-duplicate — invoke one by its full name.</tool_use_error>
B then A:  <tool_use_error>Unknown skill: probe-duplicate. Several skills match that name:
           probe-collision-b:probe-duplicate, probe-collision-a:probe-duplicate — invoke one by its full name.</tool_use_error>
```

**The same refusal as 2026-09-17.** No body came back in either run, so nothing wins, and only the order the
candidates are listed in follows install order. `claude plugin details` lists `Skills (1) probe-duplicate`
for each plugin. ADR 0060's `warn` ruling stands unchanged. `verifiedOn` advances to 2026-10-13, and the
probe blocks from **2026-11-13**. Fixtures removed afterwards with
`claude plugin marketplace remove askit-probe-fixtures`; `claude plugin list` shows no probe plugin and
`.claude/settings.local.json` holds no `probe` entry.

## 2026-10-23: re-run, unchanged, on Claude Code 2.1.310

Headless `claude -p --output-format stream-json --verbose`, one fresh session per install order, run
from this repository's worktree root. Each session made exactly one tool call, `Skill`, with the bare
input `"skill":"probe-duplicate"`, read no file, and got back the raw `tool_result`:

```
A then B:  <tool_use_error>Unknown skill: probe-duplicate. Several skills match that name:
           probe-collision-a:probe-duplicate, probe-collision-b:probe-duplicate — invoke one by its full name.</tool_use_error>
B then A:  <tool_use_error>Unknown skill: probe-duplicate. Several skills match that name:
           probe-collision-b:probe-duplicate, probe-collision-a:probe-duplicate — invoke one by its full name.</tool_use_error>
```

**The same refusal as 2026-09-17 and 2026-10-13.** No body came back in either run, so nothing wins, and
only the order the candidates are listed in follows install order. `claude plugin details` lists
`Skills (1) probe-duplicate` for each plugin, confirming each installs cleanly without being refused as
a conflict. ADR 0060's `warn` ruling stands unchanged. `verifiedOn` advances to 2026-10-23, and the
probe blocks from **2026-11-23**, measured with `node scripts/vendor-watch.mjs . --today`: 2026-11-22
reports 0 stale and 2026-11-23 reports 2. Fixtures removed afterwards with
`claude plugin marketplace remove askit-probe-fixtures`; `claude plugin list` shows no probe plugin, and
`.claude/settings.local.json` holds no `probe` entry.

## 2026-10-25: re-run, unchanged, on Claude Code 2.1.310

Headless `claude -p --output-format stream-json --verbose`, one fresh session per install order, run
from this repository's worktree root. Each session made exactly one tool call, `Skill`, with the bare
input `"skill":"probe-duplicate"`, read no file, and got back the raw `tool_result`:

```
A then B:  <tool_use_error>Unknown skill: probe-duplicate. Several skills match that name:
           probe-collision-a:probe-duplicate, probe-collision-b:probe-duplicate — invoke one by its full name.</tool_use_error>
B then A:  <tool_use_error>Unknown skill: probe-duplicate. Several skills match that name:
           probe-collision-b:probe-duplicate, probe-collision-a:probe-duplicate — invoke one by its full name.</tool_use_error>
```

**The same refusal as every re-run since 2026-09-17.** No body came back in either run, so nothing wins,
and only the order the candidates are listed in follows install order. `claude plugin details` lists
`Skills (1) probe-duplicate` for each plugin, confirming each installs cleanly without being refused as
a conflict. ADR 0060's `warn` ruling stands unchanged. `verifiedOn` advances to 2026-10-25, and the
probe blocks from **2026-11-25**, measured with `node scripts/vendor-watch.mjs . --today`: 2026-11-24
reports 0 stale and 2026-11-25 reports 2. Fixtures removed afterwards with
`claude plugin marketplace remove askit-probe-fixtures`; `claude plugin list` shows no probe plugin, and
`.claude/settings.local.json` holds no `probe` entry.
