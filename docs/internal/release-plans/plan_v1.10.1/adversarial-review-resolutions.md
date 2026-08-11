# Adversarial review resolutions - v1.10.1

Pre-release Codex adversarial review of `main...release/v1.10.1`, run before tagging. Recorded because
the findings are more useful than the fixes: two of the three round-1 findings were defects the author
introduced in this same release and did not catch, and round 2 found that round 1's own fix was
incomplete.

## Round 1

**Verdict: needs-attention.** Three findings, all confirmed real after independent verification.

### R1-1 [high] String chain parsing was an unversioned gate tightening

`scripts/checks/chain-contract.mjs`

Teaching `S4` (chain contracts) to read a string-shaped `chain` declaration makes the check newly able
to fire. A plugin with a scalar `chain: some-agent` and no `agents/_chain-permitted.yaml` would have
gone from passing to erroring purely by upgrading a **patch** release. `S4` declares `since: "0.x"`,
so the ADR 0027 (Standard versioning and compatibility policy) pinned-Standard downgrade could not
rescue it.

**This one is worth dwelling on, because the release plan contradicted itself and nobody noticed.**
`RELEASE-PLAN.md` states the invariant plainly: "no third-party plugin's verdict moves. Anything that
would move one is out of scope by definition." The implementation brief for the same work then
explicitly authorized a carve-out: "no plugin that passes `S4` today may newly fail, **except where the
string form was previously read as no declaration**." The implementer flagged the carve-out honestly in
its report. It was accepted without anyone re-reading it against the invariant three paragraphs above.

The claim was also structurally untestable here: this repository's own gate can never catch it, because
its contract permits every edge it declares, so `S4` reports nothing either way.

**Resolution:** warn-first per ADR 0041 (warn-first string-shaped chain declarations). Findings from a
**string-shaped** declaration emit as `warn` and graduate to `error` at Standard 0.13. Severity is
decided by the value's **shape**, not by which key it was read from. Array-shaped and legacy
declarations are untouched. New anti-fixture `tests/fixtures/anti/chain-string-no-contract/` carries
the coverage this repository structurally cannot provide from its own tree.

### R1-2 [medium] `emitPin` preserved stale per-artifact provenance

`scripts/lib/standards-watch.mjs`

`emitPin` refreshes each artifact's `blobSha` and `surface` while leaving `lastUpstreamCommit`
untouched, so a re-pinned artifact names the commit that produced the **previous** bytes.

**The instructive part is that this is the same defect fixed earlier in this same release, one field
over.** `verified.repoHeadSha` was found inheriting an unverified value, fixed, and recorded as backlog
E25. `lastUpstreamCommit` sat directly beside it doing exactly the same thing and was not looked at.
The committed pin proved it: blob `d9a2db099d90` beside commit `6868401b` dated 2026-05-16, while ADR
0040 (re-pin after an editorial metadata clarification), written in the same change, names `217be548`
from 2026-08-04. An offline reviewer following the pin would have been sent to the wrong diff, which is
the one thing that file exists to prevent.

**Resolution:** both fields now follow one rule. Provenance for an artifact whose bytes moved is
dropped unless supplied through the new `artifactCommits` option; an artifact whose bytes did not move
keeps its provenance, because that fact is still true. Pin corrected against the upstream API. Three
regression tests, including the converse case.

### R1-3 [medium] `normalizeArgPath` trimmed, which can retarget a write

`scripts/lib/fs-utils.mjs`

Leading and trailing spaces are legal in a POSIX filename, so `/srv/plugin ` and `/srv/plugin` are two
different directories. Three callers write files (`gen-index`, `gen-manifest`, `sync-agents-md` in
`--write` mode), so trimming would silently emit generated files into a sibling the caller never named,
a strictly worse outcome than the read-the-wrong-tree defect the function exists to close. The first
draft's tests had pinned the trimming behavior in place.

The trim had been noticed during review of the implementer's work and judged theoretical. The
connection that was missed is that the callers include **writers**.

**Resolution:** trim removed; the separator conversion is the only transformation applied. Integration
test builds two real roots differing only by a trailing space and proves a `--write` run touches only
the one it was given. POSIX-only, skipped loudly on Windows (which strips trailing spaces from
directory names), and confirmed executing on the ubuntu CI runner rather than assumed.

## Round 2

Re-run against the same base after round 1's fixes, with an explicit instruction to challenge the fixes
themselves.

**Verdict: needs-attention.** One finding.

### R2-1 [high] Warn-first findings could be promoted back to errors

`scripts/checks/chain-contract.mjs` and the severity-resolution pipeline

`runGate` applies `askit.config.json` per-rule overrides **after** a check emits its severity, so a
plugin configured with `rules: { "S4": "error" }` had its warn escalated straight back to an error. The
reviewer reproduced `exitCode 1` for both the missing-contract and the orphan case. Round 1's fix
therefore did not actually deliver the guarantee ADR 0041 claimed.

**The finding is larger than the release.** `applyStandardDowngrade`, the ADR 0027 pinned-Standard
error-to-warn downgrade, runs before `resolveFindings` too. Every warn-first migration this repository
has performed is therefore config-escalatable, and `U13` (skill-registration) is the live instance:
it ships as `warn` at Standard 0.12 and graduates at 0.13 today.

A narrower response was available and was rejected: the config layer exists precisely to let a consumer
escalate a rule, so it is arguable that someone writing `S4: "error"` asked for exactly this behavior,
and the guarantee could simply have been caveated. That was rejected because at least two further
warn-first migrations are already scheduled (frontmatter vocabulary strictness and the validator-parity
contract), and caveating the same guarantee once per migration is worse than making it true once.

**Resolution:** a finding-level migration cap applied inside severity resolution, as a **ceiling and
never a floor**, with suppression and `off` still winning so a consumer can always silence a finding.
`U13` is deliberately left alone in this release and the observation is recorded as a backlog item;
lowering a severity is always safe under ADR 0027, so that work is scope-bound rather than
policy-bound.

## Round 3

Re-run after round 2's fix, with an explicit instruction to attack the migration cap itself and to
check whether the release records accurately describe what the code does.

**Verdict: needs-attention.** Four findings, all medium. The cap survived the severity-ordering
matrix; every finding was about a claim exceeding the implementation.

### R3-1 [medium] Designed reports discarded the migration-cap explanation

The terminal and JSON paths carried `migrationNotice`; the Markdown and HTML renderers projected only
`lead.message` and dropped it. So a consumer who set `rules: { "S4": "error" }`, got a warning, and
opened the shareable report saw no explanation for why their configuration appeared to be ignored. The
CHANGELOG for this release claimed the notice "reaches the terminal and the report", which was false
in the artifact a third party is most likely to read.

### R3-2 [medium] The README release guard still did not validate tier

`docs/internal/RELEASE.md` promises "README Status matches the declared **tier** + version". The guard
extended in this release checks version, skill count and spine size, and never reads `library.json`'s
tier or the README's tier claim. Its own docblock cited the tier promise as its justification. The
public grade could drift while the new trust gate reported green.

### R3-3 [medium] The changelog published the wrong test count

**The finding that matters most, because it is this release's own thesis failing inside this release.**
`CHANGELOG.md` claimed **647 tests**; three rounds of review had pushed the real number to **667**, and
`STATUS.md` still carried the pre-release **613**. Tagging would have published false verification
evidence in the trust patch's primary technical history.

Nobody wrote 647 dishonestly. It was true when typed and nothing re-read it, which is verbatim the
mechanism the `STATUS.md` rewrite in this same release exists to document: a number in prose that
nothing verifies drifts from true to false without anyone deciding to lie.

**Resolution:** counts reconciled; `STATUS.md` now states the **date** its count was measured so a
stale figure reads as stale; `docs/internal/RELEASE.md` gains "volatile counts written LAST" as an
explicit process step, labeled a process step and not a gated check; automation filed as backlog E27.
Skill count and spine size were already mechanically checked; the test count is not, because knowing it
requires running the suite.

### R3-4 [medium] ADR 0040 described superseded behavior as current

ADR 0040 (re-pin after an editorial metadata clarification) still asserted the string reader was purely
additive and moved no verdict, the exact claim ADR 0041 was written to correct, and still described
`emitPin` inheriting an unsupplied `repoHeadSha` as an open defect after this branch had fixed it. A
future maintainer reading the decision record would have got the opposite status from the code.

**Resolution:** two dated correction notes, appended rather than edited away. The false claim is left
standing above its correction on purpose: it was written, reviewed, and believed, and the fact that
only an outside pass reading code against claims caught it is the useful part of the record.

## Round 4

Re-run after round 3's fixes, scoped to release readiness and instructed to report only what should
block a tag.

**Verdict: needs-attention.** Four findings. **Two were regressions in round 3's own fixes.**

### R4-1 [medium] The tier guard accepted contradictory public grades

Round 3's tier check tested whether the claim contained **either** expected synonym anywhere:

```js
new RegExp(`\\b(${wantName}|${wantSub})\\b`, "i").test(claim)
```

With `library.json.tier` of `advanced`, **`Advanced (Silver)` passes**, because it contains
`Advanced`. So the guard added to prevent public tier drift would greenlight a README claiming two
different grades in one line. **Resolution:** validate a canonical, internally consistent claim and
reject tokens belonging to another tier, with contradictory-claim tests in both directions.

### R4-2 [medium] Mixed findings still lost migration notices

Round 3 projected `migrationNotice` from the **lead** finding of each requirement only. A real `S4`
(chain contracts) result containing an array-shaped orphan **error** plus a capped string-shaped
**warning** makes the error the lead, so the warning's notice disappeared from both renderers again.
The round-3 fix worked exactly when the capped finding happened to sort first. **Resolution:** collect
and render all unique notices for the requirement, with a regression case combining an uncapped error
and a capped warning.

### R4-3 [medium] The tier mapping was still not single-source

Round 3 moved `TIER_NAME` / `TIER_SUB` into `scripts/lib/tier.mjs` and the CHANGELOG claimed "One
mapping, three consumers, no second copy to drift." `scripts/generators/gen-index.mjs` retained an
independent `TIER_LABEL` and used it for generated tier text, so `G4` (generated-docs drift) output
could diverge from the reports and the README guard. The claim was written about the two consumers
that were looked at.

### R4-4 [medium] The release packet was a pre-fix snapshot

`plan_v1.10.1/README.md` still said `metadata.chain` is a nested list, ADR 0040 (re-pin after an
editorial metadata clarification) is Proposed, the pin was deliberately not moved, and the review had
two rounds with four findings. At HEAD the value is a comma-separated string, ADR 0040 is Accepted, the
pin moved, and the record held three rounds with eight findings. `RELEASE-PLAN.md` and
`validator-parity-baseline.md` repeated parts of the same stale state, so the tag's own advertised
evidence contradicted the code it described.

**This is the third instance of one mechanism inside this release**, after the test count and ADR 0040:
a document written to describe the plan, a plan that moved underneath it, and nothing re-reading the
document. **Resolution:** the whole packet rebaselined against HEAD, with the drift itself recorded at
the top of the README rather than quietly corrected, and the superseded scope rows kept as visible
corrections rather than deleted.

## What this review is evidence for

Twelve findings across four rounds. **Eleven were introduced by this release**, and the pattern
sharpens with each round:

- **Round 1** found defects in the implementation. Two had already been seen by a human and waved
  through: the trim was noticed and judged theoretical, and the `S4` carve-out was explicitly
  authorized in writing against an invariant stated three paragraphs above it in the same packet.
- **Round 2** found that round 1's own fix did not deliver what its ADR claimed.
- **Round 3** found almost nothing wrong with the code and four things wrong with the **claims about**
  the code: a notice that did not reach the reports it was said to reach, a guard whose docblock cited
  a promise it did not keep, a published test count that was stale, and a decision record describing
  fixed behavior as broken and corrected behavior as current.

The value of the pass was never that it read code nobody had read. It is that it read the code
**against the claims**, which the author stopped doing the moment the claims were written.

- **Round 4** found two **regressions in round 3's own fixes**, one duplicate the round-3 claim had
  overlooked, and a release packet that had gone stale under the work it described.

That is worth being precise about, because it is the difference between "review catches bugs" and what
actually happened here: by round 3 the code was essentially correct and the documentation was still
wrong in four places, including one number that would have shipped as false verification evidence in
the technical history of a release whose entire subject is unverified claims.

**The single recurring mechanism, stated once so it is not lost in twelve findings.** Every
documentation finding in rounds 3 and 4 has the same shape: a document was written describing intended
state, the state changed underneath it, and nothing re-read the document. It happened to the test
count, to ADR 0040, and to the release packet, three times inside the release whose thesis is that a
claim nothing verifies drifts from true to false without anyone deciding to lie. The code fixes here
are worth less than that observation.

It also sets the honest expectation for the next release. Four rounds were needed because rounds 2, 3
and 4 were each reviewing the previous round's corrections, and corrections written quickly under a
"nearly done" framing are exactly where this failure mode lives. The lesson is not "review more"; it
is that the claims should be written **last**, from the code, rather than first, from the plan.

That is the same lesson this repository keeps re-learning under different names, and the reason
`docs/internal/STATUS.md` needed rewriting in this very release: a document asserting facts about a
repository, with nothing checking it, drifts from true to false without anyone deciding to lie.
