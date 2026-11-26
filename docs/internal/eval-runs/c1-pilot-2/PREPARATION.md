# Experiment B2: preparation record

This file records steps 2 to 5 of section 5 of [the B2 design](../design_experiment-b2-c1-pilot-2-20261114.md), carried out on 2026-11-22. It gives counts and scores only. The held-out cases stay in the gitignored `_local/c1-pilot-2/cases/` until the last real build finishes (design section 3.2). Dollar figures are API-equivalent estimates on the maintainer's subscription.

## Step 2: the briefs

A fresh Sonnet subagent wrote three real briefs and one dry-run brief from [`brief-author-prompt.md`](brief-author-prompt.md). They are in [`briefs.md`](briefs.md). One self-contradicting sentence in brief A was reworded before any case existed, and the briefs file discloses the change.

## Step 3: the cases

Four fresh Opus subagents each wrote ten cases for one brief, from [`case-author-prompt.md`](case-author-prompt.md). That makes 30 held-out cases and 10 decoys for the dry-run brief. A mechanical check found no problems in any of the 40 cases. It covered the folder layout, the frontmatter, one-sentence graders, plain ASCII, and that no prompt names its skill.

**Departures the authors reported:**
- **Edit calls.** Three authors used Edit while drafting, which the instructions did not allow. Two of them then rewrote those files in full with Write.
- **A search of its own folder.** One author searched only its own folder, to check its work. It reports seeing no other author's files.

## Step 4: the convergence screen

- **The sessions.** There were 20 fresh Sonnet sessions with no plugin, five per brief. Each saw only one brief, and each wrote 20 practice prompts, so 400 prompts in all. They cost about $0.80.
- **Word matching first.** It flagged 22 of 40 cases, mostly on ordinary domain vocabulary and boilerplate. So section 3.5 of the design was amended to have a judge decide, with the rule chosen on experiment B's closed material.
- **The judge.** `harness/judge.mjs` judged 230 pairs, with three votes each. It called **0 of 40 cases near-copies.** No call was unusable, and no pair's votes split. It cost about $2.94.
- **A spot check.** The closest pairs were read by hand. They share only a dish, a clause type or a handover format, with different figures and names.

## Step 5: the calibration

Every real case ran with no relevant skill, with experiment B's stub plugin and command (`--ablation none --runs 3`). Brief B used the haiku agent and the others used sonnet, with a sonnet judge. No run had an error, and no suite was partial.

| Brief | Cases | Scores | At or above 0.75 | Cost |
|---|---|---|---|---|
| A `lease-clause-review` | 10 | 0.50 to 0.67 | 0 | $4.10 |
| B `shift-handover-note` | 10 | 0.50 to 0.75 | 1 (case-05) | $2.04 |
| C `customer-release-notes` | 10 | 0.25 to 0.75 | 2 (case-04, case-10) | $2.55 |

**Replacements.** The three saturated cases were moved to `_local/c1-pilot-2/replaced/`, and they are not used. One fresh Opus subagent wrote replacements from [`replacement-author-prompt.md`](replacement-author-prompt.md). Each replacement was judged once and calibrated once, as the stopping rule requires:
- **The judge:** 9 pairs, and 0 near-copies.
- **The calibration:** case-05 of brief B scored 0.50, and case-04 and case-10 of brief C scored 0.50 each. All three are below 0.75.

The run also scored three cases that were not replaced, by mistake. Their runs are extra and change nothing.

**Two format fixes by the pre-registration's author.** The prompt given to the replacement author left out the exact `prompt.md` frontmatter and the `graders/` folder. Both are in the original instructions, but they were not copied in. So the author wrote a neutral placeholder frontmatter and put the graders at the case root. The pre-registration's author replaced the frontmatter with the standard one and moved the graders into `graders/`. No text a judge or a builder reads was changed.

**All 30 real cases now score below 0.75 with no skill.** Most score exactly 0.50. That pattern fits the no-skill answer passing the two substance graders and failing the two convention graders. This is inferred from the scores, not read from the grader results.

## Steps left

Step 6 builds the provenance leak rule, with planted tests. Step 7 is the on-topic dry run in both arms, against the decoys. **It needs a fresh container sign-in,** because the stored login was removed under D2 of the design. Step 8 is the pre-registration, with the case hashes, and then review.
