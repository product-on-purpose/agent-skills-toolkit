# Experiment B (the C1 pilot): outcome

**Outcome: R3, void. C1 is not measured, and no claim is made.** Recorded 2026-11-14 under the rules frozen when PR #400 (experiment B pre-registration) merged as `ec57500`. No scoring suite ran, and no score exists.

The rules are in [the pre-registration](../../prereg_experiment-b-c1-pilot-20261105.md). Part 1 explains the experiment and its result in plain English. Part 2 gives the technical record.

---

## Part 1: in plain English

### What the experiment asked

This toolkit claims it can help people build better skills. A skill is a set of instructions that teaches Claude to do one job well. [ADR 0066 (the goal is the builder whose libraries are proven to work, and "best" is measured, not claimed)](../../../decisions/0066-the-goal-is-the-builder-whose-libraries-are-proven-and-best-is-measured.md) says that claim has to be measured. Experiment B was the first measurement. It compared this toolkit with skill-creator, which is Anthropic's own tool for building skills.

### How it worked

Both tools got the same three jobs. Each job was a short request to build one skill:

- a skill that reviews a database change and says how risky it is,
- a skill that turns rough incident notes into a written postmortem,
- a skill that writes acceptance criteria for a feature request.

Each tool built each skill on its own, inside a sealed container, using its own method. Afterwards, every finished skill would be tested on ten hidden practice problems for its job. The tests compare Claude's answers with the skill and without it. The tool whose skills helped more, on more jobs, would win.

All the rules were written down and locked before anything ran. They covered how the winner is decided and what each possible result means. Locking them first means nobody can bend the rules after seeing which tool is ahead.

### The safety check that decided the result

A skill could cheat if its builder saw the hidden problems, because the builder could then tune the skill to them. So the rules included a check that searched everything each build wrote for material copied from the hidden problems. A build that failed the check was redone once. A build that failed twice counted as a failed build. A job with a failed build in either tool was dropped, so that one tool breaking could never hand the other a free win. If fewer than two jobs survived, the result would be void.

### What happened

The check failed skill-creator on two of the three jobs, twice each. Those two jobs were dropped. One job is not enough to decide anything, so the experiment is void. That is not a loss for either tool, and it is not a win. The experiment simply did not measure what it set out to measure.

### Why the check was wrong

Every flag was traced back to its source, all eleven of them. skill-creator never saw the hidden problems. The files were never in any container. No build fetched anything from the internet with its own tools. Every flagged phrase was text the builder wrote itself, usually while inventing its own practice examples.

The flags came from one part of the check: the part that looks for a few distinctive words from a hidden problem. The other part, which looks for a long phrase copied word for word, would not have thrown out any job on its own.

The cause is simpler than cheating. The hidden problems were written by the same AI model that does the building. When it invents an example database change, it reaches for the same textbook examples both times. skill-creator writes 8 to 17 times as much text as the toolkit while it works, so it hit those shared examples far more often. The check could not tell "copied" from "thought of the same thing". So it fell almost entirely on one tool.

The practice run before the experiment did not catch this. That run used an unrelated job, so the check never saw a build working on the same topic as the hidden problems.

### What this result means

- It says nothing about which tool builds better skills.
- It shows that this way of writing hidden test problems is flawed. When the same model writes the test and does the building, a builder can produce near-copies of the test without ever seeing it. That makes cheating impossible to detect by matching words, and it partly tunes the builder on the test even when nothing was copied.
- The locked rules forbid fixing the check and running this experiment again. A new experiment needs new jobs, new rules written before it starts, and the maintainer's approval. That new experiment is being planned.

---

## Part 2: technical record

### Design, as pre-registered

| Element | Setting |
|---|---|
| Question | Does the toolkit's builder plus an eval-and-improve loop produce skills that beat no skill more often than skill-creator does, given the same brief, model and budget? |
| Arms | `toolkit`: `askit-build-skill` plus nested `claude plugin eval` runs. `skill-creator`: its full workflow, including benchmarks and the description optimiser. The no-skill baseline comes from the vendor's `--ablation with-without` |
| Briefs | A `migration-risk-review`, B `postmortem-from-notes`, C `acceptance-criteria-writer`, quoted verbatim in section 3 |
| Builder model | `claude-sonnet-5-5` in both arms, in a fresh `node:24` podman container per build (section 5, with the overlay-mount amendment dated 2026-11-10) |
| Build order | A toolkit, A skill-creator, B skill-creator, B toolkit, C toolkit, C skill-creator (section 6) |
| Held-out cases | Ten per brief, written on 2026-11-05 by a Sonnet subagent that saw neither build. Six were replaced after calibration on 2026-11-10 |
| Scoring | `claude plugin eval --ablation with-without --runs 3`, with a sonnet agent for briefs A and C, a haiku agent for brief B, and a sonnet judge |
| Pass rule | A case win needs a margin above 0.25. A brief win needs at least two more case wins than the other arm. C1 passes when the toolkit wins at least two of the three briefs (section 7) |
| Outcomes | R1 passes, R2 fails, R3 void when fewer than two briefs are valid, and R4 when a built skill loses to no skill (section 9) |

### Timeline, 2026-11-14 (UTC)

| Time | Event |
|---|---|
| 07:02:57 | PR #400 merged as `ec57500`. The pre-registration and the held-out cases froze, and became public on GitHub |
| 07:03:13 | First build started |
| 15:40:46 | Sixth build finished |

### The builds

Dollar figures are API-equivalent estimates from the build records. The builds ran on the maintainer's subscription login, so they are not known to be charges.

| Build attempt | Method ran | Leak-check result | Verdict | Cost | Minutes |
|---|---|---|---|---|---|
| A toolkit | yes, create-only | verbatim run, case-05 | voided, rebuilt | $4.74 | 26 |
| A toolkit, rebuild | yes, create-only | clean | **final** | $4.99 | 29 |
| A skill-creator | yes | tokens, case-06 | voided, rebuilt | $18.13 | 65 |
| A skill-creator, rebuild | yes | tokens: case-06, case-07 twice, case-08. Verbatim run: case-08 | **failed build** | $16.49 | 119 |
| B skill-creator | yes | tokens, case-01 and case-03 | voided, rebuilt | $16.91 | 17 |
| B skill-creator, rebuild | yes | tokens, case-01 and case-03 | **failed build** | $16.92 | 56 |
| B toolkit | yes, create-only | clean | **final** | $4.72 | 42 |
| C toolkit | yes, create-only | clean | **final** | $4.36 | 36 |
| C skill-creator | yes | clean | **final** | $16.85 | 126 |

The nine attempts cost about $104 in total. Every attempt's method ran and every attempt finished a skill, so the only failures were leak-check hits. Every toolkit build invoked `askit-build-skill` in create mode and never in improve mode, so `improveModeCount` was 0 and `createOnly` was true in all four. Section 6 would have labelled every toolkit brief "create-only".

### Applying the rule

Section 8 step 8 makes a second leak hit a failed build. Section 7 says a failed build in either arm invalidates the brief. Briefs A and B are therefore invalid. Only brief C is valid, and section 9 defines fewer than two valid briefs as **R3: void**. R4 cannot be assessed, because nothing was scored. Brief C's two skills were built and committed, and they stay unscored. Scoring one brief cannot change R3, and the pre-registration gives a lone brief no meaning.

The rule was applied as frozen. **The void rests entirely on the token rule.** *Corrected 2026-11-14: the first version of this record said that two hits from the 8-word rule showed the void was not only an artefact of fact 23's narrowing. That did not follow, because the 8-word rule alone voids nothing.* `harness/leak-replay.mjs` replays the nine recorded attempts under each reading of the rule (measured; [`leak-replay.json`](leak-replay.json)):

| Leak rule replayed | Hits per toolkit attempt | Hits per skill-creator attempt | Briefs invalid | Outcome |
|---|---|---|---|---|
| The pre-registered 8-word run alone | 0 to 1 | 0 to 1 | none | scorable |
| 8-word runs plus the tokens fixed by fact 23, as run | 0 to 1 | 0 to 5 | A and B | R3 void |
| 8-word runs plus tokens read literally, without fact 23's background filter | 21 to 25 | 5,549 to 5,879 | A and B, and every first attempt is voided | R3 void |
| The provenance rule drafted for experiment B2 | 0 | 0 | none | scorable |

So fact 23's narrowing did not cause the void: the literal reading voids everything harder. The token rule itself, in either reading, is what cannot tell copying from convergence. The replay can use only the attempts that exist. Where a rule would have kept a first attempt, the rebuild that was actually run is ignored, and where it would have voided a first attempt that was never rebuilt, the table says so rather than guessing.

### The leak review

`harness/leak-trace.mjs` traced every hit. For each piece of evidence (the 8-word run, or each token), it found the first transcript entry that contained the text. It then classified who produced that entry: text the model wrote, a tool result the build read, or the prompt that opened a session. For the two case-07 hits, which were found in nested session files, it also searched the parent transcript. The full trace is in [`leak-trace.json`](leak-trace.json).

| Finding | Evidence | Confidence |
|---|---|---|
| No evidence arrived from outside the model | All 11 hits: every piece first appears as model-written text, or in a nested session prompt built from the parent's own queries and from skill-creator's optimiser rewriting the description. None first appears in a tool result. One piece, "okay" in a case-07 nested prompt, has no origin in its own file or the parent, so `leak-trace.json` alone leaves it unresolved. `leak-replay.mjs` resolves it by ordering every entry in all of the build's transcripts by timestamp: its first appearance is model-written, in a sibling optimiser session. Every entry carried a timestamp, and the word is not in the harness's build prompt | High, measured hit by hit |
| No case file was reachable | The held-out cases are in neither plugin folder. A build mounts only its fresh work folder, its plugin overlay and the login volume (harness fact 12) | High, measured |
| No build fetched anything with its own tools | Every `.jsonl` in every run folder was read: 290 to 306 per skill-creator build, including subagents and nested sessions, and one per toolkit build. No build called a web tool. The programs its shell commands ran were `basename cat cd chmod claude cp cut echo find grep head ls mkdir mv node pgrep printf python python3 rm rmdir sed seq sleep sort tail wc which`, plus shell keywords and functions the model defined. `claude` is each arm's own nested eval or optimiser session, whose transcripts were all scanned. In the inline code run by `python` and `node`, neither `leak-trace.mjs`'s pattern nor `leak-replay.mjs`'s wider one (urlopen, sockets, `/dev/tcp`, httpx and others) found a network call | High for what was searched. A pattern search cannot rule out every way inline code could open a connection |
| The matches are canonical examples | The two 8-word runs are `ALTER TABLE payments ALTER COLUMN amount TYPE bigint` and `ALTER TABLE users RENAME COLUMN fullname TO display_name`. Token hits are domain words such as "flyway, inserts, user_id" and "alerted, alerts, renewed" | High, read directly |
| The arms collide at different rates because of text volume | Both arms wrote five practice cases per build. skill-creator wrote 161,000 to 270,000 model-authored characters per build, and the toolkit wrote 15,000 to 21,000 | High for the counts. Medium that volume is the cause, inferred |
| Builder and case author share a model | The builds ran on `claude-sonnet-5-5`, and `case-author-prompt.md` records that the cases were written on Sonnet. The case author's exact version is not recorded | High for the family, unknown for the version |

**Why the dry run missed it.** Fact 23 validated the narrowed leak check against the four dry-run builds. That brief, `standup-summary`, shares no domain with any held-out case, so those runs could only show that an off-topic build stays clean. No pre-freeze test ran a build on a held-out brief's own topic.

**What the finding means for the instrument.** When the case author and the builders are the same model family, a builder can produce near-duplicates of held-out cases without access. That has two consequences. A leak rule based on vocabulary overlap cannot separate copying from convergence, and it falls hardest on the arm that writes the most text. Convergence also partly tunes a builder on the test, even with no access, which limits what any win could mean. This limit is not listed in section 11 of the pre-registration.

### What follows

- **C1 stays not measured.** The decision table in [the release plan](../../../release-plans/plan_validate-best-in-class/RELEASE-PLAN.md) has rows for "passes" and "fails" only. What a void means for the behaviour-loop cut is the maintainer's ruling.
- **No re-run with a modified instrument.** Section 9 forbids it. A new pilot needs a new pre-registration with new briefs and the maintainer's ruling, and one is being drafted.
- **The container login should be removed** once it is no longer needed. Delete the podman volume `c1-pilot-login`, and revoke that sign-in from the account settings on claude.ai. A build's shell could read the stored login.

### Artifacts in this folder

| Path | What it is |
|---|---|
| `builds-summary.json` | Every build attempt, with the verdict and reasons from `harness/run-builds.mjs` |
| `builds/<attempt>/build-record.json` | The section 6 build record for each of the nine attempts |
| `builds/<attempt>/skill/<brief>/` | The skill each attempt finished, as submitted |
| `leak-trace.json` | The hit-by-hit trace, network scan and text counts from `harness/leak-trace.mjs` |
| `leak-replay.json` | The nine attempts replayed under four leak rules, with the timestamp-ordered origins and the programs each build ran, from `harness/leak-replay.mjs` |

Transcripts stay in the gitignored `_local/c1-pilot/runs/`, because they can carry machine paths (section 12). To reproduce the trace from them, run `node harness/leak-trace.mjs <runs-dir> <out.json>`.
