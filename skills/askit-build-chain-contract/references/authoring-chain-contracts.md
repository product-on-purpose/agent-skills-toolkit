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

A component declares its intent with `metadata.chain` in its own frontmatter; the contract grants the permission. Both must agree.

Write `metadata.chain` as a comma-separated **string**, the recommended shape:

```yaml
metadata:
  chain: caller-invoked-component, another-invoked-component
```

Why a string and not a YAML list: the agentskills.io spec defines `metadata` as "a map from string keys to string values", and the reference implementation `skills-ref` enforces that by coercion, not rejection - every value under `metadata` is passed through Python's `str()`. A YAML list under `metadata.chain` is silently rewritten to a string containing a Python list repr (for example `"['a', 'b']"`), which no consumer downstream can parse back into names. `agentskills validate` does not catch this, because it never inspects `metadata` contents - the corruption is invisible to the validator.

S4 still reads `metadata.chain` written as a YAML list (unchanged), and the legacy top-level `chain:` key in either shape (string or list) - both predate Standard vocabulary alignment and remain supported so existing plugins on those shapes do not regress. When more than one shape is present, `metadata.chain` wins; there is no merge.

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
