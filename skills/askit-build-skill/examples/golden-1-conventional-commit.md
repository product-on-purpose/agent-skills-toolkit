# Golden example: a bounded single-purpose skill

**Demonstrates:** Decision 1 and Decision 3 of [the authoring guide](../references/authoring-guide.md) resolving toward "small, and that is correct" - one output, one file, no `references/` to create.
**Provenance:** authored by `askit-build-skill` create mode on 2026-07-26 during the SP2b metered authoring pass; raw run artifact under the gitignored `_local/audit/eval-runs/2026-07-26/`.

## Input

> "We keep getting commitlint failures on the team. Can you make me a skill that writes the commit message?"

Create-mode step 1 is the interview. Four answers plus the two decisions the answers force:

| Interview question | Answer |
|---|---|
| Skill name (kebab-case) | `conventional-commit` |
| What does it do? | Reads the staged diff and writes one Conventional Commits message for it. |
| When should it fire? | "commit this", "write a commit message", "fix this message", a commitlint rejection. |
| Trigger keywords | commit, commit message, conventional commits, commitlint, breaking change |
| Decision 1: is this one skill? | Yes. Naming the output needs no "and": the output is a message. The nearest neighbour in this plugin is `pr-description`, which reads a branch, not the index, so a user asking to "commit this" lands here and a user asking to "describe this PR" lands there. |
| Decision 3: what is the budget? | Everything stays in `SKILL.md`. The only lookup is the eleven-item type list, and step 2 cannot execute without it, so a `references/commit-types.md` would be opened on every single run. That is the definition of content that belongs in the body. |

## Output

The whole skill is one file:

```
skills/conventional-commit/
  SKILL.md
```

### `skills/conventional-commit/SKILL.md`

```markdown
---
name: conventional-commit
description: Writes a Conventional Commits message from the staged diff, choosing the type and scope and flagging a breaking change. Use when the user asks to commit, to write or rewrite a commit message, or to fix a message that commitlint rejected.
metadata:
  version: 0.1.0
  tier: universal
  audience: beginner
---

# conventional-commit

## Purpose
Turn the staged diff into exactly one Conventional Commits message: a `type(scope): subject` line plus an optional body and footer. One diff, one message. Splitting a diff across several commits is a different job and this skill declines it.

## When to use
When the user asks to commit, to write or rewrite a commit message, or to fix a message that commitlint rejected.

## Steps
1. Read what is staged: `git diff --cached --stat`, then `git diff --cached`. If nothing is staged, say so and stop. Never stage files on the user's behalf.
2. Pick exactly one type from `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. If two types genuinely fit, the diff is two commits: report the proposed split and stop.
3. Pick the scope: the deepest directory or package every staged path shares. If they share none, omit the scope rather than invent one.
4. Write the subject: imperative mood, lower case, no trailing period, 50 characters or fewer.
5. Add a body only when the subject cannot carry the why, wrapped at 72 characters. Add a `BREAKING CHANGE:` footer naming what broke and the migration whenever a public signature, flag, environment variable, or output shape changed.
6. Print the finished message in a fenced block and stop. Commit only if the user asks; never amend, never push.

## Exit condition
Done when one message is printed and the user has it. If step 1 found nothing staged or step 2 found two types, the correct output is the explanation and no message.
```

Samples are the recommended next addition (Standard sec 7.2 asks for at least 3 golden plus 1 anti); create-mode step 4 treats them as optional at Bronze and this run did not author them.

## Why this is golden

- **Decision 1 was made and written down.** The interview records the one-line boundary against the nearest neighbour, which is the only place that reasoning ever gets recorded: no deterministic check compares trigger surfaces across skills, so two overlapping descriptions both pass with 0 errors.
- **Decision 3 resolved to "no `references/`" for a stated reason.** The body is 20 lines after the frontmatter, far inside the `U7` instruction budget, and the one lookup it carries is executed rather than consulted, which is the test the guide's split table applies.
- **The description names an output and real utterances** (commit, commit message, commitlint, breaking change), satisfying the sec 8.1 what-plus-when bar rather than only the `U5` arithmetic. Measured below.
- **Every step is a verb plus an object, and two steps say when to stop and ask** (nothing staged, two types fit). Standard sec 3.1 plus rubric dimension 2, which grades whether an agent following the body literally would produce the intended result.
- **The layout is the sec 10.2 minimum and nothing more:** `SKILL.md` canonical, `name` equal to the directory (`U4`), frontmatter parses with a `description` present (`U3`), `metadata.version` present (sec 3.7).

## Verification

The artifact was written to a scratch directory named for the skill, then graded with the same command create-mode step 6 runs.

```
$ node scripts/evaluate.mjs _local/audit/eval-runs/2026-07-26/conventional-commit --json
{
  "scope": "component",
  "target": "_local/audit/eval-runs/2026-07-26/conventional-commit",
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

The `U5` score of the authored description:

```
$ node -e "import('./scripts/checks/description-score.mjs').then(m=>console.log(m.scoreDescription('Writes a Conventional Commits message from the staged diff, choosing the type and scope and flagging a breaking change. Use when the user asks to commit, to write or rewrite a commit message, or to fix a message that commitlint rejected.')))"
0.9999999999999999
```

That is the raw float; `U5` reports it as `1.00` because the check formats with `toFixed(2)`. Read [the anti-example](anti-vague-description.md) before treating 1.00 as the objective.

Create-mode step 5 (`gen-manifest.mjs`) was not run: this artifact is an example, not a component registered in a plugin manifest.
