# v1.12.1 - what the second review round found

> Written last, from the code. v1.12.0 shipped after **one** adversarial review round. This patch exists
> because a second round was run afterwards, on the explicit observation that **the code written in
> response to round 1 had never itself been reviewed** - four fixes, including one to the parity harness
> that had just been switched to gating on every pull request.

## Why there was a second round at all

v1.11.0 took four review rounds; v1.10.1 took six, and round 6 there caught a defect in a round-5 fix.
v1.12.0 took one. The fixes it produced - a new verdict state, a rewritten resolution loop, a git-remote
identity check, and a fingerprint on the parity exception list - went in unreviewed, which is below this
repository's own bar and squarely in the category it has been bitten by before.

Round 2 returned **four findings, three of them high**, plus two defects found by hand while writing its
prompt and reading its output. Every one of them is in code that round 1 caused to exist.

## What round 2 found

| # | Finding | Disposition |
|---|---|---|
| 1 | The exception fingerprint still excuses mixed and unrelated validator failures | **Fixed** (already in progress when the round reported) |
| 2 | A wrong discovered checkout can still shadow the valid one and grade green | **Fixed** - candidate ranking, exact identity, repo-root remote |
| 3 | The scope guard still moves previously plugin-scoped targets | **Fixed** - the surface list was far too short |
| 4 | The public red-versus-not-red contract is stale after the round-1 resolver fix | **Fixed** - docs corrected |

### Finding 1: the fingerprint was matching the wrong thing

Round 1's fix required an exception to carry a `matches` regex. It then tested that regex against the
validator's **entire combined output**. `templates/seed-plugin` has one authorized diagnostic, the
missing `author`. If it acquired a **second, unrelated** defect, the combined output still contains the
word "author", so the whole result stayed excused - hiding a new defect in the scaffold template every
newly created plugin is generated from, on a harness that now gates.

Found independently while writing the round-2 prompt, and fixed by **measuring the real output shape**
rather than guessing it:

```
⚠ Found 1 warning:

  ❯ author: No author information provided. Consider adding author details for plugin attribution

✘ Validation failed (--strict treats warnings as errors)
```

Diagnostics are the `❯`-prefixed lines. `extractDiagnostics` splits on that marker and
`allDiagnosticsMatch` requires **every** diagnostic to match the fingerprint; one unmatched diagnostic
gates. When no marker is present (the skills-ref validator, the reduced-fidelity fallback, a future
format change) the whole detail is treated as one diagnostic, which is the previous behavior - a
cosmetic vendor change must not turn a required check red, which is the alarm-fatigue hazard ADR 0042
names against itself.

A second, quieter defect was fixed in the same function: a `g`-flagged fingerprint would have advanced
`lastIndex` between diagnostics and produced alternating results inside a gating predicate. The flag is
stripped before the repeated test.

### Finding 2: identity, done properly this time

Three separate defects, and the middle one is a lesson about incremental hardening.

**The suffix comparison went through three forms, and the first two were both wrong.** `a.endsWith(b)`
accepted `notgithub.com/owner/name` for `github.com/owner/name`. Adding a path boundary,
`a.endsWith("/" + b)`, closed that and **still** accepted `evil.example/github.com/owner/name`, because a
hostile path prefix reproduces the declared path at a boundary that looks legitimate. There is no safe
prefix allowance, so there is now none: `normalizeRemote` reduces both sides to `host/path` (scheme,
credentials, `.git`, trailing slash and explicit port removed) and the comparison is **exact**. A genuine
mirror under a path prefix is what the `askit.marketplace.json` mapping is for.

**First-wins ordering was still a false-green.** Round 1 accepted any candidate whose identity could not
be disproved, so a same-named plugin with no git metadata was accepted on sight and shadowed the correct
checkout in a later search root. Candidates are now **ranked, not raced**: a confirmed identity always
wins, whatever order it was found in.

**`git-subdir` was permanently unverifiable.** Its plugin directory is below the repository root, so
`<member>/.git` never exists and identity could never be established for the one source kind whose entire
premise is that the plugin is not at the root. `findGitRoot` walks up a bounded number of levels.

**Unconfirmed identity is now visible rather than silent.** Refusing to grade anything that is not a git
clone would break legitimate vendored copies and extracted tarballs, so such a member is still graded -
and the collection raises a **warning** saying its identity could not be confirmed. A green can no longer
rest quietly on an assumption about which directory was read.

### Finding 3: the scope guard was four markers short

Round 1's guard checked `library.json`, `skills/`, `agents/` and `commands/`. A plugin carrying
`AGENTS.md`, a native `plugin.json`, and only hook or MCP components would still have been re-scoped to a
catalogue and skipped its own plugin checks entirely - the exact class of verdict movement v1.12.0's
governing invariant forbids, left open by a list written too quickly.

The guard now covers `library.json`, both native plugin manifests, `.mcp.json`, and every component
directory (`skills`, `agents`, `commands`, `hooks`, `workflows`, `output-styles`, `themes`, `monitors`).

`AGENTS.md` remains deliberately excluded, and the reason is checked rather than assumed: the family
marketplace this scope exists for carries `AGENTS.md` and a `marketplace.json` and **nothing else**,
verified on disk. Including it would make the scope undetectable on its own motivating case. The residual
is stated in the code: a directory whose only plugin marker is `AGENTS.md`, with no manifest and no
components of any kind, reads as a catalogue - which it is.

## Two things measured, not assumed

**A local test failure that is not ours.** `resolve-bash.test.mjs` began failing during this work. It was
not caused by these changes, and the first hypothesis - that accumulated orphaned processes were
interfering - was **disproved by measurement**: clearing them changed nothing, 0 of 4 runs passing before
and after. The real cause is a wall-clock budget with no margin (the process must exit before the stuck
helper's 5000 ms lifetime; it measured 5331 ms on a loaded machine). It passes `validate-windows` on
clean CI runners. Filed as **E37**, with an explicit warning not to "fix" it by widening the threshold,
since the threshold IS the helper's lifetime and raising it removes everything the test discriminates.

**E32's escalation condition is now half met, on evidence.** That entry said it would be reconsidered
given "evidence that orphans accumulate across a normal development session". This workstation was
carrying **68 orphaned `bash` processes** in run-shaped clusters dating back eight days, and four
consecutive suite runs took the count from **63 to 85** - about five leaked per run, under entirely
ordinary use. The other half of its condition, interference with a later run, was investigated and did
**not** hold. Both halves are recorded on E32 so the next reader inherits the measurement rather than the
suspicion.

## What did not change

No check was added, removed or tightened. The spine is 30, the Standard is 0.12, and no plugin-scope or
component-scope verdict moves - which is now enforced by a test that walks every component surface rather
than by a list somebody remembered to keep current.
