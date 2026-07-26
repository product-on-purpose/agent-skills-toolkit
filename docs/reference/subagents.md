---
title: "Subagent reference"
description: "One section per askit subagent covering purpose, parent skill, and chain permissions sourced from agents/_chain-permitted.yaml."
audience: engineer
level: intermediate
tags: [subagents, chain, agents, reference]
---

# Reference: askit subagents

The seven askit subagents are bounded, read-only or narrowly scoped delegates that parent skills dispatch for specific phases of work. None owns its own conversation; each is invoked by a parent skill via the agent chain contract. Chain permissions are governed by `agents/_chain-permitted.yaml` - a subagent not listed there for a given parent may not be dispatched by that parent.

## askit-evaluator

**Purpose.** The delegated assessment role behind `askit-evaluate`. Runs `node scripts/evaluate.mjs <target> --json` and reports findings grouped by severity and requirement ID, each with its file path and the remediation the message states. Read-only: it never edits the target.

**Parent skill.** `askit-evaluate` (primary); also dispatched by `askit-skill-author` for post-authoring conformance checks.

**Chain permissions** (from `agents/_chain-permitted.yaml`).
- Permitted callers: `askit-evaluate`, `askit-skill-author`

---

## askit-explorer

**Purpose.** A bounded, read-only discovery delegate. Surveys a repository broadly and returns a structural map of its components and layout: what component types are present, where they live, what manifests exist, and what conventions the repo follows. It reads excerpts to locate and classify, not whole files, and never edits. The broad counterpart to `askit-file-search` (which resolves a single known query).

**Parent skill.** Used behind discovery-heavy skills such as `askit-migrate` (assess mode), where a foreign repo must be surveyed before it can be graded.

**Chain permissions** (from `agents/_chain-permitted.yaml`).
- Not listed in `_chain-permitted.yaml`; may be dispatched ad-hoc by skills that do not formally declare a chain contract.

---

## askit-file-ops

**Purpose.** A bounded file-mutation delegate. Carries out a specified set of create and edit operations precisely: the "do the writes" role an authoring skill delegates to once it has decided what to change. It applies exactly the operations given; it does not decide scope, design content, or run commands. Read-before-write is mandatory.

**Parent skill.** Used by authoring skills that have already decided what to write, such as `askit-build-skill` (improve mode) and `askit-build-docs`.

**Chain permissions** (from `agents/_chain-permitted.yaml`).
- Not listed in `_chain-permitted.yaml`; may be dispatched ad-hoc by skills that do not formally declare a chain contract.

---

## askit-file-search

**Purpose.** A bounded, read-only search delegate. Answers a precise locate question: which files match a pattern or where a symbol or string lives. Returns paths with the matched lines. The pinpoint counterpart to `askit-explorer`: explorer maps breadth (what is here), file-search resolves a known query (where is X). Never edits.

**Parent skill.** Used by any skill that needs to locate a specific file, symbol, or text pattern before acting.

**Chain permissions** (from `agents/_chain-permitted.yaml`).
- Not listed in `_chain-permitted.yaml`; may be dispatched ad-hoc by skills that do not formally declare a chain contract.

---

## askit-quality-grader

**Purpose.** The behavioral-judge delegate behind `askit-evaluate`'s behavioral mode. Runs a skill against its eval-set (`evals/` triggering and behavior cases) and judges, case by case, whether the skill fires when it should, stays silent when it should not, and produces the expected behavior. Reports a per-case verdict with evidence. This is the LLM-judged layer that sits beside the deterministic gate and cannot change the CI pass/fail result (Design Principle 3). Distinct from `askit-evaluator` (deterministic conformance) and `askit-reviewer` (qualitative artifact review).

**Parent skill.** `askit-evaluate` (behavioral mode only).

**Chain permissions** (from `agents/_chain-permitted.yaml`).
- Permitted callers: `askit-evaluate`

---

## askit-reviewer

**Purpose.** A bounded, read-only review delegate. Forms judgments a deterministic check cannot: is the change correct, does it honor the Standard's intent (not just its lettered rules), is the description at the right altitude, is the component warranted rather than a would-be mode of an existing one? Reports findings with severity and a concrete remediation per finding. The qualitative complement to `askit-evaluator`. Never edits.

**Parent skill.** `askit-evaluate` (review mode).

**Chain permissions** (from `agents/_chain-permitted.yaml`).
- Permitted callers: `askit-evaluate`

---

## askit-skill-author

**Purpose.** The delegated authoring role behind `askit-build-skill`. Scaffolds `skills/<name>/` from the skill template, writes a conformant `SKILL.md` (frontmatter and body), emits native manifests for the declared agent targets (`gen-manifest --write --target=all`), and iterates to zero gate errors. Delegates conformance assessment to `askit-evaluator`. The one subagent in this set that has both read and write access plus Bash (needed for scaffolding and manifest generation).

**Parent skill.** `askit-build-skill`.

**Chain permissions** (from `agents/_chain-permitted.yaml`).
- Permitted callers: `askit-build-skill`
- May in turn chain to: `askit-evaluator` (for post-authoring conformance checks)
