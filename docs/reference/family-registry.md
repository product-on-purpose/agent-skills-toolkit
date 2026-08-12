---
title: "The family registry (a dated collection report)"
description: "A dated, reproducible collection report over the product-on-purpose marketplace - what each member declares, what it earns, and where its pin sits."
audience: both
level: beginner
tags: [marketplace, registry, collection, evidence]
---

# Reference: the family registry

This is the first artifact this project has published that grades a **whole portfolio at once** rather
than one plugin at a time. It is produced by [marketplace scope](marketplace-scope.md), which is
deterministic: every number below comes from running one command, and running it again on the same
commits produces the same numbers.

> **Read this as a dated snapshot, not a live registry.** It records what the graded shas below
> contained on the date stamped in the table. It is not refreshed automatically, it does not report what
> installers receive, and it does not certify anything. The reproduction command is given so you never
> have to take this page's word for any of it.

## What the columns mean, for a non-engineer

- **Declares** is the quality tier the plugin's own manifest claims: Bronze (Universal), Silver
  (Convergent), or Gold (Advanced).
- **Earns** is the tier the deterministic checks actually award it.
- A member is judged **against its own claim**, never against its siblings'. Declaring Bronze and
  earning Bronze is a pass. Declaring Gold and earning Silver is a failure, for that member, of the
  promise it made.
- **Pin** is the commit the catalogue advertises. **Graded** is the commit on this machine that was
  actually read. When they differ, the catalogue is simply between releases, which is normal; the
  columns are shown either way so agreement is never assumed from silence.
- **Standard debt** counts the checks that are only warnings because the member pins an older version of
  the Standard. They become failures the moment it adopts the current one.

## The snapshot

**Measured 2026-08-12** by running, from the toolkit checkout:

```bash
node scripts/evaluate.mjs ../agent-plugins --format md
```

**Collection verdict: RED.** Graded 6 of 6 members. 0 collection errors, 0 collection warnings.
Two members fail their own declared claim.

| Member | Status | Declares | Earns | Errors | Warns | Standard pin | Standard debt | Entry version | Pin | Graded | Divergence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `pm-skills` | FAILS OWN CLAIM | none declared | none | 235 | 40 | (none) | 0 | 2.31.1 | `32e2837` | `2614b40` | diverged |
| `thinking-framework-skills` | FAILS OWN CLAIM | Advanced | Convergent | 1 | 128 | 0.8 | 121 | 0.13.0 | `9aab9f3` | `dbe71d8` | diverged |
| `writing-style-catalog` | OK | Universal | Universal | 0 | 3 | 0.11 | 0 | 0.13.0 | `00e4884` | `00e4884` | in sync |
| `agent-skills-toolkit` | OK | Advanced | Advanced | 0 | 0 | 0.12 | 0 | 1.11.1 | `f57aa3f` | `f57aa3f` | in sync |
| `critique-skills` | OK | Convergent | Convergent | 0 | 0 | 0.12 | 0 | 0.1.5 | `272496a` | `272496a` | in sync |
| `product-lifecycle-templates` | OK | Advanced | Advanced | 0 | 0 | 0.12 | 0 | 0.3.1 | `ad42e75` | `0a96505` | diverged |

Tier distribution across graded members: Advanced 2, Convergent 2, Universal 1, none 1.

## Why the collection is red, said plainly

**It is red on purpose, and the two reasons are different.**

`thinking-framework-skills` declares Advanced (Gold) and earns Convergent (Silver). Its single error is
`G4` (index drift), and the cause is **this toolkit's own change**: v1.10.0 fixed the index generator,
which puts any consuming plugin whose committed `INDEX.md` predates that fix into drift until it
regenerates. That is a migration consequence of a shipped fix, and it is exactly the kind of fact a
collection run surfaces in one place instead of leaving to six separate runs. The findings report for
that member is filed separately; this page does not edit anyone else's repository.

`pm-skills` declares no tier at all and carries 235 errors. An undeclared plugin is graded by the same
default the gate applies to any undeclared plugin, with no tier ceiling, so every error counts. It is
not being held to a bar it never claimed; it is being shown what it currently is.

**The remaining four members satisfy their own claims outright.**

## What would turn it green

Nothing in this toolkit. The collection turns green when each member satisfies its own declared claim -
either by clearing its findings, or by declaring the tier it actually earns. Both are that repository's
maintainer's call. Tuning the aggregation rule until the number looks better is the one repair the
design explicitly forbids: a threshold a maintainer can move is not a gate.

## Related

- [Marketplace scope](marketplace-scope.md) - the rules this report follows and how to run it yourself.
- [Conformance and tiers](../explanation/conformance-and-tiers.md) - what Bronze, Silver and Gold require.
