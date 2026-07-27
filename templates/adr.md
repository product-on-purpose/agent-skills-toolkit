# NNNN - short decision title

## TL;DR
- **Decision:** the choice, in one line.
- **Why:** the single most important reason, in one line.
- **Status:** Proposed | Accepted (date).

- **Status:** Proposed
- **Date:** YYYY-MM-DD
- **Deciders:** who decided

## Context and problem statement
What forces the decision; what is being decided and why it matters.

## Decision drivers
The criteria that matter, ideally weighted.

## Considered options
The options, each with a short summary.

## Decision outcome
The chosen option and the rationale; why it beats the alternatives.

## Consequences
Positive and negative; the cost to manage going forward.

## Implementation sites
The specific files and functions that carry this decision. List each one as a bullet: file path, function or export name, and one sentence saying what property of the decision it enforces. A vague entry ("the report renderer") is obviously wrong; a useful entry names the exact file and function so a future reader can open it and verify without searching.

Run `grep -rn "<key behavioral terms>" scripts/` before writing this section; do not rely on recall. A decision that constrains behavior usually has more than one implementation site, and the one you remember first is rarely all of them.

- `scripts/path/to/file.mjs` - `functionName()`: enforces ...
- `scripts/path/to/other.mjs` - `otherFunction()`: enforces ...

ADRs whose decisions are governance-only (scope, naming, process) and have no code implementation need only say "No code implementation sites; this is a governance or structural decision."
