---
title: "foundation/synthesis - what this project concluded from layer 1"
---

# foundation/synthesis

**Layer 2.** What this project concluded from the first-party sources in [`../sources/`](../sources/README.md). Nothing here is a vendor's statement; everything here is a reading of several of them, held together.

**Which is why it is the layer most able to be quietly wrong.** A source record is either accurate to the page or not. A synthesis can be internally consistent, well written, and out of date, and nothing about reading it says which.

## Why the capability matrix stopped being one skill's private reference

It used to live at `skills/askit-capability-advisor/references/capability-matrix.md`. Three problems, and only the third is about tidiness:

1. **The tier ladder depends on it.** `STANDARD.md` sec 2.2 and 2.3 define Convergent and Advanced in terms of what each agent supports. This file is where that is written down.
2. **The ownership was inverted.** `askit-capability-gap-analysis` declared that it *owned* a file inside `askit-capability-advisor`'s `references/` folder - a cross-skill reach no other skill in this repository makes, introduced in v1.15.0. A shared address resolves it; a second cross-reach would not have.
3. **Five things read it** - two skills' `SKILL.md`, a golden example, and two public documentation pages - and **nothing checks it.** A hand-maintained rendering beside a machine-readable truth with no guard between them is the exact shape of the drift defects found on 2026-08-18 and 2026-08-19.

Point 3 is not fixed by this move. It is the reason W4 of v1.16.0 adds a guard.

## `tier-basis.md` is not here yet, and its absence is W3

The artifact that records, per tier boundary, which vendor fact it rests on and where that fact is pinned. **It does not exist**, which is why nothing today connects "a vendor shipped a new component type" to "a tier boundary may need review."

Its contract is fixed by [ADR 0055](../../docs/internal/decisions/0055-the-evidence-gets-an-address-and-gate-readership-is-recorded-not-inferred.md) D3 and one line of it matters more than the rest: **a boundary with no evidence gets a row reading `unverified`, never an omitted row.** An absent row reads as "no boundary here"; an `unverified` row reads as "a boundary nobody has grounded", which is the finding this release exists to surface.

**Expect it to expose real gaps rather than confirm the ladder.** The Advanced tier requires hooks, and the matrix says Codex supports "a subset" of Claude Code's events. That subset is pinned nowhere and its confirmation date is unknown.

## Inventory

- `capability-matrix.md` - per component type, what Claude Code and Codex each support for plugin distribution, and the cross-agent asymmetries the tier boundaries are written against.
