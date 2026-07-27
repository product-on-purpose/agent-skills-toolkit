---
name: askit-standards-watch
description: Checks whether the pinned agentskills.io upstream specification has changed, reports which Universal conformance checks each delta lands on, and drafts a proposal ADR without editing a check or the Standard. Use when asking if the upstream spec has moved, before cutting a Standard minor version, or when re-pinning the agentskills.io revision the Universal tier tracks.
metadata:
  version: 0.1.0
  tier: universal
  audience: advanced
---

# askit-standards-watch

## Purpose
[STANDARD.md](../../STANDARD.md) sec 6 states, as normative text, that **where agentskills.io evolves the Universal tier MUST track it; higher tiers remain this Standard's domain.** Tracking is only auditable against a recorded starting point. This skill owns that starting point (`docs/internal/standards-watch/upstream-pin.json`), detects when the upstream has moved away from it, maps each delta to the checks it lands on, and produces a **proposal**. It never applies one.

## When to use
When someone asks whether the upstream spec has changed, before cutting a Standard MINOR, on a periodic governance sweep, or when re-pinning the upstream revision after an ADR is accepted.

## The one hard rule

**This skill proposes. A human decides. Nothing here edits a check module, `STANDARD.md`, an existing ADR, or the pin.**

The Standard grows only by ADR with the warn-first burndown of sec 7.7 (a new or tightened requirement ships as a `warn` for one MINOR, then becomes an `error`). A watcher that edited a check would convert a governed decision into a silent one, which is the single thing that would make the gate untrustworthy. The deterministic half is write-incapable by construction: `scripts/lib/standards-watch.mjs` and `scripts/standards-watch.mjs` import only `readFileSync` from `node:fs` and emit everything to stdout, and [a test](../../tests/unit/standards-watch.test.mjs) fails the build if any write API appears in either file. Your obligation is to keep the same discipline in the steps below.

## Procedure

### 1. Run the watch

    npm run standards-watch

Exit `0` means unchanged or cosmetic-only; `1` means a human must look; `2` is a refusal (fetch failed, extraction failed, no pin). **A refusal is never a pass.** Add `--json` for the machine report, `--snapshot-dir <dir>` to run offline against a local mirror.

If it exits `0`, stop. Report "unchanged since `<verified date>`" and offer to refresh the verification date (step 5). Do not invent work.

### 2. Read the three delta classes, and respect the boundary between them

| Class | Who decides | What to do |
|---|---|---|
| **material** | the tool, structurally | A field, directory, or section was added, removed, or had its required flag or constraint text changed. Carry it to the ADR as a fact. |
| **needs a human read** | you, by reading | A section body moved with no structural delta, or a `reference-implementation` artifact changed. Fetch the upstream diff and decide. |
| **cosmetic** | the tool | Bytes moved, the extracted surface did not. Note it; do not act on it. |

Do not upgrade a review-class delta to material because it looks important, and do not dismiss one because it looks small. Read the actual upstream diff before writing a word about it:

    gh api "repos/agentskills/agentskills/commits?path=docs/specification.mdx&per_page=5"

The materiality bar, and the false-confidence trap it exists to prevent, are in [references/materiality-rubric.md](references/materiality-rubric.md). Read it before classifying anything.

### 3. Confirm what each delta touches

The report resolves every `reqId` to its check module, Standard section, tier, `since`, and provenance by parsing [`docs/reference/universal-checks.md`](../../docs/reference/universal-checks.md) and joining `scripts/lib/registry.mjs` at run time. It is not a second copy of that mapping, so it cannot drift from the checks.

Two outputs deserve attention:

- **`touches: no check encodes this today`** is the most interesting line the tool prints. The upstream names something the gate is blind to. That is a candidate new check, not a bug.
- A delta on a `house`-provenance check (`U2`, `U5`) is weaker evidence than one on `vendor-cited` or `objective`, because a house rule was never claimed to mirror upstream.

### 4. Draft the ADR, and stop

    npm run standards-watch -- --adr-draft --adr-number NNNN > docs/internal/decisions/NNNN-<slug>.md

Pick `NNNN` as the next free number in `docs/internal/decisions/`. The skeleton fills the evidence (artifacts, blob SHAs, the delta table, the burndown policy) and leaves every judgment section marked `TO BE COMPLETED`. Complete those, following [askit-decision](../askit-decision/SKILL.md) conventions: MADR structure, a `## TL;DR` immediately under the title (`G10` requires it), `Status: Proposed`.

Per delta, the ADR must say which of three outcomes applies:

1. **Track it** - amend or add a check, bump the Standard MINOR, ship the tightening as a `warn` per sec 7.7.
2. **Re-pin only** - the delta is real but changes no requirement of ours.
3. **Defer** - with a reason and a revisit date.

Then **stop**. Open the ADR for review. Do not touch a check module, `STANDARD.md`, `library.json` `standard`, or the pin in the same breath. If the requester asks you to apply the change now, decline and say why: an unratified amendment to the Standard is exactly the failure this skill is built to prevent.

### 5. Re-pin, only after the ADR is accepted

    npm run standards-watch -- --emit-pin --by "<name>"

This prints the proposed pin to stdout and writes nothing. Redirect it yourself, review the diff, and land it in the same pull request as the accepted ADR so the pin and the decision move together. Preserve the human-authored fields: `about`, `conventions`, `touches`, and per-artifact `notes` and `role` survive a re-pin untouched, and the `touches` map is the one place a new upstream field earns its mapping to a `reqId`.

The pin format, and how to add or remove a watched artifact, are in [references/pin-format.md](references/pin-format.md).

## What this can and cannot do

It reliably detects **that** a watched artifact changed (a git blob SHA-1 anyone can re-derive with `git hash-object`), and **where** (the field, the directory entry, or the named section). For the frontmatter contract table and the component inventory it also decides the delta's shape without judgment: added, removed, required-flag flipped, constraint text changed.

It does **not** classify whether a prose change is normative, and it does not parse the upstream Python validator. A spec is prose; materiality is a reading. When the extractor cannot find its anchors it refuses with exit `2` rather than reporting a clean run, because a watcher that quietly stops working is worse than no watcher at all.

## Scope
One skill, one obligation: keep the sec 6 tracking claim auditable. It does not grade a plugin (`askit-evaluate`), author the ADR's argument (`askit-decision` owns decision craft), or cut a release (`askit-release`). The public reference page is [`docs/reference/askit-standards-watch.md`](../../docs/reference/askit-standards-watch.md).
