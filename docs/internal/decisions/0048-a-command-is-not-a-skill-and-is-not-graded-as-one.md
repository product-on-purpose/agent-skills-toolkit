# 0048 - A command's description is not a trigger surface, and sec 3.2 stops implying it is

> **AMENDED IN PLACE 2026-08-15, one day after ratification.** The DECISION below stands unchanged and
> nothing shipped is being reverted. Its **premise was false and its title was wrong**: this ADR asserted
> that a command is not a skill, and Claude Code's own documentation says *"Custom commands have been
> merged into skills."* The filename still carries the old title and is deliberately not renamed, because
> the number is cited from `STANDARD.md`, `CHANGELOG.md` and four source files. **Read "Correction,
> 2026-08-15" before anything else in this record.** This follows the ADR 0041 precedent: a decision whose
> stated mechanism could not be right is amended where it lives rather than quietly superseded.

## TL;DR
- **Decision:** No skill requirement is extended to commands. `U5` (description-score), `U6` (reference-links) and `U7` (instruction-budget) keep their skills-only scope. **No new check ships.** What changes is prose: Standard sec 3.2's rule that a command's description "MUST match the skill's triggering intent" is **demoted to a SHOULD**, not deleted, because the obligation is real and is simply not machine-checkable - and this toolkit's own `templates/command.md` and `docs/how-to/build-a-command.md` instruct authors to write a description that its own scorer would fail.
- **Why:** **0 of 14 commands in the family pass `U5`, including this repository's own two - whose backing skills, of the identical name and intent, score 1.00.** The entire gap is one literal token. `U5` awards 0.35 for matching `use when` / `when the user` / `if the user asks`; a command description that says "Use **to** scaffold a new SKILL.md" scores 0.65 and cannot reach 0.70 without adopting a phrasing that is wrong for a `/`-menu label.
- **The framing is also answered, and it was already settled.** "Should a command that is really a skill be held to skill requirements?" Standard sec 3.2 already forbids that shape - a command MUST map to exactly one skill or workflow - and `S7` already fails it. Eleven of the family's fourteen commands fail `S7` today for exactly this reason.
- **A new check was drafted and abandoned on measurement.** A command-shaped description bar passes 14 of 14 real commands and fails only an unreplaced scaffold, and `S7`'s existing `maps-to` branch already catches every unreplaced scaffold, verified on a fixture. A check that fires on nothing the gate does not already report is not worth a Standard bump.
- **Status:** Accepted (ratified 2026-08-14), **amended 2026-08-15** - see "Correction, 2026-08-15".

- **Date:** 2026-08-14, amended 2026-08-15
- **Deciders:** maintainer (jprisant), with Claude (Opus 5)

## Correction, 2026-08-15: the premise was false, the decision is not

**This ADR was ratified against a vendor claim nobody tested.** Claude Code's own documentation says, verbatim:

> **"Custom commands have been merged into skills.** A file at `.claude/commands/deploy.md` and a skill at `.claude/skills/deploy/SKILL.md` both create `/deploy` and **work the same way**. Your existing `.claude/commands/` files keep working."
> ([Extend Claude with skills](https://code.claude.com/docs/en/skills), read 2026-08-15)

And the plugins reference: *"The `commands/` directory holds **skills as flat Markdown files**. Use `skills/` for new plugins."* ([Plugins reference](https://code.claude.com/docs/en/plugins-reference), read 2026-08-15).

**A command IS a skill.** The original title and the "Context" section below both assert otherwise, and they are wrong.

**How it happened, because the process failure matters more than the fact.** The 2026-08-10 internal audit had already found this and graded `S7` a **CONFLICT (conceptual)**: *"Both vendors collapsed the distinction the check certifies."* That finding sat in `_local/audit/2026-08-10_fable/08-first-party-divergence.md` and was the reason "commands-as-skills" was on the v1.14.0 list at all. This ADR answered a question the audit had framed as a **vendor-alignment** question by **measuring description scores instead**, and never opened the audit's evidence. The measurement was sound; it was answering something else.

**Why the DECISION survives anyway, on better ground.** The same vendor page supplies it:

> **`disable-model-invocation: true`**: Only you can invoke the skill... **`user-invocable: false`**: Only Claude can invoke the skill.

A `commands/` file is a skill **whose invocation is user-controlled**: Claude does not load it automatically, so its description is not doing model-facing trigger matching. That is exactly the conclusion this ADR reached, and it is the reason - not "a command is a different kind of thing". Every numbered outcome below stands, and `templates/command.md`, the how-to and the `askit-build-command` guidance are all still correct.

**What the correction changes in the record:**
- The **title** becomes *"A command's description is not a trigger surface"*. The filename is not renamed (the number is cited in five places).
- Anywhere below that reasons from "a command is not a skill", read "a command is a skill whose invocation is user-controlled".
- **`STANDARD.md` sec 3.2 is corrected in the same change**, since it repeated the false premise in normative text.

**The larger finding this exposed, filed rather than decided (E44).** If the property that matters is **invocation control** rather than component type, then a skill in `skills/` declaring `disable-model-invocation: true` also has no trigger surface, and `U5` scores it anyway. **Measured before proposing anything: 0 of 2435 skills across seven pinned corpora and all six family members declare either field.** A check for a population of zero, immediately after `U17` shipped for a population of zero, is not warranted. Filed as **E44** with its trigger condition: revisit when the fields appear in a measured corpus.

**And the real lesson: this repository had the evidence and did not read it.** `askit-standards-watch` pins **four agentskills.io artifacts and zero vendor pages**, so every vendor claim here - `U14`'s field list, `U15`'s discovery behaviour, this ADR's premise - rests on a human having checked a page once and written down the date. Vendor-watch is the remaining v1.14.0 workstream and this is its justification.

## Builds on
- **ADR 0033 (recalibrate the `U5` description scorer)** - the calibration this ADR does not touch. ADR 0033 widened the ACTION lexicon and the WHEN variants after "a bare-stem-only list put strong third-party descriptions at exactly 0.65 across four independent corpora". Commands sit at exactly 0.65 for the same structural reason, and this ADR concludes the answer is scope, not another widening.
- **ADR 0029 (reclassify `U2` and `U5` as house provenance)** - why extending `U5` would have been invisible in third-party grading anyway: under `plain-plugin`, house-provenance findings are off. The bar this ADR declines to impose is one the project imposes mainly on itself.
- **ADR 0020 (skill packaging and naming)**, point 5 - "codify the command policy as a check before scaling: a command per user-invocable headline skill, not per skill". This ADR is where that codification lands, and the answer is that the policy is a design rule for this library, not a Standard requirement for everyone.
- **Standard sec 3.2** (slash command / invocation) - the section this ADR amends.
- **E14** - the sibling failure, and the same root cause. See "The shared root cause" below.
- **E18** (`U6` reference-links scans skills only) - link rot in a command or subagent is invisible. **That question is E18's and is deliberately not decided here.** This ADR declines to extend `U6` on the grounds that commands are not skills; whether link resolution should apply to every markdown component the plugin ships is a different question with a different answer, and merging them would let this ADR quietly pre-empt it.

## Context and problem statement

Standard sec 3.2 states two rules for a command: it MUST map to exactly one skill or workflow, and **its description MUST match the skill's triggering intent**. `S7` (`command-contract`) enforces the first and enforces only non-emptiness of the second.

The v1.14.0 pack carried "commands-as-skills" as an open question: whether a command that is really a skill should be held to skill requirements. Measuring the population answered a different question than the one asked.

**Every command in the family, scored by the real `U5` scorer:**

| Plugin | Commands | Passing `U5` (>= 0.70) | Scores |
|---|---|---|---|
| `pm-skills` | 11 | 0 | 0.55 and 0.65 |
| `thinking-framework-skills` | 1 | 0 | 0.65 |
| `agent-skills-toolkit` | 2 | 0 | 0.65 and 0.65 |
| **Total** | **14** | **0** | |

The same scorer over the skills in those three plugins: **112 of 159 pass.** The failure is not distributed; it is total, and it lands on the population's best examples. This repository's `/askit-evaluate` command reads:

> "Evaluate a skill or plugin against the Advanced Skill Library Standard and report per-rule findings, the tier, and remediation. Use to audit conformance or see what blocks the next tier."

That is a good description. It names the action, it names the occasion, it is specific. It scores **0.65**, because `U5` awards its 0.35 WHEN component only for `use when` / `whenever` / `when the user` / `when you need` / `for when` / `if the user asks`. "Use **to** audit" is not in the list. The backing skill `askit-evaluate`, same intent, longer form, scores **1.00**.

**Why the bar is wrong for this surface, not just badly tuned.** `U5` exists because a skill is selected by a model matching its description against a request; the description IS the trigger surface, so trigger phrasing is the thing being measured. A command is selected by a person typing `/name`. Claude Code shows the description as a menu label beside the name. And on Codex there is no command artifact at all - sec 3.2's own parity note says the Codex target is the backing skill, explicitly invocable, so the skill's description does the triggering on that runtime and the command's does not exist. **On neither runtime does a command description perform trigger matching.** Applying a trigger-quality bar to it measures a property the artifact does not have.

**The other reading, measured.** "A command that is really a skill" would be a command carrying its own instructions instead of delegating. Body sizes: commands median **172** words, max **352**; skills median **799**, max **3458**. **Not one of the fourteen exceeds the median skill.** Nothing in the family is a disguised skill by size, and `U7`'s 500-line budget is untouchable at 352 words. The closest real instance is `pm-skills`' ten `commands/workflow-*.md`, which carry 127 to 352 words duplicating their `_workflows/*.md` arcs and declare no `maps-to` - and all ten already fail `S7`. The Standard's one-target rule is the answer, and it already fires.

## Decision drivers

- A requirement that 100 percent of a population fails, including the reference implementation, is a defect in the requirement. This project has now met that shape twice (here, and `U5` at 0 of 346 on a French corpus).
- A check must measure a property the artifact actually has.
- Adding a spine number costs a Standard minor and a migration window for every consumer. It must buy something the gate does not already report.
- Our own generated output must satisfy our own published guidance, or the guidance is the defect. This is the E35 class one layer up: not remediation a reader cannot follow, but a template that produces output our own rule rejects.

## Considered options

**Option A - extend `U5` to commands.** Rejected on measurement: 0 of 14 pass, this repository's own commands among them, and the gap is a single literal token rather than a quality difference. Shipping it would emit a warning against every command in every plugin the toolkit has ever touched and would push authors toward writing `/`-menu labels that read like skill triggers.

**Option B - extend `U5` to commands with a lower threshold.** Rejected: the scores are 0.55 and 0.65, and 0.65 is the ACTION plus length plus no-first-person maximum with WHEN absent. Any threshold that passes the good commands (<= 0.65) also passes everything that has a verb and eight words, which is every non-empty description. The bar would be `S7`'s non-emptiness check wearing a decimal.

**Option C - a command-shaped description bar as a new check.** Drafted and scored: action verb plus eight words plus no placeholder, no WHEN requirement. It passes **14 of 14** real commands and scores the shipped `templates/command.md` at **0.00**. Rejected on the follow-up measurement: an unreplaced `templates/command.md` is **already** caught by `S7`, because the template's `maps-to: REPLACE-backing-skill-name` resolves to nothing and `S7` reports it. Verified on a fixture. The new check would fire only on a command with a valid `maps-to` and an unreplaced description, and would cost the whole population a Standard minor to catch it.

**Option D - a placeholder subrule on `S7`'s description branch, no new spine number.** Rejected for the same reason as Option C once the fixture showed `maps-to` already covers the scaffold case. Recorded here because it is the proportionate shape for a future subrule, and because ADR 0047 uses exactly this mechanism where the population justifies it.

**Option E (chosen) - decide the scope question NO, and fix the prose that implied otherwise.** The measurement's real finding is not a missing check. It is that the Standard states a command requirement nobody can satisfy, and this toolkit ships a template and a how-to guide telling authors to satisfy it.

## Decision outcome

**1. `U5`, `U6` and `U7` keep their skills-only scope.** A command is not graded on description quality, reference-link resolution or instruction budget. `U6`'s wider question belongs to E18 and is untouched here.

**2. No new check ships, and no Standard number is consumed.** The spine stays where ADR 0046 leaves it.

**3. Standard sec 3.2's description rule is DEMOTED, not deleted.** It becomes two clauses. A command's `description` **MUST** be non-empty and state what invoking the command does - that half is real, enforced by `S7`, and is what the field is for: the label a caller sees beside `/<name>`. It **SHOULD** agree with the backing skill's intent - that half is real guidance and is not machine-checkable, so it takes the weaker modal.

**3a. Why demote rather than delete, since the draft did delete it.** A MUST nothing enforces is dishonest, and deleting it fixes that. But deleting it also throws away guidance an author genuinely needs, to buy an honesty that a SHOULD buys more cheaply. This Standard already carries unenforceable SHOULDs of exactly this kind - sec 3.4's *"a workflow SHOULD declare which agent targets it supports"* - so the demotion uses an existing register rather than inventing one. The trigger-matching obligation that IS enforced moves to where it is true: the backing skill's own description, already under `U5`.

**4. Sec 3.2 gains the reason, because the reason is the part that stops this recurring.** A command is invoked by name, not matched from a request, and on Codex it is realised as the backing skill so no command description exists at all. A future reader proposing to grade command descriptions should find the argument already written, with the numbers.

**5. `templates/command.md` and `docs/how-to/build-a-command.md` stop asking for a trigger sentence.** The template's `description: REPLACE - what this command does AND when to use it, mirroring the backing skill's triggering intent.` becomes a label instruction. The how-to's bullet - "`description` - what the command does AND when to use it, mirroring the backing skill's triggering intent (Standard sec 8.1)" - loses its sec 8.1 citation, because sec 8.1 is the skill description contract and citing it here is what made two hand-written commands in this repository score 0.65.

**6. The `askit-build-command` skill is corrected in the same pass**, since it is the generator that instantiates the template, and a template fix that leaves the generator's prompt asking for the old shape fixes nothing an author sees.

## The shared root cause

This ADR and the `U5`-scope ADR (E14) are the same finding measured on two different populations, and they should be read together.

`scoreDescription` awards 0.70 of its 1.00 for matching two English regexes: an ACTION verb lexicon and a WHEN trigger-phrase lexicon. It does not measure whether a description states an action and an occasion; it measures whether it does so **using specific English phrases**. Every population that expresses the property in other words scores at or below 0.65:

- **A French corpus:** 0 of 346.
- **Commands:** 0 of 14, at exactly 0.65, because "Use to" is not "Use when".

The `U5`-scope ADR decides what to do about the scorer. This one decides that commands are outside its scope regardless of how that lands, so the two are independent and can be ratified separately.

## Consequences

- **Blast radius is zero by construction**, because no check changes. The family was not re-measured for a prose change, and this is stated rather than left as an omission.
- **A real gap stays open, knowingly, and now it is labelled.** Nothing enforces that a command's description agrees with its backing skill's intent. That is a judgment call, the gate is deterministic and model-free by charter, and the honest position is that it is unchecked. The SHOULD is what makes that visible: a reader can now tell the enforced half from the advisory half by reading the modal verb, which they could not do when both were a MUST and only one was checked.
- **A Standard that keeps unenforceable SHOULDs needs them to stay a small, deliberate set.** This adds one. If the set grows, the register stops distinguishing anything, and a future pass should count them rather than let the pattern spread by precedent.
- **`pm-skills`' eleven failing commands are unaffected.** They fail `S7` on the missing `maps-to`, which is the correct finding, and nothing here changes it. Fixing them means declaring `maps-to`, and note that the names do not correspond: `commands/workflow-design-sprint.md` maps to `design-sprint`, not to `workflow-design-sprint`.
- **This repository's own two commands stop being latent findings.** Under Option A they would have become warnings on the reference implementation the day the check shipped.
- **The `U5` scorer's structural weakness is now recorded in two ADRs with numbers attached**, so the E14 decision inherits the evidence rather than rediscovering it.
- **A Standard prose change still moves the version.** Sec 3.2's rule is normative, so the amendment lands in the 0.14 note even though no check moves. A reader diffing 0.13 to 0.14 must be able to see that a MUST was replaced.

## Implementation sites
- `STANDARD.md` sec 3.2 - the **Rules** bullet's description clause splits into a MUST (non-empty, states what invoking does) and a SHOULD (agrees with the backing skill's intent), with the reason stated. The 0.14 version note records it as a normative prose change with no check movement, and specifically as a **MUST demoted to a SHOULD**, because that is the kind of diff a consumer tracking the Standard needs to see called out rather than inferred.
- `STANDARD.md` sec 8.1 - a sentence scoping the description contract to skills, so the citation this ADR removes from the how-to cannot be re-added by someone reading sec 8.1 alone.
- `templates/command.md` - the `description` placeholder becomes a label instruction.
- `docs/how-to/build-a-command.md` - the `description` bullet, and the sec 8.1 citation.
- `skills/askit-build-command/SKILL.md` - the prompt that asks the author for a description.
- `scripts/checks/description-score.mjs`, `reference-links.mjs`, `instruction-budget.mjs` - **no code change**, but each gains one line in its docblock stating that the skills-only scope is a ratified decision rather than an unfinished loop. Without it, the next reviewer reads `for (const s of ctx.skills)` as the same defect E42 found in the agent checks, and "fixes" it.
- `tests/unit/description-score.test.mjs` - a test asserting `check(ctx)` returns nothing for a plugin whose only failing description is a command's. A ratified scope needs a test that fails if someone widens it, or the decision lives only in a comment.

Grep anchor: `scoreDescription` in `scripts/checks/description-score.mjs`, and the **Rules** bullet of sec 3.2 in `STANDARD.md`.
