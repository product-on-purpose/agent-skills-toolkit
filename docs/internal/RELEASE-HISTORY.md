# Release history - the linear story

> The narrative companion to the dense, accretive [`STATUS.md`](STATUS.md) and the terse [`CHANGELOG.md`](../../CHANGELOG.md). Read this top to bottom to recover **what shipped, in what order, and why it mattered** - in both engineer and non-engineer terms. Each release here is also a curated user-facing entry in [`RELEASE-NOTES.md`](../../RELEASE-NOTES.md); this file adds the through-line between them.
>
> Maintenance: append one block per release at the end, keep it to the value story (not the full changelog), and update "Where we are now" + "What's next".

## The one-paragraph version

The toolkit is a quality bar for AI skill libraries: it grades a plugin Bronze, Silver, or Gold against a written Standard, using a deterministic, model-free gate. It went public and installable at **v1.0.0**, hardened its own docs and gate through **v1.1-v1.4**, then turned outward at **v1.5.x** - learning to grade plugins it does not own, and improving itself from what those real plugins revealed. Today it is **v1.5.2**, self-grading Gold on every build, with a recorded feedback loop driving its improvements.

## The timeline at a glance

| Version | Date | The headline | Spine / Standard |
| --- | --- | --- | --- |
| v1.0.0 | 2026-06-02 | First Gold-tagged, installable release | 25 / 0.9 |
| v1.1.0 | 2026-06-03 | Docs build-out + a real docs site (added G7-G10, U12) | 30 / 0.10 |
| v1.2.0 | 2026-06-06 | Retired the house dash-rule from the Standard | 29 / 0.11 |
| v1.3.0 | 2026-06-06 | Gate evolution: configurable grading + version-awareness | 29 / 0.11 |
| v1.4.0-1.4.1 | 2026-06-09 | Designed evaluation reports (HTML + Markdown) | 29 / 0.11 |
| v1.5.0 | 2026-06-09 | Outward grading: grade plugins you do not own | 29 / 0.11 |
| v1.5.1 | 2026-06-10 | Fewer false alarms on well-built third-party plugins | 29 / 0.11 |
| v1.5.2 | 2026-06-12 | The eval-run patch: calibrations driven by recorded evidence | 29 / 0.11 |

("Spine" = the number of checks the gate runs. "Standard" = the version of the written specification. They have been stable at 29 / 0.11 since v1.2.0 - recent releases changed *how* the gate grades and *what it can do*, not *what the Standard requires*.)

## The story, release by release

### v1.0.0 - it became real (2026-06-02)
**What:** the first Gold-tagged, marketplace-installable release. The README was repositioned around the plugin lifecycle (start / grow / govern / level up).
**Value, plainly:** the project stopped being an internal experiment and became a thing you can install and use. It also held itself to its own top grade from day one.
**Value, for engineers:** `tier: advanced` declared, the full Gold gate (G1-G7 at the time) green and non-vacuous, install resolution smoke-verified through the marketplace.

### v1.1.0 - it documented itself, properly (2026-06-03)
**What:** a staged documentation build-out that also grew the gate. Four new Gold checks (frontmatter, folder READMEs, source docblocks, docs presence) plus a Mermaid-diagram validity check, and a real generated docs site.
**Value, plainly:** a quality tool that was itself badly documented would not be credible. Now the docs are first-class and the site is live.
**Value, for engineers:** spine 25 -> 30, Standard -> 0.10; the site is a generated view of `docs/**`, guarded in CI for broken links and route parity.

### v1.2.0 - it separated taste from law (2026-06-06)
**What:** retired the "no em-dashes" rule from the Standard itself, keeping it as an opt-in hook.
**Value, plainly:** a personal style preference should not be a portable quality requirement other people are graded on. This drew the line.
**Value, for engineers:** spine 30 -> 29, Standard -> 0.11 (stable since); the dash rule survives as a shipped opt-in hook, not a spine check.

### v1.3.0 - the gate grew up (2026-06-06)
**What:** two big internal upgrades. The gate became **version-aware** (it knows which Standard a plugin pinned and softens newer rules accordingly) and **configurable** (per-rule severity, named grading profiles, a suppressions baseline, a provenance tag on every check, and a trust clamp for published verdicts).
**Value, plainly:** real teams need to say "this rule does not apply to us, here is why" without forking the tool, and a plugin should not be punished by rules that did not exist when it was written. This made the gate fair to the real world.
**Value, for engineers:** the `provenance` taxonomy (objective / vendor-cited / house) and the profile machinery here are what made everything in v1.5.x possible. No spine or Standard change.

### v1.4.0-v1.4.1 - it produced reports people can read (2026-06-09)
**What:** one renderer turns the gate's result into a self-contained HTML page or a Markdown twin, in five report types (conformance, migration, release, review, behavioral).
**Value, plainly:** a grade buried in terminal output helps no one. Now a non-engineer gets a designed page and a reviewer gets clean Markdown - from the same underlying result, so they cannot disagree.
**Value, for engineers:** a pure projection over the one report object; the optional AI advisory layer is allowlist-merged so it structurally cannot move the grade. v1.4.1 hardened the untrusted-advisory path.

### v1.5.0 - it turned outward (2026-06-09)
**What:** the gate learned to grade plugins the toolkit does not own. A `--profile plain-plugin` flag grades a third-party plugin on portable correctness only, without imposing the toolkit's house conventions or writing config into someone else's repo.
**Value, plainly:** pointed at a stranger's plugin, the tool used to bury the one real defect under a wall of "you are missing our scaffolding." Now you get a short, credible list of real issues. This is the moment the tool became useful on other people's work.
**Value, for engineers:** the `--profile` flag plus reclassifying two checks as house-only (ADR 0029); pointed at Anthropic's own skills, findings dropped from 23 to 1 (a real defect). The first corpus run started here.

### v1.5.1 - it stopped crying wolf (2026-06-10)
**What:** a calibration patch from grading the official Anthropic set and four community marketplaces. Several checks were tuned so that example links in code, managed connectors, display-label names, and template diagrams stopped being flagged as real defects.
**Value, plainly:** a checker that flags good work as broken trains people to ignore it. These fixes mean a warning is worth reading again. Also shipped: a verified competitive comparison and an honest token-cost reference.
**Value, for engineers:** ADRs 0030/0031/0032 (U6/U11/U3/U4/U12 calibrations); on the hardest corpus, false errors dropped 43 -> 12 with the genuine defect still caught.

### v1.5.2 - it started learning on the record (2026-06-12)
**What:** the first release where **every change came out of a recorded evaluation-run loop**. The toolkit grades real plugins, records what each run reveals about the *grader* (not just the target), verifies surprises by hand, and turns confirmed lessons into tested fixes. This release: the description-quality scorer recalibrated against five real corpora (it now grades descriptions, not vocabulary), the `--profile` flag fixed so it actually works on single skills, and four self-docs corrected to match reality.
**Value, plainly:** this is the tool proving it gets better in a disciplined way, not a vibes way. Good descriptions stopped collecting nuisance warnings (measured: 98 such warnings down to 18 across five libraries), and a setting that silently did nothing now does what it says.
**Value, for engineers:** ADR 0033 (U5 recalibration) + ADR 0034 (component-scope config resolution); the eval-run record, methodology, and measured token dossier; 401 tests, gate Advanced 0/0. The through-line - observe a surprise, verify it against ground truth, then calibrate behind a test - is documented publicly at [`explanation/validation-and-improvement`](../explanation/validation-and-improvement.md).

## The connecting thread (v1.5.x)
The recent arc is one idea executed in steps: **a quality tool earns trust by grading the real world and improving from it, under a discipline that verifies before it changes anything.** v1.5.0 made outward grading possible; v1.5.1 and v1.5.2 are the improvements that grading the real world surfaced. The recorded loop (eleven advisory runs, seventeen sensor readings to date) is the engine, and it is now self-documenting.

## Where we are now
- **main `fdc1284`**, version **1.5.2**, Standard **0.11**, **29-check spine**, **401 tests**, gate **Advanced 0/0**. Self-grading Gold on every CI build; installable from the `product-on-purpose` marketplace.

## What's next, and why (the roadmap, in priority order)
1. **Manifest-vs-disk drift check (the v1.6.0 headline).** Catch a plugin that ships more skills on disk than its manifest registers, so installers silently never receive the newest ones (a real case: deanpeters ships 49, registers 47). *Why:* it is a silent delivery failure no current check catches, and it needs no judgment - pure counting. It is a spine change, so it gets a deciding ADR first (new numbered check vs non-spine validator).
2. **A dependable eval-run pipeline.** Make the grade-record-improve loop reproducible end to end (pinned targets, a deterministic runner, a recorded dispatch contract). *Why:* the loop has proven its value but every run is still hand-orchestrated; this multiplies everything after it.
3. **Measure advisory quality, not just cost.** Build fixture plugins with known planted issues and a scoring key, so the AI review layer gets a real precision/recall number per model and effort. *Why:* today we measure what a review costs but only narrate how good it is.
4. **Report glossary + the missing Bronze reference page + a fuller responsive pass.** *Why:* readers cannot tell what a check examines without leaving the report, and the rubric documents Silver and Gold but not Universal.
5. **Carried:** authoring token measurements, a marketplace-scope evaluation mode, corpus batch 3, a Gemini emitter, and the competitive gap-analysis backlog.
