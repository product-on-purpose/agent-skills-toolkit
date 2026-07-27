# Anti-example: the vague description, and the 1.00 that is worse

**Demonstrates the mistake:** shipping a skill whose description names a topic instead of an output and a trigger, and then the deeper mistake of authoring to the `U5` scorer until it reads 1.00 without the description getting any more findable.
**Provenance:** authored by `askit-build-skill` create mode on 2026-07-26 during the SP2b metered authoring pass; raw run artifact under the gitignored `_local/audit/eval-runs/2026-07-26/`.

## Input

> "We have a pile of on-call runbooks. Make me a skill for our runbooks."

The request names a topic and no output, and the interview was skipped: no name, no output, no utterances, no boundary against the neighbouring skill. What follows is what create mode produces when the interview is skipped and the request is transcribed instead.

| Interview question | What was recorded |
|---|---|
| Skill name (kebab-case) | `runbook-helper` |
| What does it do? | (not asked) "runbook stuff" |
| When should it fire? | (not asked) |
| Trigger keywords | (not asked) |
| Decision 1: is this one skill? | (not asked) |

## The wrong output

**This artifact is WRONG. Do not copy it.** It is reproduced only so the defect is recognizable, and it is followed by the corrected version.

### `skills/runbook-helper/SKILL.md` (wrong)

```markdown
---
name: runbook-helper
description: Helps with runbooks and other operational documentation the team needs.
metadata:
  version: 0.1.0
---

# runbook-helper

## Purpose
This skill helps with runbooks. It can write new ones, review existing ones, and handle related
operational documentation as needed.

## When to use
Whenever runbook work comes up.

## Steps
1. Understand what the user wants.
2. Handle the runbook appropriately.
3. Return the result.
```

## Why it is wrong

- **The description names a topic, not an output.** "Runbooks" is a subject area. A user asking "turn this runbook into steps I can run" has no way to know whether that lands here, and neither does the agent, which reads the description and nothing else (Standard sec 8.1).
- **It fails Decision 1's "and" test.** "Write new ones, review existing ones, and handle related documentation" joins three different outputs. That is three skills whose trigger surfaces will overlap, and no deterministic check compares descriptions across skills, so all three would ship at 0 errors.
- **No step is actionable.** "Understand what the user wants", "handle the runbook appropriately", "return the result" are the shape of a procedure with the procedure removed. There is no decision point, no exit condition, and no way to tell whether a run succeeded (rubric dimension 2).
- **The vague-verb penalty is the smallest of its problems.** "Helps with" costs 0.40 in the scorer, which is what makes this one visible. The three defects above cost nothing and are worth more.

## What the builder does instead

Run the interview, name one output, and write the trigger from utterances a user would type. The "and" in the original splits: this skill converts, and a sibling `runbook-review` judges. Only the converter is authored here.

### `skills/runbook-to-checklist/SKILL.md` (corrected)

```markdown
---
name: runbook-to-checklist
description: Converts an on-call runbook into a numbered checklist an agent can execute, flagging every step that needs a human decision or a credential. Use when the user asks to turn a runbook into steps, automate a runbook, or find the manual gates in an on-call procedure.
metadata:
  version: 0.1.0
  tier: universal
  audience: intermediate
---

# runbook-to-checklist

## Purpose
Read one runbook and emit the executable form of it: numbered steps, each with its command, its
expected result, and a marker on every step a machine must not take alone. Reviewing whether a runbook
is any good is the neighbouring skill `runbook-review`; this one only changes the form.

## When to use
When the user asks to turn a runbook into steps, automate a runbook, or find the manual gates in an
on-call procedure.

## Steps
1. Read the runbook. If it names a system you cannot inspect, keep going and mark the affected steps
   `unverified`; do not guess a command.
2. Split the prose into steps. One action per step. A sentence with "and then" is two steps.
3. For each step, record the command, the expected result, and the rollback. A step with no observable
   expected result is not executable: mark it `needs-signal` and say what would have to be observable.
4. Mark the gates. A step needs a human when it takes a credential, deletes data, changes customer
   traffic, or costs money. Marked steps stop the run and ask.
5. Emit the checklist, then list the `unverified`, `needs-signal`, and gated steps as open questions
   for the runbook owner.

## Exit condition
Done when every step carries a command and an expected result or an explicit marker naming what is
missing, and the open-questions list is either empty or written out.
```

### The measured ladder

Four descriptions, one skill, every score produced by the command shown under it.

| # | Description | Score | What changed |
|---|---|---|---|
| 1 | Helps with runbooks and other operational documentation the team needs. | `0` | The shipped defect: a vague verb, no output, no trigger. |
| 2 | Converts an on-call runbook into an executable checklist. | `0.65` | An action verb arrived. The trigger did not. |
| 3 | Converts an on-call runbook into a numbered checklist an agent can execute, flagging every step that needs a human decision or a credential. Use when the user asks to turn a runbook into steps, automate a runbook, or find the manual gates in an on-call procedure. | `0.9999999999999999` | The corrected description. Names an output and four utterances. |
| 4 | Produces a runbook artifact from the provided input. Use when the user asks about the runbook workflow. | `0.9999999999999999` | Scores the same as 3 and names nothing. |

```
$ node -e "import('./scripts/checks/description-score.mjs').then(m=>console.log(m.scoreDescription('Helps with runbooks and other operational documentation the team needs.')))"
0
$ node -e "import('./scripts/checks/description-score.mjs').then(m=>console.log(m.scoreDescription('Converts an on-call runbook into an executable checklist.')))"
0.65
$ node -e "import('./scripts/checks/description-score.mjs').then(m=>console.log(m.scoreDescription('Converts an on-call runbook into a numbered checklist an agent can execute, flagging every step that needs a human decision or a credential. Use when the user asks to turn a runbook into steps, automate a runbook, or find the manual gates in an on-call procedure.')))"
0.9999999999999999
$ node -e "import('./scripts/checks/description-score.mjs').then(m=>console.log(m.scoreDescription('Produces a runbook artifact from the provided input. Use when the user asks about the runbook workflow.')))"
0.9999999999999999
```

Rung 2 is the arithmetic the authoring guide calls out: 0.65 is exactly one of the two required signals present (0.35 action plus 0.20 length plus 0.10 third person), and it is the single most common description defect measured across the corpora.

Rung 4 is the point of this anti-example. It has the same score as the corrected description and is useless: nobody types "the runbook workflow", it names no verb a user would say, and it does not distinguish this skill from `runbook-review`. **The score verifies form; it cannot verify that the trigger names words a user would type.** Write the trigger from real utterances first, then run the scorer to confirm the form is there. Doing it in the other order produces rung 4.

## How to detect it

Grading the wrong skill exactly as create-mode step 6 does:

```
$ node scripts/evaluate.mjs _local/audit/eval-runs/2026-07-26/runbook-helper --json
      "message": "description scores 0.00 (< 0.7); state what it does AND when to use it, with concrete trigger keywords (Standard sec 8.1).",
      "file": "SKILL.md",
      "reqId": "U5",
      "provenance": "house",
      "effectiveSeverity": "warn",
  "summary": {
    "errors": 0,
    "warns": 1
  },
```

And the corrected skill:

```
$ node scripts/evaluate.mjs _local/audit/eval-runs/2026-07-26/runbook-to-checklist --json
{
  "scope": "component",
  "target": "_local/audit/eval-runs/2026-07-26/runbook-to-checklist",
  "findings": [],
  "byRule": {},
  "summary": {
    "errors": 0,
    "warns": 0
  },
  "profile": "askit-library",
  "mode": "local"
}
```

**What the gate catches:** one warning. `U5` scores the description at 0.00 and says so. That is the whole of it.

**What the gate cannot catch:**

- **The verdict.** `U5` is a warn, never an error (Standard sec 8.1 requires this: description quality is judgment, so a heuristic must not hard-gate). The wrong skill above exits 0 errors and ships.
- **The overlap.** Nothing compares the trigger surfaces of two skills. Split `runbook-helper` into three skills with near-identical descriptions and the gate still reports 0 errors.
- **The empty procedure.** No check reads whether a step is actionable. "Handle the runbook appropriately" is a passing line of markdown.
- **Rung 4.** A description can score 1.00 and name nothing at all. There is no arithmetic that separates rung 3 from rung 4; only a reader can.

The last three are the craft review's territory, not the gate's: improve mode phase 2 ([the skill](../SKILL.md), step 3) dispatches a reviewer against [the craft rubric](../references/skill-craft-rubric.md), whose dimension 1 asks precisely whether the trigger names words a user would actually type. The review is advisory and cannot move the verdict, which is the point: the gate reports what is checkable, and a human decides the rest.
