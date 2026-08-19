---
title: "v1.15.0 review findings - open, and blocking the tag"
---

# v1.15.0 review findings

> **Status: OPEN. The tag must not be cut until the blocking findings below are closed.**
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

## F5 - BLOCKING. The block-scalar regex misses two legal YAML headers

**`scripts/lib/action-pin-watch.mjs:45`**

`run: | # trailing comment` and `run: |2-` (indentation indicator before chomping indicator) are both legal
and both missed, so a `uses:`-looking line inside a shell payload is parsed as a real pin and **blocks the
release** - the false-finding failure the file's own comment calls the worst outcome it recognises.

The regex does not even match its own docstring example `body: |2+`. The test suite covers only plain
`run: |`.

## F6 - BLOCKING. `majorOf` returns null for a non-`vN` release tag, disabling BEHIND while asserting currency

**`scripts/lib/action-pin-watch.mjs:175`**

`github/codeql-action`'s `releases/latest` tag is **`codeql-bundle-v2.26.3`**, so `majorOf(latest)` is null
and the BEHIND guard short-circuits. Because `latest` is truthy, `currencyUnknown` is set **false**, so the
report omits its "Currency was NOT checked" line.

Live output today: `ok ... label and ref agree on v4.37.7 (of v4.37.7, v4); current release codeql-bundle-v2.26.3`.

**The major-tag branch is worse:** it prints `v4 is self-describing and current (codeql-bundle-v2.26.3)` -
flatly asserting currency against a tag it could not compare, which lines 194-197 and 308-309 say must
never happen. **If codeql-action ships v5, nothing here will ever report it BEHIND.**

## F7 - BLOCKING. `refKind: "other"` returns OK unconditionally

**`scripts/lib/action-pin-watch.mjs:211`**

`uses: actions/checkout@v4.1.1 # v7.0.0 pinned 2026-01-01` returns
`{verdict:'OK', detail:'ref v4.1.1 is a full tag or branch; no label contract applies'}` - a flatly
contradicting label passing at exit 0, while the identical contradiction on a bare major tag raises
`LABEL_CONTRADICTS_REF` one branch above.

The branch also **never reads `resolution.error`**, so a 404 or rate limit reports OK rather than
UNRESOLVED. Exact-version tag pinning is the standard output of a Dependabot bump on a tag-pinned repo.
**No test covers this refKind.**

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

## F12 - The write-incapability guard is defeatable

**`tests/unit/action-pin-watch.test.mjs:59`**

Adding `import * as fs from "node:fs"` plus `fs["writeFileSync"](p, d)` defeats **both** tests at once: the
import test only reads brace-delimited imports, and the write-API regex requires the identifier to be
followed by `(`, which `"](` is not. The CLI's docblock claim "WRITE-INCAPABLE BY CONSTRUCTION, and a test
enforces it" would survive a real write being added.

Secondary: the write-API scan runs on **raw** source rather than `stripComments()` output, so a comment
merely mentioning `writeFileSync(` would fail it - the inverse false-report class the same file warns about.

## F13 - `action.yml` USAGE is stale again, one release after it was fixed

**`action.yml:27`**

Reads `uses: product-on-purpose/agent-skills-toolkit@v1.14.0` while all four version manifests moved to
1.15.0 **in this same range**. This is the exact line commit `ee34392` (#238) fixed one release ago, which
`CHANGELOG.md` records as having been *"three releases stale, in the repository that grades others on
currency"* - **and it has drifted again with no guard added.**

Nothing checks it: `check-readme-version.mjs` reads only README, `verify-tag-matches-manifests.mjs` reads
only JSON version fields, and `parsePins` skips `#`-prefixed example lines. **A guard is the fix, not
another manual correction.**

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
