---
title: "docs/internal/capability-surveys - folder guide"
---

# docs/internal/capability-surveys

What the agent platforms shipped, and when a human last looked. Owned by
[`askit-capability-whats-new`](../../../skills/askit-capability-whats-new/SKILL.md), which **proposes**
both files and writes neither: a human lands them together, so the pin and the reading move as one.

This answers a different question from the two watches beside it, and the difference is the reason it
exists. `standards-watch` and `vendor-watch` both ask **"did a fact we already depend on stop being
true?"** - regression detection over things already written down. This folder asks **"what did the vendor
ship that we have not looked at yet?"**, which no pin can answer, because a capability nobody has recorded
has nothing to fail.

## Inventory

- [`surveyed-pin.json`](../../../foundation/claims/surveyed-pin.json) - **MOVED 2026-08-20 to `foundation/claims/` (ADR 0055).** The last release of each surface that has actually been read, as a verbatim vendor version string. A version rather than a date, because a date pin silently loses anything published out of order and gives two readers different answers.
- `surveys.md` - the append-only dated record, newest first. A survey that finds nothing material still writes its section, with its counts: six months on, a sweep that never ran and a sweep that found nothing are indistinguishable unless the second one said so.

## What is deliberately not here

**Nothing blocks on the age of this pin.** An old survey means work is waiting, not that a claim has
expired. The mechanisms that do block on age are the `probe` claims in
[`foundation/claims/vendor-claims.json`](../../../foundation/claims/vendor-claims.json), where a probe has no page to
re-check so its age is its whole verification. Keeping that asymmetry is deliberate: a survey backlog
should never stop a release, and a stale probe always should.
