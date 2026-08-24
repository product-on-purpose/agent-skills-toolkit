---
title: "Why a standard, and what it delivers"
description: "The case for grading a skill library against a written standard, the outcomes it produces, and who benefits, for technical and non-technical readers alike."
audience: both
level: beginner
tags: [value, rationale, outcomes, benefits, standard, quality, trust]
---

# Why a standard, and what it delivers

This page makes the case. It assumes you have not already agreed that any of this is a good idea, and it is written to be read by someone who does not write code as well as someone who does.

If you already accept the premise and want the rules, go to [`STANDARD.md`](../../STANDARD.md). If you want proof the toolkit lives by its own rules, go to [How the toolkit is validated and improved](validation-and-improvement.md).

## The short version

An AI agent skill is a folder with a markdown file in it. That is a wonderfully low barrier, and it is also the whole problem: anyone can ship one, nothing checks it, and the failure is silent. A broken skill does not crash. It just quietly does not get used, or gets used badly, and nobody finds out.

A standard turns "is this any good?" from an opinion into a question with an answer. This toolkit writes that standard down, then ships a program that checks it in seconds, for free, with a real pass or fail.

## The problem, stated plainly

Say your team has built forty skills over six months. Some questions you cannot currently answer without reading all forty:

- Does every skill actually get triggered when it should, or do some sit there unused because their description is vague?
- Do the links between them work, or has a folder been renamed and quietly broken thirty references?
- Did everything you built actually ship, or is one of them missing from the manifest and invisible to everyone who installs it?
- If a new person joins, is there any written bar they can be held to, or is quality whatever the reviewer felt that day?
- If you tell someone "our skill library is good," what exactly are you claiming, and how would they check?

None of these are exotic. Every one of them has been found in a real, well-maintained library by pointing this toolkit at it. In one case the most recent commit added a skill, updated the README, and never registered it: shipped, and invisible to every installer.

The deeper issue is that all of these failures are **silent**. Software that breaks tells you. A skill library that is slowly degrading looks exactly like one that is fine.

## What a standard actually gives you

### 1. A shared definition of "good"

Right now "high-quality skill library" means whatever the speaker wants. The [Advanced Skill Library Standard](../../STANDARD.md) writes it down in normative language: what a skill MUST have, what it SHOULD have, what is optional. Once it is written down, you can disagree with it in specifics, which is far more useful than everyone silently meaning different things.

### 2. A ladder instead of a cliff

The Standard has three tiers - **Bronze**, **Silver**, **Gold** - and they are cumulative. Bronze is the portable floor: your skills are well-formed, your links work, your descriptions say when to use them. Silver adds cross-agent readiness. Gold adds documentation depth and governance.

The ladder matters because "you are not compliant" is demoralizing and useless, while "you are Bronze, and these four things get you to Silver" is a to-do list. Nothing you do at Bronze is rework later. You climb, you never restart.

### 3. An answer that does not depend on who is asking

The gate is **deterministic**: it runs a fixed set of checks, consults no AI model, produces the same answer every time, and exits with a real status code. Two people running it on the same repo get the same result. It costs nothing to run and takes seconds.

That last property is what lets it sit in a build pipeline. An opinion cannot fail a build. A check can.

### 4. A way to grade work that is not yours

This is the part most tools get wrong. If you point a house standard at someone else's repo, almost everything it reports is "you have not adopted our conventions," which is not a defect in their work. The toolkit separates the two:

| What you run | What you get |
|---|---|
| Default (`askit-library`) | Full house ladder: real defects **and** Standard adoption |
| `--profile plain-plugin` | Portable correctness only. Real defects. Nothing about house conventions. |

On a real outside repository those two numbers were **159** and **11**. The 11 were genuinely broken links. The other 148 were "you have not adopted this Standard," which was never that maintainer's problem. Being able to say which is which, credibly, is the difference between a useful review and an insulting one.

## What you get out of it

### If you write code

- **A gate you can put in CI.** `npx agent-skills-toolkit .` exits non-zero on failure. Wire it to a pull request and quality stops being a review-time argument.
- **Findings with a location and a rule.** Every finding names the requirement it violates, the file, and what to do. Not "this could be better."
- **A tier report that is a work queue.** It tells you the highest tier you satisfy and exactly what blocks the next one.
- **Configurability that does not require a fork.** Per-rule severity, named profiles, a suppressions baseline, and a version pin so rules written after your code do not retroactively fail it.
- **Builders that produce conformant output by construction**, so you are not fixing gate failures you could have avoided.
- **One source library, multiple agents.** Components are emitted in the right format for Claude Code and Codex from a single definition.

### If you do not write code

- **A grade you can act on.** Bronze, Silver, or Gold, with a plain list of what stands between you and the next one.
- **A shareable report.** A self-contained HTML page with a glossary explaining every check in one line, so you can read the result without having read the Standard.
- **Confidence that "we improved quality" is a claim with evidence behind it.** The grade moved, or it did not.
- **A migration path for work already done.** Pointing the toolkit at an existing pile of skills produces a staged plan, not a demand that you start over.
- **A cost you can predict.** Grading and reporting cost **zero** model tokens, always. Only the optional AI review layer costs anything, and its measured range is published.

## The outcomes to expect, honestly

**What this reliably delivers.** Structural defects found in seconds. Silent shipping failures caught. A defensible, repeatable quality bar. A concrete climb path. Cross-agent output from one source. Zero-cost grading.

**What it does not deliver, and no tool of this kind can.** It cannot tell you whether a skill is a *good idea*, whether its advice is *correct*, or whether your library is the right shape for your team. It checks structure and portability, not wisdom. The optional AI review layer offers judgment, and is deliberately built so that it can never move the deterministic grade - because a grade that changes depending on which model ran it is not a grade.

**What it costs you.** Adopting a standard means writing a manifest, declaring a tier, and fixing what the gate finds. For a healthy repo that is usually a short afternoon. For a large or long-neglected one it is a staged project, which is precisely why the ladder exists.

**One honest caveat.** A deterministic checker is not an infallible checker. This one has needed several precision corrections in its short life, each time because a real repository showed it flagging something valid. That loop - grade real work, verify surprises by hand, correct the checker behind tests - is documented in [How the toolkit is validated and improved](validation-and-improvement.md) and is a permanent cost of the design, not a phase it will grow out of. A tool that claimed otherwise would be lying.

## Why this particular standard

Three properties, and the third is the one to weigh:

1. **It grades whole libraries, not single skills.** Most tools validate one skill at a time. Coherence problems - a broken cross-reference, an unregistered skill, two skills that trigger on the same request - only exist at the library level.
2. **The verdict never involves a model.** The grade is computed by code. The AI layer renders beside it and is structurally prevented from touching it.
3. **The toolkit is built to its own Standard and self-validates at Gold in CI on every commit.** A quality standard whose author exempts themselves is marketing. This one does not get to.

## Where to go next

- **Convinced, want to try it:** [Quick start](../../QUICKSTART.md)
- **Want the tiers in detail:** [Conformance and tiers](conformance-and-tiers.md)
- **Want the normative rules:** [`STANDARD.md`](../../STANDARD.md)
- **Want proof it works:** [How the toolkit is validated and improved](validation-and-improvement.md)
- **Want to know how it compares:** [How agent-skills-toolkit compares](comparison.md)
- **Not sure what to read:** [Reading paths](reading-paths.md)
