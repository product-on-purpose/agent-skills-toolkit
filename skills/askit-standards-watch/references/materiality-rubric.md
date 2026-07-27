# Deciding whether an upstream delta is material (reference)

The watcher splits a delta into what a parser can settle and what only a reader can. This page is for
the second half. Read it before writing a word of the ADR.

## What the tool already settled, and why you should not relitigate it

These are decided structurally, with no judgment applied, because each one is a change to a statement
the checks encode literally:

- a frontmatter field added or removed;
- a field's `Required` cell flipped;
- a field's `Constraints` cell text changed at all;
- a directory entry added, removed, or re-flagged required;
- a section heading added or removed.

A constraint rewording counts as material even when the meaning looks unchanged, on purpose. The
constraint cell is the sentence `U3` turns into a regular expression. If the wording moved, someone
should look at the regular expression, and the cost of looking is minutes.

## What is handed to you, and the trap in it

Everything else arrives as **needs a human read**: a section body whose hash moved with no structural
delta, or a change to the `skills-ref` reference implementation.

The trap is that these look trivial and sometimes are not. The worked example shipped with this skill
is a real one. Upstream commit `6868401` (2026-05-16) changed a single line:

    - May only contain unicode lowercase alphanumeric characters (`a-z`) and hyphens (`-`)
    + May only contain unicode lowercase alphanumeric characters (`a-z`, `0-9`) and hyphens (`-`)

The frontmatter table did **not** change: its `name` row already said "Lowercase letters, numbers, and
hyphens only". So the structural layer saw nothing. Only the per-section body hash caught it, and it
correctly refused to say whether it mattered. It did matter as a question (the charset a skill name may
use is exactly what `U3`'s `NAME_RE` encodes) and did not matter as a change (that expression,
`^[a-z0-9]+(?:-[a-z0-9]+)*$`, already permitted digits). Both halves of that sentence are a human's
finding, not a parser's.

Take the general lesson: **the table is the summary, the prose is the specification.** A delta can be
material in the prose and invisible in the table.

## The four questions

Answer these in order, in the ADR, once per review-class delta.

1. **Does it change what a conformant skill may contain or must contain?** A new permitted value, a
   relaxed charset, a new required file. If yes, it is material regardless of how small the diff is.
2. **Does any existing check encode the sentence that moved?** Find the check with the reqId the report
   names, open the module, and read the actual expression or threshold. Do not reason from the check's
   one-line description in the reference table.
3. **Is our behavior already correct by accident?** Very often yes, as in the example above. Record
   that finding explicitly. "Already conformant, no change" is a valid and valuable ADR outcome, and
   the pin should still be re-pinned so the next run is clean.
4. **Is it upstream tightening, or upstream clarifying?** A tightening that we must adopt goes through
   the sec 7.7 burndown: `warn` for one Standard MINOR, `error` at the next. A clarification that
   changes no requirement is a re-pin only.

## Cosmetic, and why the tool decides that one

A delta is cosmetic when the artifact's bytes moved but the extracted surface did not: page metadata,
line endings, trailing whitespace, reflowed indentation. The tool filters exactly those (CRLF to LF,
trailing whitespace per line, leading and trailing blank lines) and nothing else. Any change that
alters a word registers. So "cosmetic" here is a derived result, not an assumption, and it is safe to
act on.

## Where materiality is not yours to decide either

Two cases go back to the maintainer rather than into an ADR you write alone:

- **The extractor refused** (exit `2`, code `extraction-failed`). The upstream restructured its
  document. Nothing about the run is trustworthy, including the parts that appeared to work. The fix
  is a change to the extractor's anchors, which is a code change with its own review.
- **A `reference-implementation` artifact changed.** The executable definition of conformance moved.
  Read the upstream diff and the tests beside it; if the two disagree with the prose, the disagreement
  itself is the finding.

## Writing it down

Whatever you conclude, the deliverable is an ADR with `Status: Proposed` and a `## TL;DR`, per
[askit-decision](../../askit-decision/SKILL.md) and `G10`. It states, per delta, which of track /
re-pin only / defer applies and why. Then it stops. Applying it is a separate, reviewed change, and
[STANDARD.md](../../../STANDARD.md) sec 7.7 governs how.
