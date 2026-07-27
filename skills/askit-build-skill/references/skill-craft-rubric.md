# Skill craft rubric (improve-mode phase 2)

The deterministic gate answers "does this skill obey the rules". This rubric answers the question the
gate cannot: **is this skill any good as a teacher?** It is the brief for the `askit-reviewer` subagent
dispatched by `askit-build-skill` improve mode phase 2, which runs only after the gate is already clean.
The procedure that dispatches it is in [the skill itself](../SKILL.md); the conformance bar it sits on
top of is [the authoring guide](authoring-guide.md) and [STANDARD.md](../../../STANDARD.md).

Everything produced against this rubric is **advisory**. It is rendered beside the verdict through
`evaluate.mjs --report=review` and structurally cannot move the grade or the gate exit code
(ADR 0037, the craft pass). Nothing is edited without the user's consent, and only the mechanical
subset is ever offered for an automatic fix.

## How to review

1. Read the whole skill: `SKILL.md`, every file under `references/` and `examples/`, and the
   frontmatter. Read the files, do not infer them from names.
2. Score each of the five dimensions below and say WHY, quoting the line you are judging. An
   unquoted judgment is not reviewable, and a reviewer who cannot quote the defect has not found one.
3. Verify before asserting. If a claim needs a fact you cannot check (a statute, an API shape, a
   version number), say it is unverified. Do not invent a correction. This is the recorded failure
   mode of cheap-tier review (`docs/internal/eval-runs/METHODOLOGY.md`).
4. Emit findings in the contract at the end of this page, so the partitioner can split them.
5. Never recommend a gate change from this seat. If a check looks wrong, say so as an observation;
   calibrating a check is an ADR decision made against the corpus, not an advisory call.

## The five dimensions

### 1. Description and trigger quality

The description is the only thing an agent reads when deciding whether to load the skill, so a weak
one makes a good skill invisible. The deterministic scorer (U5) is a heuristic: it rewards an action
verb, a use-when clause, and length. A description can score 1.00 and still be useless.

Judge:

- Does the description name a concrete **output** ("converts a transcript into a decision log"), not
  a vague capability ("helps with meetings")?
- Does the trigger name words a user would **actually type**? "Use when the user asks about the
  document thing" passes the scorer and names nothing. "Use when the user asks to extract decisions,
  action items, or owners from a transcript" names three real phrases.
- Is the boundary clear against neighbouring skills? Two skills whose triggers overlap will both
  fire, or neither will.
- Is it third person, present tense, free of first-person voice and unfinished placeholders?

### 2. Instruction clarity

Judge whether an agent following the body literally would produce the intended result:

- Is every step **actionable** (a verb plus an object), and is the order the order?
- Are decision points explicit? "Handle errors appropriately" is not an instruction; "if the parse
  fails, report the line number and stop" is.
- Are the exit conditions stated, so the agent knows when it is done?
- Is there exactly one procedure, or do two sections quietly disagree with each other? A skill that
  contradicts itself teaches the contradiction.
- Are tool and command invocations exact and runnable, with the real flag names?

### 3. Example depth (golden and anti-example presence)

Examples are the highest-leverage teaching surface and the first thing skipped. Judge:

- Are there at least **three golden examples** covering meaningfully different inputs, not three
  restatements of the same one?
- Is there at least **one anti-example** showing the failure the skill exists to prevent, with the
  reason it is wrong stated? A library of only golden examples teaches the shape of success and
  nothing about the boundary.
- Are the examples **real**: runnable input, plausible output, no ellipses standing in for the
  interesting part?
- Do the examples still match the current procedure, or did the body move on without them?

### 4. Reference structure

Progressive disclosure works only if the depth is findable. Judge:

- Does every `references/` file earn its place, and does the body **link to it at the moment it is
  needed**, not in a list at the bottom?
- Is the split right: `SKILL.md` carries the procedure, `references/` carries the depth? Depth
  inlined in the body burns context on every load; a procedure hidden in a reference is never read.
- Is the nesting one level deep, and does every relative link resolve from its own file?
- Does any reference duplicate content that lives in the body, giving two copies to drift apart?

### 5. Token economy

Every line in `SKILL.md` is paid for on every load. Judge:

- Is the body well inside the budget (U7 warns above 500 lines), and is what is there load-bearing?
- Is there restatement: the description repeated as an opening paragraph, a step explained twice, a
  preamble that says what the skill is about to say?
- Would moving a block into `references/` cost nothing at the point of use? If so, move it.
- Is the prose dense without being cryptic? Cutting a needed clause to save a token is a false
  economy; the goal is fewer words per instruction, not fewer instructions.

## The finding contract

Emit one object per finding. `category` is what decides whether the fix can be applied for the user,
so it is not free text: it is either one of the three **mechanical** categories or a descriptive
category of your choosing (which is treated as JUDGMENT).

```json
{
  "dimension": "reference structure",
  "category": "broken-link",
  "severity": "major",
  "file": "examples/basic.md",
  "message": "the example links to ../SKILLS.md, which does not resolve; the file is SKILL.md",
  "provenance": "objective",
  "fix": { "kind": "replace", "from": "(../SKILLS.md)", "to": "(../SKILL.md)" }
}
```

- `dimension` - one of the five above.
- `category` - the mechanical class (below) or a descriptive one for a judgment call.
- `severity` - `critical`, `major`, or `minor`.
- `file` - a path **relative to the skill directory**. Never absolute, never containing `..`.
- `message` - the defect and the reason, quoting what you are judging.
- `provenance` - `objective` (checkable against a file or a spec) or `house-preference` (a taste call).
- `fix` - required for a mechanical category, omitted otherwise.

### The three mechanical categories (SAFE)

These are the ONLY categories that can be applied for the user, and only with consent. Each needs a
complete, bounded fix descriptor: a **single-line** literal substitution of at most 200 characters, or
one allowlisted frontmatter field.

| `category` | `fix` | Use it for |
|---|---|---|
| `broken-link` | `{ "kind": "replace", "from": "...", "to": "..." }` | a relative link whose target does not resolve, where the correct target is unambiguous |
| `formatting` | `{ "kind": "replace", "from": "...", "to": "..." }` | markup that renders wrong: a heading missing its space, a broken fence, a mangled list marker |
| `missing-frontmatter-field` | `{ "kind": "add-frontmatter-field", "field": "metadata.version", "value": "0.1.0" }` | a missing bookkeeping field, one of `metadata.version`, `metadata.tier`, `metadata.audience`, `metadata.status` |

### Everything else is JUDGMENT

Any other category is reported and left alone. Do not try to route a rewrite through a mechanical
category: a multi-line substitution, an over-length one, or a `formatting` fix that changes wording is
rejected by the partitioner and reported as JUDGMENT anyway. Rewriting a description, sharpening a
trigger, restructuring steps, adding an example, and moving content into `references/` are all
JUDGMENT, whatever their category says. Use plain, descriptive category names for them
(`trigger-rewrite`, `instruction-rewrite`, `procedure-change`, `example-gap`, `token-economy`), state
the recommended change in the message, and let the user decide.

Judgment findings are not second class. They are the reason the craft pass exists: a sharper trigger
is worth more than a fixed typo. They are simply the user's call, not the tool's.
