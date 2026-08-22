# The upstream pin format (reference)

The pin is the artifact that makes [STANDARD.md](../../../STANDARD.md) sec 6 auditable. It lives at
`foundation/claims/upstream-pin.json`, schema `askit-upstream-pin/1`, and it answers one
question: **which revision of agentskills.io is this Standard's Universal tier written against?**

## What it is not

It is not `library.json` `standard` (currently `"0.12"`). That versions OUR ruleset and is read by the
sec 7.7 pinned-version gate. The two numbers move independently: the Standard can go 0.12 to 0.13 with
the upstream untouched, and the upstream can move without our version changing at all. Conflating them
would make both meaningless.

## Why content hashes and not a version

The upstream publishes **no version number**, cuts **no git tags**, and has **no GitHub releases**
(verified 2026-07-27 against the repository API; the `versioningNote` in the pin records the check).
There is no upstream version string to pin, so the pin is content-addressed instead.

The unit is the **git blob SHA-1 of a single normative file**, not the repository HEAD. That choice is
load-bearing. The upstream repository takes frequent commits that touch only its client showcase and
its logo assets: at the time of pinning, HEAD had moved on 2026-07-10 while `docs/specification.mdx`
had not moved since 2026-05-16 and the reference validator had not moved since 2025-12-18. A HEAD pin
would raise an alarm every few days and be muted within a month. Per-artifact blob pins move only when
a watched artifact moves.

A blob SHA-1 is `sha1("blob " + byteLength + NUL + bytes)`. Any reviewer can confirm a pinned value
with `git hash-object <file>` on the downloaded artifact, offline, without this toolkit. That is the
point: the pin has to be checkable by someone who does not trust the tool that wrote it.

## Fields

| Key | What it records |
|---|---|
| `upstream` | The source of truth: repo, default branch, the published page, and whether it declares a version of its own. |
| `verified` | When the pin was last confirmed, by whom, the repository HEAD at that moment, and the method used. The date is what the report prints as "unchanged since". |
| `artifacts[]` | One entry per watched file: `path`, `role`, `rawUrl` (fetched live), `blobSha` (the pin), `structural`, `touches`, and free-text `notes`. |
| `touches` | The reqIds a delta in a named field, directory, or section lands on. |
| `surface` | The extracted structural surface at verification time: the frontmatter field table, the component inventory, and a body hash per section. |

### `role` and `structural`

`role: normative-prose` is the specification a human reads and this Standard restates.
`role: reference-implementation` is the `skills-ref` validator that sec 6 names when it says a
Universal skill "MUST pass `skills-ref`-equivalent validation". Its behavior defines conformance even
in a period when the prose does not move, which is why it is watched at all.

`structural: true` means the watcher extracts a machine-comparable surface and can decide some deltas
without judgment. It is true for the specification and **false for every Python file**, deliberately:
parsing someone else's validator well enough to classify a change to it is not something this tool can
honestly claim, so a change there is escalated whole. A watcher that pretends to understand code it
does not parse is the exact overclaim this design refuses.

### `touches`

This is the one mapping that did not already exist in the repository, so it lives here, small and
reviewed with the pin. The other half (reqId to check module, Standard section, tier, `since`,
provenance) is **not** restated: the watcher parses
[`docs/reference/universal-checks.md`](../../../docs/reference/universal-checks.md) and joins
`scripts/lib/registry.mjs` at run time, so it cannot drift from the checks it describes.

An empty list is meaningful and reported specially. `"scripts/": []` says the upstream names a
directory no check of ours encodes. When a new field or directory appears with no mapping, the report
prints `no check encodes this today` rather than inheriting the artifact's reqIds, because a brand new
upstream concept genuinely lands on nothing yet. That line is the gap list.

## Adding a watched artifact

1. Add an `artifacts[]` entry with `path`, `role`, `rawUrl` (the raw URL on the default branch),
   `structural` (almost always `false` for anything that is not the specification), `touches`, and a
   `notes` sentence saying why it is normative.
2. Set `blobSha` to any 40 hex characters as a placeholder; the next step overwrites it.
3. Run `npm run standards-watch -- --emit-pin --by "<name>"`, review the printed document, and save it.
4. Commit the pin change on its own or with the ADR that motivated it.

Removing an artifact is the same in reverse, and deserves a sentence in the commit message: a watched
artifact that stops being watched is a narrowing of the sec 6 claim.

## Bootstrapping a pin from nothing

A pin with no `surface` is legal to read and illegal to diff: `--emit-pin` is how it acquires one, and
any other command refuses with `bad-pin` rather than comparing against nothing. That asymmetry is
intentional, so a half-built pin can never produce a reassuring "unchanged".
