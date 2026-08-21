---
title: "v1.15.0 review findings - open, and blocking the tag"
---

# v1.15.0 review findings

> **Status, 2026-08-19: ALL FIFTEEN FINDINGS ARE CLOSED**, each with a dated note under its own text -
> and so are the FIVE a review of that fix code returned, the SIX a third round returned over those, and the
> SEVEN a fourth returned again. Each round has its own dated section at the end of this file. Rounds went
> **15/8 blocking, 5/2, 6/0, 7/0, 5/1** across FIVE rounds - every one found something in the previous
> round's fix code. The fourth round's `T1` removed the class they kept finding, by deciding to stop guessing
> at all; the fifth then caught a REGRESSION that change introduced, plus three false statements in these
> very records. Its remaining two findings are deferred to v1.15.1 or wave 2 with stated reasons, and a
> sixth round is not recommended - see the fifth-round section for why.
>
> **ADVERSARIAL WAVE 2 RAN ON 2026-08-20 and is recorded in its own section at the end of this file: five
> findings, one HIGH, all closed. Acceptance criterion 6 is discharged.**
>
> **This file no longer holds the tag.** Every finding carries a dated closure note under its own text, and
> the ledger below tracks them. **Acceptance criterion 6 - a second adversarial wave - remains open**, and
> is not satisfied by these fixes, by the reviews that produced these findings, or by any self-review.
>
> Source: a max-effort repository code review over `v1.14.0..HEAD` (905 lines of code across 13 files),
> run 2026-08-19. **Fifteen findings.** Two were independently re-reproduced by hand before this file was
> written; the rest carry the reviewer's own verification notes.
>
> This is **not** adversarial wave 2. Acceptance criterion 6 remains open: the Codex runtime is out of
> credits until 2026-08-20, and a code review set up by the same author who wrote the code is not the
> independent second wave the criterion asks for.

## Why this file exists

An earlier attempt at review used the `advisor` tool, which reads the **session transcript** rather than
the repository. It returned four findings, all real but none of this class. A review that opened the actual
files returned **fifteen**, most with live reproductions. **The instrument determined the result**, and
that is worth recording as its own lesson.

## Severity ranking

**Blocking (a gate reports success while checking nothing, or blocks a correct pin):** F1, F2, F3, F4, F5, F6, F7, F8
**Should fix before tag:** F9, F10, F11, F13, F14
**Should fix, not blocking:** F12, F15

## Closure ledger

Findings are annotated in place as they close, never rewritten: the finding is the evidence of what was
wrong, and a finding edited to describe its own fix stops being that.

| Finding | State | Closed by |
| --- | --- | --- |
| F1 - a link makes the gate a silent no-op | **CLOSED** 2026-08-19 | entry-guard fallback + a spawned-through-a-link regression test |
| F2 - an unspawnable gate reads as a PASS | **CLOSED** 2026-08-19 | `blocksOn` removed, `gateBlocks` collapses to non-zero, `SPAWN_FAILED` shared, vacuous test replaced |
| F3 - a floating label can never disagree | **CLOSED** 2026-08-19 | new `LABEL_FLOATS` verdict, restoring a decision ADR 0053 had already written down |
| F4 - first-v-token parsing blocks correct pins | **CLOSED** 2026-08-19 | last-token claim, optional and case-insensitive `v`, bare dotted versions, normalised comparison |
| F5 - two legal block-scalar headers missed | **CLOSED** 2026-08-19 | header regex accepts either indicator order and a trailing comment |
| F6 - a non-version release tag disabled BEHIND while asserting currency | **CLOSED** 2026-08-19 | comparability computed once; not comparable means UNKNOWN, and it is not parsed harder |
| F7 - `refKind: other` passed unconditionally | **CLOSED** 2026-08-19 | full tags take the major-tag contract; branches judge nothing and say so; lookup errors read |
| F8 - our own runbook produces a pin the checker refuses | **CLOSED** 2026-08-19 | `05-ci-plan.md` dereferencing command + specific-version format, verified live |
| F11 - two more ways to look at nothing and report clean | **CLOSED** 2026-08-19 | refuses a root with no pin sources, finds `action.yaml`, and the report states how many files it read |
| F12 - the write-incapability guard was defeatable | **CLOSED** 2026-08-19 | bracket access and namespace imports caught, scan runs on stripped source, and the guard itself is now tested |
| F13 - `action.yml` USAGE stale again | **CLOSED** 2026-08-19 | self-referential version guard in `check-readme-version.mjs`, which caught the live drift |
| F9 - one override reason excuses every overridable gate | **CLOSED** 2026-08-19 | ADR 0053's reuse decision UPHELD; the untested multi-gate path is tested and the report names when one reason covered several |
| F10 - nothing bounded how long anything could take | **CLOSED** 2026-08-19 | `timeout-minutes` on all 11 jobs (guarded by a test), a spawn timeout, and a bounded fetch with exactly one retry |
| F14 - `RELEASE.md` never mentions `GITHUB_TOKEN` | **CLOSED** 2026-08-19 | the exact command in `RELEASE.md` and `scripts/README.md`, saying the remedy is the token and not the override |
| F15 - the skill's procedure contradicted its own example | **CLOSED** 2026-08-19 | measure renumbered to step 5, route to step 6, example labels follow |

**ALL FIFTEEN FINDINGS ARE CLOSED.** Each carries a dated note under its own text saying what was done
and how it was proved. **The tag is no longer held by this file** - what remains is acceptance criterion
6, the second adversarial wave, which nothing in this document can discharge.

---

## F1 - BLOCKING. A symlink or junction turns the whole gate into a silent no-op

**`scripts/action-pin-watch.mjs:157`**

The module-entry guard compares a realpath-resolved `import.meta.url` against an unresolved `argv[1]`, so
through a symlinked checkout `main()` never runs: the process prints nothing and exits 0, which
`release-ready` records as **`ok action-pins (exit 0)`** on zero pins.

**Re-reproduced by hand 2026-08-19:**

```
$ node scripts/action-pin-watch.mjs /nonexistent-root-xyz
action-pin-watch REFUSED: root does not exist: .../nonexistent-root-xyz
exit=2

$ cmd /c mklink /J E:\tmp\askit-junction E:\Projects\...\agent-skills-toolkit
$ node E:/tmp/askit-junction/scripts/action-pin-watch.mjs /nonexistent-root-xyz
(no output)
exit=0
```

**Reach:** macOS `/tmp`, container mounts, symlinked CI workspaces.
**Fix, with precedent already in this repo:** both siblings use the robust form -
`scripts/release-ready.mjs:75` is `process.argv[1]?.endsWith("release-ready.mjs")`, and
`scripts/vendor-watch.mjs:108` ORs in the same fallback. Nothing else runs this check, so a no-op is caught
nowhere.

> **CLOSED 2026-08-19.** Fixed with the sibling form. Both hand reproductions were re-run against the fix:
> through the junction a bad root now REFUSES at exit 2, and a real root scans every pin. Realpath-resolving
> both sides was considered and rejected - it adds a throwing call at module top level, which runs on every
> import of the CLI's exports, for no gain over the form already shipped twice in this repository.
>
> **The regression test SPAWNS the CLI through a real link** (`fs.symlinkSync(..., "junction")`, which needs
> no elevation on Windows and degrades to a directory symlink on POSIX) against a nonexistent root, so it is
> offline and instant, and the refusal is itself the proof that `main()` was reached. Mutation-proved:
> dropping the fallback turns exactly that one test red.
>
> **Class closed, not just the instance.** `grep -rn "import.meta.url" scripts/` confirms this was the only

> entry guard of this shape; the remaining uses take `dirname` for a repository root and are unaffected.
>
> **AMENDED 2026-08-19.** The reproduction above still holds, but the code is now **3, not 2**: the
> fix-code review (`R3`) showed that exit 2 is the OVERRIDABLE code, so an outage reason string could have
> excused a run pointed at the wrong tree. A misconfiguration now has its own non-overridable code.
> entry guard of this shape; the remaining uses take `dirname` for a repository root and are unaffected.

## F2 - BLOCKING. A gate that could not be spawned reads as a PASS

**`scripts/lib/release-ready.mjs:67`**

`gateBlocks` treats every exit code outside a gate's explicit `blocksOn` list as success, so `runGate`'s
**127 sentinel** - the one meaning the gate never ran - certifies the release, for both `vendor-watch` and
the new `action-pins`.

**Re-reproduced by hand 2026-08-19:**

```
gateBlocks(action-pins, 127) = false
summary.ok = true
ok       action-pins  (exit 127)
Releasable: every release-blocking gate passed.
```

This defeats `scripts/release-ready.mjs:58-60`, whose comment states that a gate which could not be
**spawned** is not a pass. `action-pins` is the only network-bound gate and runs on every tag push and
every npm publish, so an OOM kill or runner eviction certifies a release nothing checked.

**And its regression test is vacuous:** it uses `withCode('readme-drift', 127)` - the one gate with no
`blocksOn`, where the default `code !== 0` rule still applies - so it is green while covering neither gate
that needs it. Exit code 3 behaves identically.

> **CLOSED 2026-08-19.** `blocksOn` is **removed**, not patched, and `gateBlocks` collapses to
> `code !== 0` for every gate.
>
> **Why removal was the only correct fix.** The field held `[1, 2]` on both gates that declared it, which is
> precisely the set of non-zero codes those gates were known to produce - an enumeration wearing the costume
> of a filter. The 1-versus-2 distinction it appeared to carry is carried entirely by `overridableCodes`.
> So there is no version of `gateBlocks` in which `blocksOn` still drives blocking and 127 blocks too; every
> fix collapses to non-zero-blocks. Keeping the field as inert documentation would have left a trap: a
> future `blocksOn: [1]` would read as "exit 2 passes on this gate" and silently not mean it.
>
> **ADR 0053's decision is untouched** and is in fact the rule that replaced the field - an outcome that must
> not block is expressed as **exit 0 by the gate itself** (which is why BEHIND exits 0), never filtered out
> downstream. ADR 0053's implementation-sites line said "No change to `gateBlocks`" and now carries a dated
> correction rather than a rewrite.
>
> **Two things the finding implied and did not state, both now covered.** The sentinel is a named
> `SPAWN_FAILED` export shared by both halves, so the CLI that produces it and the module that judges it
> cannot drift apart; and a spawn failure prints what actually happened instead of the gate's rationale,
> because a `BLOCK` row reading *"a SHA pin's comment is the only half a reviewer reads"* describes a defect
> nobody looked for - the misdescribes-its-own-decision class this same renderer already guards for the
> override line.
>
> **The replacement test names both gates that needed it, at 127 and at 3**, and adds the assertion that no
> override reason excuses a gate that never ran. That last one was reachable-but-unreached before:
> `overrideApplies` was already correct about 127, but `gateBlocks` never classified the row as blocking, so
> the override was never consulted. Mutation-proved in two directions - restoring the filter turns four
> tests red, removing the spawn-failure render branch turns exactly one red.

## F3 - BLOCKING. A bare major label can never disagree, in the format our own runbook prescribes

**`scripts/lib/action-pin-watch.mjs:166`**

A SHA pin commented `# v3` is accepted **forever**, however far the SHA advances, because a floating major
tag moves to every new release commit and `resolved.includes('v3')` stays true.

**Verified:** `evaluatePin` with `claimed: 'v3'` returns OK for `['v3.0.2','v3']`, `['v3.1.0','v3']` and
`['v3.5.9','v3']`. With `claimed: 'v3.0.2'` the same v3.1.0 advance correctly returns `LABEL_DISAGREES`.

**This is exactly the Dependabot drift the check was built for.** The permissive rule at lines 139-141 was
a deliberate wave-1 fix for a multi-tag **false positive**, but its side effect was never weighed: *a
floating major tag is not a fact about the commit, it is a pointer that follows it.*

**Two aggravating details.** `docs/internal/execution/05-ci-plan.md:115` still prescribes
`# v3 pinned YYYY-MM-DD` as the format. And the shipped test `ONE COMMIT, TWO TAGS` asserts the permissive
behaviour, so CI stays green over the hole.

**This is the "review the fixes, not just the code" pattern**: a wave-1 fix opened a new hole and its own
test locked it in.

> **CLOSED 2026-08-19.** New verdict **`LABEL_FLOATS`**, blocking at exit 1 - a defect in this repository's
> own file, so it takes the same non-overridable code as every other label problem.
>
> **The finding understates itself, and the correction is worth the extra sentence.** ADR 0053 does not
> merely fail to anticipate this case; **it decided it, by name, using this exact example.** Its own text
> reads: *"The strict form was chosen over 'the label must merely not be false' on one live instance:
> `# v3` against a SHA resolving to `v3.0.2` is not false, and it names nothing a reviewer can check, which
> is exactly how the next bump becomes invisible."* So this was never a gap in the design. **A ratified
> decision was reversed by a bug fix, and that fix's own test then asserted the reversal**, which is why CI
> stayed green over it. `LABEL_FLOATS` does not invent a rule; it restores one that had been written down
> and then quietly lost. ADR 0053 carries a dated correction saying so.
>
> **Ordering is load-bearing and is tested.** The floating check runs only AFTER the label matches. `# v3`
> against a commit tagged `v4.0.0` is not under-specified, it is wrong, and `LABEL_DISAGREES` is the sharper
> thing to say.
>
> **The escape hatch is load-bearing too.** When a commit carries only floating tags, that label is the best
> one available; demanding a specific version there would block a pin whose author has nothing better to
> write, and a rule that cannot be satisfied is a false finding with extra steps.
>
> **The wave-1 protection survives.** The `ONE COMMIT, TWO TAGS` test still asserts that a label naming the
> specific tag among several passes, and that a version on neither is still caught - it was amended, not
> deleted, and its `# v3` line now asserts `LABEL_FLOATS` with a comment explaining why. Mutation-proved:
> removing the rule turns three tests red, that test among them.
>
> The prescribed `# v3` format in `05-ci-plan.md:115` is corrected as part of F8's closure, in one block.

## F4 - BLOCKING. `versionInComment` takes the FIRST v-token, and blocks correct pins two ways

**`scripts/lib/action-pin-watch.mjs:63`**

Both failures are **exit 1, which no reason string can override.**

**First-token.** `# bumped from v4.37.6 to v4.37.7` sets `claimed = 'v4.37.6'`, so a **correct** pin returns
`LABEL_DISAGREES` and blocks the tag. Same for `renovate: from v2 to v3.0.2` and
`was v3, now v4 pinned 2026-08-16`. The correction this very release added to `05-ci-plan.md` records that
Dependabot rewrites these comments, so this is expected input.

**Prefix and case.** `versionInComment('0.28.0 pinned 2026-01-01')` and `versionInComment('V4.37.7 ...')`
both return null → `LABEL_MISSING` on a correct label. `aquasecurity/trivy-action` ships tags named
`0.28.0`. The inverse blocks too: a `# v4.37.7` comment against a registry tag literally named `4.37.7`
fails the un-normalized `resolved.includes(pin.claimed)` at line 166.

**`majorOf` already accepts the bare form** (`^v?(\d+)`); `versionInComment` does not.

> **CLOSED 2026-08-19.** All four spellings fixed, and the fix is guarded against its own obvious hazard.
>
> **The claim is now the LAST version token**, not the first. Every real producer of a multi-version
> comment writes the current one last: Dependabot's `bumped from v4.37.6 to v4.37.7`, Renovate's
> `from v2 to v3.0.2`, and the hand-written `was v3, now v4`. All three are in the test table.
>
> **No ambiguity verdict was added, deliberately.** Last-token reads every real shape correctly, so a
> second verdict would add surface without adding a decision. Instead, when a label genuinely disagrees
> and the comment held more than one token, the detail names them all - the human sees the ambiguity and
> decides which half is wrong.
>
> **The `v` is optional and case-insensitive**, so `0.28.0` (the spelling `aquasecurity/trivy-action`
> ships) and `V4.37.7` both parse. **A bare number must carry a dot**, which is the entire guard against
> the fix's own hazard: the `2026-08-16` in this repository's prescribed comment format has no dot in it,
> so it can never be read as version 2026. A date and a sha fragment are both in the test table for
> exactly that reason.
>
> **Comparison is normalised on both sides** via `normalizeVersion`, closing the inverse block where a
> correct `# v4.37.7` failed against a registry tag literally named `4.37.7`. Detail strings keep the raw
> spelling, because a report must quote what the author actually wrote.
>
> Mutation-proved in two directions: restoring first-token turns two tests red, restoring the raw string

> comparison turns one red.
>
> **AMENDED 2026-08-19, later the same day.** The sentence above claiming *"last-token reads every real
> shape correctly"* was WRONG, and the fix-code review found it: `v4.1.1 pinned 2026-08-16; replaces
> v3.0.0` puts the superseded version LAST, so last-token reported a false `LABEL_DISAGREES` at exit 1 on
> a comment that opens with the correct version. **Position alone cannot decide the claim** - `from A to
> B` puts it last, `B ... replaces A` puts it first. Recorded as `R1` in the fix-code review section at
> the end of this file, and fixed by reading the words between the versions rather than their order.
> comparison turns one red.

## F5 - BLOCKING. The block-scalar regex misses two legal YAML headers

**`scripts/lib/action-pin-watch.mjs:45`**

`run: | # trailing comment` and `run: |2-` (indentation indicator before chomping indicator) are both legal
and both missed, so a `uses:`-looking line inside a shell payload is parsed as a real pin and **blocks the
release** - the false-finding failure the file's own comment calls the worst outcome it recognises.

The regex does not even match its own docstring example `body: |2+`. The test suite covers only plain
`run: |`.

> **CLOSED 2026-08-19.** The header now accepts an indentation indicator and a chomping indicator **in
> either order**, plus a trailing comment. The test table is `|`, `|-`, `|2-`, `|-2`, `|2+`, `>-`,
> `>+3 # c` and `run: | # trailing comment` - including the docstring example that did not match the
> regex documenting it, which was the finding's punchline.
>
> **Two tests, in opposite directions.** One asserts that a `uses:`-shaped line inside each header's
> payload yields ZERO pins, which is the false-finding class this file's own docblock calls its worst
> outcome. The other asserts that a real `uses:` step AFTER a block scalar is still parsed - a fix that
> swallowed the rest of the file would hide real pins, the same defect wearing the other mask.

## F6 - BLOCKING. `majorOf` returns null for a non-`vN` release tag, disabling BEHIND while asserting currency

**`scripts/lib/action-pin-watch.mjs:175`**

`github/codeql-action`'s `releases/latest` tag is **`codeql-bundle-v2.26.3`**, so `majorOf(latest)` is null
and the BEHIND guard short-circuits. Because `latest` is truthy, `currencyUnknown` is set **false**, so the
report omits its "Currency was NOT checked" line.

Live output today: `ok ... label and ref agree on v4.37.7 (of v4.37.7, v4); current release codeql-bundle-v2.26.3`.

**The major-tag branch is worse:** it prints `v4 is self-describing and current (codeql-bundle-v2.26.3)` -
flatly asserting currency against a tag it could not compare, which lines 194-197 and 308-309 say must
never happen. **If codeql-action ships v5, nothing here will ever report it BEHIND.**

> **CLOSED 2026-08-19.** Comparability is computed once, at the top of `evaluatePin`, and every branch
> reads it: a latest release that does not parse as a version sets `currencyUnknown` TRUE and says so in
> the detail, so the report's "Currency was NOT checked" line fires and no branch asserts currency.
>
> **The fix is deliberately NOT to parse harder, and that reasoning is the finding's real lesson.**
> `codeql-bundle-v2.26.3` could be made to yield a 2, but that 2 belongs to a different numbering series
> from the action's own `v4` tags. Comparing them would report a perfectly current pin as BEHIND -
> trading a silent gap for a false finding, which is the strictly worse trade for this repository.
> **Not comparable means unknown, and unknown is reported as unknown.**
>
> Measured on this repository's own pins rather than reasoned about: the three codeql rows flip from
> asserting `current release codeql-bundle-v2.26.3` to `currency NOT checked (... is not a version
> number, so it could not be compared)`, the summary gains `Currency was NOT checked for 3 pin(s)`, and
> **nothing else moves** - 29 pins, 29 ok, exit 0, before and after.

## F7 - BLOCKING. `refKind: "other"` returns OK unconditionally

**`scripts/lib/action-pin-watch.mjs:211`**

`uses: actions/checkout@v4.1.1 # v7.0.0 pinned 2026-01-01` returns
`{verdict:'OK', detail:'ref v4.1.1 is a full tag or branch; no label contract applies'}` - a flatly
contradicting label passing at exit 0, while the identical contradiction on a bare major tag raises
`LABEL_CONTRADICTS_REF` one branch above.

The branch also **never reads `resolution.error`**, so a 404 or rate limit reports OK rather than
UNRESOLVED. Exact-version tag pinning is the standard output of a Dependabot bump on a tag-pinned repo.
**No test covers this refKind.**

> **CLOSED 2026-08-19.** A full tag is self-describing in exactly the way a major tag is, so it now takes
> the same contract: no label required, and a label that is present must not contradict the ref's major.
> That consistency argument is stated in the code, because it is the reason the rule is not arbitrary.
>
> **The contradiction check stays at MAJOR level**, matching the branch above it: `@v4.1.1 # v4.2.0` is a
> stale comment on a readable ref, not something a reader can be misled by, and blocking it would block a
> pin that already says what it is.
>
> **A branch ref judges nothing and says so** - `majorOf("main")` is null, so no contradiction is
> possible and currency cannot be assessed; the row reports `currencyUnknown` rather than an unqualified
> OK.
>
> **A lookup error now reports unknown currency rather than a silent OK**, and NOT `UNRESOLVED`: the
> label question is fully answered by the ref itself, exactly as in the major-tag branch, so a refusal
> would be the wrong verdict for a question that was never in doubt.
>
> **BEHIND now reaches full-tag refs too.** Leaving them permanently uncheckable for currency would have
> been F6's blind spot in a second place. Five tests cover this refKind, which previously had none.

## F8 - BLOCKING. Following our own runbook produces a pin that refuses the release

**`docs/internal/execution/05-ci-plan.md:115`**

The prescribed resolution command returns the **annotated tag object** sha, not the commit sha.

**Verified live:** `GET /repos/softprops/action-gh-release/git/refs/tags/v3` returns
`c12583777ecdfd3be55c69cf75464299dc01057e` with `type: "tag"`, not the commit `3d0d9888...` the workflow
actually pins. `refs/tags/v4` on `github/codeql-action` is likewise annotated (`988661eb...`).

`scripts/action-pin-watch.mjs:96` collects only `t.commit.sha` - the dereferenced commit - so a tag-object
sha never appears in `resolvedBySha`, the pin resolves to `[]`, and `evaluatePin` returns UNRESOLVED:
**exit 2, a release-blocking refusal on a pin created exactly as instructed.**

This file was edited in this range (a correction block inserted directly above the line) without touching
the command.

> **CLOSED 2026-08-19.** `docs/internal/execution/05-ci-plan.md` carries a dated correction covering both
> defects in that one sentence - **the command AND the format** - in a single block, continuing the
> 2026-08-17 correction directly above it rather than stacking an unrelated second one.
>
> **Verified live before the correction was written**, which is the acceptance test for a fix whose whole
> content is a command a human will run:
>
> ```
> $ gh api repos/softprops/action-gh-release/git/refs/tags/v3 --jq '.object'
> {"sha":"c12583777ecdfd3be55c69cf75464299dc01057e","type":"tag"}   <- the prescribed command: a TAG OBJECT
> $ gh api repos/softprops/action-gh-release/commits/v3 --jq .sha
> 3d0d9888cb7fd7b750713d6e236d1fcb99157228                          <- the commit, and what release.yml pins
> ```
>
> **The checker's behaviour is deliberately unchanged.** Refusing a sha it cannot resolve to a commit is
> correct; the defect was a runbook instructing a human to produce one. The corrected command is
> `gh api repos/<owner>/<repo>/commits/<tag> --jq .sha`, and `publish-npm.yml` already used the plumbing
> spelling of the same idea (`git rev-parse refs/tags/$TAG^{commit}`) for this repository's own tag.
>
> **The same block fixes F3's format prescription** (`# v3` becomes `# v3.0.2`). Worth recording together:
> this file prescribed a comment format that defeated the checker and a command the checker refuses, and
> the checker was written by reading this file. **A runbook is an input to the tools built from it, and a
> wrong one propagates into them.**

## F9 - One override reason excuses every overridable gate

**`scripts/lib/release-ready.mjs:82`**

An operator excusing a known vendor-page outage silently also waves through an unrelated action-registry
refusal. `overrideApplies` checks only the code and a non-empty reason; there is no per-gate scoping, and
the flag is still named `--allow-vendor-unreachable`.

**Note:** this was *considered* during v1.15.0 and documented as deliberate reuse. The finding stands
anyway on the operator-visibility argument, and on the fact that the test helper only ever sets one gate
non-zero, so the path is untested.

> **CLOSED 2026-08-19, and deliberately NOT by reversing ADR 0053.**
>
> This finding's temptation is the exact mistake `F3` turned out to be: undoing a ratified decision as a
> side effect of a bug fix. ADR 0053 section 3 explicitly considered a second, near-identical flag and
> **rejected it as proliferation**, on the reasoning that a GitHub API outage and a documentation-host
> outage are the same category of fact. The finding itself concedes the reuse was documented as deliberate.
> So the decision stands, no flag is renamed or scoped, and there is no ADR correction here - because
> nothing was changed that an ADR records.
>
> **What was actually wrong was narrower than the framing, and it is fixed.** The ADR's stated safeguard
> is that `renderSummary` names which gates an override applied to. That safeguard already worked -
> **and had never been asserted**, because the test helper could only ever set ONE gate non-zero. The
> multi-gate path is now tested: both network gates at exit 2, one reason, both `overridden`, both named.
>
> **One output-only addition.** When a single reason excused more than one refusal, the report now says so
> in as many words rather than leaving it to be inferred from a list - the operator is told the failures
> are unrelated and asked to confirm the reason accounts for each. A test asserts the line appears at two
> and NOT at one, so it cannot become noise on the ordinary single-gate case.
>
> **Residual risk accepted and named**, which is the honest close: one reason can still cover two
> refusals. The operator flow makes both visible before the flag is ever typed - the run fails, the table
> lists every blocked gate, and only then is the flag added - and `F14`'s fix removes the most likely
> reason anyone reaches for it by mistake, which was a missing token. The two close as a pair.
>
> Also re-asserted now that two gates can fail together: exit 1 still outranks exit 2, so a network reason
> cannot carry a proven label defect through beside it. Mutation-proved: dropping the multi-excuse notice
> turns one test red.

## F10 - No fetch timeout, no retry, and no `timeout-minutes` anywhere

**`scripts/action-pin-watch.mjs:70`**

`grep -rn timeout-minutes .github/workflows/` returns nothing. Any single throw from up to 20 sequential
`get()` calls cascades to UNRESOLVED (exit 2) for every pin of that action. The CLI's own comment records
that exactly this happened on 2026-08-17 during a GitHub partial outage.

`spawnSync` in `runGate` has no timeout either, and `publish-npm.yml`'s concurrency group uses
`cancel-in-progress: false`, so a stuck prepare job blocks every later publish dispatch until a human
cancels it.

> **CLOSED 2026-08-19.** Four bounds where there were none.
>
> **`timeout-minutes` on all 11 jobs across all 6 workflows** - the grep in this finding returned nothing,
> and it now returns eleven. Generous on purpose: the slowest job observed is about 1m10s and the smallest
> bound is 15 minutes, because a timeout tight enough to fire on a slow-but-working run would turn
> somebody else's bad afternoon into a blocked release. **A test asserts every job in every workflow
> declares one**, so this is a guard rather than a one-time sweep.
>
> **A `spawnSync` timeout in `runGate`**, as the exported `GATE_TIMEOUT_MS`. What it composes with is the
> point: `spawnSync` kills the child, `status` comes back null, the CLI maps null to `SPAWN_FAILED`, and
> `F2`'s fix makes `SPAWN_FAILED` block. **A gate that ran out of time therefore cannot certify a release,
> for the same reason a gate that never started cannot** - no new path was needed, and the composition is
> asserted.
>
> **A per-request timeout and exactly ONE retry**, extracted as `getJson` so the policy is injectable and
> can be demonstrated offline and instantly - a retry nobody has watched retry is the same as a guard
> nobody has watched fail. A 429 or 5xx is retried; **a 404 is not**, because it is a definitive answer
> that a second attempt cannot change while spending exactly the rate-limit budget the retry protects.
> One retry and not more: additional attempts are new failure surface, multiplying the spend the retry
> exists to survive and lengthening the run the timeout exists to bound.
>
> **`cancel-in-progress: false` is KEPT, and now says why.** Cancelling a publish mid-flight is strictly
> worse than waiting for one: npm publication is not transactional, so a run killed between the registry
> write and the provenance attestation leaves a version half-shipped that no later run can distinguish
> from a clean one. The finding's concurrency clause is answered by BOUNDING the job rather than by
> cancelling the release, and the comment records that reasoning in the file.
>
> **Two evidence limits, stated rather than fudged.** `release.yml` and `publish-npm.yml` are never
> exercised by PR CI, so their edits were verified by parsing every workflow with the repository's own
> `yaml` dependency and confirming all 11 jobs read back with a numeric `timeout-minutes`; a green PR
> proves nothing about those two files. And a genuine hang is not reproducible offline, so for the
> timeout itself the evidence is the code plus a live green run, not a demonstrated firing.
>
> Mutation-proved: removing one job's timeout turns the workflow guard red, disabling the retry turns

> three red, and dropping the abort signal turns one red.
>
> **AMENDED 2026-08-19.** The numbers chosen here were internally inconsistent, found as `R4` below: a
> 10-minute gate timeout under a 20-minute job meant ONE hung gate worked as designed and TWO did not -
> the job died before `renderSummary` could print the very diagnostic `F2` exists to produce. Corrected
> to a 5-minute gate under 30-minute jobs (**later 50**, once `S3` budgeted the preamble those jobs also
> spend), with the arithmetic now asserted by a test instead of chosen
> by hand.
> three red, and dropping the abort signal turns one red.

## F11 - Two more ways to look at nothing and report a clean pass

**`scripts/action-pin-watch.mjs:35`**

`pinSourceFiles` refuses only a root that does not **exist**.

1. A root that exists but is the **wrong directory** (a monorepo subpackage, a mis-set `working-directory`,
   a typo naming a real path) yields `0 pins ... Every label is accurate` at exit 0.
2. The composite manifest is looked up only as `action.yml`, never **`action.yaml`**, which GitHub Actions
   treats as equally valid - while the workflow scan four lines above correctly accepts both extensions.

Both are indistinguishable from a genuine clean pass, and the docstring's stated fix covers only the
nonexistent-root case.

> **CLOSED 2026-08-19.** Both halves fixed, plus the reporting gap underneath them.
>
> **A root with NO pin sources at all now refuses**, rather than reporting a clean zero. The distinction
> is precise and the docstring was amended in the same edit rather than left contradicting the code: a
> missing `.github/workflows` is still fine on its own, and so is a missing action manifest, because a
> plugin need not ship CI and need not be an action. **Both absent** means the tool was pointed somewhere
> it cannot answer a question about.
>
> **`action.yaml` is looked up alongside `action.yml`**, mirroring the extension check the workflow scan
> four lines above already performed.
>
> **And the report now says how many FILES it read** - `29 pins read from 7 file(s)` - through an optional
> `sources` argument to `buildReport`. That is the part the finding implies rather than states: the two
> cases it names were indistinguishable *in the output*, so a count that cannot be confused for a verdict
> is what removes the ambiguity for every future reader, not just for the two paths fixed here.
>
> Mutation-proved: dropping the refusal turns one test red, dropping the `.yaml` spelling turns one red.

>
> **AMENDED 2026-08-19.** That refusal exited **2**, which `action-pins` declares overridable - so the
> fix for this finding created a way to override it. Corrected as `R3` below: a misconfigured run now
> exits **3**, outside the override allowlist by construction.

## F12 - The write-incapability guard is defeatable

**`tests/unit/action-pin-watch.test.mjs:59`**

Adding `import * as fs from "node:fs"` plus `fs["writeFileSync"](p, d)` defeats **both** tests at once: the
import test only reads brace-delimited imports, and the write-API regex requires the identifier to be
followed by `(`, which `"](` is not. The CLI's docblock claim "WRITE-INCAPABLE BY CONSTRUCTION, and a test
enforces it" would survive a real write being added.

Secondary: the write-API scan runs on **raw** source rather than `stripComments()` output, so a comment
merely mentioning `writeFileSync(` would fail it - the inverse false-report class the same file warns about.

> **CLOSED 2026-08-19.** Both defects fixed, and **the guard itself is now tested** rather than only ever
> being seen to pass - which is this test file's own opening argument, applied to the file.
>
> The scan is extracted into `writeCapableHits(source)`, so a defeat can be demonstrated against synthetic
> source instead of requiring someone to actually add a write to a shipped module. It runs on
> `stripComments()` output, closing the inverse false-report this file had already shipped three times,
> and it matches **bracket access** (`fs["writeFileSync"](p, d)`) as well as a named call. A companion
> `fsNamespaceImports` assertion closes the `import * as fs` half, which no brace-delimited import scan
> can structurally see - the two defeats had to be used together, and now neither works alone.
>
> Mutation-proved in both directions at once: restoring the old raw-source, call-only scan turns two tests
> red - one because it stops catching the bracket write, one because it starts firing on the prose
> explaining the guard. That mutation IS this fix's red phase, since the guard and its tests were written
> together.

## F13 - `action.yml` USAGE is stale again, one release after it was fixed

**`action.yml:27`**

Reads `uses: product-on-purpose/agent-skills-toolkit@v1.14.0` while all four version manifests moved to
1.15.0 **in this same range**. This is the exact line commit `ee34392` (#238) fixed one release ago, which
`CHANGELOG.md` records as having been *"three releases stale, in the repository that grades others on
currency"* - **and it has drifted again with no guard added.**

Nothing checks it: `check-readme-version.mjs` reads only README, `verify-tag-matches-manifests.mjs` reads
only JSON version fields, and `parsePins` skips `#`-prefixed example lines. **A guard is the fix, not
another manual correction.**

> **CLOSED 2026-08-19.** A guard, as the finding demanded, and **it caught the live drift before the line
> was touched** - which is the only red phase worth having for a guard against a defect that is already
> present:
>
> ```
> $ node scripts/check-readme-version.mjs .
> check-readme-version: front-door claim drift detected
>   action.yml:27 advertises `agent-skills-toolkit@v1.14.0` while library.json says 1.15.0. ...
> exit=1
> ```
>
> **Extended `check-readme-version.mjs` rather than adding a check.** It is the same question that script
> already answers - a front-door claim against the manifest - and its gate is already wired into
> `release-ready` and `npm test`, so this costs no new file, no registry entry and no G8 inventory churn.
>
> **The rule is SELF-REFERENTIAL, not scoped to a hardcoded name.** Any `<owner>/<repo>@vX.Y.Z` in
> `action.yml` or `action.yaml` whose `<repo>` equals the library's own `name` must equal its own
> `version`. That states the actual invariant - a manifest advertising its own tag must advertise the
> right one - and it applies to any plugin the script is pointed at, while a reference to somebody else's
> project is correctly none of its business. The first draft hardcoded `agent-skills-toolkit`; the fixture
> that name required then tripped the script's own spine-claim floor, which is what surfaced the better
> rule. **EVERY occurrence must agree**, matching the all-occurrences rule the count claims already use,
> because documenting two usages and hand-correcting one is exactly how the stale line survived #238.
>
> Matched with a fixed pattern and compared in JavaScript, never by compiling `lib.name` into a regex.

>
> **AMENDED 2026-08-19.** The pattern required a leading `v`, so a manifest advertising `@1.15.0` matched
> nothing and this guard reported clean - the reports-clean-over-nothing class, reintroduced inside the
> fix for it, on the same day `F4` established that the `v` is optional. Corrected as `R5` below.
>
> **Two things that describe this check were updated with it**, because output that misdescribes its own
> scope is this repository's named defect class: the gate's `why` string in `scripts/lib/release-ready.mjs`
> and the `scripts/README.md` inventory entry, which was already two features behind.
>
> Mutation-proved: restoring `@v1.14.0` in `action.yml` turns the real-repository test red.

## F14 - `RELEASE.md` never mentions `GITHUB_TOKEN`

**`docs/internal/RELEASE.md:21`**

The checklist tells a maintainer to run `npm run release-ready` locally. Unauthenticated, `action-pin-watch`
resolves ~8 actions against the 60/hour-per-IP limit, hits a 403, and prints "NOT releasable" for a reason
CI will never show. The final commit of this range added `env: GITHUB_TOKEN` to both workflows for exactly
this - but grep finds **zero** mentions of `GITHUB_TOKEN` or `GH_TOKEN` in `RELEASE.md`, `README.md` or
`scripts/README.md`. The likely operator response, reaching for `--allow-vendor-unreachable`, lands on F9.

> **CLOSED 2026-08-19.** The finding's own acceptance test was its grep, so that grep is the check: it
> found **zero** mentions of `GITHUB_TOKEN` across `RELEASE.md`, `README.md` and `scripts/README.md`, and
> `RELEASE.md` and `scripts/README.md` now carry the exact command:
>
> ```
> GITHUB_TOKEN="$(gh auth token)" node scripts/release-ready.mjs
> ```
>
> with the reason beside it - unauthenticated GitHub allows 60 requests an hour per IP, the failure is an
> exit-2 refusal, and CI never shows it because both release workflows pass a token.
>
> **It says explicitly that the remedy is the token and NOT `--allow-vendor-unreachable`.** That sentence
> is what closes this finding together with `F9`: the override was the likely operator response to a
> refusal with no documented cause, and reaching for it would excuse a refusal a token makes disappear
> while silently waiving anything else refusing in the same run.

## F15 - The new skill's procedure contradicts its own golden example

**`skills/askit-capability-gap-analysis/SKILL.md:67`**

Step 5 routes the conclusion (files the backlog entry or ADR draft) **before** step 6 says "measure before
you recommend ... count them before writing it down." The shipped golden example inverts this: it runs
"Step 4 and 6" first, then "Step 5". An author following the numbers literally does what step 6 forbids.

Fix: renumber (measure as 5, route as 6), or state in step 5 that it cannot complete until step 6 has run.

> **CLOSED 2026-08-19.** Renumbered exactly as the finding prescribes: **measure is now step 5 and route
> is step 6**, so an author following the numbers literally does what the procedure intends.
>
> The golden example needed no behavioural change - it was already right, which is what made the
> contradiction visible - so only its step labels move, from "Step 4 and 6" to "Steps 4 and 5" and from
> "Step 5" to "Step 6". The example is evidence that the ORDER was correct and the NUMBERS were not.

---

## What is NOT in this list

- **Adversarial wave 2**, which never ran. Codex credits return 2026-08-20.
- Anything about the consumer install path, the docs site, or the marketplace scope - this review targeted
  the code diff.
- Two candidates the reviewer confirmed but cut for severity: `pagesExhausted` gives a misleading
  "raise the page cap" remediation when the final partial page lands exactly at the cap
  (`scripts/action-pin-watch.mjs:94`), and ADR 0053 cites `release.yml:91` for a pin this same diff moved
  to line 100.

---

# Fix-code review, 2026-08-19

> **Status: all five CLOSED.** A repository-reading review over `1de984a..HEAD` - the four PRs that closed
> `F1` to `F15` - because **the code written in response to a review is itself unreviewed**, and in this
> repository that is repeatedly where the worst defects are. `F3` is the standing proof, and this round
> produced its exact recurrence.

**Two of the five are blocking-class by this file's own definition** (`R1` and `R2` block a correct pin).
Both were introduced by fixes in this very set of PRs, one of them by the fix for `F4`.

## R1 - BLOCKING. The last-token rule was wrong in the mirror case

**`scripts/lib/action-pin-watch.mjs`**

`F4` replaced a first-token rule because Dependabot writes `bumped from v4.37.6 to v4.37.7`. The
replacement misread the mirror shape just as badly. Reproduced by hand before fixing:

```
ref=v4.1.1   comment="v4.1.1 pinned 2026-08-16; replaces v3.0.0"
  claimed=v3.0.0  verdict=LABEL_CONTRADICTS_REF      <- FALSE FINDING, exit 1
ref=v4       comment="v4.2.0 pinned 2026-08-16, was v3.9.0"
  claimed=v3.9.0  verdict=LABEL_CONTRADICTS_REF      <- FALSE FINDING, exit 1
```

Exit 1 is the code no reason string can override, and the comment OPENS with the correct version in every
case. One root cause, three outlets: SHA pins, the `other` branch `F7` added, and the major-tag branch.

> **CLOSED 2026-08-19.** **Position alone cannot decide the claim**: `from A to B` puts it last, `B ...
> replaces A` puts it first, so any purely positional rule is wrong half the time. The rule now reads the
> words between the versions - a FORWARD marker (`to`, `now`, `->`) takes the token after it, otherwise
> tokens introduced by a SUPERSESSION marker (`from`, `was`, `replaces`, `supersedes`, `previously`) are
> dropped and the first survivor wins.
>
> **The reviewer's suggested repair was declined, and the reason is the sharpest thing in this round.**
> It proposed preferring whichever token matches the ref or a resolved tag. **That is exactly the trap
> `F3` was**: a rule that picks the matching answer can never disagree, so it would pass a comment saying
> "bumped to v4.37.7" against a SHA that never moved off v4.37.6 - the precise Dependabot drift this whole
> check exists to catch. **The claim is computed from the COMMENT ALONE**, that invariant is stated in the
> docblock, and a test locks it by asserting the same comment yields the same claim against four different
> resolutions while the stale case still reports `LABEL_DISAGREES`.
>
> Mutation-proved in BOTH directions, which is what shows neither half is redundant: reverting to
> last-token turns the mirror-shape test red, reverting to first-token turns the Dependabot test red.
>
> **AMENDED 2026-08-19, third round.** The forward-marker half of this rule was itself too loose and is
> corrected as `S1` below: it took the token after the LAST `to`/`now`/`->` ANYWHERE in the comment, so an
> ordinary English `to` outranked an explicit `was` sitting directly in front of the old version. **This
> fix reintroduced the very class it was written to remove**, on a third consecutive round. A forward
> marker now counts only inside a TIGHT transition.
> last-token turns the mirror-shape test red, reverting to first-token turns the Dependabot test red.

## R2 - BLOCKING. The floating-label escape hatch advised a label that would then fail

**`scripts/lib/action-pin-watch.mjs`**

`F3`'s escape hatch filtered resolved tags on *not floating*, which counts `latest` as specific. Reproduced:

```
verdict=LABEL_FLOATS  detail="... this commit is also tagged latest - name one of those instead"
versionInComment("latest") = null      -> writing `# latest` yields LABEL_MISSING, also exit 1
```

The author is left with no satisfiable label - the *"a rule that cannot be satisfied is a false finding
with extra steps"* trap that hatch's own comment names, restated one level down.

> **CLOSED 2026-08-19.** `isSpecificVersion` asks the right question: a tag qualifies only if the comment
> parser reads it back as itself AND it does not float. The escape hatch fires when no such tag exists even
> if other tags do, so the advice this module prints can only ever name labels that would pass. Tested in
> both directions: `[v3, latest]` passes, `[v3, v3.0.2, latest]` blocks and names `v3.0.2` and never
> `latest`.

## R3 - The misconfiguration refusal landed in the OVERRIDABLE bucket

**`scripts/action-pin-watch.mjs` with `scripts/lib/release-ready.mjs`**

`F11`'s new "pointed at nothing" throw exited 2 like every other throw, and `action-pins` declares
`overridableCodes: [2]` - so `--allow-vendor-unreachable "GitHub API 503"` would have shipped a release
whose pin gate was pointed at the wrong directory, while `renderSummary` printed *"It covers
UNREACHABILITY only ... and nothing else"*.

> **CLOSED 2026-08-19.** **Rewording that sentence would have legitimised the override**, which is the
> wrong direction; misconfiguration gets its own exit **3** instead. It needs no change to the gate list to
> be safe: `gateBlocks` blocks on any non-zero (`F2`), and `overridableCodes` is an allowlist that 3 is not
> in. Both properties are asserted rather than assumed. Accepted costs, stated: the CLI's documented codes
> become 0/1/2/3, and `F1`'s regression test and closure note move from 2 to 3.

## R4 - The spawn-failure diagnostic could not print in the failure it was built for

**`scripts/lib/release-ready.mjs`**

`F10` set a 10-minute gate timeout under 20-minute jobs. One hung gate worked as designed. **Two did not**:
a network blackhole hangs both network-bound gates, 5 gates x 10 minutes exceeds the job cap, and the job
is cancelled before `renderSummary` runs - so the operator gets a bare job cancellation instead of "this
gate could not be RUN".

> **CLOSED 2026-08-19.** Five-minute gates under thirty-minute jobs (**superseded: the fourth round raised
> those jobs to FIFTY**, see `S3` and `T6`), on the two jobs that actually run the
> aggregate (`publish`, which runs no gates, stays at 20). **The arithmetic is now a test rather than a
> choice**: both workflows are parsed and each aggregate-running job must satisfy
> `timeout-minutes * 60000 > GATES.length * GATE_TIMEOUT_MS`. That turns the reviewer's hand calculation
> into a guard, so the two numbers cannot drift apart again.
>
> **AMENDED 2026-08-19, third round.** Two corrections, `S2` and `S3` below. The 5-minute gate timeout was
> BELOW `action-pin-watch`'s own 38-minute worst case, so a slow registry got the gate KILLED - and a kill
> maps to `SPAWN_FAILED`, which is deliberately non-overridable, turning an outage into a hard block. And
> the arithmetic asserted here budgeted the gates while ignoring the checkout, `npm ci` and full suite that
> run before them.
> into a guard, so the two numbers cannot drift apart again.

## R5 - The self-reference guard required a leading `v`

**`scripts/check-readme-version.mjs`**

`F13`'s pattern required `@vX.Y.Z`, so a manifest advertising `@1.15.0` matched nothing and the guard
reported clean - **the reports-clean-over-nothing class, reintroduced inside the fix for three instances of
it**, on the same day `F4` established that the `v` is optional.

> **CLOSED 2026-08-19.** The `v` is optional and the written spelling is echoed back in the message.
>
> **Two parts of the finding are DECLINED, with reasons, which is a disposition rather than silence.**
> The owner is captured but still not compared: flagging a same-named foreign project would require this
> repository's own manifest to reference one, which is contrived, and the risk is accepted. And `@main` or
> a sha self-reference stays uncovered because **it makes no version claim** - there is nothing there for a
> version guard to check.

## What this round does NOT discharge

**One more repository-reading review is due over this R-fix diff before the class is recorded closed.**
That is this repository's own until-a-round-comes-back-clean rule, and `R1` recurring inside the fix for
`F4` is the proof it applies here: **the code written in response to a review is itself unreviewed, every
time, including this time.**

**And none of this touches acceptance criterion 6.** Codex adversarial wave 2 has still never run, and no
self-review, no `/code-review` pass and no fix in this file can satisfy it.

---

# Third round, 2026-08-19: reviewing the fix-code fixes

> **Status: all six CLOSED.** A repository-reading review over `3a1afb6..HEAD` - the PR that closed `R1` to
> `R5`. Run because the second round's own conclusion said one was owed, and because `R1` had just proved
> the rule applies to this work.

**Severity is falling even though the count is not**: round 1 returned 15 with **8 blocking**, round 2
returned 5 with **2 blocking-class**, and this round returned 6 with **0 blocking, 2 medium, 4 low**. No
finding here blocks a correct pin or lets a defect through silently; the two mediums are a false-finding
shape and a wrong-layer timeout.

## S1 - MEDIUM. The forward-marker rule reintroduced the class R1 removed

**`scripts/lib/action-pin-watch.mjs`**

`R1`'s rule 1 took the first token after the LAST `to`/`now`/`->` anywhere in the comment, and returned
before the supersession filter ran. Any incidental `to` in ordinary prose therefore beat an explicit
marker sitting directly in front of the old version. Reproduced against the shipped code:

```
"v4.37.7 pinned 2026-08-16 (needed to keep node 22, was v4.36.0)"  -> claim=v4.36.0
"v2.0.0 pinned; do not downgrade to v1.9.9"                        -> claim=v1.9.9
"v4.37.7 pinned 2026-08-16; see #123 for how to migrate from v3.0.0" -> claim=v3.0.0
```

Every one is a correct pin reported as `LABEL_DISAGREES` at exit 1. **Third consecutive round in which a
fix for the comment parser broke the comment parser in a new way.**

> **CLOSED 2026-08-19.** A forward marker counts only inside a **TIGHT transition**: the text between two
> version tokens must be the marker and punctuation and nothing else. That is the distinction that
> actually separates the two populations - a real transition is written tightly (`from A to B`, `was A,
> now B`, `A -> B`), while prose merely mentioning an older version puts words in between. Verified
> against all eleven shapes now in the test table, both the ones that must transition and the ones that
> must not. Mutation-proved: dropping the anchors turns two tests red, including `R1`'s own.

## S2 - MEDIUM. The gate timeout sat below the watch's own worst case, turning an outage non-overridable

**`scripts/lib/release-ready.mjs` with `scripts/action-pin-watch.mjs`**

Arithmetic from the watch's own constants, confirmed by running them: 1 `releases/latest` call plus up to
`TAG_PAGE_CAP` (6) tag pages per action, each at `FETCH_TIMEOUT_MS` x 2 attempts plus the retry delay, is
**~4.8 minutes per action**; this repository pins **8 distinct actions** sequentially, for a **38-minute**
worst case against a `GATE_TIMEOUT_MS` of five.

**The composition is what made it serious, and neither half was wrong on its own.** `F10` gave the harness
a timeout; `F2` made a harness kill non-overridable. Together, a slow registry - the exact case
`--allow-vendor-unreachable` exists for - arrives as `SPAWN_FAILED`, blocks, and **cannot be overridden**,
while the operator is told the process "never started, or was killed".

> **CLOSED 2026-08-19.** **A tool that runs out of its OWN time reports a refusal; a harness kill should
> mean the process is wedged.** The watch now carries `RUN_DEADLINE_MS` (3 minutes) and stops fetching past
> it, so unreached pins report `UNRESOLVED` and the run exits **2** - overridable with a stated reason,
> which is what a slow third party deserves.
>
> **The deadline is checked before EVERY request, not merely between actions.** Checking only between them
> would have left the run bounded by the deadline plus one whole action - another 4.8 minutes - which is
> long enough to be killed anyway, so the fix would not have fixed it. Caught while doing the arithmetic
> for `S3` rather than by the reviewer.
>
> A test locks the layering: `GATE_TIMEOUT_MS > RUN_DEADLINE_MS`, or an outage is killed rather than
> refused and the distinction is lost again.

## S3 - The R4 arithmetic budgeted the gates and ignored everything before them

**`tests/unit/release-ready.test.mjs`**

`R4`'s guard asserted `job > GATES.length * GATE_TIMEOUT_MS`, but the job budget is not spent on gates
alone: `publish-npm.yml:prepare` runs a `fetch-depth: 0` checkout, setup-node, four verifier scripts, a
second checkout, `npm ci` and the full suite before `release-ready.mjs` starts. The correlated case could
still cancel the job before `renderSummary` printed, losing the diagnostic the arithmetic exists to keep.

> **CLOSED 2026-08-19.** A stated `PREAMBLE_ALLOWANCE_MS` of 20 minutes is added to the worst case, and the
> two aggregate-running jobs are raised to 50 minutes so the inequality holds with margin. The failure
> direction was always safe - the release stayed blocked - so only the diagnostic was at risk, and it is
> the diagnostic this whole line of work exists to protect.

## S4 - The ambiguity note described a rule the code no longer used

**`scripts/lib/action-pin-watch.mjs`**

The detail string still said *"the last is read as the claim"* while reporting the FIRST:

```
comment says v4.1.1, the ref resolves to v9.0.0 (the comment names v4.1.1 and v3.0.0; the last is
read as the claim)
```

Output misdescribing its own decision, which is the defect class this repository grades others on.

> **CLOSED 2026-08-19.** The note names the token that was actually read. There is no fixed position any
> more, so naming one was guaranteed to be wrong for half the inputs.

## S5 - A CHANGELOG paragraph lost its subject in the R1 edit

**`CHANGELOG.md`**

Removing "claim is now the LAST token," left a dangling `The` followed by a duplicated `the`, so the
paragraph no longer stated the claim rule before the next paragraph revised it. **This is shipped prose in
the npm tarball.**

> **CLOSED 2026-08-19.** Sentence repaired and split, so the F4 paragraph states what it fixed and the
> paragraph after it states how the rule was later corrected.

## S6 - The R1 invariant loop was vacuous

**`tests/unit/action-pin-watch.test.mjs`**

`for (const resolvedVersions of [...])` never used the loop variable: four identical `parsePins`
assertions against a function that takes no resolution at all. **It would not have caught the change it
exists to forbid** - the same vacuous-test class `F2`'s finding named, written by the same hand that had
just fixed `F2`'s.

> **CLOSED 2026-08-19.** The loop runs each resolution through `evaluatePin`, which is where a resolution
> could actually leak into the claim, and asserts the reported claim never moves to fit. The empty
> resolution is asserted separately, because it yields `UNRESOLVED` - a verdict about the lookup rather
> than the label, which quotes no claim, so folding it into the loop would have made the loop vacuous
> again in a new way.

## Where this leaves the rounds

| Round | Scope | Findings | Blocking |
| --- | --- | --- | --- |
| 1 | `v1.14.0..HEAD` (the release) | 15 | 8 |
| 2 | the fixes for those 15 | 5 | 2 |
| 3 | the fixes for those 5 | 6 | 0 |

**Three rounds, and every one found defects in the previous round's fix code.** That is not a reason to
keep going indefinitely; it is the reason the rule says run another round rather than declare done. What
has changed is severity, which is the signal worth reading: nothing in round 3 blocks a correct pin or
lets a defect through silently.

**A fourth round over this diff is owed on the same rule.** And acceptance criterion 6 is untouched by all
of it: Codex adversarial wave 2 has still never run.

---

# Fourth round, 2026-08-19: the decision to stop guessing

> **Status: all seven CLOSED.** A repository-reading review over `877764b..HEAD`. Two medium, five low,
> **none blocking**. Five of the seven were introduced by the third round's own fixes and records.

## T1 - MEDIUM. The fourth consecutive wrong answer from one function, and the last

**`scripts/lib/action-pin-watch.mjs`**

`S1`'s tight-transition rule fell back to a supersession filter that only looked BEHIND a token, so a
supersession word written AFTER the old version did not drop it. Reproduced:

```
"v3.0.0 superseded, now v4.0.0"        -> claim=v3.0.0   (should be v4.0.0)
"v1.0.0 was replaced, now v2.0.0"      -> claim=v1.0.0   (should be v2.0.0)
```

A correct pin, `LABEL_DISAGREES`, exit 1, non-overridable. **The fourth shape in four rounds:**

| round | rule | the input that broke it |
| --- | --- | --- |
| `F4` | first token | `bumped from v4.37.6 to v4.37.7` |
| `R1` | last token | `v4.1.1 pinned 2026-08-16; replaces v3.0.0` |
| `S1` | last token after any forward marker | `v4.37.7 ... (needed to keep node 22, was v4.36.0)` |
| `T1` | tight transition, else first non-superseded | `v3.0.0 superseded, now v4.0.0` |

> **CLOSED 2026-08-19, by changing the design rather than the heuristic.** Four failures on one function
> is not bad luck; it is evidence that deciding which version a sentence of English means is unbounded,
> and that every new marker word invites a new counterexample - `was replaced` marks the version before it
> as old, `was pinned yesterday` does not.
>
> **The tool now declines to guess.** One token is the claim. A TIGHT transition names the claim. Anything
> else with several tokens is **`LABEL_AMBIGUOUS`: advisory, blocks nothing**, and asks the author to name
> one version. The supersession heuristic is DELETED rather than extended, because a heuristic that no
> longer decides anything is the `blocksOn` trap this repository already removed once.
>
> **The asymmetry is what settles it.** A wrongly guessed claim blocks a correct pin at a code no reason
> string can override. An unparsed prose comment costs one advisory line, on a shape no automated bumper
> writes. Those costs are not comparable, and after four demonstrated failures the honest capability claim
> is that this tool reads unambiguous labels and says so when a label is not one.
>
> **It does not become a guard that cannot fail, and that objection is answered in code rather than in
> prose.** An ambiguous row is counted, prints its own `ambi` symbol, and **suppresses the sentence that
> would otherwise claim every label was checked** - the run reports that it did not check every pin. And
> the tight-transition shapes still resolve, so `bumped from A to B` against an unmoved SHA still blocks.
>
> ADR 0053 needs no correction: its label rule is unchanged for every comment that names one version.
> This adds a disposition for comments that rule never contemplated.

## T2 - MEDIUM. The round-3 amendments corrupted the file they were recording in

**this file**

Two amendments were anchored MID-SENTENCE, so each split a sentence with a blank line - terminating the
blockquote - and left an orphaned fragment followed by a restarted quote. **This is the `S5` class, in the
same commit that fixed `S5`.**

> **CLOSED 2026-08-19.** Both sites rejoined. **The root cause is a process one and it is fixed as a
> process:** four prose defects in two rounds (`S5`, `T2`, `T6`, `T7`) all came from anchor-based
> insertion into prose that was never re-read. Anchors now land on the LAST COMPLETE LINE of a paragraph,
> never a fragment, and every prose script prints its modified regions so they are read rather than
> assumed. That is why this closure note can say the repair was verified by looking at it.

## T3 - The layering guard did not budget the overrun it exists to prevent

**`tests/unit/action-pin-watch.test.mjs`** (this record said `release-ready.test.mjs` when written; the
assertion is the `S2: the watch bounds its OWN run` test, corrected 2026-08-19 by the fifth round, `U5`)

`S2`'s guard asserted only `GATE_TIMEOUT_MS > RUN_DEADLINE_MS`. The deadline is checked BEFORE a request,
so the run can exceed it by one whole request. Today's margin holds, but raising `FETCH_TIMEOUT_MS` to 60s
would have re-created the harness kill **with the test still green** - the under-budgeted-arithmetic
defect `S3` had just fixed one file over.

> **CLOSED 2026-08-19.** The inequality now budgets the overrun explicitly:
> `GATE_TIMEOUT_MS > RUN_DEADLINE_MS + FETCH_TIMEOUT_MS * (FETCH_RETRIES + 1) + FETCH_RETRY_DELAY_MS`.
> Mutation-proved with the reviewer's own scenario: raising `FETCH_TIMEOUT_MS` to 90s now turns it red.

## T4 - A deadline throw discarded tags already found

**`scripts/action-pin-watch.mjs`**

`out.resolvedBySha` was assigned after the page loop, inside the `try`, so a deadline throwing on page 3
dropped a sha matched on page 1 - and that pin was reported `UNRESOLVED`, a refusal about a question
already answered. The `RUN_DEADLINE_MS` docblock promises the run reports what it has.

> **CLOSED 2026-08-19.** Published from a `finally`, with `found` hoisted so it is in scope. `resolveAction`
> is now exported and takes an injectable fetch so the behaviour can be demonstrated rather than read.
>
> **CORRECTED 2026-08-19, fifth round. Two claims in the paragraph above were wrong, and both are the kind
> of thing this file exists to prevent.**
>
> **The test was VACUOUS** (`U3`). Its fake page 1 carried the only wanted sha, so the loop broke before
> page 2 was ever requested: the deadline path was never reached and it passed with the fix reverted.
> Rewritten with two wanted shas across two pages and a fake that sleeps past the deadline, and
> mutation-proved - it is now red when the `finally` is removed. The claim that it was a REAL test was
> false when written.
>
> **And the fix changes no verdict today** (`U2`). `out.error` is set by the same throw that preserves
> `found`, and `evaluatePin` returns `UNRESOLVED` on `err` before it reads `resolvedVersions`. So the
> scenario this note describes still reports UNRESOLVED and still exits 2. The hoist makes the data
> correct; it does not yet make the verdict different.
>
> **The real repair is DEFERRED, deliberately and with the reason stated**: it means preferring a non-empty
> `resolvedVersions` over `err` for a SHA pin, which changes refusal precedence - the exact area wave 1
> corrected once (`a known defect outranks uncertainty`) and `F6`/`F7` settled again. That is not a change
> to make in the fifth round of a long day. Filed for v1.15.1 or wave 2 scope.

## T5 - The deadline docblock asserted an exit code the tag path does not produce

**`scripts/action-pin-watch.mjs`**

Both the docblock and the `main()` comment said that past the deadline "every unresolved pin reports
UNRESOLVED, and the exit code is 2". True for SHA pins only: `evaluatePin` maps an error on a tag ref to
OK with `currencyUnknown`, so a deadline expiring after the two SHA-pinned actions resolve leaves a run
that skipped every remaining currency lookup and exits **0**.

> **CLOSED 2026-08-19 by fixing the COMMENTS, not the behaviour.** Error-on-a-tag-ref becoming
> currency-not-checked is `F6` and `F7`'s deliberate design - the ref itself answers the label question -
> and a deadline is just another error arriving at that path. Reverting it would reopen `F6`. Both comments
> now state the split exactly, and name the `Currency was NOT checked for N pin(s)` line as what surfaces
> the skip.

## T6 and T7 - Two numbers falsified by the commit that wrote them

The `R4` closure note still said "thirty-minute jobs" after the same round raised them to fifty, and the
preamble comment cited a test count the same commit changed.

> **CLOSED 2026-08-19.** `T6` is AMENDED rather than rewritten, per this file's own rule, and now names
> the supersession. `T7` stops quoting a count at all: quoting one was itself a finding the moment the
> same commit moved it, so the comment describes the magnitude and leaves the exact number to the suite.

## Where the rounds stand now

| Round | Scope | Findings | Blocking |
| --- | --- | --- | --- |
| 1 | the release | 15 | 8 |
| 2 | the fixes for those 15 | 5 | 2 |
| 3 | the fixes for those 5 | 6 | 0 |
| 4 | the fixes for those 6 | 7 | 0 |

**Two rounds running with zero blocking findings.** The count is flat; the severity floor has been reached.
More importantly, `T1` removes the entire class the rounds kept finding - **there is no guess left to be
wrong about** - and `T2` fixes the process that produced four of the record defects rather than the
records themselves.

**A fifth round is worth running as confirmation. It is not worth blocking the tag on**, and anything
non-blocking it returns belongs in v1.15.1 or in wave 2's scope rather than in another round of this.
**That is a recommendation to the maintainer, not a decision taken here.**

**Acceptance criterion 6 is untouched by all four rounds.** Codex adversarial wave 2 has still never run.

---

# Fifth round, 2026-08-19: confirmation, and one regression it caught

> **Status: the HIGH finding and two record defects are CLOSED. Two are DEFERRED with stated reasons.**
> A repository-reading review over `32f9dda..HEAD`, run as the confirmation pass the fourth round said was
> owed. **The stopping rule was changed before it ran**: fix what blocks, correct any false record, and
> defer the rest to v1.15.1 or wave 2 rather than starting a sixth round.

## U1 - HIGH, and a REGRESSION the fourth round introduced. CLOSED

**`scripts/lib/action-pin-watch.mjs`**

`T1` added `claimAmbiguous` and consulted it in the **sha branch only**. On a tag ref an ambiguous comment
therefore left `claimed === null`, which skipped the `LABEL_CONTRADICTS_REF` check and returned plain OK.
Verified against `32f9dda`: `uses: a/b@v3 # v4.2.0 pinned 2026-08-16; replaces v3.9.0` **used to return
`LABEL_CONTRADICTS_REF` at exit 1 and now returned `OK`**, uncounted, under the sentence *Every label is
accurate*.

**That is the commit violating its own closure contract.** `T1` promised an ambiguous row is counted,
prints `ambi`, and suppresses that sentence. For tag refs it got none of the three.

> **CLOSED 2026-08-19.** Ambiguity is reported for **every** ref kind, advisory and counted, so the pin can
> no longer pass silently. Currency goes unchecked with it, which `currencyUnknown` surfaces. An
> UNAMBIGUOUS contradicting comment still blocks at exit 1, and a test asserts that separately so the
> downgrade cannot spread.
>
> **The generalisable mistake is worth more than the fix: adding a new state leaves every consumer that
> branches on the OLD state with an unhandled case.** There were three sites reading `claimed`; one was
> updated. Grep for the old field, not for the new one.

## U4 - LOW. CLOSED, because it was two lines and it was coverage this round had just lost

`claimIsAmbiguous` counted raw tokens, so `# v3.0.2 pinned 2026-08-16 (see .../releases/tag/v3.0.2)` was
declared ambiguous and left unchecked. **Two mentions of one version are one claim.** Both
`versionInComment` and `claimIsAmbiguous` now deduplicate on `normalizeVersion`.

> Note what is NOT fixed and is correct as designed: `# v4.37.7 pinned 2026-08-16 (node 20.11.0)` still
> goes advisory, because two DIFFERENT versions is exactly the case `T1` decided not to guess about.

## U2, U3, U5 - record defects. CLOSED as records; one repair DEFERRED

**`U3`: the `T4` test was vacuous** - its fake page 1 carried the only wanted sha, so the loop broke before
page 2 and the deadline path was never reached. It passed with the fix reverted. Rewritten with two shas
across two pages and a fake that sleeps past the deadline; mutation-proved red without the `finally`.

**`U2`: the `T4` fix changes no verdict today** - `evaluatePin` returns `UNRESOLVED` on `err` before it
reads the preserved `resolvedVersions`. The real repair means changing refusal precedence, which is the
area wave 1 corrected once and `F6`/`F7` settled again. **Deferred with that reason stated**, not silently.

**`U5`: `T3` cited the wrong test file.** Corrected in place.

**All three were FALSE OR MISLEADING STATEMENTS IN THE RECORD, and that is why they were fixed under a
stopping rule that otherwise defers non-blocking findings.** A record that says something untrue is worse
than one that says nothing, whatever the severity of the code beneath it - and `T4`'s note had claimed a
REAL test that did not exist.

## Where the rounds end

| Round | Scope | Findings | Blocking | Disposition |
| --- | --- | --- | --- | --- |
| 1 | the release | 15 | 8 | all closed |
| 2 | the fixes for those 15 | 5 | 2 | all closed |
| 3 | the fixes for those 5 | 6 | 0 | all closed |
| 4 | the fixes for those 6 | 7 | 0 | all closed |
| 5 | the fixes for those 7 | 5 | 1 | 1 blocking + 3 records closed, 1 deferred |

**Five rounds, 38 findings, and every round found something in the previous round's fix code.** The honest
reading is not that reviewing is futile - round 1 alone found eight blocking defects in a release that was
about to be tagged - but that **fix code deserves the same scrutiny as the code it fixes, every time.**

**A sixth round is not recommended.** Round 5's single HIGH was a regression from a design change, and
that design change is now settled; the rest were records. The remaining risk is better spent on
**acceptance criterion 6**, which no round of this has touched: Codex adversarial wave 2 has still never
run, and it reads the repository with a different instrument.

---

# ADVERSARIAL WAVE 2, 2026-08-20: acceptance criterion 6, discharged

> **Status: all five findings CLOSED.** This is the independent second wave the packet has carried as an
> OPEN acceptance criterion since the cut. It is not another `/code-review` round: a different reviewer,
> a different instrument, reading the local working tree at `7cb7f75`.

**Every finding landed in territory the five `/code-review` rounds never entered**, which is what
pointing a wave away from its predecessor is for. The focus text named the three files those rounds had
ground over and told the reviewer to weight its attention elsewhere; it did, and found five defects there.

## Getting it to run at all is part of the record

Two attempts produced nothing and **neither was recorded as a result**, per the standing rule that a run
which dies is UNMEASURED rather than a pass.

The cause was not the review command, the CLI, or authentication. It was **Codex's local shell runner**:
`windows.sandbox = "elevated"` in the user config, against a Codex process that is not elevated, so every
`pwsh.exe` spawn returned `exit -1`. Codex then announced a fallback to the read-only GitHub connector and
reviewed the PUSHED copy file-by-file until it died four minutes in - while the job record reported
`status: running, phase: investigating` **for the next 67 minutes over a dead process**.

**Three mechanisms all failing toward looks-fine at once**, and the buffer held two
`{"verdict":"approve","findings":[]}` messages emitted while the reviewer was merely narrating its plan.
Asking for the result rather than reading the log would have produced a clean bill of health from a run
that read almost nothing. **`updatedAt`, log size and process CPU are what distinguished the states; the
status field did not.**

Fixed by running with `-c windows.sandbox="unelevated"` as a one-off override - verified first on a
one-command probe (`git rev-parse --short HEAD` succeeded in 513ms) before spending a full wave on it. The
user config was deliberately not edited.

## W1 - HIGH. The release-count guard is blind to its own headline number. CLOSED

**`scripts/lib/stated-counts.mjs`**

`extractTestCountClaims` requires the comma to follow the integer directly, so **markdown emphasis around
only the NUMBER hides the claim entirely**:

```
"**1292**, 0 failures"  ->  claims: []
"1292, 0 failures"      ->  claims: [{ total: 1292, failures: 0 }]
```

The packet's own `## Final numbers` table stated the cut-time total in bold while the same file stated
1352 two sections later. The exact row is in the fenced block above; writing it again as prose here would
now trip the working guard, which is its own small proof. And `check-release-counts` reported
**`OK (... agrees everywhere checked)`**. That sentence was true. It was true because the one claim that
disagreed could not be seen.

**This is the guard whose entire justification is that a human corrected this same drift three times in
v1.10.1 and it recurred anyway - defeated by a stated count in bold.**

> **CLOSED 2026-08-20.** Emphasis runs are tolerated at the token seams. **Widened rather than
> pre-stripped**, because callers use `index` to report a LINE NUMBER and removing characters first would
> shift every offset and misreport where the drift is.
>
> The proof is on the real repository rather than a fixture: after the fix the gate immediately reported
> `README.md:16`, naming the bolded total it had been unable to see. The record was
> then corrected so the headline states the true number and names the cut-time figure.
>
> A second seam needed the same treatment and only a red test found it: `**0** failures` puts the emphasis
> BEFORE the space, so a `\s+[*_]*` separator still missed it; it is `(?:\s|[*_])+` now, which keeps
> `0failures` from matching.
>
> **Guarded against its own hazard.** A test asserts that arbitrary prose between the integer and the comma
> still does not match, because a parser loosened enough to see a bold number could start inventing claims
> out of ordinary sentences - the false-finding class this repository grades other tools on, introduced by
> the fix for a missed finding. Mutation-proved: removing the tolerance turns three tests red and leaves
> that guard green.

## W2 to W5 - MEDIUM. Four skills that contradict their own contracts. ALL CLOSED

**Every one is a document telling an invocation to do two incompatible things**, in the two skills no
review round had examined. In each case the reference or the folder contract was right and the `SKILL.md`
overstated; the fix aligns the skill, never the contract.

| # | The contradiction | Resolution |
| --- | --- | --- |
| W2 | `SKILL.md` forbids editing **any** component frontmatter; `component-staleness.md` assigns this skill to write `metadata.verified-against` | One carve-out, exactly as wide as *components this run assessed*. The reference argues why no other skill can own it: a survey examines vendors, so a bulk stamp asserts readings that never happened. |
| W3 | `SKILL.md` says *Cowork is a column*; the matrix it updates says Cowork *has no column* | The matrix owns the modelling decision. The bullet's substance was always right (the gate accommodates an agent the matrix did not model); only its heading reversed the decision. Now: report the gap, do not add the column. |
| W4 | `SKILL.md` requires versioned entries from **every** surface; `surfaces.md` says agentskills.io has no versioned feed and belongs to `askit-standards-watch` | Qualified to *every surface this skill pins*, with the exception named. **The same false claim was shipped publicly in `CHANGELOG.md` and is corrected there too.** |
| W5 | `SKILL.md` step 5 says *Write the survey record*; the folder contract says the skill *proposes both files and writes neither* | Step 5 now proposes, matching step 6. A skill that wrote the record but proposed the pin could leave the two describing different runs - the exact divergence the contract exists to prevent. |

## What wave 2 found clean, with its limits stated

- **The Standard 0.15 graduations**: no defect; 54 of 54 targeted tests passed.
- **`release.yml` and `publish-npm.yml`**: no defect in the changed lines - **but the hosted workflows were
  not dispatched**, and the reviewer said so rather than implying coverage it did not have.
- **The probe fixtures**: no bypass. `evaluate.mjs` exits 1 on them with the intended errors while
  `check.mjs` stays Advanced 0/0, which is the intended split.
- **Current action pins**: 29 pins across seven files, zero label problems.

It also recorded that `npm test` could not complete in-sandbox (`spawnSync git EPERM`) and that it used
targeted tests instead - a limit stated rather than a gap papered over. The working tree was unchanged at
the end, which was verified independently: `7cb7f75`, zero modified files.

## The rounds, complete

| Round | Instrument | Findings | Blocking |
| --- | --- | --- | --- |
| Wave 1 | Codex, pre-merge | 10 | 5 HIGH |
| 1 to 5 | `/code-review`, repository-reading | 38 | 11 |
| **Wave 2** | **Codex, local tree** | **5** | **1 HIGH** |

**Fifty-three findings across seven passes.** The argument for wave 2 was that a different instrument sees
a different class, and it held: five rounds of `/code-review` never looked at the count parser or the new
skills' internal contracts, because they were all reading the same files with the same assumptions.

**Acceptance criterion 6 is DISCHARGED.**
