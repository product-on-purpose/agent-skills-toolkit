---
title: "askit uplift program - executive summary"
description: "The one page to review before saying go - what ships, what it costs, what waits for you, and the risks"
status: draft
last-updated: "2026-07-06"
---

# Executive summary: the askit uplift program

**You are approving:** a four-release program (v1.7.0 through v1.10.0) executed autonomously inside this repository by one orchestrator (Fable) directing Opus and Sonnet subagents, that deepens the builders, industrializes the eval loop, ships marketplace-scope grading, closes the Manage gaps, fixes every stale trust surface, and delivers the first visual slice of the studio - while writing to no other repository. Your one action after review: say "go" (or give feedback on any line of this packet first).

## What this delivers and why it matters (plain language)

The toolkit is healthy but under-selling and under-teaching. Its public README is three versions stale on its own front page. Its 13 builder skills produce correctly-shaped components but ship not one working example between them - a scaffolder, not a teacher. Its improvement loop (grade real libraries, verify findings, calibrate) works but is hand-run every time. Its grader evaluates one plugin at a time even though real users ship marketplaces of nine. And its only GUI concept sits invisible in a gitignored folder.

After this program: the front page is true and cannot silently drift again; the four hardest builders teach craft with real working examples; grading a whole marketplace is one command; advisory quality is a measured number instead of an impression; deprecation and workflow validation do what their docs already claim; and one local command (`npm run ui`) opens a live dashboard of any plugin's grade. Each of the four releases stands alone - if you stop the program after any one of them, the product is complete and better.

## The four releases at a glance

| Release | Headline | Contents |
|---|---|---|
| **v1.7.0 "trust and craft"** | Every stale surface fixed; the stalled craft-pass thread shipped | H1 (hygiene batch: README + comparison + subagents reference + QUICKSTART + branch pruning + small correctness fixes + CI hardening), SP1 (builder craft pass - the consent-gated advisory review you designed 2026-06-25), F2 (eval-run pipeline) |
| **v1.8.0 "deep builders, measured advisory"** | Builders become teachers; advisory becomes a number | SP2 (craft references + working golden/anti examples for the four complex builders), F3 (advisory quality measurement - seeded defects, precision/recall per model and effort), F5 (authoring token measurements, riding SP2's runs), corpus batch 3, first real evals/ fixtures |
| **v1.9.0 "marketplace scope"** | The program headline | Marketplace-scope evaluation (one run grades all members + collection findings; ADR-first; built relocation-friendly), SP3 (guided author-a-coherent-plugin journey) |
| **v1.10.0 "manage and studio"** | Manage gaps closed; the product gets a face | SP4 (deprecate removal automation + workflow step-orphan check), the read-only studio dashboard (local launch via `npm run ui`, localhost-only; npm publish stays out of scope under AU-2); stretch: E4 (SARIF output), E9 (provenance contract) |

## What happens on "go" - and what waits for you

**On "go", autonomously (your ruling AU-3, full ship autonomy):** branches, TDD builds, 4-lens adversarial reviews, squash-merges on green, release cuts (bump, tag, GitHub release), packet and STATUS updates - all inside this repo, reported as it goes.

**Waits for you (only two things):**
1. **Staged re-pins.** Each release produces `repin-instructions.md` - the exact steps to update the marketplace registry in agent-plugins. Per your boundary ruling (AU-2), this program never executes them. Until you apply one, the marketplace simply keeps serving the previous version; nothing breaks.
2. **Stop-and-flag events.** If your standards program's relocation package (PR-C, askit re-adopt) fires mid-program, or the gate goes red, or any step would require writing outside this repo, autonomy suspends and you get a flag with a recommendation.

## Boundaries (your rulings, binding)

- **AU-2:** no writes to any repo but this one; re-pins staged, never executed; read-only lookups elsewhere are fine.
- **The determinism invariant stands:** no LLM ever touches the gate verdict; the craft pass and every advisory feature render beside the gate.
- **The Standard grows only by ADR** with warn-first burndown, exactly as U13 (skill-registration) did.

## How it runs (orchestration)

Fable plans, sequences, reviews, merges, and cuts. Opus subagents build judgment-heavy work (craft rubric, marketplace-scope core, GUI slice, ADR drafts); Sonnet handles mechanical volume (fixtures, doc sweeps, corpus runs, measurements); Haiku is never used where truth matters (your recorded confabulation lesson). Every substantive PR passes TDD plus the 4-lens adversarial panel (false-PASS, false-FAIL, determinism, contract-fidelity). Parallel builds are worktree-isolated; every session opens with the staleness check and closes with a wrap-session log. Full contract: [10-agent-operations.md](10-agent-operations.md).

## Cost expectations (honest)

The deterministic gate and all its new scopes cost zero model tokens, always. The token-heavy parts are the advisory/authoring runs this program deliberately performs and measures: recorded advisory runs to date span roughly 33k-103k subagent tokens each (docs/reference/token-usage-estimates.md), and this program adds builder-authoring runs, seeded-defect measurement batteries, corpus batch 3, and adversarial panels on every PR. This is an ultracode program: expect multi-million total subagent tokens across the four releases, spent where they buy verified correctness or measured data, never in the verdict path.

## Top risks (full register: [08-risk-register.md](08-risk-register.md))

1. **Cross-program collision** - your standards program later restructures this repo's scripts/ (PR-C). Mitigated: STATUS dependency note, per-session staleness check, stop-and-reconcile, and a relocation addendum that records every engine-adjacent addition this program makes.
2. **Scope across four releases** - the repo's historical burnout risk. Mitigated: every release independently shippable; stretch items droppable; stopping early is a clean state by design.
3. **Renderer regression** - the 933-line report renderer gets factored while gaining the marketplace report type. Mitigated: golden snapshots with additive-only diff verification plus the determinism review lens.

## What was decided and what you can still change

Five rulings are yours and binding (AU-1 scope, AU-2 boundary, AU-3 autonomy, AU-4 GUI slice, AU-5 release approach). Ten are mine and overridable by one line of feedback (OR-1 through OR-10: the SP1 craft-pass mechanics, the template-file commit, the GUI slice scope, the CI hardening set, packet format, naming). They are all, with reasons, in [07-decision-register.md](07-decision-register.md).

## Success metrics

Ten measurable targets (M1-M10) in [02-prd.md](02-prd.md): gate 0/0 at every merge, growing test count, 3+ golden and 1+ anti examples per deep builder, precision/recall recorded for 4+ model-effort cells, one marketplace run reproducing the nine hand-run phuryn verdicts, zero unmeasured dossier rows, README drift made impossible, a working local dashboard, four cut releases, and the first real evals/ fixtures on disk.

## How to review this packet

This page is the decision surface. If something here needs changing, say it in a sentence - I will fold it through the packet. For depth: [07-decision-register.md](07-decision-register.md) (every ruling), [03-execution-plan.md](03-execution-plan.md) (ordering and gates), the four release plans under [04-releases/](04-releases/README.md) (feature-level specs and acceptance), [05-ci-plan.md](05-ci-plan.md), [06-release-choreography.md](06-release-choreography.md), [08-risk-register.md](08-risk-register.md), [09-backlog.md](09-backlog.md) (everything deliberately not in scope, so nothing is lost), and [01-audit-2026-07-06.md](01-audit-2026-07-06.md) (the evidence this all stands on).

**When you are satisfied: say "go".**
