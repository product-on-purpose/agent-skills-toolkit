---
name: askit-build-chain-contract
description: Creates and improves a plugin's chain contract (agents/_chain-permitted.yaml) to the Advanced Skill Library Standard. Use when a skill or subagent invokes another component and you need to declare the permitted inter-component invocations, or to resolve S4 orphan or phantom findings.
metadata:
  version: 0.1.0
  tier: universal
  audience: advanced
---

# askit-build-chain-contract

## Purpose
Author a plugin's chain contract: the explicit declaration of which components may invoke which others (Standard sec 3.6). A chain contract is a CONDITIONAL MUST - required if and only if a component invokes another, so a plugin with no inter-component invocation ships no contract (no empty governance files). Two modes: `create` authors `agents/_chain-permitted.yaml` (and the optional `agents/_pairing.yaml`); `improve` resolves S4 findings. Authoring depth is in [references/authoring-chain-contracts.md](references/authoring-chain-contracts.md). Follows the shared builder contract ([../../docs/reference/builder-pattern.md](../../docs/reference/builder-pattern.md)).

## When to use
When a skill or subagent declares a `chain:` to another component and you need to permit it, or when `evaluate` reports an S4 orphan (an invocation not permitted) or phantom (a contract entry naming a missing component).

## create mode
1. Scan components for `chain:` declarations (which caller invokes which callees). Skip the contract entirely if nothing chains (the conditional MUST).
2. Author `agents/_chain-permitted.yaml`: one entry per caller, listing the components it may invoke. Copy `templates/chain-permitted.yaml` if none exists.
3. Optionally author `agents/_pairing.yaml` for recommended (not required) skill plus subagent pairings.
4. Evaluate (`node scripts/evaluate.mjs . --json`) until S4 is clean: every `chain:` invocation is permitted (no orphan) and every contract entry names an on-disk component (no phantom).

## improve mode
1. Run `node scripts/evaluate.mjs . --json` and read the S4 findings.
2. For an orphan, add the missing `caller: [callee]` permission. For a phantom, fix the misspelled name, remove the stale entry, or create the missing component.
3. Re-run to confirm S4 is clean.

## Scope
The contract is agent-agnostic: one `agents/_chain-permitted.yaml` (no per-target form). It binds exactly when there is an invocation to make safe (sec 3.6), so it is a safety mechanism, not ceremony. S4 (chain-contract integrity) flags orphans and phantoms; do not ship an empty contract for a plugin that does not chain.
