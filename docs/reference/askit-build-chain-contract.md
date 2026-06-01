# askit-build-chain-contract (reference)

Authors a plugin's chain contract (`agents/_chain-permitted.yaml`, Standard sec 3.6, Convergent tier): the explicit declaration of which components may invoke which others.

## Modes
- `create`: scan `chain:` declarations, author `agents/_chain-permitted.yaml` (one entry per caller), optionally `agents/_pairing.yaml`, evaluate to a clean S4.
- `improve`: resolve S4 orphans (add the permission) and phantoms (fix/remove the entry, or create the missing component).

## Rules (sec 3.6)
- Conditional MUST: required if and only if a component invokes another; no empty contract for a plugin that does not chain.
- Every `chain:` invocation MUST be permitted (no orphan); every entry MUST name an on-disk component (no phantom).
- The contract is agent-agnostic (one file, no per-target form).

## Validation
S4 (`chain-contract` check) flags orphans and phantoms. See the [build-a-chain-contract how-to](../how-to/build-a-chain-contract.md) and [authoring-chain-contracts](../../skills/askit-build-chain-contract/references/authoring-chain-contracts.md).
