---
title: "Marketplace scope (grading a catalogue)"
description: "The third evaluation scope - grade a whole marketplace catalogue at once, including the defects that exist only between its members."
audience: both
level: intermediate
tags: [marketplace, scope, collection, conformance, adr-0039]
---

# Reference: marketplace scope

The gate has always graded **one plugin** (plugin scope) or **one skill** (component scope). Marketplace
scope grades a **catalogue**: a directory whose `.claude-plugin/marketplace.json` lists member plugins.

**Why it exists, in one sentence for each audience.** For an engineer: three classes of defect are
structurally invisible to a loop over members, because they exist only in the union - two members
shipping the same skill name, a catalogue entry that resolves to nothing, and a registry version that
disagrees with the member's own manifest. For everyone else: a catalogue of six plugins can report six
green grades while being broken as a catalogue, and until now nothing looked at the catalogue itself.

Introduced in v1.12.0 under [ADR 0039 (marketplace-scope evaluation)](https://github.com/product-on-purpose/agent-skills-toolkit/blob/main/docs/internal/decisions/0039-marketplace-scope-evaluation.md).

## Running it

```bash
node scripts/evaluate.mjs <catalogue-root>                    # terminal
node scripts/evaluate.mjs <catalogue-root> --format md        # the collection report, Markdown
node scripts/evaluate.mjs <catalogue-root> --format html      # the collection report, one self-contained page
node scripts/evaluate.mjs <catalogue-root> --format json      # the collection report object
```

The scope is detected, not selected: a directory carrying a `marketplace.json` whose entries catalogue
member **plugins** is graded as a collection. A `marketplace.json` whose entries point under `skills/`
is the *marketplace-of-skills* shape, which `U13` (skill-registration) already owns, and marketplace
scope declines it. The two are disjoint by construction, not by convention.

### Finding the members

A run grades the **local checkout** of every member it can resolve. Members are found in this order:

1. An explicit mapping in an `askit.marketplace.json` sidecar at the catalogue root:
   `{ "members": { "some-plugin": "../some-plugin" } }`. This is also the only way a source kind that
   cannot be discovered locally (`npm`, `archive`) is ever graded.
2. `--members <dir>` (repeatable), searched for a directory named after the source's repository or
   after the catalogue entry.
3. The directory the catalogue itself sits in, by the same name rules.

## The rules, stated exactly

### The collection verdict is self-consistency worst-member

Every member is graded **at its own declared tier and its own Standard pin**, exactly as it would be
graded alone. The collection is **red** if any member fails **its own** claim, or if the catalogue
itself carries an error.

No collection-level tier expectation is invented for anybody. A member that declares Bronze is not
measured against Gold because a sibling declared Gold, and there is no threshold to tune until the
collection turns green. A member that declares nothing is graded by the same default the gate already
applies to an undeclared plugin.

### Two failures wear the word "unresolved", and only one is a red

| Case | What it means | Verdict |
|---|---|---|
| **Unresolvable entry** | the catalogue entry is broken: no source, a malformed source, or an **explicitly named** location (a local-path source, or a mapping you supplied) that does not exist or is not a plugin | **red** - the catalogue is undeliverable |
| **Absent locally** | the entry is well-formed and names a real member, but no checkout of it could be found or confirmed on this machine, or its source kind is remote-only | **not red** - reported `not-graded`, and the verdict line states coverage |

The distinction is the difference between a defect in the artifact and a gap in the environment reading
it. A maintainer with three of five members cloned has a working catalogue and an incomplete
workstation; reddening that run would teach them to ignore the red.

**Explicitly named locations and guessed ones are treated differently, deliberately.** A local path in
the catalogue, or a path you supplied in the mapping file, is a *claim*: if it does not resolve to a
plugin, that is a defect and it reds. A directory this scope *guessed* from a repository basename is a
*hypothesis*: if it turns out not to be a plugin, or to be a different repository, it is passed over and
the search continues, and if nothing matches the member is `not-graded` rather than the catalogue being
blamed. The report names every candidate it passed over and why.

### How a discovered member's identity is checked

Discovery matches on a directory name, which is not proof. So a discovered candidate's git remote is
compared against the source the entry declares, read from the repository root (which for a `git-subdir`
member is above the plugin directory). Three outcomes:

| Outcome | What happens |
|---|---|
| Remote **matches** the declared source | graded, identity confirmed |
| Remote is a **different** repository | passed over; the search continues |
| **No readable remote** (a vendored copy, an extracted tarball) | graded, but the collection raises a **warning** saying identity could not be confirmed |

A candidate whose identity is confirmed always wins over one that cannot be confirmed, whatever order
they were found in. An explicit mapping skips this check entirely: that is you asserting identity, and
it is the way to grade a mirror or a checkout with no git metadata without the warning.

### A collection with nothing to grade is UNKNOWN, not green

If a catalogue lists members and **none** of them could be graded, the verdict is `unknown` and the run
exits non-zero. A green there would be a pass asserted from no evidence, on a catalogue that may be
entirely undeliverable. This is not a reversal of the absent-member rule above - a partially covered run
still passes on the members it saw - it is the observation that a verdict computed over an empty set is
not a verdict.

An **empty** catalogue (no entries at all) is green. Listing nothing is not the same as listing things
that cannot be found.

### Known limitation: malformed and mixed manifests

The scope and `U13` partition the well-formed cases cleanly, and say nothing about the rest. A
`marketplace.json` that does not parse is declined by this scope and ignored by `U13`, so nothing
reports it. A manifest that **mixes** skill entries and plugin entries goes entirely to `U13`, so its
plugin entries are never collection-graded. Both are tracked as backlog **E36**; closing either changes
which scope claims a directory, which is a compatibility decision rather than a patch.

### What a run does not tell you

A run grades local checkouts, **not** the trees at the registry pins. It answers "what would the next
re-pin grade", not "what do installers get today". Remote fetch-at-sha is deliberately deferred.

Because of that, every member row carries the registry **pin sha**, the registry **entry version**, the
**graded sha** and a **divergence marker** - unconditionally, including when they agree. A report that
showed them only on disagreement would teach a reader to assume agreement from silence.

## What the collection report contains

| Section | What it carries |
|---|---|
| Verdict | red or green, the coverage count (graded N of M), collection error and warning counts, exit code |
| Member ledger | one row per entry: status, declared tier, earned tier, errors, warns, Standard debt, entry version, pin, graded sha, divergence |
| Not graded, and why | the unresolvable-versus-absent split, per member, with the reason |
| Collection findings | the cross-member defects; no member's own gate reports any of these |
| Advisory | deterministic analyses that can never move the verdict |
| Metadata | catalogue identity, search roots, tier distribution, aggregation rule, exit code |

**Standard debt** is the count of findings held below their resolved severity by that member's own
Standard pin - whether because the check POSTDATES the pin (an introduction) or because a TIGHTENING
has not reached it yet. Both are one ceiling since Standard 0.13, so both count. It is what makes
"green by an old pin" visible rather than flattering.

## The finding classes

All of these are **scope-local**: they carry no `U`/`S`/`G` number, and the 31-check spine every plugin
is held to does not move. Graduating any of them to a numbered check is a separate decision with its own
migration window.

| Class | What it compares |
|---|---|
| `marketplace-manifest` | the catalogue parses and carries the required fields |
| `marketplace-entry-resolvability` | every entry resolves to a member, or is honestly reported |
| `marketplace-duplicate-name` | two entries claiming one name |
| `marketplace-skill-collision` | the union of member `skills/<name>/` directories |
| `marketplace-command-collision` | the union of member command names |
| `marketplace-version-agreement` | the entry's `version` against the member manifest's version |
| `marketplace-rename-collision` | a `renames` value colliding with a live name or another entry's renames |
| `marketplace-agent-restricted-fields` | a plugin-shipped agent declaring `hooks`, `mcpServers`, or `permissionMode`, which Claude Code does not support (warn) |

Three further analyses are **advisory** and are namespaced away from the findings the verdict reads, so
they can never move it: cross-member trigger-surface overlap, command-versus-skill divergence, and
content lineage between members.

## Source kinds

| Kind | Shape | Locally resolvable? |
|---|---|---|
| bare string | `"./members/foo"` | yes, directly |
| `url` / `git` | `{ "source": "url", "url": "...", "sha": "..." }` | by repository name |
| `github` | `{ "source": "github", "repo": "owner/name", "sha": "..." }` | by repository name |
| `npm` | `{ "source": "npm", "package": "...", "version": "..." }` | only via an explicit mapping |
| `archive` | `{ "source": "archive", "url": "...", "sha256": "..." }` | only via an explicit mapping |
| `git-subdir` | `{ "source": "git-subdir", "url": "...", "path": "...", "sha": "..." }` | by repository name, then the subdirectory |

An `archive` without a `sha256` is rejected as a broken entry rather than accepted as unpinned: an
archive with no digest is an unverifiable download, and accepting it would let a catalogue advertise
integrity it does not have.

## Related

- [The family registry](family-registry.md) - a dated collection report over the catalogue this scope was built for.
- [Evaluation reports](evaluation-reports.md) - the other five report types.
- [Universal checks](universal-checks.md) - `U13`, which owns the marketplace-of-skills shape this scope declines.
