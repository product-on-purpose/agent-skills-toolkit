# Golden example: drift-detection subagent with chain declaration

**Demonstrates:** authoring a new subagent (`askit-samples-validator`) that has a bounded job, a declared `chain`, and the full set of required frontmatter fields - plus the three companion artifacts a chain declaration creates: the `_chain-permitted.yaml` entry, the `library.json` registration, and the G3 eval file.
**Provenance:** authored by `askit-build-subagent` create mode on 2026-07-26 during the SP2b metered authoring pass; raw run artifact under the gitignored `_local/audit/eval-runs/2026-07-26/`.

## Input

User asked: "Create a subagent for askit-build-samples validate mode. It should re-run a skill's evidence set and flag any drift. It can call askit-evaluator when a drift case needs a full conformance pass."

| Field | Value |
|---|---|
| Name (kebab-case, equals file basename) | `askit-samples-validator` |
| Bounded job | Drift detection: re-run a skill's `examples/` and `evals/` against current behavior; report each case that no longer holds as an error |
| Narrowest tools | `Read` (inspect evidence files), `Bash` (run `node scripts/evaluate.mjs` when a drift case requires a gate pass) |
| Chain (invoked components) | `[askit-evaluator]` - delegates conformance gate runs when drift touches a Standard requirement |
| Targets | Claude only (`agent-targets: [claude]`) - Codex v0.135 plugins cannot ship subagents (Standard sec 3.3) |
| Parent skill | `askit-build-samples` validate mode |

---

## Output

These artifacts live as fenced blocks because creating them for real would change the plugin's graded component set (S3 `components-index` would gain a new subagent entry; S4 `chain-contract` would need the new `_chain-permitted.yaml` edge). The paths shown are where they would be written.

---

### `agents/askit-samples-validator.md`

```markdown
---
name: askit-samples-validator
description: Validates a skill's evidence set (examples/ and evals/) for drift against current behavior. Use when delegating drift detection to confirm that golden samples still match the skill's current output and that eval expectations still hold.
tools:
  - Read
  - Bash
chain:
  - askit-evaluator
metadata:
  version: 0.1.0
  tier: convergent
  status: active
  agent-targets:
    - claude
---

# askit-samples-validator

## Role
The delegated drift-detection role behind `askit-build-samples` validate mode. Reads the skill's `examples/` goldens and anti-examples and re-runs the `evals/` triggering set, reporting any case where the current behavior no longer matches the authored evidence. Read-only for all direct checks; delegates conformance assessment to `askit-evaluator` when a finding requires a gate run.

## Tools
`Read` to inspect `examples/` and `evals/` files; `Bash` to run `node scripts/evaluate.mjs <target> --json` for drift that touches a Standard requirement. Chain to `askit-evaluator` when a drift case requires a full conformance pass (Standard sec 7.2, 8.3). No write access: drift detection must not mutate the evidence it is checking.

## Steps
1. Read each file under `skills/<name>/examples/` and compare its stated output against the current skill body and references.
2. For each `evals/<name>.eval.json` case, judge whether the `should_trigger` expectation still holds given the current description and trigger keywords.
3. Report each drifted case as an error (not a warning): stale evidence claims a guarantee the skill no longer honors (Standard sec 7.2).
4. Delegate to `askit-evaluator` for any drift that requires a full gate run; apply its findings.
```

---

### `agents/_chain-permitted.yaml` entries needed

The subagent declares `chain: [askit-evaluator]`, so S4 (`chain-contract`) requires this entry. The parent skill (`askit-build-samples`) must also declare its edge to this subagent, which requires a second entry. **These are shown as a patch to the file, not a full replacement:**

```yaml
# Add to agents/_chain-permitted.yaml:

askit-build-samples:
  - askit-samples-validator

askit-samples-validator:
  - askit-evaluator
```

Note: `agents/_chain-permitted.yaml` is not edited by this golden - the instruction for SP2b authoring prohibits editing it because doing so would affect the plugin's real gate state. A real `askit-build-subagent` create-mode run would edit the file as step 5 of the builder pattern.

---

### `library.json` registration (S3 `components-index`)

Add to `library.json` under `components.subagents`:

```json
{
  "name": "askit-samples-validator",
  "path": "agents/askit-samples-validator.md",
  "version": "0.1.0",
  "tier": "convergent",
  "status": "active"
}
```

S3 requires every subagent file on disk to have a matching entry in `components.subagents`. Without this entry, the gate reports an S3 error.

---

### `evals/samples-validator-to-evaluator.eval.json` (G3 obligation)

A `chain` declaration creates a G3 `library-regression` obligation: there must be an eval file covering the edge. The eval for `askit-samples-validator -> askit-evaluator`:

```json
{
  "covers": { "chain": ["askit-samples-validator", "askit-evaluator"] },
  "description": "askit-samples-validator delegates a conformance gate run to askit-evaluator when drift requires a full evaluation pass.",
  "cases": [
    {
      "given": "a validate-mode run where a golden sample's stated output diverges from the skill's current gate result",
      "expect": "askit-samples-validator delegates to askit-evaluator, which runs node scripts/evaluate.mjs and returns findings; askit-samples-validator reports those findings as drift errors"
    },
    {
      "given": "a validate-mode run where all golden samples and eval expectations still match current behavior",
      "expect": "askit-evaluator is not invoked (no conformance drift requires a gate run), and the validator reports zero drift errors"
    }
  ]
}
```

---

## Why this is golden

- **All required frontmatter fields present (Standard sec 3.8, authoring-subagents.md):** `name` equals the file basename; `description` states what AND when with concrete trigger keywords (U5 score: 1.0); `tools` is the narrowest set (Read + Bash only - no Write because assessment must not mutate what it checks, sec 9); `chain` lists only the one component it actually invokes; `metadata` carries `version`, `tier`, `status`, and `agent-targets: [claude]`.
- **Chain safety demonstrated end-to-end (Standard sec 3.6, authoring-subagents.md):** The `chain` declaration requires two `_chain-permitted.yaml` entries (parent-to-subagent and subagent-to-callee), a `library.json` entry (S3), and a G3 eval file. The golden shows all four. Showing only the subagent definition without its companion artifacts would leave the gate in error.
- **Claude-only scope is explicit (Standard sec 3.3):** `agent-targets: [claude]` is declared; the Codex constraint is stated in the Input table. There is no Codex artifact because Codex v0.135 plugins cannot ship subagents (Standard sec 3.3).
- **Tool scoping reasoning included (sec 9):** The Tools section explains WHY each tool is present and WHY write access is withheld. A reader can verify the grant without reading the full Standard.
- **G3 eval obligation fulfilled (Standard sec 8.3):** The chain edge creates a regression surface. The eval file covers two cases: delegation fires (drift detected), and delegation is skipped (no drift). This is the minimum needed for G3 to find the edge covered.

## Verification

### Frontmatter parse

```
node -e "
import('./scripts/lib/frontmatter.mjs').then(m => {
  const text = require('fs').readFileSync('<path-to-temp-copy>','utf8');
  const result = m.parseFrontmatter(text);
  console.log(JSON.stringify(result.frontmatter, null, 2));
});
"
```

Output (run against `C:/Users/jpris/AppData/Local/Temp/claude/.../scratchpad/askit-samples-validator.md`):

```json
{
  "name": "askit-samples-validator",
  "description": "Validates a skill's evidence set (examples/ and evals/) for drift against current behavior. Use when delegating drift detection to confirm that golden samples still match the skill's current output and that eval expectations still hold.",
  "tools": ["Read", "Bash"],
  "chain": ["askit-evaluator"],
  "metadata": {
    "version": "0.1.0",
    "tier": "convergent",
    "status": "active",
    "agent-targets": ["claude"]
  }
}
```

Real output, not invented.

### U5 description score

```
node -e "
import('./scripts/checks/description-score.mjs').then(m => {
  console.log('score:', m.scoreDescription('Validates a skill\'s evidence set (examples/ and evals/) for drift against current behavior. Use when delegating drift detection to confirm that golden samples still match the skill\'s current output and that eval expectations still hold.'));
});
"
score: 0.9999999999999999
```

Above the 0.7 threshold (Standard sec 8.1, U5).

### Chain eval JSON parse

```
node -e "JSON.parse(require('fs').readFileSync('<chain-eval-path>','utf8')); console.log('OK')"
OK
```

Run against `C:/Users/jpris/AppData/Local/Temp/claude/.../scratchpad/samples-validator-to-evaluator.eval.json`.

### Link verification

No relative markdown links written in this file. All paths are cited as inline code.
