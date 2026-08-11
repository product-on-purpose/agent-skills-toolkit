# Anti-example: a chain edge with no permitting contract entry

**Demonstrates the mistake:** a workflow body that claims a step dispatches the next skill internally, but the invoking skill has no `chain:` frontmatter declaration and the contract has no matching entry. Both `S5` and `S4` are silent. The Standard's sec 3.4 requirement is real; the deterministic gate is not.
**Provenance:** authored by `askit-build-workflow` create mode on 2026-07-26 during the SP2b metered authoring pass; raw run artifact under the gitignored `_local/audit/eval-runs/2026-07-26/`.

## Input

The user asked: "I want a workflow where step 1 assesses the repo and then automatically hands off to the grader when it finds a parseable library.json."

The phrase "automatically hands off" is the signal. The user wants a dispatch, not a runner handoff. This is where the orphan trap is set.

## The wrong output

**STOP: the artifact below is WRONG. It must not be copied. The workflow body claims a dispatch that is ungoverned.**

`_workflows/assess-and-grade.md` - WRONG VERSION

```markdown
---
name: assess-and-grade
description: Assesses an existing repo and grades it automatically.
metadata:
  version: 0.1.0
  tier: convergent
  status: active
  agent-targets:
    - claude
    - codex
steps:
  - skill: askit-migrate
  - skill: askit-evaluate
---

# assess-and-grade

## Steps

Step 1: `askit-migrate` (assess mode) surveys the repo. When it finds a parseable `library.json`, it automatically delegates to `askit-evaluate` (step 2) for the per-rule conformance assessment.

Step 2: `askit-evaluate` (conformance mode) receives the plugin root from `askit-migrate` and returns the tier and findings.

## Exit criteria

`askit-evaluate` reports the tier and 0 errors.
```

This workflow is wrong for the following reasons stated in the next section.

## Why it is wrong

**The body claims a dispatch that is not declared or permitted.**

The phrase "automatically delegates to `askit-evaluate`" means `askit-migrate` dispatches `askit-evaluate` as an inter-component invocation. Standard sec 3.4 says every chaining step MUST be permitted by a chain contract (sec 3.6). This invocation is not permitted.

**`S5` (workflow-skills) does not catch it.**

S5 reads the workflow's frontmatter `steps` key and checks that each named skill exists on disk. Both `askit-migrate` and `askit-evaluate` exist. S5 emits 0 errors. The check does not read the body and has no knowledge of whether any skill dispatches another.

**`S4` (chain-contract) does not catch it either.**

S4 reads each component's `metadata.chain` (a comma-separated string, the recommended shape, or a YAML list; falling back to a legacy top-level `chain:` in either shape), then checks: does the contract permit every declared invocation (orphan check), and does every contract entry name a component that exists (phantom check)?

`askit-migrate`'s `SKILL.md` has no `chain:` key. S4 sees no declared invocation from `askit-migrate`, so there is no orphan to detect. S4 never reads the workflow's `steps` list. The contract has no entry for `askit-migrate -> askit-evaluate`, but since there is no `chain:` declaration on `askit-migrate` to match against, S4 has nothing to flag.

Both checks pass. The gate reports 0 errors. The ungoverned dispatch is invisible to the gate.

**The author carries it.**

The deterministic workflow-step permission check is a planned enhancement to the Standard. Until it lands, the workflow is the one place where the Standard's requirement is real and the gate is silent. The author must confirm by hand that every step-to-step dispatch has a matching `chain:` declaration on the invoking skill AND a matching contract entry.

**The body has two more deficiencies independent of the permission gap:**

- No named artifacts handed between steps. "receives the plugin root" is vague; the handoff should name the exact value passed (e.g., the plugin root path as a string).
- No failure branches. What does the runner do if `askit-migrate` cannot produce a gap report because `library.json` is absent?

## What the builder does instead

Two correct resolutions exist. Choose the one that matches the actual behavior:

**Resolution A: re-frame as runner-driven (the right choice when no actual dispatch occurs)**

If `askit-migrate` does not programmatically call `askit-evaluate` - if the runner reads `askit-migrate`'s output and then manually invokes `askit-evaluate` - the body must say so. Nothing is owed to the contract (sec 3.6 is conditional), and the body stops claiming a dispatch:

`_workflows/assess-and-grade.md` - CORRECT, runner-driven version

```markdown
---
name: assess-and-grade
description: Assesses an existing skills repo and grades it against the Standard. Use when surveying a foreign plugin and wanting a gap report plus the current tier in one session.
metadata:
  version: 0.1.0
  tier: convergent
  status: active
  agent-targets:
    - claude
    - codex
steps:
  - skill: askit-migrate
  - skill: askit-evaluate
---

# assess-and-grade

## Steps

**Step 1: `askit-migrate` (assess mode)**

Input: the foreign plugin root path.

Output: a gap report listing which checks fail and why, keyed to Bronze and Silver tiers, including error counts.

Artifact handed on: the plugin root path and the gap report (or a note that `library.json` is absent and `adopt` mode must run first).

Exit criterion: the gap report is produced. If `library.json` is absent, halt and run `askit-migrate` adopt mode before restarting this arc.

Failure: if the directory structure is too non-standard to map, surface the raw listing and halt.

**Step 2: `askit-evaluate` (conformance mode)**

Input: the plugin root from step 1 (only reachable if step 1 confirmed `library.json` exists).

Output: per-rule conformance report, tier, error count.

Artifact handed on: `{ tier, errors, warnings }` summary.

Exit criterion: report produced with a named tier and a defined error count. The runner decides whether the tier meets the goal.

Failure: if `askit-evaluate` cannot locate `library.json`, re-run step 1 in adopt mode to scaffold it, then re-run both steps.

## Why this order matters

Assess must come before grade: the grader assumes a parseable `library.json`. Running step 2 on a repo that step 1 would have flagged as pre-manifest wastes a run. Steps cannot be swapped.

## No chain contract is owed

The runner reads step 1's output and then manually invokes step 2. No component dispatches another. Standard sec 3.6 is a CONDITIONAL MUST: required only if a component invokes another. No contract entry is needed.

## Exit criteria

`askit-evaluate` (step 2) produces a report naming the tier reached and the count of remaining errors.
```

**Resolution B: govern the dispatch properly (the right choice when a real dispatch exists)**

If `askit-migrate` genuinely dispatches `askit-evaluate` programmatically, both the frontmatter and the contract must reflect it.

`askit-migrate/SKILL.md` frontmatter (addition):

```yaml
metadata:
  chain: askit-evaluate
```

(A comma-separated string is the recommended shape for `metadata.chain` - see `authoring-chain-contracts.md` for why. S4 still reads a YAML list here too.)

`agents/_chain-permitted.yaml` (addition):

```yaml
askit-migrate:
  - askit-evaluate
```

With both changes in place, S4 finds the `metadata.chain` declaration on `askit-migrate`, checks the contract, and confirms the edge is permitted. The invocation is now governed.

## How to detect it

The deterministic gate does NOT detect this mistake. Here is exactly what each check reads and what each misses:

| Check | Reads | Catches | Does NOT catch |
|---|---|---|---|
| `S5` (workflow-skills) | the workflow's frontmatter `steps` | a step naming a skill not on disk | anything about permission or dispatch |
| `S4` (chain-contract) | each component's `metadata.chain` (string or list; falling back to a legacy top-level `chain:`) + the contract file | an orphan (declared chain without a matching contract entry) and a phantom (contract entry with no matching component) | the workflow's `steps` list; a dispatch that is not declared |

A workflow body that claims a dispatch but has no `metadata.chain` declaration on the invoking skill is invisible to both checks. The gate reports 0 errors. The author must inspect the body by hand and confirm: does any step claim to dispatch the next? If yes, is the dispatching skill's `metadata.chain` declared? Is the contract entry present? The answers must all be yes, or the arc must be re-framed as runner-driven.

## The opposite failure: a blanket contract entry

The craft doc names a second trap: a contract entry added "to be safe" for an invocation that does not actually happen.

Wrong contract addition:

```yaml
askit-migrate:
  - askit-evaluate
```

If this entry is added but `askit-migrate` never actually dispatches `askit-evaluate`, two problems follow:

1. **Phantom on rename.** The day `askit-evaluate` is renamed, S4 will emit a phantom error for this contract entry. A phantom is noise; it makes real phantoms harder to see and requires cleanup on every rename.

2. **Gold G3 eval obligation for a call that never fires.** At Gold, the `library-regression` check (G3) requires at least one `evals/*.eval.json` with `"covers": {"chain": ["askit-migrate", "askit-evaluate"]}` for every edge in the contract. A contract entry for an invocation that never happens creates an eval obligation that can never be satisfied by a real run. An eval covering an edge the contract no longer permits is itself a stale-case finding.

The lesson: declare contract entries per edge, deliberately, after confirming the dispatch is real. The body is where you write down why.
