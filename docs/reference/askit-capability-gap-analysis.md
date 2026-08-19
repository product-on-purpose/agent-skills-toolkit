---
title: "askit-capability-gap-analysis"
description: "Assesses a new agent capability against the capability matrix, the Standard, and every component a plugin ships, then proposes a matrix update, a backlog entry or an ADR draft without implementing any of them."
audience: engineer
level: advanced
tags: [governance, capability, gap-analysis, adr, standard]
---

# Reference: `askit-capability-gap-analysis`

The second of three skills in the **capability family**, and the one that decides nothing while doing all the deciding-shaped work.

| Skill | Question | Owns |
|---|---|---|
| [`askit-capability-whats-new`](askit-capability-whats-new.md) | what shipped upstream? | the survey record |
| **`askit-capability-gap-analysis`** | **what does that mean for us?** | **the capability matrix** |
| [`askit-capability-advisor`](askit-capability-advisor.md) | what can an author build? | reads the matrix |

## The three questions it keeps apart

Conflating these is how a capability gets adopted for the wrong reason:

| Question | Who answers |
|---|---|
| Does the **capability matrix** describe it? | this skill, directly - the matrix records what agents do |
| Should the **Standard** model it? | an ADR. This skill drafts; a human ratifies |
| Do **our components** use or need it? | this skill, per component |

## The gate: three questions, stop at the first NO

1. **Real and stable?** A research preview or alpha flag is a watch item.
2. **Plugin-distributable?** A capability that exists but cannot ship inside a plugin belongs in the matrix's notes and nowhere else.
3. **Does anything break or become possible for an author?** If neither, it is documentation.

**Most findings stop at question 3, and that is the skill working.** A rubric that keeps promoting findings is one nobody trusts by the third sweep.

## What it refuses

**It never adds a check.** A capability finding is not a reason to grow the Standard; the Standard grows by ADR with a warn-first migration window. This is not caution for its own sake - in one release of this toolkit, **three of seven ratified recommendations were overturned by their own measurement**, including one that would have failed 44.9 percent of 2342 measured skills.

**It never presents a staleness list as a defect list.** See below.

**It measures before it recommends, or says it did not.** A proposal that depends on a population must count that population. An unmeasured proposal is still useful; an unmeasured proposal presented as measured is not.

## Component staleness, and the rule that makes it safe

Using `metadata.verified-against` ([ADR 0054](../../docs/internal/decisions/0054-a-component-records-what-agent-version-it-was-checked-against.md)), it reports three states per component:

| State | Means | Renders as |
|---|---|---|
| **current** | recorded version at or after the finding | nothing to do |
| **stale** | recorded version predates the finding | **look at this** |
| **unknown** | no key present | look at this eventually |

**Stale is not wrong**, and unknown is not stale. A component verified against an older platform version is very probably still correct; the report says *where to look*, never what is broken. Collapsing "never claimed" into "claimed and now old" would invent findings out of an absence - at maximum volume on the very first run, when every component is unknown.

**And writing the key requires having verified.** Stamping a version onto a component nobody re-read asserts a check that did not happen, which is the same defect as a pinned SHA whose version comment nobody re-checked. Coverage accrues from real assessments, never from a bulk stamp.

## Outputs

| Conclusion | Goes to |
|---|---|
| the matrix was wrong or incomplete | the matrix, directly |
| a vendor sentence is now quotable | a candidate claim for `vendor-claims.json` |
| the Standard should model this | an **ADR draft** |
| a component should adopt this | a **backlog entry** |
| real, but nothing to do yet | the backlog, **with the trigger that would change the answer** |

That last row is the one people skip and the most valuable. A finding filed as *"not yet, because the measured population is zero"* with a stated re-measurement trigger is a decision. The same finding filed as "no" is a decision nobody can revisit.
