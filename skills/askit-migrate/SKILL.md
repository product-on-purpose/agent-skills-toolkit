---
name: askit-migrate
description: Assesses an existing skills repository against the Advanced Skill Library Standard, produces a staged bring-to-conformance plan, and writes the minimal canonical manifest so the repo becomes gradeable. Use when adopting a foreign or ad-hoc skills repo, migrating a Claude-only plugin toward cross-agent conformance, or planning a Bronze-to-Silver upgrade path.
metadata:
  version: 0.1.0
  tier: universal
  audience: advanced
---

# askit-migrate

## Purpose
Adopt an existing skills repository into a Standard-conformant plugin. Three modes: `assess` surveys the repo's components and structure, maps them to the Standard's component types, and reports the conformance gap (what is missing for Bronze, then Silver), handling the pre-`library.json` state the conformance core cannot yet grade; `plan` produces an ordered bring-to-conformance roadmap keyed to the tiers and names the `askit-build-*` skill or check that closes each gap; `adopt` performs the first structural step by writing a minimal canonical `library.json` and a root `AGENTS.md` if absent, so the repo becomes gradeable and the rest of the plan can run through `askit-evaluate` and the builders. Authoring depth is in [references/migration-workflow.md](references/migration-workflow.md).

## When to use
When adopting a foreign or ad-hoc skills repo, migrating a Claude-only plugin toward cross-agent conformance, or planning a Bronze-to-Silver upgrade path for an existing repository.

## assess mode
1. Discover what exists: skills, commands, subagents, hooks, MCP config, instructions (`AGENTS.md` / `CLAUDE.md`), and any manifest. Map each to a Standard component type (sec 3).
2. Report the gap by tier. The Bronze blockers first (a parseable `library.json`, a root `AGENTS.md`, valid skill frontmatter, name-equals-directory, resolvable reference links), then the Silver blockers (`agent-targets`, the plugin prefix, a `components` index, native manifests).
3. Where a `library.json` already exists, delegate the per-rule grading to `askit-evaluate`; otherwise report the pre-manifest gaps the conformance core cannot yet see and run `assess` again after `adopt`.

## plan mode
1. Order the gaps into a staged roadmap: Bronze first (make it parse and self-describe), then Silver (cross-agent shape and the prefix), then the optional tail (hooks, workflows, docs site).
2. For each step name the resolver: the `askit-build-*` skill that authors the component, the check whose message states the fix, or `askit-evaluate` to re-confirm.
3. Record the plan so the migration is legible and resumable across sessions.

## adopt mode
1. Write the Bronze-minimal canonical `library.json` the conformance core requires at every tier (sec 5.1, check U1): `name`, `version` 0.1.0, `description`, `standard` (the Standard version targeted), and `tier` `universal`. That is the smallest manifest that satisfies U1 and makes the repo gradeable.
2. Add a root `AGENTS.md` if absent (Standard sec 3.10) so anatomy (U2) passes, then run `askit-evaluate` to confirm Bronze is clean.
3. When climbing to Silver, add the Convergent-only fields the higher checks require: `agent-targets` (S1), a kebab-case `prefix` ending in a hyphen carried by every component name (S2), and a `components` index (S3); then emit native manifests with `node scripts/generators/gen-manifest.mjs . --write --target=all` (S6) and hand off to the `askit-build-*` skills and `askit-evaluate`.

## Scope
`askit-migrate` adopts an existing repo; greenfield scaffolding from an interview is a separate, planned init/onboarding flow (Standard sec 10.7). It makes the repo gradeable and produces the plan, then the `askit-build-*` skills and `askit-evaluate` execute the plan slice by slice; it does not rename components to add the prefix wholesale or rewrite skills on its own. The why-gate applies before adding any new component (see `askit-backlog`).
