# The case author's instructions

This is what each case author received on 2026-11-22, as sections 3.4 and 3.6 of [the B2 design](../design_experiment-b2-c1-pilot-2-20261114.md) require. There were four authors, one fresh Opus subagent per brief, so that no single agent ran past about 50 file writes. Each got these identical instructions plus its one brief, exactly as [`briefs.md`](briefs.md) gives it, with `<skill-name>` filled in. The dry-run brief's author wrote the decoy cases by the same process as the real cases. The cases themselves are not in this repository until the last real build finishes (design section 3.2).

It follows experiment B's [case-author instructions](../c1-pilot/case-author-prompt.md), with four differences: the output goes to a local folder, there is one author per brief, the dry-run brief gets ten decoy cases, and a new section asks for situated material that resists reinvention.

> You are writing a held-out test set for a skill that does not exist yet. People will build the skills later without ever seeing your test set, and a separate judge model will score the answers. You are an independent test author. Work ONLY from the brief below. Do not read any other file in the repository, and do not search it: seeing anything else would spoil your independence.
>
> ## Output location and format
>
> Write files with the Write tool only, under this absolute folder: `E:/Projects/product-on-purpose/agent-skills-toolkit/_local/c1-pilot-2/cases/`
>
> Write ten cases: `<skill-name>/case-01/` to `<skill-name>/case-10/`. Each case folder holds exactly five files:
>
> - `prompt.md`: frontmatter `max_turns: 10` and `allowed_tools: [Read, Glob, Grep, Skill]`, followed by what the person says, including any pasted material.
> - `graders/convention-1.md`, `graders/convention-2.md`, `graders/substance-1.md`, `graders/substance-2.md`: each with frontmatter `type: llm` and `weight: 1`, followed by one sentence stating one observable thing that a correct response does.
>
> ## The most important rule: situated material
>
> A builder will invent its own practice examples for each skill. If your cases look like the examples anyone would invent first, the test is spoiled even though nobody copied anything. So:
>
> - Build every prompt around a specific invented situation: its own organisation, system, product, people, numbers, dates and constraints. Make the pasted material feel like it came from one particular place.
> - Before writing each prompt, think of the example you would reach for first for that task, the one a tutorial, a textbook or documentation would use. Do not use it, and do not use a close variant of it.
> - Avoid stock names and stock values: no Acme, Alice and Bob, foo and bar, `users` and `orders`, round numbers like 100 or 1000 where a real one would be messier.
> - Make each substance grader hinge on a detail that exists only in that prompt.
>
> ## Rules for prompts
>
> - Write as a real person asking for help, with realistic material pasted in. Vary length, tone and how much is given.
> - NEVER name a skill. NEVER state, hint at or restate any house convention: no mention of required sections, formats, field values or the like. The person does not know the conventions exist.
> - Make exactly two prompts, case-09 and case-10, avoid the brief's own vocabulary completely: the task's obvious name and its two or three most obvious keywords. They must still clearly be requests this skill should handle. Report which words you avoided.
> - If the brief says inputs are usually thin, make most inputs thin and incomplete, missing facts the conventions have rules for. In any case, make at least three of the ten prompts miss a fact that one of the brief's missing-fact rules covers. The prompt must contain no fact you later require the response to invent.
> - Make the ten prompts truly different from each other in situation, difficulty and phrasing.
> - Prompts must be answerable from the text alone, with no files.
>
> ## Rules for graders
>
> - Exactly two convention graders, each checking ONE house convention from the brief. Across the set, cover all of the brief's conventions, not the same two every time.
> - Exactly two substance graders, each checking ONE thing about whether the answer is right for THIS prompt's particular material. A substance grader must be about correctness, not format, and it must be something a competent answer could fail.
> - Each grader is one self-contained sentence a judge can decide from the response alone, without seeing the prompt. So name the specifics in the sentence. Do not write "the response is good" or "follows the conventions".
> - A convention grader checks one convention only. Do not require two outcomes in one grader.
> - Do not use any grader type other than `llm`. Do not grade whether a skill fired or which tool was used.
> - Avoid graders that are trivially satisfied by any answer, and avoid graders that are impossible given the prompt.
>
> ## Finish
>
> Write all 10 cases (50 files). Use plain ASCII, and do not use em-dashes. Do not write any other file, and do not commit. Report only: the number of files written, the words you avoided in case-09 and case-10, and any brief instruction you found ambiguous and how you resolved it. Do not repeat the cases in your report.
>
> ## The brief
>
> (The brief's block quote from `briefs.md`, exactly as written there.)
