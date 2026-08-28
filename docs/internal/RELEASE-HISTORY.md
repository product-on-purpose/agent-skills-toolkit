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
| v1.9.0 | 2026-07-27 | Standards watch and the decisions discipline: catching rules that are only half-applied | 30 / 0.12 |
| v1.10.0 | 2026-08-07 | The grader got graded: `critique-skills` found three defects self-validation never surfaced | 30 / 0.12 |
| v1.10.1 | 2026-08-11 | The trust patch: making the repository's own claims true again | 30 / 0.12 |
| v1.11.0 | 2026-08-12 | Reach: the grade becomes runnable, machine-readable and visible outside this repo | 30 / 0.12 |
| v1.11.1 | 2026-08-12 | The shell that was not there: publishing was impossible from the default Windows shell | 30 / 0.12 |
| v1.12.0 | 2026-08-12 | Marketplace scope: grading a catalogue, not one plugin at a time | 30 / 0.12 |
| v1.12.1 | 2026-08-12 | The round that reviewed the fixes: four defects found in the previous round's fix code | 30 / 0.12 |
| v1.13.0 | 2026-08-13 | The contract you adopted: one post-resolution ceiling over `since` and `until`, config provenance, and two graduations that could not previously fire | 31 / 0.13 |
| v1.14.0 | 2026-08-16 | Four things the gate was telling you were not true, and three files it was never reading | 34 / 0.14 |
| v1.15.0 | 2026-08-18 | Two migration windows close on schedule, one because its subject did the work | 34 / 0.15 |
| v1.16.0 | 2026-08-22 | The evidence gets an address, and some of it was resting on nothing | 34 / 0.15 |
| v1.16.1 | 2026-08-24 | Gold was unreachable for anyone who did not vendor the gate | 34 / 0.15 |
| v1.16.2 | 2026-08-25 | The reusable Action failed for every consumer before it graded anything | 34 / 0.15 |
| v1.16.3 | 2026-08-25 | The Action documented a pin the toolkit itself had moved off | 34 / 0.15 |
| v1.17.0 | 2026-08-28 | A tag reaches npm through an approval, and shipped records stop being rewritten | 34 / 0.15 |

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

### v1.9.0 - catching the half-applied rule (2026-07-27)
**What:** two governance capabilities aimed at one failure mode. Outward, `askit-standards-watch` discharges an obligation the Standard had stated and never implemented: section 6 says that where agentskills.io evolves the Universal tier MUST track it, and nothing did, because no upstream version was pinned anywhere. Inward, every decision record now names the exact files and functions that carry it.
**Value, plainly:** the toolkit grades other people against a written standard, so it has to know when that standard's own foundation moves. It now does, and it is candid about the limit: it can tell you reliably that something changed and where, and it refuses to judge whether a prose change matters, because that is a person's call. The inward half addresses something more embarrassing and more common: three bugs in two days all came from a rule being written down, applied in one place, and forgotten in the second place that needed it.
**Value, for engineers:** the pin unit is a git blob SHA-1 per normative artifact, chosen because the upstream publishes no tags or releases and its HEAD moves on unrelated commits while the spec file sat unchanged for two months. The watcher imports only `readFileSync`, writes exclusively to stdout, and a test fails the build if any write API or `child_process` appears. **The decisions discipline found a real gap on its first application** - run against ADR 0038, written the day before, it surfaced four HTML render sites that fix had missed. And CodeQL caught the same escaping defect a fourth and fifth time in new code, so the three copies were collapsed into one shared primitive. 561 -> **601 tests**; spine 30 and Standard 0.12 unchanged.

### v1.10.0 - the grader got graded (2026-08-07)
**What:** `critique-skills`, the first plugin built against this Standard from scratch rather than retrofitted to it, put the toolkit on the receiving end of its own gate for the first time - and being graded found three defects self-validation had never surfaced. The required `agents/` folder README was silently registering as a phantom subagent with no name and no description, because Claude Code loads every markdown file in that folder as a subagent definition; established empirically, by loading a probe plugin and asking a running Claude Code to enumerate its subagents. The generator that writes every plugin's `INDEX.md` carried two sections of fixed text describing this toolkit's own files, emitted verbatim into other people's repositories - a failure that hid itself, because the drift check compared each index against the same generator that wrote it, so wrong-but-consistent passed forever and a plugin that corrected its own index was then reported as drifted for being right. And the grader's ignore-list covered the Node ecosystem only, so it walked into Python bytecode caches on a Python-bearing plugin and reported them as missing documentation - findings the plugin could take no action on. Alongside the fixes, two new public pages state boundaries: one collecting, with evidence, what the toolkit cannot do; one on the working practice for running more than one plugin. And **ADR 0039 (marketplace-scope evaluation)** landed Proposed, settling how a future catalogue-grading capability would resolve which tree it grades, how members aggregate, and whether it becomes a spine check; it was ratified Accepted on 2026-08-10.
**Value, plainly:** a quality tool that has only ever graded itself and its own house style can hide defects that only show up when a stranger relies on it. `critique-skills` was that stranger, and what it found was not a matter of taste - a phantom subagent, a wrong index, and false findings on a Python project are real defects that ship to real users. The lesson worth keeping is in the toolkit's own history: this exact agents-folder bug happened once before and was "fixed" by teaching *our* tooling to ignore the file, which corrected our idea of what an agent is and left the runtime's idea untouched. The runtime is the one that ships.
**Value, for engineers:** `agents/` is removed from `FIXED_ROOTS`, joining the repo root and `templates/seed-plugin` as documented exclusions, and this repo's own `agents/README.md` is deleted; the change removes a requirement without adding a prohibition, so a plugin still carrying the file mid-migration is not newly failed. `gen-index`'s two boilerplate sections are now row tables filtered by `existsSync` against the plugin root, byte-identical for a plugin that ships every artifact. The shared `SKIP_DIRS` set (`scripts/lib/fs-utils.mjs`) gains `__pycache__`, `.pytest_cache`, `.mypy_cache`, `.ruff_cache`, `.tox`, `.venv`, and `venv`, grouped by category so the next ecosystem gap is visible rather than latent. New public pages: [`explanation/limitations`](../explanation/limitations.md) and [`how-to/manage-multiple-plugins`](../how-to/manage-multiple-plugins.md). Spine stayed 30 checks, Standard stayed v0.12, **612 tests**.

### v1.10.1 - the trust patch (2026-08-11)
**What:** no new capability, no new check, and no Standard movement - nothing a third party is graded by moves here. This release's job is making the repository's own claims true again, and it converts three of those claims from things a person has to remember into things a machine checks. Two fixes had merged but never shipped, and consumers were already affected by their absence: v1.10.0's index-generator fix put every consuming plugin with a previously-generated index into **`G4` (generated-docs drift)**, and nothing told them, because that release shipped without the upgrade section every other recent one carried; and the `G4` remediation instructions told consumers to run a command they do not have, since nothing installs the generators into a consuming plugin and the marketplace member currently failing over `G4` has no generators directory at all. A documented caveat became a fixed defect: on Windows, a backslash path was silently read as a different directory, so the gate could report a clean pass having graded nothing - written down twice before and left uncorrected, argv paths are now normalized at every command-line entry point, with a Windows CI job keeping it honest. A records-versus-reality drift turned out to be five disagreements, not two: `library.json` and component frontmatter disagreed on version numbers, and the two-component finding that entered the release was only what the previous pull request happened to touch - checking all 33 registered components found five, in both directions. The upstream spec moved, and the toolkit's own watcher caught it pointing at yesterday's work: the agentskills.io `metadata` field constraint tightened to a map of string keys to string values, while the `metadata.chain` field introduced one day earlier is a nested list. And the repository's own trust surface was contradicting reality: `docs/internal/STATUS.md` called itself the single live source of truth while carrying its own indictment from a July reconciliation that had already found four roadmap rows describing shipped work as open, concluding "a roadmap is a document asserting facts about a repo, and nothing was checking it."
**Value, plainly:** none of this moves what a third party is graded by; it is the toolkit keeping its own paperwork honest. A fix that is merged but unreleased helps nobody, which is why the two carried-over `G4` problems mattered enough to cut a release for. The Windows path bug is the sharper lesson: a caveat written down twice and left as prose is not a fix, it is a defect waiting for someone on Windows to trust a clean pass that graded nothing. And a status document that calls itself the single source of truth while being visibly wrong is worse than no status document at all - it is corrected here, and the version-drift fix is backed by a test now, so the next person does not have to remember to check by hand.
**Value, for engineers:** the Windows fix is deliberately platform-guarded rather than applied everywhere - on Linux and macOS a backslash is a legal filename character, so normalizing it unconditionally would trade one platform's defect for the other's. The `library.json`-versus-frontmatter fix ships with a test that fails the build on any future disagreement; whether the **`S8` (components-mirror)** check should require this of every plugin, not just this one, moves third-party verdicts, so it is filed as a backlog item rather than decided in a patch. On the spec drift: all 24 skills were re-run through the reference validator and all 24 pass, so the toolkit conforms to the implementation the Standard names as definitive, and the prose tightening is a leading indicator rather than a live break; it is recorded as a Proposed decision record with the pin deliberately left unmoved, because the watcher proposes and a re-pin lands beside the decision that motivated it. `docs/internal/STATUS.md` is rewritten from 151 lines of accretive log to 104 lines of current state. Spine stayed 30 checks, Standard stayed v0.12.

### v1.11.0 - reach (2026-08-12)
**What:** the release that stopped the grade being an internal discipline. The gate became an npm package with an npx-runnable binary, so a stranger can grade a plugin in one command without cloning anything. It gained machine-readable output that other systems consume rather than re-parse: `--json`, SARIF 2.1.0 carrying each finding's provenance as a rule property (so a consumer can filter to the portable, objective failures alone), and GitHub Actions annotations that land findings inline on a pull-request diff. A published composite Action wraps it, and a CI-generated, sha-pinned tier badge replaced the hand-maintained README claim that had drifted before. Underneath, a validator-parity harness started running the *other side's* validators on every push - `claude plugin validate --strict` and the agentskills.io reference validator - and, crucially, round-tripping every skill's `metadata:` block through the reference **parser** rather than trusting its exit code, because the incident that motivated it had the validator reporting "Valid skill" for all 24 skills while a value was being silently rewritten.
**Value, plainly:** nine releases in, the toolkit produced an excellent grade that was consumed nowhere outside its own repository. This is the release where that changed: install it, run it, see the result on a pull request, and see the badge on the front page reflect a real commit rather than a memory.
**Value, for engineers:** the `files` allowlist was derived from the real import closure rather than guessed, and four modules that read paths relative to *this* repository were deliberately excluded rather than shipped half-working inside someone else's `node_modules`. Trust roots moved out of the artifacts they protect: deployment branch policies live on the GitHub environments, because a branch copy can edit any control that lives inside a workflow. SARIF emits a `region` only when a finding actually carries a line number - inventing `startLine: 1` to fill the field would be fabricating evidence, which is the one thing this gate exists not to do. Spine stayed 30, Standard stayed v0.12.

### v1.11.1 - the shell that was not there (2026-08-12)
**What:** one fix, found by a maintainer running v1.11.0's own published publishing instructions and hitting a wall no CI run could reach. A test shelled out to `bash` resolved through `PATH`; from PowerShell on a machine with WSL installed, that is the WSL launcher, which does not inherit Windows environment variables. The variable the test carefully set vanished crossing the boundary, the script died before producing output, and because `prepublishOnly` runs the suite, **`npm publish` was impossible from the default shell on Windows**. The gate was refusing to publish a package that was itself fine, and the seven failures it reported read as a grading disagreement rather than a shell problem.
**Value, plainly:** a publishing instruction that cannot be followed on the platform the maintainer actually uses is not an instruction. This is the repository's own rule - run what you publish from the position of the person you published it for - applied to itself and paying out immediately.
**Value, for engineers:** the first fix rejected WSL by matching the path string, and pre-release review broke it within one round: on that machine a `bash.exe` on `PATH` is a symlink to `wsl.exe` and contains none of the names being matched. A denylist of known-bad paths is unbounded and permanently one alias behind, because the path was only ever a proxy for the property that matters. The resolver now tests that property directly - each candidate must echo back a randomly-named environment variable **and** write a randomly-named token to a given path, with `WSLENV` stripped, inside a bounded timeout. The guarantee is stated at exactly that strength and no further, because two earlier attempts to state it were broken by review. Spine stayed 30, Standard stayed v0.12.

### v1.12.0 - marketplace scope (2026-08-12)
**What:** the gate learned to grade a **catalogue**. Until now it had two scopes - one plugin, or one skill - so a marketplace of six plugins was graded by a person running the gate six times, and everything that exists only *between* members was invisible: two members shipping the same skill name, a catalogue entry that resolves to nothing, a registry version that disagrees with the member's own manifest. Marketplace scope grades every member at **its own** declared tier and **its own** Standard pin and reds the collection if any member fails **its own** claim. It ships with a collection report as the sixth report type, support for three new source kinds (`npm`, `archive` with a required `sha256`, `git-subdir`) and the `renames` field, a reading that flags plugin-shipped agents declaring fields Claude Code refuses, and the first public page that grades a whole portfolio at once. Alongside it, the validator-parity harness flipped from report-only to gating, discharging the condition its own decision record set.
**Value, plainly:** a catalogue can show six green grades and still be broken as a catalogue. The first run of this against the family marketplace reported it **red**, for two different reasons that are both real: one member declares Gold and earns Silver, and another declares no tier at all. That is the scope working. The report says so on its own front page rather than being quietly tuned until the number looked better.
**Value, for engineers:** the aggregation rule is self-consistency worst-member, which invents no tier expectation for anybody and offers no threshold to move. Two failures wear the word "unresolved" and only one is a red: a broken catalogue entry is a defect in the artifact, while a member simply not cloned on this machine is a gap in the environment reading it, reported `not-graded` with an unconditional coverage count. Every member row carries the registry pin, entry version, graded sha and divergence marker **even when they agree**, because a report that shows them only on disagreement teaches a reader to assume agreement from silence. Every finding it emits is scope-local and carries no `reqId`: the 30-check spine did not move, so adopting this release costs an existing plugin nothing. A6 (restricted fields on plugin-shipped agents) therefore ships as a catalogue-level reading rather than a numbered check, and its graduation is filed for the Standard 0.13 cut with the reason recorded rather than left as an oversight. Spine stayed 30, Standard stayed v0.12.

### v1.12.1 - the round that reviewed the fixes (2026-08-12)
**What:** v1.12.0 merged after a single adversarial review round. A second round was then run against the same code and returned **four findings, three of them high, every one of them inside code the first round had caused to exist.** The parity-exception fingerprint was matching against the validator's entire output rather than its per-diagnostic lines, so a second unrelated defect would have stayed excused on a harness that had just started gating every pull request. Member identity, on its third attempt, moved from `endsWith` (which accepted `notgithub.com/owner/name`) through a path-boundary version (which accepted `evil.example/github.com/owner/name`) to exact host-and-path comparison with no prefix allowance. And the scope guard was four surfaces short, so a plugin shipping only hooks or MCP servers could still be re-scoped to a catalogue.
**Value, plainly:** the release that shipped a day earlier had three real defects in it, and they were found by reviewing the *fixes* rather than the original code. One review round is not a review; it is the first one.
**Value, for engineers:** this is the third release running where the worst defects lived in round-1 fix code (v1.10.1 took six rounds, round 6 catching a defect in a round-5 fix; v1.11.0 took four). The practice that follows is written into every release plan since: run the review until a round comes back clean, and run the extra rounds **before** merging, not after tagging. Spine stayed 30, Standard stayed v0.12.

### v1.13.0 - the contract you adopted (2026-08-13)
**What:** the gate stopped applying tightenings on a calendar and started applying them on YOUR pin. Three
version-gating mechanisms became one ceiling, computed from the version you declared and applied after your
own configuration resolves. Two long-scheduled tightenings finally graduated, a thirty-first check landed,
and a defect this toolkit had been writing into other people's repositories was fixed with a migration.

**Value, plainly:** before this release, "you are graded against the ruleset you pinned" was true for new
checks and quietly false for tightened ones - and a consumer could override the pin anyway, from their own
config file, in either direction. Now the promise holds in both directions, and the only way to take on a
stricter rule is to say so by raising your pin. Two scheduled tightenings that could never actually have
fired now do.

**Value, for engineers:** `applyStandardDowngrade` is deleted. Its logic is a ceiling over
`(pinned, since, migration.until)` applied LAST inside `resolveFindings`, so a `rules.X = "error"` override
is honoured and then held back, with the reason recorded in a new `ceiling` field (E26). Config carries
provenance - grader-owned versus subject-owned - which is what made the published-verdict floor possible:
a subject can no longer weaken an objective or vendor-cited finding about itself, though it can still be
stricter, and anything the grader supplied is honoured in full (E38). That deliberately REVERSES a
guarantee the code used to publish, and the reversal is ratified in ADR 0044 rather than discovered in a
diff. `U13` and `S4` emit their target severity and let the ceiling hold them back, which is the only shape
in which a graduation can fire at all - ADR 0041's cap sat at `warn` over a finding emitted as `warn`, so
lifting it would have produced a warning. `U14` (ADR 0045) promotes the marketplace-only restricted-fields
reading to the spine, so a plugin graded on its own is told too. And `gen-index` stops inferring whether a
plugin vendors this toolkit's gate and reads a declaration instead, with `G4` capping the exact legacy
rendering at warn until 0.14 so nobody is gated on our defect.

**Measured, not argued:** every one of the six family members grades byte-identically to the pre-release
baseline, except two that gain one capped warning each from the `G4` migration. Zero verdicts moved.

## Where we are now
- Version **1.17.0**, Standard **0.15**, **34-check spine**, **3 scopes** (plugin, component, marketplace), **26 skills**, suite **1439 / 0 failures**, gate **Advanced 0/0**, `release-ready` all five green. Self-grading Gold on every CI build. **Distribution in flight at the cut (2026-08-28)**: npm `latest` serves **1.16.3** with SLSA provenance and `agent-plugins` is pinned to `v1.16.3` at registry 1.71.0; the pushed `v1.17.0` tag is the first through the approval-gated publish path, and this line is rewritten when distribution closes. `v1.16.2` was deliberately never published to npm, the second such skip after 1.12.0; the registry pins by git sha, so its Action fix ships regardless. **This line went stale exactly as it warned it would**: it read `1.13.0` from 2026-08-14 to 2026-08-28, unrefreshed through six releases and three Standard cuts. What changed on 2026-08-28 is that keeping it true is no longer only a habit: a pushed tag now runs every gate and stops at a required reviewer before publishing, and `repin-watch` notices registry drift daily.

## What's next, and why (the roadmap, in priority order)
The v1.6.0 headline (the manifest-vs-disk drift check) and the report glossary + Bronze reference page both shipped above. The remaining v1.6.0-program work lands as continuous supporting effort:
1. **A dependable eval-run pipeline (F2).** Make the grade-record-improve loop reproducible end to end (pinned targets, a deterministic runner, a recorded dispatch contract). *Why:* the loop has proven its value but every run is still hand-orchestrated; this multiplies everything after it. Build it right before the next corpus batch so it is exercised immediately.
2. **Measure advisory quality, not just cost (F3).** Build fixture plugins with known planted issues and a scoring key, so the AI review layer gets a real precision/recall number per model and effort, and replicate the model triple on a defect-rich target. *Why:* today we measure what a review costs but only narrate how good it is.
3. **Authoring token measurements (F5).** Fill the token dossier's last unmeasured range by measuring real `askit-build-*` runs. *Why:* a builder should be able to budget an authoring run.
4. **Carried:** corpus batch 3, a Gemini emitter, and the remainder of the competitive gap-analysis backlog. (The marketplace-scope evaluation mode carried here since v1.6.0 **shipped in v1.12.0**; E4, E9 and E23 shipped in v1.11.0.)
5. **Next, and it is a Standard cut:** v1.13.0 "the contract you adopted" carries the Standard 0.13 bump. It replaces the pin-downgrade pre-pass and ADR 0041's unconditional cap with **one post-resolution Standard ceiling** over `since` and `until` (ADR 0044), which also closes **E26** (the pin downgrade is overridable by a consumer's own config) and **E38** (a subject's own config can lower an objective finding and still publish green), the latter by introducing grader-owned versus subject-owned config provenance. Riding that ceiling: `U13`'s warn-to-error graduation, ADR 0041's chain-migration cap graduation, and **E33** as the new `U14` check with its own ADR 0045 (spine 30 to 31). It also lands **E35** (the `gen-index` self-validation line, with a migration) and **E37** (the shell-probe timing budget, pulled in because it blocks the release-time counts gate).
6. **Then v1.14.0 "current with the vendors":** the ADR pack (commands-as-skills, frontmatter vocabulary strictness, `U5` scope per **E14**), the code batch, and standing up vendor-watch, plus the two items that need an undrafted ADR - **E34** (which cross-member findings belong on the spine at all) and **E36** (malformed and mixed marketplace manifests). *Why it moved:* bundling three undrafted ADRs with a Standard bump made v1.13.0 a release-of-releases. "Evidence" shifts to v1.15.0 and "graded cohort" to v1.16.0.


### v1.14.0 - four things the gate was telling you were not true (2026-08-16)
**What:** seven decisions written and MEASURED before any code, three new checks for files the runtime
loads and the gate had never read, four false reports closed, and the first watch this repository has ever
had on the vendor behaviour it asserts as fact.

**Value, plainly:** a grading tool's worst failure is not missing a defect. It is **reporting one that is
not there** - because the author who trusts it changes correct code, and the author who does not trust it
stops reading. This release closed four of those, then closed the reason none of them had been caught.

**Value, for engineers:** three of the seven decisions were **overturned by their own measurement before
ratification** - a proposed frontmatter strictness rule would have failed 44.9 percent of 2342 measured
skills, and a proposed language-independent description signal fired on 99.9 percent of 2068 descriptions
including 94.4 percent of Anthropic's own. The vendor-claims document now pins eight sentences and
behaviours across three vendor pages, re-checked on every release and monthly by a workflow that opens an
issue and never edits anything. One release-readiness command replaced four checklist lines a human ticked
with a single exit code that CI runs - and **it blocked its own first real run.**

**What the withheld window bought:** the tag was held for a day pending sign-off, and two more defects
surfaced in that gap that neither adversarial review wave could have found - the npm tarball shipped 16.5 kB
of library code nothing in it could reach, and the release gate would have jammed on 2026-09-14 with no
remedy but hand-editing the dates the release process forbids.

### v1.15.0 - two windows close, one because its subject did the work (2026-08-18)
**What:** the Standard 0.15 cut. Two requirements that shipped as warnings in 0.14 with a stated deadline
became gate-failing errors, and a fifth release gate started checking the version labels on this
repository's own pinned GitHub Actions.

**Value, plainly:** a migration window is a promise that something becomes required **on a date**. If the
window's evidence is re-examined at the boundary and the answer is always "nobody is affected, extend it",
it was never a window - it is a permanent exemption paid in instalments. Both windows closed on schedule,
and **nothing changes for any plugin that does not raise its own pin.**

**Value, for engineers:** neither graduation needed a line of code. The migration metadata capping both
checks at a warning was already committed, and the post-resolution ceiling resolves it against the
consumer's own pin - which was the explicit promise made when they shipped. The best evidence in the
release is that **the mechanism demonstrably worked**: the one plugin that would have lost a tier to the
workflow mirror declared its nine workflows one day after the decision was published, inside the window
that decision created. That is a warn-first migration observed doing its whole job, end to end, for the
first time here.

**The uncomfortable half, recorded rather than smoothed:** the catalogue-manifest check graduated against a
census that **still finds zero instances** of the defect it prevents. It graduated anyway, because nothing
schedules the corpus growth that would change that answer, so "wait for evidence" would have meant "never
gates", decided quietly. And the new action-pin gate's first reported defect turned out to be **its own
false positive against this repository's own file** - the exact failure mode the previous release was named
for. Adversarial review caught it, and the release records say so plainly.

### v1.16.1 - Gold was unreachable for anyone who did not vendor the gate (2026-08-24)

**The problem, in one sentence.** `G2` asks for CI that runs the conformance gate, and it recognised one spelling of that: the literal path `scripts/check.mjs`. That path exists only in a clone, while this project's own install documentation sends people to npm or the plugin marketplace, so the only command those users could run in CI was the one `G2` refused. **Gold was unreachable for anyone who followed the instructions.**

**Why it is a bug and not a rule change.** `STANDARD.md` sec 2.6 already asked for CI that runs the suite *via the portable scripts*, and `npx` runs precisely those from the published package. `library.json` already carried `selfValidation`, whose absent value means `npx` and which the Standard documents as correct for every plugin that consumes a toolkit rather than vendoring one. `gen-index` honoured that setting. `G2` never read it. **The same fix had been made in one place and never swept into the other** - E35, one level up, first fixed for `gen-index` at v1.13.0.

**What shipped.** `G2` now accepts five spellings of the same gate. Three more fixes in this project's own guards, including a vendor-claim watcher that reported a clean run on a claim nothing could ever check. And two plain-language documentation passes: 88 commands across 37 public pages named a path their readers do not have, one page had been false for three months, and the writing rules behind those fixes went into the skill that authors documentation so new pages start from them.

**The pre-cut review is the part worth keeping.** Its most valuable finding was a defect the same cycle had introduced. The bulk command substitution rewrote a sentence in which the vendored path was the **subject** being described rather than an instruction to follow, leaving `gold-checks.md` claiming that npx is what you use *if you vendor the gate* - the opposite of true, in the documentation for the very check this release exists to fix. Five pages had been deliberately held back from that sweep for exactly this reason and this one was still missed, because it sat in a page edited in an earlier commit.

**The durable lesson.** A find-and-replace over prose cannot tell an instruction from a description of an instruction. Holding pages back by judgement caught most of it and not all of it; what caught the rest was a review lens asking whether the code does what its own documentation says. **The check that finds a substitution error is not a better substitution - it is a different question, asked afterwards.**
### v1.16.0 - the evidence gets an address, and some of it was resting on nothing (2026-08-22)

**The problem, in one sentence.** `STANDARD.md` defines Convergent as what both agents support in different formats and Advanced as deep, often agent-specific capability - so **every tier boundary is a claim about software this project does not control**, and until this release no artifact recorded which vendor fact any boundary actually depended on.

**What shipped.** A repo-root `foundation/` in three layers: verified first-party sources, the machine-checkable claims, and the conclusions drawn from them. Every source record carries what was read, which version, when, and **by what method** - because "confirmed on the 19th" describes a page-read and a live experiment identically while distinguishing neither. Plus `tier-basis.md`, one row per tier boundary, where **a boundary with no evidence gets a row reading `unverified` rather than being left out.**

**Ratified before anything moved, and the ADR was overturned by measurement before it was written.** The W1 spec defined the claims folder by readership - "these files are read by release-blocking code" - and one grep showed that was false for one of the three. Membership became a format, with each file's gate readers named in a table instead of inferred from a folder.

**What it found is the reason to read this entry.** Every pinned claim in the repository sources from a **Claude Code** page. Not one pins a Codex fact or a Cowork fact - so the tier defined as *what both agents support* had pinned evidence for one of them. The Codex hook event list in the capability matrix was **missing an event**, found by opening the reference and counting. And two shipped checks accommodate Cowork behaviour the vendor documents nowhere, with no quote to re-read and no probe that expires.

**None of that was fixed here.** Each is filed. A boundary resting on nothing is a finding to record; moving a tier is its own decision with its own migration window.

**The review is the other half of the story.** Two adversarial waves, then the four-lens panel the pre-cut gate requires - which had **not** been run, and which the waves did not substitute for - then a direct probe of the panel's own fixes. More than thirty findings.

**Six times, a fix for a finding introduced a defect of the class it was fixing.** Three vendor claims pinned markdown *table syntax*, so a re-render would have blocked every release; their replacement pinned a *timeout budget* while claiming to back an event set; a guard anchor was deleted rather than updated, twice; a terminator widened to cure a false failure started ending sections early; and a test written to prove correctness contained a no-op that CodeQL caught. **Every one was found only because something ran after the fix - never by re-reading it.**

**The durable lesson, and it is not new here, only sharper:** the code written in *response* to a review is unreviewed. This release is the first to run a review pass against its own corrections, and that pass found three more defects.

**And then the same shape turned up in the documentation.** A pre-tag review of what a stranger actually reads found that **ten claims across eight public files described a gate this toolkit does not ship** - the Universal tier named as `U11-U13` or `U11-U14` where it runs to `U17`. `README.md` contradicted itself six lines apart, correct on one line and calling Bronze "12 checks" on the next. `U1-U9` plus `U11-U13` really is 12, so the count and its list agreed with each other perfectly and nothing ever compared either to the registry. Four checks - including the `agents/` phantom-subagent rule this project had made a headline of two releases running - had no description in the front door at all. It is the v1.15.0 defect exactly: that release fixed one stale page and shipped the fix with no sweep and no guard. This one swept, wrote the guard, and put the correction in the release notes where a reader who had built on the wrong number will see it.

### v1.16.2 - the Action failed before it graded anything (2026-08-25)

**The problem, in one sentence.** The reusable GitHub Action this project publishes failed for every consumer
before it ran a single rule, so the observable result was a red check with no grade at all.

**Value, plainly:** the gate is the product, and the Action is how most people are meant to run it in CI. A
consumer who wired it up got a failure that told them nothing about their own plugin. **The grade they came
for was never computed.**

**Value, for engineers:** the `Set up Node` step passed `cache-dependency-path: ${{ github.action_path }}/package-lock.json`.
`setup-node` resolves that input as a glob relative to `GITHUB_WORKSPACE`, while `github.action_path` is an
absolute path outside the workspace, so the pattern never matched, `setup-node` treats an unresolved path as an
error, and the composite step failed - skipping both the dependency install and the gate itself. The cache lines
were removed rather than repaired: the install they cached is a single package, so they saved nothing measurable,
and there is no workspace-relative path that could point at the Action's own lockfile.

**The part worth keeping.** It was found by `prisant-labs/prisant-utilities`, the first consumer to wire the
Action into CI. **This project's own CI never caught it, because it runs its gate directly rather than through
the Action it publishes.** A self-grading tool proves the gate works. It does not prove the doorway to the gate
works, and those are different claims. It is the same shape as v1.16.1, where Gold was unreachable for anyone
who installed the documented way: both defects lived in the gap between how the project uses itself and how it
tells everyone else to use it.

### v1.16.3 - the documented pin was one the toolkit had moved off (2026-08-25)

**The problem, in one sentence.** The SARIF example in `action.yml`'s usage comment told consumers to use
`github/codeql-action/upload-sarif@v3`, a pin this repository had already stopped using in its own workflow.

**Value, plainly:** every consumer who copied the example inherited two deprecation warnings the toolkit had
already avoided for itself. The advice was worse than the practice.

**Value, for engineers:** the v3 line targets Node 20, which GitHub runners now force onto Node 24 with a
deprecation warning, and it deprecates in December 2026. This repository's own `codeql.yml` was already on v4.
**Same shape as v1.16.2 twice over:** the path used internally and the path handed to consumers had diverged,
and nothing compared them.

**What was added afterwards, and why it belongs in this entry.** Both of these releases were tagged and
GitHub-released on 2026-08-25 and then **sat unpublished**. Three days later npm `latest` still served 1.16.1
and the `agent-plugins` registry was still pinned to v1.16.1, so two fixes written specifically for Action
consumers had reached those consumers by neither route. The publish workflow was `workflow_dispatch` only, by a
deliberate and well-argued decision: an npm publish is a one-way door and should not fire automatically off a
tag push. **That reasoning was right about the risk and wrong about the failure mode.** What actually went wrong
was not an accidental publish; it was no publish at all, silently, for three days.

So the trigger now fires on a pushed tag, and the one-way step sits behind a **required reviewer** on the
`npm-publish` deployment environment. A tag push runs every existing gate - tag format, the ancestry proof
against protected `main`, manifest agreement, the suite, the conformance gate, `release-ready` - and then stops
and waits for a human to approve or reject. **The human decision is preserved and the forgetting is removed.**
A forgotten publish is a silent failure; an unapproved deployment is a visible one that sits in the Actions tab
until someone rules on it.

### v1.17.0 - a tag reaches npm through an approval, and shipped records stop being rewritten (2026-08-28)

**What:** the minor that promoted two sessions of merged work, and the first release to ship through the
tag-triggered publish path the v1.16.3 entry describes. Three things are new: a documentation style contract
with `npm run doc-style` as its report (deliberately not a gate), a `G8` finding for folder READMEs that exist
but cannot be read (at `warn` until Standard 0.17, per ADR 0056, an unreadable folder README is a finding, not
a silent pass), and the E52 scoping fix that stops the count guard from policing a release's packet and
CHANGELOG section after that release has shipped.

**Value, plainly:** releases now reach the people they are written for without anyone remembering to send
them, and the project's own records stop being quietly rewritten by later work. The gate also stops doing the
one thing this toolkit grades other tools for doing: reporting success on a folder it never actually examined.

**Value, for engineers:** `versionHasShipped()` fails closed, so a shallow CI clone with no tags polices
everything exactly as before rather than going quiet. The `G8` finding names the path, the error code, and the
fact that the dependent checks did not run, instead of claiming a content failure nobody observed; the
escalation window to `error` was measured free (213 READMEs across the six reference-family members, zero
affected) rather than assumed. The style layer ships as an instrument plus a contract rather than a gate,
because the previous documentation passes had satisfied a sentence-length metric and still read as hard - the
report ranks all 88 published pages so the worst page is always the next one in the queue. The Codex
round-trip (Q-E) was run and recorded for this tag for the first time since v1.14.0: skills ingested against
`codex-cli 0.144.5`, not merely listed. And the version number itself carries a small governance story: v1.17.0
had been assigned to two earlier bodies of work (the graded cohort, then the onboarding funnel), and only this
cut shipped under it, so the funnel packet went unversioned per the no-version-until-it-ships precedent.
