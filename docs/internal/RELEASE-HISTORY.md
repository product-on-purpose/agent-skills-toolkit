# Release history - the linear story

> The narrative companion to the dense, accretive [`STATUS.md`](STATUS.md) and the terse [`CHANGELOG.md`](../../CHANGELOG.md). Read this top to bottom to recover **what shipped, in what order, and why it mattered** - in both engineer and non-engineer terms. Each release here is also a curated user-facing entry in [`RELEASE-NOTES.md`](../../RELEASE-NOTES.md); this file adds the through-line between them.
>
> Maintenance: append one block per release at the end, keep it to the value story (not the full changelog), and update "Where we are now" + "What's next".

## The one-paragraph version

The toolkit is a quality bar for AI skill libraries: it grades a plugin Bronze, Silver, or Gold against a written Standard, using a deterministic, model-free gate. It went public and installable at **v1.0.0**, hardened its own docs and gate through **v1.1-v1.4**, then turned outward at **v1.5.x** - learning to grade plugins it does not own, and improving itself from what those real plugins revealed. At **v1.6.0** it grew the Standard for the first time since v0.11 - adding a check that catches plugins shipping skills they never registered (invisible to installers) - and at **v1.6.1** it paid the price of turning outward, correcting the false alarms and the misleading output that grading five real repositories exposed. **v1.7.0** made its own front page true and guarded it, and **v1.8.0** turned thirteen scaffolders into teachers while making the AI review layer measurable. Throughout, it self-grades Gold on every build, with a recorded feedback loop driving its improvements.

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
| v1.6.0 | 2026-06-14 | Manifest completeness: the Standard's first growth since v0.11 (added U13) | 30 / 0.12 |
| v1.6.1 | 2026-07-25 | The trust patch: stop crying wolf on valid diagrams; make the verdict legible | 30 / 0.12 |
| v1.7.0 | 2026-07-26 | Trust and craft: the front page made true and guarded, a craft reviewer, a repeatable eval loop | 30 / 0.12 |
| v1.8.0 | 2026-07-26 | Deep builders, measured advisory: examples for every builder, a scored AI-review harness | 30 / 0.12 |

("Spine" = the number of checks the gate runs. "Standard" = the version of the written specification. They were stable at 29 / 0.11 from v1.2.0 through v1.5.x; **v1.6.0 grew them to 30 / 0.12** - the first new requirement since v1.1.0, shipped under a warn-first burndown so no existing plugin newly fails.)

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

### v1.6.0 - the Standard grew, carefully (2026-06-14)
**What:** the **first growth of the Standard since v0.11**. A new Universal check, **U13 (`skill-registration`)**, catches a plugin that ships a skill on disk it never registered in its catalog - a skill that is delivered but invisible to anyone installing it (a real library we graded ships 49 skills and lists 47). The same release made grades **actionable**: every report now carries a per-check glossary explaining what each check verifies, and the foundational Bronze checks finally have the reference page the higher tiers already had.
**Value, plainly:** the tool now catches a real, common publishing mistake that no check caught before - and it grew its own rulebook to do so **without breaking anyone**. The new rule arrives as a warning for one version (a free migration window) before it can ever fail a build, and a plugin pinned to the old Standard keeps grading exactly as before.
**Value, for engineers:** ADR 0035 (U13 as a new Universal spine check); spine 29 -> 30, Standard 0.11 -> 0.12 - the first live exercise of the warn-for-one-minor burndown the v1.3.0 standard-aware gate built. The check is objective and portable (it survives `--profile plain-plugin`) and distinct from `U8` (generated-manifest drift). The report glossary is sourced from static metadata (zero model tokens), and the new `docs/reference/universal-checks.md` completes the tier rubric. 418 tests, gate Advanced 0/0; both halves shipped behind clean adversarial reviews. The deferred half of the release plan (a reproducible eval-run pipeline, advisory-quality measurement, authoring-cost measurement) lands as continuous supporting work.

### v1.6.1 - the trust patch (2026-07-25)
**What:** the toolkit was pointed at five real plugin repositories it had never graded, and every finding was checked by hand. It found roughly fifty genuinely broken things - and it also cried wolf. **Eleven of the fourteen diagram errors it reported across those five repositories were its own fault.** This release fixes the crying wolf, and fixes an output layer that had misled three independent readers in a single day.
**Value, plainly:** a tool that grades other people's work has exactly one asset, which is being right. When it fails a valid diagram, or prints a wall of red above a line reading "0 errors", it spends trust it has not earned. Both are corrected, measurably: the false diagram errors are gone and the real ones remain, template placeholder links are no longer counted as broken links, informational findings now say plainly that they cannot affect your grade, and a plugin pinned to an older Standard is told how much latent debt that pin is hiding (one repository we graded was hiding 122 findings behind a clean verdict).
**Value, for engineers:** ADR 0036. `U12`'s bracket walk is now aware that Mermaid runs a different grammar per diagram type: `sequenceDiagram` async arrows (`-)`, `--)`) and `erDiagram` cardinality (`||--o{` and family) are grammar, not delimiters. The allowance is scoped by diagram type and applied rescue-only (a closer is skipped only when the stack is already empty), which preserves the one-directional-safety invariant ADR 0032 established: no previously-passing diagram can newly fail. `U6` skips link targets carrying a substitution token, answering the open "what marks template intent" question with the token at the point of use rather than a filename convention or a frontmatter flag a third-party plugin would have to adopt. Verified against the audit corpus: pm-skills 56 -> 43 errors, pm-skills-mcp 18 -> 14, portfolio `U12` 14 -> 3 - landing exactly on the counts the audit had hand-verified independently, before the fix existed. 418 -> **442 tests**, including four guards proving the calibration does not leak outside the diagram type that owns it. No Standard implication: spine 30, Standard 0.12, both checks keep `objective` provenance.

### v1.7.0 - trust and craft (2026-07-26)
**What:** the first release of the four-release uplift program, and two kinds of work at once. Half of it makes what the toolkit says about itself actually true: the README advertised a version three releases old and a check count that was wrong, so both were corrected and a CI assertion now fails the build if they ever disagree again. The other half teaches the toolkit to judge quality rather than only conformance: the skill builder gained an optional craft review, and the loop for grading real third-party libraries became a command instead of a hand procedure.
**Value, plainly:** a quality tool that misreports its own version has a credibility problem before it grades anything, and that class of drift is now mechanically impossible rather than merely discouraged. Beyond that, passing the gate has always meant "well-formed", never "good"; the craft pass is the first thing that addresses the second question, and it is built so it can never be confused with the first - it is only offered on a clean gate, it applies only a closed list of mechanical fixes and only with consent, and it cannot move your grade.
**Value, for engineers:** ADR 0037 (the craft pass and its SAFE/JUDGMENT partition, a closed allowlist that fails toward "do not touch"). Backlog E11 lands as `npm run eval-run`, a pinned-corpus runner that refuses a drifted, empty, or dirty tree before grading and reaches the gate only through the `npm run check` seam, so a future checker relocation costs it a script definition rather than a rewrite. `U12`/`U13` render `N/A` instead of `PASS` when vacuous, with the false-FAIL direction tested. CI gains Dependabot, a Node `[22.12.0, 24]` matrix, a blocking `npm audit`, SHA-pinned third-party actions, and CodeQL - which found two genuine high-severity escaping defects on its first day, both fixed with tests that fail against the old code. 442 -> **516 tests**; spine 30 and Standard 0.12 unchanged.

### v1.8.0 - the builders learned to teach (2026-07-26)
**What:** the second release of the uplift program, and the one that closes the gap the value assessment named as the largest unvalidated surface. Thirteen builder skills existed to draft components, and between all of them shipped **not one working example**. Now every builder has them: 25 examples, 7 runnable artifacts, all executed during review. The four hardest also got real craft guides in place of 22-to-41-line stubs. Alongside that, the optional AI review layer became measurable: a plugin carrying nine known flaws and three deliberate traps, plus a scorer that grades a review against it.
**Value, plainly:** a scaffolder hands you an empty shape; a teacher shows you a good one and a bad one and says why. That was the difference between what the builders claimed and what they did. On the review side, "the cheaper model seemed about as good" was an impression nobody could check. Now it is a number, and the scoring rule is the interesting part: a confident wrong answer counts as both a false alarm and a miss, so it scores worse than saying nothing at all. Hedging is cheap; inventing is expensive. That is the incentive the recorded evidence says a reviewer needs.
**Value, for engineers:** SP2a and SP2b (craft docs plus 3 golden and 1 anti per complex builder, 1 golden for the rest; both defective templates fixed, the MCP one preserved as its own anti-example). F3 R-AQ-1 and R-AQ-2 (the seeded-defect fixture, gate-clean so it measures the judgment layer and not the gate, plus `advisory-score.mjs`, which dispatches no model and is reproducible to a byte). F5 moved the authoring rows to MEASURED with four caveats printed beside them. Corpus batch 3 graded four new libraries and produced readings 18 to 25, including the finding that `U5` is mathematically unpassable in French. **ADR 0038** fixed a false PASS: the report invented a declared tier from the earned one, so an undeclared plugin was told it "declares Gold". 516 -> **561 tests**; spine 30 and Standard 0.12 unchanged.

## Where we are now
- Version **1.8.0**, Standard **0.12**, **30-check spine**, **561 tests**, gate **Advanced 0/0**. Self-grading Gold on every CI build; installable from the `product-on-purpose` marketplace.

## What's next, and why (the roadmap, in priority order)
The v1.6.0 headline (the manifest-vs-disk drift check) and the report glossary + Bronze reference page both shipped above. The remaining v1.6.0-program work lands as continuous supporting effort:
1. **A dependable eval-run pipeline (F2).** Make the grade-record-improve loop reproducible end to end (pinned targets, a deterministic runner, a recorded dispatch contract). *Why:* the loop has proven its value but every run is still hand-orchestrated; this multiplies everything after it. Build it right before the next corpus batch so it is exercised immediately.
2. **Measure advisory quality, not just cost (F3).** Build fixture plugins with known planted issues and a scoring key, so the AI review layer gets a real precision/recall number per model and effort, and replicate the model triple on a defect-rich target. *Why:* today we measure what a review costs but only narrate how good it is.
3. **Authoring token measurements (F5).** Fill the token dossier's last unmeasured range by measuring real `askit-build-*` runs. *Why:* a builder should be able to budget an authoring run.
4. **Carried:** a marketplace-scope evaluation mode (the likely next headline - the gate has plugin and component scopes only), corpus batch 3, a Gemini emitter, and the competitive gap-analysis backlog (E4-E10).
