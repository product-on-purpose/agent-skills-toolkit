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

11. **Nested sessions could not sign in with the token.** The first dry-run build, `dry-toolkit` on 2026-11-06, wrote a skill but every nested `claude plugin eval` reported "Not logged in". The build cost about $0.20, and its record correctly reported `methodRan: false`. Claude Code removes `CLAUDE_CODE_OAUTH_TOKEN` from its Bash tool's environment, so a session started from Bash has no credential (measured). Setting `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=0` did not change this (measured). skill-creator's optimiser starts `claude -p` the same way, so both arms would be affected (inferred). Moving the token into the container's settings file was refused by the session's safety check, so it was not tried.
12. **Builds now sign in from a stored login.** The maintainer ruled on 2026-11-06 for a normal `claude auth login` inside the container, stored in the podman volume `c1-pilot-login`. Before every build, `resetLogin` deletes everything in the volume except the login, and it trims `.claude.json` to its account fields, because that file also records per-folder history. So no build sees another build's files. **This is a third mount, which section 5 does not list.** Section 5 says a build mounts only its working folder and its plugin, and that the maintainer provides the sign-in at run time. The volume is that sign-in and holds nothing else, so it carries no personal configuration, but the report should name it. Scoring suites still use the token, which signs in when the harness starts `claude plugin eval` directly. **Status on 2026-11-08: the login has not been done yet, so this route is untested.** `node harness.mjs nested` is the few-cent check that a session started from Bash can sign in and run an eval.
13. **The login wrote one file outside the volume.** Without `CLAUDE_CONFIG_DIR`, Claude Code writes `.claude.json` to `/home/node/`, outside the mounted folder, and `--rm` deletes it with the container (measured 2026-11-08). Every container that uses the volume now sets `CLAUDE_CONFIG_DIR=/home/node/.claude`, which keeps the file inside it.
14. **A builder can delete its own proof.** The `dry-toolkit` builder ran `rm -rf evals/results` when it finished. That removed the files `build-record.mjs` counted as proof of a nested eval, along with their spend. The record now also reads each nested eval's summary line from the transcript, and it does not count a run that failed to sign in or stopped part way.

## Dry-run checks from section 8, as of 2026-11-08

| Check | State |
|---|---|
| The sign-in works | Yes for the token route, measured. The stored-login route waits for the maintainer's login |
| Nested `claude plugin eval` works inside a build | No with the token, measured. Untested with the stored login |
| `--ablation none` works | Yes, measured on 2026-11-06 (fact 9) |
| The toolkit's commands work outside its repository | Yes from a shell, measured with `harness.mjs probe`. The builder ran `askit-build-skill` create in `dry-toolkit` |
| The optimiser reports real triggering | Not run. The skill-creator dry run waits for the stored login |
| A build cannot read the maintainer's configuration or this repository | Yes from a shell, measured with `harness.mjs probe` |
