# Pre-registration: experiment B, the C1 pilot, 2026-11-05

**Status: DRAFT, NOT FROZEN, NOT RUN.** This file and the held-out cases freeze when the calibration in section 4 is recorded and this file merges. Everything is committed before any real build and before any built skill has been scored. The dry run and the calibration need the maintainer's go. Merging does not authorise the real run, which needs a second go.

**Serves:** criterion C1 of [ADR 0066 (the goal is the builder whose libraries are proven to work, and "best" is measured, not claimed)](../decisions/0066-the-goal-is-the-builder-whose-libraries-are-proven-and-best-is-measured.md), through experiment B of [`plan_validate-best-in-class`](../release-plans/plan_validate-best-in-class/RELEASE-PLAN.md).

**Results will be recorded at:** `docs/internal/eval-runs/c1-pilot/results/`, with the outcome added to [`eval-runs.md`](eval-runs.md).

## 1. Why this file exists

ADR 0066 stakes the toolkit's leading claim on C1: a skill built through the toolkit beats no skill more often than one built with the vendor's skill-creator alone. C1 can fail. A rule written after the numbers are visible could not fail, so every rule below is fixed now.

**The honest prior (low confidence, inferred).** The author expects a tie or a narrow result. skill-creator already runs its own with-and-without evals and tunes the description, and the toolkit's hand-run loop does much the same. If the toolkit adds nothing, this experiment should show that.

## 2. The question

**Question.** Given the same brief, the same builder model and the same iteration budget, does the toolkit's builder plus an eval-and-improve loop produce a skill that beats no skill on more held-out cases than a skill built with skill-creator's own workflow?

**Arms.**

| Arm | What builds the skill |
|---|---|
| Toolkit | `askit-build-skill` at tag `v1.23.0`, plus a hand-run loop: write eval cases, run `claude plugin eval`, improve with `askit-build-skill` improve mode, repeat |
| skill-creator | skill-creator's own full workflow, including its benchmark and its description optimiser, at their default settings |
| No skill | The no-plugin arm that `claude plugin eval --ablation with-without` supplies |

The loop in the toolkit arm is run by hand because the behaviour-loop cut does not exist yet. This experiment tests the method, not shipped builder code.

## 3. The three briefs, verbatim

The name in each heading is the required skill name, so the two arms cannot differ by name. Each builder receives the brief's text exactly as written here. Each brief carries house conventions that a model cannot guess. A built skill can therefore add something a no-skill model lacks.

### Brief A: `migration-risk-review` (scored with the sonnet model)

> Build a skill named `migration-risk-review`. It reviews a PostgreSQL schema migration that a person pastes or describes, before the migration runs in production.
>
> House conventions the output must follow. The first line reads `Verdict: SAFE`, `Verdict: SAFE WITH CHANGES` or `Verdict: UNSAFE`. Next comes one table with the columns Statement, Lock taken, Risk, Fix, with one row per statement. After the table, a section headed `Rollback` gives the rollback statement for each change, or says `No rollback` with the reason. When the table size or traffic is not given, a section headed `Assumptions` says what was assumed, and the verdict cannot be SAFE. The review always prefers an expand-and-contract sequence over a single breaking change, and names the separate deploy steps when it recommends one.
>
> People ask for this in many ways, and often without saying "migration review". Examples are asking whether a change is safe to ship, or pasting an ALTER TABLE and asking what could go wrong.

### Brief B: `postmortem-from-notes` (scored with the haiku model)

> Build a skill named `postmortem-from-notes`. It turns rough, incomplete incident notes into a blameless postmortem. The skill will be used by a smaller model, and the inputs are usually thin.
>
> House conventions the output must follow. The sections appear in exactly this order: Summary, Impact, Timeline, Contributing factors, What went well, Actions. Summary is at most three sentences. Timeline entries are in time order and state the timezone, and if the notes do not give a timezone the Timeline says `Timezone: UNKNOWN`. People are named by role only, never by personal name, even when the notes use names. Contributing factors never blame a person. Any fact the notes do not give is written as `UNKNOWN - ask <role>`, and is never invented. Actions is a table with the columns Action, Owner role, Type, Due, where Type is one of Prevent, Detect or Mitigate, and Due is `UNKNOWN` unless the notes give a date.
>
> People ask for this in many ways, and often without saying "postmortem". Examples are pasting chat notes from an outage and asking for a write-up, or asking for an incident review from a list of events.

### Brief C: `acceptance-criteria-writer` (scored with the sonnet model)

> Build a skill named `acceptance-criteria-writer`. It turns a short feature request into testable acceptance criteria.
>
> House conventions the output must follow. Each criterion has an ID in the form `AC-1`, `AC-2`, and is written as Given, When, Then. Each criterion covers one behaviour. There are at most eight criteria, and at least one covers a failure path. The words fast, easy, simple, intuitive and user-friendly never appear in a criterion. When the request does not state a number, a limit or a rule, the skill does not invent one. It adds an entry to a section headed `Open questions` and names the criterion that depends on it. A section headed `Out of scope` lists at least one thing the criteria deliberately do not cover.
>
> People ask for this in many ways, and often without saying "acceptance criteria". Examples are asking what done means for a feature, or asking how a tester would know a request is finished.

## 4. The held-out cases

- **Count.** Ten cases per brief, in `c1-pilot/held-out/<skill-name>/case-NN/`, in the vendor's `prompt.md` plus `graders/*.md` layout.
- **Author.** A fresh subagent wrote the prompts and the four scored graders of each case, from the three briefs and the file format only. Its full instructions are committed at [`c1-pilot/case-author-prompt.md`](c1-pilot/case-author-prompt.md). No build existed, and it was told not to read anything else. The pre-registration's author added the thirty `fired.md` files later, so those instructions correctly do not mention them.
- **Scored graders.** Every case has exactly four `llm` graders of weight 1. By the author's labels two check a convention and two check substance. The review in section 13 judged nine of the "substance" graders to depend on the house format, so section 11 does not treat this as a clean half-and-half split.
- **The firing grader.** Every case also has `graders/fired.md`, of type `tool_used` with `tool: Skill`. The vendor reports it for the with-skill arm and leaves it out of the score, which was measured on 2026-11-05. It records whether the skill fired, and it never affects a win.
- **Prompts.** A prompt never names a skill or restates a convention. Two of each brief's ten prompts avoid the brief's own vocabulary, so they also test whether the description triggers.
- **Rewording before the freeze.** The pre-registration's author reworded eight brief C graders after the review in section 13. Five required two outcomes inside one criterion while the brief demands one behaviour per criterion. Three banned the word "and", which the brief does not ask for. No built skill existed at that point.

**Calibration before the freeze.** A case whose no-skill score is 0.75 or higher cannot be won under section 7, so it adds cost and no information. After the dry run in section 8, the calibration runs every case once in the same container, against a stub plugin with no relevant skill: `--ablation none --runs 3`, with the section 5 model for that brief. Any case scoring 0.75 or higher is replaced once by a fresh subagent that receives the original instructions and the reason, not the scores of other cases. Replacements are calibrated once, and a replacement still at or above 0.75 stays and is reported. The results go in `c1-pilot/calibration/`. Reading the baseline favours neither arm, because no built skill is involved.

**Frozen after that.** Once this file merges, the cases do not change. A defect found later is reported as a defect and is not fixed.

## 5. What is held constant

| Component | Pinned to |
|---|---|
| Environment | A fresh `node:24` Linux container under podman, for every build and every scoring suite. It has no personal Claude configuration, and it mounts only its own working folder and its arm's plugin, read-only. **Amended 2026-11-10 by a dry-run harness fix:** the plugin is mounted as an overlay, so a build can write inside it, and the writes go to a throwaway layer discarded with the container. The plugin on disk never changes. skill-creator's optimiser writes inside its own folder and failed silently on a read-only mount. The maintainer provides the sign-in at run time. The image must carry Python 3, because skill-creator's scripts are Python, and the dry run verifies that |
| Claude Code | `@anthropic-ai/claude-code@2.1.318`, installed by exact version in the container, with `DISABLE_AUTOUPDATER=1` |
| Toolkit | Tag `v1.23.0`, commit `eb6bfc3`, exported with `git archive` and without `docs/internal/` and `tests/`, so a builder cannot read the plan or the ADR |
| skill-creator | `anthropic-agent-skills/document-skills`, version `ca45fc496a34`, the one `installed_plugins.json` marks as installed on 2026-11-05. The arm receives a wrapper plugin holding only `skills/skill-creator/`, not the whole document plugin |
| Builder model | `sonnet`, in both arms and for all three briefs. Inner loops also use `sonnet` in both arms, so neither arm tunes against brief B's scoring model |
| Agent under test | `--model sonnet` for briefs A and C, and `--model haiku` for brief B, which is the thin-input and smaller-model case the plan requires |
| Judge model | `--judge-model sonnet` for every suite, because a haiku judge would match brief B's agent under test |
| Scoring command | `claude plugin eval . --ablation with-without --runs 3 --model <m> --judge-model sonnet --threshold 0 -j 4 --no-publish --trust-plugin --max-cost-usd 15 --output-dir <dir> --json <file>` |
| Scoring plugin | One identical wrapper for every built skill: the same `plugin.json`, the name `c1-pilot`, and only that skill's own folder under `skills/`. Nothing else from the build is copied. Its `evals/` folder holds only that brief's ten cases, because the tool warns when case names repeat across briefs |

**Why Linux.** skill-creator's description optimiser polls a pipe with `select.select`. On Windows that call raises `OSError`, which was reproduced on 2026-11-05. The optimiser's `run_eval.py` catches the error and records "not triggered", so on Windows it would rewrite descriptions against noise without reporting a failure. A container should also keep the maintainer's rules, skills and connectors out of a build and keep this repository unreadable from disk. Both are inferred from what is mounted, and the dry run checks them.

`--no-publish` is required, because the command otherwise publishes its HTML report to claude.ai. `--threshold 0` stops a low score from reading as a tool failure.

## 6. The iteration budget and how builders run

**Each build runs in its own container, in an otherwise empty working folder.** The folder starts with one identical `.claude-plugin/plugin.json`, named `c1-build`:

```
claude -p --plugin-dir /plugin --model sonnet --max-budget-usd 15 --no-session-persistence --output-format stream-json --verbose --disallowed-tools WebFetch WebSearch --allowed-tools Read Write Edit Glob Grep Bash Skill Agent
```

**One iteration, in both arms,** is one pass of: run the arm's own test cases with and without the skill, read the results, and edit the skill. Each arm gets the first draft plus at most **three** iterations and at most **five** of its own test cases. An arm may stop early. Tokens, spend, wall-clock time and iterations used are recorded per build, including spend in nested tools.

**The text every builder receives, after its brief:**

> No human is available. Make reasonable decisions and do not ask questions. The working directory already holds `.claude-plugin/plugin.json`. Put the finished skill in `./skills/<name>/`. Write at most five test cases of your own. Do at most three improvement iterations. One iteration is one pass of running your test cases with and without the skill, reading the results, and editing the skill. Stop when you are done or the iterations are used.

**Then the toolkit arm's instruction:**

> Use the `askit-build-skill` skill in create mode to author the skill. The toolkit is mounted at `/plugin`, so where a skill says `node scripts/...`, run `node /plugin/scripts/...`. Write your test cases under `./evals/` in the layout `claude plugin eval` expects. For each iteration, run `claude plugin eval . --ablation with-without --runs 3 --model sonnet --judge-model sonnet --threshold 0 --no-publish --trust-plugin --max-cost-usd 5`, and use `askit-build-skill` improve mode together with those results to improve the skill.

**Then the skill-creator arm's instruction:**

> Use the `skill-creator` skill's full workflow to create the skill, including its benchmark and its description optimiser, at their default settings. Use the model `sonnet` wherever the workflow asks for a model. Where it asks for human review, carry on using your own judgment. The optimiser's own queries and rounds do not count against the limits above.

**Build order.** The toolkit arm builds first on briefs A and C, and skill-creator builds first on brief B.

**The build record.** A transcript must show that the arm's method ran. For the toolkit arm: `askit-build-skill` was invoked, and at least one nested `claude plugin eval` finished. For the skill-creator arm: `skill-creator` was invoked, at least one benchmark finished, and the optimiser finished. A build missing any of these is rebuilt once in a new container. A second miss is a failed build. The record also counts how often the toolkit arm invoked improve mode. A count of zero does not invalidate the build, but the outcome must label that brief "create-only", because the toolkit's improve mode then played no part.

## 7. The pass rule

All numbers come from `aggregate-result.json`, read from each suite's `--output-dir`. The rule is computed by a scorer that is written and committed before any build.

- **The pooled baseline.** Each build arm's suite samples its own no-skill arm, so one lucky sample could decide a case. For each case, the baseline is the mean of `cases[].aggregates.scoreWithout` across the two build arms' suites.
- **A case win.** A built skill wins a case when `cases[].aggregates.score` minus the pooled baseline is greater than **0.25**. Scores are exact multiples of 1/12 and the pooled baseline of 1/24, so the scorer compares exact fractions and not floating-point numbers.
- **Why 0.25.** The vendor's score for a run is the fraction of scored graders that passed, measured on 2026-11-05. Convention graders pass or fail together when a skill fires. So one fired run in three moves a score by about 0.17 on a case where a no-skill model fails two conventions. A threshold below that would measure firing once, not doing the job reliably. This reasoning and a toy simulation, committed at [`c1-pilot/threshold-simulation.mjs`](c1-pilot/threshold-simulation.mjs), chose the value, and no experiment data did. The simulation's probabilities are assumed.
- **A valid case.** A case is valid when every run in both arms of both suites has `error: null`, neither suite has `partial: true`, and the pooled baseline is below 0.75. A baseline of 0.75 or more makes the case unwinnable, so a brief full of such cases is an instrument failure and not a tie. An invalid case is removed from both arms' counts for that brief, and it never counts as a loss.
- **A valid brief.** A brief is valid when both arms have a finished skill and at least eight of its ten cases are valid. A failed or empty build in either arm invalidates the brief, so a broken arm can never hand the other arm a walkover.
- **A brief win.** An arm wins a valid brief when its case wins are **at least two more** than the other arm's. Anything else is a tie.
- **The pass rule.** C1 passes when the toolkit arm wins **at least two of the three briefs**.

**One deliberate tightening of the plan.** The plan's sketch said "more held-out cases", so 1 against 0 would have counted as a win. Three runs per case cannot support a claim that thin, so the margin is two. This makes a pass harder for the arm the author has a stake in.

**Reported but never decisive:** the mean delta per skill against the pooled baseline, the firing rate per skill, the direct with-skill scores of the two arms, the score of the no-skill arm, each built skill's `node scripts/evaluate.mjs` grade, and build cost and tokens.

## 8. The run order and the checks inside it

1. **Maintainer's go for the dry run and the calibration.** Nothing below starts without it.
2. **Set up.** Build the container image and record the versions. Export both plugins. Write the scorer from section 7 and commit it, with a test on synthetic input.
3. **Dry run.** Build one throwaway skill in each arm from a harness-only brief: "Build a skill named `standup-summary` that turns a person's rough notes into a three-line standup update." Use the real ceilings from section 10, so the measured cost is not cut short. The run must show that the sign-in works, that nested `claude plugin eval` works inside a build, that `--ablation none` works, that the toolkit's commands work outside its repository, that the optimiser reports real triggering, and that a build can read neither the maintainer's configuration nor this repository from disk. Harness faults found here may be fixed, and the fix is recorded. Nothing in sections 3 or 7 may change.
4. **Calibration.** Run section 4's calibration and record it.
5. **Freeze.** Merge this file. Its status changes to PRE-REGISTERED in that merge.
6. **Maintainer's go for the run,** given the dry run's measured build cost.
7. **Build.** Run all six builds in the order section 6 fixes, and check each build record.
8. **Leak check.** The repository is not mounted, but `Bash` can probably reach the public internet (inferred), and these files are public once merged. A hit is this file's name, a verbatim run of eight or more words from one held-out prompt, or three distinct tokens from one held-out case. A token is a word that appears in that case's prompt and nowhere in the briefs, such as a specific table name. The scorer searches each transcript and built skill. A hit voids that build, which is rebuilt once in a new container. A second hit is a failed build.
9. **Shakedown.** Score the first case of brief A for both arms. Section 10 says what happens on failure.
10. **Score.** Run the six suites. Do not read any score until all six have finished, apart from the shakedown's own validity.
11. **Record.** Run the scorer. Commit the results, the built skills and the outcome before any interpretation is written.

## 9. Outcomes and consequences, fixed in advance

**R1: C1 passes.** The toolkit arm wins at least two briefs. C1 is recorded as passed, with these numbers, and the record names any invalid third brief and any "create-only" brief. The recommendation to the maintainer is that the behaviour-loop cut proceeds as the toolkit's headline and the claim is published together with this file. Publishing stays the maintainer's ruling.

**R2: C1 fails.** At least two briefs are valid and the toolkit arm wins at most one. C1 is recorded as failed, with these numbers. The plan's kill criterion applies: the behaviour-loop cut is demoted to regression tooling, and the toolkit does not claim better builders. This is the expected outcome if the two arms tie. If skill-creator wins at least two briefs, the record says so plainly. A "create-only" brief is named here too.

**R3: void.** Fewer than two briefs are valid. This is an instrument finding, not a skill finding. C1 stays recorded as not measured, and no claim is made. **Do not re-run with a modified instrument.** Tuning the briefs, cases or thresholds until a gap opens is fishing. A new pilot needs a new pre-registration with new briefs, and the maintainer's ruling.

**R4: a built skill loses to no skill.** This applies when a built skill's mean delta is at or below zero on a valid brief, and it can occur alongside R1, R2 or R3. It is recorded as a finding about that arm on that brief. In the toolkit arm it becomes a backlog entry.

Changing the goal in ADR 0066 itself would take a new ADR, whatever the outcome.

## 10. The abort path and cost ceilings

**Abort path.** If the shakedown does not return a valid result, re-launch it once, unmodified. If it fails again, stop and record an infrastructure void under R3. Do not change the instrument to make it pass. A failure of nested eval or of the optimiser during a real build is handled by the build record in section 6.

**What the cost is based on, measured 2026-11-05 on throwaway cases on Windows.**

| Throwaway case, six runs in total | Cost the tool reported | Wall-clock, one at a time |
|---|---|---|
| One-line prompt, one grader | $0.15 | 78 s |
| Realistic prompt, four graders, sonnet agent and judge | $0.50 | 378 s |

Scoring is 60 of those case units, three briefs by two arms by ten cases, which is the plan's 360 sessions. From the realistic row that gives about **$30**, and about 6.3 hours one at a time or roughly 1.6 hours at `-j 4` (medium confidence). A skill that loads extra files should cost more, so the working range is **$30 to $60** (low confidence, inferred). Brief B's haiku agent should cost less. The calibration is one arm of three runs on 30 cases, about **$7.50** and about 1.6 hours one at a time from the same row (medium confidence). Replacement cases add to that.

**Build cost is not measured,** which is why the dry run exists. `--max-budget-usd 15` caps each build session and `--max-cost-usd 15` caps each scoring suite. That comes to $90 in total for the six builds and $90 in total for the six suites, and the dry run's two builds add up to $30. Neither cap covers nested work: each nested eval carries its own `--max-cost-usd 5`, and the optimiser's child sessions have no ceiling at their default settings. Whether these figures are real charges on the maintainer's sign-in, or only API-equivalent estimates, is not known.

**A hit ceiling.** A suite that stops at its ceiling has `partial: true`, so its cases are invalid and its brief goes down that path. It is not re-run with a higher ceiling without the maintainer's ruling. A higher ceiling changes the spend and not what is measured, so it is not the modified instrument that R3 forbids. A build that hits its ceiling submits whatever is in `./skills/<name>/`, subject to the build record.

**A dated constraint.** On 2026-11-05 the CLI warned that the current sign-in ends between 2026-11-11 and 2026-11-14. The maintainer's sign-in for the container must outlast the run.

## 11. What this measurement cannot show

1. **Three briefs and three runs per case are a small sample.** A pass is evidence for this method on these briefs, not proof about builders in general.
2. **The judge is a model.** The vendor's `llm` graders are not validated against human labels by this project. Results are reported as the vendor reported them.
3. **Rubric circularity.** Many scored graders check house conventions the briefs state, so a skill that copies its brief scores well. This is close to what skills are for, but it bounds what a win means.
4. **Authorship.** The briefs were written by an agent working for the toolkit's maintainer, an agent wrote the cases, and that same maintainer's agent reworded eight of them. None of them is a disinterested person.
5. **No human in either build.** skill-creator is designed around a person reviewing outputs, and this design removes that person. That may understate skill-creator in normal use. The toolkit arm's loop is also a hand-run stand-in for code that does not exist yet.
6. **Attribution.** `askit-build-skill` improve mode at this tag has no step that reads eval results. The instruction in section 6 supplies that link, and the toolkit arm iterates on the same tool that scores it. A pass credits the toolkit composed with the vendor's tool, which is what ADR 0066 proposes, and not the toolkit alone.
7. **One coincidence favours the toolkit arm on brief B.** `askit-build-skill` ships `examples/golden-2-incident-postmortem.md`, on brief B's topic. Brief B was written without knowing this, and the example is a real part of the toolkit, so it stays. Brief B's result is read with that in mind.
8. **A void can hide a loss.** R1 is reachable with the third brief invalid, which is why R1's record must name it.
9. **Over-triggering is not measured.** Every held-out case is on target, so a skill that fires too often pays no penalty.
10. **Claude only, one builder model.** `claude plugin eval` is Claude-only, so this says nothing about Codex, as ADR 0066 already records.

## 12. Recording obligation

The run commits, under `c1-pilot/results/`: every `aggregate-result.json`, every `--json` file, all six built skills, the build records, and the scorer's output. Transcripts stay in `_local/`, because they can carry machine paths. Vendor traces are deleted when a run ends (seen on 2026-11-05), which is why the `--json` file is kept.

## 13. Review record

An independent review on the Opus model read this file's first draft and all 30 cases on 2026-11-05, and its verdict was not to freeze. The author reproduced its main claims before acting on them. These changes followed:

| Finding | Change |
|---|---|
| The optimiser fails silently on Windows | All builds and scoring run in a Linux container (section 5) |
| The leak check would void every build and miss real leaks | Do not mount the repository (section 5), and search for case-unique material (section 8) |
| A broken arm could hand the other arm a walkover | A failed build invalidates the brief, and a build record is required (sections 6 and 7) |
| A 0.10 threshold measures firing once, not reliable quality | Threshold raised to 0.25 (section 7) |
| Separate no-skill arms add noise | Pooled baseline (section 7) |
| The budget conflicted with the optimiser, and nested evals had no model | Optimiser exempted, inner loops pinned to sonnet, all spend recorded (sections 5 and 6) |
| Firing was never recorded | A firing grader on every case (section 4) |
| Eight brief C graders conflicted with the brief | Reworded (section 4) |
| The shakedown came after all builds | A dry run comes first (section 8) |
| Many graders may not discriminate | Calibration before the freeze (section 4) |
| R1 published automatically | Publishing is the maintainer's ruling (section 9) |

A second review, on the Sonnet model, then read the rewritten text for what the fixes had broken. Its verdict was that the fixes mostly held and six more changes were needed. Calibration had no place in the run order, so it now follows the dry run and precedes the freeze. Cases with a pooled baseline of 0.75 or more are now invalid, so a saturated brief cannot read as a tie. The leak check no longer fires on one common word. A build with no improve-mode use is now labelled "create-only". The dry run now uses the real ceilings, so its cost is not cut short. The origin of `fired.md` is now disclosed. Its smaller corrections were also applied.
