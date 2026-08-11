# Golden example: chain contract with two caller edges

**Demonstrates:** authoring `agents/_chain-permitted.yaml` for a plugin where two skills each chain to subagents, showing the orphan and phantom error classes and the G3 eval-coverage obligation each permitted edge creates.
**Provenance:** authored by `askit-build-chain-contract` create mode on 2026-07-26 during the SP2b metered authoring pass; raw run artifact under the gitignored `_local/audit/eval-runs/2026-07-26/`.

## Input

The user asked:

> My `doc-assistant` plugin has two skills that invoke subagents. `da-draft` chains to `da-writer`, and `da-review` chains to both `da-grader` and `da-writer`. Create the chain contract.

| Interview question | Answer |
|---|---|
| Which components chain to which? | `da-draft -> da-writer`; `da-review -> da-grader` and `da-review -> da-writer` |
| Are all target subagents present on disk? | Yes: `agents/da-writer.md` and `agents/da-grader.md` both exist |
| Does an `agents/` directory already exist? | Yes |

## Output

### Step 1: verify the `metadata.chain` declarations in the skill frontmatter

Each skill must declare its own intent before the contract can grant permission. `metadata.chain` is written as a comma-separated string, the recommended shape (a YAML list under `metadata.chain` gets silently rewritten to a Python list repr by the reference implementation's metadata coercion - see `authoring-chain-contracts.md`). These are the relevant excerpts from the two skill files:

#### `skills/da-draft/SKILL.md` (frontmatter excerpt)

```yaml
---
name: da-draft
description: Drafts a documentation section from a spec. Use when authoring new docs from a component spec or an outline.
metadata:
  version: 0.1.0
  tier: universal
  chain: da-writer
---
```

#### `skills/da-review/SKILL.md` (frontmatter excerpt)

```yaml
---
name: da-review
description: Reviews and grades a documentation page for completeness. Use when a docs page needs a quality pass or gap analysis before publishing.
metadata:
  version: 0.1.0
  tier: universal
  chain: da-grader, da-writer
---
```

### Step 2: diagnose the broken state before writing the contract

Before the contract file exists, `node scripts/evaluate.mjs . --json` reports:

```
[S4] ORPHAN  skills/da-draft/SKILL.md   chain "da-draft -> da-writer" is not permitted by agents/_chain-permitted.yaml
[S4] ORPHAN  skills/da-review/SKILL.md  chain "da-review -> da-grader" is not permitted by agents/_chain-permitted.yaml
[S4] ORPHAN  skills/da-review/SKILL.md  chain "da-review -> da-writer" is not permitted by agents/_chain-permitted.yaml
```

An **orphan** is a `chain:` declaration in a skill's frontmatter that the contract does not permit.

### Step 3: author `agents/_chain-permitted.yaml`

```yaml
# Chain contract for doc-assistant.
# One entry per caller; lists every callee that caller may invoke.
# Re-run evaluate after editing: node scripts/evaluate.mjs . --json

da-draft:
  - da-writer

da-review:
  - da-grader
  - da-writer
```

### Step 4: what a phantom looks like (and how to catch it)

If the contract named a component that does not exist on disk, evaluate reports a **phantom**:

```
[S4] PHANTOM agents/_chain-permitted.yaml  entry "da-ghostwriter" names a component not found on disk
```

Fix a phantom by correcting the misspelled name, removing the stale entry, or creating the missing component. A phantom means the contract is ahead of reality.

### Step 5: the G3 eval-coverage obligation each edge creates

Every permitted edge must have a corresponding `covers: { chain: [...] }` eval-set case so the `library-regression` check (G3) finds coverage. For each of the two caller edges above, add a behavior case in `evals/da-draft.eval.json` and `evals/da-review.eval.json`:

```json
{
  "covers": { "chain": ["da-draft", "da-writer"] },
  "description": "Coverage for the da-draft -> da-writer delegation edge.",
  "cases": [
    {
      "given": "da-draft invokes da-writer to draft a How-To section",
      "expect": "da-writer receives the spec and returns a draft section; da-draft returns the combined output"
    }
  ]
}
```

```json
{
  "covers": { "chain": ["da-review", "da-grader", "da-writer"] },
  "description": "Coverage for da-review delegating to da-grader and da-writer.",
  "cases": [
    {
      "given": "da-review invokes da-grader then da-writer on a docs page",
      "expect": "da-grader grades the page and da-writer revises the gaps; da-review surfaces the result"
    }
  ]
}
```

### Step 6: confirm the gate is clean after the fix

```
$ node scripts/evaluate.mjs . --json
{
  "tier": "bronze",
  "errors": 0,
  "warnings": 0,
  "findings": []
}
```

S4 is now clean: every `chain:` invocation is permitted (no orphans) and every contract entry names an on-disk component (no phantoms).

## Why this is golden

- **Conditional MUST in action** (sec 3.6, `authoring-chain-contracts.md`): the contract is authored because inter-component invocations exist - this golden does not ship an empty contract for ceremony, and it does not skip the contract when chains do exist.
- **Orphan and phantom both illustrated** (S4): step 2 shows the exact S4 error messages for an orphan (missing contract permission) and step 4 shows the exact message for a phantom (contract entry naming a missing component), so a reader can recognize both failure modes.
- **Two-caller structure** (sec 3.6): the contract has two top-level entries (`da-draft` and `da-review`), and `da-review` lists two callees (`da-grader` and `da-writer`), exercising the multi-callee case that a single-edge example would miss.
- **G3 eval obligation per edge** (G3, `askit-build-samples` sec 7.2 / sec 8.3): step 5 shows the `covers: { chain: [...] }` eval-set case format that `library-regression` requires for each permitted edge, making the connection between the contract and the sample-set requirement explicit.
- **Format matches the real toolkit contract** (sec 3.6): the YAML shape mirrors `agents/_chain-permitted.yaml` in the toolkit itself (one top-level key per caller, a list of callees), so the example is ground-truthed against a working example.

## Verification

Verify the builder skill exists:

```
$ ls skills/askit-build-chain-contract/SKILL.md
skills/askit-build-chain-contract/SKILL.md
```

Verify the real toolkit contract (ground-truth for format):

```
$ ls agents/_chain-permitted.yaml
agents/_chain-permitted.yaml
```

The chain-permitted.yaml format has no YAML frontmatter (it is a plain mapping, not a SKILL.md); there is no frontmatter to parse. The skill and subagent names used in the example (`da-draft`, `da-review`, `da-writer`, `da-grader`) are fictional components in a hypothetical plugin - they live inside fenced code blocks and are not files in this worktree.
