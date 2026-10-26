---
title: "askit-onboard"
description: "Onboards a person into using this toolkit well over weeks - assesses where they stand, plans a personalized roadmap, and names the next step on a return visit."
audience: engineer
level: intermediate
---

# askit-onboard (reference)

Onboards a person into using this toolkit well over weeks, not just one session. It routes into the
existing skills and docs pages; it never scaffolds or fixes anything itself.

## Modes
- `assess`: survey the adopter's repository read-only (via the `askit-explorer` subagent when the
  harness can dispatch it, inline otherwise), report the current tier and component inventory, and
  name which capability regions are untouched.
- `plan`: interview briefly, pick the matching doors from the [routing map](../../skills/askit-onboard/references/routing-map.md),
  and - only after the adopter confirms - write a personalized roadmap to `.askit/onboarding-roadmap.md`
  in the adopter's own repository.
- `next`: read that roadmap back on a later visit and name exactly one next step, rather than
  re-presenting the whole plan.

## Boundary
`askit-onboard` interviews, diagnoses, sequences, and tracks a PERSON across sessions. It is distinct
from `askit-init-plugin` ("help me start this repo"), `askit-migrate` ("help me fix this repo"), and
`askit-capability-advisor` ("what can my agent run?"). The moment it starts scaffolding or fixing a
component itself, it has failed its own why-gate - see
[E47 (`askit-onboard`: the adoption funnel as an interactive skill)](../internal/backlog/enhancements.md)
for the full delineation.

This toolkit's own `docs/adoption/` funnel does not exist on disk; `askit-onboard` routes only to
pages that are actually published under [`docs/how-to/`](../how-to/README.md) and
[`docs/tutorials/`](../tutorials/README.md).

## Notes
See [routing-map.md](../../skills/askit-onboard/references/routing-map.md) for the full map from
adopter situation to existing skill or docs page, and
[roadmap-format.md](../../skills/askit-onboard/references/roadmap-format.md) for the roadmap file's
shape.
