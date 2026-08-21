---
name: askit-capability-gap-analysis
description: Assesses a new agent capability against the capability matrix, the Standard, and every skill, subagent and command this plugin ships, then proposes a matrix update, a backlog entry or an ADR draft without implementing any of them. Use when deciding whether a new Claude Code, Cowork or Codex capability should be modelled or adopted, when analysing a capability gap after a survey reports one, or when checking which components were last verified against an older agent version.
metadata:
  version: 0.1.0
  tier: universal
  audience: advanced
---

# askit-capability-gap-analysis

## Purpose

[`askit-capability-whats-new`](../askit-capability-whats-new/SKILL.md) answers *what shipped upstream*. This skill answers the harder question: **what does that mean for us?**

Three separate things can be true of one finding, and conflating them is how a capability gets adopted for the wrong reason:

| Question | Owner |
|---|---|
| Does the **capability matrix** describe it? | this skill, directly |
| Should the **Standard** model it? | an ADR. This skill drafts; a human ratifies |
| Do **our own components** use or need it? | this skill, per component |

It owns [`../askit-capability-advisor/references/capability-matrix.md`](../askit-capability-advisor/references/capability-matrix.md). `askit-capability-advisor` reads that file to advise an author; this skill is what keeps it true.

## When to use

After a survey reports a capability finding; when deciding whether a new agent capability belongs in the Standard; when asking which components were last verified against an older agent version; or before a release that claims to be current with the vendors.

## The one hard rule

**This skill PROPOSES. A human ratifies.**

It may update the capability matrix, because that is a description of the world and it owns it. It may **not** edit a check module, `STANDARD.md`, `library.json`, or `vendor-claims.json`.

**One carve-out in component frontmatter, and only one:** `metadata.verified-against`, on components this run actually assessed. [references/component-staleness.md](references/component-staleness.md) assigns that key to this skill by name and explains why it can belong to no other - a survey examines vendors rather than components, so a bulk stamp from a survey run asserts readings that never happened. Everything else in a component's frontmatter is still off limits. **Stamping a version onto a component nobody re-read is the defect this key exists to prevent**, so the carve-out is exactly as wide as "components you assessed" and no wider.

**A capability finding is never itself a reason to add a check.** The Standard grows only by ADR, with the warn-first burndown of `STANDARD.md` sec 7.7, and this repository has measured what happens when that order is skipped: a recommendation that looks obvious before measurement is overturned by measurement about as often as not.

## Procedure

### 1. Take a finding from the survey record, and read the page it cites

Not the release note. If the finding carries no documentation reference it is a lead, not a finding - send it back.

### 2. Update the capability matrix first, because describing is not deciding

Does the matrix have a row for this component type, a column for this agent, and the right value? Fix it. **This is the one output that needs no ADR**, because the matrix records what agents do, not what this Standard requires.

Two standing obligations, both from the matrix's own audit:

- **Every value carries the agent version it was confirmed against.** The matrix claimed for a long time to be "pinned to specific agent versions" while recording no version anywhere, which is a currency claim with no currency evidence.
- **Cowork is modelled, but deliberately NOT as a column.** `U6` skips its `computer:` local-artifact scheme and `U11` tolerates its managed-connector pattern, so the gate already accommodates an agent the matrix did not model. The matrix records that in prose rather than a column, because Cowork is not a plugin-distribution target the way Claude Code and Codex are, and the matrix owns that modelling decision. **Do not add the column;** report the gap and let an ADR move the boundary if it should move.

### 3. Ask the three questions in order, and stop at the first NO

**a. Is the capability real and stable?** A research preview, an alpha flag, or an unreleased entry is a watch item, not a gap. Record it and stop.

**b. Is it plugin-distributable?** The matrix's whole framing is what ships *inside a distributed plugin*. A capability that exists but cannot be shipped in a plugin belongs in the matrix's notes and nowhere else - the Codex subagent case is the standing example.

**c. Does anything break, or become possible, for a plugin author?** If neither, it is documentation. Say so and stop. **Most findings stop here, and that is the skill working.**

### 4. Only for a finding that survives all three: assess our own components

For each of `skills/`, `agents/`, `commands/`, `_workflows/`, `.claude-plugin/marketplace.json` and `library.json`, ask what the finding changes. Report per component, not in aggregate: "3 of 26 skills declare `agent-targets` including `codex`" is actionable; "some skills may be affected" is not.

**Use `metadata.verified-against` (ADR 0054) where it is present**, and treat its absence as unknown rather than as current. The staleness report is a list of components whose recorded agent version predates the finding - not a list of components that are wrong.

### 5. Measure before you recommend, or say that you did not

If a recommendation depends on how many components, plugins or skills are affected, **count them before writing it down.** This repository has overturned three of seven ratified recommendations on their own measurements, including one that would have failed 44.9 percent of 2342 measured skills and one that fired on 99.9 percent of 2068 descriptions.

If measuring is not practical, the proposal must say the number is unmeasured. An unmeasured proposal is still useful; an unmeasured proposal presented as measured is not.

### 6. Route each conclusion, and never to more than one place

| Conclusion | Goes to |
|---|---|
| the matrix was wrong or incomplete | the matrix, in this change |
| a vendor sentence is now quotable | a candidate claim for `vendor-claims.json` |
| the Standard should model this | an **ADR draft**, following [`askit-decision`](../askit-decision/SKILL.md) |
| a component should adopt this | a **backlog entry** in `docs/internal/backlog/enhancements.md` |
| real, but nothing to do yet | the backlog, **with the trigger condition that would change the answer** |

That last row is the one people skip, and it is the most valuable. A finding filed as "not yet, because the measured population is zero" with a stated re-measurement trigger is a decision. The same finding filed as "no" is a decision nobody can revisit.

### 7. Stop

Open the ADR draft or the backlog entry for review. Do not implement it, do not add a check, do not bump a Standard version.

## What this can and cannot do

It reliably reports what the matrix says, which components declare which `agent-targets`, and which carry a `verified-against` older than a finding. Those are lookups over tracked files.

It does **not** determine whether a capability is worth adopting - that is a judgment, and its output is a proposal a human ratifies. It cannot see a capability nobody surveyed. And **it cannot tell you a component is broken**, only that its recorded verification predates a change: absence of `verified-against`, or an old value, is a prompt to look, never a finding on its own.

## Scope

One skill, one obligation: keep the distance between what the agents can do and what this repository models an answerable question. It does not discover findings (`askit-capability-whats-new`), advise an author (`askit-capability-advisor`), author the ADR's argument (`askit-decision`), grade a plugin (`askit-evaluate`), or cut a release (`askit-release`).
