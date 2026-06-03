---
title: "Docs frontmatter taxonomy"
description: "Defines the YAML frontmatter every docs page carries, used when authoring or validating a docs/** page."
audience: engineer
level: intermediate
---

# Reference: docs frontmatter taxonomy

The normative schema for the YAML frontmatter block at the top of every public documentation page in this repository. This is the **page** frontmatter taxonomy: every page under `docs/**` carries it **today**, and a planned `docs-frontmatter` check will **enforce** it.

> **Status.** The taxonomy is applied now. The check that enforces it is part of the v1.1.0 documentation build-out (ADR 0024) and **has not shipped yet** - the current spine is 25 checks (`U1-U11`, `S1-S8`, `G1-G6`), and `G7` currently denotes tier inclusion, not a module. See [How it will be enforced](#how-it-will-be-enforced).

It is distinct from the component frontmatter contract. The `frontmatter-valid` check (Bronze) validates a component's `SKILL.md` and agent frontmatter against the agentskills.io rules and Section 3.8 of the [Standard](../../STANDARD.md). The planned `docs-frontmatter` check (Gold) will validate this docs-page taxonomy. Different modules, different scopes, different requirement IDs - do not conflate them.

## Scope

This taxonomy applies to **every page under `docs/**`, excluding `docs/internal/`.**

- `docs/internal/` is committed maintainer governance (decisions, RFCs, backlog, release plans) and is never published to the docs site, so it is out of scope for the taxonomy and for the planned check.
- The four Diataxis trees - `docs/tutorials/`, `docs/how-to/`, `docs/reference/`, `docs/explanation/` - are all in scope. The file you are reading is one of them.
- A root file (for example `README.md`, `QUICKSTART.md`, `STANDARD.md`) is **not** a docs page and does not carry this frontmatter.

The planned check will be conditional: a plugin with no public `docs/` pages passes vacuously. A plugin owes this taxonomy only once it has a published docs tree.

## Fields

| Field | Type | Required | Allowed values | Notes |
|---|---|---|---|---|
| `title` | string | REQUIRED | any non-empty string | The readable page title. |
| `description` | string | REQUIRED | any non-empty string | One line, action-verb plus use-when shape, **no `": "` colon-space** (see below). |
| `audience` | enum | REQUIRED | `non-engineer` \| `engineer` \| `both` | Who the page is written for. |
| `level` | enum | REQUIRED | `beginner` \| `intermediate` \| `advanced` | The reader's assumed depth. |
| `tags` | array of strings | OPTIONAL | a YAML list of strings | If present, MUST be an array of strings. |
| `doc-role` | string (enum) | OPTIONAL | `architecture-overview` \| `architecture-detailed` (extensible) | Marks a page's structural role so tooling can locate it path-independently (see below). |

### `title` (string, REQUIRED)

A non-empty string giving the page's readable title. Quote it when it contains a colon or other YAML-significant character (the reference pages quote the bare component name, e.g. `title: "askit-evaluate"`).

### `description` (string, REQUIRED)

A non-empty one-line summary that follows the same shape the Standard's `U5` description bar (Section 8.1) asks of a component description:

- **Action verb plus use-when.** State what the page does or covers, and when a reader would want it. The same discipline that makes a skill discoverable makes a docs page scannable.
- **No `": "` colon-space.** The colon-space sequence is disallowed in the `description` value. A colon-space is the field separator inside frontmatter and a frequent trigger word artifact; restructure the sentence with a comma, a clause break, or a single space-hyphen-space instead.

The planned `docs-frontmatter` check will verify the field is a non-empty string and contains no colon-space; it will not score prose quality (that judgment routes to the behavioral `askit-evaluate` path, never the deterministic gate).

### `audience` (enum, REQUIRED)

One of exactly three values:

- `non-engineer` - a reader who does not need to run scripts or read code to get value.
- `engineer` - a reader expected to run commands, read source, or wire up CI.
- `both` - the page serves both without assuming engineering background.

A value outside this set is a failure that names the field and the page.

### `level` (enum, REQUIRED)

One of exactly three values, describing the assumed depth:

- `beginner` - the on-ramp; no prior context assumed.
- `intermediate` - assumes familiarity with the basics (tiers, components, the gate).
- `advanced` - assumes a working multi-component plugin and lifecycle concerns.

A value outside this set - for example `level: expert` - is a failure.

### `tags` (array of strings, OPTIONAL)

An optional YAML list of strings for grouping and search. If the key is present, its value MUST be an array of strings; a scalar or a non-string entry is a failure. Omit the key entirely when a page needs no tags - an absent optional field is never an error.

### `doc-role` (string, OPTIONAL)

An optional marker that gives a page a **path-independent structural identity**, so a check can find it without guessing a filename. The vocabulary is extensible; the two roles the toolkit relies on today are:

- `architecture-overview`
- `architecture-detailed`

The planned `docs-presence` check (reqId `G10`, also part of the v1.1.0 build-out) will use this key to locate the architecture pair: it finds the page carrying `doc-role: architecture-overview` and confirms it links to the page carrying `doc-role: architecture-detailed`. Because the roles are looked up by identity rather than by path, the pages can live anywhere (the default home is `docs/explanation/architecture.md` for the overview and `docs/explanation/architecture-internals.md` for the detailed companion). Most pages carry no `doc-role` at all - it is added only where a check needs to locate a specific page.

## Complete example

A full frontmatter block, with the optional fields included for illustration:

```yaml
---
title: "Climb from Bronze to Silver"
description: "Adds the multi-agent machinery to take a Bronze plugin cross-agent, used after a plugin parses and self-describes."
audience: engineer
level: intermediate
tags:
  - tier
  - convergent
  - cross-agent
doc-role: architecture-detailed
---
```

A minimal block carries only the four required fields:

```yaml
---
title: "Choose your agent targets"
description: "Reports which component types each agent can run, used before deciding a plugin's targets and tier."
audience: both
level: beginner
---
```

## How it will be enforced

The taxonomy is documented here as a reference (the way a plugin ships a `frontmatter-schema` file). It is **applied today** - every `docs/**` page already carries it - and a deterministic check to **enforce** it is planned as part of the v1.1.0 documentation build-out (ADR 0024). That check has not shipped yet: the current spine is **25 checks (`U1-U11`, `S1-S8`, `G1-G6`)**, and `G7` currently denotes tier inclusion (Standard sec 2.6), not a module. When the build-out lands it reclassifies that tier-inclusion statement and assigns `G7` to this `docs-frontmatter` check (and `G10` to `docs-presence`), growing the spine to 30.

When shipped, the planned `docs-frontmatter` module (reqId `G7`, Gold tier) will:

- walk `docs/**/*.md`, skip `docs/internal/**`, parse each page's frontmatter, and emit an `error` for any in-scope page missing a required field, carrying an out-of-vocabulary `audience` or `level`, with a `description` containing a colon-space, or with a non-array `tags`;
- bind a plugin that declares `advanced` (below that tier the finding is a burndown item toward the next rung);
- be synchronous, deterministic, and zero-model, like every check in the spine: the gate decides pass or fail; judgment-based review sits beside it and never decides conformance.

## See also

- [`STANDARD.md`](../../STANDARD.md) - the normative Standard. Section 8.1 defines the description bar this taxonomy's `description` field inherits; Section 3.8 defines the separate component frontmatter contract.
- [`askit-build-docs`](askit-build-docs.md) - the skill that authors and refreshes docs pages and stands up the docs site.
- [`askit-evaluate`](askit-evaluate.md) - grades a plugin against the Standard, including the docs-frontmatter check once it ships.
