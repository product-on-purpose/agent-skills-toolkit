# 0065 - a multi-entry finding earns credit only where its own correct clause verifies

## TL;DR

- **Decision: rule (a') ships.** When one advisory finding's `matchText` engages more than one
  defect entry in a seeded-defect scoring key, it earns full credit only for the entries whose own
  `correct` clause verifies against that finding's text. An entry whose `match.mode` is `semantic` is
  **never** auto-credited, on a single-entry engagement or a multi-entry one. Adjudication - a human
  resolving the item via E17 (the scoring harness cannot consume an adjudication) - is **mandatory**
  on every multi-entry engagement, never an optional override.
- **Why: the worked example is the ceiling breach, not the better-known 0.42/1.00 divergence.** The
  rejected alternative, rule (a) - full credit to every entry a finding merely engages, with no
  `correct`-clause test - was proposed and then falsified by measurement. Simulated against the real
  2026-08-04 model-triple advisories (E13, the defect-rich model triple run), rule (a) publishes Opus
  recall at **1.00 (13 of 13)** on scoring key 1.1.0, through the very instrument whose own code
  (`recallAutoCeiling` in `scripts/lib/advisory-score.mjs`) documents **0.92** as the highest recall
  an automatic score can ever report for that key, because one entry (`SD-06`, class
  `inverted-rule`) carries `match.mode: "semantic"` and is refused auto-credit by `classifyFinding`.
  Rule (a) breaks its own scorer's stated ceiling. Rule (a') publishes the number the instrument
  itself certifies as reachable: Opus at exactly **0.92**, never above it.
- **The separate 0.42-precision-vs-1.00 swing between scoring keys 1.0.0 and 1.1.0 is a different
  defect with a different cause, and this ruling does not close it.** That swing is produced by key
  completeness - the promotion of four previously-unplanted real defects (`SD-10` through `SD-13`,
  two `capability-overclaim` and two `wrong-procedure` findings) into key 1.1.0 - not by how
  multi-entry engagement is credited. Full credit under rule (a) closes only 4 of those 58 precision
  points. An ADR built on the divergence case would rest this ruling on a case it does not fix, which
  is why that case is named here only to rule it out as the worked example.
- **Status: Accepted.** Ruled by the maintainer 2026-08-31, during the 2026-08-28 Fable-run audit's
  RS-B1 (the multi-entry credit gap) resolution spec. This record was written 2026-10-25, satisfying
  acceptance criterion 1 of RS-B1 (the multi-entry credit gap). The scorer code change that
  implements this ruling is a separate, not-yet-written increment - see Implementation sites below.

- **Date ruled:** 2026-08-31. **Date recorded:** 2026-10-25.
- **Deciders:** maintainer (jprisant), ruling on the options framed by the audit's RS-B1 resolution
  spec (`specs/RS-B-instrument-and-legitimacy.md` of the 2026-08-28 Fable audit) and measured by its
  companion simulation against the real E13 advisories.

## Context and problem statement

`scripts/lib/advisory-score.mjs` scores an already-written advisory result against a seeded-defect
key. `classifyFinding` -> `classifyText` tests one finding's joined `matchText` against every defect
entry's `match.locate` rule. As shipped at the time of this ruling, a finding whose text satisfies
`locate` for **more than one** entry is classified `review-required` and is credited to **neither**
entry (`classifyText`, the `engaged.length > 1` branch) - the "zero-credit" baseline. The same
function already refuses auto-credit to a `mode: semantic` entry outright, routing it to
`review-required` as well.

Backlog entry E16 (advisory-score credits nothing when one finding engages two defect entries) named
the consequence: the same Opus advisory, unchanged, scored **0.42 precision** under scoring key 1.0.0
and **1.00 precision** under key 1.1.0 (sensor reading 26, 2026-08-04, recorded in
[`docs/internal/eval-runs/eval-runs.md`](../eval-runs/eval-runs.md), batch 2026-08-04). Seven of
Opus's twenty-three findings in that run engaged two planted entries at once and were credited to
neither, so precision and recall were both suppressed by the same mechanism, and - because a model
that writes one finding per planted defect scores better than one that describes the same reality in
richer detail - the metric was measuring conformance to the key's granularity rather than
correctness. No cell from that run could be published as final while this was open, and RS-B1 (the
multi-entry credit gap) is the audit's one hard "nothing behavioral publishes before this lands" gate
([`docs/internal/roadmap.md`](../roadmap.md) RS-B1).

## Decision drivers

- **The zero-credit baseline suppresses precision and recall together**, rewarding sparse findings
  over detailed ones (E16).
- **Unrestricted full credit (rule a) was simulated against the real advisories before being
  proposed as final, and the simulation falsified it on three independent grounds:** it publishes
  recall above the scorer's own documented ceiling (Opus 1.00 against a 0.92 `recallAutoCeiling`); it
  credits entries a finding's text engages by regex but never actually describes (Opus finding index
  8 engages `SD-01`, class `trigger-surface-collision`, and `SD-05`, class `fake-statute`, while
  describing neither; index 7 engages `SD-05` and `SD-06` while describing only `SD-06`); and its
  gain is monotone in verbosity (+0.08 / +0.15 / +0.38 across Haiku/Sonnet/Opus), which widens the
  tier spread from 0.24 to 0.54 instead of removing the granularity bias E16 exists to fix.
- **Even the chosen rule cannot attribute every hard multi-entry case correctly, which is itself
  evidence for mandatory adjudication rather than a search for a better regex.** Finding index 7
  engages `SD-05` and `SD-06` and textually reports only `SD-06`. Under rule (a'), `SD-06`'s
  `semantic` mode blocks it from auto-credit regardless of which finding reports it, so index 7 is
  credited to `SD-05` instead - the entry it did not actually report. Under option (b) below (key
  normalization), the same finding would still deny `SD-06` to the one finding that reported it,
  because normalization changes how entries are keyed, not whether a `semantic` entry can be
  auto-matched. No candidate automatic rule gets this one case right.
- **A `mode: semantic` entry's `correct`/`confabulation` clauses are written as hints for a human
  adjudicator, not as an auto-credit rule** (`advisory-score.mjs` comment at the `hints` field of the
  worklist), so no credit rule may auto-credit one regardless of how the multi-entry question is
  resolved.

## Considered options

- **(a) Full credit to every engaged entry.** Proposed first, then falsified by measurement (drivers
  above). **Refused.**
- **(a') Full credit restricted to entries whose own `correct` clause verifies; `mode: semantic`
  never auto-credited; adjudication mandatory on every multi-entry engagement.** Measured against the
  same real advisories on key 1.1.0: recall **Haiku 0.46 / Sonnet 0.54 / Opus 0.92** - Opus exactly at
  `recallAutoCeiling`, never above it. **Chosen.**
- **(b) Key normalization.** Treat each real-world defect as exactly one key entry, with a documented
  merge/split rule, and re-key the fixtures so multi-entry engagement cannot arise. Makes granularity
  canonical instead of irrelevant, at the cost of more curation and less scoring logic, and - per the
  decision drivers above - does not by itself fix the `SD-06` attribution case either. **Not chosen**
  for this ruling: it changes the fixture's authoring contract rather than the scorer's credit rule,
  and does not remove the need for a credit rule for cases a future re-key still produces.
- **(c) Adjudication-first.** Automatic engagement becomes a draft only; E17 (the scoring harness
  cannot consume an adjudication) is the primary mechanism for every finding, not just multi-entry
  ones. The most honest option and the most manual. **Not chosen**: rule (a') already makes
  adjudication mandatory on exactly the cases where the automatic signal is unreliable (multi-entry
  engagement), while keeping the automatic signal for the much larger set of single-entry,
  non-semantic engagements, which the E13 run showed it handles correctly.

## Decision outcome

Rule (a') ships. A finding is credited to an engaged entry if, and only if, that entry's own
`match.correct` clause verifies against the finding's `matchText` and the entry's `match.mode` is not
`semantic`. Every multi-entry engagement - whether or not any entry's `correct` clause verifies - is
additionally routed to the mandatory adjudication worklist (E17), because the one measured residual
case (finding index 7, misattributed to `SD-05` instead of the `SD-06` it actually reported) shows
that automatic attribution among several engaged entries is not reliable enough to finalize
unreviewed, even when the ceiling invariant holds and even under the chosen rule.

**The published worked example for this ADR, by the amendment of 2026-08-31, is the ceiling breach:**
rule (a) publishes Opus recall at 1.00 on key 1.1.0 through an instrument whose own code documents
0.92 as that key's maximum; rule (a') publishes 0.92. The 0.42/1.00 divergence between keys 1.0.0 and
1.1.0 is real, measured, and recorded (sensor reading 26), but it is caused by key completeness - the
promotion of `SD-10` through `SD-13` - and is not the case this ruling resolves; citing it as this
ADR's example would misstate what the ruling fixes.

## Consequences

**Positive.**

- No reported recall can exceed `recallAutoCeiling` for its key, which rule (a) violated and rule
  (a') does not. This is the ceiling-invariant half of RS-B1 acceptance criterion 2, which
  implementation must hold as a regression-test assertion.
- Full credit is restricted to the entries a finding's text actually verifies against, rather than
  every entry its text happens to also match, which removes the verbosity-reward mechanism that made
  rule (a)'s tier spread worse than the zero-credit baseline's.
- Determinism is preserved: scoring the same advisory against the same key still yields the same
  partition every time, because the rule is a pure function of `matchText` and the key, same as the
  existing single-entry path.

**Negative / accepted cost.**

- Mandatory adjudication on every multi-entry engagement adds human labor to every eval run that
  produces one, where rule (a) would have required none. This is an accepted cost: the measured
  index-7 misattribution shows the automatic signal is not trustworthy enough on multi-entry cases to
  skip the human step, so the alternative (skipping it) was the unsafe option.
- Rule (a') does not improve attribution accuracy on the one measured hard case (finding index 7); it
  only bounds the ceiling correctly and forces a human to resolve the case. A future ADR may revisit
  attribution logic itself once E17's adjudication data accumulates, but that is out of this ADR's
  scope.
- The scorer code (`classifyFinding`, `scoreAdvisory`) does not yet implement this rule as of this
  ADR's acceptance; the zero-credit baseline remains shipped until the implementation lands (see
  Implementation sites). No cell scored under the zero-credit baseline may be published as final in
  the interim, per the audit's standing publication gate (RS-B1 acceptance criterion 5).

## Implementation sites

Not yet implemented as of this ADR's acceptance - this record satisfies RS-B1 acceptance criterion 1
only (the ruling is recorded). The sites that will carry the decision, once the scorer change ships,
are:

- `scripts/lib/advisory-score.mjs` - `classifyFinding()` / `classifyText()`: the `engaged.length > 1`
  branch must test each engaged entry's `match.correct` clause individually and partition credit
  per-entry instead of returning a single `review-required` result for the whole finding; the
  existing `mode === "semantic"` refusal (already present, single-entry case) must continue to apply
  unconditionally inside the multi-entry branch too.
- `scripts/lib/advisory-score.mjs` - `scoreAdvisory()`: the `satisfied` bookkeeping and the
  `worklist` construction must route every multi-entry engagement onto the mandatory adjudication
  worklist regardless of how many of its entries verified, per the decision outcome above.
- E17's adjudication input (backlog entry E17 - the scoring harness cannot consume an adjudication):
  the mandatory-adjudication path this ADR requires has nowhere to write its resolution until
  `scoreAdvisory` accepts an adjudication document and folds it into the published partition.
- E20's key relocation (backlog entry E20 - the seeded-defect scoring key is readable from inside the
  fixture tree): the regression fixtures this ruling needs live beside
  `tests/fixtures/anti/seeded-defects/`; moving the scoring key itself out of that tree is a
  prerequisite for trusting any future re-measurement against it.
- The regression tests RS-B1 criteria 2 through 4 require ([`docs/internal/roadmap.md`](../roadmap.md)
  RS-B1): criterion 2 (asserting rule (a')'s Haiku 0.46 / Sonnet 0.54 / Opus 0.92 recall on key 1.1.0,
  failing on a revert to zero-credit, plus the `recallAutoCeiling` invariant), criterion 3
  (determinism and one E17 adjudication override, demonstrated in a test), and criterion 4 (E20's
  key-outside-fixture test failing under a planted-key mutation).
- The publication-gate grep of RS-B1 criterion 5: the named surface list (`README.md`, `docs/**`,
  `RELEASE-NOTES.md`, `CHANGELOG.md`, the deployed site) must carry no detection-rate, precision,
  recall, or model-ranking figure until the implementation above lands and the gate's recorded grep
  returns empty.

Measured values that do not yet exist - the post-implementation precision/recall cells themselves -
belong in [`docs/internal/eval-runs/eval-runs.md`](../eval-runs/eval-runs.md) once the scorer change
ships and the E13 (defect-rich model triple) advisories are re-scored, not in this ADR.
