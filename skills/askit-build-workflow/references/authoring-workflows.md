# Authoring a workflow (reference)

How to decide what a workflow is, wire its steps to real skills, and get the chain contract right -
including the one trap where the Standard requires something the deterministic gate does not yet
enforce, so the author carries it. The contract is [STANDARD.md](../../../STANDARD.md) sec 3.4
(workflow) and sec 3.6 (chain contract); the procedure is in [the skill itself](../SKILL.md).

## Decision 0: is this a workflow at all?

A workflow is an **ordered arc across skills that already exist and are independently useful**. It is
not a skill with steps in it.

- If the steps are only meaningful together, you want one skill with a numbered procedure. Splitting
  it into a workflow buys you a second file, a chain contract obligation, and no reuse.
- If each step is a capability a user would invoke on its own, and the sequence recurs, a workflow is
  the right formalization: it makes the arc repeatable and reviewable without collapsing the parts.
- A one-step workflow is always the wrong artifact. Give the skill a command instead (sec 3.2).

## The cost of your first workflow: it turns S4 on

This is the most surprising thing about authoring a workflow, so it comes before the format.

`S4` (chain-contract) decides whether chaining is "in use" from three signals, and **the mere
existence of a `_workflows/` directory is one of them**
([chain-contract.mjs](../../../scripts/checks/chain-contract.mjs)):

    chainingInUse = a contract exists  OR  _workflows/ exists  OR  some component declares metadata.chain

`S4` reads a component's `metadata.chain` list, preferring it; the top-level `chain:` location
predates Standard vocabulary alignment and is still read for compatibility.

Chain contracts are a conditional MUST (sec 3.6): required if and only if chaining is used. So a
plugin that has never chained anything passes `S4` vacuously today, and the moment you add the first
`_workflows/<name>.md` it does not. `S4` emits one error and returns:

> chaining is used (a component declares a frontmatter `chain:` or `_workflows/` is present) but
> `agents/_chain-permitted.yaml` is missing

Author the contract in the same change, with `askit-build-chain-contract`
([how-to](../../../docs/how-to/build-a-chain-contract.md),
[reference](../../askit-build-chain-contract/references/authoring-chain-contracts.md)). Do not treat
the error as spurious and do not ship an empty contract file to silence it - which entries belong in
it is the next decision, and it is a real one.

## Format

`_workflows/<name>.md`, scaffolded from [templates/workflow.md](../../../templates/workflow.md):

```yaml
---
name: my-workflow
description: what arc it formalizes + when to run it, with trigger keywords
metadata:
  version: 0.1.0
  tier: convergent
  status: active
  agent-targets: [claude, codex]
steps:
  - skill: first-skill
  - skill: second-skill
---
```

Two step shapes are accepted by `S5` ([workflow-skills.mjs](../../../scripts/checks/workflow-skills.mjs)):
a mapping `- skill: name` or a bare string `- name`. Prefer the mapping: it leaves room for per-step
keys later and it reads unambiguously.

**A shape `S5` cannot see.** If `steps` is not a YAML sequence, `S5` skips the file entirely. A step
list written as prose in the body, or as a mapping of step numbers to names, is not a failing
workflow. It is an unchecked one, which is worse, because the gate will report 0 errors on a workflow
whose steps point nowhere. The `steps` key in frontmatter is the machine-readable half; the body is the
human half; neither substitutes for the other.

The description follows the sec 8.1 bar like any other component (sec 3.8): what arc it formalizes AND
when to run it.

## The orphan-step trap

Section 3.4 says every chaining step MUST be permitted by a chain contract. Read what the two checks
actually do before you rely on them:

| Check | Reads | Catches | Does NOT catch |
|---|---|---|---|
| `S5` (workflow-skills) | the workflow's frontmatter `steps` | a step naming a skill that is not on disk | anything about permission |
| `S4` (chain-contract) | each component's `metadata.chain` list (falling back to a legacy top-level `chain:`), plus the contract | an orphan (a declared chain the contract does not permit) and a phantom (a contract entry naming a missing component) | the workflow's `steps` list, which it never reads |

So a workflow step that hands off to a skill with no permitting contract entry satisfies `S5` and is
invisible to `S4`. The deterministic workflow-step permission check is a planned enhancement; until it
lands, **the workflow is the one place where the Standard's requirement is real and the gate is
silent**, and the author carries it.

### The distinction that decides each edge

An ordered arc is not automatically an invocation, and this is where authors get it wrong in both
directions.

- **The runner drives the arc.** The workflow's consumer runs step 1, reads its output, then runs
  step 2. No component invoked another. Nothing is owed to the contract; sec 3.6 is conditional
  precisely so plugins do not ship empty governance.
- **A step dispatches the next.** Step 1's skill delegates to step 2's skill or to a subagent. That is
  an inter-component invocation. The **invoking component** declares `metadata.chain: [callee]` in its
  own frontmatter and the contract permits `caller: [callee]`. Both halves must agree, which is exactly
  what `S4` then enforces for you.

Getting it wrong in the "safe" direction is not free. A blanket contract entry for an invocation that
does not exist becomes a phantom the day the callee is renamed, and at Gold it becomes an eval
obligation: `G3` requires at least one `evals/*.eval.json` with `"covers": { "chain": [caller, callee] }`
for **every edge in the contract**, and an eval covering an edge the contract no longer permits is
itself a stale-case finding. So declare per edge, deliberately, and write down why.

## The body is the part nothing checks

No check reads a workflow body. That makes it the highest-leverage and most-skipped surface, so treat
these as MUSTs of your own:

- **Per step: inputs, outputs, and the artifact handed on.** Name the artifact, not the intent. "Hands
  the evaluation JSON to step 3" is reviewable; "passes the results along" is not.
- **Exit criteria that can be evaluated.** State a condition a reader can check, for example "evaluate
  reports 0 errors" or "the release notes file exists and its version matches `library.json`". "The
  work is complete" is a mood.
- **What to do when a step fails.** An arc with no failure branch is an arc that is only documented
  for the happy path.
- **Why this order.** If two steps could swap, say so; if they cannot, say what breaks.

## Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Steps naming skills that do not exist yet | `S5` errors, but the deeper problem is that the workflow advertises capability the plugin does not have |
| A workflow that restates its first skill's procedure | Two copies of one procedure, guaranteed to drift; the workflow owns the handoffs, the skill owns its own steps |
| A step list in prose only, with no frontmatter `steps` | Silently unchecked by `S5`; a vacuous pass, not a pass |
| Declaring `chain:` on every step "to be safe" | Manufactures phantoms and Gold `G3` eval obligations for invocations that never happen |
| Shipping an empty `_chain-permitted.yaml` to clear the S4 error | The contract is a safety mechanism, not a file that has to exist; an empty one asserts "nothing chains" while a workflow says otherwise |
| Exit criteria written as an outcome, not a condition | Nobody can tell whether the arc finished |
| A one-step workflow | A command with `maps-to` is the artifact you wanted (sec 3.2) |

## Targets

A workflow SHOULD declare which agent targets it supports (sec 3.4). Workflows are Convergent-tier and
agent-agnostic in file form - one `_workflows/<name>.md`, no per-target render
([the builder pattern](../../../docs/reference/builder-pattern.md)) - so `agent-targets` is a claim
about the **steps**, not about the file. If any step's skill is Claude-only in practice, or the arc
depends on a subagent (which a Codex plugin cannot ship, sec 3.3), narrow the declaration rather than
copying `[claude, codex]` from the template.

## Validate

    node scripts/evaluate.mjs . --json

Resolve `S5` (a step naming a skill not on disk: fix the name or create the skill) and `S4` (an orphan:
add the `caller: [callee]` line; a phantom: correct or remove the entry). Iterate to 0 errors, then
re-read the trap section above and confirm by hand that every genuine step-to-step invocation has a
contract entry, because that is the part the 0 does not cover.

## See also

- [STANDARD.md](../../../STANDARD.md) - sec 3.4 (workflow), 3.6 (chain contract), 3.8 (frontmatter
  contract), 2.2 (Convergent tier).
- [Silver checks](../../../docs/reference/silver-checks.md) and
  [Gold checks](../../../docs/reference/gold-checks.md) - `S4`, `S5`, and the `G3` eval-set format.
- [authoring-chain-contracts.md](../../askit-build-chain-contract/references/authoring-chain-contracts.md):
  the contract's own shape and the orphan/phantom definitions.
- [agents/_chain-permitted.yaml](../../../agents/_chain-permitted.yaml) - this toolkit's real contract.
