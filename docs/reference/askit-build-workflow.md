# askit-build-workflow (reference)

Authors a plugin's workflows (ordered multi-skill arcs, `_workflows/<name>.md`, Standard sec 3.4, Convergent tier).

## Modes
- `create`: identify the arc (ordered skills, handoffs, exit criteria), author `_workflows/<name>.md` (copy `templates/workflow.md`), ensure referenced skills exist and chaining steps are chain-permitted, evaluate.
- `improve`: resolve S5 findings (a step naming a missing skill) and tighten handoffs / exit criteria.

## Rules (sec 3.4)
- Every referenced skill MUST exist (S5).
- Every chaining step MUST be permitted by the chain contract (sec 3.6); author it with `askit-build-chain-contract`.
- A workflow SHOULD declare its agent targets.

## Validation
S5 (`workflow-skills`) enforces step skill-existence. A workflow-step chain-permission (orphan) check is a planned enhancement. See the [build-a-workflow how-to](../how-to/build-a-workflow.md) and [authoring-workflows](../../skills/askit-build-workflow/references/authoring-workflows.md).
