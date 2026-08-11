---
title: "askit-build-chain-contract"
description: "Authors a plugin's chain contract (`agents/_chain-permitted.yaml`, Standard sec 3.6, Convergent tier) - the explicit declaration of which components may invoke which others."
audience: engineer
level: intermediate
---

# askit-build-chain-contract (reference)

Authors a plugin's chain contract (`agents/_chain-permitted.yaml`, Standard sec 3.6, Convergent tier): the explicit declaration of which components may invoke which others.

## Modes
- `create`: scan `metadata.chain` declarations, author `agents/_chain-permitted.yaml` (one entry per caller), optionally `agents/_pairing.yaml`, evaluate to a clean S4.
- `improve`: resolve S4 orphans (add the permission) and phantoms (fix/remove the entry, or create the missing component).

## Rules (sec 3.6)
- Conditional MUST: required if and only if a component invokes another; no empty contract for a plugin that does not chain.
- Every `metadata.chain` invocation MUST be permitted (no orphan); every entry MUST name an on-disk component (no phantom). A legacy top-level `chain:` location predates Standard vocabulary alignment and is still read for compatibility.
- `metadata.chain` SHOULD be written as a comma-separated string (`chain: askit-skill-author, askit-reviewer`), the recommended shape: the agentskills.io spec defines `metadata` as a map of string keys to string values, and the reference implementation `skills-ref` coerces every metadata value through Python's `str()` - a YAML list under `metadata.chain` is silently rewritten to a string containing a Python list repr (e.g. `"['a', 'b']"`), which no consumer can use. S4 also still reads `metadata.chain` written as a YAML list, and the legacy top-level `chain:` key in either shape, so existing plugins on those shapes do not regress.
- **Scheduled tightening (ADR 0041, "warn-first for the string shape").** A STRING-shaped declaration is newly parsed by this reader (v1.10.1); a finding reachable ONLY through that shape (an orphan, or "chaining used but no contract") is `warn` at Standard 0.12, not `error`, so upgrading the toolkit alone cannot newly gate-fail a plugin. The identical finding from an ARRAY-shaped declaration, or from an existing contract file or `_workflows/`, stays `error`, unchanged. The `warn` graduates to `error` at Standard 0.13.
- The contract is agent-agnostic (one file, no per-target form).

## Validation
S4 (`chain-contract` check) flags orphans and phantoms. See the [build-a-chain-contract how-to](../how-to/build-a-chain-contract.md) and [authoring-chain-contracts](../../skills/askit-build-chain-contract/references/authoring-chain-contracts.md).
