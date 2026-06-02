---
name: td-skill
description: Creates a thing and validates it. Use when the frontmatter tier must be mirrored by the library.json entry for the mirroring test.
metadata:
  version: 0.1.0
  tier: universal
---

# td-skill

## Purpose
A fixture skill whose frontmatter declares `metadata.tier: universal` while its library.json entry says `convergent`, to exercise the S8 tier-mirroring check.

## When to use
Only in the components-mirror unit test.
