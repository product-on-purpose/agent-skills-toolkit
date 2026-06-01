---
name: askit-template-manager
description: Creates and maintains a plugin's global templates directory so the scaffolders produce consistent components. Use when adding a template, updating an existing one, or keeping templates in sync with the component shapes they scaffold.
metadata:
  version: 0.1.0
  tier: universal
  audience: advanced
---

# askit-template-manager

## Purpose
Curate the global `templates/` directory the `askit-build-*` and `askit-init-*` skills consume, so generated components are consistent by construction (Standard sec 11 / 7.3). `create` adds a new template for a component type or artifact; `maintain` keeps an existing template in sync with the shape it scaffolds (a template that drifts from the current component contract produces non-conformant scaffolds). The inventory and the sync rule are in [references/templates-inventory.md](references/templates-inventory.md).

## When to use
When adding a template, updating an existing one, or keeping the templates in sync with the component shapes they scaffold.

## create mode
1. Identify the component type or artifact lacking a template and the skill that will consume it.
2. Author the template as a minimal, conformant skeleton with `REPLACE-` placeholders for the parts the scaffolder fills.
3. Verify a scaffold built from it passes the relevant checks (a template MUST produce a conformant component).

## maintain mode
1. When a component contract changes (a new required frontmatter key, a renamed field), update every template that scaffolds that type so the next scaffold is conformant.
2. Keep templates minimal: a skeleton, not a full example (samples live with their skill via `askit-build-samples`).

## Scope
Templates are the single source of scaffold shape: one place to fix, so a contract change does not have to be chased across every builder. The discipline is that a template stays conformant - the `seed-plugin/` template, for instance, is asserted to pass the Bronze anatomy (`tests/unit/init-anatomy.test.mjs`). Templates hold skeletons; the eval-set and sample CONTENT a skill ships is authored by `askit-build-samples`.
