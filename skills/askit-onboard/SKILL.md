---
name: askit-onboard
description: Assesses where an adopter stands with this toolkit's plugin and skills, then plans a personalized roadmap through a short interview and reports the next step on a return visit. Use when a user asks how to get started with this toolkit, wants a tailored adoption plan rather than generic docs, or comes back later asking what to do next; it routes to the existing assess, build, and migrate skills and to existing how-to and tutorial pages, and never scaffolds or fixes anything itself.
metadata:
  version: 0.1.0
  tier: universal
  audience: beginner
  chain: askit-explorer
---

# askit-onboard

## Purpose
Onboard a PERSON into using this toolkit well, over weeks rather than one session. Three modes:
`assess` surveys where the adopter stands today; `plan` interviews briefly and writes a personalized
roadmap file into the adopter's own repository, after they confirm it; `next` is the re-entry point
that reads that roadmap on a later visit and names one next step. Depth beyond this file lives in
[references/routing-map.md](references/routing-map.md) (which skill or docs page answers which
situation) and [references/roadmap-format.md](references/roadmap-format.md) (the roadmap file's
shape).

## When to use
When a user asks how to get started with this toolkit, wants a sequenced plan for adopting it rather
than reading everything at once, or returns to a repository that already has a roadmap and asks what
is next.

## The scope fence
`askit-onboard` interviews, diagnoses, sequences, and tracks. **It routes INTO the existing skills and
docs pages and never duplicates their work.** It never scaffolds a component, never fixes a
description, never writes a `library.json`, and never edits the adopter's skills or manifests - those
are `askit-build-*`, `askit-migrate`, and `askit-evaluate`'s jobs. If a request is really "fix this" or
"build this now" rather than "where do I start" or "what's next", name the skill that does it and stop;
do not do the work yourself. The moment this skill starts scaffolding or fixing, it has failed its own
why-gate (recorded in `docs/internal/backlog/enhancements.md`, entry E47).

## Where this routes, and what it deliberately does not cover
This toolkit's own `docs/adoption/` funnel does not exist (the nine-door design in
`docs/internal/release-plans/plan_onboarding-funnel/` was never shipped). This skill routes only to the
pages that are actually on disk under [`docs/how-to/`](../../docs/how-to/README.md) and
[`docs/tutorials/`](../../docs/tutorials/README.md), listed with their real titles in
[references/routing-map.md](references/routing-map.md). It does not reference or imply a
`docs/adoption/` page.

## assess mode
1. Determine the adopter's repository root (the current working directory, unless the user names
   another path).
2. Survey it read-only: dispatch the `askit-explorer` subagent (the declared chain) when running in a
   harness that can dispatch it; otherwise perform the walk inline with `Glob`/`Grep`/`Read`. Either
   way, the question is the same: does a `library.json` exist, which component types are present and
   where, which `agent-targets` are declared, and has the repo ever been graded.
3. If a `library.json` exists, run `node scripts/evaluate.mjs <repo> --json` (via `askit-evaluate`) to
   get the current tier and findings rather than re-deriving them. If none exists, report the
   pre-manifest state the way `askit-migrate` (assess mode) does - this skill reads that state, it does
   not write the fix.
4. Report: current tier (or "pre-manifest"), component inventory, and which capability-map regions
   (per `askit-capability-advisor` / `askit-capability-gap-analysis`, if already run) the adopter has
   and has not touched. This is the read-only survey; it produces no file.

## plan mode
1. Run (or reuse a fresh) `assess`, so the plan is grounded in the adopter's actual state rather than a
   generic checklist.
2. Interview briefly, in the voice of `askit-init-plugin`'s interview mode: what is the adopter trying
   to do (ship a new plugin, migrate an existing repo, climb a tier, add one component type), how much
   time do they have, and which of the doors in
   [references/routing-map.md](references/routing-map.md) sound relevant. Skip questions whose answers
   are already in context.
3. Pick the matching doors and sequence them into an ordered roadmap: for each step, name the skill or
   docs page that does it (never this skill), a one-line reason it is next, and what "done" looks like
   for that step (reusing the done-condition style `docs/internal/roadmap.md` uses for its own open
   items).
4. Show the adopter the roadmap and ask them to confirm before anything is written. **Only on
   confirmation**, write it to `.askit/onboarding-roadmap.md` in the adopter's own repository, in the
   shape [references/roadmap-format.md](references/roadmap-format.md) defines, so `next` mode can read
   it back. Without confirmation, nothing is written.

## next mode
1. Read `.askit/onboarding-roadmap.md` from the adopter's repository. If it does not exist, say so and
   suggest `plan` mode instead; `next` has nothing to re-enter without a roadmap.
2. Find the first step not yet marked done. If the roadmap's own "done" condition for that step is
   something this skill can check mechanically (a file now exists, `askit-evaluate` now reports a
   higher tier), check it and mark completed steps along the way; otherwise ask the adopter to confirm.
3. Name exactly one next step - the skill or docs page to go to, and why it is next - rather than
   re-presenting the whole roadmap. Offer to re-run `plan` mode if the adopter's goals have changed
   enough that the roadmap itself should be redone, rather than silently rewriting it here.

## Scope
Claude-only chain (`agents/_chain-permitted.yaml` permits `askit-onboard` to dispatch `askit-explorer`);
portable across Claude Code and Codex as a skill regardless, since the chain is an optional dispatch
inside `assess` mode with an inline fallback (Standard sec 3.3). Depends on nothing that does not exist
on disk: it is sequenced after the toolkit's own docs quadrants (`docs/how-to/`, `docs/tutorials/`)
rather than after the unshipped `docs/adoption/` funnel. See `docs/internal/backlog/enhancements.md`
entry E47 for the why-gate statement and the full delineation from `askit-init-plugin`,
`askit-migrate`, and `askit-capability-advisor`.
