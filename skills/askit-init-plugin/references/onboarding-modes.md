# Onboarding modes and the seed anatomy (reference)

How `askit-init-plugin` onboards a maintainer and what it scaffolds.

## The three modes

| Mode | The maintainer | The agent |
|---|---|---|
| `interview` | answers live Q&A | asks, synthesizes a config, scaffolds |
| `questionnaire` | fills the emitted template async | emits the template, then processes it into a config + scaffold |
| `hybrid` | corrects a pre-filled template | reads chat context, emits a tailored questionnaire pre-filled with suggestions, then processes the corrected return |

The questionnaire is the reusable [onboarding template](../../templates/onboarding-questionnaire.template.md): per-section "Maintainer feedback" + "Agent response" blocks. This collaborative-doc pattern is the same one this toolkit was built with, and it generalizes to any skill that needs structured async input.

## The onboarding questions

1. **Theme and scope** - what the plugin is about; what is in and out of scope.
2. **Target agents** - Claude, Codex, or both (sets the tier path and which component types are plugin-distributable; see `askit-capability-advisor`).
3. **Target tier** - Bronze (skills + docs), Silver (cross-agent + packaging), or Gold (the full bar).
4. **First components** - which skills/commands/subagents to scaffold first.

## The seed anatomy (Bronze)

The scaffold copies `templates/seed-plugin/`:

- `library.json` - the five fields the conformance core requires at every tier (`name`, `version`, `description`, `standard`, `tier`), `tier: universal` to start.
- `AGENTS.md` - the agent navigation entrypoint (required at every tier, sec 3.10).
- `README.md`, `CHANGELOG.md` - starter docs (Keep a Changelog skeleton).

This minimal set passes every Universal check with 0 errors - the structural match the asserted anatomy test enforces (ADR 0023, not a byte-exact diff). Adding `prefix`, `agent-targets`, a `components` index, and native manifests is the Silver step (driven by `askit-migrate` plan mode or the `askit-build-*` skills as components are added).

## Boundary

`askit-init-plugin` starts a NEW plugin. Adopting an EXISTING repo is `askit-migrate`. Scaffolding a marketplace is `askit-init-marketplace`.
