# W1 - the `foundation/` layout ADR: what it must decide

**Input to the ADR, not the ADR.** This states what has to be settled and what evidence exists for each,
so the ADR can be written as a decision rather than a discovery. ADR-first per the v1.14.0 pattern, where
measurement overturned three of seven recommendations **before** implementation began.

## Already decided, and not reopened by the ADR

**The name is `foundation/`** - maintainer, 2026-08-19. The ADR records the reasoning rather than
re-deriving it:

- **No industry-standard term fits.** Checked, not assumed.
- **`corpus/` is already taken** in this repository, meaning the set of real plugins graded against the
  Standard. Reusing it collides with an established meaning.
- `evidence/` and `provenance/` are the descriptive alternatives; both are preferences, neither is a
  standard, and `foundation/` reads correctly beside `agents/ bin/ commands/ docs/ scripts/ skills/`.

**Write the rejected alternatives down.** A naming choice whose alternatives are unrecorded invites the
same debate at the next release.

## D1 - The folder layout

As drawn in [`../RELEASE-PLAN.md`](../RELEASE-PLAN.md). The ADR fixes it; this spec adds one constraint the
plan implies and does not state:

**`claims/` holds only machine-read files, and `sources/` and `synthesis/` hold only human-read ones.** The
split is what lets a reader know, without opening anything, whether editing a file can break a gate. Three
files in `claims/` are read **by path** from release-blocking code; nothing in the other two folders is.

## D2 - The per-source record format, and `method` is first-class

Every source record carries **what was read, which version, when, and BY WHAT MEANS**. The plan already
argues that `method` is not a footnote; **this release has a live example that settles it.**

On 2026-08-19 the probe `agents-dir-registers-every-md` was re-verified. The claim held exactly, and the
two runs used different instruments:

| Run | Method | Strength | Weakness |
| --- | --- | --- | --- |
| 2026-08-06 | listed registered subagents in a live session | an actual observation of the runtime doing it | needs a fresh session; not reproducible on demand |
| 2026-08-19 | `claude plugin details`, the runtime's own inventory command | Claude Code's own loader; reproducible from a shell in 30 seconds | reports what the runtime says it will load, not an observation of it having loaded |

**"Confirmed 2026-08-19" describes both and distinguishes neither**, and a reader deciding whether to trust
a six-week-old entry needs to know which one it was. That is the whole argument for the field, and it is
now evidenced rather than asserted.

**Required values, and the ADR should fix this list**: at minimum `read` (a page was read), `probe` (an
experiment was run), and `tool` (a first-party tool reported it). A record whose method is absent is
`unknown`, and `unknown` is not `stale` - see D4.

## D3 - `tier-basis.md`'s contract

The artifact that does not exist yet, and the reason the tier ladder rests on evidence it cannot see.

**One row per tier boundary**, each naming the capability the boundary depends on and the source record
that establishes it. The contract that matters:

**A boundary with no evidence gets a row saying `unverified`, never an omitted row.** An absent row reads
as "no boundary here"; an `unverified` row reads as "a boundary nobody has grounded", which is the finding.
This is acceptance criterion 6 and it is the single most important line in the file.

## D4 - What is deliberately NOT promoted

ADRs, the backlog, release plans and `STATUS.md` stay in `docs/internal/`. They are **maintainer working
material, not evidence**, and the distinction is the point of the folder: `foundation/` is what the
Standard rests on, and a release plan is not that.

The ADR should state the test explicitly, because the next person will ask: **would an outside reader need
this to judge whether a Standard requirement is grounded?** If no, it stays put.

## D5 - The rule the folder exists to enforce

One sentence, in `foundation/README.md`, and the ADR should fix its wording:

> **Every claim the Standard rests on is traceable to a first-party source, with a date and a method - and
> where it is not, the record says so.**

**`stale` is not `wrong`, and `unknown` is not `stale`.** That is ADR 0054's rule and this folder inherits
it; a record whose method or date is missing is unknown, which is a prompt to go and look, not a defect to
be cleared by deleting the row.

## What this workstream does NOT decide

- **The migration mechanics.** W2, and it is a code change, not a `git mv`. Three files in `claims/` are
  read by path from two watches, `release-ready`, their unit tests, and a cron-only workflow.
- **Any tier reassignment.** Where `tier-basis.md` shows a boundary resting on nothing, that is a finding
  to file. Reassigning a tier is its own ADR with a migration window.
- **New spine checks.** W4 adds exactly one guard, and it guards the matrix rather than graded plugins.

## Done when

- [ ] The ADR is ratified and carries its `## TL;DR` (ADR 0021 convention)
- [ ] It records `foundation/`, and the alternatives rejected, including that `corpus/` was unavailable
- [ ] The layout, the source-record format including `method`, and `tier-basis.md`'s contract are all fixed
- [ ] What is NOT promoted is stated, with the test for deciding
- [ ] No file has moved yet - that is W2, and moving before ratifying is the sequence this workstream exists to prevent
