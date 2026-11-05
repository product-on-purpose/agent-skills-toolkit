# The case author's instructions

This is what the fresh subagent received when it wrote the held-out cases on 2026-11-05, on the Sonnet model. It is committed so that the claim in section 4 of [the pre-registration](../prereg_experiment-b-c1-pilot-20261105.md) can be checked. The three briefs are not repeated here, because the author received them exactly as that file's section 3 gives them.

> You are writing a held-out test set for three skills that do not exist yet. People will build the skills later without ever seeing your test set, and a separate judge model will score the answers. You are an independent test author. Work ONLY from the three briefs below. Do not read any other file in the repository, and do not search it: seeing anything else would spoil your independence.
>
> ## Output location and format
>
> Write files under this absolute folder, with the Write tool only: `docs/internal/eval-runs/c1-pilot/held-out/`
>
> For each skill name, write ten cases: `<skill-name>/case-01/` to `<skill-name>/case-10/`. Each case folder holds exactly five files: `prompt.md`, with frontmatter `max_turns: 10` and `allowed_tools: [Read, Glob, Grep, Skill]`, followed by what the person says, including any pasted material; and `graders/convention-1.md`, `graders/convention-2.md`, `graders/substance-1.md`, `graders/substance-2.md`, each with frontmatter `type: llm` and `weight: 1`, followed by one sentence stating one observable thing that a correct response does.
>
> ## Rules for prompts
>
> - Write as a real person asking for help, with realistic material pasted in. Vary length, tone and how much is given.
> - NEVER name a skill. NEVER state, hint at or restate any house convention: no mention of required sections, formats, verdict words or the like. The person does not know the conventions exist.
> - In each skill's set, make exactly two prompts (use case-09 and case-10) avoid the brief's own vocabulary completely. For `migration-risk-review` do not say migration, review, schema or risk in them. For `postmortem-from-notes` do not say postmortem, incident, outage or review. For `acceptance-criteria-writer` do not say acceptance, criteria, criterion or requirements. They must still clearly be requests this skill should handle.
> - `postmortem-from-notes` inputs must be thin and incomplete, as its brief says. Include personal names in most of them, and leave out timezones in most of them. The prompt should contain no fact you later require the response to invent.
> - Make the ten prompts in a set truly different from each other in domain, failure type and phrasing.
> - Prompts must be answerable from the text alone, with no files.
>
> ## Rules for graders
>
> - Exactly two convention graders, each checking ONE house convention from the brief. Across the set, cover all of the brief's conventions, not the same two every time.
> - Exactly two substance graders, each checking ONE thing about whether the answer is right for THIS prompt's particular material: for example, that it identifies a specific real hazard in the pasted SQL, or that it carries a specific fact from the notes. A substance grader must be about domain correctness, not format, and it must be something a competent answer could fail.
> - Each grader is one self-contained sentence a judge can decide from the response alone, without seeing the prompt. So name the specifics in the sentence. For example: "The response identifies that adding a NOT NULL column with no default to the `orders` table will fail or rewrite the table." Do not write "the response is good" or "follows the conventions".
> - Do not use any grader type other than `llm`. Do not grade whether a skill fired or which tool was used.
> - Avoid graders that are trivially satisfied by any answer, and avoid graders that are impossible given the prompt.
>
> ## Finish
>
> Write all 30 cases (150 files). Use plain ASCII, and do not use em-dashes. Do not write any other file, and do not commit. Report only: the number of files written per skill, and any brief instruction you found ambiguous and how you resolved it. Do not repeat the cases in your report.

Two details are condensed above. The absolute path is shortened to its repository path, and the file-format blocks are described in a sentence. Nothing else is changed.
