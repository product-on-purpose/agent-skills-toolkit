# Golden example: a skill that delegates

**Demonstrates:** a skill that keeps the deterministic half and dispatches a subagent for the judgment half, with all three places the delegation has to be written down in agreement: the `chain:` frontmatter, the entry in `agents/_chain-permitted.yaml` (`S4`), and the eval set that covers the edge (`G3`).
**Provenance:** authored by `askit-build-skill` create mode on 2026-07-26 during the SP2b metered authoring pass; raw run artifact under the gitignored `_local/audit/eval-runs/2026-07-26/`.

## Input

> "`npm audit` gives us 40 advisories every week and we fix the wrong ones. I want a skill that tells us which ones actually matter for our code."

| Interview question | Answer |
|---|---|
| Skill name (kebab-case) | `dependency-audit` |
| What does it do? | Collects the advisories, gets each judged for reachability, and ranks them. |
| When should it fire? | "audit our dependencies", "any CVEs?", "triage this npm audit output", "what do we fix first?". |
| Trigger keywords | dependency audit, CVE, advisory, npm audit, vulnerability, triage |
| Decision 1: is this one skill? | Yes. One output, a ranked report. The reachability verdict is an input to the report, produced by a subagent, not a second deliverable a user asks for on its own. |
| What is delegated, and why? | Collection is a command and stays inline. Reachability is a judgment over unfamiliar code, so it goes to a bounded subagent, `dep-risk-analyst`, whose contract forbids the failure mode that matters (an unevidenced all-clear). |

The delegation test used here: **delegate the part where the answer is a judgment, keep the part where the answer is a command.** A subagent that runs `npm audit` for you buys nothing and costs a dispatch.

## Output

Four files, in three places. The skill is one of them; the other three are what make the delegation legal and covered.

```
skills/dependency-audit/SKILL.md
agents/dep-risk-analyst.md
agents/_chain-permitted.yaml
evals/dependency-audit-to-risk-analyst.eval.json
```

### `skills/dependency-audit/SKILL.md`

```markdown
---
name: dependency-audit
description: Audits a project's dependency tree for known vulnerabilities and returns a triaged report ranking each advisory by whether the vulnerable code path is reachable. Use when the user asks to audit dependencies, check for CVEs, triage npm audit output, or decide which advisory to fix first.
metadata:
  version: 0.1.0
  tier: convergent
  audience: intermediate
  chain: dep-risk-analyst
---

# dependency-audit

## Purpose
Collect the advisories deterministically, then get each one judged for reachability in this codebase.
The collection is a command; the judgment is not, so the judgment is delegated to the
`dep-risk-analyst` subagent and this skill owns the report.

## When to use
When the user asks to audit dependencies, check for CVEs, triage `npm audit` output, or decide which
advisory to fix first.

## Steps
1. Collect: `npm audit --json > audit.json`. If the command fails because there is no lockfile, say so
   and stop; an audit without a lockfile grades a tree that does not exist.
2. Reduce to one row per advisory: package, installed version, severity, patched range, and the
   dependency path. Deduplicate by advisory id, keeping the shallowest path.
3. Decide whether to delegate.
   - Zero advisories: report the clean result and stop. Do not dispatch.
   - Every advisory has a patch and the direct dependency can take it: report the upgrade list and
     stop. Reachability does not change the action when the action is one `npm update`.
   - Otherwise: delegate. Pass the reduced rows and the repo path to `dep-risk-analyst` and ask for a
     reachability verdict per advisory (`reachable`, `unreachable`, `unknown`) with the importing file
     and line as evidence.
4. Merge the verdicts back into the rows. A verdict with no evidence line is recorded as `unknown`,
   never as `unreachable`; an unsupported all-clear is the failure this split exists to prevent.
5. Rank: reachable before unknown before unreachable, then by advisory severity, then by how deep the
   dependency sits. Write the report with the fix for each row and the evidence for each verdict.

## Exit condition
Done when every advisory carries a verdict and a recommended action, and every `unreachable` verdict
cites the evidence that supports it.

## Chain
This skill declares `metadata.chain: dep-risk-analyst` in its frontmatter (a string, the recommended
shape - see `authoring-chain-contracts.md` for why). That declaration is one of three places the
delegation has to be written down: the contract at `agents/_chain-permitted.yaml` must permit
`dependency-audit -> dep-risk-analyst`, and `evals/` must carry a set whose `covers.chain` is that
pair, or the Gold regression check (G3) reports the edge as uncovered.
```

### `agents/_chain-permitted.yaml`

The plugin-level contract. Every caller is a key; its value is the list it may invoke. A scalar shorthand is rejected by `S4`, so the callee always sits in a YAML sequence:

```yaml
dependency-audit:
  - dep-risk-analyst
```

### `agents/dep-risk-analyst.md`

The callee has to exist on disk, or `S4` reports the contract entry as a phantom. Keeping its contract narrow is what makes the delegation safe:

```markdown
---
name: dep-risk-analyst
description: Judges whether a vulnerable dependency's affected code path is reachable from this repository, returning a verdict per advisory with the importing file and line as evidence. Use when delegating reachability triage from dependency-audit.
tools:
  - Read
  - Grep
  - Glob
metadata:
  version: 0.1.0
  tier: convergent
  status: active
---

# dep-risk-analyst

The bounded judgment half of `dependency-audit`. It receives reduced advisory rows and answers one
question per row: is the affected export actually reached from this repository?

## Contract

Input: a list of `{ advisoryId, package, version, affectedExports, dependencyPath }` plus the repo root.

Output: one object per advisory: `{ advisoryId, verdict, evidence }`, where `verdict` is `reachable`,
`unreachable`, or `unknown`, and `evidence` is a `file:line` for a `reachable` or `unreachable`
verdict.

## Rules

1. Search for the import, then for the affected export. An import with no call to the affected export
   is `unreachable` only when the export is the sole vulnerable surface; otherwise it is `unknown`.
2. Never return `unreachable` without an evidence line. Absence of a grep hit is `unknown`, because a
   dynamic import or a re-export can hide the call.
3. Do not recommend upgrades or edit files. The caller owns the report and the actions.
```

### `evals/dependency-audit-to-risk-analyst.eval.json`

The `G3` consequence. At Gold, every permitted edge MUST carry at least one eval case, and the `covers.chain` pair is how the check finds it. The shape is the one in [samples-format.md](../../askit-build-samples/references/samples-format.md); this repo's own chain evals, for example `evals/build-skill-to-author.eval.json`, are the same shape:

```json
{
  "covers": { "chain": ["dependency-audit", "dep-risk-analyst"] },
  "description": "dependency-audit delegates per-advisory reachability triage to dep-risk-analyst.",
  "cases": [
    {
      "given": "an audit with three advisories, two of which have no patched release",
      "expect": "dependency-audit dispatches dep-risk-analyst and every returned verdict is reachable, unreachable, or unknown"
    },
    {
      "given": "an advisory whose verdict comes back unreachable with no evidence line",
      "expect": "dependency-audit records it as unknown rather than unreachable"
    },
    {
      "given": "an audit that reports zero advisories",
      "expect": "dependency-audit reports the clean result and dispatches no subagent"
    }
  ]
}
```

### The three halves, and what breaks when one is missing

| Half | Where | Check | What it reports if it is missing |
|---|---|---|---|
| The declaration | `chain:` in the caller's frontmatter | `S4` | Nothing. A skill that delegates without declaring it is invisible to both checks; the declaration is what starts the chain of enforcement. |
| The permission | `agents/_chain-permitted.yaml` | `S4` | An orphan error: the component declares an invocation the contract does not permit. |
| The coverage | `evals/*.eval.json` with `covers.chain` | `G3` | An uncovered-edge error at Gold: the permitted edge carries no regression case. |

Note the asymmetry in the first row. `S4` and `G3` both key off what is declared, so an undeclared delegation is not caught by anything. Declaring the chain is what buys the enforcement.

## Why this is golden

- **The delegation boundary is drawn where the answer stops being deterministic,** and step 3 states the two cases where dispatching is the wrong call, so the skill does not pay for a subagent it does not need.
- **All three halves agree, and the agreement is verified by the real checks** (`S4` and `G3`) rather than asserted, including a transcript of each check failing when one half is removed.
- **The subagent contract closes the failure mode the delegation introduces.** Rule 2 in the callee and step 4 in the caller both refuse an unevidenced `unreachable`, which is the recorded cheap-tier failure pattern: a confident all-clear that nothing supports.
- **The eval set is real coverage, not a placeholder.** The three cases exercise the dispatch, the evidence rule, and the no-dispatch path, which is what makes it a regression signal (Standard sec 8.3, `G3`).
- **Frontmatter and layout conform:** `name` equals the directory (`U4`), `metadata.chain` is a comma-separated string (the recommended shape) per sec 3.6, `metadata.version` is present per sec 3.7, and the contract lives at the plugin level per sec 10.1.

## Verification

The scratch plugin holds all four files. Loading it and running the two checks that own the chain:

```
$ node -e "
Promise.all([
  import('./scripts/lib/load-plugin.mjs'),
  import('./scripts/checks/chain-contract.mjs'),
  import('./scripts/checks/library-regression.mjs')
]).then(([lp, s4, g3]) => {
  const root = '_local/audit/eval-runs/2026-07-26/dep-plugin';
  const ctx = lp.loadPlugin(root);
  console.log('skills:', ctx.skills.map(s=>s.name), 'subagents:', ctx.subagents.map(a=>a.name));
  console.log('S4 chain-contract:', JSON.stringify(s4.check(ctx)));
  console.log('G3 library-regression:', JSON.stringify(g3.check(ctx)));
});"
skills: [ 'dependency-audit' ] subagents: [ 'dep-risk-analyst' ]
S4 chain-contract: []
G3 library-regression: []
```

Removing the eval file and re-running `G3`:

```
[
  {
    "check": "library-regression",
    "severity": "error",
    "message": "chain \"dependency-audit -> dep-risk-analyst\" has no eval/regression case under evals/ (every chained invocation MUST carry at least one eval case at Gold - G3). Add evals/<name>.eval.json with \"covers\": { \"chain\": [\"dependency-audit\", \"dep-risk-analyst\"] }.",
    "file": "evals/",
    "reqId": "G3"
  }
]
```

Emptying the contract entry to `dependency-audit: []` and re-running `S4`:

```
[
  {
    "check": "chain-contract",
    "severity": "error",
    "message": "\"dependency-audit\" declares (frontmatter chain) that it may invoke \"dep-risk-analyst\" but agents/_chain-permitted.yaml does not permit \"dependency-audit\" -> \"dep-risk-analyst\" (orphan; Standard sec 3.6).",
    "file": "agents/_chain-permitted.yaml",
    "reqId": "S4"
  }
]
```

Both were restored, and the skill grades clean at component scope:

```
$ node scripts/evaluate.mjs _local/audit/eval-runs/2026-07-26/dep-plugin/skills/dependency-audit --json
{
  "scope": "component",
  "target": "_local/audit/eval-runs/2026-07-26/dep-plugin/skills/dependency-audit",
  "findings": [],
  "byRule": {},
  "summary": {
    "errors": 0,
    "warns": 0
  },
  "profile": "askit-library",
  "mode": "local"
}
```

The `U5` score of the authored description:

```
$ node -e "import('./scripts/checks/description-score.mjs').then(m=>console.log(m.scoreDescription(\"Audits a project's dependency tree for known vulnerabilities and returns a triaged report ranking each advisory by whether the vulnerable code path is reachable. Use when the user asks to audit dependencies, check for CVEs, triage npm audit output, or decide which advisory to fix first.\")))"
0.9999999999999999
```

Create-mode step 5 (`gen-manifest.mjs`) was not run: this artifact is an example, not a component registered in a plugin manifest.
