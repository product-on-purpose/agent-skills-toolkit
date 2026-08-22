---
title: "foundation - what this Standard rests on, and how we know"
---

# foundation

**The one rule this folder exists to enforce:**

> **Every claim the Standard rests on is traceable to a first-party source, with a date and a method - and where it is not, the record says so.**

The second clause carries the weight. A folder that records only what it can support is a folder that hides its gaps, and a hidden gap in the evidence under a tier boundary is worse than a visible one.

Ratified by [ADR 0055 (the `foundation/` layout)](../docs/internal/decisions/0055-the-evidence-gets-an-address-and-gate-readership-is-recorded-not-inferred.md). Migrated 2026-08-20 as v1.16.0 W2.

## Why this exists at all

**The tier ladder is defined in terms of vendor capability.** [`STANDARD.md`](../STANDARD.md) sec 2.2 defines Convergent as *"Concepts both CC and CX support, but in different formats"*, and sec 2.3 defines Advanced as *"Deep, lifecycle, and often agent-specific capability."* Both sentences are claims about software this project does not control.

So the tier boundaries are a **synthesis of vendor capability**, and the quality of the ladder is bounded by the quality of that synthesis. Before this folder existed, that synthesis lived inside one skill's `references/` folder, guarded by nothing, and no artifact recorded which vendor fact each boundary actually rests on.

## How to read it, in two questions

**"Can editing this break a gate?"** Look it up in [`claims/README.md`](claims/README.md). That file names, per file, the gate code that reads it. **It is a recorded fact, not an inference from which folder something sits in** - because the inference was already false: one of the three files in `claims/` has no gate reader at all.

**"How do we know this?"** Every record in [`sources/`](sources/README.md) carries a `method`, because *"confirmed 2026-08-19"* describes a page-read and a probe-run identically while distinguishing neither.

## The three layers

| Layer | Holds | Read by |
| --- | --- | --- |
| [`sources/`](sources/README.md) | **Layer 1.** Verified first-party references: what was read, which version, when, and by what means | humans |
| [`claims/`](claims/README.md) | The machine-checkable subset of layer 1 | gates, and skills at run time |
| [`synthesis/`](synthesis/README.md) | **Layer 2.** What we concluded from layer 1 | skills, and public documentation |

`surveys.md` sits outside the layers on purpose: it is neither a source nor a claim nor a conclusion, but the dated record of what shipped, which is what the three layers are periodically checked against.

## Two rules inherited, not invented here

**`stale` is not `wrong`, and `unknown` is not `stale`** ([ADR 0054](../docs/internal/decisions/0054-a-component-records-what-agent-version-it-was-checked-against.md)). A record missing a date or a method is a prompt to go and look, not a defect to be cleared by deleting the row.

**A missing boundary gets a row saying `unverified`, never an omitted row.** An absent row reads as "no boundary here"; an `unverified` row reads as "a boundary nobody has grounded", which is the finding.

## What is deliberately NOT here

ADRs, the backlog, release plans and `STATUS.md` stay in [`../docs/internal/`](../docs/internal/). They are **maintainer working material, not evidence.**

**The test, so nobody has to ask:** would an outside reader need this to judge whether a Standard requirement is grounded? If no, it stays put. A release plan explains what this project decided to do; it is not a fact about the world that a requirement rests on.

**The probe reproductions are the deliberate near-miss.** They live at [`../docs/internal/vendor-watch/probes/`](../docs/internal/vendor-watch/probes/) and did not move, even though a probe's reproduction is arguably the `method` behind a claim. ADR 0055 ratified a layout without them, and the migration does not get to extend a layout it is executing. Whether they belong in `sources/` is an open question, filed rather than decided.

## Inventory

- `claims/` - the machine-checkable subset, with a per-file record of which gates read it.
- `sources/` - one record per first-party surface: what was read, which version, when, and by what method.
- `surveys.md` - the append-only dated record of what the agent platforms shipped, newest first.
- `synthesis/` - what this project concluded from layer 1, including the capability matrix the tier ladder depends on.
