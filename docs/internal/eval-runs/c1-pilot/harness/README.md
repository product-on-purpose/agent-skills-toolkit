# c1-pilot harness - what runs experiment B

This folder holds the scripts that run experiment B, and the record of how its environment was set up. The rules live in [the pre-registration](../../prereg_experiment-b-c1-pilot-20261105.md). Section 8 of that file allows harness faults to be fixed during the dry run, and it requires each fix to be recorded here. Sections 3 and 7 cannot change.

| File | What it does |
|---|---|
| `Containerfile` | Builds the one image that every build and scoring suite uses |
| `harness.mjs` | Exports the plugins, runs builds in containers, and runs the calibration. Its working data goes in the gitignored `_local/c1-pilot/` |
| `score.mjs` | Computes the pass rule in section 7 from the suites' `aggregate-result.json` files |
| `build-record.mjs` | Reports the build record in section 6 from a transcript and a working folder |
| `save-token.mjs` | Saves the maintainer's sign-in to the home folder, with hidden input, outside this repository |
| `leak.mjs` and `leak-tokens.json` | The leak check in section 8 step 8, and the case-specific words it searches for, fixed before any real build (fact 23) |

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

15. **The stored login works for nested sessions.** The maintainer logged in on 2026-11-10. `harness.mjs nested` then ran a `claude plugin eval` from a session started by Bash, and it finished one case in 14 s with no sign-in error (measured).
16. **The safety stop missed nested-eval spend.** Nested evals write no session files, so the watchdog in fact 7 saw only the parent session. In `dry-toolkit-2` it reported $0.39 while the nested evals had spent $2.51 (measured). The watchdog now adds the nested-eval spend from the result files or the transcript, whichever is larger. A nested eval that is still running is counted only when it finishes, and its own `--max-cost-usd` bounds it.
17. **A worktree can run the harness.** On 2026-11-10 the main checkout had been switched to `main` by another session, so the run continued from a worktree of this branch. `C1_LOCAL` points the harness at the main checkout's `_local/c1-pilot/`.

18. **The read-only plugin mount broke skill-creator's optimiser, silently.** skill-creator says to run `python -m scripts.run_loop` from its own folder. Its `run_eval.py` then writes a temporary command file into `.claude/commands/` under that folder, which on a read-only mount raised `[Errno 30] Read-only file system`. All 300 query runs failed, each failure was scored as "not triggered", and recall stayed at 0 % in all five iterations, at 0.0 to 0.1 s each (measured in `dry-skill-creator`). On a normal install that folder is writable, so the fault would have handicapped skill-creator only. Both arms now mount their plugin as an overlay (`:O`): writes go to a throwaway layer, and the plugin on disk never changes (measured). Section 5 of the pre-registration is amended to say so.
19. **The build record passed an optimiser that measured nothing.** It had required only that a `run_loop` command exited without error, so `dry-skill-creator` showed `methodRan: true`. The record now reads the optimiser's output wherever the builder wrote it, counts its "query failed" warnings against its query runs, and requires fewer than half to have failed. Replayed on `dry-skill-creator`, it reports 300 failures in 300 runs and `methodRan: false`.
20. **Two record quirks, not fixed.** `dry-skill-creator` took 112 minutes because the builder's own wait loop ran `pgrep -f scripts.run_loop`, which matched its own command line, until a time limit stopped it. And `final.turns` read 1, because the last result line came from a short continuation after a background notification.
21. **The safety stop could not see the optimiser's trigger queries.** The optimiser kills each trigger query at the first tool call, so its session file keeps the request but never the response's token counts. In `dry-skill-creator-2` the tally saw 4 answered sessions and $0.23, while 300 sessions had each sent a request (measured). Three queries of the same kind, run to the end in the same container, cost $0.044 to $0.074 each (measured, API-equivalent dollars). The tally now prices every session with a request and no saved response at $0.044, the one-request case (medium confidence). Replayed on `dry-skill-creator-2`, the optimiser's children come to $13.43.
22. **The build stop is $25 for the real run.** The maintainer approved raising it from $18 on 2026-11-12, because one skill-creator build measured about $15.70 (fact 21). The maintainer also stated that builds and suites run on a subscription account, so the dollar figures are API-equivalent estimates and not charges. The pre-registration's own ceilings in sections 6 and 10 do not change.
23. **The leak check needed a narrower reading of "token".** Section 8 step 8 defines a token as a word in one case's prompt and nowhere in the briefs. Read that way, with the further limit of four letters and no other prompt, ordinary words such as "dark", "mode" and "because" qualified, and every dry-run build hit dozens of cases (measured 2026-11-12). Those builds never saw a case, so every hit was false. `leak.mjs` therefore also drops any word found in ordinary build text: both arms' plugins and the two working dry-run builds, which carry Claude Code's own system prompt. The tokens left are case-specific names such as `tracking_token`, `user_directory` and personal names. They were fixed once in `leak-tokens.json` before any real build. Checks, all measured: the four dry-run builds give no hits, including the two not used to fix the tokens. A planted copy of one prompt is caught by its verbatim run and its tokens. A planted sentence reusing three names from one case is caught. A clean sentence is not. Thirteen cases have fewer than three tokens, eight of them in brief C, so for them only the file name and verbatim runs can hit.

## Dry-run build results

| Build | Method ran | Build cost | Wall clock | Notes |
|---|---|---|---|---|
| `dry-toolkit` (2026-11-06) | No | About $0.20 | Under 1 min | Nested evals could not sign in (fact 11) |
| `dry-toolkit-2` (2026-11-10) | Yes | $2.88: parent $0.37, nested evals $2.51 | 12.9 min | `askit-build-skill` create, five cases, three nested evals with edits between them. `createOnly: true`, because the builder iterated by hand and never called improve mode. In iteration 1 it rewrote one of its own graders that had failed a correct output |
| `dry-skill-creator` (2026-11-10) | No, by fact 19 | $1.55: parent $1.26, optimiser children $0.30 | 112 min | A benchmark of five cases with and without the skill. The optimiser ran five iterations, but every query failed on the read-only mount (fact 18), so the cost of a working optimiser is not measured |
| `dry-skill-creator-2` (2026-11-10) | Yes | About $15.70: parent $2.25, optimiser children about $13.43 by fact 21 | 23 min | Two benchmark iterations. The optimiser ran five iterations of 60 query runs with 0 failures, about 32 s per training pass. Recall was 0 % to 11 %, so the description rarely triggered, and the best description came from iteration 1. The build record at run time showed $2.48, before fact 21 |

## Dry-run checks from section 8, as of 2026-11-10

| Check | State |
|---|---|
| The sign-in works | Yes for both routes, measured: the token for scoring, and the stored login for builds |
| Nested `claude plugin eval` works inside a build | Yes with the stored login, measured in `dry-toolkit-2`: three nested evals finished |
| `--ablation none` works | Yes, measured on 2026-11-06 (fact 9) |
| The toolkit's commands work outside its repository | Yes, measured: `harness.mjs probe` from a shell, and `askit-build-skill` plus `evaluate.mjs` inside `dry-toolkit-2` |
| The optimiser reports real triggering | Yes in `dry-skill-creator-2`, measured: 300 query runs, 0 failures, recall up to 11 %. No in `dry-skill-creator` (fact 18) |
| A build cannot read the maintainer's configuration or this repository | Yes from a shell, measured with `harness.mjs probe`, rerun with the overlay mount on 2026-11-10 |

## What the dry run implies for the real run

These are estimates for the maintainer's second go, not rules.

- **A skill-creator build costs about $15, and nearly all of it is uncapped.** `--max-budget-usd 15` caps only the parent session, which spent $2.25. The optimiser's children spent about $13.43 outside every cap. Three skill-creator builds would cost about $45 (low confidence, from one dry run).
- **A toolkit build cost $2.88,** of which $2.51 was nested evals, each capped by its own `--max-cost-usd`. Three toolkit builds would cost about $9 to $30 (low confidence), depending on how many evals each builder runs.
- **The harness stop is now $25** (fact 22), and it sees the optimiser's children (fact 21). A stopped build is recorded as stopped and submits what it has, per section 10.
- **The dollars are API-equivalent estimates.** Builds sign in with the maintainer's subscription login, so whether any of this is charged is not known.
