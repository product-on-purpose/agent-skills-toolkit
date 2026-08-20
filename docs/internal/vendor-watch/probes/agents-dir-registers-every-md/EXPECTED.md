---
title: "agents-dir-registers-every-md - what each run observed"
---

# `agents-dir-registers-every-md`

**The question.** Does Claude Code register EVERY `.md` file it finds under `agents/`, or does it
special-case conventional filenames like `README.md` and `_README.md`?

**Why anyone cares.** `U15` (agents-dir-registerable) exists because the answer is *every file*, and
`G8` exempts `agents/` from the folder-README requirement for the same reason - requiring a README there
would have made every conforming plugin register a phantom subagent. If the runtime starts excluding
these filenames, `U15` loses its vendor grounding and becomes a house convention. See ADR 0046 and
`STANDARD.md` sec 3.3.

## How to run it

1. Install `probe-agents-scan/` into a scratch Claude Code environment.
2. Start a **fresh session** - registration is read at session start.
3. List the available subagents.

## What to look for

The directory holds four files. Count how many became subagents, and which.

| File | Registered on 2026-08-06 |
| --- | --- |
| `real-agent.md` | **yes** |
| `README.md` | **yes** |
| `_README.md` | **yes** |
| `README.txt` | no |

**Three of four. The underscore prefix protected nothing; only the non-`.md` extension was skipped.**

## Scope, and do not generalise past it

**This probe covers a FLAT directory only.** Recursion into subdirectories and the colon-exclusion rule
are separate QUOTE claims (`agents-scanned-recursively`, `agent-filename-colon-excluded`) with their own
evidence. Generalising this probe past its evidence is exactly what let nested agents bypass `U14` and
`U15` until review wave 1 caught it.

## Run log

| Date | Result | Notes |
| --- | --- | --- |
| 2026-08-06 | three of four registered, as above | the run that established the claim |
| 2026-08-19 | **three of four, identical** | re-run with a DIFFERENT instrument, see below |

### 2026-08-19, and the method differs from 2026-08-06

Run with Claude Code's own `claude plugin details`, which prints the component inventory the runtime
builds from a plugin. Verbatim:

```
Component inventory
  Skills (0)
  Agents (3)  README, real-agent, _README

Per-component (rounded)
  component   always-on  on-invoke
  README            ~60        ~70
  real-agent        ~50       < 20
  _README           ~50        ~50
```

**The claim holds exactly**: three of four, `README.txt` skipped, the underscore prefix protecting
nothing.

**State the instrument difference rather than glossing it.** 2026-08-06 listed registered subagents in a
live session; this run read the runtime's inventory command. Stronger in one way - it is Claude Code's
own loader, reproducible from a shell in thirty seconds, and it survives having no fresh session to
hand. Weaker in another - inventory is what the runtime says it will load, not an observation of a
session having loaded it. **The two agree, which is the useful part.** This is exactly the distinction
v1.16.0's plan makes first-class as a `method` field on every source record.

**A bonus the original run did not record:** the two phantom agents cost **~110 always-on tokens in
every session**, against ~50 for the one real agent. The `G8` exemption of `agents/` is not a tidiness
preference; it was preventing a measurable per-session tax on every conforming plugin.

Add a row every time. A run that CONFIRMS is as much a result as one that does not, and the confirming
runs are what make the date meaningful.
