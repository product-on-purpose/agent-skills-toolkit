# 0054 - A component records which agent version it was checked against, and the record is a reading rather than a claim of correctness

## TL;DR

- **`metadata.verified-against`** is a conventional sec 3.7 key: a map of agent to the agent version a component was **last actually checked against**.
- **It is legal today and requires no Standard change to declare.** Sec 3.8 states the frontmatter vocabulary is OPEN, so this ships as a **convention** first. Making it REQUIRED would be a tightening and needs its own ADR and migration window.
- **Why:** nothing today can answer "which of our components were written before the agent shipped X?" A component carries its own semver and its `agent-targets`, and neither says anything about the platform version it was authored against.
- **The governing rule, and the reason this ADR exists at all: STALE IS NOT WRONG.** The key powers a report that says **where to look**, never what is broken. A component whose recorded version predates a change is very probably still correct.
- **UNKNOWN is not stale**, and must never render as stale. On adoption every component is unknown, and collapsing "never claimed" into "claimed and now old" would invent findings out of an absence at maximum volume on the first run.
- **Written only by [`askit-capability-gap-analysis`](../../skills/askit-capability-gap-analysis/SKILL.md), and only for components it actually assessed.** A bulk stamp is forbidden: **a version written down is not evidence of a reading**, and this repository has already paid for that exact defect in its action pins.
- **No check is added.** The key is unenforced by design; see Consequences.
- **Status:** Accepted (ratified 2026-08-18).

- **Date:** 2026-08-18
- **Deciders:** maintainer (jprisant), with Claude (Opus 5)

## Builds on

- **ADR 0050** (the frontmatter vocabulary is open; placement is checked) - which is what makes this key legal to declare without a Standard revision, and `U16` is what keeps it under `metadata` where things read it.
- **ADR 0053** (a pin's label is a claim, and being behind is not a defect) - the same distinction, one layer down: a wrong label blocks, being behind does not. This ADR applies that to components instead of action pins.
- The capability family: `askit-capability-whats-new` reports what shipped; `askit-capability-gap-analysis` writes this key; `askit-capability-advisor` reads the matrix the second maintains.

## Context and problem statement

This library ships 26 skills, 7 subagents and 2 commands, authored across five months against agent platforms that release constantly - Claude Code moved from `2.1.206` to `2.1.235` inside a single changelog window.

A component's frontmatter records its **own** `version`, and `agent-targets` records **which** agents it targets. Neither records **what the agents were doing when it was written.**

So a real and ordinary question has no answer: *a capability survey reports that subagent forking is now on by default; which of our components were written before that, and might reason about subagents in a way that no longer holds?* Today the honest answer is "read all 35 and find out", which means nobody reads any.

**And the question is about to get asked routinely**, because `askit-capability-whats-new` exists now and its whole output is a stream of dated platform changes.

## Decision drivers

- The answer must be a **lookup over tracked files**, not a judgment. A judgment does not scale to 35 components per finding.
- It must not **manufacture findings**. This repository's stated worst failure is reporting a defect that is not there.
- It must be **honest about what it does not know**, especially on the first run when it knows nothing.
- It must not become **a number people update without doing the work**, which is the failure mode of every "last reviewed" field ever added to anything.

## Considered options

**1. Do nothing; rely on judgment per finding.** Rejected: it is what happens today, and what happens today is that nobody audits 35 components against a changelog entry.

**2. Infer staleness from git history** - compare a component's last-modified date to the release date of the finding. Rejected, and the reason is instructive: **a file's mtime records when it was edited, not when it was checked.** A component nobody has touched in four months may have been read last week and confirmed fine; one edited yesterday for a typo was not re-verified by that edit. Inferring verification from modification would produce a confident and wrong answer, cheaply, at scale.

**3. A central registry file** mapping component to verified version. Rejected: it is a second place for the truth to live, and it drifts from the components exactly the way a hand-maintained inventory drifts from a folder - a defect this repository has now found three times in its own folder READMEs.

**4. A frontmatter key, unenforced.** Chosen.

**5. A frontmatter key plus a check that requires it.** Rejected **for now**, deliberately. See Consequences.

## Decision outcome

**Chosen: option 4.** `metadata.verified-against`, a map of agent to version.

```yaml
metadata:
  version: 0.2.0
  verified-against:
    claude-code: "2.1.208"
    codex: "0.148.0"
```

**1. It records a READING, not a correctness claim.** The key means *a human checked this component against that agent version*. It does not mean the component is correct, and it does not mean anything about versions since. That distinction is the whole design.

**2. Three states, and the third is not a degraded second.**

| State | Means | Renders as |
|---|---|---|
| **current** | recorded version is at or after the finding | nothing to do |
| **stale** | recorded version predates the finding | **look at this** - not "this is broken" |
| **unknown** | no key present | **look at this eventually** - not "this is stale" |

**Collapsing `unknown` into `stale` is forbidden.** On adoption every component is `unknown`; a report that renders 35 unknowns as 35 stale components on its first run is a false-report generator, and it would be judged on precisely that run.

**3. Written only by `askit-capability-gap-analysis`, only for components it actually assessed.** Never by the survey skill, which examines vendors rather than components. **A bulk stamp is forbidden.** This is not a theoretical concern here: this repository's workflows pin actions by SHA with a `# vX.Y.Z pinned <date>` comment, a tool advanced the SHA and left the comment behind, and the disagreement was caught by eye three times and by a machine zero times before ADR 0053 built a check for it. **A version written down is not evidence of a reading**, and this key is the same kind of object.

**4. Adoption is by accretion, and backfilling is explicitly wrong.** A component gets its key the first time somebody genuinely assesses it. Coverage grows as a by-product of real work - and the coverage percentage is itself worth reporting, because it measures how much of the library has ever been checked against anything.

**5. No check, and no Standard requirement.** The key is legal under the open vocabulary of ADR 0050; `U16` already ensures it sits under `metadata` rather than at the top level, which is the only structural property that matters.

## Consequences

- **Nothing is enforced, so nothing moves for any plugin.** No verdict changes, no new finding fires, and a plugin that never adopts the key is unaffected. That is the intended cost of shipping a convention rather than a requirement.
- **The obvious next step is deliberately not taken.** A check requiring `verified-against` on every component would be a Standard tightening needing an ADR and a migration window - and it would be premature: the measured population declaring this key today is **zero**, and this repository has a standing precedent for filing exactly that case unbuilt with a trigger (`E44`, measured population 0 of 2435). **The trigger here: revisit once the key has accrued on a real fraction of the library through actual assessments.** A check for a field nobody populates measures adoption of the check, not quality.
- **A check would also be hard to write honestly**, and that is worth recording rather than discovering later. What would it assert? That the key exists says nothing about quality. That the version is recent rewards stamping. **The useful assertion - that somebody actually read the component - is not machine-checkable**, which is precisely why this ships as a convention that a human writes deliberately.
- **`E46` is a live constraint on this key's shape.** The reference validator rejects YAML flow sequences outright, and our loader and the reference parser disagree about list-valued `metadata` values (`ours=["a","b"]` vs `reference="['a', 'b']"`), which trips the gating `metadata-parity` harness with no exception path. **`verified-against` is a MAP, not a list, which sidesteps the known instance** - but the underlying disagreement is unresolved, and anyone extending this key's shape must re-run `npm run check-parity` rather than assume.
- **This key is not a substitute for a probe.** `vendor-claims.json` probes carry release-blocking freshness because a probe's age is its whole verification. `verified-against` blocks nothing and is a note. Conflating them would either jam releases on a component nobody re-read, or quietly weaken the probes.

## Implementation sites

- `STANDARD.md` sec 3.7 - `verified-against` named in the conventional-key list, with its map shape and the explicit statement that it records a reading rather than a correctness claim. **Not** added to any tier's required set.
- `skills/askit-capability-gap-analysis/references/component-staleness.md` - the three states, the four rules, and the bootstrap note that a first run is all-unknown by design.
- `skills/askit-capability-gap-analysis/examples/anti-1-a-staleness-list-is-not-a-defect-list.md` - the refusal this ADR most needs enforced, written as the anti-example.
- `skills/askit-capability-whats-new/examples/anti-1-advance-the-pin-without-reading.md` - the parallel refusal for the survey pin, which shares this ADR's reasoning about what a written-down version is worth.
- **No change to `scripts/checks/`.** Recorded as a site so a future reader can see the absence was decided rather than forgotten.

Grep anchor: `metadata-placement` in `scripts/checks/`, which is the check that keeps this key under `metadata` where things read it.
