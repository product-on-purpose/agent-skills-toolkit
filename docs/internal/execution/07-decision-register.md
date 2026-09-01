---
title: "askit uplift program - decision register"
description: "Every decision the program rests on, who ruled it, and which remain overridable at review"
status: draft
last-updated: "2026-07-06"
---

# Decision register

Two classes of decision anchor this program. **Maintainer rulings (AU-1 through AU-5)** were made explicitly by the maintainer on 2026-07-06 during program scoping and are binding. **Orchestrator rulings (OR-1 through OR-10)** were made by the orchestrator to unblock planning; each is overridable by a line of feedback on [EXEC-SUMMARY.md](EXEC-SUMMARY.md) before "go", and any overridden ruling is folded back through the affected docs before execution starts. This is a living document: rulings made during execution are appended with dates.

**What this delivers and why it matters (plain language).** Nothing in this program rests on an unstated assumption. Every choice - what is in scope, what the program may do without asking, and every judgment call the planner made on the maintainer's behalf - is written here with its reason, so review means scanning one list rather than reverse-engineering the plan.

## Maintainer rulings (binding)

### AU-1 (program scope)

**Ruling.** The program delivers all four proposed workstreams - the builder build-out SP1-SP4 (resuming the 2026-06-25 thread), the committed roadmap F2 (eval-run pipeline) / F3 (advisory quality) / F5 (authoring tokens) plus corpus batch 3, marketplace-scope evaluation, and the hygiene and docs batch - plus a thin GUI slice.

**Context.** Chosen from a multi-select after the audit; the maintainer selected every offered workstream and upgraded the GUI from "record as roadmap item" to "include a thin slice".

### AU-2 (hard repo boundary)

**Ruling.** The program may do anything that does not modify another repository. Writes land only in agent-skills-toolkit. The agent-plugins marketplace re-pin at each release is staged as ready-to-apply instructions, never executed. Read-only calls (gh api reads) to other repos are permitted.

**Context.** The maintainer is separately exploring standards governance in agent-plugins and wants that work isolated from this program. This ruling also resolved the relocation-sequencing question: the program plans around a possible future checker relocation (see OR-7) instead of executing or preempting it.

### AU-3 (full ship autonomy)

**Ruling.** After the maintainer approves the executive summary ("go"), the orchestrator merges green adversarially-reviewed PRs and cuts releases (version bump, tag, GitHub release) autonomously, within the AU-2 boundary, reporting as it goes.

**Context.** Extends the standing merge-green-PRs-in-autonomous-flow memory to release cuts for this program. The prior distinction (merge autonomous, cut confirmed) recorded in the 2026-06-14 session log is superseded for this program by this explicit ruling. Stop-and-flag conditions in [03-execution-plan.md](03-execution-plan.md) suspend autonomy immediately.

### AU-4 (GUI thin slice)

**Ruling.** The agent-skills-studio concept graduates from invisible local design to a shipped thin slice in this program.

**Context.** Chosen over "record as roadmap item only" and "shelve". Slice scope is OR-5 (read-only dashboard).

### AU-5 (delivery approach)

**Ruling.** Approach A - four small releases (v1.7.0 through v1.10.0) on parallel work lanes, over one-workstream-at-a-time and over a single big v2.0.

**Context.** Matches the repo's proven cadence (the v1.3.0/v1.4.0 program split, the v1.6.0 two-feature cut) and its shippable-at-every-exit principle. The maintainer asked that the "release train" metaphor be dropped; the docs say "release".

## Orchestrator rulings (overridable at review)

### OR-1 (SP1 helper placement)

**Ruling.** The craft pass's partition logic lives in a new dedicated helper, `scripts/lib/craft-review.mjs`, not inline in the skill or evaluate.mjs; it is recorded in [relocation-addendum.md](relocation-addendum.md) as evaluate-side code that askit retains if the checker relocates.

**Why.** Testable in isolation (TDD), keeps evaluate.mjs a thin pipeline, and gives the relocation program one named file with a recorded disposition instead of interleaved logic.

### OR-2 (SP1 safe-vs-judgment boundary)

**Ruling.** The consent-gated "safe" apply set is a conservative mechanical allowlist: broken-link corrections, formatting normalization, missing frontmatter fields. Anything touching instructions, procedures, descriptions, or meaning is "judgment" and is only ever reported, never auto-applied.

**Why.** The craft pass's trust story depends on it being impossible to describe a case where consenting to "safe fixes" changed what a skill does.

### OR-3 (SP1 artifact format)

**Ruling.** The craft-review artifact renders as both Markdown and HTML via the existing report renderer's review path.

**Why.** The renderer already produces both from one object; MD is diff-able in PRs, HTML matches the maintainer's preferred report reading experience.

### OR-4 (untracked template files)

**Ruling.** The four untracked report-template design references (dark, dashboard, editorial HTML, editorial MD) are committed as labeled historical design references beside the four already-tracked templates, with a folder README note; flagged since the 2026-06-03 Codex audit.

**Why.** They document the E1 (report renderer) design lineage, the maintainer's stated favorite (dashboard) among them; untracked files risk silent loss and have shown up as noise in every audit since June.

### OR-5 (GUI slice scope)

**Ruling.** The slice is a read-only local dashboard: locally launched via `npm run ui` (a `bin` entry ships so a future npm publish would enable true `npx`, but publishing is an out-of-boundary action under AU-2 and stays a future maintainer decision), 127.0.0.1-only with a per-launch token (the design's own security model), rendering real tier-report/evaluate JSON for a chosen target by running the existing read-only entry points in-process. No create, edit, or package verbs; no PWA; no remote access. The _local/gui design docs are promoted into tracked docs/internal/studio/.

**Why.** Visualize is the smallest verb that proves the studio concept against real data without opening any file-mutation surface.

### OR-6 (marketplace-scope construction)

**Ruling.** Marketplace-scope evaluation is built in this repo now (per AU-2 it cannot go elsewhere), ADR-first, in a cleanly delimited module home with minimal coupling into existing lib internals, and every engine-adjacent addition is recorded in [relocation-addendum.md](relocation-addendum.md).

**Why.** Honors AU-2 while minimizing the rework the maintainer's standards program would absorb if the checker later relocates; the addendum turns "the packing list is stale" into a mechanical delta.

### OR-7 (relocation posture)

**Ruling.** The program treats the possible Standard/checker relocation as an external event to plan around: a STATUS.md dependency note ships in H1 (hygiene batch), every session opens with the staleness/collision check, and the appearance of the standards program's PR-C (askit re-adopt) is a stop-and-flag event.

**Why.** AU-2 forbids executing it; ignoring it would repeat the failure mode this audit itself uncovered (a cross-repo plan invisible to this repo's tracker).

### OR-8 (packet home and format)

**Ruling.** The program plan lives at docs/internal/execution/ in the numbered-suite format the maintainer already reviewed in the agent-plugins standards program, plus the repo's conventional thin per-release packets at cut time.

**Why.** The packet spans four releases (no single plan_vX home fits), and the format is one the maintainer has already navigated and refined. Approved as design Section 1 on 2026-07-06.

### OR-9 (CI hardening set)

**Ruling.** R1 lands: Dependabot (npm root and site, github-actions), a Node {22.12.0, 24} matrix on validate, a blocking npm audit at high severity, a concurrency group, npm cache on root jobs, an SHA-pin for the one third-party action, c8 coverage report-only, and CodeQL default setup. Detail and rollbacks in [05-ci-plan.md](05-ci-plan.md).

**Why.** These are the visible maturity gaps a security-conscious reviewer flags first on a public repo; all are cheap; none moves validation logic into YAML.

### OR-10 (naming)

**Ruling.** Deliverables use plain "Release 1-4" / version numbers, not "trains"; feature bundles keep their historical IDs with handles (SP1 the builder craft pass, F2 the eval-run pipeline, H1 the hygiene batch, E4 SARIF output, E9 provenance contract).

**Why.** Maintainer questioned the metaphor; the IDs preserve traceability to session logs, backlog, and specs.

## Open items expected to be ruled during execution

- Whether SP4's step-orphan validation ships as a spine check or a non-spine validator (its ADR decides; warn-first if spine).
- Whether the marketplace-scope collection verdict is worst-member or a policy knob (its ADR decides).
- Whether E4 (SARIF output) and E9 (provenance contract) make the R4 cut as optional riders or return to the backlog. **Settled by shipping: both landed in v1.11.0 on 2026-08-11.**
- CodeQL include-vs-decline confirmation when the R1 CI PR lands (OR-9 recommends include).
