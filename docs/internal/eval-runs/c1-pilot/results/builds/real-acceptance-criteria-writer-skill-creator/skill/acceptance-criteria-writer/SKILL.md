---
name: acceptance-criteria-writer
description: Turns a short feature request into testable acceptance criteria in Given/When/Then form, with open questions and out-of-scope sections. Use whenever someone gives a feature request, user story, ticket or one-line idea and wants acceptance criteria, a definition of done, "what done looks like", test conditions, or asks how a tester or QA would know the work is finished or verify it — even if they never say "acceptance criteria".
---

# Acceptance criteria writer

Convert a short feature request into criteria a tester can pass or fail without interpretation. The house conventions below are fixed because downstream tooling and reviewers rely on them.

## Output format

Produce exactly these sections, in this order:

1. A one-line restatement of the feature (heading `## Feature`).
2. `## Acceptance criteria` — the criteria.
3. `## Open questions`
4. `## Out of scope`

### Rules for criteria

- ID each one `AC-1`, `AC-2`, … in sequence.
- Write each as three labelled parts: **Given** (state/precondition), **When** (one trigger), **Then** (observable result).
- One behaviour per criterion, which in practice means one outcome in the Then. A Then such as "login is refused, no session is created and a message is shown" is three checks wearing one ID; a tester cannot report which part failed. Pick the single outcome that defines the behaviour ("login is refused"), and either split the others into their own criteria when they matter enough or leave them to Out of scope. Failure paths are where this slips most ("an error is shown and no file is downloaded"). Choose the one result that proves the failure was handled, and give the other half its own criterion if it matters. Describing one outcome precisely is fine ("the list shows only entries containing the typed text").
- Maximum eight criteria. When the request implies more, keep the most important behaviours and put the rest under Out of scope.
- Include at least one failure-path criterion (invalid input, denied permission, service error, empty state, and so on), whichever the request makes most relevant.
- Make every Then observable and checkable: a message shown, a state changed, a value returned, a record written. Never use the words "fast", "easy", "simple", "intuitive" or "user-friendly" in a criterion; they are untestable. Replace them with a measurable condition only if the request supplies one; otherwise raise an open question (see below). Avoid them in the rest of the output too, unless quoting the requester inside Open questions is unavoidable, in which case rephrase instead.

### Never invent numbers, limits or rules

If a criterion would need a number (timeout, max length, count, duration, size), a limit, or a business rule (who is allowed, what format, what happens on conflict) that the request does not state, do not pick one. Write the criterion in terms that do not need the value (e.g. "exceeds the maximum password length" rather than "exceeds 64 characters"), and add an entry under `## Open questions`:

`- Q1 (affects AC-3): What is the maximum allowed length?`

Each entry is one question and names at least one dependent criterion by ID (`affects AC-3`). An entry with no criterion to point at, such as "affects the whole ticket", does not belong here: either find the criterion it changes, or if it only concerns work you excluded, put it in Out of scope. Ask the handful of questions that would change a test result most (around six at most) rather than every conceivable gap, and do not bundle several questions into one entry. If nothing is missing, still include the heading with a line saying no open questions remain — but think hard first; most short requests leave gaps. Reasonable defaults that are not numbers or rules (for example, "an error message is shown") are fine.

### Out of scope

List at least one item the criteria deliberately leave out — adjacent behaviour, non-functional concerns (performance, accessibility, analytics), other platforms, or behaviours cut by the eight-criterion cap. Give a short reason when helpful. Never leave this section empty.

## Working method

1. Identify the actor, the trigger and the outcome in the request.
2. List candidate behaviours: the main success path, variations, and failure paths.
3. Pick the most testable up to eight; move the rest to Out of scope.
4. Scan each criterion for any specific value you did not get from the request. Remove it and log an open question.
5. Re-check each Then for a single outcome, and each open question for a single question with an AC ID.
6. Re-check against the rules: IDs, Given/When/Then, one behaviour each, ≤8, a failure path, no banned words, Open questions reference AC IDs, Out of scope non-empty.

Respond with the document only, no preamble about the process. Do not ask the requester questions; the Open questions section is where uncertainty goes.

## Example

Request: "Let users reset their password by email."

## Feature
A user who forgot their password can reset it through a link sent by email.

## Acceptance criteria
**AC-1**
- **Given** a registered user on the login page
- **When** they submit their registered email in the "Forgot password" form
- **Then** a reset email is sent to that address.

**AC-2**
- **Given** a reset email has been sent
- **When** the user opens the link before it expires and submits a valid new password
- **Then** the account password is changed to the submitted value.

**AC-3**
- **Given** a reset link that has passed its expiry time
- **When** the user opens it
- **Then** the password is not changed.

**AC-4**
- **Given** an email address that matches no account
- **When** it is submitted in the "Forgot password" form
- **Then** the page shows the same confirmation message as in AC-1.

## Open questions
- Q1 (affects AC-3): How long is a reset link valid?
- Q2 (affects AC-2): What password rules apply to the new password?

## Out of scope
- Resetting via SMS or security questions.
- Rate limiting of reset requests.
