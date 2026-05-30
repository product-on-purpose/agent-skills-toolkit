---
description: Evaluate a skill or plugin against the Advanced Skill Library Standard and report per-rule findings, the tier, and remediation. Use to audit conformance or see what blocks the next tier.
argument-hint: "[path]"
maps-to: askit-evaluate
metadata:
  version: 0.1.0
---

Invoke the `askit-evaluate` skill to assess the target at: $ARGUMENTS

Run the conformance core, then report the findings grouped by rule, the satisfied tier, and the remediation. Lead with errors, then warnings.
