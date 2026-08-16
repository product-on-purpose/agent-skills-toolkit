# 0049 - U5 abstains rather than failing a description it cannot read

## TL;DR
- **Decision:** `U5` (`description-score`) gains a **NOT-SCORED** outcome. Before scoring, it measures the description's **English function-word density**; below a floor of **0.10** it emits nothing and records that the description was not scored. No language-detection dependency, no per-language lexicon, no change to the scorer itself.
- **Why:** `U5` awards 0.35 of a 1.00 score for matching an English trigger-phrase regex, against a 0.70 threshold, so a description the regex cannot match caps at **0.65 and cannot pass at any quality**. On a 349-skill French corpus the regex fires on **0 of 346** parseable descriptions while **341 of them carry an explicit French trigger clause**. The check is not badly tuned for French; it is unpassable in French by construction.
- **Measured, on all seven corpora that are still on disk at their pinned shas.** Reading 18 reproduces exactly: French `WHEN` **0.0%**, `TerminalSkills` **69.4%**, `nimadorostkar` **98.5%**. Median English function-word density is **0.000** on the French corpus and **0.233** on the largest English one. At a 0.10 floor the design withdraws **343 of 346** French findings and costs **3 descriptions in 1376** across every English corpus combined. Family blast radius: **nothing moved.**
- **The backlog's recommended option (c) was prototyped and measured DEAD.** A language-independent structural signal for "states an occasion" - more than one substantive clause - fires on **99.9%** of all 2068 descriptions, including 94.4% of Anthropic's own. It cannot discriminate, so it cannot be a scoring component.
- **Status:** Accepted (ratified 2026-08-14).

- **Date:** 2026-08-14
- **Deciders:** maintainer (jprisant), with Claude (Opus 5)

## Builds on
- **ADR 0033 (recalibrate the `U5` description scorer)** - the precedent that a `U5` failure on good descriptions is a scorer defect rather than a target defect, established when a bare-stem ACTION list put strong third-party descriptions at exactly 0.65 across four corpora. This ADR does not re-open that calibration; it decides when the scorer should decline to produce a number at all.
- **ADR 0029 (reclassify `U2` and `U5` as house provenance)** - why the blast radius is bounded: under `plain-plugin`, the honest third-party grading mode, `U5` is dropped entirely. A non-English library graded the way you would grade a stranger's work never sees this finding today. The defect bites a library that ADOPTS this Standard and writes non-English descriptions.
- **ADR 0039 (marketplace-scope evaluation)** - the ratified precedent for the outcome this ADR introduces. A catalogue member that is merely ABSENT LOCALLY is `not-graded` and never reds. "We could not measure this" is already a first-class result in this codebase, and applying it to `U5` is consistency rather than novelty.
- **ADR 0048 (a command's description is not a trigger surface; amended 2026-08-15)** - the sibling. Both ADRs are the same underlying defect measured on a different population, and they are deliberately independent so either can be ratified without the other. See "The shared root cause" in ADR 0048.
- **E14** (`backlog/enhancements.md`), filed from corpus batch 3 reading 18, ADR-gated since v1.8.0.

## Context and problem statement

`scoreDescription` awards its 1.00 as: ACTION verb lexicon **0.35**, WHEN trigger-phrase lexicon **0.35**, length and lowercase substance **0.20**, absence of first person **0.10**, with penalties. The threshold is **0.70**. A description that cannot match WHEN therefore has a hard ceiling of **0.65**, one hundredth of a point short of a bar it can never reach.

Both lexicons are English. The consequence is not degraded scoring; it is a mathematically unreachable threshold for any language the lexicons do not cover.

**Reproduced, not recalled.** All eight pinned corpora in `docs/internal/eval-runs/corpus.json` are still on disk at their recorded shas. Re-measuring against the live scorer:

| Corpus | sha | n | `U5` pass | `WHEN` fires | `ACTION` fires |
|---|---|---|---|---|---|
| `anthropics/skills` | `57546260` | 18 | 61.1% | 61.1% | 88.9% |
| `RefoundAI/lenny-skills` | `280a57aa` | 86 | 100.0% | 100.0% | 100.0% |
| `deanpeters/Product-Manager-Skills` | `70fb6c4e` | 49 | 81.6% | 98.0% | 81.6% |
| `phuryn/pm-skills` | `d384f0c9` | 68 | 89.7% | 100.0% | 89.7% |
| `TerminalSkills/skills` | `7a5cc967` | 1018 | 56.7% | 69.4% | 80.9% |
| **`khalilbenaz/claude-skills-collection`** | `d71bc970` | 692 | **0.0%** | **0.0%** | 19.9% |
| `nimadorostkar/Claude-Skills-collection` | `c9055019` | 137 | 70.1% | 98.5% | 72.3% |

The three numbers reading 18 recorded - French `WHEN` 0 of 346, `TerminalSkills` 705 of 1016 (69.4%), `nimadorostkar` 134 of 136 (98.5%) - reproduce to the decimal. The French n of 692 rather than 346 is the whole-tree duplication that batch already recorded; there are 346 unique strings, and grading the corpus at HEAD returns exactly **346 `U5` findings**.

The clearest single case, from reading 18: `writing-proofreader-fr` scores **0.30** while containing *"À utiliser quand l'utilisateur veut relire, corriger ou améliorer un texte français"* - a word-for-word French rendering of the exact construction the WHEN regex exists to reward.

**What a low score currently asserts, and why that is wrong.** `U5` emits: *"description scores 0.30 (< 0.7); state what it does AND when to use it, with concrete trigger keywords."* Against `writing-proofreader-fr` every clause of that sentence is false. The description states what it does, states when to use it, and carries concrete trigger keywords. The check is not reporting a deficiency; it is reporting its own illiteracy in the grammar of a finding about the author.

## Decision drivers

- A check must not assert a defect it has no evidence for. A score of 0.30 is a claim about the description; "not scored" is a claim about the scorer, and only the second one is true here.
- No new runtime dependency. The gate is deterministic and model-free, and a language-detection library is neither small nor obviously deterministic across versions.
- Whatever ships must not silence real findings on the English population the check serves today.
- The fix must not move the same cliff one language over. Adding French vocabulary leaves German, Japanese and Portuguese exactly where French is now.

## Considered options

The backlog entry named four. All four were measured.

**Option (a) - detect the description's language and score only where a lexicon exists.** The backlog's joint first recommendation, and the shape this ADR adopts, but NOT via a language detector. A detector is a dependency with its own error profile, and the question `U5` needs answered is narrower than "what language is this": it is "can my lexicons read this". Adopted in the form below.

**Option (b) - a pluggable per-language lexicon with English as one entry.** Prototyped with a hand-written French lexicon for both ACTION and WHEN. French passing moves from **0.0% to 33.2%**, against a corpus in which reading 18 established that 341 of 346 carry an explicit trigger clause. Two thirds of good French descriptions still fail. **Rejected on measurement:** writing one language's lexicon well is real lexicography, the prototype's result shows a competent amateur attempt captures a third of it, and the Standard would then owe a lexicon per language it wishes to reach. It also makes the check's verdict depend on how good our French is, which is not a property a conformance gate should have.

**Option (c) - a language-independent structural signal for "states when to use it", with the lexical match as a bonus.** The backlog's other first recommendation. Operationalised as: the description contains more than one substantive clause, splitting on sentence terminators and dashes and requiring at least three words per unit. **Measured across all 2068 descriptions: it fires on 99.9%.** Per corpus: 94.4% on Anthropic's own skills, 100.0% on four others, 99.7% on the French corpus. A signal present in essentially every description cannot separate the ones that state an occasion from the ones that do not. **Rejected: it has no discriminating power at all**, and a scoring component that always fires is a constant, not a measurement. This is the recommendation the backlog leaned on, and it did not survive contact with the corpora.

**Option (d) - scope `U5` explicitly to English in the Standard.** The backlog calls this "the cheap answer" and says it should not be taken by default because "the limitation is one heuristic in one check, not a property of the Standard". **That reasoning is accepted and this option is rejected as the headline decision** - but note that the decision below is its honest half: the scorer declares the language it can read, and says nothing about descriptions outside it, rather than the Standard declaring itself English-only.

**Option (e) (chosen) - abstain when the scorer cannot read the description, detected by English function-word density.** Function words are the highest-frequency tokens of a language and are the standard cheap language signal. The scorer already assumes exactly one language; measuring the density of that language's function words asks precisely the question "can my lexicons read this", with no second language modelled anywhere.

## Decision outcome

**1. `U5` computes `englishDensity(desc)` before scoring:** the fraction of `[a-z']+` tokens that are members of a fixed set of English function words.

**2. Below `READABLE_FLOOR = 0.10`, the description is NOT SCORED.** The check emits no finding for it.

**3. The floor is 0.10, and it was chosen from a sensitivity sweep, not picked.**

| floor | French abstain (n=692) | English abstain (n=1376) |
|---|---|---|
| 0.05 | 96.0% | 0.0% (0) |
| 0.08 | 98.6% | 0.1% (1) |
| **0.10** | **99.1%** | **0.2% (3)** |
| 0.12 | 99.4% | 1.1% (15) |
| 0.15 | 99.4% | 4.5% (62) |
| 0.18 | 99.7% | 15.4% (212) |

Above 0.10 the English cost climbs an order of magnitude for a tenth of a point of French coverage. The descriptions lost between 0.10 and 0.15 are legitimate keyword-dense technical English - *"Optimize paid advertising campaigns across Google Ads, Meta, TikTok, LinkedIn, and other platforms. Use when..."* at density 0.102 - which is exactly the population `U5` should still be scoring.

**4. The outcome is reported, not silent.** A not-scored description is recorded so a maintainer can see the check declined rather than passed. Silence and a pass must not look the same, or a plugin whose descriptions are all unreadable looks like a plugin whose descriptions are all good.

**5. `scoreDescription` itself is unchanged.** No lexicon is widened, no weight is rebalanced, no threshold moves. This ADR decides scope; ADR 0033 owns calibration.

**6. No Standard version movement and no new spine number.** `U5` keeps its number, its tier, its `warn` severity and its `house` provenance. The check reports strictly less than it does today, at every pin, in every mode, so no consumer can move red-ward and no migration window is required. This is the same green-ward reasoning as ADR 0046 point 6 and ADR 0047 point 7.

## Consequences

- **343 of 346 false findings on the French corpus are withdrawn**, measured: 346 `U5` findings at HEAD, **3** with the floor applied. The check goes from unpassable to near-silent on that population.
- **The three that survive are the honest residual and are stated rather than rounded away.** They are French descriptions carrying enough English loanwords - reading 18 named "audit", "planning", "code review" - to cross a 0.10 density floor. They will be scored by an English scorer and will probably fail. The design reduces a systematic defect to a rare one; it does not eliminate it, and claiming otherwise would misrepresent the measurement.
- **Family blast radius: nothing moved.** All six members graded before and after with the per-member, per-reqId, per-severity and gate censuses. Every family description is English, so nothing abstains.
- **The cost on English is three descriptions in 1376** across six English corpora at their pinned shas. Whether those three are genuinely poor descriptions is not established; they were not opened. The claim made here is the size of the cost, not its rightness.
- **`U5` remains English-only in what it can score, and now says so instead of implying it.** A library writing German or Japanese descriptions gets no `U5` signal. That is worse than a working scorer and better than a false one, and it is honest about which.
- **A future per-language lexicon has a place to plug in.** `englishDensity` becomes `densityFor(lexicon)` the day a second lexicon exists, and the floor becomes the same question asked of each. This ADR neither promises that nor blocks it.
- **The English calibration question is untouched and remains open.** `TerminalSkills` passes 56.7% of `U5` and its `WHEN` fires on 69.4%, so roughly a third of a large English corpus fails a check whose lexicon was already recalibrated once. Whether that is the corpus or the scorer is ADR 0033's question, and this ADR deliberately does not answer it.
- **The `--json` shape gains a field.** A consumer counting `U5` findings to track description quality will see the number fall without a quality change, so the not-scored count must be visible or the improvement is indistinguishable from a regression.

## Implementation sites
- `scripts/checks/description-score.mjs` - `EN_FUNCTION`, `englishDensity(desc)`, `READABLE_FLOOR = 0.10`, and the guard in `check()` before `scoreDescription` is called. Both `englishDensity` and `READABLE_FLOOR` are exported, because the calibration table above is only reproducible if a test can call them.
- `scripts/check.mjs` - the not-scored count surfaced in the human output and in `--json`, so declining and passing are distinguishable.
- `STANDARD.md` sec 8.1 - a sentence stating that the description scorer reads English and declines rather than fails outside it. This is prose, not a rule change, and it belongs beside the sec 8.1 scoping sentence ADR 0048 also adds.
- `tests/unit/description-score.test.mjs` - the French exemplar `"À utiliser quand l'utilisateur veut relire, corriger ou améliorer un texte français"` produces NO finding; the English exemplar at density 0.102 from the sweep still produces one; `englishDensity` returns 0 for an empty token set rather than `NaN`.
- `tests/unit/compatibility-matrix.test.mjs` - a row naming the wrong implementation it kills: a floor of 0.15, which silences 62 English descriptions to gain 0.3 points of French coverage.
- `docs/internal/eval-runs/eval-runs.md` - reading 18 gains a dated note that it was reproduced at the same shas during the v1.14.0 ADR pass, and that options (b) and (c) were measured and rejected. The evidence for a rejected option is worth more than the rejection.
- `docs/internal/backlog/enhancements.md` - E14 moves to ADR-decided, with the correction that its own recommendation of option (c) was falsified by measurement.

Grep anchor: `READABLE_FLOOR` in `scripts/checks/description-score.mjs`.
