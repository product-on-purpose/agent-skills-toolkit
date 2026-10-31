---
title: "Health score reference"
description: "The health number beside the tier (ADR 0063) - the five categories, pre-registered cut points, calibration method and confusion counts, and the ADV3 false-positive ceiling record."
audience: engineer
level: intermediate
tags: [health, advisory, calibration, substance, currency, adv3, adv4]
---

# Health score reference

This page is the pre-registered home for the health number (ADR 0063 sec 3), the W6 implementing
change. It holds three things, in the order ADR 0063 sec 4 requires them to exist: the cut points,
fixed BEFORE any measurement; the category label assignments the calibration corpus needs, also fixed
before measurement; and, after both, the confusion counts and this repository's own result, reported as
observations. It also carries the ADV3 (the security screen) false-positive ceiling record, moved here
from `scripts/advisory/README.md` because both records answer the same question - "what was
pre-registered, and what did measuring it show" - for the same advisory layer.

## The five health categories

[ADR 0063 (an advisory layer beside the tier, and a health number that never enters it)](../internal/decisions/0063-an-advisory-layer-beside-the-tier-and-a-health-number-that-never-enters-it.md)
section 3 defines five categories, each reported on its own with its own component count. No model
contributes to any of them, and this pass computes no cross-category average.

| Category | Measured from | Provenance |
| --- | --- | --- |
| substance | ADV4's signals (body-length floor, description-duplicate, placeholder-text catalogue) | house |
| budget | `U7`'s raw per-skill line count, plus ADV2's preload-cap overflow | vendor-cited |
| portability | ADV1's frontmatter-whitelist signal | vendor-cited |
| security | ADV3's pattern screen | objective |
| Standard currency | the plugin's `library.json.standard` pin against this toolkit's shipped edition | house |

Every category reads a RAW measurement, recomputed straight from the check context (or, for currency
only, from the `ceiling` field `resolveFindings()` already attaches) - never from a module's
post-profile or post-suppression severity. A profile or a suppression can therefore buy a quieter gate
but never a better health score. `scripts/lib/health-score.mjs` is the implementation; see its own
docblock for exactly which function reads which raw signal.

**States a category can report:**

- `scored` - a real measurement and (once calibrated) a band.
- `ahead` - currency only: the pin is ahead of this toolkit's shipped Standard edition.
- `not-applicable` - nothing of the kind this category measures exists on the subject (e.g. substance
  with no parseable skill; currency with no pin, an unparseable pin, or the `0.x` baseline sentinel).
- `off-by-profile` - the active profile turns off house-provenance signals (today, `plain-plugin`).
  ADR 0063 sec 1 groups substance and currency together here: substance because ADV4 is house,
  currency because it reads `library.json`, the file `U1` (also house) covers.

## Pre-registered cut points (fixed 2026-10-30, before any corpus measurement)

Committed in `scripts/lib/advisory-registry.mjs` as `HEALTH_BAND_CUT_POINTS`, `HEALTH_SHIP_BAR` and
`HEALTH_CALIBRATION_MINIMUM`. Nothing on this page restates them as literals; both falsifiable tests
(`tests/unit/health-score.test.mjs`) import the same constants.

| Band | Score range |
| --- | --- |
| healthy | 80-100 |
| fair | 50-79 |
| weak | 20-49 |
| lowest | 0-19 |

A score is `100 * (1 - flagged / total)`, rounded, for the four scored categories (substance, budget,
portability, security). Bands apply to those four only - **currency has no band in this pass** (ADR
0063 sec 3: "A band would say how far behind is too far, and that is D-02's question"); it reports
minors-behind and a waived-by-pin count, nothing else.

**The ship bar** (ADR 0063 sec 4): for a category to show a band at all, it needs at least
`HEALTH_CALIBRATION_MINIMUM` (5) positive AND 5 negative labelled trees, AND it must clear two further
numbers before a band ships: a **false-positive ceiling** of 0 (no tree labelled `deserves: true` may
land in the lowest band) and a **separation floor** of 0.8 (at least 80% of labelled undeserving trees
must land below the top band). These numbers are pre-registered here, before the corpus measurement
that follows in a later commit, so a FUTURE calibration pass is checked against a bar fixed before
that pass ran.

**ADV4's own pre-registered thresholds** (`scripts/advisory/adv4-substance.mjs`): a body-word-count
floor of 20 words, a sibling-description Jaccard-similarity duplicate threshold of 0.7, and a generic
placeholder-phrase catalogue that contains none of any fixture's literal words (ADR 0063 sec 4: "No
placeholder matcher may contain the fixture's literal strings, such as `Do nothing.`").

## The falsifiable test, and what it asks

ADR 0063 sec 4 names two tests, both importing the cut points above rather than restating them:

1. `tests/fixtures/audit-corpus/potemkin-gold/` must land in the lowest substance band. Measured: its
   three skills each carry a 2-word body ("Do nothing.") and an identical description, so
   `underFloorCount` = 3, `duplicateDescriptionCount` = 3, `flaggedCount` = 3 of 3 - score 0, well under
   the 20-point "lowest" ceiling. Its `placeholderCount` is 0: the generic catalogue does not special-
   case this fixture's words, so the floor-and-duplicate signals alone carry the result, exactly as sec
   4 requires ("the test must still pass with the placeholder-body signal removed").
2. `tests/fixtures/audit-corpus/pin-abuse/` (pinned `"standard": "0.9"`) must show currency debt.
   Measured: `minorsBehind` = (this toolkit's shipped minor) minus 9, and `waivedCount` = 11 - the same
   11 warnings `tests/fixtures/audit-corpus/README.md` already documents as "every warning a downgrade
   bought by the pin".

Both numbers are derived, never literals, in `tests/unit/health-score.test.mjs`.

## Calibration: method, corpus, and a divergence from the ADR this change must record

ADR 0063 sec 4 says the labelled 2026-09-04 audit corpus "must become a tracked fixture" under
`tests/fixtures/audit-corpus/`, with the categories field and justifications committed to that tracked
copy. **The task that commissioned this change overrides that instruction**: the corpus stays
read-only and gitignored under `_local/audit/2026-09-04_fable-5-1-max/`, and this change does not copy
any of its 46 plugin trees into the repository. What follows is the reconciliation: the category label
ASSIGNMENTS and their one-line justifications - which are data ABOUT the corpus, not the corpus itself
- are committed here, in this tracked page, exactly as sec 4 requires them to be fixed before any
confusion count is computed. The two trees the falsifiable tests grade (`01-potemkin-gold`,
`09-pin-abuse`) are ALREADY tracked, byte-for-byte, under `tests/fixtures/audit-corpus/`. The other 44
trees are read directly from their `_local/` location by the one-time measurement that produced the
confusion counts below; none of them is committed. **This is a decision for the maintainer to confirm**:
the ADR's own words are "a threshold calibrated against an untracked set is an assertion nobody can
re-run" - that cost is accepted here, for the 44 non-fixture trees, because the task's instruction is
more specific and more recent than the ADR's general preference, but it is a real cost and the ADR's
"must become a tracked fixture" sentence is not satisfied for those 44 trees by this change.

**How labels map to categories.** A tree is a positive for a category only if its undeserving reason
(the manifest's free-text `note`) falls in that category. The seven `deserves: true` trees are
negatives for every category. The twelve `deserves: null` trees (symlink loops, a 50 MB skill, and
similar hardening cases) are excluded from calibration entirely, per sec 4. The two falsifiable-test
fixtures (`01-potemkin-gold`, `09-pin-abuse`) are held out of every count, per sec 4, to avoid
calibrating the cut points to the test that grades them.

| Tree | `deserves` | Categories | Justification |
| --- | --- | --- | --- |
| `01-potemkin-gold` | false | substance | HOLD-OUT (falsifiable test fixture). 33 placeholder files; every skill body reads "Do nothing." - exactly ADV4's signal. |
| `01b-potemkin-ci-swallowed` | false | (none) | CI wiring (`\|\| true` swallows the gate); not a health category. |
| `02-excellent-orphan` | true | (none) | Real skills a working engineer would keep; negative control for every category. |
| `03-description-gaming` | false | substance | Gamed descriptions should warn; exactly ADV4's duplicate/placeholder territory. |
| `04-budget-gaming` | false | budget | Instruction-budget evasion (`bg-wide`, `bg-refs`, `bg-checklist`); exactly the budget category. |
| `05-emission-divergence` | false | (none) | Cross-runtime manifest divergence; not a health category. |
| `06-chain-lie` | false | (none) | Chain-contract / eval-coverage gap; not a health category. |
| `07a-silent-drift-index` | false | (none) | `INDEX.md` description drift; not a health category. |
| `07b-silent-drift-claude-manifest` | false | (none) | `.claude-plugin/plugin.json` drift; not a health category. |
| `07c-silent-drift-generated-manifest` | false | (none) | `manifest.generated.json` drift; not a health category. |
| `07d-silent-drift-codex-skills-path` | false | (none) | `.codex-plugin/plugin.json` path drift; not a health category. |
| `08-phantom-subagent` | false | (none) | Phantom subagent registration (`README.md`/`_notes.md` loaded as agents); not a health category. |
| `09-pin-abuse` | false | currency | HOLD-OUT (falsifiable test fixture). Pinned `0.9`, violates 8 post-0.9 requirements; exactly the currency signal. |
| `09b-pin-garbage` | false | currency | Pin-state variant of `09` (unparseable pin). Excluded from calibration (sec 4: "test the pin states ... rather than a threshold"). |
| `09c-pin-sentinel` | false | currency | Pin-state variant of `09` (`0.x` baseline sentinel). Excluded from calibration, same reason. |
| `09d-pin-future` | false | currency | Pin-state variant of `09` (pin ahead of shipped). Excluded from calibration, same reason. |
| `10a-g2-dispatch-only` | false | (none) | CI-gate-wiring gaming (`workflow_dispatch` only); not a health category. |
| `10b-g2-continue-on-error` | false | (none) | CI-gate-wiring gaming (`continue-on-error: true`); not a health category. |
| `10c-g2-if-false` | false | (none) | CI-gate-wiring gaming (`if: false`); not a health category. |
| `10d-g2-echo` | false | (none) | CI-gate-wiring gaming (the run line only echoes); not a health category. |
| `10e-g2-grades-other-path` | false | (none) | CI-gate-wiring gaming (grades an empty directory); not a health category. |
| `11-malformed-grader-config` | true | (none) | Clean Bronze plugin plus an unparseable `askit.config.json` (an operator defect, not the plugin); negative control. |
| `12-entry-version-and-path-lie` | false | (none) | `library.json` entry version/path lie; manifest-integrity gap, not a health category. |
| `13-agents-md-drift` | false | (none) | `AGENTS.md` drift (missing file, inflated skill count); not a health category. |
| `14-empty-plugin` | null | (none) | Hardening case (no skills at all); not used for calibration. |
| `15a-mono-s-error` | false | (none) | Tier-computation edge case (one Convergent error); not a health category. |
| `15b-mono-u-error` | false | (none) | Tier-computation edge case (one Universal error); not a health category. |
| `15c-mono-g-error` | false | (none) | Tier-computation edge case (one Gold error); not a health category. |
| `16-history-missing-at-silver` | false | (none) | Missing `HISTORY.md` at Silver; not a health category. |
| `17-secret-in-skill-and-hook` | false | security | AWS-style key and a `curl\|bash` installer in a skill/hook body; exactly ADV3's screen. |
| `h01-symlink-escape` | null | (none) | Hardening case (symlink escaping the plugin root); not used for calibration. |
| `h02-symlink-loop` | null | (none) | Hardening case (symlink loop); not used for calibration. |
| `h03-deep-nesting` | null | (none) | Hardening case (300-level directory nesting); not used for calibration. |
| `h04-case-collision` | null | (none) | Hardening case (case-collision on a case-sensitive filesystem); not used for calibration. |
| `h05-crlf` | true | (none) | Encoding hardening case (CRLF body); negative control, not itself a category signal. |
| `h06-bom` | true | (none) | Encoding hardening case (UTF-8 BOM); negative control. |
| `h07-latin1` | true | (none) | Encoding hardening case (Latin-1 body); negative control. |
| `h08-non-english` | true | (none) | Non-English (French/Japanese) description of real quality; negative control. |
| `h09-yaml-anchors` | true | (none) | YAML anchor/alias frontmatter; negative control. |
| `h10-yaml-bomb` | null | (none) | Hardening case (billion-laughs frontmatter); not used for calibration. |
| `h11-50mb-skill` | null | (none) | Hardening case (50 MB `SKILL.md` body); not used for calibration. |
| `h12-redos-backticks` | null | (none) | Hardening case (ReDoS probe, inline-code stripper); not used for calibration. |
| `h13-redos-npx-flags` | null | (none) | Hardening case (ReDoS probe, G2's `NPX_GATE`); not used for calibration. |
| `h14-redos-sourcedoc-spaces` | null | (none) | Hardening case (ReDoS probe, G9's label regex); not used for calibration. |
| `h15-broken-mermaid-and-empty-fence` | null | (none) | Hardening case (malformed mermaid); not used for calibration. |
| `h16-huge-description-and-name` | null | (none) | Hardening case (oversized description/name); not used for calibration. |

## Confusion counts (measured 2026-10-30, after the assignments above were fixed)

Excluding the two hold-outs (`01-potemkin-gold`, `09-pin-abuse`) and its pin-state variants
(`09b`/`09c`/`09d`, excluded per the table above), and excluding every `deserves: null` tree:

| Category | Positives | Negatives | Calibrated? |
| --- | --- | --- | --- |
| substance | 1 (`03-description-gaming`) | 7 | **uncalibrated** - below the 5-positive minimum |
| budget | 1 (`04-budget-gaming`) | 7 | **uncalibrated** - below the 5-positive minimum |
| portability | 0 | 7 | **uncalibrated** - below the 5-positive minimum |
| security | 1 (`17-secret-in-skill-and-hook`) | 7 | **uncalibrated** - below the 5-positive minimum |
| currency | 0 (both trees testing it are hold-out/excluded) | 7 | **uncalibrated** - below the 5-positive minimum |

Every category reports `uncalibrated` on this ship, exactly as ADR 0063 sec 4's own provisional reading
predicted ("on the first ship, every banded category will report uncalibrated and show no band"). The
measurements and component counts still show on every report; only the band is withheld. Growing the
labelled set past 5-and-5 per category is not decided here.

## This repository's own health (reported as an observation, never an acceptance criterion)

Per ADR 0063 sec 4: "this repository's own band is reported, never an acceptance criterion... if a
category penalises this repository, report it and fix the tree, never the threshold." Measured
2026-10-30 against this toolkit's own tree (`node scripts/evaluate.mjs . --json`):

| Category | State | Components | Measurement |
| --- | --- | --- | --- |
| substance | scored | 27 | 0 of 27 flagged, score 100 |
| budget | scored | 34 | 0 of 34 flagged, score 100 |
| portability | scored | 27 | 0 of 27 flagged, score 100 |
| security | scored | 148 | 0 of 148 flagged, score 100 |
| currency | scored | 1 | 0 minors behind, 0 waived |

No category penalised this repository as of this measurement; there is nothing to fix.

## ADV3 false-positive ceiling record

Moved here from `scripts/advisory/README.md` (W6): both this record and the health cut points above
answer "what was pre-registered, and what did measuring it show" for the same advisory layer.

**The false-positive ceiling (pre-registered 2026-10-25, BEFORE any measurement commit; ADR 0063 /
RS-E4's required ceiling, criterion 1).**

> **At most 1 false fire per 200 scanned files, a rate of 0.005 or below, over the family corpus. If
> the measured family rate exceeds this ceiling, the catalogue does not ship:** ADV3 is committed
> (module, catalogue, fixtures, tests) but left out of `ADVISORY_MODULES` in
> `scripts/lib/advisory-registry.mjs`, and the measurement is recorded anyway, never silently omitted.

- **Denominator** = the number of files `listScanTargets()` returns over a tree (every in-scope file
  that passes the size and binary filter `scripts/advisory/README.md` documents). This is the same
  function `check()` scans, so the count a measurement reports can never drift from what was actually
  scanned.
- **Numerator** = the number of findings, among those produced over the denominator's files, that are
  **false fires** on manual examination. A false fire is a finding whose matched text is NOT a genuine
  instance of the construct its pattern's class names - the regex over-matched ordinary, unrelated text
  (for example, `prompt-injection-role-hijack`'s `you are now a/an ...` matching a benign persona
  assignment that names no prior instruction at all). A finding where the construct genuinely IS
  present - a real pipe-to-shell installer, a real destructive command, a real instruction-override
  phrase - is a **genuine fire** and never counts against the ceiling, regardless of whether the
  author's intent was malicious: the screen reports presence of the construct, not intent (RS-E4's own
  design constraint). A genuine fire is recorded as a record note instead of a false-positive count.
  Genuine fires are additionally split, where it matters to the record, into "an instruction to
  actually run the construct" versus "prose that discusses or names the construct without instructing
  its execution" - this split is informational and never changes the false-fire classification, because
  ADV3 is a presence screen, not an intent classifier.
- **Population: the family corpus and the audit corpus are measured and reported SEPARATELY, and their
  rates are never pooled.** The family corpus is this repository (the main checkout) plus the five
  `askit-own-plugins` clones (`critique-skills`, `pm-skills`, `product-lifecycle-templates`,
  `thinking-framework-skills`, `writing-style-catalog`) - six trees, all the maintainer's own work. The
  audit corpus is the seven trees the 2026-09-04 audit (`_local/audit/2026-09-04_fable-5-1-max/`)
  labelled as deserving their declared tier: `02-excellent-orphan`, `11-malformed-grader-config`,
  `h05-crlf`, `h06-bom`, `h07-latin1`, `h08-non-english`, `h09-yaml-anchors`. These seven trees (and the
  rest of the labelled corpus) are not tracked under `tests/fixtures/` - see the divergence note above.
- **A pattern may be fixed BEFORE the measurement commit** if it is plainly wrong (for example, one that
  matches a single common word alone, with no surrounding construct). After the measurement commit, any
  change to a pattern requires a full re-measurement, and both measurements are recorded here, never
  only the second.

**Measured 2026-10-25 (RS-E4 criterion 1), after the ceiling above and the implementation were both
already committed.** Family corpus (this repository's main checkout, plus the five `askit-own-plugins`
clones; six trees, all read-only to this measurement): 1,186 files scanned, 0 findings, 0 false fires -
rate 0/1186 = 0, within the 0.005 ceiling. Audit corpus (the seven trees above): of the 20 files the
labelled set carries, **14 were scanned directly from the two trees materialized on disk**
(`02-excellent-orphan`, `11-malformed-grader-config`) and **6 (`h05`-`h09`) could not be checked
independently** - those five trees are not materialized on disk under the corpus's current layout
(`build.mjs`'s own path resolution predates the corpus being moved under a dated folder), so this
measurement reconstructed their file content from `build.mjs`'s own generator source, unexecuted and
read-only, into a scratch directory outside the corpus tree, rather than from a committed, independently
re-runnable source. Both halves scanned 0 findings, 0 false fires. **Combined: 14 verified files + 6
reconstructed files = 20 files, 0 findings, 0 false fires.** The pre-registered ceiling gates on the
family rate only (**rate 0/1186 = 0, well within the 0.005 ceiling**); the audit-corpus rate is reported
for completeness, with its 14/6 split stated plainly rather than presented as 20 equally-verified files.
No genuine fire occurred either (role-hijack, the one pattern whose known-limits note flagged a real
false-positive risk against ordinary persona-assignment prose, did not fire on any of the 1,206 files),
so there is nothing to record as a record note for this measurement. **Shipped: true. ADV3 is registered
in `ADVISORY_MODULES`** (`scripts/lib/advisory-registry.mjs`) as of this commit, because the measured
family rate clears the pre-registered ceiling.

This repository's own count: 148 files scanned under this toolkit's own tree, 0 ADV3 findings.

**Measurement 2 (2026-10-25, after a post-measurement-1 pattern fix).** The timing test that
accompanied measurement 1 used a generic adversarial-line heuristic that never actually entered any
pattern's backtracking region (confirmed: it passed in under a millisecond against every pattern even
while three were genuinely quadratic). Once the timing test was corrected to build a per-pattern
adversarial line from each pattern's own unbounded sub-expression, three patterns failed it:
`dangerous-command-rm-recursive-force` (2339ms against a 100,000-character line), and
`dangerous-command-curl-download-execute` / `dangerous-command-wget-download-execute` (1312ms against a
220,000-character line) - all three measured well over the 2000ms liveness bound. Per this heading's
own pre-registered rule ("a pattern may be fixed BEFORE the measurement commit if it is plainly wrong
... after it, any pattern change requires a full re-measurement, and both measurements are recorded
here"): this is AFTER measurement 1's commit, so the fix is recorded as its own measurement rather than
silently folded into measurement 1. All three matchers were bounded (the vendor's unbounded `.*`/`\w*`
spans capped at 8-300 characters, which does not change which real-world command lines match - no
legitimate command line carries an 8-letter flag run or a 300-character argument) and re-measured:
family corpus 1,186 files / 0 findings, audit corpus 14 verified + 6 reconstructed files / 0 findings,
combined 1,206 files / 0 findings - the same zero rate as measurement 1, because bounding a matcher only
narrows it and cannot introduce a match that was not already there. **Shipped: still true; no change to
the registration.** This measurement's own timing test still used only a letter-run adversarial line per
pattern (the shape that caught these three); it did not yet try a plain space-run or repeated-token
line, which is what measurement 3 below catches on four OTHER patterns - this fact is recorded here, not
edited into the past, so the gap in measurement 2's own test coverage is visible in the record.

**Measurement 3 (2026-10-25, after a review of measurement 2 found four further patterns genuinely
quadratic).** A review of measurement 2 found that its per-pattern adversarial lines - each a trigger
word followed by a run of a repeated LETTER - never entered the backtracking region of four OTHER
patterns whose unbounded span is `\s+` followed by `.*` or `.*\|`: a run of plain SPACES (which `\s+` can
itself absorb in many different splits) is what is needed to enter that region, not a run of letters.
Measured directly against the then-current (post-measurement-2) catalogue, before any further change:
`pipe-to-shell-curl` 2936ms, `pipe-to-shell-wget` 2920ms, `pipe-to-shell-curl-sudo` 2933ms, and
`dangerous-command-dd-to-device` 2790ms, each against a `"<trigger> " + " ".repeat(100_000)` line (all
well over the 2000ms bound); a second repeated-token shape (`"<trigger> ".repeat(20_000)`) measured
337-589ms at a single length (60,000-100,000 characters) on the same four patterns - one data point per
pattern, not a multi-length series, but consistent with the same quadratic growth the review's own
4,000-to-50,004-character series showed directly on this shape before bounding. All four matchers were
bounded the same way as measurement 2's three (the unbounded `.*`/`\s+.*` span capped at 300 characters,
which does not change which real-world command lines match - no legitimate single command line carries
a 300-character argument between `curl`/`wget`/`dd` and the pipe or `of=/dev/`) and re-measured at 7-37ms
against the same lines. The timing test (`tests/unit/adv3-security.test.mjs`) was restructured to check
every pattern against three generic adversarial shapes (a space run, a repeated-token run, and a letter
run, each built from the pattern's own trigger word) plus a pattern-specific line where one is needed,
rather than one hand-picked shape per pattern, so a fifth matcher shaped like these four cannot pass the
same way these four did against measurement 2's narrower test. Re-measured: family corpus 1,186 files /
0 findings (rate 0/1186 = 0, within the 0.005 ceiling - this is what the pre-registered rule gates on).
Audit corpus: the 14 verified files (`02-excellent-orphan`, `11-malformed-grader-config`) were
re-scanned directly from disk, 0 findings. **The 6 reconstructed `h05`-`h09` files were NOT re-scanned
this round** - the scratch reconstruction measurements 1 and 2 used no longer exists (it was session-
scoped scratch, not a committed artifact), and `build.mjs`'s own path resolution is confirmed broken
under the corpus's current layout (verified directly: it resolves `REPO` to a doubled, invalid Windows
path), so reconstructing them again was not attempted this round rather than silently skipped. By the
same narrowing argument stated above, bounding a matcher cannot have introduced a match in those 6
files that measurement 2 did not already find (0), but that is an inference from the matcher change,
not a measurement - it is recorded as such, not folded into a false "re-measured" combined count. This
round's audit-corpus total is therefore **14 scanned, 0 findings**, not 20; the combined scanned count
for measurement 3 is **1,200 files, 0 findings**, not the 1,206 of measurements 1-2. `addLoaded()` (the
`ctx.agentDocs`/`ctx.commands` loader inside `listScanTargets()`) was also found, in the same review, to
skip the 1,000,000-byte size filter and the NUL-byte binary filter that `addFromDisk()` already applied;
it now applies both, which does not change this measurement's denominator (no family or audit-corpus
file in scope is oversized or binary-looking) but closes the gap for a future tree that has one.
Measurement 2's own text above states the `dangerous-command-curl-download-execute`/`wget` figure as
"1312ms ... well over the 2000ms liveness bound" - 1312 is in fact under 2000, so that sentence is
inconsistent with the figure it reports. Left as written rather than silently edited; the record does
not show why it was written that way, and this is flagged here as a record note for the main loop
rather than resolved with an invented explanation. **Shipped: still true; no change to the
registration.**

**Correction to measurement 2 (2026-10-25, by measurement, not inference).** The original
`dangerous-command-curl-download-execute` and `dangerous-command-wget-download-execute` matchers (from
commit `dbb36a8`) were re-timed against the same `"curl " + " && chmod x".repeat(n)` shape at five
lengths. Each doubling of the line roughly quadrupled the time: about 21ms at 27,505 characters, 84ms
at 55,005, 331ms at 110,005, 1,314ms at 220,005, and 5,209ms at 440,005. So both matchers were
genuinely quadratic, and bounding them was right. What measurement 2 got wrong is one clause: at
220,005 characters they took about 1,314ms, which is UNDER the 2000ms bound, not "well over" it. The
timing test would not have failed on them at that length. The same re-timing confirms
`dangerous-command-rm-recursive-force`'s figure: 2,383ms at 100,004 characters, over the bound. **The
timing test's lines are now 300,000 characters** (`LINE_LENGTH` in `tests/unit/adv3-security.test.mjs`),
three times the length the measurements used, because the four patterns measurement 3 bounded had
failed the bound by only 40 to 48 percent at 100,000 characters.
