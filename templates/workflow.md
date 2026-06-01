---
name: example-workflow
description: An example workflow. Describe the recurring multi-skill arc it formalizes and when to run it, with trigger keywords.
metadata:
  version: 0.1.0
  tier: convergent
  status: active
  agent-targets:
    - claude
    - codex
steps:
  - skill: example-skill-one
  - skill: example-skill-two
---

# example-workflow

## Steps
1. example-skill-one: what it does, the inputs it takes, and the outputs it hands on.
2. example-skill-two: consumes the prior output and produces the result.

## Exit criteria
State the condition that means the workflow is complete (for example, evaluate reports 0 errors).
