---
title: "askit uplift program - product requirements"
description: "Outcomes, success metrics, scope rulings, non-goals, and constraints for the four-release uplift program"
status: draft
last-updated: "2026-07-06"
---

# Product requirements: the askit uplift program

**What this delivers and why it matters (plain language).** agent-skills-toolkit promises three things: help people CREATE good plugins, MANAGE them over their life, and IMPROVE them against a real quality standard. Today the third pillar is strong and the first two are thinner than they look: the 13 builder skills scaffold correct structure but do not teach craft, none of them ships a single working example, the improvement loop is run by hand, and the public README understates the product by three versions. This program closes those gaps and adds the two most-requested new capabilities: grading a whole marketplace in one run, and a first visual dashboard. When it is done, a stranger landing on the repo sees a product that is deep, current, measurable, and honest about itself.

This PRD defines WHAT the program must achieve and how success is judged. HOW it runs is [03-execution-plan.md](03-execution-plan.md); the per-release detail is under [04-releases/](04-releases/README.md).

## 1. Outcomes

- **O1 (builders teach craft).** The four highest-complexity builders (skill, workflow, mcp, hook) carry genuine craft references and working golden/anti examples; every builder ships at least one golden example; askit-build-skill's improve mode offers an optional, consent-gated craft review (SP1, the builder craft pass).
- **O2 (the improve loop is industrial).** Grading real third-party libraries is reproducible end to end via F2 (eval-run pipeline): pinned targets, a deterministic runner, a dispatch contract, automated records. Advisory quality is a measured number (precision/recall per model and effort cell via F3, advisory quality measurement), not a narrative. The token dossier has no "not yet measured" rows (F5, authoring token measurements).
- **O3 (the gate grades collections).** Marketplace-scope evaluation grades an entire marketplace in one run: per-member verdicts, a collection verdict, cross-member structural collisions, and opt-in advisory dimensions for trigger-surface collision (sensor reading 11) and command-vs-skill divergence (sensor reading 15).
- **O4 (the Manage pillar has no admitted gaps).** askit-deprecate executes removals rather than only describing policy; build-workflow's declared-but-missing step-orphan validation exists (SP4, Manage gaps).
- **O5 (every trust surface is true).** README, comparison page, QUICKSTART, reference docs, backlog statuses, and branch list all match reality, and the README version surface is mechanically prevented from drifting again (H1, hygiene batch).
- **O6 (the product has a face).** A read-only local studio dashboard (locally launched via `npm run ui`, localhost-only; publishing to npm is out of scope under the AU-2 boundary) renders a real grade and report for any target (the GUI thin slice).

## 2. Success metrics

Measured at program close; each release's own exit gate is in its release plan.

| # | Metric | Target |
|---|---|---|
| M1 | Deterministic gate on this repo | Advanced 0 errors / 0 warnings at every merge and every cut |
| M2 | Test suite | Green at every merge; net test count grows every release (418 baseline) |
| M3 | Builder examples | 4 deep builders with 3+ golden and 1+ anti each; all builders 1+ golden |
| M4 | Advisory measurement | Precision/recall recorded for 4+ model x effort cells on seeded-defect fixtures |
| M5 | Marketplace scope | One run reproduces the 9 hand-run phuryn per-plugin verdicts and adds collection findings |
| M6 | Token dossier | Zero "not yet measured" rows |
| M7 | README drift | Impossible silently (CI assertion); README shows live version and check count |
| M8 | Studio slice | Local launch (`npm run ui`) renders a real dashboard against a corpus clone and against askit itself, zero writes |
| M9 | Releases | Four cuts (v1.7.0 through v1.10.0), each with tag, GitHub release, staged re-pin instructions |
| M10 | Behavioral convention | 2-3 skills ship real evals/ fixtures (today the convention has zero on-disk instances) |

## 3. Scope rulings (maintainer, 2026-07-06)

Recorded in full in [07-decision-register.md](07-decision-register.md).

1. **Scope** = all four workstreams (builder build-out SP1-SP4, committed roadmap F2/F3/F5 plus corpus batch 3, marketplace-scope evaluation, hygiene and docs batch) plus the GUI thin slice.
2. **Repo boundary (hard).** The program writes to no repository other than agent-skills-toolkit. Marketplace re-pins are staged as instructions, never executed. Read-only API calls to other repos are permitted.
3. **Autonomy.** After the maintainer's "go": merge green adversarially-reviewed PRs and cut releases autonomously, inside this repo.
4. **The engine may move later.** The maintainer's separate standards program (agent-plugins) may relocate STANDARD.md and the checker. This program builds engine-adjacent code separably and maintains [relocation-addendum.md](relocation-addendum.md); it never performs the relocation.

## 4. Non-goals

- Executing the Standard/checker relocation, or any write to agent-plugins, product-on-purpose/.github, or any sibling repo.
- The Gemini emitter, conformance badges, long-tail builders, and the rest of [09-backlog.md](09-backlog.md).
- Any LLM participation in the deterministic gate verdict. The advisory layer renders beside the gate and can never move it (standing invariant, ADR 0023 lineage).
- A full studio GUI product. The slice is the visualize verb only: read-only, localhost, no create/edit/package verbs.
- Public hosting of the /evaluation-reports/ showcase (a separate maintainer decision, tracked in the backlog).

## 5. Constraints and standing rules

- **Determinism invariant.** The gate stays synchronous, model-free, and exit-code-authoritative in every scope, including the new marketplace scope.
- **TDD is mandatory** for every behavior change: RED test first from real fixtures, then minimal code to GREEN, then the full suite.
- **Adversarial review before merge.** The 4-lens Claude panel (false-PASS, false-FAIL, determinism, contract-fidelity) gates every substantive PR; Codex review is opportunistic, never load-bearing.
- **Dual-audience by default.** Every value-bearing artifact carries a plain-language value statement plus engineering detail.
- **House style.** No em or en dashes anywhere; reference IDs always carry a handle; ADR references carry a short title; decisions live in documents, not chat.
- **Docs wiring.** Every new public doc gets G7 (docs-frontmatter) frontmatter, a G8 (folder-readme) inventory line, and a route-manifest entry, then the site build and both guards must pass.
- **Standard growth is ADR-gated.** Any new spine check follows the ADR 0027 (standard-aware gate) warn-for-one-minor burndown, as U13 (skill-registration) did.

## 6. Requirements by release

Binding detail lives in the four release plans; this table is the contract summary.

| Release | Headline | Must land | Reference |
|---|---|---|---|
| R1 v1.7.0 "trust and craft" | Trust surfaces + the craft pass | H1 (hygiene batch), SP1 (builder craft pass), F2 (eval-run pipeline) | [04-releases/R1-v1.7.0-trust-and-craft.md](04-releases/R1-v1.7.0-trust-and-craft.md) |
| R2 v1.8.0 "deep builders, measured advisory" | Builder depth + measured advisory | SP2 (deepen builders), F3 (advisory quality), F5 (authoring tokens), corpus batch 3, evals/ fixtures | [04-releases/R2-v1.8.0-deep-builders-measured-advisory.md](04-releases/R2-v1.8.0-deep-builders-measured-advisory.md) |
| R3 v1.9.0 "marketplace scope" | The program headline | Marketplace-scope evaluation, SP3 (coherent-plugin journey) | [04-releases/R3-v1.9.0-marketplace-scope.md](04-releases/R3-v1.9.0-marketplace-scope.md) |
| R4 v1.10.0 "manage and studio" | Manage gaps + the studio slice | SP4 (Manage gaps), the GUI read-only slice; stretch E4 (SARIF output) and E9 (provenance contract) | [04-releases/R4-v1.10.0-manage-and-studio.md](04-releases/R4-v1.10.0-manage-and-studio.md) |
