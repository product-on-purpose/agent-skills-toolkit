# askit-init-plugin (reference)

Creates a starting plugin that satisfies the Bronze anatomy and onboards the maintainer.

## Modes
- `interview`: live Q&A, then scaffold.
- `questionnaire`: emit the onboarding template for async fill, then process it.
- `hybrid`: emit a context-tailored, pre-filled questionnaire, then process the corrected return.

## The seed anatomy
Scaffolds `templates/seed-plugin/` (`library.json` with the five required fields + `AGENTS.md` + README/CHANGELOG starters). The minimal set passes every Universal check with 0 errors - the structural match the asserted test enforces (ADR 0023, not byte-exact). See [onboarding-modes](../../skills/askit-init-plugin/references/onboarding-modes.md).

## Boundaries
Adopting an EXISTING repo is `askit-migrate`; a marketplace is `askit-init-marketplace`; the richer surfaces (README, CHANGELOG, ADRs, backlogs) are scaffolded by their own skills. See the [scaffold-a-plugin how-to](../how-to/scaffold-a-plugin.md).
