# Skill authoring guide (reference)

The decisions you make **while writing** a skill, in the order you make them, and the reasoning behind
each. It is the entry document; [skill-craft-rubric.md](skill-craft-rubric.md) is the exit test (what a
reviewer grades the finished skill against in improve-mode phase 2), and
[STANDARD.md](../../../STANDARD.md) is the contract both answer to. Each decision below ends by naming
the rubric dimension that will later judge it, so the two compose: this page says how to choose, the
rubric says how to score. Neither restates the other.

If you read one thing: the gate can tell you a skill obeys the rules; only these five decisions
determine whether it is any good.

## Decision 1: is this one skill?

Principle 1 (sec 1) is composable over monolithic: each component does one thing and is usable
independently. The authoring test is the description sentence. If naming the output needs an "and"
that joins two different outputs, you have two skills. If it needs an "and" that joins an output and
its format, you have one.

The reason this decision cannot be deferred is that **nothing downstream catches it**. `U5`
(description-score) scores each description in isolation; no deterministic check compares trigger
surfaces across skills, and none is planned (a description-similarity check is recorded as needing
careful design against false positives). Two skills whose triggers overlap will both fire, or neither
will, and the gate will report 0 errors either way.

This is not hypothetical. Sensor reading 11 in [eval-runs.md](../../../docs/internal/eval-runs/eval-runs.md)
records it as the advisory layer's most distinctive value-add precisely because the gate is blind to
it: an Opus review of `RefoundAI/lenny-skills` found `ai-evals` and `building-with-llms` satisfying
the same query about equally, and a Sonnet review of `deanpeters/Product-Manager-Skills` found
`create-a-map` and `run-a-workshop` routing ambiguously. Both libraries were otherwise well built.

Before writing, list the skills already in the plugin and say in one line why a user's query lands on
this one and not on its nearest neighbour. If you cannot, merge or re-scope. *(Graded later under
rubric dimension 1.)*

## Decision 2: the description

The `description` is the only thing an agent reads when deciding whether to load the skill (sec 8.1).
Everything else in the skill is downstream of it being read at all.

### What the scorer actually computes

`U5` is a warn-only heuristic ([description-score.mjs](../../../scripts/checks/description-score.mjs)),
and knowing its arithmetic saves you from the two ways authors get it wrong:

| Signal | Weight |
|---|---|
| An action verb from the lexicon (`creates` / `converts` / `drafts` / `reviews` / `help users <verb>` / ...) | +0.35 |
| A use-when clause (`use when`, `whenever the user`, `when you need`, `if the user asks`) | +0.35 |
| Real words and at least 8 of them | +0.20 |
| No first-person voice | +0.10 |
| A vague verb (`helps with`, `handles`, `deals with`) | -0.40 |
| An unfinished placeholder (`TODO`, `TBD`, `FIXME`, `PLACEHOLDER`) | -0.40 |
| Angle brackets | -0.10 |

Threshold 0.7. The arithmetic has one useful consequence: **a score of exactly 0.65 means you have one
of the two required signals and not the other** (0.35 + 0.20 + 0.10). That is not a curiosity - it is
the single most common description defect measured across five real corpora. Sensor readings 5 and 10
record 50 of 86 `lenny-skills` descriptions at exactly 0.65, both of the Anthropic skills sampled at
exactly 0.65, and `phuryn/pm-skills` at 0.55 to 0.65. ADR 0033
([recalibrate the U5 description scorer](../../../docs/internal/decisions/0033-recalibrate-u5-description-scorer.md))
widened the lexicon off that evidence and took the corpus-wide warn count from 98 to 18, so a warn you
see today is far more likely to be a real gap than a scorer artifact.

### Why a 1.00 is not the goal

The scorer verifies FORM. It cannot verify that the trigger names words a user would type. ADR 0037
([the builder craft pass](../../../docs/internal/decisions/0037-builder-craft-pass-and-safe-judgment-partition.md))
is built on the demonstration: `Converts a document into a summary. Use when the user asks about the
document thing.` scores **1.00** and names nothing at all.

So the order of operations matters. Write the trigger from utterances you have actually heard or can
plausibly imagine a user typing, then run the gate to confirm the form is present. Authoring to the
scorer produces exactly the 1.00-and-useless shape above.

Worked example. Starting point:

> Helps with resumes and CVs.

0.00 (five words, so the real-words signal does not apply; +0.10 for third person, then the `helps
with` penalty of -0.40 takes it below zero and it clamps). Two problems, only one of which the score
names: there is no action and no trigger, and separately, "resumes and CVs" is a topic, not an
output. Rewriting for the output and the utterance:

> Reviews a resume against a target job description and returns a prioritized gap list with suggested
> rewrites. Use when the user asks to review, critique, or tailor a resume or CV for a specific role.

1.00, and the trigger now carries four words a user would really type (review, critique, tailor, CV)
plus the qualifier that separates it from a neighbouring resume-writing skill. The score moved because
the description got better, not the other way round. *(Graded later under rubric dimension 1.)*

## Decision 3: the progressive-disclosure budget

Every line in `SKILL.md` is paid on every load; everything under `references/` is paid only when it is
opened (sec 1 principle 3). `U7` warns above 500 body lines, but treat that as a wall, not a target -
the real budget is the 150 to 200 instructions principle 2 cites as the reliable following range.

One test decides each block: **would an agent executing this procedure need this sentence in front of
it on every single run?**

| Belongs in `SKILL.md` | Belongs in `references/` |
|---|---|
| The numbered procedure and its order | Format specifications and schemas |
| Every decision point and its branch condition | Rubrics, checklists, and scoring bars |
| Exit conditions (how the agent knows it is done) | Background, rationale, and worked derivations |
| Exact commands and flags | Long tables consulted for one row at a time |
| The single sentence that says when to stop and ask | Per-variant detail where the variant is rare |

The two failure directions are symmetrical and both common: depth inlined in the body is paid on every
load forever, and a procedure hidden in a reference is a procedure that never runs. If you are unsure,
ask which mistake you would rather make on the hundredth invocation. *(Graded later under rubric
dimension 5.)*

## Decision 4: splitting into `references/`, and linking it

Split when a block is **consulted** rather than **executed**: a format, a rubric, a lookup table, a
long rationale. Do not split the procedure, the exit condition, or anything the opening paragraph
depends on.

Nesting is one level deep (sec 3.1, sec 10.2). That is not only a style rule - `U6` scans the
`SKILL.md` body and `references/*.md` at the top level only, so a file at `references/sub/deep.md` is
outside the link check as well as outside the Standard.

Link at the moment of need. A reference linked only from a list at the bottom is reached after the
agent has already guessed.

### The link trap, and why it is worth a section

A relative link resolves against **the directory of the file that contains it**, not the skill root.
A path that was correct in `SKILL.md` is one directory too shallow the moment you paste it into
`references/`:

| From | To repo-root `STANDARD.md` |
|---|---|
| `skills/<name>/SKILL.md` | `../../STANDARD.md` |
| `skills/<name>/references/guide.md` | `../../../STANDARD.md` |

This is a recorded defect class, not a theoretical one. Sensor reading 8 records a Sonnet review at
high effort confidently triaging 11 genuine `U6` errors as checker false positives, because the linked
files do exist relative to the repository root, and recommending that `U6` be weakened to resolve
against the repo tree. CommonMark and GitHub both resolve against the containing file, so those links
genuinely 404 when clicked; had the recommendation been applied it would have blinded the check to a
real class. The episode is why
[METHODOLOGY.md](../../../docs/internal/eval-runs/METHODOLOGY.md) makes verify-before-calibrate a rule.

Two more properties of [reference-links.mjs](../../../scripts/checks/reference-links.mjs) worth
knowing while you author:

- It strips fenced blocks and inline-code spans before scanning (ADR 0032, ADR 0036), so a link shown
  as an illustration inside backticks is deliberately not checked. If you want a link verified, do not
  wrap it in code.
- It does not scan `examples/`. A dangling link in a sample is invisible to the gate; ADR 0037 names
  this as one of the two gaps the craft review exists to cover. *(Graded later under rubric dimension 4.)*

## Decision 5: the evidence that ships with it

Section 7.2 recommends at least 3 golden examples plus at least 1 anti-example, and sec 8.3 recommends
a triggering eval set of at least 20 `{query, should_trigger}` cases. Both are SHOULDs, so a trivial
skill is not blocked over example count - but any sample that IS present MUST stay consistent with
current behavior, and a drifted sample is an error. Stale evidence is worse than none because it
claims a guarantee that no longer holds.

The authoring question the rubric does not answer is *which* examples. Pick the three goldens to span
the axis that actually varies for this skill (input size, input shape, or mode), not three phrasings
of the same call. Pick the anti-example from the near-miss your trigger surface will plausibly
attract: the query a user really might send that this skill should decline. That is also the case
that proves Decision 1 was made correctly. The format is in
[samples-format.md](../../askit-build-samples/references/samples-format.md). *(Graded later under
rubric dimension 3.)*

## Frontmatter and bookkeeping

- `name` MUST equal the directory in kebab-case (`U4`); `description` MUST be present and the
  frontmatter MUST parse (`U3`). These two own the identity; everything else is metadata.
- `metadata.version` is REQUIRED on every component at every tier (sec 3.7). A `HISTORY.md` is
  recommended at Bronze and required at Silver and above, and when it exists the frontmatter version
  MUST equal its latest entry.
- Layout (sec 10.2): `SKILL.md` canonical, then optional `HISTORY.md`, `README.md`, `references/`,
  `examples/`, `output/`, `evals/`, `assets/`.
- `compatibility` is how a skill declares an environment requirement, and it is what a tier claim
  reads (sec 2.4). Omit it if the skill is genuinely portable; do not use it as a notes field.

## Multi-agent emission

A plugin declares its targets in `library.json` `agent-targets` (`["claude", "codex"]`). `SKILL.md`
files are portable and shared: they live once under the plugin's `skills/` and are never duplicated
per agent, which is what anchors the Universal tier (sec 3.1). Only the native manifests differ, and
they are **generated**, never hand-edited:

    node scripts/generators/gen-manifest.mjs <plugin> --write --target=all

`--target=claude` or `--target=codex` writes just one. Three checks hold this together, and it is
worth knowing which one is talking to you: `S6` requires each declared target to have its native
manifest on disk; `U8` requires each manifest's `name` and `version` to match `library.json`, with
version drift an **error** because it is the exact invariant the release tag guard enforces; and
`U13` requires every skill on disk to be registered in the enumerating manifest and every registered
skill to exist. `U13` is new at Standard 0.12 and ships as a warn for that minor before becoming an
error at 0.13 (sec 7.7 burndown), so a warn today is a deadline, not an opinion.

The reason drift matters more than it looks: an unregistered skill ships invisibly to installers. A
real plugin was measured registering 47 of its 49 on-disk skills, so its two newest skills were
undeliverable and nobody would ever file a bug about it (sensor reading 12, now ADR 0035).

## The exit test

1. `node scripts/evaluate.mjs skills/<name> --json` until it reports 0 errors. That closes conformance.
2. Then, and only then, the craft review: the five dimensions in
   [skill-craft-rubric.md](skill-craft-rubric.md), offered as improve-mode phase 2 by
   [the skill itself](../SKILL.md). It is advisory and structurally cannot move the grade.

A skill that passes step 1 and fails step 2 is a conformant skill that teaches badly. That is the
whole reason this page and the rubric are two documents.

## See also

- [STANDARD.md](../../../STANDARD.md) - sec 1 (principles), 3.1 (skill spec), 7.2 (samples), 8.1
  (description bar), 8.3 (eval coverage), 10.2 (per-component layout).
- [Universal checks](../../../docs/reference/universal-checks.md) - what each `U#` finding means.
- [samples-format.md](../../askit-build-samples/references/samples-format.md) - the samples and
  eval-set formats.
