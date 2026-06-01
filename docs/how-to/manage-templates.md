# How to manage templates

Curate the global `templates/` directory with `askit-template-manager`.

## Add a template (create)

Invoke `askit-template-manager` (create mode). Identify the component type or artifact that lacks a template and the skill that will consume it, then author a minimal, conformant skeleton with `REPLACE-` placeholders. Verify a scaffold built from it passes the relevant checks - a template must produce a conformant component.

## Keep them in sync (maintain)

Invoke `askit-template-manager` (maintain mode) when a component contract changes (a new required frontmatter key, a renamed field, a new check). Update every template that scaffolds that type in lockstep so the next scaffold is born conformant. Templates are the single place to fix scaffold shape.

## See also

- [`askit-template-manager` reference](../reference/askit-template-manager.md)
- [templates-inventory](../../skills/askit-template-manager/references/templates-inventory.md)
