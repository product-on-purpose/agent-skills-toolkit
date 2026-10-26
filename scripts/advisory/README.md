---
title: "scripts/advisory - folder guide"
---

# scripts/advisory

The advisory screen modules (ADR 0063): deterministic, model-free signals that report beside the tier
and never gate it. `scripts/lib/advisory-registry.mjs` declares ADV1-ADV4's metadata (advisoryId, title,
category, provenance) and runs whichever modules are registered here over a check context.

Two screens ship today, ADV1 and ADV2, both vendor-cited. ADV3 and ADV4 exist only as metadata in
`scripts/lib/advisory-registry.mjs`; their screens arrive in later changes, following the same
`{ meta, check(ctx) }` shape every `scripts/checks/*.mjs` module already uses.

**ADV1's reserved-words half is deliberately NOT shipped.** `adv1-portability.mjs` screens only the
Skills API's six-field frontmatter whitelist (E86). The platform.claude.com Agent Skills page also
states that a Skills API `name` cannot contain the reserved words "anthropic" or "claude", but that
text is a bullet fragment, not a quotable sentence, so pinning it needs a `probe` claim and a third
vendor-watch freshness clock. The maintainer has not ruled on minting that probe - see
`docs/internal/roadmap.md` section 7 ("Blocked and awaiting a ruling"), "One item awaits a maintainer
ruling as of 2026-10-25: whether ADV1 (portability) mints a third vendor probe." No reserved-word
matcher, no platform.claude.com source, and no probe claim exist in this repository until that ruling.

## Inventory

- `adv1-portability.mjs` - ADV1: a top-level SKILL.md frontmatter key outside the Skills API's six-field
  whitelist (`allowed-tools`, `compatibility`, `description`, `license`, `metadata`, `name`). Whitelist
  half only; see the reserved-words note above.
- `adv2-preload-cap.mjs` - ADV2: a subagent `skills:` frontmatter list naming more than 32 distinct
  skills, the count Claude Code preloads into the subagent's startup context.
