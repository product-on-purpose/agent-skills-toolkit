# Release plan - the onboarding funnel, "what are you trying to do?"

- **Type:** MINOR. No Standard version change, no new spine check, **no verdict movement for any plugin.** One new documentation section, one new public how-to that closes a real capability gap, and cross-links from three existing front doors.
- **Baseline:** `main` at `65c4740`. Gate Advanced 0 errors / 0 warnings, spine 34, Standard 0.15, 26 skills, **suite 1359 / 0** (1 skipped). **Measured at `65c4740` on 2026-08-20, not inherited.** The v1.16.0 plan carried a suite number taken while it was drafted, before the commit it named existed, and it read wrong for two weeks. A baseline measured at the commit it names is legitimate; one measured ahead of it is a forward-dated claim. Final counts are still written LAST, at cut time, per the packet convention.
- **Branch:** `release/v1.17.0`, cut from `main` after the implementation PRs merge.
- **Thesis:** this project's problem is not capability, it is **discoverability**. The corpus audit found six of nine adopter jobs already fully covered by existing pages, and the two that are not covered are the two deepest capabilities the toolkit ships. An adopter cannot find what they cannot name, and nothing in this repository asks them what they are trying to do.

> **How this document is written.** It states **intent and acceptance criteria**, written before the work.
> It is not a status report and will not be edited into one. What actually shipped belongs in `README.md`
> in this folder, written **last, from the code**.

## Why this release exists, and why it is not a documentation refresh

**The evidence is an audit, not an impression.** Nine adopter jobs were mapped against the whole public corpus (a quick start, tutorials, 29 how-to guides, reference for every skill, and the live docs site). The result:

- **Six of nine jobs are already covered** by pages that exist and are correct. Nothing needs rewriting.
- **Two are not covered at all**, and they are the gate in CI and running-a-plugin-like-a-product: the deepest, most differentiating capabilities the toolkit has.
- **One capability is shipped, tested, gated on, and publicly invisible.** `action.yml` provides inline diff annotations, tier / error / warning outputs a workflow can branch on, optional SARIF into the Security tab, and a guard that deletes an invalid SARIF rather than emitting a partial one. Searching the public docs tree, `README.md` and `QUICKSTART.md` for `action.yml`, `uses: product-on-purpose`, or SARIF returns hits only in `docs/internal/` and `docs/explanation/comparison.md`.

**That last finding is the thesis found in the wild rather than asserted.** A first-class GitHub Action that an adopter cannot discover is not a missing feature; it is a missing door.

**So the deliverable is a layer OVER the corpus, not a rewrite of it.** Six of the nine runbooks sequence and frame pages that already exist, adding only the fast path, the deterministic verify steps, and the outcome framing. This is why a nine-door funnel costs roughly one release rather than three.

## Decisions already settled, and not reopened by this plan

Settled by the maintainer on **2026-08-20**. Recorded here so the workstreams can be written as execution rather than as discovery.

| # | Decision | Settled as |
| --- | --- | --- |
| 1 | The nine door names | **Approved as written**, see the table below |
| 2 | Where the funnel lives | **A new `docs/adoption/` section**, not folded into the four Diataxis quadrants |
| 3 | One release or two | **One release, as the centerpiece.** A half-shipped funnel is worse than none: a router that promises nine doors and delivers four actively misleads |
| 4 | Whether door 6 also closes the underlying gap | **Yes.** `docs/how-to/grade-in-ci.md` plus a `README.md` line, so the Action has public documentation independent of the funnel |
| 5 | Proposal 02, the `askit-onboard` skill | **Green-lit as a backlog entry now** (`E47`), rather than deferred until Phase 1 is dogfooded |

**The tier-centred "Ladder Program" spine remains rejected**, and it is load-bearing for everything below: **tiers are self-declared, not canonical first-party gates.** Grading is this project's instrument, never the adopter's journey. Tiers therefore appear at exactly one door, and acceptance criterion 7 makes that checkable rather than aspirational.

### The version assignment, stated as an assumption

**This is v1.17.0 and not v1.16.0.** The onboarding scope was admitted to v1.16.0 as a dated note on 2026-08-20, before its plan existed. Decision 3 asks for the funnel to be a release **centerpiece**, and v1.16.0 already carries four fully specified `foundation/` workstreams whose ADR (0055, the `foundation/` layout) was ratified 2026-08-20 to unblock its migration. A release cannot have two centerpieces.

**Reversing this is a folder rename and one cross-reference.** If the maintainer would rather displace `foundation/`, say so and this packet renumbers; nothing in the workstreams below depends on the number.

> **Displacement note, 2026-08-28.** The assumption above was reversed by events rather than by a
> `foundation/` preference: **v1.17.0 was taken by the cut of the 2026-08-25..28 work** (the
> documentation style contract, the E52 record-scoping fix, ADR 0056, and tag-triggered npm
> publishing), ratified in the 2026-08-28 wrap. This packet now carries **no version**, per the
> precedent `STATUS.md` recorded for the graded-cohort work on 2026-08-22: assigning a line a
> version it will not get is how a line goes stale unnoticed. v1.17.0 has now been assigned to
> three bodies of work (the graded cohort, this funnel, the shipped cut), and only the third
> shipped under it, which is that precedent proven rather than merely followed. The folder renamed
> from `plan_v1.17.0/` to `plan_onboarding-funnel/`; the funnel takes the next free minor when its
> implementation actually starts. Nothing in the workstreams below depends on the number, exactly
> as this section said.

## The nine doors

Each door is one runbook page under `docs/adoption/`. "Wrapper" means the runbook sequences and links existing pages and adds only the fast path, the verify steps, and the outcome framing. "Net-new" means no existing page covers the job.

| # | Door, in the adopter's words | Primarily serves | Existing coverage | Type |
|---|---|---|---|---|
| 1 | See what this does in 15 minutes | Evaluators, all newcomers | `QUICKSTART.md`, `how-to/install-and-run-via-npm.md` | Wrapper **plus net-new** three-lane triage and output-reading |
| 2 | Ship my first skill | Beginners | `tutorials/build-your-first-skill.md`, `how-to/build-and-evaluate-a-skill.md` | Thin wrapper |
| 3 | Turn my pile of skills into an installable plugin | Migrators | `how-to/adopt-a-foreign-repo.md`, `reference/askit-migrate.md` | Thin wrapper |
| 4 | Start a new plugin right | Greenfield builders | `tutorials/start-a-plugin-and-reach-bronze.md`, `how-to/scaffold-a-plugin.md` | Thin wrapper |
| 5 | Make it work on Claude Code AND Codex | Bronze users going deeper | `how-to/emit-for-multiple-agents.md`, `how-to/choose-agent-targets.md` | Moderate wrapper |
| 6 | Stop it silently breaking (the gate in CI) | Teams, advanced | **Effectively none.** Four lines in one how-to; the Action itself is undocumented | **Net-new** |
| 7 | Run it like a product (backlog, decisions, releases, deprecation) | Advanced, teams | Five how-tos exist per piece; no narrative joins them | **Net-new** composite |
| 8 | Prove its quality to someone else | Teams, publishers | `explanation/conformance-and-tiers.md`, `how-to/climb-from-bronze-to-silver.md`, `tutorials/climb-to-gold.md` | Thin wrapper. **This is where tiers live, and the only place** |
| 9 | Keep up with the moving ecosystem | Advanced, maintainers | `how-to/watch-the-upstream-spec.md`, `reference/askit-capability-advisor.md` | Moderate, partly net-new |

### The fixed runbook anatomy

Every door page carries the same seven sections, in this order. The anatomy is what makes nine pages one product rather than nine essays.

```
Goal (one sentence, outcome-worded)  | Time estimate | Lane(s) assumed
FAST PATH        the whole thing as commands, for the agent-fluent
GUIDED PATH      numbered steps, each with a deterministic verify
READ THE OUTPUT  what the result means; check IDs always carry a handle
YOU CAN NOW      outcome statements true in the adopter's own repo
NEXT DOORS       two or three continuations, each with its reason
TROUBLE?         pointers into troubleshoot-the-gate and the FAQ
```

**Two lanes, not one, is a deliberate cost.** An agent-fluent reader who is made to walk numbered steps leaves; a beginner handed a command block fails silently. The FAST PATH and GUIDED PATH must both be executed during the dogfood walkthrough, which is why acceptance criterion 3 names lanes rather than pages.

## Workstreams

### W1 - The router and the capability map

The spine, and the only two pages that must be findable from everywhere. **[`W1-router-and-map/SPEC.md`](W1-router-and-map/SPEC.md)** carries the detail.

The router (`docs/adoption/start-here.md`) opens with the three-lane install triage (in-agent, npm, clone) and then the nine doors as a table: the job in the adopter's words, time to first outcome, and what they will be able to do afterwards. It is linked from the `README.md` "Find your way in" section, the docs-site sidebar top slot, and the `QUICKSTART.md` footer.

The capability map (`docs/adoption/capability-map.md`) places every door on a Start / Grow / Govern / Level-up field, so an adopter can see the whole territory rather than only the next step. **It needs no SVG:** the site already ships `astro-mermaid` with `autoTheme`, so the diagram is a fenced `mermaid` block that renders in both themes.

### W2 - The four thin-wrapper runbooks

Doors 2, 3, 4 and 8. Each sequences existing pages and adds the fast path, the verify steps, and the outcome framing. **No existing page is rewritten**; where a runbook wants to say something a tutorial already says, it links instead.

**Door 8 carries a constraint the others do not.** It is the only page where tiers appear, and it must present the tier as an instrument the adopter chooses to use for a purpose ("prove it to someone else"), never as a ladder they are expected to climb. See acceptance criterion 7.

### W3 - The three moderate runbooks

Doors 1, 5 and 9. Wrappers with genuine net-new content: door 1 adds the three-lane triage and the output-reading section that nothing currently covers, door 5 adds lanes and verify steps over two existing how-tos, and door 9 is partly net-new because `askit-capability-gap-analysis` and `askit-capability-whats-new` have reference pages and no how-to.

### W4 - The two net-new doors, and the CI how-to that door 6 wraps

Doors 6 and 7, plus **`docs/how-to/grade-in-ci.md`**, which is decision 4 and the only workstream here that closes a capability gap rather than a discoverability gap. **[`W4-net-new-doors/SPEC.md`](W4-net-new-doors/SPEC.md)** carries the detail, including the four-stage adoption ramp that keeps CI from turning red on day one.

**This is the highest-risk workstream and it should be built first.** It is the only one whose content cannot be validated by reading an existing page, and it is the one whose failure mode is publishing instructions that do not work.

### W5 - The gallery, the named workflows, and the FAQ additions

`docs/adoption/use-case-gallery.md` (worked scenarios end to end), the named adoption workflows, and roughly six FAQ entries. **One of the FAQ entries is the honest tier-authority answer** and it is not optional: an adopter who asks "does Gold mean anything to anyone but you?" deserves the true answer, and giving it is what makes the rest of the funnel credible.

### W6 - The dogfood walkthrough

**Not optional, and not a review.** Every lane of every runbook, executed from a clean machine position by someone who is not the author, with what was run and what came back recorded per door.

**The project's own record is the argument.** Instructions written for other people fail when they are only ever run from the author's tree; this repository has paid for that more than once. A funnel is a promise made to a stranger, and the only way to know a promise holds is to keep it once from the stranger's position.

## Acceptance criteria

Written before the work, and each one able to come back the wrong way. A criterion that cannot fail is a description wearing a criterion's clothes.

1. **No plugin's verdict moves, and no plugin sees a new finding.** This release adds no check and changes no Standard requirement. **Measured per family member before and after, not argued.**
2. **Route parity is green against a BUILT site.** `site/scripts/check-route-parity.mjs` passes after `npm run build` in `site/`, and `site/scripts/route-manifest.txt` names every new page. An unbuilt site reports a new page as a baseline route removed, so a parity run without a build proves nothing.
3. **Every FAST PATH and every GUIDED PATH was executed verbatim from a clean position**, and each produced the outcome its page states. Recorded per door as what was run and what came back. **Eighteen lane-runs, not nine page-reads.**
4. **Every "YOU CAN NOW" statement was verified true in a scratch repository**, not asserted. A statement that cannot be checked is rewritten until it can be, or cut.
5. **The router lists exactly nine doors, every link resolves, and the set is closed both ways.** No door page exists that the router does not list; no listed door lacks a page.
6. **`docs/how-to/grade-in-ci.md` exists, and its workflow was run in a real repository** producing at least one inline annotation and one SARIF upload visible in the Security tab. **Demonstrated, not described.** The Action's public documentation gap is closed whether or not the rest of this release ships.
7. **Tiers appear at door 8 and nowhere in the router's first screen.** Grep-checkable: `Bronze|Silver|Gold|tier` returns no hit in `docs/adoption/start-here.md` above the door table, and no door page other than door 8 leads with a tier. This makes the **rejected tier-centred spine** enforceable rather than remembered. Note that it is the standing constraint recorded beneath the decisions table, **not** one of the five numbered decisions; decision 5 is the `askit-onboard` green-light.
8. **`npm run release-ready` exits 0 at every commit**, not only at the end.
9. **`G7` (docs frontmatter) and `G8` (folder README) pass on the new section.** `docs/adoption/README.md` exists with a non-empty frontmatter `title` and lists every child page.
10. **Two adversarial review waves, the second pointed away from the first.** v1.15.0's wave 2 was nearly skipped and found five defects including one HIGH when it finally ran; that is the precedent this criterion exists to honour.

## What this release does NOT do

- **It does not rewrite any existing page.** Where a runbook and a tutorial disagree, the tutorial wins and the runbook links to it. A funnel that forks the corpus doubles the maintenance and halves the trust.
- **It does not ship the `askit-onboard` skill.** That is `E47` in the backlog, green-lit but sequenced after this release is dogfooded. **Paper before automation:** Phase 2 automates a curriculum, and validating that curriculum as cheap editable docs first means the expensive product surface is built on a proven design rather than a guess.
- **It does not ship the companion demo plugin or the visual walkthroughs.** Proposal 03, phases 3 and 4. Visuals go last on purpose because they rot fastest.
- **It does not touch `foundation/`.** Verified rather than assumed: `foundation/` is a repository-root sibling of `docs/`, and `site/scripts/gen-docs-site.mjs` mirrors only subdirectories of `docs/`. The two halves of the v1.16.0 and v1.17.0 pair are structurally independent in that direction.
- **It adds no spine check.** Acceptance criterion 7 is enforced by a grep in the dogfood walkthrough, not by a new gate. A check that grades other people's plugins on our funnel's shape would be a category error.

## The measured cost of a page, and why the estimate is what it is

**Measured against `0360912`**, which added two `docs/reference/` pages: the first page in a quadrant costs **four tracked files** (the page, its folder `README.md` for `G8`, `site/scripts/route-manifest.txt`, and a `CHANGELOG.md` entry), and a second page in the same quadrant shares three of them. Plus a **site build before route parity is checked**.

Since `docs/adoption/` is a new quadrant, page one costs four files and pages two through thirteen cost one each, plus one shared sidebar group line in `site/astro.config.mjs`. **The generator needs no change:** `gen-docs-site.mjs` already mirrors every subdirectory of `docs/` except `internal/`, so a new section is picked up automatically.

| Artifact | Count | Estimate |
| --- | --- | --- |
| Router page | 1 | 3-4 h |
| Thin-wrapper runbooks (W2: doors 2, 3, 4, 8) | 4 | 4-8 h |
| Moderate runbooks (W3: doors 1, 5, 9) | 3 | 9-12 h |
| Net-new runbooks plus the CI how-to (W4: doors 6, 7) | 3 | 8-12 h |
| Capability map page and diagram | 1 | 3-4 h |
| Gallery, named workflows (W5) | 1 | 3-4 h |
| FAQ additions (W5) | ~6 entries | 2-3 h |
| Gate overhead: folder README, route manifest, `G7` on ~13 pages, site build, sidebar group, two curated touchpoints, `CHANGELOG.md` | - | 4-6 h |
| Dogfood walkthrough (W6), eighteen lane-runs | - | 6-8 h |

**Total: roughly 42-61 hours.** The dogfood line is the one that must not be cut; it is the only line that tests the product rather than producing it.

## Sequencing

**W4 first, then W1, then W2 and W3 in any order, then W5, then W6.**

W4 leads because it is the only workstream whose content cannot be validated against an existing page, so it is where a wrong assumption is most expensive and where discovering it late costs the most. W1 follows because the router's door table is written against real pages rather than intended ones. W6 is last by definition: it tests what the others built.

## Source material

Local-only and gitignored at `_local/onboarding/`, so this file cannot link to it as a followable path. It holds four proposals and five worked prototypes, including three drafted runbooks (doors 1, 5 and 6) that establish the anatomy, the capability-map page, and sample FAQ entries. **The door 6 prototype is the one to read first**; drafting it is what surfaced the undocumented Action.
