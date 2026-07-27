---
title: "askit-standards-watch"
description: "Watches the pinned agentskills.io upstream specification, maps each change to the Universal checks it touches, and proposes an ADR rather than applying one."
audience: engineer
level: advanced
tags: [governance, standard, upstream, agentskills, adr]
---

# askit-standards-watch (reference)

Watches the pinned agentskills.io upstream specification, maps each change to the Universal checks it touches, and proposes an ADR rather than applying one.

## The obligation it discharges

[`STANDARD.md`](../../STANDARD.md) sec 6 says, normatively: **where agentskills.io evolves, the Universal tier MUST track it; higher tiers remain this Standard's domain.** Tracking is only auditable against a recorded starting point, and until this skill shipped there was none. "Has the upstream spec changed since we wrote the Universal tier?" was not an answerable question.

## The pin

`docs/internal/standards-watch/upstream-pin.json` records which upstream revision the Universal tier is written against.

It is **not** `library.json` `standard` (`"0.12"`), which versions this Standard's own ruleset and drives the sec 7.7 pinned-version gate. The two move independently.

The upstream publishes no version number and cuts no tags or releases, so the pin is content-addressed: the **git blob SHA-1 of each watched file**, verifiable by anyone with `git hash-object` and no need to trust this toolkit. It pins per artifact rather than at repository HEAD on purpose. At the time of pinning, upstream HEAD had moved within the fortnight while the specification prose had not moved for two months and the reference validator had not moved for seven; a HEAD pin would have alarmed constantly and been muted.

Four artifacts are watched: the specification (`docs/specification.mdx`) and the three `skills-ref` sources that sec 6 points at when it requires "`skills-ref`-equivalent validation".

## Running it

    npm run standards-watch

| Flag | Effect |
|---|---|
| `--json` | the machine report instead of the human one |
| `--snapshot-dir <dir>` | read artifacts from a local mirror instead of the network |
| `--pin <path>` | use a different pin document |
| `--adr-draft [--adr-number NNNN]` | emit the MADR skeleton for the detected deltas |
| `--emit-pin [--by <name>]` | emit the proposed re-pinned document |

Exit `0` unchanged or cosmetic-only, `1` a human must look, `2` refused. A refusal is never a pass.

## What it decides, and what it hands over

| Class | Decided by | Examples |
|---|---|---|
| material | the tool, structurally | a frontmatter field added or removed, a required flag flipped, a constraint reworded, a component directory added or removed, a section added or removed |
| needs a human read | you | a section body changed with no structural delta; any change to the reference implementation |
| cosmetic | the tool | bytes moved, extracted surface identical (page metadata, line endings, trailing whitespace) |

The honest ceiling is worth stating plainly: **it reliably detects that something changed and where; classifying whether a prose change is normative needs a person.** The shipped worked example is a real case that proves the split matters. Upstream commit `6868401` changed one line of prose about the `name` charset while leaving the frontmatter table identical, so a table-only differ would have seen nothing; the per-section body hash caught it and declined to classify it. Reading `frontmatter-valid.mjs` then showed `U3` already permitted digits, so the correct outcome was re-pin only. That conclusion is a human's.

When the extractor cannot find its anchors (the field table renamed, the directory block gone) it refuses with exit `2` rather than reporting a clean run. A watcher that quietly stops working is worse than none.

## Mapping a delta to a check

The report resolves each `reqId` to its module, Standard section, tier, `since`, and provenance by parsing [`universal-checks.md`](universal-checks.md) and joining the check registry at run time. That mapping is read, never restated, so it cannot drift from the checks.

One line is worth watching for: `touches: no check encodes this today`. It means the upstream now names something the gate is blind to. That is the gap list, and it is the most valuable output here.

## Why it cannot apply its own findings

The Standard grows only by ADR, with the warn-first burndown of [sec 7.7](../../STANDARD.md): a new or tightened requirement ships as a `warn` for one MINOR before it becomes a gate-failing `error`, so a library pinned to an older `standard` gets a migration window instead of a broken build. A watcher that edited a check would turn a governed decision into a silent one.

That is enforced, not merely intended, on the deterministic half: `scripts/lib/standards-watch.mjs` and `scripts/standards-watch.mjs` import only `readFileSync` from `node:fs`, emit every artifact to stdout, and a unit test fails the build if any filesystem write API or `child_process` import appears in either file. Re-pinning therefore lands as a reviewed file change in a pull request, never as a side effect of a run.

The procedural half is a person holding the same line. A skill cannot bind a model the way a test binds a module, and the skill says so rather than implying otherwise.

## Related

- [`universal-checks.md`](universal-checks.md) - what each `U#` finding means.
- [`askit-decision.md`](askit-decision.md) - the ADR and RFC path a proposal graduates through.
- [conformance and tiers](../explanation/conformance-and-tiers.md) - how the tiers compose and how the burndown reads.
