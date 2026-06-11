# 0033 - Recalibrate U5 (description-score) against the eval-run corpus

## TL;DR
- **Decision:** Recalibrate the U5 description scorer (`scripts/checks/description-score.mjs`) so its score tracks "would this description trigger correctly" instead of "did it use the scorer's exact word list". Three surgical changes, all evidence-cited from the eval-run corpora: (1) the **ACTION** lexicon accepts each verb's inflections (creates / creating / created) and adds the action verbs real high-quality descriptions actually use (draft, review, diagnose, merge, split, rotate, fill, encrypt/decrypt, run, plan, the "Help users [verb]" stem, "break down"); (2) the **WHEN** trigger recognizes "use this skill whenever", "whenever the user", and "if the user asks/mentions/wants/needs" alongside the existing "use when" forms; (3) the blanket all-caps penalty (`\b[A-Z]{4,}\b`, which dinged legitimate trigger acronyms like GDPR - exactly the keywords U5's own remediation message tells authors to add) is replaced by a hard **-0.4 placeholder penalty** on TODO / TBD / FIXME / XXX / PLACEHOLDER / CHANGEME, closing the inverse defect where "TODO: write a description. Use when needed." scored 0.9. `THRESHOLD` stays **0.7**; severity stays **warn**; provenance stays **house** (ADR 0029, reclassify U2/U5 as house); spine stays 29, Standard stays 0.11.
- **Why:** Nine recorded eval runs (docs/internal/eval-runs/, batches 2026-06-10 and 2026-06-10b) made the mis-scoring systematic and multi-corpus: 50 of 86 lenny-skills descriptions sat at exactly 0.65 off one strong template stem, both graded Anthropic skills sat at 0.65 (gerunds; a "whenever" trigger), phuryn pm-toolkit's compliance skill sat at 0.55 for naming GDPR, and reviewer models at three tiers independently judged the flagged descriptions strong. The scorer was marking good students down for not using its favorite words - and passing unfinished placeholders.
- **Scope and honesty (measured, five corpora, default ladder):** U5 warnings drop **98 -> 18**: lenny-skills 50 -> 0, deanpeters 28 -> 9, phuryn pm-toolkit 4 -> 0, anthropics/skills 11 -> 6, cc-skills documentation-pipeline 5 -> 3. The 18 survivors were sampled and are the intended catch: noun-led descriptions with weak or missing use-when clauses (frontend-design 0.25, webapp-testing 0.30, theme-factory 0.55) plus genuine 0.65 borderliners. Not chased to zero on purpose - a noun-led description with no trigger clause is exactly what U5 exists to flag. The scorer remains a deterministic floor heuristic, not a judge: R9 (Opus/high) judged phuryn's privacy-policy description weak even though it now passes; that judgment layer is what review mode is for.
- **Status:** Accepted.

- **Date:** 2026-06-11
- **Deciders:** maintainer (jprisant), with Claude (Fable 5)

## Builds on
- ADR 0029 (reclassify U2/U5 as house provenance) - which removed U5 from third-party `plain-plugin` grading and explicitly deferred this recalibration as the honest fix for WHY it mis-scored.
- The eval-run record (`docs/internal/eval-runs/eval-runs.md`), batches 2026-06-10 / 2026-06-10b, sensor readings 5 and 10 - the multi-corpus evidence and the per-corpus traces.
- ADR 0027 (Standard versioning) - a calibration of HOW the check scores, not WHAT the Standard requires (sec 8.1 still requires a concrete action plus a use-when trigger), so no spine change and no Standard bump.

## Context and problem statement
U5 scores a skill description 0-1 (action verb 0.35, use-when trigger 0.35, length 0.2, no first person 0.1, penalties for vague stems / placeholders) and warns below 0.7. Three defects, each traced on the corpus:

- **ACTION matched only bare/s-form verbs from a 12-stem list.** "Guide for creating... Use when building..." (anthropics mcp-builder) missed because *creating*/*building* are gerunds; "Draft a detailed privacy policy..." (phuryn) missed because *draft* was absent; "Help users run better customer and user interviews..." (the lenny template, 50 of 86 skills) missed because *help users [verb]* was not recognized; "Diagnose context stuffing..." (deanpeters) missed because *diagnose* was absent. All landed at exactly 0.65 - the famous cluster.
- **WHEN missed real trigger phrasings.** "Use this skill whenever the user wants to do anything with PDF files... If the user mentions a .pdf file..." (anthropics pdf) is a model use-when clause that matched nothing in the WHEN list.
- **The all-caps penalty punished trigger keywords and under-punished placeholders.** "…GDPR and compliance considerations…" cost phuryn's privacy-policy 0.1 (0.55), while "TODO: write a description. Use when needed by the user." scored 0.9 - the penalty pointed at the wrong target in both directions.

## Decision drivers
- **Score fidelity, not bar movement:** the 0.7 threshold and warn severity are untouched; only what the score MEASURES changes.
- **Evidence-cited lexicon growth:** every added verb/phrase cites a corpus description that motivated it (see the test file); no speculative expansion.
- **One-directional safety with one deliberate exception:** recognizing more real actions/triggers only raises good descriptions; the placeholder penalty deliberately LOWERS unfinished ones (the corpus-proven inverse defect).
- **The dogfood constraint:** the toolkit's own 23 skills and the golden/anti fixtures keep their verdicts (gate stays Advanced 0/0).

## Considered options
1. **Recalibrate the heuristics against the corpus (chosen).** TDD with the real corpus strings as fixtures: six RED tests reproduced the exact recorded scores (0.65 x4, 0.55, and 0.9 for the TODO case), then the minimal regex changes turned them GREEN with all guards (the "Helps with stuff" anti-pattern, the weak-description fixture, golden fixtures) intact.
2. **Lower THRESHOLD to 0.6.** Rejected: hides the defect instead of fixing it; the 0.65 cluster would pass while the score still measured word-list compliance, and genuinely weak 0.65s would pass with it.
3. **Replace the heuristic with an LLM judge.** Rejected: U5 is part of the deterministic, model-free gate (Design Principle 3); judgment-quality description review is the advisory layer's job (askit-reviewer), which already does it.
4. **Retire U5.** Rejected: the surviving warns (noun-led, trigger-less descriptions at 0.25-0.55) are real, portable quality signals worth keeping as a floor - and ADR 0029 already scoped U5 out of third-party grading.

## Decision outcome
Option 1. `scripts/checks/description-score.mjs`: ACTION/WHEN extended as above; the `\b[A-Z]{4,}\b` penalty replaced by a case-sensitive `-0.4` on `TODO|TBD|FIXME|XXX+|PLACEHOLDER|CHANGEME`; the `[<>]` template-bracket penalty kept at -0.1. +7 tests (six corpus-derived, one anti-pattern guard), 395 total, gate Advanced 0/0.

## Consequences
- Strong third-party descriptions stop accumulating cosmetic warns under the default ladder, so a default-profile report's warning list regains signal density (98 -> 18 measured above).
- Unfinished placeholder descriptions now fail clearly (0.9 -> 0.5 for the TODO case) - a small behavior change in the strict direction.
- The lexicon remains a finite list and will need future evidence-driven additions; the eval-run record is the standing intake for that (the same observe -> verify -> calibrate path that produced this ADR).
- The U5 = house classification (ADR 0029) is unchanged: `plain-plugin` still drops U5 entirely; this ADR improves the default ladder and the advisory context only.
