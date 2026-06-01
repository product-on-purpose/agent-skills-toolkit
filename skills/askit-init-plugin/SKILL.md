---
name: askit-init-plugin
description: Creates a starting plugin that satisfies the Bronze anatomy and onboards the maintainer, in three modes (interview, questionnaire, hybrid). Use when starting a new plugin from scratch, onboarding a maintainer, or generating a scaffolding questionnaire.
metadata:
  version: 0.1.0
  tier: universal
  audience: beginner
---

# askit-init-plugin

## Purpose
Onboard a maintainer and scaffold a starting point that is gradeable from the first commit. Three modes: `interview` runs a live conversational Q&A, then scaffolds; `questionnaire` emits the structured [onboarding template](../../templates/onboarding-questionnaire.template.md) (with per-section maintainer-feedback and agent-response blocks) for the maintainer to fill async, then processes it; `hybrid` pre-fills that questionnaire with suggestions from chat context, still leaving the feedback blocks. All three scaffold the Bronze seed anatomy from [`templates/seed-plugin/`](../../templates/seed-plugin/) (`library.json` with the five required fields + `AGENTS.md` + README/CHANGELOG starters) so the new plugin passes the conformance core immediately. Mode and anatomy detail are in [references/onboarding-modes.md](references/onboarding-modes.md).

## When to use
When starting a brand-new plugin from scratch, onboarding a maintainer, or generating a scaffolding questionnaire. (To adopt an EXISTING repo instead, use `askit-migrate`.)

## interview mode
1. Ask the maintainer the onboarding questions live (theme/scope, target agents, target tier, first components).
2. Synthesize a starting config and scaffold from `templates/seed-plugin/`, filling `library.json` `name`/`description` and `AGENTS.md`.
3. Hand off: `askit-build-skill` for the first skill, `askit-build-docs` for docs, `askit-evaluate` to confirm Bronze.

## questionnaire mode
1. Emit `templates/onboarding-questionnaire.template.md` for the maintainer to fill async.
2. On return, process the maintainer-feedback blocks into a config and scaffold as above.

## hybrid mode
1. From chat context, emit a tailored questionnaire pre-filled with suggested answers (keeping the feedback blocks).
2. Process the returned, corrected questionnaire and scaffold.

## Scope
The seed scaffold is the minimal Bronze anatomy (the structural match the asserted test enforces, ADR 0023, not a byte-exact diff): it passes every Universal check with 0 errors. The richer surfaces (a real README via `askit-build-docs`, CHANGELOG via `askit-release`, ADRs via `askit-decision`, backlogs via `askit-backlog`) are scaffolded by their own skills, so init composes the toolkit rather than duplicating it. Marketplace scaffolding is `askit-init-marketplace`.
