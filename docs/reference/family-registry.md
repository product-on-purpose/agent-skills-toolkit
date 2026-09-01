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

**Measured 2026-09-01**, against the registry fetched fresh at `81dbbde` (catalogue v1.72.0), with every
member checked out at **the sha the catalogue pins**:

```bash
# one checkout per member, each at the sha marketplace.json pins, under <members>/
npx agent-skills-toolkit evaluate ../agent-plugins --members <members> --format md
```

**Collection verdict: RED.** Graded 6 of 6 members. 0 collection errors, 0 collection warnings.
Two members fail their own declared claim.

| Member | Status | Declares | Earns | Errors | Warns | Standard debt | Entry version | Pin | Graded sha | Divergence |
|---|---|---|---|---|---|---|---|---|---|---|
| `pm-skills` | FAILS OWN CLAIM | none declared | none | 234 | 40 | 0 | 2.32.0 | `e8a641c` | `e8a641c` | in sync |
| `thinking-framework-skills` | FAILS OWN CLAIM | Advanced | Convergent | 1 | 137 | 130 | 0.13.0 | `9aab9f3` | `9aab9f3` | in sync |
| `writing-style-catalog` | OK | Universal | Universal | 0 | 3 | 0 | 0.13.0 | `00e4884` | `00e4884` | in sync |
| `agent-skills-toolkit` | OK | Advanced | Advanced | 0 | 0 | 0 | 1.17.0 | `fd5286b` | `fd5286b` | in sync |
| `critique-skills` | OK | Convergent | Convergent | 0 | 7 | 7 | 0.1.6 | `30ec617` | `30ec617` | in sync |
| `product-lifecycle-templates` | OK | Advanced | Advanced | 0 | 1 | 1 | 0.4.0 | `e501e04` | `e501e04` | in sync |

Tier distribution across graded members: Advanced 2, Convergent 2, Universal 1, none 1.

> **Every row reads `in sync`, and that is new.** Earlier snapshots of this page graded whatever local
> checkout happened to be on the machine, so three of six rows read `diverged` and the numbers described
> trees the catalogue does not pin. This run checks each member out AT its pinned sha first, so `Pin` and
> `Graded sha` agree by construction and the verdicts are reproducible by anyone from the two commands
> above.

### What was wrong with the previous snapshot, and for how long

This page carried a **2026-08-12** measurement until 2026-09-01 - twenty days. Two things in it were
wrong, and they are different kinds of wrong:

- **It described a toolkit six releases old.** It listed `agent-skills-toolkit` at v1.11.1 / `f57aa3f`.
  The catalogue now pins v1.17.0 / `fd5286b`.
- **It graded drifted checkouts rather than the pins.** Three rows showed `diverged`, meaning the numbers
  beside them came from trees the catalogue does not pin. A reader had no way to reproduce them.

**A correction to the record, since a repaired page should say what was actually true.** The 2026-08-28
internal audit recorded this page as carrying "a false FAILS OWN CLAIM for a member fixed on 2026-08-15".
Checked at regeneration time, that is not right, and the difference matters. `thinking-framework-skills`
did fix its workflow declarations in `fd343dd` on 2026-08-15 - but the catalogue still pins `9aab9f3`,
which is v0.13.0 from **2026-06-25** and is not a descendant of that fix. Graded at the sha the catalogue
pins, the member genuinely fails its own claim. **What is stale is the registry PIN, not this page's
verdict.** The remedy is a re-pin in the catalogue, which is that repository's call, not a correction here.

## Why the collection is red, said plainly

**It is red on purpose, and the two reasons are different.**

`thinking-framework-skills` declares Advanced (Gold) and earns Convergent (Silver) at its pinned sha. Its
single error is `G4` (index drift), and the cause is **this toolkit's own change**: v1.10.0 fixed the index
generator, which puts any consuming plugin whose committed `INDEX.md` predates that fix into drift until it
regenerates. Its 130 findings of Standard debt come from pinning Standard 0.8: the components mirror and
its workflow half are held at `warn` for it and become errors when it adopts a current pin. Both are
migration consequences of shipped fixes, surfaced in one place instead of six separate runs. The findings
report for that member is filed separately; this page does not edit anyone else's repository.

`pm-skills` declares no tier at all and carries 234 errors. An undeclared plugin is graded by the same
default the gate applies to any undeclared plugin, with no tier ceiling, so every error counts. It is
not being held to a bar it never claimed; it is being shown what it currently is.

**The remaining four members satisfy their own claims outright**, including two carrying Standard debt
(`critique-skills` 7, `product-lifecycle-templates` 1) - findings held below their severity by an older
pin, which is exactly what makes green-by-an-old-pin visible rather than flattering.

## What would turn it green

Nothing in this toolkit. The collection turns green when each member satisfies its own declared claim -
either by clearing its findings, or by declaring the tier it actually earns. Both are that repository's
maintainer's call. For `thinking-framework-skills` there is a third path that belongs to neither: the
catalogue re-pinning it to a commit at or after its 2026-08-15 fix. Tuning the aggregation rule until the
number looks better is the one repair the design explicitly forbids: a threshold a maintainer can move is
not a gate.

## Related

- [Marketplace scope](marketplace-scope.md) - the rules this report follows and how to run it yourself.
- [Conformance and tiers](../explanation/conformance-and-tiers.md) - what Bronze, Silver and Gold require.
