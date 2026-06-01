# Authoring a chain contract (reference)

The bar for a conformant chain contract (Standard sec 3.6, Convergent tier).

## Conditional MUST

A chain contract is required if and only if a component invokes another. A plugin with no inter-component invocation ships NO `_chain-permitted.yaml` - empty governance files are not conformance, they are noise. The contract binds exactly when there is an invocation to make safe.

## Format

`agents/_chain-permitted.yaml`, one entry per caller:

```yaml
caller-component:
  - callee-it-may-invoke
  - another-callee
```

A component declares its intent with a `chain:` list in its own frontmatter; the contract grants the permission. Both must agree.

## What S4 checks

- **Orphan:** a `chain:` invocation in a component's frontmatter that is not permitted by the contract. Fix: add the `caller: [callee]` line.
- **Phantom:** a contract entry naming a component that does not exist on disk. Fix: correct the name, remove the stale entry, or create the component.

## Optional pairings

`agents/_pairing.yaml` declares recommended (not required) skill plus subagent pairings - guidance, not a gate.

## Example (this toolkit)

```yaml
askit-build-skill:
  - askit-skill-author
askit-evaluate:
  - askit-evaluator
askit-skill-author:
  - askit-evaluator
```
