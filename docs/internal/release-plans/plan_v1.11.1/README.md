# plan_v1.11.1 - the shell that was not there

A single-fix patch. No source file outside `tests/` changed. Spine stays **30 checks**, Standard stays
**v0.12**, tier stays **Advanced**, and nothing a plugin is graded by moves.

## What happened

v1.11.0 was tagged, released and re-pinned. The maintainer then ran the release's own published
publish instructions, from PowerShell, and `npm publish` refused: seven tests failed, and
`prepublishOnly` correctly stopped the upload.

Nothing was published. `1.11.0` was never burned on npm.

## The defect

`tests/unit/action-run-step.test.mjs` executes the Action's real `run:` script with
`execFileSync("bash", ...)`, resolving `bash` **through PATH**.

On Windows that resolution depends on the invoking shell:

| Invoked from | `bash` resolves to | Result |
|---|---|---|
| Git Bash | `C:\Program Files\Git\bin\bash.exe` | Shares the Windows filesystem. 7/7 pass. |
| PowerShell | `C:\Windows\System32\bash.exe` | **The WSL launcher.** 7 failures. |

WSL does not inherit Windows environment variables unless `WSLENV` is configured, so the `RUNNER_TEMP`
the test sets **vanishes crossing the boundary**. `"$RUNNER_TEMP/askit-gate.json"` collapses to
`/askit-gate.json` at the WSL root, the write is refused, and the script dies before emitting anything.

Because `prepublishOnly` runs `npm test`, **publishing was impossible from the default Windows shell on
any machine with WSL installed.**

## The part that cost the most

Not the defect. The **failure message**.

The seven failures reported `expected 'none', got undefined`, which reads as a grading disagreement.
The investigation went through Node versions, `npm ci` timing and test flakiness before a buried
`/bin/bash: line 13: /askit-gate.json: Permission denied` in the maintainer's paste identified the
shell.

A test whose failure misdirects costs more than the bug it catches. Since the outputs bridge writes
`tier` unconditionally before any branch in the step, an undefined `tier` can only mean the script died
early. That case now throws immediately, naming the bash binary used, the exit status, and the captured
stderr.

## The fix

- **Ask each candidate to prove itself, rather than judging it by its path.** The first attempt did
  the latter, matching against `System32`, `Sysnative` and `SysWOW64`, and the pre-release review broke
  it in one round: `%LOCALAPPDATA%\Microsoft\WindowsApps\bash.exe` is a **symlink to `wsl.exe`**, sits
  on `PATH` on this machine, and contains none of those names. Explicit Git for Windows candidates were
  separately accepted on `existsSync` alone and never reached the check.
  **The path string was a proxy for the property that matters.** The resolver tests the property
  instead, uniformly across explicit locations and `PATH` fallbacks; the lexical match survives only as
  a cheap pre-filter that can reject early and never grant acceptance.

  **Acceptance**, quoted from the implementation rather than paraphrased:

  > A candidate is accepted only if, within a bounded timeout, it exits with code 0 after correctly
  > echoing back a randomly-named environment variable this process set **and** correctly writing a
  > randomly-named token to a file path this process gave it, with `WSLENV` stripped from the
  > environment it runs in. That closes every concrete bypass found across the review rounds, but it
  > is an empirical, bounded-time behavioral test, not a formal proof of isolation.

  **Rejection**, likewise quoted:

  > On rejection, this process reliably stops waiting - on the candidate and on any helper this file
  > spawned to try to kill it - and exits within a bounded time, verified directly under adversarial
  > conditions including a kill helper that itself starts and never reports back. It does not guarantee
  > the candidate's own OS process is actually terminated, or that anything short of an explicit
  > confirmed success means more than "this process stopped waiting and moved on."

  **Four drafts of those sentences were wrong before these.** The first claimed immunity to "launcher
  paths nobody has invented yet", falsified in round 2 while the variable **names** were still fixed,
  because `WSLENV` forwards named variables across the boundary. The second claimed the supervisor
  "returns even if the kill does not land", falsified in round 3: the *function* returned, the
  *process* did not exit. The third omitted that the `taskkill` helper itself could become the
  event-loop anchor, falsified in round 4. And this file carried the round-2 wording while calling
  itself a verbatim quote until round 4 caught the drift, which is the same fix-one-place-miss-the-
  sibling pattern filed as E31.

  Quoting the implementer is a deliberate structural fix, and it has now caught three of these where
  careful writing caught none. This is the fourth consecutive release in which a control's scope was
  described more strongly than the code enforced it, and prose discipline has demonstrably not
  corrected that.
- **A second defect surfaced while proving the first:** `existsSync` returns **false** for that App
  Execution Alias even though `execFileSync` spawns it. The existence gate that supposedly protected
  explicit candidates would have called a working WSL launcher absent. Wrong in both directions at once.
- **Fail loudly, do not skip.** If no suitable bash exists the file throws at import, naming what was
  searched. A test that quietly no-ops when it cannot find its own shell reports green while testing
  nothing, which is how this survived in the first place.
- **Surveyed rather than spot-fixed.** All 23 files under `tests/` that spawn a subprocess were
  checked; every other one invokes `process.execPath` or `git`, both unambiguous. This was the only
  file trusting a bare `bash`.

## Why this is worth its own release note

**CI structurally cannot find this.** Every ubuntu runner has a real `/bin/bash`, so the test passes
there forever. It surfaced because a person on Windows ran the documented command in their own terminal
and pasted the output.

That is this repository's oldest lesson wearing new clothes. The `G4` (generated-docs drift)
remediation shipped in v1.10.0 told consumers to run a command they did not have, and survived review
for the same reason: nobody executed it from where the reader would be standing. The rule was written
down for **documentation**. It had not been applied to **publishing**.

## Verification that counts

The fix is verified from **PowerShell**, the shell that failed, not only from the Bash session where it
always passed:

```
# tests 939
# pass 938
# fail 0
# skipped 1
```

Verifying it in the environment that already worked would have proved nothing.
