# Backlog workflow (reference)

The two backlogs and the why-gate (Standard sec 7.1).

## Two backlogs

- `new-components.md` - proposals to ADD a component. Each item: proposed `name`, component type, target `tier`, `agent-targets`, rationale, status.
- `enhancements.md` - changes to EXISTING components. Each item: the target component, the change, a `Why`, a `How to apply`, and status.

Both are local-first and version-controlled. RECOMMENDED at Bronze, REQUIRED at Silver+.

## The why-gate (new components only)

Before a new-component proposal is accepted, it must pass:
1. **Warranted?** Does the job need a new component, or is it covered by an existing one?
2. **Duplicate?** Is there already a component for this?
3. **A mode, not a component?** Could it be a `create`/`improve`/other mode of an existing `build-<type>` skill, or a mode of an action-verb skill? If so, route it to `enhancements.md` as a mode addition - do not create a micro-skill.
4. **Tier and targets?** What tier does it sit at, and which agents does it target?

The default answer is consolidation: one skill per component type, modes over micro-skills (the toolkit's own packaging decision). The gate exists to keep the catalog from sprawling.

## Triage and prune

- **Triage:** assign priority; route mis-filed items; tag enhancements with their target component/phase.
- **Prune:** remove shipped items (now in the CHANGELOG) and stale/rejected ones, recording the reason so the history is legible.
