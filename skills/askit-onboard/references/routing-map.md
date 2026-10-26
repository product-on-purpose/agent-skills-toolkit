# Routing map

`askit-onboard` never does the work itself. This is the map from an adopter's situation to the
existing skill or docs page that does it. Every path below exists on disk, verified against
`library.json` `components.skills` and the `docs/how-to/README.md` / `docs/tutorials/README.md`
inventories (checked 2026-10-25). There is no `docs/adoption/` entry here: that funnel was green-lit
(`docs/internal/backlog/enhancements.md` entry E47) but never built, and routing to a page that does
not exist would be a broken link on day one.

## By goal

| The adopter's situation | Route to | Why |
| --- | --- | --- |
| Starting a brand-new plugin from nothing | `askit-init-plugin` skill, then the [start-a-plugin-and-reach-bronze](../../../docs/tutorials/start-a-plugin-and-reach-bronze.md) tutorial | Greenfield scaffolding through an interview is `askit-init-plugin`'s job, not this skill's (Standard sec 10.7). |
| Has an existing ad-hoc or foreign repo to bring into conformance | `askit-migrate` skill (`assess`, then `plan`, then `adopt` mode), and the [adopt-a-foreign-repo](../../../docs/how-to/adopt-a-foreign-repo.md) how-to | `askit-migrate` already owns "help me fix this repo"; `askit-onboard` only sequences the PERSON through it. |
| Wants to write or improve one skill | `askit-build-skill` skill, and the [build-and-evaluate-a-skill](../../../docs/how-to/build-and-evaluate-a-skill.md) how-to, or the [build-your-first-skill](../../../docs/tutorials/build-your-first-skill.md) tutorial for a first attempt | Authoring a single component is a builder's job. |
| Wants to add another component type (command, subagent, hook, MCP server, output style, workflow, chain contract, `AGENTS.md`, settings, samples) | The matching `askit-build-<type>` skill (see the roster below), and the matching how-to page | One builder per type, per `docs/reference/builder-pattern.md`. |
| Wants to know what tier they are at, or what blocks the next one | `askit-evaluate` skill, and the [climb-from-bronze-to-silver](../../../docs/how-to/climb-from-bronze-to-silver.md) how-to or [climb-to-gold](../../../docs/tutorials/climb-to-gold.md) tutorial | Grading and the burndown are `askit-evaluate`'s job; `askit-onboard` only tells the adopter which one to run next. |
| Wants to know what their harness or agent can actually run before building | `askit-capability-advisor` skill, or `askit-capability-gap-analysis` / `askit-capability-whats-new` for a deeper or incremental read | Capability targeting is advisory and happens before building, same delineation E47 draws. |
| Needs to add eval coverage for a component | `askit-build-skill` (improve mode) or the specific builder, and the [add-eval-coverage](../../../docs/how-to/add-eval-coverage.md) how-to | - |
| Needs to deprecate a component | `askit-deprecate` skill, and the [deprecate-a-component](../../../docs/how-to/deprecate-a-component.md) how-to | - |
| Wants to track a backlog of enhancement ideas | `askit-backlog` skill, and the [manage-the-backlog](../../../docs/how-to/manage-the-backlog.md) how-to | - |
| Wants to record a design decision | `askit-decision` skill, and the [record-a-decision](../../../docs/how-to/record-a-decision.md) how-to | - |
| Wants to run the gate in CI | The [run-the-gate-in-github-actions](../../../docs/how-to/run-the-gate-in-github-actions.md) how-to | - |
| Wants to stand up a docs site or a marketplace of plugins | [stand-up-a-docs-site](../../../docs/how-to/stand-up-a-docs-site.md) or [stand-up-a-marketplace](../../../docs/how-to/stand-up-a-marketplace.md) how-to, or `askit-init-marketplace` skill | - |
| Is troubleshooting a failing gate run | The [troubleshoot-the-gate](../../../docs/how-to/troubleshoot-the-gate.md) how-to | - |
| Is cutting a release | `askit-release` skill, and the [cut-a-release](../../../docs/how-to/cut-a-release.md) how-to | - |
| Wants to watch the upstream agentskills.io spec for drift | `askit-standards-watch` skill, and the [watch-the-upstream-spec](../../../docs/how-to/watch-the-upstream-spec.md) how-to | - |

## The `askit-build-*` roster, by component type

`askit-build-agents-md`, `askit-build-chain-contract`, `askit-build-command`, `askit-build-docs`,
`askit-build-hook`, `askit-build-mcp`, `askit-build-output-style`, `askit-build-samples`,
`askit-build-settings`, `askit-build-skill`, `askit-build-statusline`, `askit-build-subagent`,
`askit-build-workflow`. Each follows the builder pattern (`docs/reference/builder-pattern.md`):
create mode scaffolds, improve mode raises conformance; `askit-evaluate` is the shared assessment
step after either one.

## What this skill refuses

A request shaped like "fix X" or "build X now" names a builder or `askit-migrate` directly; this skill
says which one and stops rather than doing the fix itself. See the SKILL.md scope fence.
