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
