# 0063 - An advisory layer beside the tier, and a health number that never enters it

## TL;DR

- **Decision one: D-01 (a health number beside the tier) is ruled in part.** The ruling is ADOPT for reports: reports gain a health number beside the tier. The badge half of D-01 stays open. It must be re-measured before any pass puts a number on the badge. **The tier and the badge do not change in this pass.**
- **Why the deferral no longer holds for reports.** D-01 was deferred because a second number "changes what every badge already in the wild means". The maintainer measured the wild on 2026-10-24: 111 npm downloads in the last month (some of them this repository's own CI), 3 GitHub stars, 0 forks, and no issue from anyone except the maintainer or a bot. No badge outside the organisation was found. A cost with no measurable payer is not a reason to keep the tier's blind spot in reports.
- **Decision two: one deterministic advisory layer, outside conformance.** Advisory findings live in their own registry, `scripts/lib/advisory-registry.mjs`, with modules under `scripts/advisory/`. **They are never placed in `findings[]`.** They travel only in their own array, `advisoryFindings[]`, so no verdict path can read them. They never enter the check spine, the tier, the burndown, the doc-enumeration counts or the exit code.
- **Decision three: the advisory IDs are `ADV1` to `ADV4`, not the proposed `A1` to `A4`.** `A6` is a live identifier, and `tierForReq` already maps every `A`-prefixed ID to the Advanced tier. Both facts are measured below. Advisory findings carry `reqId: null` and their ID in `advisoryId`, but `reqId: null` protects nothing: `tierForReq(null)` returns `"universal"`, so a null-reqId error inside `findings[]` would gate at Bronze. The separate array is the protection.
  - `ADV1` portability (vendor-cited): the six-field Skills API whitelist, from E86 (a SKILL.md portable here can hard-fail on claude.ai), and the two reserved name words, from platform.claude.com's Agent Skills page.
  - `ADV2` preload cap (vendor-cited): the 32-skill limit on a subagent's `skills:` list, from E87 (plugin-agent loading asymmetries).
  - `ADV3` security screen (objective): RS-E4 (the prompt-injection and pipe-to-shell content scan), formerly E6.
  - `ADV4` substance signals (house): E61's inputs (a body-length floor, description uniqueness, placeholder bodies).
- **Decision four: RS-E4 ships now as `ADV3`, and needs no Standard edition.** It was blocked only because a new spine check needs a `since` and a warn cap. An advisory finding needs neither, because it can never fail anything.
- **Decision five: E86 is an advisory warning that never gates.** This answers the ruling E86's status line asked for.
- **Decision six: the report object becomes versioned and additive**, with a JSON Schema at `schemas/report.v1.json`. This reopens item 1 of the roadmap's triage of the 2026-09-04 audit. Section 5 explains why D-01's partial ruling meets item 1's reopening condition.
- **Status:** **Accepted (2026-10-25).** Ruled by the maintainer. Revised the same day after an adversarial review, before merge: the safety argument, the layer comparison, the calibration method and twelve smaller points were corrected. Not implemented in this change: this ADR records the design, and the implementing change carries the code.

- **Date:** 2026-10-25
- **Deciders:** the maintainer
- **Drafted by:** Claude (Opus 5.5), from the maintainer's ruling of 2026-10-25
- **Numbering:** ADR 0062 is not missing. It is reserved for E75 (a marketplace cannot require a minimum Standard edition of its members), which the maintainer ruled on 2026-10-04 to write after the "own plugins first" migration finishes.

## Builds on

- **[ADR 0037 (the builder craft pass: an optional improve-mode phase 2 and the SAFE/JUDGMENT partition contract)](0037-builder-craft-pass-and-safe-judgment-partition.md)** - established that a model in the gate would end its determinism, and that judgment lives beside the verdict through `applyAdvisory()`. This ADR adds a deterministic layer beside the verdict and keeps the model out of it.
- **[ADR 0039 (marketplace-scope evaluation)](0039-marketplace-scope-evaluation.md)** - already emits deterministic analyses that never move a verdict. `evaluateMarketplace()` returns them in a top-level `advisory` object (`triggerSurface`, `commandSkillDivergence`, `contentLineage`), kept out of `findings`. That object is why this ADR's array is not called `advisory`. Section 6 sets the two side by side.
- **[ADR 0045 (U14: restricted fields on plugin-shipped agents become a numbered Universal requirement)](0045-restricted-fields-on-plugin-shipped-agents.md)** and **[ADR 0051 (no cross-member finding graduates to the spine, and the test that decides it)](0051-no-cross-member-finding-graduates-to-the-spine.md)** - the precedent for a finding that carries `reqId: null` and is reported without being a requirement. The marketplace `A6` reading is that precedent, and it is also the reason the `A` prefix is taken.
- **[ADR 0029 (reclassify U2 and U5 as house provenance)](0029-reclassify-u2-u5-as-house-provenance.md)** - the `plain-plugin` profile turns off exactly the house-provenance checks. Section 1 applies the same rule to house-provenance advisory signals.
- **[ADR 0053 (a pin's label is a claim this repository makes, and being behind is not a defect)](0053-a-pin-label-is-a-claim-and-behind-is-not-a-defect.md)** - "behind is news, not a defect". The health number's currency category follows it: it reports how far behind a pin is and enforces nothing.
- **[ADR 0027 (Standard versioning and compatibility policy)](0027-standard-versioning-and-compatibility-policy.md)** - a new tier requirement bumps the Standard MINOR. Advisory findings are not tier requirements, which is why `ADV1` to `ADV4` need no edition.
- **[ADR 0061 (U18 is permanently warn, and the strengthening set is Standard 0.18)](0061-u18-is-permanently-warn-and-the-strengthening-set-is-standard-0-18.md)** - named Standard 0.18 for five items and left RS-E4 out of it. That omission is what left RS-E4 with no revision to land on. This ADR removes its need for one.
- **[ADR 0057 (unshipped work carries a name, never a version number)](0057-unshipped-work-carries-a-name-never-a-version-number.md)** - the implementing change is named by this ADR's number and its backlog IDs. No release number is assigned here.

## Context and problem statement

The tier grades file shape. The 2026-09-04 external audit proved it with a plugin of 33 placeholder files. That tree is tracked byte-for-byte at `tests/fixtures/audit-corpus/potemkin-gold/`. Each of its three skill bodies reads `Do nothing.`, all three skill descriptions are the same sentence, and it grades **Advanced, 0 errors, 0 warnings**. E61 (the tier certifies file shape, so a plugin of placeholder files earns Gold) carries the finding.

E61 is explicit that a stricter tier is not the fix. Another rung of file presence has the same ceiling. The fix is to report something beside the tier that a placeholder plugin cannot score well on. That needed D-01, and D-01 was deferred to protect badges in the wild. The 2026-10-24 measurement found no such badges.

Three further items were parked on the same missing surface:

- **RS-E4 (the prompt-injection and pipe-to-shell scan)** had no Standard revision to land on. Roadmap section 7 recorded it as blocked and awaiting a ruling.
- **E86 (SKILL.md fields that claude.ai and the Skills API reject)** asked whether the portability gap becomes a gating check or stays advisory.
- **E87's last open half** is the 32-skill preload cap. No check warns when a subagent's `skills:` list exceeds 32.

Each of them is a true signal that should never fail a build. None of them had a place to go.

## Decision

### 1. One advisory layer, partitioned from conformance

Advisory findings are computed by modules under `scripts/advisory/` and registered in `scripts/lib/advisory-registry.mjs`. That registry is separate from `scripts/lib/registry.mjs`.

**Advisory findings are never placed in `findings[]`.** They live only in `advisoryFindings[]`, on the report object and on the `--json` output of `scripts/check.mjs`. Every verdict path in this repository reads `findings[]` and nothing else, so no verdict path needs a filter to ignore them. Implementation sites lists those paths by function.

**Advisory findings therefore never enter any of these:**

- `CHECKS` in `scripts/lib/registry.mjs`, so the spine stays at 35.
- `errorsByTier` in `scripts/tier-report.mjs`, so they cannot block a tier.
- The doc-enumeration counts that `scripts/check-doc-enumerations.mjs` guards.
- The exit code of `scripts/check.mjs`, at any severity, in any profile.

**`reqId: null` is not the protection.** `tierForReq` in `scripts/lib/tier.mjs` returns `"universal"` for a null reqId, and `isAboveDeclaredTier(null, declared)` returns `false` for every declared tier. A null-reqId finding at error severity inside `findings[]` would therefore count as a Universal error and gate at Bronze. That is exactly what happened to operator findings before F-011 (the grader config drags the tier down): `computeTierReport()` carries a comment recording that a trailing comma in `askit.config.json` reported "Tier: None" for that reason. Advisory findings keep `reqId: null` only so a consumer that reads finding objects sees the same shape as the `A6` reading. The separate array is what keeps them out of the verdict, and a required test proves it (Implementation sites).

**The partition does not copy the operator-finding shape.** `runGate` in `scripts/check.mjs` keeps operator findings inside `findings` and removes them from the grade. Every verdict path then has to remember to remove them. Today that removal is written separately in at least four places: `runGate()`, `computeTierReport()`, `runCli()` in `scripts/evaluate.mjs`, and `releaseReport()` in `scripts/lib/release-report.mjs`. A partition every consumer must remember fails the first time a new consumer forgets. A separate array needs nobody to remember anything. The layer also does NOT reuse `operator: true`. `scripts/lib/config.mjs` reserves that flag for defects in the grader's own `askit.config.json`, and an operator finding at error severity raises the exit code to 2. An advisory finding flagged as operator would therefore turn a portability note into a failed run.

**Rendering.**

| Surface | How an advisory finding appears |
| --- | --- |
| SARIF | level `note`, with an `askit/advisory` property naming the `ADV` ID |
| `--gha` | a `::notice` annotation |
| text, JSON, Markdown, HTML | a section of its own, after the conformance findings |
| the GitHub Action | an advisory count output |

SARIF `note` and `::notice` are already used for a finding above the declared tier, marked by `askit/aboveDeclaredTier`. The `askit/advisory` property is what tells a consumer the two apart. A finding never carries both properties.

**Switching it off.** A `--no-advisory` flag turns the layer off. The report then says so explicitly, through a field of its own: `advisoryLayer` is `"on"` or `"off"`. With the layer on, `advisoryFindings` is an array, possibly empty. With the layer off, `advisoryFindings` and `health` are `null`. `scripts/gha-action-outputs.mjs` validates fail-closed, so it treats the three cases differently. `"on"` projects the array's length, and a `0` then means "ran and found nothing". `"off"` projects an empty output, not `0`. A missing `advisoryLayer`, or a value that disagrees with the array, is a validation problem, because a field that silently dropped out of the report must never read as zero. That is the failure mode the file exists to prevent.

**Profiles, and house provenance.** Every `ADV` ID declares a provenance from the existing three values, listed in section 2. ADR 0029 made `plain-plugin` turn off exactly the house-provenance checks, because grading a plugin you do not own on this repository's conventions is illegitimate. ADR 0029 also rejected keeping those checks as warnings, because "a warn is still a finding in a published report". An advisory finding is printed in a published report too, so the same reasoning covers it. **Under `--profile plain-plugin`, the house-provenance advisory signals do not run.** That is `ADV4` today. The health categories built on house signals, substance and currency, report `off-by-profile`, which is distinct from `not-applicable` and from a score. The vendor-cited and objective signals, `ADV1` to `ADV3`, still run under `plain-plugin`, because portability and security matter most to exactly the third parties that profile exists for. Every advisory finding also carries its `provenance` field, as spine findings do. The cost is stated in Consequences: a placeholder third-party plugin graded under `plain-plugin` gets no substance reading.

**Marketplace scope.** Each member's advisory findings and health sit in that member's entry in the collection report's `members[]`, built by `gradeMember()` in `scripts/lib/marketplace/evaluate-marketplace.mjs`. ADR 0039's collection-level `advisory` object is unchanged. A catalogue-level rollup is item 12 of the 2026-09-04 triage (the marketplace rollup), and it is not decided here.

### 2. The advisory IDs, and why they are not `A1` to `A4`

The ruling proposed `A1` to `A4` and asked for the namespace to be confirmed free. It is not free. A word-bounded search for `A1` to `A9` across `STANDARD.md`, `docs/`, `scripts/`, `tests/` and `foundation/`, excluding this ADR, found 73 matching lines (76 occurrences) in 33 files on 2026-10-25. Two of them are structural:

1. **`A6` is a live identifier.** It names the marketplace `marketplace-agent-restricted-fields` reading in `scripts/lib/marketplace/analyze.mjs` and `scripts/lib/vendor-agent-fields.mjs`. It appears in two unit test files and one test fixture, in ADRs 0045, 0046 (the agents directory holds only registered subagents) and 0051, in `scripts/lib/README.md`, in the v0.13 changelog line of `STANDARD.md`, and in `foundation/claims/vendor-claims.json`. An advisory `A1` to `A4` beside a live `A6` would read as one series.
2. **`tierForReq` already claims the `A` prefix.** `scripts/lib/tier.mjs` maps every reqId that does not start with `U` or `S` to `"advanced"`, and its comment names the `A`-prefix explicitly. `tests/unit/tier-lib.test.mjs` pins `tierForReq("A2") === "advanced"`. An advisory finding whose ID travelled in `reqId` would become a Gold requirement in the text sections, in SARIF's above-tier predicate and in the burndown.

The rest are lexical: `RS-A1` to `RS-A4` are roadmap workstream IDs, and `A3` and `A4` name corpus batches in ADR 0030 (calibrate U6, U11 and the plain-plugin tier label from the batch-2 corpus run) and ADR 0031 (calibrate U3 and U4 for display-label and namespaced skill names).

**So two decisions, not one.**

- **Advisory findings carry their ID in a field of their own, `advisoryId`, and `reqId: null`.** This keeps the ID away from every function that reads `reqId`. It does not make tier code unreachable: section 1 explains why only the separate array does that.
- **The prefix is `ADV`.** A search of the whole repository for `AD`, `ADV` and `X` followed by a digit found zero matches on 2026-10-25, before this ADR was written. `ADV` reads as "advisory" where it is printed. The single-letter candidates `H`, `P`, `Q`, `V` and `N` were all already in use.

| ID | Name | Provenance | Source | What it reports |
| --- | --- | --- | --- | --- |
| `ADV1` | portability | vendor-cited | E86 for the whitelist; platform.claude.com's Agent Skills page for the reserved words | A `SKILL.md` frontmatter key outside the Skills API whitelist (`allowed-tools`, `compatibility`, `description`, `license`, `metadata`, `name`), and a skill `name` containing the reserved word `anthropic` or `claude` |
| `ADV2` | preload cap | vendor-cited | E87 | A subagent whose `skills:` list names more than 32 distinct skills, since Claude Code preloads only the first 32 |
| `ADV3` | security screen | objective | RS-E4, formerly E6 | Pipe-to-shell installers and catalogued prompt-injection or dangerous-command patterns in skill content |
| `ADV4` | substance signals | house | E61 | A skill body under a length floor, a description duplicated across sibling components, and a placeholder body |

**Provenance, per ID.** `ADV1` and `ADV2` rest on vendor documentation, so they are vendor-cited. `ADV3` is objective because E6 specified the scan "on the objective tier". A pattern whose only basis is this repository's preference would be house, so no such pattern may enter `ADV3`'s catalogue. `ADV4` is house. No vendor sets a body-length floor or a similarity threshold, which is the same reason ADR 0029 reclassified the `U5` description scorer as house.

**`ADV1`'s two sources are separate pages.** The whitelist comes from E86's read of `code.claude.com/docs/en/skills.md` on 2026-10-23, which quotes the error claude.ai and the Skills API return: *"Unexpected key(s) in SKILL.md frontmatter: argument-hint. Allowed properties are: allowed-tools, compatibility, description, license, metadata, name."* The reserved words come from the Agent Skills page at `platform.claude.com/docs/en/agents-and-tools/agent-skills/overview`. Under "Field requirements", its `name` list carries the bullet *"Cannot contain reserved words: "anthropic", "claude""*. E86 mentions that page only in passing. Today `foundation/claims/vendor-claims.json` has no source for platform.claude.com at all. Its four sources are `cc-plugins-components`, `cc-skills`, `cc-sub-agents` and `cx-hooks`. The implementing change adds the entries listed in Implementation sites. The reserved-words text is a bullet fragment, not a complete sentence. The file's conventions forbid a fragment as a `quote` claim, because a page that reversed the rule could keep the same tokens. The claim is therefore a `probe` with a named reproduction.

`ADV1` is a note about one runtime, not a defect. Claude Code accepts every field the Skills API rejects. The finding text says which runtime refuses the field and that Claude Code itself does not.

**`ADV3` keeps RS-E4's design constraints and acceptance criteria.** The ruling moves RS-E4 out of the Standard. It does not void what RS-E4 required. The screen is deterministic, with no scoring and no judgment. Every pattern carries an ID, a matcher, a class, a cited source and a known-limits note. The finding text says it is a screen and not a safety review. The three criteria carry over unchanged. They are quoted verbatim from roadmap section RS-E4, without the amendment note dated 2026-08-31 that follows criterion 1:

> 1. Seeded-malicious fixtures (one per pattern class) each fire; the family corpus fires zero or every fire is examined and either exempted-by-rule or genuine; **and the measured false-positive rate required by change item 3 is recorded as a NUMBER, with a stated ceiling above which the catalog does not ship.**
> 2. **Proven able to fail:** a pattern removed from the catalog stops its fixture firing (the catalog is load-bearing, mutation-tested).
> 3. The documentation-discusses-the-attack case is a committed negative fixture.

**The false-positive population is unchanged: the family corpus**, which the backlog uses to mean the six family members. `docs/reference/health-score.md` names the members and commits the screen measured. One thing is added, and it is an addition, not a change to the criteria: the rate is also reported over the seven trees the 2026-09-04 audit labelled as deserving their tier. Section 4 explains why a measurement taken only on one author's work is weak evidence. The ceiling stays pre-registered, as criterion 1 requires.

The third-party scanner variant (item 14 of the 2026-09-04 triage) stays deferred on its existing trigger.

**`ADV4`'s uniqueness signal and ADR 0039's `triggerSurface` measure different pairs.** `triggerSurfaceOverlap()` in `scripts/lib/marketplace/analyze.mjs` compares skill descriptions across catalogue members, and it skips every pair from the same member. `ADV4` compares descriptions between sibling components inside one plugin, which is exactly the set of pairs `triggerSurface` skips. The two never report the same pair. `ADV4` reuses the same tokeniser and metric, `triggerTokens()` and `jaccard()`, which that file already exports, so the repository has one measure of description similarity. It does not inherit `triggerSurface`'s default threshold of 0.5. Its threshold is a cut point fixed under section 4.

### 3. The health number

**The health number sits beside the tier in reports. It is never on the badge in this pass.** It has five categories:

| Category | Measured from | Provenance |
| --- | --- | --- |
| substance | `ADV4`'s signals | house |
| budget | the instruction-budget measurements `U7` already takes, and `ADV2` | vendor-cited |
| portability | `ADV1` | vendor-cited |
| security | `ADV3` | objective |
| Standard currency | how many Standard minors the plugin's pin is behind the Standard the toolkit ships | house, because the pin lives in `library.json`, which is the house check `U1`'s file |

It follows Lighthouse's pattern: a category score beside pass/fail audits, where the audits decide and the score informs. Every category is computed only from measured, deterministic signals. No model contributes to any category.

**Health reads measurements, not severities.** A category reads the raw measurement a check or advisory module took, not the severity that the pin ceiling or a profile assigned to the finding. A pin can therefore buy a quieter gate but never a better health score. The currency category then reports what the pin bought.

**Each category is reported on its own, with the number of components it measured.** This pass computes no cross-category average. E61's reference implementation averaged the five categories without weights, which made safety count exactly as much as description structure. Lighthouse also publishes no cross-category total. An aggregate can be proposed later by its own ADR, against the calibrated data.

**What the currency category reports for each kind of pin.** `scripts/lib/standard-version.mjs` already distinguishes these cases, and the category follows it:

| The plugin's `library.json.standard` | What `parseStandard` returns | What currency reports |
| --- | --- | --- |
| a real `MAJOR.MINOR` at or below the shipped edition | `[major, minor]` | the number of minors behind, and the number of findings the pin held below their resolved severity (the `waived-by-pin` outcome in section 5) |
| no pin | `null` | `not-applicable`, with the reason `unpinned`. The gate grades at full strength, so nothing was waived |
| an unparseable value, such as `"banana"` | `null` | `not-applicable`, with the reason `unparseable-pin`. The gate grades at full strength, so nothing was waived |
| the baseline sentinel `"0.x"` | `[-Infinity, -Infinity]` | `not-applicable`, with the reason `baseline-sentinel`. It is never reported as infinitely behind: `isAfter()` treats the sentinel as full strength, and subtracting it would print an infinite debt for a plugin that waived nothing |
| a pin ahead of the shipped edition, such as `"1.0"` | `[1, 0]` | `ahead`, with zero minors behind and the existing `standardEditionNotice` text, because rules after the shipped edition were not checked |

Minors behind are counted only within one MAJOR. The Standard has no 1.0 yet, so the change that ships 1.0 must define the cross-MAJOR case. Currency has no band in this pass. A band would say how far behind is too far, and that is D-02's question.

**E61's measured scaling properties, and what this design does with each:**

- **A Bronze plugin can outscore a Gold one.** Kept deliberately. The axes are orthogonal by construction, and that orthogonality is the point.
- **Small plugins are punished harder,** because one bad skill in five costs twenty points. Mitigated by reporting the component count beside every category, so a reader sees `1 of 5`, not only `80`.
- **The denominator moves,** because some categories drop out for a plugin with none of the component they measure. A category with nothing to measure reports `not-applicable`, never a score of 100 and never a silent omission.
- **The mean was unweighted.** Removed, by computing no cross-category mean in this pass.

E61 proposed five different categories: description structure, instruction budget, reference integrity, eval coverage and safety patterns. The ruled set replaces reference integrity and eval coverage with portability and currency. Reference integrity is already a gating check (`U6`), and eval presence is already graded by `G3`. Portability and currency had no surface at all.

**D-02 and D-03 stay open.** D-02 is the pin floor's deprecation window, carried by E62 (the Standard pin has no floor). D-03 is `U5`'s warning text, carried by E63 (`U5` rewards a template). The currency category shows the pin's age and enforces nothing, so it answers neither question.

### 4. Calibration: the method, not the numbers

The thresholds and band cut points do not exist yet, and an accepted ADR is immutable. They will live in `docs/reference/health-score.md`, which the implementing change writes. This section fixes the method they must be produced by, and the one number the method needs.

**The falsifiable test has two halves:**

1. `tests/fixtures/audit-corpus/potemkin-gold/` lands in the **lowest substance band**, under the pre-registered cut points.
2. `tests/fixtures/audit-corpus/pin-abuse/`, which pins `"standard": "0.9"`, shows **currency debt**: a minors-behind count derived from the shipped edition through `shippedStandardEdition()`, not a literal, and at least one waived finding.

**The potemkin half must not be tuned to the fixture's text.** No placeholder matcher may contain the fixture's literal strings, such as `Do nothing.`. The test must still pass with the placeholder-body signal removed, carried by the body-length floor and description uniqueness alone. A matcher written to recognise one fixture's words would pass the test without measuring anything.

**Cut points are pre-registered, and fixed before either test runs.** The implementing change commits every band cut point and threshold to `docs/reference/health-score.md` and to the advisory registry's data, in a commit that precedes both the corpus measurement and the commit that adds the two tests. Git order is the evidence. The two tests import the cut points from the registry data and never restate them as literals. A cut point moved after either test ran is a new pre-registration, recorded as one in that page.

**Thresholds are calibrated on the labelled 2026-09-04 audit corpus, not on the family.** The family is all the maintainer's own work, so calibrating on it would teach the thresholds one author's habits.

**The labelled set must become a tracked fixture first.** Today the labels live in the gitignored `_local/audit/` area, and the audit's generator resolves paths against a hard-coded directory. E63 recorded what that costs: a threshold calibrated against an untracked set is an assertion nobody can re-run. The implementing change extracts the labelled trees under `tests/fixtures/audit-corpus/`, the way `potemkin-gold/` and `pin-abuse/` were extracted. The confusion counts in `docs/reference/health-score.md` are computed from that tracked copy.

**What the labels say today, measured 2026-10-25.** The corpus manifest at `_local/audit/2026-09-04_fable-5-1-max/corpus/manifest.json` lists 46 trees. Each entry has six fields: `id`, `root`, `declared`, `deserves`, `expectGate` and `note`. `deserves` is `false` for 27 trees, `true` for 7 and `null` for 12, so 34 trees are labelled. **No field records why an undeserving tree fails to deserve its tier.** The only reason is the free-text `note`, so no category can be read off the manifest as it stands.

**How labels map to categories.** The tracked fixture's inventory gains a `categories` field on every labelled tree, listing the health categories the tree is evidence for, or an empty list. The implementing change assigns it by reading each tree and its `note`, records a one-line justification beside each assignment, and commits the assignments before any threshold is measured. A tree is a positive for a category only if its undeserving reason falls in that category. Many undeserving trees fail on CI wiring or manifest drift, which no health category measures, so they get an empty list. The seven deserving trees are negatives for every category. The twelve trees with a `null` label are hardening cases, such as symlink loops and a 50 MB skill, and are not used for calibration. Scoring the whole corpus against every category would measure the categories against a question they do not ask.

**The two test fixtures are held out.** `01-potemkin-gold` and `09-pin-abuse` are in the labelled corpus, and they are the trees the falsifiable test grades. Calibrating on them would tune the cut points to the test. Both are excluded from every calibration count.

**A category needs at least 5 positive and 5 negative labelled trees before it shows a band.** With fewer than 5, one tree moves a rate by more than 20 points, which is not a measurement. A category below that minimum reports its measurement and its component count, marks itself `uncalibrated`, and shows no band. The pre-registered cut points still exist for it, and the potemkin test still runs against them, because the test asks whether the fixture falls below a fixed floor, not whether the floor was validated. "Uncalibrated" means the corpus cannot yet validate the cut points.

**A provisional reading of the notes, which is not a label assignment,** suggests how far short the corpus falls. Substance has two candidate positives, `01-potemkin-gold` and `03-description-gaming`, and one after the hold-out. Budget has one, `04-budget-gaming`. Security has one, `17-secret-in-skill-and-hook`. Portability has none. Currency has `09-pin-abuse` and its three variants, `09b-pin-garbage`, `09c-pin-sentinel` and `09d-pin-future`, which test the pin states in section 3 rather than a threshold. So on the first ship, every banded category will report `uncalibrated` and show no band. That is the honest result of the evidence that exists. Growing the labelled set is not decided here.

**The ship bar is pre-registered, as RS-E4's ceiling is.** Before measuring, the implementing change states in `docs/reference/health-score.md`, for each banded category, two numbers: the most deserving trees allowed in the lowest band (the false-positive ceiling), and the smallest share of positive trees that must land below the top band (the separation floor). A category that meets the 5-and-5 minimum but misses either number does not show a band, and the page records the miss.

**This repository's own band is reported, never an acceptance criterion.** Tuning thresholds until the author's own tree comes out on top would make the test vacuous. `docs/reference/health-score.md` states this repository's bands as an observation, beside the corpus results.

### 5. The report object becomes versioned and additive

The report object gains a version and new fields. **No existing field is removed or renamed**, so every current `--json` consumer keeps working.

| Field | What it holds |
| --- | --- |
| `schemaVersion` | the report schema's version, starting at `1` |
| `run` | every volatile field: time, toolkit version, Node version, duration, and the invocation. Two runs over an unchanged tree then differ only inside `run` |
| `checks[]` | one entry per spine check, with an `outcome` from the enum `pass`, `fail`, `warn`, `not-applicable`, `not-run`, `waived-by-pin` |
| `components[]` | each component's description text, size, instruction-budget use and emission targets |
| `blockedFindings[]` | the burndown as finding objects, alongside the existing `blocked` strings |
| `advisoryLayer` | `"on"` or `"off"`, so a consumer can tell a layer that was switched off from a field that was dropped |
| `advisoryFindings[]` | the advisory findings, each with `advisoryId`, `provenance` and `reqId: null`; `null` when `advisoryLayer` is `"off"` |
| `health{}` | the five categories, each with its state, measurement, band (absent while uncalibrated) and component count; `null` when `advisoryLayer` is `"off"` |

**Why `advisoryFindings` and not `advisory`.** ADR 0039's collection report already has a top-level `advisory` key, and its value is an object of three named analyses. `deriveCollectionModel()` in `scripts/lib/report-render.mjs` reads it. A plugin report whose `advisory` key held an array would give one key two types across scopes, and no schema consumer could type it. `advisoryFindings` names what its elements are, finding objects, in parallel with `findings[]`. The parallel is deliberate, and the separation is too: the two arrays never share an element.

`waived-by-pin` means the pin ceiling held a finding below the severity it would otherwise carry, which is the fact the currency category counts. Whether a finding sits above the declared tier stays a separate property, as it is today.

**Two contracts, not one.** The JSON Schema at `schemas/report.v1.json` covers the report object that `scripts/evaluate.mjs` emits for plugin and component scope. The `--json` output of `scripts/check.mjs` is a different object, built by `buildJsonReport()`, with a different shape (`tierReport.tier`, `errorCount`, `warnCount`, `operatorErrorCount`). Its contract is `validateReport()` in `scripts/gha-action-outputs.mjs`, which is what the Action reads. This ADR keeps them as two contracts. `buildJsonReport()` gains `advisoryLayer` and `advisoryFindings` with the same shapes as in report.v1, and `validateReport()` gains the fail-closed rule in section 1. The marketplace collection object is a third shape, which report.v1 does not cover; item 12 decides it. Unifying the contracts is not decided here.

**D-01's partial ruling, and item 1's reopening condition.** Roadmap section 4 deferred item 1 (the schema-first report object) until "D-01 (a health number beside the tier) is ruled ADOPT - the score needs this object's inventory pass". D-01's own question is phrased about the badge, and the badge half is not ruled. **This ADR reads the condition as met in substance.** Item 1 named D-01 because the score needs the report object's inventory pass. That need arises on reports, and the report half is the half ruled ADOPT. The badge half needs no report object. A versioned report is a compatibility promise, which is why item 1 waited for this ruling.

**What this reopens from roadmap section 4 (the triage of the 2026-09-04 audit):**

- **Item 1** (the schema-first report object) is reopened by this ruling.
- **Item 2** (the health score beside the tier) is unparked. It is carried by E61 and specified here.
- **Item 3** (the security posture axis) is carried by `ADV3`, and no longer needs a revision.
- **Items 6, 9 and 12** (the budget profiler, report diff and trend badge, and the marketplace rollup) each reopen "with item 1". `components[]` carries item 6's inputs and `run` carries item 9's precondition. Building any of the three is not decided here.

### 6. Three things already called "advisory", and how the new layer differs

This repository already uses the word for two layers, and the new one makes three. All three share one property: none can move the verdict. They differ in everything else.

| | The model-judgment layer | ADR 0039's marketplace analyses | The `ADV` layer (this ADR) |
| --- | --- | --- | --- |
| Who computes it | a model, outside the gate | the gate's own code, marketplace scope only | the gate's own code, in every scope and for each catalogue member |
| Reproducible | no | yes | yes |
| How it arrives | `evaluate.mjs --report=review` or `--report=behavioral`, with `--advisory <file.json>`, merged by `applyAdvisory()` | computed on every marketplace run and built inline by `evaluateMarketplace()`. ADR 0039's prose credits `applyAdvisory()`, but the code does not route these analyses through it | computed on every run, unless `--no-advisory` |
| Where it sits in the report | `review`, `insights` and `behavioral` | the collection's `advisory` object | `advisoryLayer`, `advisoryFindings[]` and `health{}` |
| What it compares | one plugin, sampled | pairs of skills in different members | one plugin's own components |
| IDs | none | named analyses, no IDs | `ADV1` to `ADV4` |

`docs/explanation/limitations.md` section 2 and `docs/reference/evaluation-reports.md` both call the model-judgment layer "the advisory layer". The rendered reports add a fourth use: `renderMarkdown()` in `scripts/lib/report-render.mjs` calls a spine warning an "advisory warning". The new section must not reuse that phrase.

**`--no-advisory` is not the negation of `--advisory <file.json>`.** The first turns off the `ADV` layer. The second supplies a model's review. Both can appear in one run. `--no-advisory` also leaves ADR 0039's marketplace analyses on, because they are part of the collection report that ADR ruled. The implementing change states all of this in the CLI help, and qualifies the two documentation headings above so each names the layer it means.

## Consequences

- The spine stays at 35 and the Standard stays at 0.17. One declarative sentence is added to `STANDARD.md`, it carries no RFC 2119 keyword, and it bumps no edition. Implementation sites explains why it has no keyword.
- A plugin's tier, exit code and badge are unchanged by anything this ADR adds. The implementing change must test that in two ways. Grading every audit-corpus fixture with and without `--no-advisory` must give identical tiers and exit codes. A stub advisory module emitting an error-severity finding must leave every verdict path unchanged, as Implementation sites specifies.
- Under `--profile plain-plugin`, substance and currency report `off-by-profile`. A placeholder plugin graded under that profile therefore gets no substance reading. That is the price of not grading third parties on this repository's conventions, which ADR 0029 already paid for `U2` and `U5`.
- On the first ship, every banded category reports `uncalibrated` and shows no band, because no category has 5 labelled positives. The measurements and component counts still show.
- RS-E4 leaves roadmap section 7. Nothing on that page is then blocked on a Standard ruling.
- E86 is ruled advisory. E87's remaining open half is carried by `ADV2`.
- `components[]` and `run` give items 6, 9 and 12 of the 2026-09-04 triage the inputs they were waiting on. Each still needs its own decision to be built.
- A later pass may put the health number on the badge. That pass needs its own ADR, and it must re-measure the wild first, as this one did.

## What was considered and refused

**A fourth structural rung ("Platinum").** Refused, on E61's own words: another rung of file presence has the same ceiling. A placeholder plugin that satisfies three structural rungs would satisfy a fourth. This refusal concerns a structural rung only. D-08 (the behavioural rung's shape: a fourth tier name, or a modifier on Gold) is a different question about executable evals, and it stays open.

**An LLM in the gate.** Refused. ADR 0037 already settled that a model in the gate ends its determinism. Every category of the health number is computed from deterministic measurements. Model judgment stays in the existing model-judgment layer, beside the verdict.

**Putting the health number on the badge in this pass.** Refused for this pass, not for ever. The badge is the one surface readers do not click through, and the thresholds are not yet calibrated. A number on a badge before its calibration exists would be the overclaim this ADR is written against.

**Keeping advisory findings inside `findings[]`, partitioned like operator findings.** Refused. Every verdict path would need its own filter, and the operator partition already shows the cost: the same removal is written separately in at least four functions. A null reqId does not make a missed filter harmless, because `tierForReq(null)` is `"universal"`.

**Reusing the operator flag.** Refused. `operator: true` is reserved by `scripts/lib/config.mjs` for grader-config errors, and an operator finding at error severity raises the exit code to 2.

**Exempting advisory output from ADR 0029's profile rule.** Refused. The argument for it is that advisory output publishes no grade. ADR 0029 rejected the same argument for warnings: "a warn is still a finding in a published report". An advisory finding is one too.

**Keeping `A1` to `A4`.** Refused. `A6` is live, and `tierForReq` maps the whole `A` prefix to the Advanced tier. Section 2 records the measurement.

**Naming the report field `advisory`.** Refused. ADR 0039's collection report already uses that key for an object. Section 5 records the reason.

**Waiting for Standard 0.18 to ship RS-E4 as a spine check.** Refused. A screen with a false-positive rate cannot honestly fail a build, and ADR 0061 named 0.18 for a different set. As an advisory finding it can ship now, and it can still be proposed for the spine later on measured evidence.

**Averaging the five categories into one number.** Refused for this pass. E61 measured that an unweighted mean makes safety count exactly as much as description structure. Lighthouse publishes no cross-category total either.

## Implementation sites

None of these is changed by this ADR. The implementing change carries them. Names that do not exist in source yet (the ADV1 to ADV4 IDs, the advisoryId, advisoryLayer and advisoryFindings fields, and new test and claim names) are written without backticks here, because this section is a grep anchor and an anchor to unwritten code would read as verified.

**The advisory layer itself.**

- **`scripts/lib/advisory-registry.mjs`** (new) - the advisory registry: ADV1 to ADV4, each module's advisoryId and provenance, `reqId: null` on every finding, the pre-registered cut points as data, and the set of house-provenance IDs that `plain-plugin` turns off.
- **`scripts/advisory/`** (new, with its folder `README.md`) - one module per advisory ID, plus ADV3's pattern catalogue as data. The folder needs its README in the same change, or the folder-README check (`G8`) fails. ADV4 imports `triggerTokens()` and `jaccard()` from `scripts/lib/marketplace/analyze.mjs` rather than writing a second similarity measure.
- **`scripts/lib/profiles.mjs`** - `plain-plugin` gains the advisory off-set: the house-provenance ADV IDs.
- **`schemas/report.v1.json`** (new) - the JSON Schema for the versioned report object that `scripts/evaluate.mjs` emits for plugin and component scope.
- **`package.json`** - the `files` list gains `scripts/advisory/` and `schemas/`. Without them an `npx` install would fail on its first import.

**Every verdict path.** Each function below reads `findings[]` to compute a verdict, a count or a level. None of them may read advisoryFindings, and each is covered by the partition test that follows. The list comes from a search of `scripts/` on 2026-10-25 for every function that buckets findings by tier, filters them on error severity, or derives an exit code from them.

- **`scripts/check.mjs`** - `gateExitFromFindings()`, `runGate()`, `sectionFindings()`, `standardDebtLine()`, `format()`, `formatGithubAnnotations()` and `buildJsonReport()`. The file also runs the advisory registry beside `runAllChecks`, returns advisoryFindings and advisoryLayer beside `findings` rather than inside it, renders the advisory text section and the `--gha` `::notice` lines, and accepts `--no-advisory`.
- **`scripts/tier-report.mjs`** - `computeTierReport()`. Unchanged in behaviour.
- **`scripts/evaluate.mjs`** - `baseReport()`, `dispositions()`, `evaluate()`, `evaluateComponent()` and `runCli()`. The report object gains `schemaVersion`, `run`, `checks[]`, `components[]`, `blockedFindings[]`, advisoryLayer, advisoryFindings and `health{}`. The CLI accepts `--no-advisory`, and its help says that `--no-advisory` and `--advisory <file.json>` are unrelated.
- **`scripts/lib/release-report.mjs`** - `releaseReport()`, which recomputes `gateExit` through `gateExitFromFindings()`.
- **`scripts/lib/migrate-report.mjs`** - `migrateReport()`, which buckets errors by `tierForReq()`.
- **`scripts/lib/marketplace/evaluate-marketplace.mjs`** - `gradeMember()`, `evaluateMarketplace()` and `marketplaceExitCode()`. `gradeMember()` also carries each member's advisoryFindings and health into its `members[]` entry.
- **`scripts/lib/resolve-config.mjs`** - `gatingFindings()`.
- **`scripts/lib/report-render.mjs`** - `statusFor()` and `deriveModel()`. The file also gains an advisory section and a health section in the Markdown and HTML output. Advisory remediation text gets its own table rather than rows in `REPORT_META`, which is keyed by spine reqId and guarded by a coverage test.
- **`scripts/lib/sarif-render.mjs`** - `buildResults()`. Advisory results are emitted at level `note` with an `askit/advisory` property, never combined with `askit/aboveDeclaredTier`.
- **`scripts/gha-action-outputs.mjs`** - `validateReport()` and **`action.yml`** - an advisory count output, validated fail-closed against advisoryLayer, and empty when the layer is off.

**Required tests.**

- **The partition test** (new). A stub advisory module that emits a finding at error severity is registered. Every function in the list above is run with the stub and without it, and the tier, the exit code, `errorCount`, the summary counts, the collection verdict and `gateExit` must be identical. The test also asserts that no element of `findings[]` carries an advisoryId. It must be shown failing: a variant that merges the stub's finding into `findings[]` must turn it red, because `tierForReq(null)` is `"universal"`. A guard that cannot fail is not a guard, which is the shape RS-E4's criterion 2 already demands.
- **The corpus parity test** (new) - every audit-corpus fixture graded with and without `--no-advisory` gives identical tiers and exit codes.
- **The off-marker test** - `validateReport()` rejects a report with no advisoryLayer, and rejects advisoryLayer `"off"` beside an array.
- **`tests/unit/house-provenance.test.mjs`** - gains the advisory invariant: the `plain-plugin` advisory off-set equals the set of house-provenance ADV IDs, so the two cannot drift, as ADR 0029 required for the spine.
- **The two falsifiable tests** in section 4, added only after the commit that pre-registers the cut points. The three pin states that `pin-abuse/` does not cover (an unparseable pin, the sentinel and a pin ahead) are written as tmpdir variants of `pin-abuse/`, the way `tests/unit/standard-pin-floor.test.mjs` writes its ninth violation. The audit's own copies, `09b`, `09c` and `09d`, exist only under `_local/`.

**Evidence and claims.**

- **`foundation/claims/vendor-claims.json`** - gains a source for the Agent Skills page on platform.claude.com, and three claims: a `quote` claim on `cc-skills` for the six-field whitelist sentence, a `quote` claim on `cc-sub-agents` for the 32-skill preload sentence, and a `probe` claim on the new source for the reserved name words. The reserved-words text is a bullet fragment, so it cannot be a quote. The probe names its reproduction: a Skills API upload of a skill whose `name` contains a reserved word. Each quote must pass the meaning-reversal test in `tests/unit/vendor-watch.test.mjs`.
- **`tests/fixtures/audit-corpus/`** - gains the labelled 2026-09-04 trees as tracked fixtures. Its `README.md` gains their inventory, including the categories field and its justifications.
- **`docs/reference/health-score.md`** (new) - the pre-registered cut points, thresholds and ship bars, committed before any measurement; then the per-category confusion counts on the tracked labelled corpus, each category's calibrated or uncalibrated state, ADV3's false-positive rates, and this repository's own bands, reported as an observation.

**Documentation and records.**

- **`STANDARD.md`** - one sentence, no edition bump, in sec 7.7's paragraph on consumer-side configuration, written in the style of that paragraph's "a plugin is conformant or not independent of how any grader is configured": a plugin is conformant or not regardless of its advisory findings or health. **It carries no RFC 2119 keyword, deliberately.** A `MUST` or `MUST NOT` would need an ADR 0059 (every MUST maps to a check, a SHOULD or a stated gap) disposition in `scripts/gen-standard-coverage.mjs`, and it would promise a grader behaviour that the Standard cannot verify on a plugin. The guarantee is enforced by the partition test, not by the Standard.
- **`scripts/lib/tier-scope.mjs`** - `TIER_SCOPE_SENTENCE` gains a clause pointing at the health number beside the tier. The sentence is pinned verbatim by a test, so the change is deliberate and lands in one commit.
- **`docs/explanation/limitations.md`** - section 1 points at the health number as the thing beside the tier, and section 2's heading is qualified so it names the model-judgment layer.
- **`docs/reference/evaluation-reports.md`** - its "deterministic / advisory boundary" section names all three layers.
- **`docs/internal/roadmap.md`** - the D-01 row records the partial ruling and the open badge half; items 1, 2 and 3 of section 4 are updated; and RS-E4 leaves section 7.
- **`docs/internal/backlog/enhancements.md`** - the status lines of E61, E86 and E87 point at this ADR.
