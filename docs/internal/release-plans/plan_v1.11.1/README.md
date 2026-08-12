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

- Resolve an **explicit** bash rather than trusting PATH. POSIX is unchanged (plain `bash`); Windows
  checks known Git for Windows locations first.
- **Actively refuse the WSL launcher.** Any candidate under `System32`, `Sysnative` or `SysWOW64` is
  rejected with a recorded reason rather than used. Preferring Git Bash and silently falling back to
  PATH would reproduce the defect on exactly the machines that have both.
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
