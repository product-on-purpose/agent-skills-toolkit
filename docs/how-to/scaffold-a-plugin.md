# How to scaffold a new plugin

Start a new, gradeable plugin with `askit-init-plugin`.

## Pick a mode

- `interview` - answer live questions; fastest when you have the answers ready.
- `questionnaire` - get the onboarding template to fill async; good for handing to a maintainer.
- `hybrid` - get a pre-filled questionnaire tailored from what you have already said, then correct it.

## What you get

A Bronze seed copied from `templates/seed-plugin/`: a `library.json` with the five required fields (name, version, description, standard, tier), an `AGENTS.md`, and README/CHANGELOG starters. It passes the conformance core immediately (`askit-evaluate` reports `universal` with no errors).

## Then

- First skill: `askit-build-skill` (create).
- Docs: `askit-build-docs`.
- Climb to Silver: declare `agent-targets` + the prefix + a components index + native manifests (the `askit-build-*` skills and `askit-migrate` plan mode drive this).

## See also

- [`askit-init-plugin` reference](../reference/askit-init-plugin.md)
- [onboarding-modes](../../skills/askit-init-plugin/references/onboarding-modes.md)
- [adopt-a-foreign-repo](adopt-a-foreign-repo.md) (for an existing repo instead)
