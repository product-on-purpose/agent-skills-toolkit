# askit-migrate (reference)

Adopts an existing skills repository into a Standard-conformant plugin and produces a staged bring-to-conformance plan.

## Modes
- `assess`: inventory the repo's components, map each to a Standard component type, and report the conformance gap by tier (Bronze blockers first, then Silver). Delegates per-rule grading to `askit-evaluate` once a `library.json` exists.
- `plan`: order the gaps into a staged Bronze-to-Silver roadmap and name the resolver for each step (a `askit-build-*` skill, a check, or `askit-evaluate`).
- `adopt`: write the minimal canonical `library.json` + a root `AGENTS.md` if absent, then emit native manifests, so the repo becomes gradeable.

## Boundary
Migrate adopts an existing repo; greenfield scaffolding from an interview is a separate, planned init/onboarding flow (Standard sec 10.7). Migrate makes the repo gradeable and plans the work; the builders and `askit-evaluate` execute it slice by slice.

## Notes
See the [adopt-a-foreign-repo how-to](../how-to/adopt-a-foreign-repo.md) and [migration-workflow](../../skills/askit-migrate/references/migration-workflow.md).
