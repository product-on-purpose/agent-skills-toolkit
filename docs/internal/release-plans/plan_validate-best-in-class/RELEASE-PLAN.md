---
title: "Plan: validate where the toolkit could be best in class"
description: "A proposed set of pre-registered experiments, each with a kill criterion, that decides whether the toolkit leads with proven builders, with marketplace governance, with both, or with neither"
status: proposed
last-updated: "2026-10-30"
---

# Plan: validate where the toolkit could be best in class

**Status: PROPOSED 2026-10-30. Nothing outward-facing runs without the maintainer's go.** This plan
operationalises [ADR 0066 (the goal is the builder whose libraries are proven to work, and "best" is
measured, not claimed)](../../decisions/0066-the-goal-is-the-builder-whose-libraries-are-proven-and-best-is-measured.md),
which is itself Proposed and carried as D-09 (the goal, and how "best" is measured) in
[`roadmap.md`](../../roadmap.md) section 2. It cross-references ADR 0066's criteria C1 to C4 rather than
restating them.

**The goal named by the maintainer is an industry-defining, best-in-class solution.** This plan does not
assume that goal is reachable. It runs the cheapest experiments that could prove it unreachable, in the
tradition of pm-skills' v2.35.0 pilots, where 0 of 3 skills beat a no-skill model and the planned
headline was dropped on that evidence.

## The two directions under test

- **Direction B, proven builders.** The toolkit's builders produce skills that measurably beat no skill,
  and beat the vendor's skill-creator used alone. This is ADR 0066's criterion C1.
- **Direction A, library governance.** Teams that run a marketplace of many plugins want one gate that
  keeps the set consistent, current and safe. ADR 0062 (a marketplace's Standard floor lives in its own
  sidecar, and a member below it reds the collection) and the W6 health number serve it.

Direction B runs first, because it can run entirely in-house, by hand, before anything is built.

## What "industry-defining" has to mean here

A checkable threshold, deliberately modest. **The baseline on 2026-10-30 is zero on all four.**

1. **A catalogue the maintainer does not own references the Standard** in its own repository, for example
   a `library.json` that declares an edition.
2. **A repository outside the maintainer's organisations runs the Action,** counted by GitHub code search
   for `product-on-purpose/agent-skills-toolkit` in workflow files. Two unrelated repositories also
   publish a package named `agent-skills-toolkit`, so the count is by reference, never by name.
3. **A vendor page or an independent comparison names the toolkit.**
4. **C1 passes, and the result is published** with its pre-registration.

Meeting none of these after both experiments is a result, and the decision table below says what follows.

## Experiment B: the C1 pilot, by hand

**The question.** Does building a skill through the toolkit's builder plus an eval-and-improve loop
produce a skill that beats no skill more often than the vendor's skill-creator does, given the same
brief, the same model and the same effort budget?

**Why it is a fair test, and why it can fail.** skill-creator already runs its own evals with and without
the skill and tunes the description for triggering. If the toolkit adds nothing over that loop, the
pilot will show it. That is the point.

**Design, to be committed under `docs/internal/eval-runs/` before anything runs.**

- **Skills.** Three new skills, briefs chosen before either arm builds. At least one brief must be a kind
  of task where pm-skills' pilots found templates mattered, a smaller model with thin inputs.
- **Arms.** (1) the toolkit's builder plus a hand-run loop: write eval cases, run
  `claude plugin eval --ablation with-without`, improve, repeat. (2) skill-creator's own full workflow.
  (3) no skill, which the vendor's with-without arm supplies.
- **Equal budget.** Each building arm gets the same model, the same brief and the same number of improve
  iterations, fixed in advance, for example three.
- **Held-out scoring cases.** Ten cases per skill, written by someone who sees neither build, committed
  before the builds start. Neither builder sees them. The builders' own cases are their regression
  suites and are never scored.
- **The pass rule.** Fixed before running: the toolkit-built skill beats the no-skill arm on more held-out
  cases than the skill-creator-built skill does, in at least 2 of the 3 skills.
- **The kill criterion.** If the pass rule fails, the behaviour-loop cut in `roadmap.md` section 3 is
  demoted to regression tooling, and the toolkit does not claim better builders.

**Cost.** About 3 skills x 2 building arms x 10 cases x 3 runs x 2 arms, which is roughly 360 eval
sessions, plus the build iterations. The money cost is not estimated until one case has been timed.
Confidence in the session count: medium.

**Proposed dates, the maintainer's to change:** pre-registration committed by 2026-11-06; results by
2026-11-20.

## Experiment A: the governance cohort

**The question.** When the gate runs over real multi-plugin catalogues the toolkit's authors do not own,
does it find things their owners act on?

**The candidates come from the 2026-10-30 market sample.** Seven of 60 sampled catalogues list five or
more plugins, with plugin counts of 145, 38, 22, 10, 8, 8 and 5. Only one belongs to an organisation.
**They are not named in this tracked file on purpose.** Naming a catalogue as a grading target is a
public statement about it, and this plan publishes nothing about anyone's catalogue without consent. The
names go into the pre-registration file only when the maintainer decides to proceed, and the sampling
command is recorded there so the list can be reproduced.

**Steps.**

1. **Widen the sample before trusting it.** GitHub code search counts about 50,800
   `.claude-plugin/marketplace.json` files and about 6,600 Codex plugin manifests. Those counts include
   forks and copies. The 60 sampled files were the top results by relevance, not a random draw, and 48
   of them list a single plugin. Sample two more pages at different offsets and record the size
   distribution. **Confidence in today's distribution: low.**
2. **Grade every candidate locally, and publish nothing.** Run the marketplace scope over a clone of each.
   Classify every finding as a real defect (a plugin that would not load, a name collision, a broken
   manifest, a security screen hit that holds up on reading) or noise. The classification rule is
   committed before grading.
3. **The pre-registered demand signal.** Within 30 days of contact, any one of: an owner replies
   substantively, an owner merges a fix the toolkit found, or an owner adopts the Action.
4. **Contact, maintainer-gated.** Each contact is an issue or a pull request that fixes one real defect,
   says how it was found, and asks before anything is published. Nothing is published about any
   catalogue without its owner's consent, which is cut 5's existing rule. Cut 5's four non-code
   prerequisites in `roadmap.md` section 3 still apply.
5. **Ask the invisible market.** Private enterprise marketplaces are the most likely buyer for
   governance, and code search cannot see them. One maintainer-approved public post offering a free
   gate run for a team's internal marketplace is the cheapest probe. Replies are counted, not
   interpreted.

**The kill criterion.** If no owner shows the demand signal, and the widened sample shows multi-plugin
catalogues are rare, direction A is a niche. The toolkit then keeps marketplace scope for this
organisation's own family and stops investing in governance as a headline.

**Proposed dates:** sample widened and the classification rule committed by 2026-11-06; local grading
by 2026-11-13; contact on the maintainer's go; the window closes 30 days after contact.

## What the results decide

| Experiment B (C1) | Experiment A (cohort) | What the toolkit leads with |
|---|---|---|
| Passes | Demand shown | Both: proven builders for authors, and the gate for catalogue owners |
| Passes | No demand | Proven builders. Marketplace scope stays, without a headline |
| Fails | Demand shown | Library governance. The loop ships as regression tooling |
| Fails | No demand | Neither direction is industry-defining. The toolkit narrows to governing this family, and outward positioning stops |

The table's outcome becomes the recommendation for D-09, and with it the roadmap sequence in ADR 0066
section 4. The maintainer rules; this plan only supplies the evidence.

## What this plan does not do

- **It builds no product feature.** Experiment B is run by hand. The behaviour-loop cut waits for D-09.
- **It publishes nothing about anyone else's catalogue** without consent.
- **It sets no numeric adoption target.** ADR 0066 refuses targets before a first measurement, and this
  plan follows that.

## Risks

- **The C1 design could favour one arm by accident,** for example through brief wording. The held-out
  cases, the equal budget and committing the design first are the mitigations. An independent reviewer
  reads the pre-registration before any build starts.
- **The vendor's evaluator is model-judged.** Its `llm` and `baseline` graders are not validated against
  human labels by this project. Every result is reported as the vendor reported it, with that caveat.
- **Outreach can read as self-promotion.** Each contact leads with a fix to a real defect, never with the
  toolkit.
