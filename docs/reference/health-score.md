---
title: "Health score reference"
description: "The health number beside the tier (ADR 0063) - the five categories, pre-registered cut points, and the category-label assignments the calibration corpus needs."
audience: engineer
level: intermediate
tags: [health, advisory, calibration, substance, currency, adv4]
---

# Health score reference

This page is the pre-registered home for the health number (ADR 0063 sec 3), the W6 implementing
change. It holds the cut points, fixed BEFORE any measurement, and the category label assignments
the calibration corpus needs, also fixed before measurement, in the order ADR 0063 sec 4 requires
them to exist. A later commit of this same change adds the confusion counts and this repository's
own result, reported as observations once both are fixed, plus the ADV3 (the security screen)
false-positive ceiling record moved here from `scripts/advisory/README.md`.

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

## The falsifiable tests this ADR names

ADR 0063 sec 4 names two tests, both importing the cut points above rather than restating them:

1. `tests/fixtures/audit-corpus/potemkin-gold/` must land in the lowest substance band.
2. `tests/fixtures/audit-corpus/pin-abuse/` (pinned `"standard": "0.9"`) must show currency debt.

A later commit of this same change adds the measured numbers behind each assertion.

## Calibration corpus: the category label assignments (fixed before any confusion count)

ADR 0063 sec 4 says the labelled 2026-09-04 audit corpus "must become a tracked fixture" under
`tests/fixtures/audit-corpus/`, with the categories field and justifications committed to that tracked
copy. **The task that commissioned this change overrides that instruction**: the corpus stays
read-only and gitignored under `_local/audit/2026-09-04_fable-5-1-max/`, and this change does not copy
any of its 46 plugin trees into the repository. What follows is the reconciliation: the category label
ASSIGNMENTS and their one-line justifications - which are data ABOUT the corpus, not the corpus itself
- are committed here, in this tracked page, exactly as sec 4 requires them to be fixed before any
confusion count is computed. The two trees the falsifiable tests grade (`01-potemkin-gold`,
`09-pin-abuse`) are ALREADY tracked, byte-for-byte, under `tests/fixtures/audit-corpus/`. The other 44
trees are read directly from their `_local/` location by the one-time measurement a later commit adds;
none of them is committed. **This is a decision for the maintainer to confirm**: the ADR's own words
are "a threshold calibrated against an untracked set is an assertion nobody can re-run" - that cost is
accepted here, for the 44 non-fixture trees, because the task's instruction is more specific and more
recent than the ADR's general preference, but it is a real cost and the ADR's "must become a tracked
fixture" sentence is not satisfied for those 44 trees by this change.

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
