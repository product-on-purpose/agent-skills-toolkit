# How to build a workflow

Formalize a recurring multi-skill sequence as a workflow (Standard sec 3.4).

## 1. Create

Invoke `askit-build-workflow` (create mode). It asks for the ordered skills, what is handed between steps, and the exit criteria, then authors `_workflows/<name>.md` (copying `templates/workflow.md`) with a `steps` list and a body describing handoffs and exit criteria.

## 2. Make sure the parts exist and are permitted

Every skill named in a step must exist on disk (S5). Every chaining step must be permitted by the chain contract (sec 3.4 + 3.6) - author the permission with `askit-build-chain-contract` if needed.

## 3. Validate

    node scripts/evaluate.mjs . --json

Resolve any S5 finding (a step naming a skill not on disk) by fixing the name or creating the skill. Iterate to `0 error(s)`.

## See also

- [`askit-build-workflow` reference](../reference/askit-build-workflow.md)
- [`askit-build-chain-contract` how-to](build-a-chain-contract.md)
- [authoring-workflows](../../skills/askit-build-workflow/references/authoring-workflows.md)
