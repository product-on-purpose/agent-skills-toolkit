---
title: "skills/askit-onboard - folder guide"
---

# skills/askit-onboard

The askit-onboard skill. Onboards a person into using this toolkit well, over weeks rather than one
session: `assess` surveys where the adopter stands, `plan` interviews briefly and writes a
personalized roadmap into the adopter's own repository after they confirm it, and `next` reads that
roadmap on a later visit and names one next step. It routes into the existing `askit-evaluate`,
`askit-build-*`, and `askit-migrate` skills and into existing `docs/how-to/` and `docs/tutorials/`
pages; it never scaffolds or fixes anything itself.

## Inventory

- `SKILL.md` - the skill definition (frontmatter plus the three-mode procedure).
- `references/` - which existing skill or docs page answers which adopter situation, and the roadmap
  file's shape, loaded on demand.
- `evals/` - skill triggering eval set (Standard sec 8.3; graded by G3).
