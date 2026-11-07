# c1-pilot harness - what runs experiment B

This folder holds the scripts that run experiment B, and the record of how its environment was set up. The rules live in [the pre-registration](../../prereg_experiment-b-c1-pilot-20261105.md). Section 8 of that file allows harness faults to be fixed during the dry run, and it requires each fix to be recorded here. Sections 3 and 7 cannot change.

| File | What it does |
|---|---|
| `Containerfile` | Builds the one image that every build and scoring suite uses |
| `harness.mjs` | Exports the plugins, runs builds in containers, and runs the calibration. Its working data goes in the gitignored `_local/c1-pilot/` |
| `score.mjs` | Computes the pass rule in section 7 from the suites' `aggregate-result.json` files |
| `build-record.mjs` | Reports the build record in section 6 from a transcript and a working folder |
| `save-token.mjs` | Saves the maintainer's sign-in to the home folder, with hidden input, outside this repository |

## Setup record, 2026-11-06

| Item | Value |
|---|---|
| Base image | `docker.io/library/node@sha256:6449e19d8184d84062525b6a7524def03146c2cb04a7f08b076680d0e8e4240a` |
| Built image | `f7d996f2856d` |
| Node and Python | Node 24.22.1 and Python 3.11.2 |
| Claude Code | 2.1.318, with `DISABLE_AUTOUPDATER=1` |
| Toolkit | Tag `v1.23.0`, commit `eb6bfc3`, exported with LF line endings |
| skill-creator | `ca45fc496a34`, copied from the plugin cache |

**A newer skill-creator was installed on 2026-11-06.** `installed_plugins.json` now marks `2c5958ecac7c`. A comparison found that its `skills/skill-creator/` folder has the same content as the pinned `ca45fc496a34`, so the pin in section 5 stays correct and no arm is affected.

## Harness facts and fixes

Each entry is something the setup found. None changes a brief, a case or the pass rule.

1. **The image lacked three things skill-creator needs.** Its scripts import `yaml`, and its instructions call `python`. The image now installs `python3-yaml` and `python-is-python3`.
2. **The image lacked the Linux sandbox's tools.** It now installs `bubblewrap` and `socat`, and `bwrap` was confirmed to run inside the container.
3. **The plugin cache on Windows holds CRLF line endings.** 17 skill-creator files had them, and the pinned commit should not. The harness rewrites them to LF in the wrapper plugin. It also exports the toolkit with `core.autocrlf=false`, because a CRLF shebang or YAML header could fail on Linux.
4. **The toolkit has one runtime dependency.** The export installs `yaml` with `npm ci --omit=dev` inside the container, so its scripts run on Linux.
5. **Long commands get long Bash timeouts in both arms.** A nested eval or an optimiser run can take much longer than the default Bash timeout, so builds set `BASH_DEFAULT_TIMEOUT_MS` to one hour and `BASH_MAX_TIMEOUT_MS` to 90 minutes. Otherwise the shell could kill an arm's method part way through.
6. **Session files are copied out, not mounted.** Section 5 allows only the working folder and the plugin as mounts. The harness copies `~/.claude` out of a stopped container to count the optimiser's child sessions, and then removes the container.
7. **Each build has a safety stop that the pre-registration does not name.** The harness stops a build when its token estimate passes the stated limit or after three hours. A stopped build is recorded as stopped. The estimate uses list prices from the maintainer's routing reference, dated 2026-07-04.
8. **The toolkit's own gate reports 11 errors on the export.** This is expected, because the export deliberately removes `docs/internal/` and `tests/`. The dry run checks whether a builder is misled by it.
9. **Under `--ablation none`, the vendor scores the firing grader.** One throwaway run on 2026-11-06 reported `fired` as `scored: true`, with a score of 0.4, which is 2 of 5 graders. The true score on the four scored graders was 0.5. Left in, this would have read every calibration baseline at four fifths of its value, and a true 0.75 would have read 0.60 and escaped replacement. The harness therefore removes `fired.md` from its calibration copies of the cases, and the held-out cases themselves do not change. Under `--ablation with-without`, the vendor keeps the grader out of the score, as measured on 2026-11-05, so the scored suites are not affected.
10. **A copied sign-in token can pick up a stray character.** The first saved token held one, and the server refused it with "invalid x-api-key". `save-token.mjs` now strips whitespace and refuses a damaged token.

## Open blocker: nested sessions cannot sign in

The first dry-run build, `dry-toolkit` on 2026-11-06, wrote a skill but could not run its nested `claude plugin eval`. Every run reported "Not logged in", and the build cost about $0.20. The build record correctly reported `methodRan: false`.

- **Cause, measured.** Claude Code removes `CLAUDE_CODE_OAUTH_TOKEN` from its Bash tool's environment, so a session started from Bash has no credential. Setting `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=0` did not change this.
- **Reach, inferred.** skill-creator's optimiser starts `claude -p` the same way, so both arms should be affected. Its build has not been run.
- **What still works, measured.** A `claude plugin eval` started directly by the harness signs in, so the calibration does not depend on this fix.
- **Status.** Moving the token into the container's settings file was refused by the session's safety check, so it was not tried. The maintainer decides the route.

**A second finding from the same build.** The builder ran `rm -rf evals/results` when it finished, so a build can delete the files that `build-record.mjs` counts as proof of a nested eval, along with their spend. The record must also read the transcript before the real run.
