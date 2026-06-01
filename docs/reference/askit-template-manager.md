# askit-template-manager (reference)

Creates and maintains the global `templates/` directory the scaffolders consume.

## Modes
- `create`: add a minimal, conformant template (with `REPLACE-` placeholders) for a component type or artifact.
- `maintain`: keep templates in sync when a component contract changes, so the next scaffold stays conformant.

## The sync rule
A template MUST produce a conformant component; templates are the single place to fix scaffold shape. Inventory + the rule: [templates-inventory](../../skills/askit-template-manager/references/templates-inventory.md).

## Boundary
Templates hold skeletons; the realistic samples and eval cases a skill ships are authored by `askit-build-samples`. See the [manage-templates how-to](../how-to/manage-templates.md).
