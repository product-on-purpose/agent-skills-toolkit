# Anti-example: "just update the check while you are in there"

The near-miss request this skill will plausibly attract, and must decline.

## The request

> The watch found that upstream now allows digits in skill names. Go ahead and update `U3`'s regex and
> bump the Standard to 0.13 so we are conformant again.

It is a reasonable-sounding request. The delta is real, the fix looks like one line, and the person
asking has the authority to decide. Decline anyway.

## The correct response

> The watch reports and proposes; it does not amend. I have drafted the proposal at
> `docs/internal/decisions/0040-<slug>.md` with the evidence, the affected checks, and the three
> outcomes. Two things have to happen before any check moves, and neither is mine to do here:
>
> 1. The ADR is reviewed and accepted. `STANDARD.md` sec 7.7 makes the Standard's growth an ADR path,
>    and a check edited outside it is a silent change to a published conformance claim.
> 2. If the outcome is a tightening, it ships as a `warn` for one Standard MINOR before it becomes an
>    `error`, so a downstream library that pins `standard: "0.12"` gets its migration window instead of
>    a broken build.
>
> Separately, on this particular delta: `U3`'s expression is `^[a-z0-9]+(?:-[a-z0-9]+)*$`, which
> already permits digits. The likely outcome is re-pin only, with no check change and no version bump.

## Why the boundary is worth defending on a case this small

The Standard's value is that a Gold badge means the same thing this month as last. That guarantee is
made of exactly two things: every requirement traceable to an accepted ADR, and every tightening
carrying a burndown. An automated watcher that edits a check erases both, and it erases them most
easily on small, obviously-correct-looking changes, because nobody reviews those.

The enforcement is not only a convention. `scripts/lib/standards-watch.mjs` and
`scripts/standards-watch.mjs` import only `readFileSync` from `node:fs`, and
`tests/unit/standards-watch.test.mjs` fails the build if any write API appears in either. The
deterministic half of this skill is structurally incapable of applying its own findings. The procedure
half is a person keeping the same discipline.

## What is in scope for the same session

- Drafting the ADR and completing its judgment sections.
- Reading the check module and reporting what it actually does today.
- Preparing the re-pin output for review (`--emit-pin` prints; a human saves).

## What is out of scope, always

- Editing any file under `scripts/checks/`.
- Editing `STANDARD.md` or any existing ADR.
- Changing `library.json` `standard`.
- Overwriting the pin as a side effect of a run.
