---
name: sd-skill
description: Creates a thing and validates it. Use when the frontmatter status must be mirrored by the library.json entry for the mirroring test.
metadata:
  version: 0.1.0
  status: deprecated
---

# sd-skill

## Purpose
A fixture skill whose frontmatter declares `metadata.status: deprecated` while its library.json entry says `active`, to exercise the S8 status-mirroring check.

## When to use
Only in the components-mirror unit test.
