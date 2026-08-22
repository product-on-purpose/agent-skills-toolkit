# 0055 - The evidence the Standard rests on gets an address, and which files can break a gate is recorded rather than inferred

## TL;DR

- **Decision: a repo-root `foundation/` holds the evidence this Standard rests on**, in three layers: `sources/` (verified first-party references), `claims/` (the machine-checkable subset), `synthesis/` (what we concluded from them), plus `surveys.md`. This ADR **ratifies the layout and moves nothing**; the migration is W2 (the migration workstream) and it is a code change, not a `git mv`.
- **The name is `foundation/`**, decided by the maintainer on 2026-08-19. Recorded here with its rejected alternatives, because a naming choice whose alternatives are unwritten invites the same debate next release. **`corpus/` was unavailable**: it already means the set of real plugins graded against the Standard. `evidence/` and `provenance/` are preferences, not standards. `core/` reads as "core code" beside `scripts/` and `bin/`, and this folder is entirely `.md` and `.json`.
- **`method` is a first-class field on every source record**, with at minimum `read`, `probe` and `tool`. "Confirmed 2026-08-19" describes a page-read and a probe-run identically while distinguishing neither, and a reader deciding whether to trust a six-week-old entry needs to know which it was.
- **`tier-basis.md` gets one row per tier boundary, and a boundary with no evidence gets a row reading `unverified`, never an omitted row.** An absent row reads as "no boundary here"; an `unverified` row reads as "a boundary nobody has grounded", which is the finding.
- **`claims/` membership is defined by machine-checkable FORMAT, and each file's gate readers are NAMED in `claims/README.md`, with "none" a legal and expected value.** This **overturns the W1 spec**, which defined the folder by readership and asserted all three files are read by path from release-blocking code. Measured 2026-08-20: `surveyed-pin.json` has **no gate reader at all**. Defining membership by readership would have shipped a rule that is false on day one, and false in the dangerous direction.
- **Not promoted, deliberately:** ADRs, the backlog, release plans and `STATUS.md`. The test, stated so the next person does not have to ask: **would an outside reader need this to judge whether a Standard requirement is grounded?** If no, it stays in `docs/internal/`.
- **Inherits ADR 0054's rule (a component records what agent version it was checked against): `stale` is not `wrong`, and `unknown` is not `stale`.** A record missing a date or a method is a prompt to go and look, not a defect cleared by deleting the row.
- **Status:** **Proposed (awaiting ratification).** No file has moved and no gate has changed.

- **Date:** 2026-08-20
- **Deciders:** maintainer (jprisant), with Claude (Opus 5)

## Builds on

- **[ADR 0054 (a component records what agent version it was checked against)](0054-a-component-records-what-agent-version-it-was-checked-against.md)** - the governing rule this folder inherits whole: stale is not wrong, and unknown must never render as stale. `foundation/` is the first artifact where that rule shapes a directory rather than a frontmatter key.
- **[ADR 0024 (documentation depth and discoverability)](0024-documentation-depth-and-discoverability.md)** - D1.1 is why every meaningful folder carries a README with a frontmatter title, which is what `foundation/` and its three subfolders will each need.
- **[ADR 0021 (documentation, examples and docs-site strategy)](0021-documentation-examples-and-docs-site-strategy.md)** - the `## TL;DR` convention that `docs-presence` (G10) enforces on every record in this folder.
- **[v1.16.0 release plan, "the evidence gets an address"](../release-plans/plan_v1.16.0/RELEASE-PLAN.md)** and **[the W1 spec](../release-plans/plan_v1.16.0/W1-layout-adr/SPEC.md)** - the intent and acceptance criteria this ADR ratifies, and the document this ADR corrects in one place.

## Context and problem statement

**The tier ladder is defined in terms of vendor capability.** `STANDARD.md` sec 2.2 defines Convergent as *"Concepts both CC and CX support, but in different formats"* (line 87) and sec 2.3 defines Advanced as *"Deep, lifecycle, and often agent-specific capability"* (line 96). Both sentences are claims about software this project does not control. The tier boundaries are therefore a **synthesis of vendor capability**, and the quality of the ladder is bounded by the quality of that synthesis.

**That synthesis currently lives inside one skill's `references/` folder**, at `skills/askit-capability-advisor/references/capability-matrix.md`. It is named by `askit-capability-advisor`'s and `askit-capability-gap-analysis`'s `SKILL.md`, by `askit-capability-whats-new`'s golden example 2, by `docs/how-to/choose-agent-targets.md` and by `docs/reference/askit-capability-advisor.md`. Nothing checks it.

**Three facts make this a structural problem rather than a tidiness preference.**

1. **Every other shared world-fact already lives centrally.** `vendor-claims.json`, `upstream-pin.json`, `surveyed-pin.json` and `surveys.md` all sit under `docs/internal/<topic>/`. The capability matrix is the only outlier, and it is the one the tier ladder depends on.
2. **The ownership is inverted, and v1.15.0 introduced that.** `askit-capability-gap-analysis` declares that it owns `../askit-capability-advisor/references/capability-matrix.md`, a cross-skill reach into another skill's `references/` that no pre-existing skill in this repository does. That is a convention broken rather than extended.
3. **Nothing routes a vendor change to a tier question.** The v1.15.0 survey found three component types Codex documents and this Standard does not model (Connectors, Browser extensions, Scheduled task templates). The ladder's own definition implies where each belongs, and no artifact asks the question.

**The problem this ADR solves is addressing, not correctness.** Every fact above is already true and already written down somewhere. What is missing is a place where a reader can ask "what does this Standard rest on, and how do we know?" and get an answer without knowing which skill's `references/` folder to open.

## Decision drivers

- **A reader must be able to tell, without opening a file, whether editing it can break a gate.** This is the property that makes a three-layer split worth having at all.
- **Distribution cost must be zero.** The npm tarball ships only the gate (`scripts/`, `bin/`, `STANDARD.md`); skills and docs reach consumers through the plugin install, which carries the whole tree. Old and new locations are equally present, so no consumer is affected by the move.
- **An unevidenced claim must be visible as unevidenced.** The folder is worth building only if it makes gaps legible; a folder that quietly omits what it cannot support is worse than no folder, because it looks complete.
- **The ADR must precede the move.** This is the v1.14.0 pattern, where measurement overturned three of seven recommendations before implementation began. It fired again here; see the correction section below.

## Considered options

**Option A - leave the capability matrix in `askit-capability-advisor/references/`.** Rejected. It leaves the inverted cross-skill ownership standing, keeps the one artifact the tier ladder depends on inside a component that can be versioned and refactored independently, and leaves no address for `tier-basis.md` to be born at.

**Option B - move it beside the others, into `docs/internal/capability-matrix/`.** The cheapest option and genuinely tempting: it fixes the outlier and the inverted ownership with one move and no new top-level concept. **Rejected** because `docs/internal/` is explicitly maintainer working material, and this ADR's own D4 test says evidence and working material are different things. Filing the Standard's foundations under "internal docs" is the categorisation that caused the problem, applied once more.

**Option C (chosen) - a repo-root `foundation/` with three layers.** Costs a new top-level directory, which is a real cost in a repository that has kept its root small. Buys the one thing options A and B cannot: a single address whose name states what it is for, at the same level as the things that consume it.

**On the name.** `foundation/` was chosen by the maintainer on 2026-08-19 and is not reopened here. **No industry-standard term fits**, which was checked rather than assumed. `corpus/` is **already taken in this repository**, meaning the set of real plugins graded against the Standard, and reusing it would collide with an established meaning. `evidence/` and `provenance/` are the genuinely descriptive alternatives; both are preferences, neither is a standard. `core/` reads as "core code" beside `scripts/` and `bin/`, while this folder is entirely `.md` and `.json`. `foundation/` reads correctly beside `agents/ bin/ commands/ docs/ scripts/ skills/`.

## Decision outcome

### D1 - The layout

```
foundation/
  README.md                    what this is, the one rule, and how to read it

  sources/                     LAYER 1 - verified first-party references
    README.md
    claude-code.md             pages read, version, date, METHOD, and what depends on each
    claude-cowork.md
    codex.md
    agentskills-io.md

  claims/                      the machine-checkable subset
    README.md                  per-file: format, and WHICH GATES READ IT (see D1a)
    vendor-claims.json         from docs/internal/vendor-watch/
    upstream-pin.json          from docs/internal/standards-watch/
    surveyed-pin.json          from docs/internal/capability-surveys/

  synthesis/                   LAYER 2 - what we concluded from layer 1
    capability-matrix.md       from skills/askit-capability-advisor/references/
    tier-basis.md              NEW

  surveys.md                   the dated record of what shipped
```

### D1a - `claims/` membership is a FORMAT, and gate readership is RECORDED

**This supersedes the W1 spec's formulation.** The spec defined the split by readership: *"`claims/` holds only machine-read files, and `sources/` and `synthesis/` hold only human-read ones"*, on the stated basis that *"Three files in `claims/` are read by path from release-blocking code."* Measurement on 2026-08-20 falsified the premise. See the correction section for the evidence.

**The decision:**

1. **A file belongs in `claims/` if it is a machine-checkable data file** (JSON today) that records facts about the outside world. Membership is about format and content, not about who currently reads it.
2. **`claims/README.md` names, per file, the gate code that reads it, by path.** `none (no gate reads this today)` is a legal and expected value, and a file carrying it is not thereby a candidate for deletion.
3. **Where a file has no gate reader but is consumed at run time by skills, the row says so and names them.** `surveyed-pin.json` is read at run time by `askit-capability-whats-new` and `askit-capability-gap-analysis`. An agent following a skill is a reader; it simply cannot break a gate.

**Why not weaken the rule instead.** Keeping "everything in `claims/` can break a gate" and quietly accepting one exception would train a reader to distrust the signal, which costs more than the signal is worth. Recording readership per file keeps the question answerable and makes the answer checkable, which folder membership never was.

**What this deliberately does NOT decide.** Whether `surveyed-pin.json` should gain a gate reader, or be absorbed into `sources/` as a human-read record. That is a finding to surface, not W1's call, and it is precisely the D4 discipline applied to a file rather than a folder.

### D2 - The per-source record format, and `method` is first-class

Every source record carries **what was read, which version, when, and by what means**. The required `method` values are at minimum:

| `method` | Means | Strength | Weakness |
| --- | --- | --- | --- |
| `read` | a first-party page was read | states what the vendor says | says nothing about what the runtime does |
| `probe` | an experiment was run | an observation of real behaviour | needs a fresh environment; expires |
| `tool` | a first-party tool reported it | reproducible in seconds | reports what a tool says it will do, not that it did |

**A record whose method is absent is `unknown`, and `unknown` is not `stale`.**

**This release supplies the worked example that settles the field's necessity.** The probe `agents-dir-registers-every-md` (does every `.md` in an agents directory register as a subagent) was established on 2026-08-06 by listing registered subagents in a live session, and re-verified on 2026-08-19 with `claude plugin details`, the runtime's own inventory command. Both are legitimate; they have opposite weaknesses, per the table above. "Confirmed 2026-08-19" describes both and distinguishes neither.

**The 2026-08-20 discharge of `components-share-one-namespace` (do two plugins' identically named skills share one pool) supplies a third instrument and sharpens the point further.** It was run headlessly with `claude -p --output-format stream-json --verbose`, which records the actual tool calls, so "the skill was invoked" and "no file was read" are receipts rather than assertions. That mattered because the probe fixtures live inside this repository and a session left alone can read the answer off disk and sound certain. **A `method` field that cannot distinguish "an agent said so" from "the stream shows the tool was called" is not yet fine-grained enough**, and W3 should treat the vocabulary as extensible rather than closed.

### D3 - `tier-basis.md`'s contract

**One row per tier boundary**, each naming the capability the boundary depends on and the source record that establishes it.

**A boundary with no evidence gets a row reading `unverified`, never an omitted row.** An absent row reads as "no boundary here"; an `unverified` row reads as "a boundary nobody has grounded", which is the finding this release exists to surface. This is acceptance criterion 6 of the release plan and the single most important line in the file.

**Expect it to expose unevidenced boundaries and record them as such.** The Advanced tier requires hooks, and the capability matrix says Codex supports "a subset" of Claude Code's events. That subset is pinned nowhere and its confirmation date is unknown. The correct output is a row reading `unverified`, not a gap filled in from memory.

### D4 - What is deliberately NOT promoted

ADRs, the backlog, release plans and `STATUS.md` stay in `docs/internal/`. They are **maintainer working material, not evidence.**

**The test, stated because the next person will ask:** would an outside reader need this to judge whether a Standard requirement is grounded? If no, it stays put. A release plan explains what this project decided to do; it is not a fact about the world that a requirement rests on.

### D5 - The one rule, in `foundation/README.md`

> **Every claim the Standard rests on is traceable to a first-party source, with a date and a method - and where it is not, the record says so.**

The second clause carries the weight. A folder that only records what it can support is a folder that hides its gaps.

## What measurement corrected in the W1 spec, 2026-08-20

**The ADR-first sequence exists for this, and it fired.** The spec is explicitly *"input to the ADR, not the ADR"*, and one of its load-bearing claims does not survive measurement.

**The spec said:**

> `claims/` holds three files that are read **by path** from `scripts/lib/vendor-watch.mjs`, `scripts/lib/standards-watch.mjs`, `scripts/release-ready.mjs`, their unit tests, and `.github/workflows/vendor-watch.yml`. This is not a `git mv`.

**Measured on 2026-08-20** by three independent searches (filename, directory string, and `surveyed|surveys` across `scripts/ tests/ .github/ bin/`):

| File | Read by path from gate code? | Every site |
| --- | --- | --- |
| `vendor-claims.json` | **yes** | `scripts/vendor-watch.mjs:21` (`CLAIMS_REL`), `tests/unit/vendor-watch.test.mjs:25` |
| `upstream-pin.json` | **yes** | `scripts/lib/standards-watch.mjs:22` (`PIN_REL`), `tests/unit/check-parity.test.mjs:474` |
| `surveyed-pin.json` | **no** | none. Zero matches in `scripts/`, `tests/`, `.github/`, `bin/` |

**Three corrections follow.**

1. **The split rule as written was false before it shipped.** One of the three files in `claims/` cannot break any gate. D1a replaces readership-by-folder with readership-recorded-per-file.
2. **`scripts/release-ready.mjs` and `.github/workflows/vendor-watch.yml` are not path readers.** `release-ready.mjs` spawns each gate by `gate.argv` from `scripts/lib/release-ready.mjs`; the workflow runs `npm run vendor-watch`. Both reach the claim files only through the gate they invoke. **W2's path-constant blast radius is therefore two constants and two test files**, not five sites.
3. **The cron-workflow warning still stands, for a different reason.** `vendor-watch.yml` runs on `schedule` and `workflow_dispatch` only, so no pull-request check executes it. That makes it invisible to PR CI for any BEHAVIOURAL change, which is what the throwaway-branch drill exists to catch. It is simply not exposed to a path-constant change, because it names no path.

**The spec is left as written rather than edited.** It is a dated input document, and this section is the correction of record.

## Consequences

**Positive.**

- One address answers "what does this Standard rest on, and how do we know?" without knowing which skill's `references/` folder to open.
- The inverted cross-skill ownership introduced in v1.15.0 is resolved by relocation rather than by a second cross-reach.
- `tier-basis.md` gets a home, and the `unverified` row becomes the mechanism that makes ungrounded tier boundaries visible for the first time.
- Gate readership becomes a checkable recorded fact rather than an inference from folder membership, which is strictly more information than the original rule offered even where the original rule was true.

**Costs and risks, stated rather than discovered later.**

- **A new top-level directory** in a repository that has kept its root small. Accepted as the price of the address.
- **`foundation/` is outside the folder-README check's scope.** Verified 2026-08-20: `scripts/checks/folder-readme.mjs` resolves folders from an explicit `FIXED_ROOTS` allowlist plus `GLOB_ROOTS` covering only `skills` and `docs` (excluding `internal`). **`foundation/` matches none of them.** So the folder whose entire purpose is traceability would ship unguarded by the check that enforces folder guides, unless `foundation/`, `foundation/sources/`, `foundation/claims/` and `foundation/synthesis/` are added to `FIXED_ROOTS`. **That is a W2 or W4 decision this ADR flags rather than makes**, and it is a decision, not an oversight to fix silently: adding them makes four new READMEs gate-blocking.
- **No site cost, verified.** `site/scripts/gen-docs-site.mjs` mirrors only subdirectories of `docs/`, and `foundation/` is a root sibling of `docs/`. W1 through W4 cannot touch the site, and no route-manifest entry is needed.
- **Zero distribution cost**, per the decision drivers: the tarball ships only the gate, and the plugin install carries the whole tree either way.

**Neutral.**

- Nothing moves under this ADR, so nothing can break under it. Every migration risk belongs to W2, which sequences one artifact at a time with the gate green at every step.

## Implementation sites

**This ADR is ratification, so its implementation sites are prospective.** No file has moved; recording them here is what lets W2 be checked against a decision rather than against a memory.

**Path constants that must change when `claims/` is populated (W2), and the complete list of them:**

- `scripts/vendor-watch.mjs:21` - `export const CLAIMS_REL = "docs/internal/vendor-watch/vendor-claims.json"`
- `scripts/lib/standards-watch.mjs:22` - `export const PIN_REL = "docs/internal/standards-watch/upstream-pin.json"`
- `tests/unit/vendor-watch.test.mjs:25` - hardcoded claims path in the test harness
- `tests/unit/check-parity.test.mjs:474` - `docs/internal/standards-watch` in the fixture directory list

**Files this ADR calls into existence (W2 and W3):**

- `foundation/README.md` - carries D5's one rule verbatim
- `foundation/claims/README.md` - carries D1a's per-file gate-readership table, with `surveyed-pin.json` recorded as having no gate reader
- `foundation/sources/README.md` and the four per-source records - carry D2's `method` field
- `foundation/synthesis/tier-basis.md` - carries D3's contract, including `unverified` rows

**Not an implementation site, and recorded so W2 does not go looking:** `scripts/release-ready.mjs` and `.github/workflows/vendor-watch.yml`. Both reach the claim files only through the gate they spawn, and neither names a path.
