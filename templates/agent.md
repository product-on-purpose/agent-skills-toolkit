---
name: REPLACE-with-kebab-case-name-matching-this-file
description: REPLACE - what this subagent does AND when to delegate to it, with concrete trigger keywords. Third person.
tools:
  - Read
metadata:
  version: 0.1.0
  tier: convergent
  status: active
  agent-targets:
    - claude
---

# REPLACE-with-name

## Role
One paragraph: the bounded job this subagent owns.

## Tools
Why each tool in `tools` is needed (narrowest set; Standard sec 9). Add an optional `model` to override the inherited default; add a `chain` list only when this subagent invokes another component (and mirror it in `agents/_chain-permitted.yaml`).

## Steps
1. First step.
2. Second step.
