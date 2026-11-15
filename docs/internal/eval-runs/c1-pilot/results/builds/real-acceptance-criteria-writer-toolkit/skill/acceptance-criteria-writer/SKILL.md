---
name: acceptance-criteria-writer
description: Creates testable acceptance criteria from a short feature request, in Given/When/Then form, with open questions and an out-of-scope list. Use when the user asks for acceptance criteria, a definition of done, what "done" means for a feature, how a tester would know a request is finished, or how to verify a user story.
metadata:
  version: 0.1.0
---

# acceptance-criteria-writer

## Purpose
Convert a feature request (a sentence, a user story, a ticket blurb) into acceptance criteria a tester can pass or fail. Never ask the user questions: decide, and record gaps as open questions.

## When to use
The user wants acceptance criteria, a definition of done, "what does done mean for X", "how would QA know this is finished", or test conditions for a feature, even if they never say "acceptance criteria".

## Steps
1. Read the request. List every number, limit, and rule it states (counts, time limits, sizes, roles, formats). Those are the only ones you may use.
2. Draft criteria, each covering exactly one behaviour. Cover the main success path, the important variations, and at least one failure path (invalid input, denied access, service error, limit exceeded).
3. Write each as `AC-n` (AC-1, AC-2, ...) with three lines: **Given** a state, **When** one action or event, **Then** one observable result. Results must be checkable by a tester: a message shown, a status, a record saved. No "and" chaining two behaviours.
4. Never invent a number, limit or rule the request does not state. If a criterion needs one (password length, timeout, retry count, expiry), write the criterion in terms of the unstated value ("the configured limit") and add an Open question naming that criterion by ID, e.g. `AC-4: what is the maximum attempts before lockout?`.
5. Stay inside the request. Do not add behaviour it neither states nor plainly implies (audit logs, counter resets, notifications, file layouts, exact message wording, escaping rules). If you think one is needed, put it in Open questions against the nearest criterion, or in Out of scope. Failure paths must come from the request's own rules (invalid input, denied, over limit, service unavailable), and their Then states only the observable outcome.
6. One behaviour means one When and one Then. The When is a single event (move conditions such as "and the total reaches the limit" into Given). A Then with "and" joining two checks is two criteria, or cut it to the one that matters. Do not add criteria about wording of messages, counting rules, or who the data belongs to unless the request states them. If the request wants a quality that is not measurable as written (fast, easy, intuitive), write at most one criterion that points at the unstated measure, and raise the measure in Open questions.

7. Keep to at most eight criteria. Merge or drop the weakest and move dropped ones to Out of scope. Four to six sharp criteria is typical; do not pad to eight.
8. Do not use the words fast, easy, simple, intuitive, or user-friendly anywhere in a criterion. Replace vague quality with an observable result; if a measurable value is needed but not given, it goes to Open questions.
9. Check before answering: IDs sequential, one behaviour each, at most 8, at least one failure path, banned words absent (also check "quickly", which signals the same vagueness), every unstated value has an Open question, Out of scope has at least one item.

## Output format
Use exactly this structure:

```
## Acceptance criteria

**AC-1** Given ..., When ..., Then ...
**AC-2** ...

## Open questions
- AC-n: <the missing number, limit or rule>

## Out of scope
- <something the criteria deliberately do not cover>
```

Always include both the `Open questions` and `Out of scope` headings. If nothing is unstated, write under Open questions: `None: the request states every value the criteria rely on.` Out of scope always has at least one real item (for example performance targets, accessibility, related features, migration of existing data).

See [references/example.md](references/example.md) for a worked example.
