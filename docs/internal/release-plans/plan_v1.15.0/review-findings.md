---
title: "v1.15.0 review findings - open, and blocking the tag"
---

# v1.15.0 review findings

> **Status, 2026-08-19: all eight BLOCKING findings are CLOSED, and four remain open - `F9`, `F10` and
> `F14` recorded as due before the tag, `F15` not blocking - so the tag is still held.** See the closure ledger below; each closed finding
> carries a dated note under its own text.
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
| F9, F10, F14 | OPEN, should fix before tag | - |
| F15 | OPEN, not blocking | - |

**All eight blocking findings are closed. FOUR findings remain open - `F9`, `F10` and `F14` due before the
tag, `F15` not blocking - so THE TAG IS STILL HELD.**

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

## F10 - No fetch timeout, no retry, and no `timeout-minutes` anywhere

**`scripts/action-pin-watch.mjs:70`**

`grep -rn timeout-minutes .github/workflows/` returns nothing. Any single throw from up to 20 sequential
`get()` calls cascades to UNRESOLVED (exit 2) for every pin of that action. The CLI's own comment records
that exactly this happened on 2026-08-17 during a GitHub partial outage.

`spawnSync` in `runGate` has no timeout either, and `publish-npm.yml`'s concurrency group uses
`cancel-in-progress: false`, so a stuck prepare job blocks every later publish dispatch until a human
cancels it.

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

## F15 - The new skill's procedure contradicts its own golden example

**`skills/askit-capability-gap-analysis/SKILL.md:67`**

Step 5 routes the conclusion (files the backlog entry or ADR draft) **before** step 6 says "measure before
you recommend ... count them before writing it down." The shipped golden example inverts this: it runs
"Step 4 and 6" first, then "Step 5". An author following the numbers literally does what step 6 forbids.

Fix: renumber (measure as 5, route as 6), or state in step 5 that it cannot complete until step 6 has run.

---

## What is NOT in this list

- **Adversarial wave 2**, which never ran. Codex credits return 2026-08-20.
- Anything about the consumer install path, the docs site, or the marketplace scope - this review targeted
  the code diff.
- Two candidates the reviewer confirmed but cut for severity: `pagesExhausted` gives a misleading
  "raise the page cap" remediation when the final partial page lands exactly at the cap
  (`scripts/action-pin-watch.mjs:94`), and ADR 0053 cites `release.yml:91` for a pin this same diff moved
  to line 100.
