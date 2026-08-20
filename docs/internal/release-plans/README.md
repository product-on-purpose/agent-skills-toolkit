---
title: "Release packets - the shape, and the two rules that make them worth writing"
---

# Release packets

One folder per release, `plan_vX.Y.Z/`. This file exists because the shape was **tribal knowledge spread
across sixteen folders** with nothing stating what a packet must contain - and a convention nobody wrote
down is one nobody can be held to.

## The shape

```
plan_vX.Y.Z/
  RELEASE-PLAN.md        intent and acceptance criteria, written BEFORE the work
  README.md              what actually shipped, and what did NOT
  <Wn-name>/SPEC.md      per workstream, when the workstream earns one
  <Wn-name>/IMPL-PLAN.md
  repin-instructions.md  the registry step, when the release re-pins
  review-findings.md     the findings ledger, when a review produced one
```

Not every release needs every file. A patch fixing one defect needs a `RELEASE-PLAN.md` and a `README.md`;
`v1.6.0` had five workstreams and a `PROGRAM-PLAN.md` above them. **The two documents that are never
optional are the plan and the packet**, because they are the pair that makes the release auditable: one
says what was intended, the other says what happened, and the gap between them is the interesting part.

## The two rules

### 1. Acceptance criteria are written BEFORE the work

Not derived from it afterwards. A criterion invented once the outcome is known is a description wearing a
criterion's clothes, and it can never fail.

This is not theoretical here. `v1.14.0` ratified seven ADRs each measured against the whole reference
family **before** implementation, and **three of the seven were overturned by their own measurement.** That
only happens when the measurement is allowed to come back the wrong way.

### 2. Findings are ANNOTATED, never rewritten

A finding is the evidence of what was wrong. A finding edited to describe its own fix stops being that.

So a closed finding keeps its original text and gains a dated closure note underneath. When a later round
falsifies something a closure note said, the note gains a dated **amendment** - it does not get quietly
corrected. `plan_v1.15.0/review-findings.md` carries five rounds of this, including several amendments
where a later round proved an earlier note wrong.

**The corollary matters as much:** a record that says something untrue is worse than one that says nothing.
`v1.15.0`'s fifth review round spent two of its five findings on closure notes that had overclaimed - one
asserted a "REAL test" that turned out vacuous. Those were fixed despite being non-blocking.

## What the packet README must contain

Look at [`plan_v1.14.0/README.md`](plan_v1.14.0/README.md) and
[`plan_v1.15.0/README.md`](plan_v1.15.0/README.md); they are the most refined instances. The sections that
carry weight:

- **Final numbers** - version, Standard pin, spine size, skills, suite, tier. Written LAST, after the final
  suite run, then checked by `npm run release-counts`.
- **Verification recorded at cut time** - what was actually run and what it returned, not what was intended.
- **NOT discharged** - stated out loud rather than left absent. `v1.15.0` carried an open acceptance
  criterion through its entire preparation because the adversarial wave had not run, and saying so is the
  only thing that stops a later reader assuming it had.
- **Deferred deliberately** - with the reason. A deferral with a stated reason is a decision; a deferral
  nobody wrote down is an omission.

## Hygiene is enforced by machines, not by this file

Deliberately. A prose checklist is weaker than a check that fails the build, and this repository has
already converted the checklist into gates:

| Concern | Enforced by |
| --- | --- |
| Every release-blocking precondition | `npm run release-ready` - five gates, run by `release.yml` AND `publish-npm.yml` |
| Stated test counts matching reality | `scripts/check-release-counts.mjs` |
| Front-door claims and the advertised tag | `scripts/check-readme-version.mjs` |
| Public docs route parity | `site/scripts/check-route-parity.mjs`, run by the `build-site` job in `ci.yml` against the built `dist` |
| Folder inventories and docs presence | `G7` / `G8` in the spine |

**`check-release-counts` exists because a human corrected the same count drift three times in one release
and it recurred anyway.** That is the argument for gates over checklists in one sentence. The rule it
enforces: **write volatile counts LAST**, after the final suite run, then run the check.

The tag-time sequence itself lives in [`../RELEASE.md`](../RELEASE.md) and
[`../execution/06-release-choreography.md`](../execution/06-release-choreography.md).
