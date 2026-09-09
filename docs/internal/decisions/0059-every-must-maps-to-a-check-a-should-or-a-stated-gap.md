# 0059 - Every MUST maps to a check, a SHOULD, or a stated gap

## TL;DR

- **Decision: every RFC-2119 `MUST` in `STANDARD.md` is mapped to the check that enforces it, demoted to `SHOULD`, or marked "stated, unchecked" - and a generated coverage table makes the mapping mechanical.** The table is a test, so a future `MUST` written without a mapping fails CI rather than joining the gap quietly.
- **This closes decision D-04 from the 2026-09-04 external audit.** Adopted from that audit's proposed ADR 0007; **renumbered from `0007` to `0059`**, because the audit's ADRs are numbered from `0001` against a repository whose sequence had already reached `0058`.
- **The finding: seven `MUST`s have no check, and this repository violates one of them 35 times over.** Standard sec 7.3 requires *dated change notes in a co-located history file (`HISTORY.md` beside the component) at Silver and above*. This repository declares Advanced and contains **zero `HISTORY.md` files** - verified 2026-09-08 across the whole tree - against 35 components that would each need one. **"Self-proving" currently means "passes its own gate", not "satisfies its own Standard"**, and nothing in the tree could have told anyone that.
- **A `MUST` nothing checks is worse than a `SHOULD`.** A `SHOULD` is an honest recommendation. An unenforced `MUST` is a promise the document makes and the tooling silently declines to keep, and it is invisible from every surface - the gate passes, the badge is green, and the clause reads as binding to anyone who opens the Standard.
- **Three of the seven become checks, two become `SHOULD`s, two are marked unchecked**, and one clause splits across two dispositions. Each is stated in the table below with its reason.
- **"Unchecked" is a real disposition, not a euphemism.** It means the requirement stands, the tooling cannot verify it today, and the Standard says so at the point of the clause. That is strictly better than a `MUST` whose reader cannot tell whether it is enforced.
- **The coverage table is the deliverable; the seven dispositions are the first pass through it.** Without the table this decision decays the moment the next `MUST` is written.
- **Status:** **Accepted (2026-09-08).** Dispositions ruled; implementation is scheduled work, not done here.

- **Date:** 2026-09-08
- **Deciders:** maintainer (jprisant), with Claude (Opus 5)

## Builds on

- **[ADR 0024 (the documentation-depth build-out)](0024-docs-depth-buildout.md)** - established that a stated requirement gets a check or an explicit reason it has none.
- **[ADR 0053 (a pin label is a claim, and behind is not a defect)](0053-a-pin-label-is-a-claim-and-behind-is-not-a-defect.md)** - the same idea one layer down: a label that states a fact is making a claim, and a claim nothing verifies drifts. An unenforced `MUST` is a claim of exactly that kind, with the gate as the thing that would have to verify it and does not.
- **[ADR 0057 (unshipped work carries a name, never a version number)](0057-unshipped-work-carries-a-name-never-a-version-number.md)** - why the implementation phases below carry names rather than the version numbers the audit assigned them.

## Context and problem statement

`STANDARD.md` is the normative document this project grades against, and the README calls the repository "self-proving" because it passes its own gate. The 2026-09-04 audit tested that claim against the Standard rather than against the gate, and found the two are not the same thing.

Seven `MUST` clauses have no check behind them. One of them - sec 7.3, `HISTORY.md` at Silver and above - **this repository violates**, while declaring Advanced and reporting a clean gate.

There is no mechanism that would have surfaced this. A clause is written in Markdown; a check is written in JavaScript; nothing compares the two sets. The gap is not a lapse, it is the absence of a join.

## Decision

### 1. The coverage table

A generated table maps every `MUST` in `STANDARD.md` to one of three states:

| State | Meaning |
|---|---|
| **checked** | the `reqId` of the check that enforces it |
| **demoted** | the clause is a `SHOULD`, and the Standard says so |
| **stated, unchecked** | the requirement stands, no check exists, and the Standard says so at the clause |

**The table is a test.** A `MUST` with no entry fails CI. This is the part that survives contact with the future: the seven dispositions below are a one-time cleanup, and the table is what stops an eighth appearing unnoticed.

### 2. The seven dispositions

| Clause | Disposition | Reason |
|---|---|---|
| **sec 7.3** `HISTORY.md` at Silver+ | **Demote to `SHOULD`** | The clause requires a history file BESIDE each component, so satisfying it means writing 35 files in this repository alone, plus every file the family would owe - to record content the `CHANGELOG` already carries in one place. The requirement was aspirational when written and no adopter has met it, this repository included. |
| **sec 5.1** entry `path` and `version` agree with disk | **Check** - extend `S3` / `S8` | The lowest-cost of the three: `components-index` and `components-mirror` already walk both sides, and `S3`'s own docblock already claims this. The check was described and never written. |
| **sec 3.10** `AGENTS.md` links resolve | **Check** - extend `U2` | `U6`'s link scanner already exists and is now correct about root-relative paths. Pointing it at one more file is a small change with a real failure mode behind it: a broken link in the file an agent reads first. |
| **sec 3.10** `AGENTS.md` counts agree | **Demote to `SHOULD`** | Split from the clause above deliberately. Link resolution is objective; a count agreeing with prose is a formatting convention, and enforcing it would fire on legitimate phrasing. |
| **sec 7.2** a drifted sample is an error | **Stated, unchecked** | There is no sample reader. Marking it unchecked is honest; writing a reader to satisfy a clause nobody has asked for is not warranted by any observed defect. |
| **sec 7.4** version propagation is verifiable | **Stated, unchecked** | `release-ready` covers it for this repository, but that is a maintainer-only aggregate and not part of the graded spine, so a third-party plugin gets no such check. The clause stands; the gap is named. |
| **sec 8.2** name collisions | **Check** - a new cross-type uniqueness check | The one genuinely new check of the seven. A skill and a command sharing a name is **by design** (a command maps to exactly one skill); two skills sharing one is a collision. The check must encode that asymmetry or it will fire on the intended shape. |

**Three checks, two demotions, two stated gaps, and one clause split.** The audit recommended each of these; each is adopted with the reason stated rather than by deference.

### 3. What updating the model requires

Recorded here so the work is scoped rather than discovered:

1. **A `SHOULD` demotion is a Standard revision.** Sec 7.3 and the sec 3.10 count half move from `MUST` to `SHOULD`. Demotions are the safe direction - nothing that passed starts failing - but they change the normative document and belong in a numbered Standard revision with a version note.
2. **The two new check behaviours need `since` and a cap.** Extending `U2` and `S3`/`S8` **adds findings to existing checks**, which is a tightening. Per the pattern `catalogue-manifest-shape`, `hook-documentation` and `command-size-cap` all follow, each ships warn-first with a finding-level `until` one revision beyond the one that introduces it. `until` alone is wrong for a genuinely new check, so the sec 8.2 collision check needs `since` as well.
3. **The collision check moves the spine from 35 to 36.** That stales every spine count in the governed docs. `check-doc-enumerations` and `check-readme-version` name each one, so the ripple is mechanical - but it must be in the plan rather than discovered in CI.
4. **Blast radius is measured before each of the three checks lands, not argued.** All six family members graded at the catalogue's pinned shas, before and after. Sec 5.1's `path`/`version` agreement is the one most likely to move a real verdict, because it is the only one testing a property nobody has been checking.
5. **The coverage table needs a `MUST` parser.** It reads `STANDARD.md`, extracts RFC-2119 `MUST` clauses with their section numbers, and joins them against the registry. The parser is the risk in this item: a clause the parser misses is a `MUST` the table silently declares covered, which reproduces the original defect inside its own fix.

### 4. What this decision does NOT do

- It does not write `HISTORY.md`. The clause is demoted instead.
- It does not schedule the three checks into a named cut. That is roadmap work.
- It does not touch the other findings from the same audit. `U5`'s calibration, the pin floor and the health score are D-01, D-02 and D-03 and are decided separately.

## Consequences

**The "self-proving" claim becomes checkable rather than asserted.** Today it means "the gate is green". After the coverage table it means "every `MUST` is mapped", and the mapping is verified on every run.

**One clause's demotion is a visible admission**, and that is intended. Sec 7.3 moves to `SHOULD` because this project never met it. Recording that in a version note is the honest form; quietly adding a check and writing 35 files to make the claim true retroactively is the dishonest one.

**Two `MUST`s stay unenforced on purpose, and now say so.** A reader of the Standard can tell which requirements the tooling stands behind. That is a smaller promise than the document made before, and a true one.

**The table can go stale in one specific way, so it is a test rather than a document.** A generated table nobody regenerates is exactly the failure this repository has already met once, when a hand-run registry page drifted twenty days carrying two wrong facts.
