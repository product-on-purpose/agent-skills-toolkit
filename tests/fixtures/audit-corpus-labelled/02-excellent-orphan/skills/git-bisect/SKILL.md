---
name: "git-bisect"
description: "Finds the commit that introduced a regression by driving git bisect with an automated test command and reporting the culprit with its diff. Use when a test that used to pass now fails, when the user asks which commit broke something, or mentions bisecting, regression hunting, or 'when did this start'."
metadata:
  version: "0.1.0"
  tier: universal
  status: active
---

# git-bisect

## Purpose

Find the first bad commit between a known-good and a known-bad ref by letting `git bisect run` drive the search with a test command, then report the culprit commit with its diff and the reasoning.

## Inputs to establish first

1. A `good` ref where the behavior was correct (a tag, a sha, or "the last release"). If the user does not know one, propose `git log --oneline -30` and ask them to pick the oldest commit they trust.
2. A `bad` ref (default `HEAD`).
3. A command that exits 0 when the behavior is correct and non-zero when it is broken. Prefer the narrowest test: one test file, one test name. If none exists, write a throwaway script under `/tmp` that reproduces the report and exits by its outcome, and show it to the user before running.

## Procedure

1. Confirm the working tree is clean (`git status --porcelain`); stash or refuse if it is not, because bisect checks out commits.
2. Sanity-check the endpoints before bisecting: run the command at `bad` (must fail) and at `good` (must pass). If either check does not behave, stop and say so; bisecting on a flaky or mis-specified command wastes every step.
3. Run `git bisect start <bad> <good>` then `git bisect run <command>`. Use `git bisect skip` semantics via exit code 125 when a commit cannot be built.
4. Read the "is the first bad commit" line. Capture `git show --stat <sha>` and the relevant hunk.
5. Always run `git bisect reset` afterwards, even on failure, so the user is back on their branch.

## Report

- The culprit sha, author, date, and subject.
- The hunk most likely responsible, with one sentence on why.
- The exact commands used, so the user can reproduce.
- If the culprit is a merge commit, say so and offer to bisect the merged branch with `--first-parent` off.

See [edge cases](references/edge-cases.md) for flaky tests, submodules, and untestable ranges.

