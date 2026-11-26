# The replacement author's instructions

This is what the fresh Opus subagent received on 2026-11-22 when it wrote experiment B2's three replacement cases. Calibration found three cases that a model with no skill already scored 0.75 or more on: one shift-handover-note case and two customer-release-notes cases. Section 3.5 of [the B2 design](../design_experiment-b2-c1-pilot-2-20261114.md), as amended on 2026-11-22, allows one replacement round. The author received the original [case-author instructions](case-author-prompt.md), cut to the cases being replaced, plus the reason, plus the two briefs' screen prompts as examples to avoid. It did not see the replaced cases, the other cases, or any score. The case numbers are given here, because the case numbers carry no case content.

> You are writing three replacement cases for a held-out test set. The set tests skills that people will build later without ever seeing your cases, and a separate judge model will score the answers. You are an independent test author. Work ONLY from this file and the screen files it names. Do not read any other file, and do not search the repository.
>
> ## Why these cases are being replaced
>
> Each case you are replacing was answered well enough by a model with no skill at all: it scored 0.75 or more, which is three of its four graders. A case like that cannot show whether a skill helps, because there is almost no room above the no-skill score. Write replacements that a competent model without the house conventions would usually fail on at least two of the four graders, while a model that knows the conventions and reads the material carefully could pass all four. Do not make cases impossible, and do not make graders unfair: every grader must still be something a correct answer, following the brief, satisfies.
>
> ## Examples already invented, to stay away from
>
> Fresh sessions that saw only a brief wrote practice prompts for it. They are in the files named below, 100 prompts per brief. Read them, and make sure no replacement describes the same situation as any of them: not the same organisation, system, people, figures or statements.
>
> ## Output location and format
>
> Write files with the Write tool only, under this absolute folder: `<local cases folder>`. Write exactly these cases: `shift-handover-note/case-05/`, `customer-release-notes/case-04/` and `customer-release-notes/case-10/`. Each case folder holds exactly five files, in the same format as the original instructions: `prompt.md` with its frontmatter, and the four graders `convention-1.md`, `convention-2.md`, `substance-1.md` and `substance-2.md`, each with `type: llm` and `weight: 1` and one sentence.
>
> ## Rules
>
> - The original instructions' rules on situated material, prompts and graders all apply. A convention grader checks one convention only.
> - The shift-handover-note input must be thin and incomplete, as its brief says, and miss at least one fact a missing-fact rule covers.
> - Both customer-release-notes prompts must miss at least one fact that one of that brief's "not given" rules covers.
> - `customer-release-notes/case-10/` must avoid the brief's own vocabulary completely: the task's obvious name and its most obvious keywords. Report which words you avoided.
>
> ## Finish
>
> Write the three cases (15 files). Use plain ASCII, and do not use em-dashes. Do not write any other file, and do not commit. Report only the number of files written, the words you avoided in `customer-release-notes/case-10/`, and any instruction you found ambiguous and how you resolved it.

The local folder path and the screen file paths were given in full, as were the two briefs, exactly as [`briefs.md`](briefs.md) has them, and the original instructions' rules sections in full. Nothing else differs.

**One omission in the prompt as given.** The prompt said to use "the same format as the original instructions", but the part copied in did not include the exact `prompt.md` frontmatter or the `graders/` folder. The pre-registration's author fixed both by hand afterwards, as [`PREPARATION.md`](PREPARATION.md) records.
