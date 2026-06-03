---
title: "Build a chain contract"
description: "Declare which components may invoke which others, so inter-component invocation is explicit and safe (Standard sec 3.6)."
audience: engineer
level: intermediate
---

# How to build a chain contract

Declare which components may invoke which others, so inter-component invocation is explicit and safe (Standard sec 3.6).

## When you need one

Only when a skill or subagent invokes another component (it declares a `chain:` in its frontmatter). A plugin that does not chain ships no contract - this is a conditional MUST, not a ceremony.

## 1. Create

Invoke `askit-build-chain-contract` (create mode). It scans `chain:` declarations and authors `agents/_chain-permitted.yaml`, one entry per caller (copying `templates/chain-permitted.yaml` if needed):

```yaml
askit-build-skill:
  - askit-skill-author
```

## 2. Validate

    node scripts/evaluate.mjs . --json

Resolve any S4 findings: an **orphan** (a `chain:` invocation not permitted) means add the `caller: [callee]` line; a **phantom** (an entry naming a missing component) means fix the name, remove the entry, or create the component. Iterate to `0 error(s)`.

## See also

- [`askit-build-chain-contract` reference](../reference/askit-build-chain-contract.md)
- [authoring-chain-contracts](../../skills/askit-build-chain-contract/references/authoring-chain-contracts.md)
- [Silver checks reference](../reference/silver-checks.md)
