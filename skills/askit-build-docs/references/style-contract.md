# The documentation style contract

This is the shape and the measurable floor for every published page under `docs/`, plus
`README.md`, `QUICKSTART.md` and `AGENTS.md`. It exists so that two people, or two
sessions of the same agent, write pages that read as one product.

## Why a contract rather than a description

"Make it clearer" is an adjective. Adjectives do not survive a handoff.

This was learned the expensive way on 2026-08-24. A documentation sweep was asked for in
the words "plain English", turned into a sentence-length metric, and measured against a
corpus whose median sentence was already 12 words. The metric was satisfied and the
pages were still hard to read, because the real defect was structural: a section that
gave the specification of a thing before saying what the thing was.

So every rule below is either something a script counts, or is explicitly marked as
judgment. Nothing in between.

## Layer 1: the page anatomy

Each Diataxis quadrant has a required shape. The quadrant is the folder.

### `docs/explanation/` - pages for understanding

A reader arrives here not knowing what the subject is. Detail before orientation
strands them.

1. **Orientation first.** The page opens with prose that says who it is for and what the
   subject is. Never a code fence, a table or a bare definition list.
2. **Every `##` section makes the three moves, in order.**
   - Say what the thing is, in words a newcomer can hold.
   - Say what breaks without it, or what it makes possible.
   - Then give the mechanism.
3. **Coined words are defined where they first appear**, and the page links the glossary.
4. **A closing section points onward** with links.

The three moves are the load-bearing part. A section that opens with "X is an ES module
with exactly two exports" has told a reader who already knows what X is something they
could have read in the source.

### `docs/tutorials/` - pages for learning

1. **What the reader will have at the end**, in one sentence, before anything else.
2. **Prerequisites**, stated rather than assumed.
3. **Numbered steps, each with a way to check it worked.** A step with no verification is
   a step a beginner cannot tell they failed.
4. **A closing statement of what they can now do.**

### `docs/how-to/` - pages for a task

1. **The goal in one sentence, worded as an outcome.**
2. **The steps**, each with a deterministic verification.
3. **A pointer to troubleshooting.**

A how-to page is read by someone already mid-task. Orientation here is one sentence, not
three paragraphs.

### `docs/reference/` - pages for looking something up

1. **One sentence defining the subject.**
2. **Then the table or the specification.**

Detail-first is correct in this quadrant. The orientation rule is satisfied by a single
sentence, and padding a reference page with explanation makes it worse, not better.

## Layer 2: the measurable floor

Counted by `doc-style-report.mjs`. **Report-only.** These thresholds gate nothing, and
they should not until the numbers have been watched across a full sweep.

| quadrant | stacked sentences | paragraphs over 400 chars | heavy parentheticals |
| --- | --- | --- | --- |
| `explanation` | 8% or less | 2 or fewer | 5 or fewer |
| `tutorials` | 8% or less | 2 or fewer | 5 or fewer |
| `how-to` | 12% or less | 1 or fewer | 4 or fewer |
| `reference` | 15% or less | 2 or fewer | 4 or fewer |

Definitions:

- A **stacked sentence** carries two or more idea-joins. An idea-join is a semicolon, a
  mid-sentence colon, a " - " aside, or a parenthetical. This is the one-idea-per-sentence
  rule, made countable.
- A **heavy parenthetical** is a parenthetical over 40 characters. Short ones are house
  style here, because a reference ID is required to carry a parenthetical handle. Long
  ones are where a reason hides instead of standing in its own sentence.

The numbers are where the first rewritten page landed, rounded outward. They are a
starting point to be tuned from evidence, not a law.

### Three separator forms that are NOT idea-joins

Each of these was a false positive that inflated the count before it was fixed. Any
future counter must keep exempting them.

- `**Term** - meaning`, the definition-list form used by the glossary and every inventory.
- `- **Cause:** explanation`, the label form used by troubleshooting and reference pages.
  Exempting this alone removed 74 false hits from an 89-page corpus.
- `ADR 0044 (what it is)`, the reference-ID handle that the rules below REQUIRE. Counting
  it as buried reasoning makes the instrument penalise the rule it is enforcing.

## Layer 3: voice, which is not deterministic

Voice cannot be counted, so it is constrained by example and by vocabulary rather than by
adjective.

**The exemplar.** [`docs/explanation/architecture-internals.md`](../../../docs/explanation/architecture-internals.md)
is the worked reference for an explanation page. Read its opening and its "A check
module's shape" section before writing one.

**Vocabulary rules**, all of which a script can check:

1. **No internal planning vocabulary.** Wave numbers, packet names and phase numbers mean
   nothing outside this repository, and they rot. One page told readers to wait for a
   phase that had shipped three months earlier.
2. **No bare reference ID.** Never `E14` alone. Write what it is and link where it lives.
   A reader cannot look up a number they have no index for.
3. **A coined word is defined in the sentence that first uses it**, and the page links
   the glossary. The vocabulary of coined words is not a hand-maintained list: it is the
   set of bolded terms in [the glossary](../../../docs/explanation/glossary.md), so it
   stays correct as the glossary changes. Product words such as Bronze, Silver, Gold and
   tier are excluded, because those need no gloss.
4. **Every command runs from the reader's position.** A page written for a plugin author
   must not name `node scripts/*.mjs`, because that path exists only in a clone while the
   install docs send people to npm or the marketplace.

**Judgment, explicitly.** Whether a sentence earns its place, whether an example is the
right one, and whether an explanation is honest are not checkable and are not pretended
to be.

## The process, which is what makes it reliable

The same three steps run on every file, whoever writes it.

1. **Measure before.**
2. **Rewrite.**
3. **Measure after, report the delta, and run a fact-preservation diff.**

Step 3 is not optional and it is not a formality. An author cannot honestly assess
whether their own prose became clearer, and an agent least of all. It can compare two
numbers and show a diff. This is the same reason the conformance gate exists instead of a
review.

The fact-preservation diff matters most in this particular kind of edit. Unstacking a
sentence means moving facts out of brackets into new sentences, which is exactly where a
check ID, a version, a command or a link target quietly mutates.

## Two mechanical facts about editing these files

- **Edit in place. Never rewrite a whole file.** Git stores this repository's markdown
  with CRLF. Writing LF content produces a whole-file diff even when no character
  changed, which makes the rewrite unreviewable. This was measured, not assumed:
  `core.autocrlf=true` does not save you.
- **`INDEX.md` is generated** by `gen-index.mjs` and drift-checked by `G4`. Its prose
  lives in the generator. `AGENTS.md` is partly generated: `sync-agents-md.mjs` owns the
  component-map block and the rest is hand-authored.

## What is deliberately not covered

- `CHANGELOG.md` and release notes before v1.14. They are dated records and correctly
  state the numbers of their own day.
- `STANDARD.md` normative text, which requires maintainer merge authority.
- `skills/` and `templates/`. A golden or anti example legitimately quotes the spine of
  the day it was written, and rewriting one would falsify the example.
- The generated half of the docs site, which follows from fixing `docs/`.
