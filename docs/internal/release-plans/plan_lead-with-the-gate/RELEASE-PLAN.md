---
title: "Plan: retire the medal names, and lead with the gate"
description: "A proposed plan to stop presenting the tiers as Bronze, Silver and Gold, and to lead every public surface with the library gate, its health number and its evidence"
status: proposed
last-updated: "2026-10-30"
---

# Plan: retire the medal names, and lead with the gate

**Status: PROPOSED 2026-10-30. Nothing here executes until the maintainer rules on it.** The ruling is
recorded in a new ADR (step 1), not in this file, because reasoning lives in ADRs and this plan only
sequences work.

**Why this plan exists.** The tiers present as medals: Bronze, Silver and Gold. A medal reads as a quality
award, and the tier is not one. A plugin of placeholder files earns Gold today
(`tests/fixtures/audit-corpus/potemkin-gold/`), and the toolkit's own pinned sentence says the tier "is
not a content review, a safety audit, or a statement that the skills work" (`TIER_SCOPE_SENTENCE` in
`scripts/lib/tier-scope.mjs`). The toolkit's one unoccupied position is a deterministic gate over a whole
plugin library ([ADR 0066 (the goal is the builder whose libraries are proven to work, and "best" is
measured, not claimed)](../../decisions/0066-the-goal-is-the-builder-whose-libraries-are-proven-and-best-is-measured.md),
Proposed). The public story should lead with that gate, and the tier should become a setting inside it.

**What does not change.** The rules, the checks, the tier logic, the burndown ("what the next level
needs"), the exit codes and every machine identifier stay exactly as they are. This is a vocabulary and
positioning change, not a rule change.

## What was measured, 2026-10-30

| Surface | Today | Source |
|---|---|---|
| Machine identifiers | Already neutral: `universal`, `convergent`, `advanced` | `TIER_ORDER` in `scripts/lib/tier.mjs`; `library.json` `tier` |
| Action `tier` output | Already neutral: `"universal"`, `"convergent"`, `"advanced"` or `"none"` | `action.yml` outputs |
| CLI summary line | Already neutral: `Tier: Advanced (no blockers detected)` | `node scripts/check.mjs .` |
| Medal mapping | `TIER_NAME = { universal: "Bronze", convergent: "Silver", advanced: "Gold" }`, imported by five scripts | `scripts/lib/tier.mjs:16` |
| The tier badge | `Advanced (Gold) @ <sha> - Standard 0.17 - <date>`, colored bronze, silver or gold | `scripts/gen-tier-badge.mjs`; the live `badges/tier.json` |
| Action description | "the Bronze, Silver or Gold tier it earns" | `action.yml:49` |
| README tier claim | `scripts/check-readme-version.mjs` requires a README to name the declared tier, and accepts the medal or the scope word | `TIER_NAME` and `TIER_SUB` in its matcher |
| `STANDARD.md` | Headings already lead with the scope word: "Tier 1 - Universal (Bronze)". The medals appear in sec 0's terminology, sec 2 and sec 2.5's table | `STANDARD.md` lines 51 and 73 to 129 |
| Toolkit, all tracked files | 323 files and 1,997 lines name a medal. 127 of those files are under `docs/internal/` | `git grep -w -E "Bronze|Silver|Gold"`, excluding `CHANGELOG.md` |
| Family README and docs lines | critique-skills 176, thinking-framework-skills 112, product-lifecycle-templates 29, writing-style-catalog 13, pm-skills 9 | the same grep at each plugin's pinned commit |

**The machine layer is already neutral.** The medals live in prose, in one mapping, in the badge and in the
Action's description. That makes the change cheap at the code level and broad at the prose level.

## The decision to rule on (step 1 drafts it as ADR 0067)

**Option A, recommended: promote the existing scope words to the human names.** The levels become
Universal, Convergent and Advanced everywhere a person reads them. No identifier changes, and `STANDARD.md`
already leads with these words.

**Option B: new plain names,** for example Baseline, Consistent and Complete. They might read more
plainly to a newcomer, but a fourth vocabulary would sit beside the identifiers, and every surface would
need a translation table.

**Option C: keep the medals.** The status quo. It costs nothing, and it keeps the misleading implication.

**Why A.** It removes the quality-medal implication with the fewest new words. It also makes the human
name and the machine name the same word, so a reader never needs a mapping.

**The second half of the decision: lead with the gate.** Every public surface opens with "a deterministic
CI gate for a whole plugin library", then the health number and the evidence beside it, and only then the
level a plugin declares. The ADR states this as positioning, and step 4 applies it.

## Is it a Standard revision?

**No edition bump is proposed, and the ADR must say so explicitly.** The change renames terms. It adds,
removes and tightens no rule, so it has no burndown and cannot make a passing plugin fail.
[ADR 0063 (an advisory layer beside the tier, and a health number that never enters it)](../../decisions/0063-an-advisory-layer-beside-the-tier-and-a-health-number-that-never-enters-it.md)
set the precedent for amending `STANDARD.md` without an edition bump. The 2026-10-04 ruling that rule
changes ride together in Standard 0.18 covers rules, and this is not one. **If the maintainer reads that
ruling as covering terminology too, the rename rides 0.18 instead, and steps 3 to 5 wait for it.**

**Checked 2026-10-30: the edit does not disturb the standards watch.** `scripts/lib/standards-watch.mjs`
hashes the fetched agentskills.io upstream, pinned in `foundation/claims/upstream-pin.json`. It does not
read this repository's `STANDARD.md`. So a terminology edit here does not restart E58's (should
standards-watch gate release-ready) count of clean scheduled runs.

## Steps

1. **Draft ADR 0067 (the level names and leading with the gate).** It records option A or the
   maintainer's choice, the no-bump reasoning above, and the surfaces below. Status Proposed until ruled.
2. **Measure the baseline for C3 before changing anything.** ADR 0066's criterion C3 is a newcomer's time
   to a first green gate. Script the run in an empty directory, following
   `docs/tutorials/start-a-plugin-and-reach-bronze.md`. Record the commands, the wall-clock time and
   every step that failed. This is the "before" half of this plan's acceptance evidence.
3. **Make the toolkit accept both vocabularies, and change nothing else yet.**
   - `scripts/check-readme-version.mjs` already accepts either word. Confirm it with a test that a README
     using only the scope word passes for every level.
   - Add a test that pins the badge message's new shape before changing it.
   - Measure the blast radius with the harness at `E:/tmp/askit-logs/blast-radius.mjs` over the six
     pinned family clones and every fixture tree. The required tier, error-count and exit-code delta is
     zero.
4. **Change the toolkit's public surfaces.**
   - `TIER_NAME` maps to the scope words, or is retired in favour of `TIER_SUB`; every importer is
     updated in the same change.
   - The badge reads `Advanced @ <sha> - Standard 0.17 - <date>`. Its colors stop being metal colors.
   - `action.yml:49`'s description leads with the gate: "Gates a whole Claude Code or Codex plugin
     library against a written Standard: the level it meets, inline annotations, SARIF, and a health
     number beside the result."
   - `STANDARD.md` sec 0, sec 2 and sec 2.5 drop the medal parentheticals, with a version note saying the
     change is terminology only.
   - The README, `INDEX.md`, the docs site home, the three tutorials, `askit-onboard` and every builder
     skill's prose lead with the gate and use the scope words.
   - **The tutorial filenames stay as they are; only their titles and prose change.** Renaming
     `start-a-plugin-and-reach-bronze.md` or `climb-to-gold.md` would move docs-site routes, trip the
     route-parity check and need redirects. Six live pages and ADR 0066's C3 cite the first path. A file
     name is an address, not a claim, so keeping it costs nothing a reader sees.
   - The README opens with the gate, then health, then evidence, then levels.
   - **Tests that assert medal strings are updated in the same change.** About 30 test files name a
     medal: the badge-message test, the `check-readme-version` synonym tests and the doc-enumeration
     tests among them. Their expectations move to the scope words. Fixture names do not change.
5. **Migrate the family, one pull request per plugin.** Each plugin's README and docs move to the scope
   words. critique-skills (176 lines) and thinking-framework-skills (112 lines) are the large ones. Each
   PR is graded before and after, and each merges and releases on the maintainer's go.
6. **Stop accepting the medal words in a later release,** after every family plugin has migrated.
   `check-readme-version.mjs` then treats a medal word as a contradiction with the declared level. This
   step is the only one that can red a gate, so it waits for the family.
7. **Measure C3 again** with the same script, and record both results in the ADR's implementation notes.

## What is deliberately left alone

- **`docs/internal/`** (127 files): history, release plans and ADRs. ADRs are immutable once accepted,
  and history is not rewritten.
- **`CHANGELOG.md` and `RELEASE-HISTORY.md` entries** for shipped releases.
- **Test data names,** such as the `potemkin-gold` fixture. They name test data, not a user surface. The
  tests that grade them keep passing because the tier logic does not change. Tests that assert a medal
  string in output are a different case, covered in step 4.

## Acceptance

- ADR 0067 is ruled.
- No tier, error count or exit code moves for any family plugin or fixture tree (the harness exits 0).
- No user-facing surface outside the "left alone" list names a medal: `git grep -w -E "Bronze|Silver|Gold"`
  over `README.md`, `INDEX.md`, `STANDARD.md`, `action.yml`, `docs/` excluding `docs/internal/`, `site/src/`
  and `skills/` returns only lines this plan explains.
- C3 is measured before and after, and both numbers are recorded, whichever way they move.

## Risks

- **A plugin outside the family that names a medal in its README.** None is known: GitHub code search on
  2026-10-30 found no workflow outside the maintainer's organisations using the Action. Step 6 still
  waits a release, so any such plugin gets a warning before an error.
- **Search and recognition.** "Gold" is a familiar word, and the scope words are not. C3 measures whether
  newcomers are slowed. If they are, that result goes back to the ADR rather than being argued away.
