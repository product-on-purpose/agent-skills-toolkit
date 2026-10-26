# 0065 - a multi-entry finding earns credit only where its own correct clause verifies

## TL;DR

- **Decision: rule (a') ships.** The rule applies only in the multi-engagement branch, where one
  advisory finding's `matchText` satisfies the `match.locate` rule of more than one defect entry in a
  seeded-defect scoring key (`engaged.length > 1`). In that branch, an engaged entry is auto-credited
  when `match.mode !== "semantic"` AND either `match.verification === "not-required"` OR its own
  `match.correct` clause verifies against the finding's text while its `match.confabulation` clause
  does not. Single-entry classification (`engaged.length === 1`) is unchanged by this ruling.
- **The title is shorthand.** An entry with `verification: "not-required"` has an empty `correct`
  clause, because naming the engaged pair is already the finding and its `locate` rule is its
  verification. On key 1.1.0 that is exactly one entry, `SD-01` (class `trigger-surface-collision`).
  "Its own correct clause verifies" in the title covers that entry by its `not-required` marking.
- **A `mode: semantic` entry is never auto-credited**, on a single-entry engagement or a multi-entry
  one. Adjudication - a human resolving the item via E17 (the scoring harness cannot consume an
  adjudication) - is **mandatory** on every multi-entry engagement, never an optional override.
- **Why: the worked example is the ceiling breach, not the better-known 0.42/1.00 divergence.** The
  rejected alternative, rule (a), gives full credit to every entry a finding merely engages, with no
  `correct`-clause test. It was proposed and then falsified by measurement. Simulated against the real
  2026-08-04 advisories of E13 (the defect-rich model triple run), rule (a) publishes Opus recall at
  **1.00 (13 of 13)** on scoring key 1.1.0. The instrument's own code (`recallAutoCeiling` in
  `scripts/lib/advisory-score.mjs`) documents **0.92** as the highest recall an automatic score can
  report for that key. The reason is that one entry, `SD-06` (class `inverted-rule`), carries
  `match.mode: "semantic"` and is refused auto-credit by `classifyFinding`. Rule (a) breaks its own
  scorer's stated ceiling. Rule (a') publishes Opus at exactly **0.92**, the number the instrument
  certifies as reachable.
- **The separate 0.42-versus-1.00 precision swing between scoring keys 1.0.0 and 1.1.0 is a different
  defect with a different cause, and this ruling does not close it.** Key completeness produces that
  swing: four previously unplanted real defects (`SD-10` through `SD-13`, two `capability-overclaim`
  and two `wrong-procedure` findings) were promoted into key 1.1.0. On key 1.0.0, rule (a) moves Opus
  precision from 0.42 (5 of 12 scored findings) to 0.46 (6 of 13), so it closes only 4 of those 58
  points. Rule (a') moves it to 0.50 (7 of 14), which closes 8. An ADR built on the divergence case
  would rest this ruling on a case it does not fix, so that case is named here only to rule it out.
- **Status: Accepted.** The maintainer ruled on 2026-08-31, during the resolution of RS-B1 (the
  multi-entry credit gap) in the 2026-08-28 Fable-run audit. This record was written on 2026-10-25. It
  satisfies acceptance criterion 1 of RS-B1. The scorer code change that implements this ruling is a
  separate increment that has not been written yet; see Implementation sites below.

- **Date ruled:** 2026-08-31. **Date recorded:** 2026-10-25.
- **Deciders:** the maintainer (jprisant). The tracked source for the options and the acceptance
  criteria is the RS-B1 section of [`docs/internal/roadmap.md`](../roadmap.md). The options were first
  framed in the audit's RS-B resolution spec and measured by its companion simulation against the
  real E13 advisories. That spec is gitignored working material under `_local/`, so this record does
  not depend on it.

## Context and problem statement

`scripts/lib/advisory-score.mjs` scores an already-written advisory result against a seeded-defect
key. `classifyFinding` calls `classifyText`, which tests one finding's joined `matchText` against
every defect entry's `match.locate` rule. As shipped at the time of this ruling, a finding whose text
satisfies `locate` for **more than one** entry is classified `review-required` and is credited to
**no** entry (`classifyText`, the `engaged.length > 1` branch). This record calls that behavior the
"zero-credit" baseline. The same function already refuses auto-credit to a `mode: semantic` entry
outright and routes it to `review-required` as well.

Backlog entry [E16 (advisory-score credits nothing when one finding engages two defect
entries)](../backlog/enhancements.md) named the consequence. The same Opus advisory, unchanged, scored
**0.42 precision** under scoring key 1.0.0 and **1.00 precision** under key 1.1.0. That result is
sensor reading 26 of 2026-08-04, recorded in
[`docs/internal/eval-runs/eval-runs.md`](../eval-runs/eval-runs.md) under batch 2026-08-04.

Seven of Opus's twenty-three findings in that run were left `review-required` under key 1.1.0. Five of
those seven engage two or more planted entries and are credited to none of them; one of the five
engages three. The other two are single-entry cases: index 1 (`SD-03`, where the `correct` and
`confabulation` clauses both match) and index 19 (`SD-06`, the semantic entry). The zero-credit
baseline suppresses Opus's recall on key 1.1.0 (0.62). It does not suppress Opus's precision on that
key, which is 1.00 under every rule considered here. Opus's precision suppression is measurable on
key 1.0.0, where it scores 0.42 under zero credit and 0.50 under rule (a').

The baseline also rewards sparse findings over detailed ones. A model that writes one finding per
planted defect scores better than a model that describes the same reality in richer detail, so the
metric measures conformance to the key's granularity rather than correctness. No cell from that run
may publish as final while this gap is open. RS-B1 acceptance criterion 5 in
[`docs/internal/roadmap.md`](../roadmap.md) makes that a named-surface publication gate: until this
lands, `README.md`, `docs/**`, `RELEASE-NOTES.md`, `CHANGELOG.md` and the deployed site carry no
detection-rate, precision, recall or model-ranking figure, verified by a recorded grep whose empty
result is the evidence.

## Decision drivers

- **The zero-credit baseline suppresses recall, and it suppresses precision wherever an uncredited
  multi-entry finding would have scored as a true positive.** Opus on key 1.0.0 scores 0.42 under
  zero credit against 0.50 under rule (a'), and Haiku on key 1.1.0 scores 0.83 against 0.86. The
  baseline also rewards sparse findings over detailed ones (E16).
- **Unrestricted full credit (rule a) was simulated against the real advisories before it was
  proposed as final, and the simulation falsified it on three independent grounds.**
  - It publishes recall above the scorer's own documented ceiling: Opus 1.00 against a
    `recallAutoCeiling` of 0.92.
  - It credits entries that a finding's text engages by regex but never describes. Opus finding
    index 8 engages `SD-01` (class `trigger-surface-collision`) and `SD-05` (class `fake-statute`), and
    it describes neither; its subject is when the statutory clock starts. Index 7 engages `SD-05` and
    `SD-06`, and it describes only `SD-06`.
  - Its gain grows with verbosity (+0.08 for Haiku, +0.15 for Sonnet, +0.38 for Opus on key 1.1.0).
    That widens the tier spread from 0.24 to 0.54 instead of removing the granularity bias that E16
    exists to fix.
- **The chosen rule still misattributes two measured multi-entry cases, and the duplicate rule hides
  both from the recall number.** That is evidence for mandatory adjudication rather than for a search
  for a better regex.
  - Index 7 textually reports only `SD-06`. Under rule (a'), the `semantic` mode blocks `SD-06` from
    auto-credit, and `SD-05`'s `correct` clause verifies because the text names the Colorado Privacy
    Act in passing. Index 7 is therefore credited to `SD-05`, which it did not report. Because index 7
    comes first, it takes the fresh `SD-05` credit, and index 10 (the finding that actually reports
    the fake statute) collapses to a duplicate. Recall is unchanged, but only because of the order of
    the findings.
  - Index 8 describes neither entry it engages. Under rule (a'), `SD-01` is credited because it is
    `not-required`, and `SD-05` is credited because its `correct` clause verifies against index 8's
    text although index 8 does not describe `SD-05`. Index 8 collapses to a duplicate only because
    indices 4 and 7 had already satisfied both entries.
  - The masking depends on order. Sonnet lists the findings the other way round: its index 5 (a
    single-entry `SD-05` true positive) comes before its index 6 (multi-entry, `SD-05` credited and
    `SD-06` semantic), so index 6 is the one that collapses.
  - Under option (b) below (key normalization), index 7 would still not credit `SD-06` to the one
    finding that reported it, because normalization changes how entries are keyed, not whether a
    `semantic` entry can be auto-matched. No candidate automatic rule gets index 7 right.
- **A `mode: semantic` entry's `correct` and `confabulation` clauses are written as hints for a
  human adjudicator, not as an auto-credit rule** (`advisory-score.mjs`, the comment at the `hints`
  field of the worklist). No credit rule may auto-credit one, however the multi-entry question is
  resolved.

## Considered options

- **(a) Full credit to every engaged entry.** Proposed first, then falsified by measurement (see the
  drivers above). **Refused.**
- **(a') Full credit restricted to entries that verify on their own; `mode: semantic` never
  auto-credited; adjudication mandatory on every multi-entry engagement.** The verification test is
  the one stated in the TL;DR: `verification: "not-required"`, or a `correct` clause that verifies
  while the `confabulation` clause does not. Measured against the same real advisories on key 1.1.0,
  recall is **Haiku 0.46 / Sonnet 0.54 / Opus 0.92**. Opus sits exactly at `recallAutoCeiling` and
  never above it. **Chosen.**
- **(b) Key normalization.** Treat each real-world defect as exactly one key entry, with a documented
  merge and split rule, and re-key the fixtures so that multi-entry engagement cannot arise. This makes
  granularity canonical instead of irrelevant, at the cost of more curation and less scoring logic. As
  the decision drivers show, it does not fix the index 7 attribution case either. **Not chosen** for
  this ruling: it changes the fixture's authoring contract rather than the scorer's credit rule, and it
  does not remove the need for a credit rule for the cases that a future re-key still produces.
- **(c) Adjudication-first.** Automatic engagement becomes a draft only, and E17 (the scoring harness
  cannot consume an adjudication) becomes the primary mechanism for every finding, not just for
  multi-entry ones. This is the most honest option and the most manual. **Not chosen**: rule (a')
  already makes adjudication mandatory on exactly the cases where the automatic signal is unreliable
  (multi-entry engagement). It keeps the automatic signal for the much larger set of single-entry,
  non-semantic engagements, which the E13 run showed it handles correctly.

## Decision outcome

Rule (a') ships. It changes the multi-engagement branch only (`engaged.length > 1`); a finding that
engages exactly one entry is classified exactly as before. In the multi-engagement branch, each
engaged entry is tested on its own:

1. An entry with `match.mode: "semantic"` is never auto-credited.
2. Otherwise, an entry with `match.verification: "not-required"` is auto-credited.
3. Otherwise, an entry is auto-credited when its `match.correct` clause verifies against the
   finding's `matchText` and its `match.confabulation` clause does not.
4. Any other engaged entry earns no credit.

**When an engaged entry's confabulation clause matches,** that entry earns no credit, so it stays a
miss unless another finding satisfies it. The finding is **not** counted as an automatic false
positive. The reason is an asymmetry that the single-entry `confabulation` outcome does not face: a
multi-entry finding may correctly describe a different engaged entry, so its confabulation hit
against one entry does not show that the finding as a whole is wrong. If at least one other engaged
entry is credited, the finding scores as one true positive. If no engaged entry is credited, the
finding scores `review-required`, which keeps it out of both precision and recall until adjudication.
In both cases the finding is on the mandatory worklist, where the human decides whether the hit is a
confabulation. None of the three E13 advisories reaches this case on key 1.1.0 or on key 1.0.0, so the
ruled recall values do not depend on it.

Every multi-entry engagement is also routed to the mandatory adjudication worklist (E17), whether or
not any engaged entry was credited. The two measured misattributions under the chosen rule (indices 7
and 8, both described in the decision drivers) show that automatic attribution among several engaged
entries is not reliable enough to finalize unreviewed, even when the ceiling invariant holds.

**The published worked example for this ADR, by the amendment of 2026-08-31, is the ceiling breach.**
Rule (a) publishes Opus recall at 1.00 on key 1.1.0 through an instrument whose own code documents
0.92 as that key's maximum; rule (a') publishes 0.92. The 0.42/1.00 divergence between keys 1.0.0 and
1.1.0 is real, measured and recorded (sensor reading 26). Key completeness causes it, through the
promotion of `SD-10` through `SD-13`, and it is not the case that this ruling resolves. Citing it as
this ADR's example would misstate what the ruling fixes.

## Consequences

**Positive.**

- No reported recall can exceed `recallAutoCeiling` for its key. Rule (a) violated that invariant and
  rule (a') does not. This is the ceiling-invariant half of RS-B1 acceptance criterion 2, which the
  implementation must hold as a regression-test assertion.
- Rule (a') bounds recall at the automatic ceiling, and it stops crediting engaged entries whose
  `correct` clause does not verify. It still widens the tier spread on key 1.1.0, from 0.24 under zero
  credit (Haiku 0.38 to Opus 0.62) to 0.46 (Haiku 0.46 to Opus 0.92). Rule (a) widened it to 0.54.
  Whether the remaining widening is signal or residual verbosity reward is left to E17's adjudication
  data.
- Determinism is preserved. Scoring the same advisory against the same key still yields the same
  partition every time, because the rule is a pure function of `matchText`, the key and the order of
  the findings, the same as the existing single-entry path.

**Negative / accepted cost.**

- Mandatory adjudication on every multi-entry engagement adds human labor to every eval run that
  produces one, where rule (a) would have required none. This is an accepted cost. The measured
  misattributions at indices 7 and 8 show that the automatic signal is not trustworthy enough on
  multi-entry cases to skip the human step, so skipping it was the unsafe option.
- Rule (a') does not improve attribution accuracy on the measured hard cases. It only bounds the
  ceiling correctly and forces a human to resolve them. A future ADR may revisit the attribution logic
  itself once E17's adjudication data accumulates, but that is outside this ADR's scope.
- The scorer code (`classifyFinding`, `scoreAdvisory`) does not implement this rule yet. The
  zero-credit baseline stays shipped until the implementation lands (see Implementation sites). In the
  interim, no cell scored under the zero-credit baseline may publish as final, under the named-surface
  publication gate of RS-B1 acceptance criterion 5.

## Implementation sites

This rule is not implemented yet. This record satisfies RS-B1 acceptance criterion 1 only: the ruling
is recorded. Once the scorer change ships, these sites will carry the decision:

- `scripts/lib/advisory-score.mjs`, in `classifyFinding()` and `classifyText()`: the
  `engaged.length > 1` branch must test each engaged entry individually with the four steps in the
  Decision outcome, and it must partition credit per entry instead of returning one `review-required`
  result for the whole finding. The existing `mode === "semantic"` refusal, already present on the
  single-entry path, must apply unconditionally inside the multi-entry branch too. The single-entry
  path does not change.
- `scripts/lib/advisory-score.mjs`, in `scoreAdvisory()`: precision and recall count different units,
  and the function must keep the two tallies separate.
  - **Precision counts findings.** A credited multi-entry finding is **one** true positive, however
    many entries it credits. A finding whose credited entries were all satisfied earlier is a
    duplicate.
  - **Recall counts satisfied entries**: `satisfied.size / defects.length`. The current
    `truePositives / defects.length` gives the same number only while every true positive satisfies
    exactly one entry. Under rule (a') one finding can satisfy two. For example, Opus on key 1.1.0
    has 11 true-positive findings but 12 satisfied entries, because its index 0 credits `SD-03` and
    `SD-07`. Its precision is 11 of 11 and its recall is 12 of 13. The `recallByMisses` cross-check
    must count entries as well (`satisfied.size / (satisfied.size + misses)`), or `recallAgrees` will
    report a false harness defect.
  - The `worklist` construction must place every multi-entry engagement on the mandatory adjudication
    worklist, however many of its entries were credited.
- **Regression fixtures.** The three E13 advisories (Haiku, Sonnet and Opus at `high`) exist only
  under the gitignored `_local/` tree. They must be committed as tracked regression fixtures before
  the criterion 2 test can be written, because a test cannot read a file that a clean checkout does
  not have. The batch 2026-08-04 entry in
  [`docs/internal/eval-runs/eval-runs.md`](../eval-runs/eval-runs.md) still names their location as
  `_local/audit/eval-runs/2026-08-04/`. That directory no longer exists; the files now sit under
  `_local/_archived/eval-runs/2026-08-04/`. Committing them as fixtures removes the dependency on
  either path.
- E17's adjudication input (backlog entry E17, the scoring harness cannot consume an adjudication):
  the mandatory-adjudication path that this ADR requires has nowhere to write its resolution until
  `scoreAdvisory` accepts an adjudication document and folds it into the published partition.
- E20's key relocation (backlog entry E20, the seeded-defect scoring key is readable from inside the
  fixture tree): the regression fixtures that this ruling needs live beside
  `tests/fixtures/anti/seeded-defects/`. Moving the scoring key itself out of that tree is a
  prerequisite for trusting any future re-measurement against it.
- The regression tests that RS-B1 criteria 2 through 4 require (see the RS-B1 section of
  [`docs/internal/roadmap.md`](../roadmap.md)):
  - Criterion 2 asserts rule (a')'s recall on key 1.1.0 (Haiku 0.46, Sonnet 0.54, Opus 0.92), fails on
    a revert to zero credit, and pins the `recallAutoCeiling` invariant. Revert detection rests on the
    Haiku and Opus assertions, which move from 0.38 to 0.46 and from 0.62 to 0.92. Sonnet's 0.54
    equals its zero-credit recall, so the Sonnet assertion alone would stay green through a revert.
  - Criterion 3 demonstrates determinism and one E17 adjudication override in a test.
  - Criterion 4 is E20's key-outside-fixture test, which must fail under a planted-key mutation.
- The publication-gate grep of RS-B1 criterion 5: the named surface list (`README.md`, `docs/**`,
  `RELEASE-NOTES.md`, `CHANGELOG.md`, the deployed site) must carry no detection-rate, precision,
  recall or model-ranking figure until the implementation above lands and the gate's recorded grep
  returns empty.

Measured values that do not exist yet - the post-implementation precision and recall cells - belong in
[`docs/internal/eval-runs/eval-runs.md`](../eval-runs/eval-runs.md) once the scorer change ships and
the advisories of E13 (the defect-rich model triple) are re-scored. They do not belong in this ADR.
