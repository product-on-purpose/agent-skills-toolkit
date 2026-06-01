# askit-init-marketplace (reference)

Creates and validates a marketplace index that catalogs plugins for distribution.

## Modes
- `create`: scaffold the index per target (Claude Code `.claude-plugin/marketplace.json`; Codex `.agents/plugins/marketplace.json`, sec 12).
- `validate`: every entry resolves to a real plugin; versions are consistent; no orphans or duplicates.

## Separation rule
A marketplace catalogs plugins; it is not itself a plugin. Keep it separate from any plugin's manifest. Per D8, a plugin is registered only at its first Gold tag. Format detail: [marketplace-format](../../skills/askit-init-marketplace/references/marketplace-format.md).

## Boundary
`askit-init-plugin` scaffolds a plugin; this scaffolds the marketplace that lists plugins. See the [stand-up-a-marketplace how-to](../how-to/stand-up-a-marketplace.md).
