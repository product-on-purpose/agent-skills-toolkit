# 0066 - The goal is the builder whose libraries are proven to work, and "best" is measured, not claimed

## TL;DR

- **Decision: the toolkit's goal is to be the builder that produces a whole cross-agent library and proves it works, with evidence a CI gate can read.** It does not aim to out-feature the vendor's own behavioural tools on the vendor's platform. It composes with them: every builder ends by writing and running an eval suite in the format of `claude plugin eval`, and the result is reported as **evidence**, beside the tier and beside the health number, never inside either.
- **"Best" becomes four measured criteria, each with a baseline taken 2026-10-30.** A built skill must beat a no-skill model more often than one built with the vendor's skill-creator alone. The placeholder fixture's report must show it is hollow. A newcomer's time to a first green gate is measured. And the first outside user is counted rather than assumed. A criterion that fails is reported as failed.
- **Why.** On 2026-10-30 the vendor ships behavioural testing free inside Claude Code, and this toolkit's builders stop at file structure. The organisation's own pilots found structure says nothing about whether a skill is worth shipping. The one unoccupied position is the whole-library, cross-agent, deterministic one, so the goal is narrowed to it and made testable.
- **Status: Proposed.** Drafted 2026-10-30 at the maintainer's request to draft the goal and its roadmap rows. Acceptance, amendment or refusal is the maintainer's.

- **Date:** 2026-10-30
- **Deciders:** maintainer (jprisant), with Claude (Opus 5.5)

## Builds on

- **[ADR 0063 (an advisory layer beside the tier, and a health number that never enters it)](0063-an-advisory-layer-beside-the-tier-and-a-health-number-that-never-enters-it.md).** It rules that "no model contributes to any category" of the health number. Eval scores from `claude plugin eval` are partly model-judged, so they cannot enter health. This ADR therefore gives them a third place, the evidence section, rather than amending 0063.
- **[ADR 0064 (the vendor's `claude plugin eval` is beside askit's tier, not versus it)](0064-the-vendors-plugin-eval-is-beside-askits-tier-not-versus.md).** It set the posture: run both. This ADR turns that advice into a builder step, so a user of the builders runs both without having to remember to.
- **The standing hold on an LLM in the gate** ([roadmap section 4, "The audit's five rejections"](../roadmap.md#the-audits-five-rejections)). Nothing here puts a model in the gate. The gate may later read an evidence artifact deterministically, and that would need its own decision.
- **D-08 (the behavioural rung's shape)** in [roadmap section 2](../roadmap.md#2-decisions-that-are-open). This ADR does not need a rung, a fourth tier name or a modifier on Gold. Evidence is reported beside the verdict, so D-08 stays open and stays not urgent.
- **[ADR 0057 (unshipped work carries a name, never a version number)](0057-unshipped-work-carries-a-name-never-a-version-number.md).** The new work below is a named cut, "the behaviour loop", with no version.

## Context and problem statement

The maintainer asked on 2026-10-30 how to make this toolkit "unequivocally the best plugin and skill builder solution that exists on the internet", and how the roadmap should change for it. Three surveys ran the same day: the vendor's own tooling from its current docs, the third-party field from primary sources, and this repository's own builders. Their findings, with what was verified:

**The vendor now ships behavioural testing, free and built in (medium confidence; read from current docs through a subagent).** `claude plugin init` scaffolds. `claude plugin validate` checks structure. `claude plugin eval` runs a plugin's own cases in an isolated session, by default with and without the plugin, and writes a schema-versioned `aggregate-result.json`. skill-creator writes `evals/evals.json`, benchmarks with and without the skill, and tunes a description for triggering. `/skill-doctor` reports context cost and never-invoked skills. All of it is single-plugin or single-skill, and Claude-only.

**This toolkit's builders stop at structure (high confidence; read from the repository).** Thirteen `askit-build-*` builders create and improve every component type. Create mode copies a template, fills it, registers it and iterates to 0 errors. Improve mode fixes findings. An optional craft review reads the artifact; it never runs it. No builder measures triggering, output quality or a with-and-without comparison. `askit-evaluate`'s behavioural mode exists, is opt-in and model-judged, and is wired to no builder.

**The organisation's own measurement says structure is not quality (high confidence; recorded in pm-skills).** In pm-skills' v2.35.0 pilot, 0 of 3 skills beat a model with no skill. In the harder follow-up, the one gain came from a template, and only under a weaker model with thin inputs. A Gold badge would have said nothing about either result. pm-skills is this organisation's most-starred plugin.

**The builders are not yet winning at home (high confidence; backlog entries).** E65 (a sibling repository built its own 61-item backlog tooling instead of using `askit-backlog`) and E66 (`askit-decision` went unused even in its most favourable case) are both open. E78 (step 2 copies the generic template where the repository has its own) and E79 (phase 2 names a subagent that fallback mode lacks) were real builder defects, fixed 2026-10-30 in [PR #390](https://github.com/product-on-purpose/agent-skills-toolkit/pull/390).

**The field's leaders are far larger, and adoption here is near zero (high confidence; measured 2026-10-30 from the GitHub and npm APIs).** obra/superpowers has about 309,000 stars and anthropics/skills about 185,000. This repository has 3 stars, 0 forks, and 76 issues, all filed by the maintainer or by automation. GitHub code search finds no workflow outside the maintainer's own organisations that uses the Action. Two unrelated repositories also publish a package named `agent-skills-toolkit`, so a name search alone overstates use.

**What no one else does (medium confidence; the survey read each leader's own repository).** No surveyed tool grades a whole library or marketplace against a tiered standard with a deterministic gate. The vendor's tools are per plugin, and `claude plugin validate` does not open sibling plugins' files from a marketplace. The two community leaders emit to many agents, but their behavioural layers are model-judged, and one says in its own documentation that its judge is not validated against human labels.

So the literal goal, best on every axis, is not reachable: the vendor owns the behavioural axis on its own platform, for free. The question this ADR answers is which claim is reachable, and how anyone would know it had been reached.

## Decision drivers

- A goal that cannot fail is not a goal. "Best" must be a set of measurements with baselines, so that a release can be shown to have moved them, or not.
- The vendor's evaluator is free, maintained and native. Building a competing behavioural runner would cost the most and win the least.
- The toolkit's only unoccupied ground is the whole-library, cross-agent, deterministic gate. The goal should build on it, not move off it.
- The organisation's own pilots show that a structurally perfect skill can lose to no skill at all. A builder that cannot see that is not the best builder, whatever its gate says.
- ADR 0063 keeps every model out of the health number, and the roadmap holds every model out of the gate. Whatever this adds must respect both.

## Considered options

1. **Stay a grader with builders attached.** Keep improving the gate, the Standard and the evidence quality of the grade. Refused as the goal: it is the current path, it produced 0 outside users in the repository's first six months, and it leaves the builders blind to whether what they build works.
2. **Build a behavioural runner of our own** that competes with `claude plugin eval`, with its own case format, judge and report. Refused: it duplicates a free, native tool, it would be Claude-only in practice too, and its judge would carry the same unvalidated-judge problem the field already has.
3. **Compose with the vendor's evaluator and report its result as evidence beside the verdict.** Every builder writes an eval suite in the vendor's format and runs it. The toolkit reads the result file and reports it. Adopted.
4. **Claim "best" outright** in the README and the comparison page. Refused: it is not true today on the behavioural axis, and a claim the project cannot measure is the kind of claim this repository's vendor-watch exists to stop.

## Decision outcome

**Adopted: option 3, under a narrowed goal with four measured criteria.**

### 1. The goal

> The toolkit is the builder that produces a whole cross-agent plugin library and proves it works, with evidence a CI gate can read.

"Proves it works" means evidence of behaviour, reported beside the structural verdict. It never means the tier says so. The tier keeps meaning what `TIER_SCOPE_SENTENCE` in `scripts/lib/tier-scope.mjs` says it means: structural conformance, "not ... a statement that the skills work".

### 2. The four criteria, with their 2026-10-30 baselines

| # | Criterion | How it is measured | Baseline, 2026-10-30 |
|---|---|---|---|
| C1 | **A built skill beats no skill more often than one built with skill-creator alone.** | A pre-registered pilot. The same model builds each skill twice from the same brief: once through the behaviour loop, once with skill-creator alone. Both are scored with `claude plugin eval --ablation with-without` on held-out cases that neither builder saw. The pilot design, case set and pass rule are committed before it runs, as pm-skills' pilots were. | Not measured. No builder runs anything today |
| C2 | **The placeholder fixture's report shows it is hollow.** | `tests/fixtures/audit-corpus/potemkin-gold/` falls in the lowest substance band, which is ADR 0063's own falsifiable test. **The tier itself still reads Gold** until D-01's badge half is ruled, and this ADR does not change that. | The fixture grades Gold, 0 errors, 0 warnings, and nothing in its report says otherwise |
| C3 | **A newcomer reaches a first green gate quickly.** | A scripted run in an empty directory follows the tutorial `docs/tutorials/start-a-plugin-and-reach-bronze.md` to a Bronze gate with 0 errors. It records the commands run, the wall-clock time and every step that failed. No target is set before the first measurement. | Not measured |
| C4 | **Someone outside the organisation uses it.** | The count of issues and pull requests from outside accounts, and the count of repositories outside the maintainer's organisations whose workflows reference the Action, by GitHub code search. | 0 outside issues or pull requests (76 issues: 74 maintainer, 2 automation). 0 outside workflows. 3 stars, 0 forks. npm 538 downloads in the 30 days to 2026-10-29, which likely includes this family's own CI (inferred, not verified) |

A criterion that is measured and fails is recorded as failed, with the number. C1 can fail, and if it does, the behaviour loop does not ship as a headline. The pm-skills pilots set that precedent in this organisation.

### 3. The behaviour loop

- **Create mode** gains a final step. The builder writes an eval suite in the vendor's documented layout, including should-trigger and should-not-trigger cases. It runs `claude plugin eval` with the default with-and-without arm and reports the result. Cases the builder writes are the plugin's own regression suite. They are never the cases C1 scores against.
- **Improve mode** gains a reading step. It reads `aggregate-result.json` and treats a case that lost to the no-plugin arm as a finding to work on, beside the conformance findings.
- **The report gains an evidence section.** It is additive, as ADR 0063 section 5 requires of every report change. It holds the eval result's provenance (the vendor, the command, the Claude Code version, the date), its scores as the vendor reported them, and the fact that they are model-judged. It enters neither the tier, nor the health number, nor the badge. A plugin with no eval result reports `not-measured`, never a default score.
- **Codex.** `claude plugin eval` is Claude-only. A Codex-only plugin reports `not-measured` in the evidence section until a Codex-side evaluator exists to compose with. Claiming otherwise would be the kind of statement ADR 0058 (a vendor that drops a component is a finding, and the proxy is declared) exists to prevent.
- **The vendor contract is pinned before it is read.** The implementing change pins the eval layout and the `aggregate-result.json` schema version as `quote` claims in `foundation/claims/vendor-claims.json`, as ADR 0064 did for the single-plugin scope. If no vendor sentence states them, it records why, and it does not mint a probe without a maintainer ruling, because each probe adds a 30-day release-blocking clock.

### 4. The sequence

This re-orders the 2026-10-25 opportunities plan rather than replacing it. Each item keeps its own acceptance criteria.

1. **W6** (the versioned report object, the health number, and ADV4, the substance screen). It comes first because it carries C2, and because the evidence section is additive to the report object W6 builds.
2. **The behaviour loop**, a new named cut. It carries section 3 and the C1 pilot. Its blocker is this ADR's acceptance and W6.
3. **Cut 3 (evidence)**, which needs two maintainer rulings and no code.
4. **Cut 5 (the graded cohort)**, which grades other people's plugins in public. It waits for W6, so that no outside plugin is published with a Gold the report cannot qualify.
5. **Standard 0.18**, which stays named, not scheduled.

C3 and C4 need no cut. C3 is measured once the scripted run exists, and C4 is counted at every release.

### Consequences

**Positive.**
- The project's goal becomes falsifiable, with baselines, so a release can show what it moved.
- The builders stop being blind to behaviour, at the cost of composing with a tool the vendor maintains.
- The toolkit's unoccupied ground, the whole-library cross-agent gate, stays the foundation instead of being diluted.

**Negative and follow-up.**
- The builders take a runtime dependency on a vendor command whose output contract the toolkit does not control. The `quote` claims are the tripwire, and a vendor change can break the loop between releases.
- Behaviour evidence is Claude-only at first. A Codex user of the builders gets `not-measured`.
- C1 is a real experiment and can fail. If it fails, the loop still ships as regression tooling, but the project loses its leading claim.
- C4 measures adoption, which the toolkit's code does not control. It is in the goal anyway, because a builder nobody uses is not the best builder.
- The name collision with two unrelated `agent-skills-toolkit` repositories means C4 must be counted by what a repository references, not by name.

## What was considered and refused

**Putting eval scores into the health number.** Refused: ADR 0063 rules that no model contributes to any category, and the vendor's `llm` and `baseline` graders are model-judged. A separate evidence section keeps that ruling intact.

**A behavioural rung above Gold now.** Refused for this ADR: D-08 is open, and roadmap section 4 item 4 waits for RS-B1 (the multi-entry credit gap) to complete before any rung certifies behaviour. Reporting evidence beside the verdict needs neither.

**Gating on the evidence.** Refused for this ADR. A deterministic check could read the result file, for example to require that one exists and is newer than the skill it covers. That is a Standard change with its own `since` and warn cap, and it is left to its own decision once the loop has run on real plugins.

**Setting numeric targets for C3 and C4 now.** Refused: a target set before the first measurement is a guess presented as a goal. The baselines are recorded, and targets follow measurement.

## Implementation sites

This ADR is Proposed and implements nothing. On acceptance, these are the sites the named cut would change:

- `docs/internal/roadmap.md` - the goal and criteria quoted verbatim, the new named cut, and the re-ordered sequence. Rows are added with this ADR, marked as awaiting its ruling.
- `skills/askit-build-*/SKILL.md` and `docs/reference/builder-pattern.md` - the create-mode eval step and the improve-mode reading step.
- `scripts/lib/` - a reader for the vendor's `aggregate-result.json`, and the evidence section in the report object W6 builds (`schemas/report.v1.json`, additive).
- `foundation/claims/vendor-claims.json` - `quote` claims for the eval layout and the result schema version.
- `docs/explanation/comparison.md` and `docs/explanation/limitations.md` - the goal stated as a measured claim, and the Codex `not-measured` limit.
- A pre-registration file for the C1 pilot, under `docs/internal/eval-runs/`, committed before the pilot runs.
