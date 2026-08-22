# STATUS - agent-skills-toolkit

> The single live source of truth for "where are we / what is next." This file stays compact:
> per-release detail belongs in [`RELEASE-HISTORY.md`](RELEASE-HISTORY.md) (the readable narrative
> through-line, engineer and non-engineer framing), [`CHANGELOG.md`](../../CHANGELOG.md) (the full
> technical history), and `docs/internal/release-plans/` (the per-release spec + implementation
> packets). Do not add accretive per-release paragraphs here; append them to those instead.
>
> Last updated: 2026-08-22.

## Current state

| Fact | Value |
|---|---|
| Version | **1.15.0, SHIPPED 2026-08-20** - tag `9133014`, GitHub release published, npm `latest` with signed Sigstore provenance, registry `agent-plugins` **1.67.0** ([PR #82](https://github.com/product-on-purpose/agent-plugins/pull/82)). Previous: 1.14.0, shipped 2026-08-17 (tag `57727ab`, registry 1.66.0) |
| Declared tier | Advanced (Gold) - `library.json` `tier: advanced` |
| Standard pin | **0.15** |
| Spine | 34 checks |
| Scopes | 3 (plugin, component, marketplace) |
| Skills | **26** |
| Tests | 1376, 0 failures (1 skipped; local suite run **2026-08-22**, after v1.16.0 W4 added the capability-matrix drift guard and adversarial wave 1 grew it by three). It read **1359 at the shipped tag `9133014`**, confirmed there by `npm run release-ready` exiting 0 on the release runner |
| Self-proving | `node scripts/check.mjs .` exits 0 at Advanced, 0 errors, 0 warnings |

## v1.15.0 SHIPPED 2026-08-20

| Step | State |
| --- | --- |
| Tag | `v1.15.0` -> `9133014`, annotated and pushed |
| Release workflow | run `32443154744`, green. **All five gates ran on the runner**, not only locally: `Releasable: every release-blocking gate passed.` |
| GitHub release | published (not draft, not prerelease) |
| npm | `1.15.0` on `latest`, 211.7 kB packed / 72 files, SLSA provenance attestation present |
| Registry | `agent-plugins` 1.66.0 to **1.67.0**, [PR #82](https://github.com/product-on-purpose/agent-plugins/pull/82), `strict: true` preserved |

**The chain was smoke-verified from published state only** - `marketplace.json` on `agent-plugins@main` to
the pinned sha to that commit's `plugin.json` to the npm registry - rather than from the working tree that
produced it. That distinction earned itself during this cut: a leftover 2026-06-10 clone at another path
reported `v1.5.1` and was very nearly re-pinned from.

**The withheld window paid again.** Held open from 2026-08-18 to 2026-08-20, it absorbed five
`/code-review` rounds (38 findings) and adversarial wave 2 (5, one HIGH) - **53 findings across the
release, all closed** - and every round found defects in the previous round's fix code. The HIGH from wave
2 was a release gate that could not see a stated count wrapped in markdown bold.

**One correction landed between sign-off and the tag.** `CHANGELOG.md` and `RELEASE-NOTES.md` still carried
the prepared date, `2026-08-18`. A release entry dates the release, not the preparation, so [PR #263](https://github.com/product-on-purpose/agent-skills-toolkit/pull/263)
moved both to `2026-08-20` **before** the tag was cut, matching what v1.14.0 did. Dating a shipped artifact
to the day its branch happened to be ready is the small, quiet kind of false record this repository keeps
saying is worse than no record.

<!-- superseded 2026-08-20 by the table above; kept because the reason for withholding is the record.
     Everything below this comment, to the end of the blockquote, describes what was true 2026-08-18. -->
> **~~v1.15.0 is PREPARED and WITHHELD (2026-08-18)~~.** Everything is merged to `main`, the gate is green
> and `npm run release-ready` exits 0 on all five gates. **The tag, the GitHub release, the npm publish and
> the registry re-pin are deliberately not done**, pending maintainer sign-off. That is the v1.14.0 pattern
> repeated on purpose: its withheld window is where two defects were found that neither adversarial review
> wave could have caught.

**Standard 0.14 to 0.15. Spine stays 34. No check was added or removed, and no family verdict moved.**

**The scope grew after the cut commit, and the tag carries all of it.** The release was prepared for the
two graduations and `action-pin-watch`. While it was withheld for sign-off, two more bodies of work merged
to `main` and are folded in rather than deferred: the documentation-hygiene fixes (`universal-checks.md`
had stopped at `U13`; `RELEASE-HISTORY.md` was two releases behind) and the **three-skill capability
family** with [ADR 0054](decisions/0054-a-component-records-what-agent-version-it-was-checked-against.md).
Skills 24 to 26. The deciding argument was ordering: v1.16.0 relocates `vendor-claims.json`, which
`release-ready` reads as one of its five gates, and rebuilding the machine that certifies releases
underneath a certified release is the wrong sequence.

| What | Where |
| --- | --- |
| The two graduations (`S3` workflow mirror, `U17`) | ADR 0047 correction + ADR 0052 addendum, both dated |
| `action-pin-watch`, the fifth release gate | [ADR 0053](decisions/0053-a-pin-label-is-a-claim-and-behind-is-not-a-defect.md) |
| Packet | [`release-plans/plan_v1.15.0/`](release-plans/plan_v1.15.0/RELEASE-PLAN.md) |

**The graduations needed no code change**, exactly as ADR 0052 promised: `until: "0.15"` was already
committed in both check modules and the ADR 0044 ceiling resolves it against the consumer's pin. The human
obligation was the version note.

**Both were decided on evidence taken before the scope was set.** The `U17` census is **unchanged in every
cell** (7 manifests, 6 of-plugins, 1 of-skills, **0 mixed, 0 malformed**), which ADR 0052 had made a
decision input rather than a formality. It graduates anyway, because nothing schedules the corpus growth
that would ever change that answer, so "extend the window" would have been "never gates" decided quietly.

**The best evidence in the release is the other graduation.** ADR 0047 windowed the workflow mirror because
graduating it unwindowed cost `thinking-framework-skills` a tier on nine undeclared workflows. **That member
declared all nine in `fd343dd` on 2026-08-15 - one day after the ADR was ratified, inside the window it
created.** A warn-first migration observed doing its whole job, end to end, for the first time here. ADR
0047's forward-looking cost claim is falsified and carries a dated correction; STATUS's own v1.14.0 row is
deliberately NOT touched, because it is a correctly-dated historical measurement.

### Review wave 1 found ten, five HIGH, and two of them falsified ADR 0053 itself

**The check's central safety property did not hold.** ADR 0053 claimed no reason string could waive a
disagreeing pin label. With a refusal outranking a label problem, one wrong label plus one unrelated 503
collapsed to exit 2 - which `release-ready` makes overridable - so a network reason string marked a release
with a proven bad label **releasable**. Fixed by inverting the precedence: **a known defect outranks
uncertainty.** Only an integration test through the real gate table catches it; the watch's own unit test
passed throughout.

**And the single defect the check reported was a FALSE POSITIVE against this repository's own file.** One
commit routinely carries several tags - `softprops/action-gh-release` carries `v3.0.2` and `v3` on the same
commit - and the check read only whichever the registry listed first. **That is the failure mode this
repository grades other tools on**, from the v1.14.0 thesis: the worst failure is not missing a defect, it
is reporting one that is not there. Corrected: **this repository has zero label defects**, and the failing
path is now demonstrated against the real historical `codeql-action` case instead.

**The suite reported 1,281 passing and zero failures while every one of those defects was live.**

### FIVE REVIEW ROUNDS, 38 FINDINGS (2026-08-19)

A max-effort repository code review over `v1.14.0..HEAD` returned **fifteen findings**, eight of them
blocking. **All fifteen are now CLOSED**, each carrying a dated note under its own text saying what was
done and how it was proved, in
[`release-plans/plan_v1.15.0/review-findings.md`](release-plans/plan_v1.15.0/review-findings.md).

**Then the fix code was reviewed. Four more times.** Each round read the previous round's fixes, and each
has its own dated section in that file. **Thirty-seven of the thirty-eight findings are closed**; the one
deferred is recorded with its reason.

| Round | Scope | Findings | Blocking |
| --- | --- | --- | --- |
| 1 | the release (`v1.14.0..HEAD`) | 15 | 8 |
| 2 | the fixes for those 15 | 5 | 2 |
| 3 | the fixes for those 5 | 6 | 0 |
| 4 | the fixes for those 6 | 7 | 0 |
| 5 | the fixes for those 7 | 5 | 1 |

**Every round found defects in the previous round's fix code.** The honest reading is not that reviewing is
futile - round 1 alone found eight blocking defects in a release that was about to be tagged - but that
**fix code deserves the same scrutiny as the code it fixes, every time.** Severity, not count, is the signal:
rounds 3 and 4 returned nothing blocking, and round 5's one blocking finding was a regression from a
deliberate design change rather than a fresh defect.

**And `S2` is the best example of two correct decisions composing into a wrong one.** `F10` gave the harness
a gate timeout; `F2` made a harness kill non-overridable. Together, a slow registry - the exact case the
override exists for - arrived as a non-overridable block. The watch now bounds its **own** run and reports a
refusal, so a harness kill again means only that a process is wedged.

**Round 4 changed the design rather than the heuristic, and round 5 confirmed it while catching one
regression that change introduced.** `versionInComment` had been wrong four rounds running - first-token,
last-token, any-forward-marker, tight-else-first - each time a FALSE block on a correct pin. It now declines
to guess: one token is the claim, an unambiguous tight transition names the claim, anything else is
`LABEL_AMBIGUOUS`, advisory and loudly counted. Round 5's `U1` found that the new state was consulted on SHA
pins only, so an ambiguous comment on a TAG ref passed silently under "Every label is accurate"; fixed for
every ref kind. **Round 5 also found three false statements in these records, including a closure note
claiming a test that did not exist - corrected, because a record that says something untrue is worse than
one that says nothing.** Two of its findings are deferred to v1.15.1 or wave 2 with stated reasons.

**A sixth round is not recommended.** The remaining risk is better spent on the wave that has never run.

### ADVERSARIAL WAVE 2 RAN 2026-08-20. CRITERION 6 IS DISCHARGED. ONLY SIGN-OFF HOLDS THE TAG

**Five findings, one HIGH, all closed** - and **every one in territory the five `/code-review` rounds never
entered**, which is the entire argument for using a different instrument.

**The HIGH is the sharpest defect of the whole release.** `check-release-counts` could not see a stated
count wrapped in markdown bold: `**1292**, 0 failures` parsed as no claim at all. The packet's own
`## Final numbers` table said 1292 while the same file said 1352 two sections later, and the gate reported
**"agrees everywhere checked"** - a sentence that was true, and true only because the disagreeing claim was
invisible to it. **The guard whose whole justification is that a human corrected this same drift three times
in v1.10.1 was defeated by a stated count in bold.** Fixed by tolerating emphasis at the token seams, and
proved on the real repository: the gate immediately reported the line it had been blind to.

The other four are the two new skills contradicting their own contracts - each a document telling an
invocation to do two incompatible things, and one of them (**"every surface publishes versioned entries"**,
false for agentskills.io) had shipped publicly in `CHANGELOG.md`.

**Getting it to run was itself a finding.** Two attempts died and neither was recorded as a result. The
cause was `windows.sandbox = "elevated"` against a non-elevated Codex process: every `pwsh.exe` spawn
returned `exit -1`, Codex silently fell back to reviewing the PUSHED copy over the GitHub connector, died
four minutes in - and the job reported `status: running` **for 67 minutes over a dead process**, with two
`verdict: approve, findings: []` messages sitting in its buffer. Three mechanisms failing toward looks-fine
at once; `updatedAt`, log size and process CPU are what told them apart.

**~~What holds the tag now: maintainer sign-off. Nothing else.~~** Given 2026-08-20. Nothing holds it; it is cut.

<!-- superseded 2026-08-20, kept for the record of what was true before wave 2 ran -->
**~~What held the tag~~:** acceptance criterion 6, the second adversarial wave, which has never run and is
not satisfied by any of these fixes, by the review that produced the findings, or by any self-review. Codex
credits return **2026-08-20**, and it reads the repository with a different instrument than the five rounds
above did - which is the whole reason no number of them substitutes for it.

The two worst shared one shape: **a gate reporting success while checking nothing.** A symlinked or
junctioned checkout made `action-pin-watch` never run its main function - it printed nothing, exited 0, and
`release-ready` recorded `ok action-pins (exit 0)` on zero pins. And `gateBlocks` treated the exit-127
sentinel, the code meaning a gate could not be SPAWNED, as a pass for both network-bound gates. Both were
independently re-reproduced by hand before being written down, **and both reproductions were re-run against
the fixes.** Each fix is mutation-proved, and `F2` removed `blocksOn` outright rather than patching it,
because the field read as a filter while holding an enumeration - ADR 0053 carries a dated correction.

**One finding is the review-the-fixes pattern exactly, and it turned out to be sharper than recorded.**
Wave 1 correctly fixed a multi-tag FALSE POSITIVE by making the label rule permissive; the side effect was
never weighed, and a bare `# v3` label was then accepted forever however far the SHA advanced - the precise
Dependabot drift the check exists to catch, in the pin format this repository's own runbook prescribed, with
the shipped test asserting the permissive behaviour so CI stayed green over the hole.

**What the fix revealed: this was not a gap in the design, it was a reversal of a ratified decision.**
ADR 0053's own text had already decided this case by name, using this exact example - *"`# v3` against a SHA
resolving to `v3.0.2` is not false, and it names nothing a reviewer can check, which is exactly how the next
bump becomes invisible."* A written decision was undone by a bug fix, and that fix's test locked it in. The
new `LABEL_FLOATS` verdict restores the rule rather than inventing one; ADR 0053 and the runbook both carry
dated corrections.

**And the instrument determined the result, which is its own lesson.** An earlier attempt used a reviewer
that reads the session TRANSCRIPT rather than the repository. It returned four findings, all real, none of
this class. Reading the actual files returned fifteen.

### ~~What is NOT discharged~~ - DISCHARGED 2026-08-20

<!-- superseded 2026-08-20: wave 2 ran. Kept because it is the record of what was true for two days,
     and because "a killed run is UNMEASURED and never a result" is the rule that made the re-run happen. -->
**~~Adversarial review wave 2 did not run.~~** The Codex runtime returned a usage-limit error before the
reviewer started, so the run produced nothing. Per the standing rule that a killed run is UNMEASURED and
never a result, **acceptance criterion 6 of the packet is open**, and no wave-2 finding count should be
quoted anywhere. A stopgap self-review covered the wave-2 target areas (records, drift machinery,
forward-in-time, the consumer re-pin path) and found no defect, but a self-review is not an independent
wave and does not discharge the criterion.

**It ran on 2026-08-20 and returned five findings, one HIGH, all closed** - see the wave-2 section above.
The stopgap self-review had found no defect in the same target areas that wave 2 then found five in, which
is the clearest measurement this release produced of what a self-review is worth.

## The v1.14.0 ADR pack: RATIFIED and IMPLEMENTED

Seven decisions (ADRs 0046 to 0052), ratified 2026-08-14, implemented across seven PRs. Every
recommendation was measured before it was written, and **three of the seven were overturned by that
measurement.** Spine 31 to 34, Standard 0.13 to 0.14. **No family verdict moved at any step.**

| ADR | Decides | Adds | Landed | Measured family effect |
|---|---|---|---|---|
| [0046](decisions/0046-agents-directory-holds-only-registered-subagents.md) | **E42**: `agents/` holds only registered subagents; do NOT widen `S2`/`S4`/`S8` | `U15` | #217 | none |
| [0047](decisions/0047-workflows-are-a-loaded-component.md) | **E43**: build `ctx.workflows` (bug fix) + `S3` workflow mirror (windowed to 0.15) | - | #216 | 9 warns on `thinking-framework-skills`, no verdict moved |
| [0048](decisions/0048-a-command-is-not-a-skill-and-is-not-graded-as-one.md) | **commands-as-skills**: no. Sec 3.2's MUST splits into MUST + SHOULD | - | this PR | none |
| [0049](decisions/0049-u5-abstains-rather-than-failing-what-it-cannot-read.md) | **E14**: `U5` declines below English density 0.10 | - | #215 | none (French corpus 346 findings to 3) |
| [0050](decisions/0050-frontmatter-vocabulary-is-open-and-placement-is-checked.md) | **frontmatter strictness**: vocabulary stays OPEN; placement is checked | `U16` | #218 | 6 warns on `critique-skills`, no verdict moved |
| [0051](decisions/0051-no-cross-member-finding-graduates-to-the-spine.md) | **E34**: none graduate; ratifies the unilateral-remedy test | - | this PR | none |
| [0052](decisions/0052-a-catalogue-manifest-no-scope-can-read-is-a-defect.md) | **E36**: a mixed manifest is itself a defect | `U17` | #219 | none |

**The three overturned recommendations, each recorded in its ADR with the numbers:**

- **E42's own framing was wrong.** Widening the four Silver checks was prototyped and its remediation
  tells the author to declare `agents/README.md` as a subagent, CREATING the phantom the 2026-08-06 `G8`
  exemption exists to prevent. One new check making the two lists provably equal shipped instead.
- **E14's backlog-recommended option (c)** - a language-independent structural signal - fires on **99.9
  percent** of 2068 descriptions across seven corpora, including 94.4 percent of Anthropic's own. It
  cannot discriminate and cannot be a scoring component.
- **Frontmatter strictness** would fail **44.9 percent** of 2342 measured skills, against a `metadata`
  map the upstream spec calls arbitrary. The Standard now states the openness as a RULE.

**Also found while measuring, and shipped ahead of the pack (#214):** a live regression in ADR 0045's own
guarantee. The marketplace `A6` reading iterated `ctx.subagents` while `U14` read `ctx.agentDocs`, so the
same plugin got different answers depending on how it was graded. ADR 0045 shared the FIELD list to
prevent exactly that; it did not share the AGENT list. ADR 0045 is **not amended** - its decision was
sound and the implementation diverged a release later - but it carries a dated correction.

**Closed by this pack:** E14, E34, E36, E42, E43.

**ADR 0048 was AMENDED IN PLACE on 2026-08-15, one day after ratification, and the process failure is the
lesson.** Its decision stands and nothing was reverted, but its premise was false: it asserted that a command
is not a skill, and Claude Code states *"Custom commands have been merged into skills"*. The **2026-08-10
internal audit had already found this** and graded `S7` a CONFLICT (conceptual) - that finding is the reason
"commands-as-skills" was on the v1.14.0 list at all. The ADR answered a vendor-alignment question by measuring
description scores and never opened the audit's evidence. The right reason turns out to be INVOCATION CONTROL:
a command is a skill a model does not load automatically, so its description performs no trigger matching.
`STANDARD.md` sec 3.2 and its 0.14 version note carry the correction; **E44** records the larger finding (a
`skills/` file declaring `disable-model-invocation: true` has the same property, measured population **0 of
2435**, so no check is warranted yet).


**Two gaps left open by decision, both recorded in their ADRs:** nothing yet catches a `metadata.version`
that is ABSENT entirely (that check would fire on every component of every plugin that never adopted the
convention), and nothing enforces that a command's description agrees with its backing skill's intent
(a judgment call the deterministic gate does not take, now visible as a SHOULD rather than hidden inside
an unenforced MUST).

**Before graduating `U17` at 0.15, re-run the manifest census.** It shipped warn-first because a census
of every real manifest found 7 (6 of-plugins, 1 of-skills, zero mixed, zero malformed): it is preventive,
not corrective, and gating a check nothing has ever tripped deserves re-examination rather than a default.
## Vendor-watch is standing (2026-08-15)

This repository asserts vendor behaviour as **fact** - in normative Standard text and in shipped findings.
`U14` quotes a Claude Code sentence in every finding it emits; `U15` is `vendor-cited` because it rests on
how the runtime discovers subagents; sec 3.2 explains itself by reference to how commands are invoked.
**Each of those was a page somebody read once and a date they wrote down.**

**What it cost, before it existed:** ADR 0048 was ratified on 2026-08-14 asserting that a command is not a
skill. Claude Code says *"Custom commands have been merged into skills."* The 2026-08-10 internal audit had
**already found this** and graded `S7` a CONFLICT. The evidence existed; nothing was re-reading it.

`foundation/claims/vendor-claims.json` pins eight claims (6 quote, 2 probe) across four vendor pages, each carrying what
depends on it and what to do when it fails. `npm run release-ready` re-checks them **inside `release.yml` and
`publish-npm.yml`**, so a tag or a publish is blocked by a claim the vendor no longer makes; a monthly
workflow opens an issue rather than editing anything. **Freshness blocks only what age can actually
prove, and this section said otherwise until 2026-08-17.** A PROBE past the 30-day window is STALE, which
is exit 1, which blocks, because age is a probe's whole verification. A QUOTE is re-confirmed against the
live page on every run, so an old reading date is reported as a NOTE and never enters the exit code. The
first version blocked on both, which would have jammed every release from 2026-09-14 with no remedy but
hand-editing the dates `RELEASE.md` forbids; corrected in #232 before the tag.

**Two design calls worth knowing.** It pins **claims, not pages** - a page hash would fire on every
navigation change and be ignored within a month, whereas what this repository depends on is specific
sentences. And a claim is either a **`quote`** (a sentence that must still appear, checked automatically) or
a **`probe`** (an empirical behaviour no page states, where the watch reports the AGE and names the
reproduction and **never claims to have verified it**). `U15`'s discovery behaviour is a probe: it was
established by installing a plugin and looking at what registered.

**Refusal outranks a clean result.** Exit 2 when a page could not be read, because a watch that passes
because it could not reach the page is worse than no watch.

**The issue path is PROVEN in production as of 2026-08-17, having shipped "assumed, not tested."** The
workflow's only dispatch had exited 0, so the `github-script` step was skipped and wave 2's H4 dedup fix
was asserted by a unit test reading the workflow file as text. Two deliberate dispatches with
`--today 2026-10-01`, which ages the two probes out for real against the real pages with nothing faked,
drove exit 1 into it. Run 1 opened issue #236 and self-provisioned the `vendor-watch` label; run 2
commented on #236 instead of opening a second. **One issue and one comment from two failing runs** is the
whole H4 fix, demonstrated. Occasioned by #235 bumping `actions/github-script` v7 to v9, a line no CI
check on this repository executes. Drill issue closed; no claim is actually stale.

## Two adversarial review waves, ten findings, all fixed (2026-08-16)

Wave 1 was narrow and deep on the three checks this release adds. Wave 2 was pointed deliberately **away** from
that target - at the release's own records, its published normative text, and the machinery that is supposed to
catch drift. The v1.13.0 evidence is why: rounds 2 through 7 sat flat at about five findings each, and round 8,
reframed, found four HIGHs. **A second wave aimed where the first one looked finds the same things.**

| Wave | Pointed at | Found | Theme |
| --- | --- | --- | --- |
| 1 | the new checks (`U15`, `U16`, `U17`) and their libraries | 4 | assumptions the code made that the vendor does not guarantee |
| 2 | records, normative text, and the drift machinery | 6 | **things that read as checked and are not** |

Wave 2's six share one shape. The shipped Standard contradicted itself across three sections. The README drift
guard covered four of five front-door claims, so the fifth drifted a full minor and the suite stayed green. Two
pinned vendor claims were bare tokens and could never fail. The monthly watcher deduplicated on a label nobody
had created. The release-blocking preconditions were a checklist a human ticked, and the one that mattered most
had never been run by any workflow. And the prose describing the claims pin counted a version of it from two
growth steps earlier.

**Every fix is a guard, not a correction.** `standard-self-consistency.test.mjs` holds the Standard's sections in
agreement; `check-readme-version.mjs` now covers the Standard pin; a **meaning-reversal table** requires every
pinned vendor claim to demonstrably fail against a page that says the opposite, and a further test requires the
reversals themselves to be honest; the watcher deduplicates on a marker it writes itself; `npm run release-ready`
replaces four checklist lines with one exit code that `release.yml` and `publish-npm.yml` both run. **The aggregate
blocked its own first real run** - on 7 failing tests and a stale count that had not yet reached CI.

## What is open

- **ADR 0039 (marketplace-scope evaluation) is IMPLEMENTED** in v1.12.0: a third evaluation scope
  grading a `marketplace.json` catalogue as a whole, aggregated as self-consistency worst-member,
  with the collection report as the sixth report type. The spine did not move; every finding it
  emits is scope-local and carries no `reqId`. Two follow-ups are filed rather than done:
  **E33** (A6 restricted fields are detected in marketplace scope but not in plugin scope) and
  **E34** (whether any cross-member finding should become a numbered spine check at all). **They are
  now scheduled apart, and this line said otherwise until 2026-08-13:** E33 lands in the Standard 0.13
  cut (v1.13.0) as `U14` with its own ADR 0045; **E34 defers to v1.14.0**, because its prior question -
  whether a plugin can be held to a collision with a sibling it does not know it is catalogued beside -
  has no ADR, and no release should graduate the set wholesale merely because it happens to be carrying
  a Standard bump.
- **npm is CURRENT: the registry serves 1.15.0**, published 2026-08-20 via trusted publishing.
  **This line read `1.13.0` from 2026-08-14 to 2026-08-20**, having gone unrefreshed through the v1.14.0
  cut; the mechanism described below did not change, only the version it last carried. The mechanism, from
  the 1.13.0 publish onward: trusted publishing
  (OIDC) with **no stored credential of any kind** - the repository holds zero Actions secrets, and
  authentication is the runner's short-lived OIDC token alone. The published tarball carries an
  automatic SLSA provenance attestation and a registry signature; `--provenance` is not passed,
  because trusted publishing generates it for a public package from a public repository. The
  workflow asserts the npm >= 11.5.1 and Node >= 22.14.0 floors OIDC requires rather than
  inheriting whatever npm the pinned Node bundles.
  **1.12.0 was deliberately never published.** It carried the three high-severity defects v1.12.1
  fixed, and an npm publish is irreversible after 72 hours, so shipping it would have left a
  knowingly-defective version permanently installable by exact version. npm's version history is
  not required to be contiguous; `CHANGELOG.md` and the GitHub releases carry the full record.
  Verified from the consumer position after publishing, per `RELEASE.md`: installed from the live
  registry into a clean directory outside this repository and graded a plugin with `npx`, which
  returned `Tier: Advanced`, 0 errors, 0 warnings, exit 0.
  **Re-run for 1.15.0 on 2026-08-20, both paths.** `npx agent-skills-toolkit@1.15.0` reports `1.15.0`,
  and against a throwaway plugin outside this repository it returned `Tier: None`, 6 errors, **exit 1**;
  after fixing only the two Universal blockers it returned `Tier: Universal`, 0 errors, **exit 0**.
  Running the passing case as well as the failing one is deliberate - on a clean gate some behaviour
  appears nowhere at all, which is how a provenance defect stayed hidden through v1.14.0.
  The tarball was also checked from outside itself: **all eight maintainer-only libraries** are absent
  (`action-pin-watch`, `release-ready`, `vendor-watch`, `standards-watch`, `eval-run`, `advisory-score`,
  `craft-review`, `stated-counts`), 72 files, 211.7 kB packed.
  **Still outstanding, and blocking nothing:** the package is still owned by `jprisant` rather than
  the `product-on-purpose` org. The transfer must be done in the npmjs.com web UI, because
  `npm owner add product-on-purpose:developers` expects a username, not a team.
- **The validator-parity harness is GATING** as of v1.12.0, discharging ADR 0042's scheduled flip.
  Its stated condition was met by v1.11.0 and v1.11.1 completing real CI cycles green. One
  consequence was accepted knowingly: under gating, a run where `uvx` cannot be installed reds a
  required check rather than printing a line nobody reads.
- **E37 (the shell-probe timing budget) is FIXED, and the release-time counts gate now passes on this
  workstation.** It had been an escalation from how it was filed: `scripts/check-release-counts.mjs`
  compares both halves of a stated count (total AND failures), so while E37's two wall-clock cases failed
  locally, `npm run release-counts` reported drift against any truthful "N tests, 0 failures" claim and
  exited non-zero - and `RELEASE.md` names that command as non-negotiable. Landed 2026-08-13 as **W6 of
  v1.13.0** with the **two different fixes** the corrected entry called for, one per case. Now measured
  locally: `release-counts` exit 0 against a truthful count, both cases 5-of-5 under spawn-heavy load,
  and a full suite run leaving **zero** stray processes where it previously left about five.
  **Three things measurement corrected in the plan** and they are worth reading before writing a similar
  one: the accumulating orphan was the probe candidate, not the helper the plan named (the helper cannot
  outlive its parent on Windows); "30 s or more" was not enough on its own, since a bar derived from a
  30 s lifetime still failed 1 run in 5 under load; and asserting that the cleanup must succeed put the
  flakiness straight back, because the forced kill itself fails under load. Full entry in
  [`backlog/enhancements.md`](backlog/enhancements.md).
- **E13 (defect-rich model triple) is DONE.** Run 2026-08-04, recorded as batch 2026-08-04 runs
  12-14 in [`eval-runs.md`](eval-runs/eval-runs.md). Three real dispatches (Haiku 4.5, Sonnet 5,
  Opus 5, effort held at `high`) against the seeded-defect fixture. All three cells are
  **PROVISIONAL pending E16** (below) - the run is real, but the scoring rule underneath it has a
  known gap.
- **Measurement-instrument defects the E13 run raised, all open:**
  - **E16** (multi-entry credit gap) - a finding satisfying two planted-defect entries at once is
    credited to neither, which suppresses precision and recall together. Blocks publishing any
    E13 cell as final.
  - **E17** (no adjudication path) - the scoring harness cannot consume a hand-adjudicated
    resolution, so every published pair is hand-computed with nothing checking the arithmetic.
  - **E20** (key readable from inside the fixture tree) - the seeded-defect scoring key sits
    inside the directory an evaluating agent is pointed at, so a run that reads it produces a
    transcription rather than a measurement, undetectably.
  - **E15** (three eval-run runner defects) - a component-scope verdict taken from a plugin-scope
    grading, an aggregator that would append rows its own charter forbids, and one target's
    refusal aborting a whole multi-target batch.
- **Gate coverage gaps, all open:**
  - **E18** (U6 reference-links scans skills only) - link rot in a command or subagent is
    invisible to the check; ADR-gated (needs a warn-first burndown).
  - **E19** (nothing resolves `.claude-plugin/plugin.json` component paths) - a Claude manifest
    naming a file that does not exist on disk passes clean; ADR-gated.
  - **E22** (U3 frontmatter-valid never validates `agents/`) - the check iterates skills only, so
    a subagent's frontmatter is entirely unchecked. (The related G8 folder-readme defect this same
    dogfooding pass found - a phantom subagent registered from an `agents/README.md` - is already
    fixed; only the U3 gap remains open.)
- **Calibration, open, ADR-gated:** **E14** - U5 (description-score) is mathematically unpassable
  in a language its English trigger pattern does not know (0 of 346 on a French corpus). Needs a
  design ADR, not a patch that adds one more language's vocabulary.
- **Two gaps v1.13.0 shipped KNOWINGLY, both ADR-gated, both found by its own review rounds:**
  - **E42** (four checks read the agent REGISTRATION list) - `S2`, `S3`, `S4` and `S8` iterate
    `ctx.subagents`, which excludes `agents/README.md` and underscore-prefixed files. Claude Code loads
    them anyway, so `agents/_worker.md` bypasses the registration, prefix, metadata and chain checks while
    the gate awards Silver or Gold. `U14` was fixed to read `ctx.agentDocs`; these four were not, because
    widening them makes EXISTING checks emit findings on files they have never examined. That is a
    Standard tightening, and ADR 0044 - shipped in this very release - says tightenings get an ADR and a
    pin-gated migration window. The ADR must first decide whether an unregistered runtime-loaded agent
    file is a REGISTRATION defect or a SHIPPING defect; the vendor behaviour argues the second.
  - **E43** (`ctx.workflows` is read by `S7` and never built by the loader) - a command mapping to a real
    `_workflows/<name>.md` is reported unresolved, and `S3`/`S8` do not inspect workflows at all. An
    unfinished feature rather than a regression: the source comment says "ctx.workflows arrives in a later
    phase". Finishing it means wiring canonical discovery through four checks plus index generation.
- **E45 (pinned-action labels are unchecked, and superseding Dependabot blinds it) is FILED, and it has a
  live consequence.** Two halves, one lookup closes both. Dependabot advances a SHA pin and leaves the
  trailing `# vX.Y.Z pinned <date>` comment behind, so the only half a reviewer reads decays into a lie on
  every bump: caught three times by eye (#187, #198, #225) and never by a machine. And closing those PRs is
  what stopped Dependabot reporting `actions/checkout@v4` in `vendor-watch.yml` at all, proven by the
  #150-merged / #159-closed natural experiment. **The live consequence: #225 was closed on 2026-08-17, so
  `codeql.yml`'s three pins are now watched by nothing.** Design and exit-code discipline sketched in the
  backlog entry; it is network-bearing and wants its own decision rather than a rider on a version bump.
- **Backlog from the competitive-comparison intake. This line said "all open" until 2026-08-18 and
  two and a half of the items had shipped seven days after it was written.** **E4** (SARIF + GitHub
  annotations) and **E9** (provenance as a first-class output contract) are **RESOLVED in v1.11.0**;
  **E23** (surface check provenance in the report output) is **PARTIAL** - its finding-level half
  shipped with E9, and the half it was filed for did not, so `node scripts/check.mjs .` on a clean
  run prints a tier and two counts with no provenance anywhere. Still open: **E6** (prompt-injection
  + curl-pipe-bash content scan), **E2** (deeper MCP secret scanning), **E5** (semver-bump-vs-diff
  verification), **E7** (eval harness hardening), **E8** (published conformance suite), **E21**
  (`covers` has no shape for a cross-component eval), **E3** (gate-config follow-ups: autofix,
  custom profiles, fingerprint suppressions), **E10** (MCP-served-skill validation - watch only, no
  concrete target yet).

  **The correction is worth more than the three statuses.** Nothing here is wrong about the code:
  v1.11.0's `CHANGELOG` entry names E4, E9 and E23 by number and describes what each shipped. What
  drifted is the two places a reader goes to ask "what is left" - this line and the backlog's own
  `Status` fields - and neither is checked by anything, in a repository whose front-door version,
  tier, skill count, spine size and Standard pin are all machine-guarded. **E23 also shows why the
  CHANGELOG is not a sufficient source:** reading it would have closed all three, and running the two
  commands is what split E23 in half. This is the second such lag on record (E11 carries the same
  note from 2026-07-27), and it is the concrete argument for the **audit-intake index** the
  2026-08-10 internal audit asked for and nobody built.

## Where this is going

One line per release; version numbers beyond v1.10.1 name a shape, not a promise. This
sequencing came from a dated internal audit (2026-08-10, held locally, not a followable link from
this file); the conclusions are stated here directly.

- **v1.10.1 "trust patch" (this cut):** promote the four held `[Unreleased]` changelog entries,
  this STATUS rewrite, a standards-watch re-run, the Windows argv path fix plus a
  `windows-latest` CI job, and a disposition for the component-version drift this release
  surfaced.
- **v1.11.0 "reach":** publish the gate as an npm package with an npx-runnable bin, `--json` on
  `check.mjs`, SARIF plus GitHub annotations (E4), provenance on every finding in every output
  (E9, E23), a GitHub Action wrapping the gate, a CI-generated sha-pinned tier badge, and a
  validator-parity CI harness running report-only.
- **v1.12.0 "marketplace scope" (this cut):** implement ADR 0039 (marketplace-scope evaluation), the
  collection report, new marketplace source kinds (`npm`, `archive`+`sha256`, `git-subdir`) and the
  `renames` field, the plugin-shipped-agent restricted-fields reading, the docs-site registry page,
  and the ADR 0042 parity flip to gating.
- **v1.13.0 "the contract you adopted" (SHIPPED 2026-08-14):** **the Standard 0.13 cut**, narrowed during planning
  on 2026-08-12 from the four-workstream scope this list previously assigned it. One post-resolution
  Standard ceiling over `since` and `until` (ADR 0044), which **closes E26 and E38**; `U13`'s warn-to-error
  graduation and ADR 0041's chain-migration cap graduation, both discharged through that ceiling;
  **E33** as `U14` with its own ADR 0045 (spine 30 to 31); **E35**'s `gen-index` fix carrying a
  migration; and **E37**, pulled in because it blocks the release-time counts gate. Packet at
  [`release-plans/plan_v1.13.0/RELEASE-PLAN.md`](release-plans/plan_v1.13.0/RELEASE-PLAN.md).
- **v1.14.0 "current with the vendors" (SHIPPED 2026-08-17):** the seven-ADR pack, ratified and
  implemented - see "The v1.14.0 ADR pack" above. Spine 31 to 34, Standard 0.13 to 0.14, and no family
  verdict moved at any step. **vendor-watch is now standing** (see below). Tag `57727ab`, GitHub release
  published, npm `latest` with signed Sigstore provenance, registry `agent-plugins` 1.66.0. **This entry
  read "release not yet cut" with a "Remaining for this release" list until 2026-08-18.** **The ADR-first
  order was deliberate and it paid:** measurement overturned three of the seven recommendations before a
  line of implementation was written, which is exactly the cost bundling undrafted ADRs with a Standard
  bump imposed on v1.13.0.

- **v1.15.0 "a window that never closes is not a window" (SHIPPED 2026-08-20):** **the Standard 0.15 cut.**
  Tag `9133014`, GitHub release published, npm `latest` with signed Sigstore provenance, registry
  `agent-plugins` 1.67.0 ([PR #82](https://github.com/product-on-purpose/agent-plugins/pull/82)).
  **This line read "PREPARED 2026-08-18, NOT YET TAGGED" until 2026-08-20.**
  The two windowed checks graduate from `warn` to gate-failing `error` - `S3`'s workflow mirror
  (ADR 0047) and `U17` (ADR 0052) - plus **E45** (pinned-action labels are unchecked) with its own ADR.
  Packet at [`release-plans/plan_v1.15.0/RELEASE-PLAN.md`](release-plans/plan_v1.15.0/RELEASE-PLAN.md).
  **This line assigned v1.15.0 to the evidence batch until 2026-08-18**, disagreeing with the release
  record since 2026-08-17; the evidence batch moves to v1.16.0.
  Three measurements taken before the scope was set, all in the packet: the `U17` census reproduces in
  every cell (7 manifests, 6 of-plugins, 1 of-skills, **0 mixed, 0 malformed**), **neither check produces
  a single finding on any family member** so no verdict can move, and **`thinking-framework-skills`
  remediated its nine undeclared workflows in `fd343dd` on 2026-08-15, one day inside the window ADR 0047
  created for it** - the first end-to-end observation of a warn-first migration doing its whole job, and
  the reason to close the window on schedule rather than extend it.
- **v1.16.0 "the evidence gets an address" (NEXT, packet open):** promote the shared world-facts this
  Standard rests on into a top-level `foundation/` folder - `vendor-claims.json`, `upstream-pin.json`,
  `surveyed-pin.json`, the capability matrix and the surveys - with `method` a first-class field on every
  source record, plus `tier-basis.md`, the artifact recording which vendor fact each tier boundary rests
  on. Four workstreams; **W1 is an ADR that ratifies the layout before anything moves.** Packet at
  [`release-plans/plan_v1.16.0/RELEASE-PLAN.md`](release-plans/plan_v1.16.0/RELEASE-PLAN.md).
  **Scope addition 2026-08-20, SUPERSEDED the same day:** the **onboarding and documentation resource
  plan** and the **Astro documentation site** were admitted here, then moved to **v1.17.0** once their
  plan was written and the maintainer asked for the funnel to be a release centrepiece. v1.16.0 keeps
  the four `foundation/` workstreams it was specified with. See the annotated scope note in the packet
  and [`release-plans/plan_v1.17.0/RELEASE-PLAN.md`](release-plans/plan_v1.17.0/RELEASE-PLAN.md).
  **This line described a different v1.16.0 until 2026-08-20**, namely the eval-instrument batch below.
  The packet was written and merged (#247, #261) while this line went unrefreshed; the packet wins.
- **Unscheduled, and explicitly NOT dropped - the eval-instrument batch.** Fix the measurement instrument
  (**E16** advisory-score credits nothing when one finding engages two defect entries; **E17** the scoring
  harness cannot consume an adjudication; **E20** the seeded-defect key is readable from inside the fixture
  tree; **E15** three eval-run runner defects), publish the **E13** defect-rich model-triple readings as
  final, and execute the live-hook behavioral evals. **E16 gates the rest** and is a design question, not
  an implementation task: the same advisory scored 0.42 precision against key 1.0.0 and 1.00 against key
  1.1.0 with no change to the advisory. **It carried the v1.16.0 label from 2026-08-18 to 2026-08-20** and
  now carries no version, because assigning it one it will not get is how a line goes stale unnoticed. All
  five entries stay live in [`backlog/enhancements.md`](backlog/enhancements.md).
- **v1.17.0 "what are you trying to do?":** the onboarding funnel - a `docs/adoption/` router, nine
  job-shaped runbooks, a capability map, and `docs/how-to/grade-in-ci.md`, which is the first public
  documentation of the shipped GitHub Action. Packet at
  [`release-plans/plan_v1.17.0/RELEASE-PLAN.md`](release-plans/plan_v1.17.0/RELEASE-PLAN.md).
- **The graded-cohort work carries NO version**, as of 2026-08-22. It held v1.17.0 until the onboarding
  funnel took that number. Left unversioned deliberately rather than pushed to v1.18.0: assigning a line
  a version it will not get is how it goes stale unnoticed, which is the same call made for the
  eval-instrument batch.

**Not on this list:** manage-and-studio (a read-only studio dashboard) is deferred indefinitely -
a UI over a grade nothing yet consumes. See the dated note in
[`execution/EXEC-SUMMARY.md`](execution/EXEC-SUMMARY.md) for how it fell off the sequencing.

## Cross-repo dependency note

The `agent-plugins` standards program may relocate `STANDARD.md` and the checker
(`scripts/check.mjs`, `scripts/lib/`, `scripts/checks/`, `scripts/generators/`,
`tier-report.mjs`) into `agent-plugins/standards/`. This repo plans around that move: new
engine-adjacent code is built cleanly separable so only the `npm run check` seam repoints if the
checker moves. If that program's relocation package fires mid-program, **stop and reconcile**
against [`execution/relocation-addendum.md`](execution/relocation-addendum.md) before continuing
any of the above.
