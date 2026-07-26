---
title: "Reading paths"
description: "Six guided routes through the documentation, one per kind of reader, naming what each resource is and why it matters."
audience: both
level: beginner
tags: [navigation, orientation, reading-path, onboarding, docs-map]
---

# Reading paths

There are around 70 pages here. Almost nobody should read them in order. This page gives you a route.

Find the row that sounds most like you, read the pages in the order given, and stop when you have what you need. Every route is designed to be useful if you abandon it halfway.

| I am... | Start here | Time |
|---|---|---|
| [Deciding whether this is worth my time](#1-deciding-whether-this-is-worth-it) | [Why a standard](why-a-standard.md) | 10 min |
| [A non-engineer who has to work with this](#2-non-engineer-working-with-a-team-that-uses-it) | [Why a standard](why-a-standard.md) | 30 min |
| [An engineer starting a new plugin](#3-engineer-starting-a-new-plugin) | [Quick start](../../QUICKSTART.md) | 1 hour |
| [Bringing an existing skills repo up to the bar](#4-bringing-an-existing-repo-up-to-the-bar) | [Adopt a foreign repo](../how-to/adopt-a-foreign-repo.md) | 2 hours |
| [Grading someone else's library](#5-grading-a-library-you-do-not-own) | [Conformance and tiers](conformance-and-tiers.md) | 30 min |
| [Extending or contributing to the toolkit](#6-extending-the-toolkit) | [Architecture](architecture.md) | Half a day |

---

## 1. Deciding whether this is worth it

You have ten minutes and a healthy scepticism.

1. **[Why a standard, and what it delivers](why-a-standard.md)** - the case, the outcomes, and an honest account of what it does not do. If it does not convince you, stop; nothing further will.
2. **[How agent-skills-toolkit compares](comparison.md)** - where this sits against the other tools in the space. Verified against primary sources, with the gaps labelled.
3. **[How the toolkit is validated and improved](validation-and-improvement.md)** - the answer to "how do you know the grader is any good?"

**Then just run it.** Grading costs nothing and takes seconds:

```bash
node scripts/check.mjs <any-plugin-path> --profile plain-plugin
```

## 2. Non-engineer working with a team that uses it

You need to read the output, understand the grades, and know what you are asking for.

1. **[Why a standard, and what it delivers](why-a-standard.md)** - the premise and the payoff.
2. **[Conformance and tiers](conformance-and-tiers.md)** - what Bronze, Silver, and Gold actually mean. This is the vocabulary every conversation will use.
3. **[Glossary](glossary.md)** - keep it open. When a doc uses a word you do not know, it is here.
4. **[FAQ](faq.md)** - the questions people ask first.
5. **[Evaluation reports](../reference/evaluation-reports.md)** - how to read a generated report. Every report also carries a built-in glossary explaining each check in one line, so you can act on a grade without having read the Standard.

**Skip entirely:** `STANDARD.md`, anything under `docs/reference/askit-*`, and `architecture-internals.md`. None of them are written for you.

## 3. Engineer starting a new plugin

1. **[Quick start](../../QUICKSTART.md)** - install, grade something, see the output.
2. **[Start a plugin and reach Bronze](../tutorials/start-a-plugin-and-reach-bronze.md)** - the guided version. Scaffold, add a skill, earn the grade.
3. **[Build your first skill](../tutorials/build-your-first-skill.md)** - turns an idea into a conformant skill with `askit-build-skill`.
4. **[Conformance and tiers](conformance-and-tiers.md)** - now that you have a grade, understand what it means.
5. **[Universal checks](../reference/universal-checks.md)** - the Bronze floor, check by check. Read this when something fails and you want to know why the rule exists.
6. **[Climb from Bronze to Silver](../how-to/climb-from-bronze-to-silver.md)** - when you are ready.

**Declare Bronze first.** It is not a downgrade, it is what right-sizes the gate. Gold requires a full documentation tree, self-hosting CI, release notes, and per-folder READMEs. All good things, all wrong for week one. The ladder is cumulative, so nothing is rework.

## 4. Bringing an existing repo up to the bar

You have skills already. You want to know where you stand and what it costs.

1. **Grade it first, before reading anything:**
   ```bash
   node scripts/check.mjs <your-repo> --profile plain-plugin   # what is actually broken
   node scripts/check.mjs <your-repo>                          # + what adopting the Standard would need
   ```
   The gap between those two numbers is the honest scope of the work. On real repos it is often 10x.
2. **[Adopt a foreign repo](../how-to/adopt-a-foreign-repo.md)** - the procedure, using `askit-migrate` to write the minimal manifest and produce a staged plan.
3. **[Conformance and tiers](conformance-and-tiers.md)** - pick a target tier honestly.
4. **[Troubleshoot the gate](../how-to/troubleshoot-the-gate.md)** - when a finding does not make sense.
5. **[Gate configuration](../reference/gate-config.md)** - per-rule severity, profiles, suppressions, and the Standard version pin. Pinning matters: it stops rules written after your code from retroactively failing it.

## 5. Grading a library you do not own

1. **[Conformance and tiers](conformance-and-tiers.md)** - especially the provenance model.
2. **[Gate configuration](../reference/gate-config.md)** - read the `--profile plain-plugin` section carefully. It grades portable correctness only and writes nothing into their tree.
3. **[Evaluation reports](../reference/evaluation-reports.md)** - generate something shareable rather than pasting terminal output.
4. **[How the toolkit is validated and improved](validation-and-improvement.md)** - read the calibration section before you send anyone a finding.

**The discipline that matters more than any page here:** always run both profiles, and lead with the plain-plugin number. Telling a maintainer they have 159 errors when 148 of them are "you have not adopted our conventions" is not a review, it is an insult with a tool attached.

## 6. Extending the toolkit

1. **[Architecture](architecture.md)** - the two halves and how they fit.
2. **[Architecture internals](architecture-internals.md)** - the exact shapes: a check module, the tier registry, the load-plugin context, the generators.
3. **[`STANDARD.md`](../../STANDARD.md)** - the normative rules you are implementing. 505 lines, RFC-2119.
4. **[Builder pattern](../reference/builder-pattern.md)** - the shared shape every `askit-build-*` skill follows.
5. **[Record a decision](../how-to/record-a-decision.md)** - every behavioral change is ADR-gated. This is not optional here.
6. **[How the toolkit is validated and improved](validation-and-improvement.md)** - the observe, verify-against-ground-truth, calibrate loop. Read this before you change a check's behavior, because the rule is that you verify a surprising finding by hand before you "fix" the checker.

---

## The reference shelf

Not a path. Things to look up when you need them.

| Resource | What it is | When you want it |
|---|---|---|
| [`STANDARD.md`](../../STANDARD.md) | The normative Standard, RFC-2119, versioned | Settling an argument about what is required |
| [Universal](../reference/universal-checks.md) / [Silver](../reference/silver-checks.md) / [Gold](../reference/gold-checks.md) checks | Per-tier breakdowns, check by check | A specific finding needs explaining |
| [Glossary](glossary.md) | The vocabulary | Any time |
| [FAQ](faq.md) | Common questions | Early |
| [Gate configuration](../reference/gate-config.md) | Profiles, severity, suppressions, version pin | Adapting the gate to a real team |
| [Token usage estimates](../reference/token-usage-estimates.md) | Measured cost of the AI layer, by model and effort | Budgeting an advisory run |
| [Frontmatter taxonomy](../reference/frontmatter-taxonomy.md) | The docs frontmatter contract | Adding a public docs page |
| [Evaluation reports](../reference/evaluation-reports.md) | The five report types | Producing something shareable |
| `docs/reference/askit-*.md` | One page per skill in the catalog | You know which skill you want |
| [`docs/how-to/`](../how-to/) | Task-shaped recipes | You have a specific job to do |

## A note on how these docs are organized

The documentation follows [Diataxis](https://diataxis.fr/), which splits writing by what the reader is doing:

- **Tutorials** teach through a guided lesson. Start here when learning.
- **How-to guides** solve one specific problem. Come here when working.
- **Reference** describes what things are. Come here to look something up.
- **Explanation** (this quadrant) discusses why. Come here to understand.

If a page feels like it is answering the wrong question, it is probably in the wrong quadrant, and that is worth reporting.
