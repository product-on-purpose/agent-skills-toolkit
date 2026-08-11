# Onboarding modes and the seed anatomy (reference)

How `askit-init-plugin` onboards a maintainer and what it scaffolds.

## The three modes

| Mode | The maintainer | The agent |
|---|---|---|
| `interview` | answers live Q&A | asks, synthesizes a config, scaffolds |
| `questionnaire` | fills the emitted template async | emits the template, then processes it into a config + scaffold |
| `hybrid` | corrects a pre-filled template | reads chat context, emits a tailored questionnaire pre-filled with suggestions, then processes the corrected return |

The questionnaire is the reusable [onboarding template](../../../templates/onboarding-questionnaire.template.md): per-section "Maintainer feedback" + "Agent response" blocks. This collaborative-doc pattern is the same one this toolkit was built with, and it generalizes to any skill that needs structured async input.

## The onboarding questions

1. **Theme and scope** - what the plugin is about; what is in and out of scope.
2. **Target agents** - Claude, Codex, or both (sets the tier path and which component types are plugin-distributable; see `askit-capability-advisor`).
3. **Target tier** - Bronze (skills + docs), Silver (cross-agent + packaging), or Gold (the full bar).
4. **First components** - which skills/commands/subagents to scaffold first.
5. **Author (optional, `interview` mode only)** - a name, and optionally a url/email, for the native manifest's `author` field (ADR 0043). If the maintainer declines or skips, emit NO `author` key at all - never a placeholder. A missing optional field is honest; a fabricated one (e.g. `{"name": "REPLACE - your name"}`) is the same defect U5 (description-score) already penalizes real `TODO`/`TBD`/`FIXME`/`PLACEHOLDER`/`CHANGEME` tokens for (ADR 0033, `scripts/checks/description-score.mjs`), wearing a different hat, and it would ship a false attribution in every scaffolded plugin until someone noticed. `questionnaire` and `hybrid` mode do not yet ask this question; a plugin scaffolded through either mode keeps the template's author-less manifest until the maintainer adds one by hand.

## The seed anatomy (Bronze)

The scaffold copies `templates/seed-plugin/`:

- `library.json` - the five fields the conformance core requires at every tier (`name`, `version`, `description`, `standard`, `tier`), `tier: universal` to start.
- `AGENTS.md` - the agent navigation entrypoint (required at every tier, sec 3.10).
- `.claude-plugin/plugin.json` - a MINIMAL native manifest: `name`, `version`, `description` only, copied from `library.json`. This buys install recognition on Claude Code, and, since Codex 0.146.0 reads `.claude-plugin/*` directly, on Codex too, from one file (ADR 0043). Fill its `name`/`description` to match `library.json` exactly, or U8 (manifest-drift) flags the drift.
- `README.md`, `CHANGELOG.md` - starter docs (Keep a Changelog skeleton).

This minimal set passes every Universal check with 0 errors - the structural match the asserted anatomy test enforces (ADR 0023, not a byte-exact diff). The minimal manifest above is NOT the Silver step: it carries no `agent-targets`, `prefix`, `components` index, or component-path arrays, so it does not claim Silver's S6 (per-target emission) behavior. Adding `prefix`, `agent-targets`, a `components` index, and REGENERATING both native manifests in full (via `scripts/generators/gen-manifest.mjs`, which adds `author`, `homepage`, `repository`, `keywords`, and Codex's `skills`/`interface` pointers) is the Silver step (driven by `askit-migrate` plan mode or the `askit-build-*` skills as components are added).

**Two honest states, not one (ADR 0043).** The raw `templates/seed-plugin/` template genuinely has no author to declare, so `claude plugin validate templates/seed-plugin --strict` correctly warns on it - that warning is accurate, not a defect. A plugin actually scaffolded through `interview` mode, with the maintainer supplying an author, gets a real `author` object written into its `.claude-plugin/plugin.json` (and mirrored into `library.json`'s optional `author` field, so a later Silver-tier regeneration via `gen-manifest.mjs` does not silently drop it) and passes `--strict` cleanly. A plugin scaffolded via `interview` mode where the maintainer declined stays in the template's state and still warns under `--strict` - correctly, since it still has no author to declare.

## Boundary

`askit-init-plugin` starts a NEW plugin. Adopting an EXISTING repo is `askit-migrate`. Scaffolding a marketplace is `askit-init-marketplace`.
