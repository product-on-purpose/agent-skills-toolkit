# Experiment B2 (the second C1 pilot): draft design

**Status: APPROVED DESIGN, 2026-11-22. Not pre-registered, and nothing in it has run.** On 2026-11-17 the maintainer ruled D1 and D2 as recommended, and D3 as (b). On 2026-11-22 the maintainer approved the design as a whole, so section 5 step 2 can start. This file plans a replacement for experiment B, whose outcome was R3 (void): see [the experiment B outcome](c1-pilot/results/OUTCOME.md). It is not the pre-registration. Experiment B2 freezes only when a separate pre-registration file, written from this design after the maintainer rules on it, merges. Merging this file freezes nothing, and its pull request stays a draft until the maintainer rules.

## 1. Why a second pilot

Experiment B was the first measurement of C1 under [ADR 0066 (the goal is the builder whose libraries are proven to work, and "best" is measured, not claimed)](../decisions/0066-the-goal-is-the-builder-whose-libraries-are-proven-and-best-is-measured.md). It produced no measurement. Its leak check failed skill-creator's builds on two of the three briefs, and every one of the 11 hits turned out to be text the builder wrote itself. The held-out cases and the builders came from the same model family, so both converged on the same textbook examples.

Section 9 of [experiment B's pre-registration](prereg_experiment-b-c1-pilot-20261105.md) forbids re-running with a modified instrument. It also says a new pilot needs a new pre-registration, new briefs and the maintainer's ruling. This design is the first step of that.

The goal of experiment B2 is the same question, measured by an instrument built so that it does not fail the way experiment B's did. One piece of evidence for that exists already: replayed on experiment B's nine recorded build attempts, the leak rule drafted in 3.3 gives no hits, where experiment B's rule voided two briefs (measured; see [the outcome record](c1-pilot/results/OUTCOME.md)). That shows the rule is quiet on these builds, not that it is quiet on every build, which is why 3.4 still requires an on-topic dry run. **The design changes only what experiment B's findings justify.** Sections 3.1 to 3.6 answer its instrument finding. Section 3.7 answers one method finding: no toolkit build used improve mode. Every other rule carries over unchanged, so that a reader can compare the two and see that nothing was tuned toward a result.

## 2. What stays identical to experiment B

Two rows below change in one respect, which section 3.7 sets out: the toolkit arm's build instruction, and what counts as the toolkit's method under the rebuild rule. Everything else in the table is kept exactly.

| Element | Experiment B's setting, kept as it was |
|---|---|
| The question | Does the toolkit's builder plus an eval-and-improve loop produce skills that beat no skill more often than skill-creator does, given the same brief, model and budget? |
| Arms | `toolkit` (`askit-build-skill` plus nested `claude plugin eval`) and `skill-creator` (its full workflow, including the optimiser). The no-skill baseline comes from `--ablation with-without` |
| Builder model and container | `claude-sonnet-5-5`, one fresh podman container per build, with the plugin mounted as an overlay |
| Build budget | The $25 harness stop per build. Dollar figures are API-equivalent estimates |
| Build order rule | The arm that builds first alternates across briefs |
| Scoring | `claude plugin eval --ablation with-without --runs 3`, a sonnet judge, and the same agent-model rule: haiku for the one brief aimed at a smaller model, sonnet for the others |
| Calibration | Each case runs with no relevant skill before the freeze, and a case with a no-skill score of 0.75 or more is replaced |
| Pass rule | A case win needs a margin above 0.25. A valid brief needs at least eight valid cases. A brief win needs at least two more case wins than the other arm. C1 passes when the toolkit wins at least two of the three briefs |
| Outcomes | R1 passes, R2 fails, R3 void, R4 a built skill loses to no skill, with the same consequences |
| Rebuild rule | A build whose method did not run, or that has a leak hit, is rebuilt once. A second miss is a failed build, and a failed build invalidates its brief |

## 3. What changes, and why

Each change is tied to something experiment B measured.

### 3.1 Three new briefs

**Why:** R3 requires new briefs. Brief C (`acceptance-criteria-writer`) was valid in experiment B, but its two skills were built and committed, so reusing it would let anyone tune on them.

**How:** a fresh subagent writes three briefs from the plan's criteria alone, without seeing experiment B's built skills or transcripts. At least one brief keeps the plan's requirement: a task where templates matter for a smaller model with thin inputs. The briefs are quoted verbatim in the pre-registration, as before.

### 3.2 Keep the held-out cases private until the last build finishes

**Why:** experiment B's cases became public on GitHub 16 seconds before the first build started, because merging the pre-registration published them. Experiment B detected access after the fact. It is stronger to remove the access path.

**How:** the cases and the leak check's token file live in the gitignored `_local/` area until the sixth build ends. At the freeze, the pre-registration commits a SHA-256 hash of each case file and of the token file. After the last build, the files are committed, and anyone can check them against the hashes. The maintainer reads the cases locally before the freeze, so the review still happens. Calibration runs on the local copies.

### 3.3 A leak rule based on where text came from, not on shared words

**Why:** experiment B's rule fired whenever a build's text shared an 8-word run or three distinctive tokens with a case. It could not tell copying from convergence. It fell almost entirely on skill-creator, which writes 8 to 17 times as much text per build.

**How:** a hit is held-out case material (an 8-word run, or three of a case's distinctive tokens, as before) whose earliest appearance in any of the build's transcripts is one of these:

- a tool result, meaning a file the build read or a command's output;
- the opening prompt of a session the harness did not write.

Text the model wrote first, including nested prompts built from it, is convergence. It is recorded under 3.5 and is not a hit. Separately, any tool call that uses a network client (curl, wget, git fetch, gh, npm, pip, an HTTP library or a web tool) is a hit, whatever it fetched. The harness's own `claude` processes are not tool calls, so they are not counted.

**Incomplete transcripts:** skill-creator's optimiser kills its child sessions early, so their transcripts keep the prompt but not the answer. A child prompt counts as authored only if the parent transcript shows the parent writing that text first. Evidence whose origin cannot be resolved counts as a hit. That keeps the rule conservative, and section 3.4 checks that this fallback does not fire on clean builds.

**Proof both ways, before the freeze:**

- A scripted build that reads a planted copy of a case from its work folder must be caught.
- A scripted build that runs a network command must be caught.
- The on-topic dry run in 3.4 must give no hits in either arm.

Experiment B's `harness/leak-replay.mjs` already implements this rule as its "provenance" replay. It orders every entry across all of a build's transcripts by timestamp, and it counts unresolved evidence as a hit, as above. It has tests that plant a model-written copy and a read copy. Experiment B's `harness/leak-trace.mjs` is descriptive only: it reports unresolved evidence as "no access", so it must not be used as the rule. B2 makes the replay's provenance rule the leak check, adds the planted network call, and widens the network pattern, which a pattern search cannot make complete.

### 3.4 An on-topic dry run with decoy cases

**Why:** experiment B's dry run used an unrelated brief, `standup-summary`. So its clean leak result showed only that an off-topic build stays clean. Nothing tested a build working on the same topic as its cases.

**How:** the dry run uses a fourth brief of the same kind as the real ones. It has its own set of ten decoy cases, written by the same author and the same process as the real cases. One build in each arm runs against it, and the leak check and the convergence measure run against the decoys. The dry-run builds and decoys are then discarded. This shows the instrument behaving on realistic text before anything real runs.

### 3.5 Measure convergence, and screen it out before the freeze

**Why:** convergence is a validity limit even without access. A builder that writes near-copies of the test is partly tuned on the test.

**How, before the freeze (a screen):**

1. For each brief, fresh sessions run with no plugin, so that neither arm's method is involved. Each session is given only the brief, and asked to write practice prompts for testing the skill. The number of sessions and prompts is fixed in the pre-registration, for example 5 sessions of 20 prompts.
2. Any held-out case whose 8-word runs or distinctive tokens recur in that output is replaced by the replacement-author process from experiment B.
3. The replacements are then screened again before calibration.

**Amended 2026-11-22, after the first screen and before any replacement or build.** Word matching could not separate a reinvented case from ordinary vocabulary or boilerplate, so the screen's rule changed. The new rule was chosen on closed material, meaning experiment B's builds and cases, whose outcome can no longer move, and then applied unchanged to experiment B2.

- **The unit is one practice prompt,** compared only with its own brief's cases. The first match compared a whole session of 20 prompts, so three words from three different prompts could add up to a hit.
- **What word matching measured.** On experiment B's 65 practice prompts against its 30 cases, four pairs were labelled near-copies by reading.
  - An 8-word run caught 1 of the 4.
  - A 5-word run caught all 4, with 15 false alarms, mostly phrases taken from the brief's own examples.
  - A 6-word run caught 3 of the 4, with 1 false alarm.
  - On experiment B2's screen, distinctive tokens flagged 22 of 40 cases, mostly with ordinary domain words. Phrase runs flagged legal boilerplate.
  - Some convergence was real: one case's invented reference number recurred in two of the five sessions for its brief.
- **A judge decides a near-copy.** `harness/judge.mjs` sends a Sonnet judge each case's prompt and substance graders, beside each candidate practice prompt.
  - The candidates are the three closest prompts by shared content words, plus every prompt that shares a 5-word run with the case.
  - A near-copy is the same specific situation, so that the case's substance graders would apply to it nearly unchanged. A prompt about a different table, system, person or set of figures is different. A prompt that contains the case's situation inside a larger one is a near-copy.
  - Each pair is judged three times, and the majority decides.
- **The judge was proven before use.** It judged 100 of experiment B's pairs.
  - It called none of the 96 pairs labelled different a near-copy.
  - It caught both clear near-copies.
  - It called the two borderline labels different, with reasons that hold up. One drops the same column from a different table, and the other shares one of three statements.
  - No pair's three votes split.
  - The definition was sharpened twice on this material. Tuning stopped at that point, because four labels cannot support more.
- **A stopping rule.** There is one round of replacement. Replacements are judged once, against the same 400 screen prompts. A replacement still judged a near-copy stays, and the pre-registration reports it.
- **What the replacement author sees.** It gets experiment B's replacement instructions and the reason for the replacement. It also gets that brief's screen prompts, as examples already invented and to be avoided. The screen prompts were written without seeing any case.
- **Decoys are judged but never replaced.** The on-topic dry run in 3.4 needs material where the covariate is known to fire.
- **Replaced cases are kept** in the local area. They are never used.
- **Nothing from a held-out case goes in a tracked file,** a commit message or PR text before section 3.2 allows it. Records give counts only.

**How, during the run (a covariate):** every build's practice prompts are judged against the cases in the same way, with `harness/judge.mjs`. The record reports, per build, how many cases it converged on. This never voids a build. The primary result uses all valid cases. A secondary result drops every case that any build converged on, and it is reported beside the primary, never instead of it. If the two disagree on any brief's winner, the outcome says so plainly.

### 3.6 Cases written to resist invention

**Why:** the cases used the canonical examples a model reaches for first, such as widening `payments.amount` to `bigint`.

**How:** the case author's instructions ask for situated material: invented but specific systems, names, numbers and constraints, never the first example a textbook would give. The case author runs on Opus, not Sonnet, to put some distance between author and builders. Sharing a model family still allows convergence, so the screen in 3.5 is what enforces this, not the instruction.

### 3.7 The toolkit arm must use improve mode (ruled D1 (b), 2026-11-17)

**Why:** all four toolkit builds in experiment B used `askit-build-skill` in create mode only. So the toolkit arm measured create mode plus hand edits, not the eval-and-improve loop that ADR 0066's leading claim is about. skill-creator's arm already had to run its full loop, including the optimiser.

**How:** the toolkit arm's build instruction requires at least one `askit-build-skill` improve-mode call after the first nested `claude plugin eval`. A build without one has not run its method. Under the rebuild rule in section 2, it is rebuilt once, and a second miss is a failed build. The "create-only" label from experiment B is retired, because no valid toolkit build can be create-only.

## 4. Decisions for the maintainer

**Rulings, 2026-11-17.**

- **D1: (b).** The toolkit arm must use improve mode. Section 3.7 carries it.
- **D2: (a), carried out in part.** The stored login's podman volume, `c1-pilot-login`, was removed on 2026-11-17. The sign-ins themselves stay valid until the maintainer revokes them on claude.ai. A fresh sign-in is needed when experiment B2 runs.
- **D3: (b).** The maintainer left this one to the agent's judgment, and the agent recommended (b). The behaviour-loop cut proceeds now as regression tooling, and experiment B2 decides whether it becomes the headline. The reasons:
  - The kill criterion in `plan_validate-best-in-class` demotes the cut to regression tooling if C1 fails. So regression tooling is the cut's floor in every outcome, and building it now wastes no work.
  - Experiment B2 is weeks from a run, and criteria C2 to C4 do not depend on C1.
  - **Condition:** if any behaviour-loop code ships before experiment B2 freezes, the pre-registration pins the exact toolkit commit that the toolkit arm builds with. The arm then tests shipped code, not a method run by hand.
  - **Claim discipline:** until experiment B2 records R1, nothing says the toolkit builds better skills than skill-creator. The cut ships as regression tooling only.
- **The design as a whole: approved 2026-11-22.** The maintainer said "Yes continue" to approving it and starting the briefs and cases.

The table below keeps the options as they were offered.

| Decision | Options | Recommendation |
|---|---|---|
| **D1. Must the toolkit arm use improve mode?** All four toolkit builds in experiment B used create mode only, so `askit-build-skill` improve mode played no part, and every toolkit brief would have been labelled "create-only" | (a) Keep experiment B's rule: improve mode is optional, and a build without it is labelled "create-only". (b) The build instruction requires at least one improve-mode call after the first nested eval. A build without one has not run its method, and is rebuilt once | **(b).** ADR 0066's leading claim is about the eval-and-improve loop. Under (a), the pilot measures create mode plus hand edits, which is not that claim. skill-creator's arm already must run its full loop, so (b) holds both arms to their own method |
| **D2. When should the container login be removed?** A build's shell could read the stored login. It expires 2026-12-10 | (a) Remove it now, and sign in again when experiment B2 runs. (b) Keep it until experiment B2 runs | **(a).** B2 needs briefs, cases, a screen, calibration and a review first, so it is weeks away. A fresh sign-in takes one command |
| **D3. Does the behaviour-loop cut wait for experiment B2?** The release plan's decision table has no row for a void | (a) It waits for experiment B2. (b) It proceeds as regression tooling now, and B2 decides whether it becomes the headline | No recommendation. This is a roadmap ruling, and experiment B gave no evidence either way |

## 5. The path to a run

1. **The maintainer rules on this design** and on D1 to D3. Done: D1 to D3 on 2026-11-17, and the design on 2026-11-22 (section 4).
2. **Write the briefs:** three real briefs and one dry-run brief, by a fresh subagent (3.1, 3.4).
3. **Write the cases** on Opus: ten per real brief, plus ten decoys for the dry-run brief. They are stored locally only (3.2, 3.6).
4. **Run the convergence screen** and the replacements (3.5).
5. **Run the calibration**, followed by its replacements, which are screened again.
6. **Build the leak rule** from 3.3, with tests, including the planted read and the planted network call.
7. **Run the on-topic dry run** in both arms, against the decoys (3.4).
8. **Write the pre-registration** from this design, with the hashes. It goes to the maintainer for review, and adversarial review as experiment B had.
9. **The maintainer's go,** then the freeze by merge, then the run in experiment B's order: builds, leak check, shakedown, six suites, scoring, and the record.

**Rough cost, API-equivalent:**

| Stage | Estimate | Confidence |
|---|---|---|
| Builds, by experiment B's measured $104 for nine attempts | $70 to $110 | Low |
| Suites, by experiment B's pre-registered estimate | $30 to $60 | Low |
| Screen, calibration and dry run | $25 to $45 | Low |

On the maintainer's subscription, usage limits are the real constraint, not dollars.

## 6. What experiment B2 still cannot show

Experiment B's list in section 11 of its pre-registration carries over: a small sample, a model judge, rubric circularity, authorship by the maintainer's agents, no human in either build, the attribution limit, unmeasured over-triggering, and Claude only. Experiment B2 adds one item. **Convergence is reduced, not removed:** the screen catches what a no-plugin model writes from the brief alone, and a builder that iterates may still drift toward a case. The covariate in 3.5 reports that, and the secondary result shows whether it mattered.
