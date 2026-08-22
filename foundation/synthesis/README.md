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

## `tier-basis.md`, and what it found

The artifact that records, per tier boundary, which vendor fact it rests on and where that fact is pinned. **Written 2026-08-20 (v1.16.0 W3).** Until then nothing connected "a vendor shipped a new component type" to "a tier boundary may need review."

**What it found, on its first pass: 9 boundaries pinned, 11 `unverified`, 3 house conventions - and every one of the 8 pinned CLAIMS was a Claude Code fact.** **That finding has since driven a fix**: the Advanced hooks boundary was pinned on 2026-08-22 by three new Codex claims, so the tally is now **10 pinned, 10 `unverified`, 3 house**, over **11 claims across two vendors**. Cowork still has none. (Nine boundaries, eight claims: **seven** rows are backed by `vendor-claims.json` and cover all eight because the commands row cites two, and **two** rows rest on `upstream-pin.json` instead. No claim is cited twice.) There is no pinned claim for any Codex or Cowork fact, which means the Convergent tier, *defined* as what both agents support in different formats, has pinned evidence for one of them.

Its contract is fixed by [ADR 0055](../../docs/internal/decisions/0055-the-evidence-gets-an-address-and-gate-readership-is-recorded-not-inferred.md) D3 and one line of it matters more than the rest: **a boundary with no evidence gets a row reading `unverified`, never an omitted row.** An absent row reads as "no boundary here"; an `unverified` row reads as "a boundary nobody has grounded", which is the finding this release exists to surface.

**It exposed real gaps rather than confirming the ladder, as predicted.** The Advanced tier requires hooks, and the matrix says Codex supports "a subset" of Claude Code's events. **That subset is pinned nowhere and its confirmation date is unknown** - now a row rather than an absence. None of the eleven is a defect to fix here: a boundary resting on nothing is a finding to file, and moving a tier is its own ADR with a migration window.

## Inventory

- `capability-matrix.md` - per component type, what Claude Code and Codex each support for plugin distribution, and the cross-agent asymmetries the tier boundaries are written against.
- `tier-basis.md` - one row per tier boundary: the vendor fact it depends on, whether that fact is pinned, and where. `unverified` where nothing grounds it.
