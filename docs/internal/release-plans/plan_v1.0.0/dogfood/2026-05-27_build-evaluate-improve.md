# Dogfood: build-evaluate-improve loop
Date: 2026-05-27
Executor: claude-sonnet-4-6 (Claude Code agent)
Issue: #24 (Phase 2 behavioral dogfood)

---

## What was tested

The full create -> evaluate -> improve -> re-evaluate loop, following
`skills/askit-build-skill/SKILL.md` and `skills/askit-evaluate/SKILL.md`
literally, using `skills/tmp-demo-skill/` as the throwaway target.

---

## BEFORE: mediocre description

```
description: Helps with demo stuff.
```

### evaluate report (before)

```json
{
  "scope": "component",
  "target": "skills/tmp-demo-skill",
  "findings": [
    {
      "check": "description-score",
      "severity": "warn",
      "message": "description scores 0.00 (< 0.7); state what it does AND when to use it, with concrete trigger keywords (Standard sec 8.1).",
      "file": "tmp-demo-skill/SKILL.md",
      "reqId": "U5"
    }
  ],
  "summary": { "errors": 0, "warns": 1 }
}
```

Finding: 1 warn, U5 (description-score = 0.00). Expected finding surfaced correctly.

---

## AFTER: improved description

```
description: Produces a minimal demonstration output for testing the
build-evaluate-improve loop. Use when running a dogfood or smoke test
that needs a throwaway skill to scaffold, evaluate, and then delete.
```

### evaluate report (after)

```
Evaluating (component): skills/tmp-demo-skill
0 error(s), 0 warning(s).
```

JSON:
```json
{
  "scope": "component",
  "target": "skills/tmp-demo-skill",
  "findings": [],
  "summary": { "errors": 0, "warns": 0 }
}
```

---

## Friction / ambiguity findings

These are the key deliverable - honest notes on where the SKILL.md
instructions were clear or not.

### askit-build-skill (create mode)

**Step 1 - interview**
The skill says "Brief interview: ask for the skill name, what it does,
when to use it, and a few trigger keywords." This is written for an
interactive human-facing session. When used by an agent following a
spec (as in this dogfood), there is no user to interview. The skill
does not address the agent-driven or batch case. Friction: MINOR - an
agent can reasonably skip the interview when it already has the inputs,
but the skill gives no explicit permission to do so.

**Step 2 - "copy templates/SKILL.md"**
Clear and correct. The template path (`templates/SKILL.md`) resolves
relative to the repo root. No ambiguity.

**Step 3 - fill frontmatter**
The instruction says "a `description` that states what AND when with
concrete keywords (see references/authoring-guide.md for the bar)."
This is accurate and the cross-reference to the authoring guide is
useful. Clear.

**Step 4 - scaffold references/**
"Scaffold `references/` if the skill needs depth." No definition of
"needs depth." For a throwaway skill this is fine to skip, but for
real skills the criterion is vague. Minor gap.

**Step 5 - "run askit-evaluate on the new skill and report the result"**
The skill says run `askit-evaluate`, but that is the skill name, not
the actual command. The concrete command (`node scripts/evaluate.mjs
<path>`) lives only in `askit-evaluate/SKILL.md` step 2. An agent
following askit-build-skill exclusively would have to know to look
there. This is a REAL gap: askit-build-skill step 5 should either
spell out the command or explicitly say "invoke the askit-evaluate
skill (see its SKILL.md for the command)".

### askit-build-skill (improve mode)

**Step 1**
"Run `node scripts/evaluate.mjs <skill> --json` and read the report."
The command is concrete and correct. Clear.

**Step 2 - remediation mapping**
The three-case mapping (samples warn, U5, U7) is helpful but
incomplete. There is no catch-all for unfamiliar rule IDs. A real
skill might produce other findings; the agent is left to guess. Minor
gap.

**Step 3 - re-run**
Clear and unambiguous.

### askit-evaluate

**Step 2**
Command given is `node scripts/evaluate.mjs <path> --json`. Clear and
executable exactly as written.

**Step 3 - "point the user at askit-build-skill in improve mode"**
Fine for human-facing sessions. In an agent loop this step is a no-op
(the agent itself IS the user). Not a defect, just a context mismatch.

### Overall verdict

The loop works end-to-end. The scripts are correct. The biggest
friction point is askit-build-skill step 5 using "run askit-evaluate"
(the skill name) rather than the actual shell command - an agent that
has only read askit-build-skill cannot infer the command string without
also reading askit-evaluate. Everything else is either clear or minor.

Recommendation: in askit-build-skill step 5, add the literal command:
  "Run `node scripts/evaluate.mjs skills/<name> --json` and report
  the result; iterate until it passes."

---

## Outcome

- tmp-demo-skill created, evaluated (1 U5 warn), description improved,
  re-evaluated (0 errors, 0 warns), then deleted.
- Repo left green: npm test and node scripts/check.mjs both pass.
- No permanent artifacts committed.
