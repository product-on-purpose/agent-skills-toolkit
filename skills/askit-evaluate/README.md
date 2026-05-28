# askit-evaluate (human overview)

Audit a skill or plugin against the Advanced Skill Library Standard.

**What it does:** runs the toolkit's conformance checks and shows you per-rule findings, the tier a plugin satisfies, and what to fix.

**When to use it:** before committing a new skill, or when you want to know what blocks the next tier.

**Example:**

    node scripts/evaluate.mjs skills/askit-build-skill

Agent-canonical instructions live in `SKILL.md`; the report shape is in `references/report-format.md`.
