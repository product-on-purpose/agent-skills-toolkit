# The replacement author's instructions

This is what the fresh subagent received when it wrote the six replacement cases on 2026-11-10, on the Sonnet model, as section 4 of [the pre-registration](../prereg_experiment-b-c1-pilot-20261105.md) requires. It is the original author's instructions from [`case-author-prompt.md`](case-author-prompt.md), cut to the two briefs and six cases being replaced, plus the reason. The author did not see the replaced cases, the other cases, or any score.

> You are writing six replacement cases for a held-out test set. The set tests skills that people will build later without ever seeing your cases, and a separate judge model will score the answers. You are an independent test author. Work ONLY from the two briefs below. Do not read any other file in the repository, and do not search it: seeing anything else would spoil your independence.
>
> ## Why these six cases are being replaced
>
> Each of the six cases you are replacing was answered well enough by a model with no skill at all: it scored 0.75 or more, which is three of its four graders, in every run. A case like that cannot show whether a skill helps, because there is almost no room above the no-skill score. Write replacements that a competent model without the house conventions would usually fail on at least two of the four graders, while a model that knows the conventions and reads the material carefully could pass all four. Do not make cases impossible, and do not make graders unfair: every grader must still be something a correct answer, following the brief, satisfies.
>
> ## The two briefs
>
> ### `migration-risk-review`
>
> > Build a skill named `migration-risk-review`. It reviews a PostgreSQL schema migration that a person pastes or describes, before the migration runs in production.
> >
> > House conventions the output must follow. The first line reads `Verdict: SAFE`, `Verdict: SAFE WITH CHANGES` or `Verdict: UNSAFE`. Next comes one table with the columns Statement, Lock taken, Risk, Fix, with one row per statement. After the table, a section headed `Rollback` gives the rollback statement for each change, or says `No rollback` with the reason. When the table size or traffic is not given, a section headed `Assumptions` says what was assumed, and the verdict cannot be SAFE. The review always prefers an expand-and-contract sequence over a single breaking change, and names the separate deploy steps when it recommends one.
> >
> > People ask for this in many ways, and often without saying "migration review". Examples are asking whether a change is safe to ship, or pasting an ALTER TABLE and asking what could go wrong.
>
> ### `postmortem-from-notes`
>
> > Build a skill named `postmortem-from-notes`. It turns rough, incomplete incident notes into a blameless postmortem. The skill will be used by a smaller model, and the inputs are usually thin.
> >
> > House conventions the output must follow. The sections appear in exactly this order: Summary, Impact, Timeline, Contributing factors, What went well, Actions. Summary is at most three sentences. Timeline entries are in time order and state the timezone, and if the notes do not give a timezone the Timeline says `Timezone: UNKNOWN`. People are named by role only, never by personal name, even when the notes use names. Contributing factors never blame a person. Any fact the notes do not give is written as `UNKNOWN - ask <role>`, and is never invented. Actions is a table with the columns Action, Owner role, Type, Due, where Type is one of Prevent, Detect or Mitigate, and Due is `UNKNOWN` unless the notes give a date.
> >
> > People ask for this in many ways, and often without saying "postmortem". Examples are pasting chat notes from an outage and asking for a write-up, or asking for an incident review from a list of events.
>
> ## Output location and format
>
> Write files under this absolute folder, with the Write tool only: `E:/tmp/c1-pilot-wt/docs/internal/eval-runs/c1-pilot/held-out/`
>
> Write exactly these six cases: `migration-risk-review/case-02/`, `migration-risk-review/case-08/`, `migration-risk-review/case-10/`, `postmortem-from-notes/case-02/`, `postmortem-from-notes/case-07/` and `postmortem-from-notes/case-08/`. Each folder already exists and already holds one file, `graders/fired.md`. Do not read, change or delete it. Write exactly five files in each folder:
>
> - `prompt.md`, which starts with this frontmatter and is followed by what the person says, including any pasted material:
>
>   ```
>   ---
>   max_turns: 10
>   allowed_tools: [Read, Glob, Grep, Skill]
>   ---
>   ```
>
> - `graders/convention-1.md`, `graders/convention-2.md`, `graders/substance-1.md` and `graders/substance-2.md`, each starting with this frontmatter and followed by one sentence stating one observable thing that a correct response does:
>
>   ```
>   ---
>   type: llm
>   weight: 1
>   ---
>   ```
>
> ## Rules for prompts
>
> - Write as a real person asking for help, with realistic material pasted in. Vary length, tone and how much is given.
> - NEVER name a skill. NEVER state, hint at or restate any house convention: no mention of required sections, formats, verdict words or the like. The person does not know the conventions exist.
> - `migration-risk-review/case-10/` must avoid the brief's own vocabulary completely: do not say migration, review, schema or risk in it. It must still clearly be a request this skill should handle.
> - `postmortem-from-notes` inputs must be thin and incomplete, as its brief says. Include personal names in most of them, and leave out timezones in most of them. The prompt should contain no fact you later require the response to invent.
> - Make the prompts truly different from each other in domain, failure type and phrasing. Each set has eight other cases that you cannot see, so avoid the most obvious textbook examples.
> - Prompts must be answerable from the text alone, with no files.
>
> ## Rules for graders
>
> - Exactly two convention graders, each checking ONE house convention from the brief. Across your three cases for a brief, cover different conventions, not the same two every time.
> - Exactly two substance graders, each checking ONE thing about whether the answer is right for THIS prompt's particular material: for example, that it identifies a specific real hazard in the pasted SQL, or that it carries a specific fact from the notes. A substance grader must be about domain correctness, not format, and it must be something a competent answer could fail.
> - Each grader is one self-contained sentence a judge can decide from the response alone, without seeing the prompt. So name the specifics in the sentence. For example: "The response identifies that adding a NOT NULL column with no default to the `orders` table will fail or rewrite the table." Do not write "the response is good" or "follows the conventions".
> - A grader checks one behaviour only. Do not require two separate outcomes in one sentence.
> - Do not use any grader type other than `llm`. Do not grade whether a skill fired or which tool was used.
> - Avoid graders that are trivially satisfied by any answer, and avoid graders that are impossible given the prompt.
>
> ## Finish
>
> Write the six cases (30 files). Use plain ASCII, and do not use em-dashes. Do not write any other file, and do not commit. Report only: the number of files written per skill, and any instruction you found ambiguous and how you resolved it. Do not repeat the cases in your report.

Two details differ from the original instructions beyond cutting them to six cases. The "why" section gives the reason, as section 4 requires. And the rule "a grader checks one behaviour only" is added, because the section 13 review found that five graders in the original set required two outcomes in one criterion.
