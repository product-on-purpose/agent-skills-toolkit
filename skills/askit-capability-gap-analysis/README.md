---
title: "skills/askit-capability-gap-analysis - folder guide"
---

# skills/askit-capability-gap-analysis

The askit-capability-gap-analysis skill. Assesses a capability finding against the capability matrix, the Standard, and every component this plugin ships, then proposes what should change without changing it. The second of the three-skill capability family: `askit-capability-whats-new` reports what shipped, this skill decides what it means for us, and `askit-capability-advisor` tells an author what they can build. It owns the capability matrix that `askit-capability-advisor` reads.

## Inventory

- `SKILL.md` - the skill definition (frontmatter plus the seven-step procedure and the one hard rule: it proposes, a human ratifies).
- `examples/` - a golden run that correctly stops at the third gate question, and the anti-example refusing to render a component-staleness report as a defect list.
- `references/` - the assessment rubric (the three-question gate, the two measured failure modes, and coarse severity) and the component-staleness rules.
