# Authoring a workflow (reference)

The bar for a conformant workflow (Standard sec 3.4, Convergent tier).

## What a workflow is

An ordered arc that chains multiple skills toward an outcome. It lives at `_workflows/<name>.md` and declares the steps, what is handed between them, and the exit criteria. A workflow formalizes a recurring sequence so it is repeatable and reviewable.

## Format

```yaml
---
name: my-workflow
description: what arc it formalizes + when to run it
metadata:
  version: 0.1.0
  tier: convergent
  agent-targets: [claude, codex]
steps:
  - skill: first-skill
  - skill: second-skill
---
```

The body documents each step's inputs/outputs (the handoff) and the exit criteria.

## Rules

- **Skills exist (S5):** every skill named in a step MUST exist on disk.
- **Chain-permitted (sec 3.4 + 3.6):** every chaining step MUST be permitted by the chain contract; author the permission with `askit-build-chain-contract`.
- **Targets:** a workflow SHOULD declare which agent targets it supports.
- **Exit criteria:** state the condition that means the arc is complete (for example, evaluate reports 0 errors).

## Planned check

A deterministic workflow-step orphan check (a step skill that is not chain-permitted) is a planned enhancement. Today S5 enforces step skill-existence; the chain contract governs component-to-component invocation.
