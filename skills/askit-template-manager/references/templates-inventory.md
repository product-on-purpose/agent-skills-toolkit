# Templates inventory (reference)

The global `templates/` directory holds the skeletons the scaffolders consume (Standard sec 11). Each template is a minimal, conformant shape with `REPLACE-` placeholders.

## Inventory

| Template | Scaffolds | Consumed by |
|---|---|---|
| `SKILL.md` | a skill | `askit-build-skill` |
| `agent.md` | a subagent | `askit-build-subagent` |
| `command.md` | a slash command | `askit-build-command` |
| `mcp.json` | an MCP server entry | `askit-build-mcp` |
| `hooks.json` | a hook registration | `askit-build-hook` |
| `chain-permitted.yaml` | a chain contract | `askit-build-chain-contract` |
| `output-style.md` | an output style | `askit-build-output-style` |
| `workflow.md` | a workflow | `askit-build-workflow` |
| `adr.md` | an ADR | `askit-decision` |
| `eval-set.json` | an eval set | `askit-build-samples` |
| `onboarding-questionnaire.template.md` | the onboarding questionnaire | `askit-init-plugin` |
| `seed-plugin/` | a Bronze starter plugin | `askit-init-plugin` |

## The sync rule

A template MUST produce a conformant component. When a component contract changes (a new required frontmatter key, a renamed field, a new check), every template that scaffolds that type updates in lockstep - otherwise the next scaffold is born non-conformant. Templates are the single place to fix scaffold shape, so a contract change is made once here rather than chased across every builder.

## Skeleton, not example

A template is a minimal skeleton with `REPLACE-` placeholders, not a worked example. The realistic samples and eval cases a skill ships are authored by `askit-build-samples` and live with the skill (`examples/`, `evals/`), not in `templates/`. The `seed-plugin/` template is asserted to pass the Bronze anatomy (`tests/unit/init-anatomy.test.mjs`); new structural templates should carry a similar conformance assertion where practical.
