---
title: Build your first skill
description: Follow a guided lesson that turns an idea into a conformant agentskills.io skill with askit-build-skill, clearing the Bronze checks along the way
audience: both
level: beginner
---

# Build your first skill

This is a guided lesson with a guaranteed outcome. By the end you will have authored a real agentskills.io skill - a `SKILL.md` with valid frontmatter and a description that clears the quality bar - and watched it come back clean from the validator. That skill is then a gradeable component: the first piece of a library you can grow.

You do not need to know the Standard to follow along. You will pick up just enough of it as you go. The whole lesson takes about ten minutes.

## What you will build

You will build one skill that turns a rough meeting note into a short, structured summary. The topic does not matter much - it is small on purpose, so the focus stays on the shape of a skill, not the cleverness of its content. If you would rather build something else, swap in your own idea; every step below still applies.

When you finish you will have a directory like this:

```
skills/summarize-meeting-notes/
  SKILL.md
```

That `SKILL.md` is the whole skill. Everything else a skill can carry - reference files, scripts, examples - is optional, and you will add none of it today.

## Before you start

You need two things:

- The toolkit installed, so the `askit-build-skill` skill is available to your agent. If you have not installed it yet, follow [Install](../../README.md#install), then come back.
- A place to work. Any directory will do for this lesson. You do not need a full plugin around the skill - a skill works on its own (that is the toolkit's "a la carte" principle), and the validator can assess a lone skill directory at the component level.

That second point is worth holding onto. You are building one component. A *plugin* (a release unit with a manifest and a version) and the *tier* it earns - Bronze, Silver, Gold - come later, in the next tutorial. Today's job is the atom: a single, well-formed skill.

## Step 1: Have the idea, in three parts

A skill is discovered by its `description`, and the validator scores that description against a real bar (rule `U5`). So before you write anything, get clear on three things. Write them down in plain words:

1. **What it does.** The action and the output. "Summarizes a meeting note into a short structured digest."
2. **When to use it.** The trigger condition - the moment an agent should reach for this skill. "When the user pastes raw meeting notes and wants them condensed."
3. **A few trigger keywords.** The actual words a person would say. "meeting notes, summary, recap, action items."

These three parts are not busywork. They become the description, and the description is the one signal an agent uses to decide whether your skill is relevant. Vague descriptions ("helps with meetings") fail the bar; specific ones pass it. You will see exactly why in Step 4.

## Step 2: Invoke askit-build-skill in create mode

Now hand those three parts to the toolkit. Ask your agent:

> Build a new skill called `summarize-meeting-notes`. It summarizes a raw meeting note into a short structured digest. Use it when the user pastes meeting notes and wants them condensed. Trigger keywords: meeting notes, summary, recap, action items.

That invokes `askit-build-skill` in **create mode**. (You can also run the `/askit-build-skill` command, or just say "create a skill" and answer the short interview it gives you.) Because you supplied the name, the what, the when, and the keywords up front, it can skip the interview and go straight to scaffolding.

What create mode does, concretely:

- Makes the directory `skills/summarize-meeting-notes/`.
- Copies the skill template into `skills/summarize-meeting-notes/SKILL.md`.
- Fills the frontmatter: a `name` equal to the directory, and a `description` built from your three parts.

## Step 3: Read what it produced

Open `skills/summarize-meeting-notes/SKILL.md`. You should see something close to this:

```markdown
---
name: summarize-meeting-notes
description: Summarizes a raw meeting note into a short structured digest. Use when the user pastes meeting notes and wants them condensed into a recap with action items.
metadata:
  version: 0.1.0
---

# summarize-meeting-notes

## Purpose
One paragraph: what this skill does for the agent.

## When to use
The trigger conditions, mirroring the description.

## Steps
1. First step.
2. Second step.

## References
Move deep content into references/ and link it here so this file stays within the instruction budget.
```

Two details in that frontmatter are doing real work, and they map directly to validator rules:

- **`name` equals the directory name.** The skill lives in `skills/summarize-meeting-notes/`, and the frontmatter `name` is `summarize-meeting-notes`. The validator requires these to match exactly (rule `U4`). It is how an agent and the tooling agree on what to call the skill.
- **The `description` states what AND when, with keywords.** This is the line that clears the `U5` bar. Notice it leads with an action verb ("Summarizes"), names a trigger ("Use when ..."), and uses words a person would actually say ("meeting notes", "recap", "action items").

Fill in the body - Purpose, When to use, Steps - with your actual instructions to the agent. Keep it short; a skill body should stay well under the instruction budget, and anything long belongs in a `references/` file loaded on demand. For this lesson, a few honest sentences in each section is plenty.

## Step 4: Why the description bar exists

Before you validate, it is worth understanding the one check that trips up most newcomers, because once you see it you will never write a weak description again.

The validator scores your description from 0 to 1 and warns below **0.7**. The score is a heuristic for the Standard's discoverability bar, and it rewards exactly the three parts from Step 1:

- It looks for an **action verb** (creates, summarizes, validates, builds, and so on). "Summarizes ..." earns that signal.
- It looks for a **when clause** (phrases like "use when", "when the user", "when you need"). "Use when the user pastes ..." earns that one.
- It rewards **third-person** phrasing and penalizes vague anti-patterns like "helps with" or "handles".

So "Helps with meetings" scores low - no clear action, no trigger, an anti-pattern verb. "Summarizes a raw meeting note ... Use when the user pastes meeting notes ..." scores high. The bar is not arbitrary; it is protecting the only thing an agent reads when it decides whether to fire your skill.

If your description ever scores below the bar, the fix is mechanical: name the action, name the trigger, add the words a user would say. That is `improve` mode's whole job, which you will meet next.

## Step 5: Validate the skill

Now prove it. From your working directory, run the validator against just this skill:

```bash
node scripts/evaluate.mjs skills/summarize-meeting-notes
```

(This is the same engine the `askit-evaluate` skill runs for you; you can also just ask your agent to "evaluate this skill.") You get a list of per-rule findings. A lone skill directory is assessed at the **component level** - the skill-applicable rules only. You will not see a tier reported, and that is correct: a tier belongs to a *plugin*, and a single skill is not yet a plugin (it has no manifest). The tier comes in the next tutorial.

What you are looking for is a clean component report:

```
0 error(s), 0 warning(s).
```

If you see findings, read each one - it names the file and the fix. A low `U5` description score is a `warn`: tighten the description per Step 4. A `U4` name mismatch is an `error`: make the frontmatter `name` match the directory. Re-run `evaluate` after each change until it is clean. That create -> evaluate -> improve loop is the core rhythm of authoring; you can ask `askit-build-skill` in **improve mode** to read the report and apply the fixes for you.

## What you just earned

A clean component report is the payoff. Your skill now:

- **Parses and self-describes.** Valid frontmatter, a name that matches its directory, a description that clears the bar.
- **Runs unchanged on any compliant agent.** It is a portable agentskills.io skill, so the same `SKILL.md` works on Claude Code, Codex, and the wider agentskills.io ecosystem.
- **Is a gradeable component.** It now satisfies the skill-level Universal checks (the `U`-rules that apply to a skill). Drop it into a plugin and those checks count toward the plugin's Bronze grade.

That last point is the whole arc of the toolkit in miniature. You did not just write a file; you wrote a piece that a quality gate can measure. The Standard's path is "loose components into a plugin into a skill library", and you have made your first component.

## What you learned

- A skill is a directory whose `name` equals its frontmatter `name`, holding one `SKILL.md`. That is the atom.
- The `description` is the skill's primary discovery signal, and the validator scores it (rule `U5`, warns below 0.7). State **what** it does and **when** to use it, with concrete trigger keywords.
- `askit-build-skill` scaffolds the skill in create mode from a template; the validator (`evaluate`, the engine behind `askit-evaluate`) reports per-rule findings; improve mode fixes what the validator flags. Create, evaluate, improve - repeat until clean.
- A single skill is assessed at the component level, with no tier. A tier belongs to a plugin, which is where you are headed next.

## Next: turn this skill into a plugin and reach Bronze

A clean skill is a great start, but on its own it is still a loose component. To make it a *plugin* - a release unit with a manifest and a version that the gate can grade - and to earn your first tier, continue with the next lesson:

- [Start a plugin and reach Bronze](start-a-plugin-and-reach-bronze.md) - scaffold a plugin around this skill, add the `library.json` manifest and a root `AGENTS.md`, and run the gate to see it report Bronze.

If you want the terse, reference version of the loop you just learned, see the how-to [Build and evaluate a skill](../how-to/build-and-evaluate-a-skill.md). To understand the tier ladder you are about to climb, read [Conformance and tiers](../explanation/conformance-and-tiers.md).
