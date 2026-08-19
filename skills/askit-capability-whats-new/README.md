---
title: "skills/askit-capability-whats-new - folder guide"
---

# skills/askit-capability-whats-new

The askit-capability-whats-new skill. Surveys what the agent platforms shipped since this repository last looked, diffing each vendor's release feed forward from a recorded version pin, and writes a dated survey record. It discovers and documents; it decides nothing. The first of the three-skill capability family, ahead of `askit-capability-gap-analysis` (what a finding means for us) and `askit-capability-advisor` (what an author can build on a given agent).

## Inventory

- `SKILL.md` - the skill definition (frontmatter plus the seven-step procedure and the one hard rule).
- `examples/` - two golden runs (a survey that finds nothing material and still records it; a real capability finding that no release note announced) plus the anti-example, which refuses to advance the version pin without reading.
- `references/` - the static surface index (what to read, and what depends on it) and the survey-record and pin formats.
