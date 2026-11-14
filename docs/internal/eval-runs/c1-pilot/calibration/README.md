# Calibration - the no-skill baseline of every held-out case

This folder records the calibration that section 4 of [the pre-registration](../../prereg_experiment-b-c1-pilot-20261105.md) requires before the freeze. Each case ran against a stub plugin with no relevant skill, with `--ablation none --runs 3`, the brief's section 5 model, and `sonnet` as the judge. The firing grader `fired.md` was left out of these copies, because under `--ablation none` the vendor scores it (harness fact 9). A case scoring 0.75 or more cannot be won under section 7, so it was replaced once.

## Files

| File | What it holds |
|---|---|
| `calibration-<brief>.json` | The vendor's full `aggregate-result.json` for one brief's ten original cases, run on 2026-11-10 |
| `calibration-summary.json` | Each case's mean score, error count and grader count, for all three briefs |
| `replacements-<brief>-<brief>.json` | The vendor's result for one brief's replacement cases |
| `replacements-<brief>-summary.json` | The same summary for the replacements |

## Results, 2026-11-10

The scores are the mean of three runs. Each run scores 0, 0.25, 0.5, 0.75 or 1, because each case has four scored graders.

| Brief | Cases at or above 0.75 | Replaced | Replacement scores | Cost |
|---|---|---|---|---|
| `migration-risk-review` (agent sonnet) | case-02, case-08 and case-10, each 0.75 in all three runs | All three | 0.50, 0.58 and 0.50 | $4.00, then $1.22 |
| `postmortem-from-notes` (agent haiku) | case-02, case-07 and case-08, each 0.75 in all three runs | All three | 0.50, 0.50 and 0.50 | $3.16, then $1.10 |
| `acceptance-criteria-writer` (agent sonnet) | None. The highest was 0.58 | None | - | $4.20 |

All 30 original cases ran three times with no errors, and no suite was partial. The `acceptance-criteria-writer` suite passed its $4 ceiling by $0.20 but finished, because the vendor checks the ceiling between cases.

**After replacement, every case's baseline is below 0.75,** so all thirty cases can be won under section 7. The baselines run from 0.00 to 0.58. The `acceptance-criteria-writer` baselines are lowest, with a mean of about 0.29, against about 0.48 for each of the other two briefs.

## How the replacements were written

A fresh subagent on the Sonnet model wrote the six replacements, as section 4 requires. Its full instructions are committed at [`../replacement-author-prompt.md`](../replacement-author-prompt.md). It received the original author's instructions cut to the six cases, and the reason for the replacement. It did not see the replaced cases, the other cases, or any score. The pre-registration's author removed each replaced case's prompt and four scored graders first, and kept its `fired.md`.

**A defect found in the replacements, not fixed.** The instructions added one rule: a grader checks one behaviour only. Four of the 24 new graders still require two outcomes in one sentence:

- `migration-risk-review/case-02`: both substance graders identify a hazard and also recommend a specific fix.
- `migration-risk-review/case-08`: `convention-1` requires the expand-and-contract recommendation and also numbered deploy steps.
- `postmortem-from-notes/case-02`: `substance-2` requires the contributing factor and also a blameless framing.

They were left as the independent author wrote them, because rewording them would replace the author's judgement with that of someone who has seen the baselines. Section 4 also says a replacement is calibrated once and then stays. A two-outcome grader is harder to pass for both arms alike, so it lowers the ceiling a skill can reach on that case, and it favours neither arm (medium confidence, inferred).
