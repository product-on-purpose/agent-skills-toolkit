# The brief author's instructions

This is what the fresh subagent received when it wrote experiment B2's briefs on 2026-11-22, on the Sonnet model, as section 3.1 of [the B2 design](../design_experiment-b2-c1-pilot-2-20261114.md) requires. It is committed so that the claim "written from the plan's criteria alone" can be checked. The author was told which four topics experiment B had already used, so it could avoid them, and nothing else from experiment B.

> You are writing four briefs for skills that do not exist yet. A skill is a set of instructions that teaches Claude to do one job well. Two different skill-building methods will each build a skill from each brief, without help from a person. Afterwards, every built skill is scored on ten hidden test cases per brief, written later by someone else from your brief alone. Each case compares Claude's answer with the skill against its answer with no skill, and a judge model scores both against fixed criteria. You are an independent author. Work only from these instructions. Do not read any file in the repository, and do not search it.
>
> ## What one brief contains
>
> 1. A first sentence naming the skill, in the form "Build a skill named `kebab-case-name`.", followed by one or two sentences on what it does and what the person gives it.
> 2. A paragraph that starts "House conventions the output must follow." It states five to seven conventions. Each convention is a specific, observable rule about the output that a capable model could not guess unaided, such as a required first line, a fixed section order with exact headings, a table with exact columns, a fixed vocabulary for a field, or a rule for what to write when the input lacks a fact. A judge must be able to check each one from the response alone.
> 3. A paragraph that starts "People ask for this in many ways," and gives two example phrasings, at least one of which does not use the task's obvious name.
>
> Keep each brief under 200 words, in plain English.
>
> ## What the set of four must satisfy
>
> - **Three real briefs and one dry-run brief.** The dry-run brief is used only to rehearse the instrument. It must be of the same kind and difficulty as the other three, in a different domain.
> - **One real brief is for a smaller model with thin inputs.** Say in that brief that the skill will be used by a smaller model and that the inputs are usually thin, so templates and rules for missing facts matter. Mark it in its heading as described below.
> - **The input is material the person pastes or describes:** a document, notes, a data extract, a log, a configuration, a draft. Choose tasks whose test inputs can be specific invented situations, with their own names, numbers and constraints. Avoid tasks whose natural test inputs are a handful of textbook examples that anyone would reach for first, because the hidden cases must not be easy to reinvent.
> - **The skill must be able to add value.** Choose tasks where a capable model with no skill often handles the substance reasonably but misses the conventions, and where the substance is hard enough that a good skill could also improve it.
> - **Answerable from text alone,** with no files, tools or internet access.
> - **Four different domains,** and none of these, which were used before: reviewing database schema migrations, writing incident postmortems, writing acceptance criteria or user stories, and summarising standup notes.
>
> ## Output
>
> Write exactly one file, with the Write tool: `E:/tmp/c1-pilot-wt/docs/internal/eval-runs/c1-pilot-2/briefs.md`. Use these four headings in this order, each followed by the brief as a block quote:
>
> - `### Brief A: \`<name>\``
> - `### Brief B: \`<name>\` (smaller model)` for the smaller-model brief, which must be brief B
> - `### Brief C: \`<name>\``
> - `### Dry-run brief: \`<name>\``
>
> Start the file with the line `# Experiment B2 briefs` and nothing else above the headings. Use plain ASCII, and do not use em-dashes. Do not write any other file, and do not commit. Report only the four skill names, one line each on why the task suits the requirements above, and any instruction you found ambiguous and how you resolved it.
