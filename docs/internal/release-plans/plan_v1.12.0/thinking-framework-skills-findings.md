# Findings report - `thinking-framework-skills`

> **Measured 2026-08-12** against `thinking-framework-skills` at `dbe71d8` (its local `main`, one commit
> behind `origin/main` at the time of measurement) using `agent-skills-toolkit` at
> `release/v1.12.0`. **Nothing in that repository was modified.** This report is a deliverable to its
> maintainer; the remediation is that maintainer's call.

## Why this exists

The marketplace scope shipped in v1.12.0 grades the whole family catalogue in one run, and it reds the
collection because this member declares `advanced` (Gold) and earns `convergent` (Silver). The cause is
**this toolkit's own v1.10.0 change**, so the finding is filed with the evidence and the exact
remediation rather than left as a red line in a report.

## Reproduction

Two commands, from an `agent-skills-toolkit` checkout, with that repository's root as a positional
argument. Neither writes anything.

```bash
node scripts/check.mjs /path/to/thinking-framework-skills
node scripts/generators/gen-index.mjs /path/to/thinking-framework-skills > /tmp/INDEX.new
diff /path/to/thinking-framework-skills/INDEX.md /tmp/INDEX.new
```

## Result

| Fact | Value |
|---|---|
| Declared tier | `advanced` (Gold) |
| Earned tier | `convergent` (Silver) |
| Declared Standard pin | `0.8` |
| Errors | **1** |
| Warnings | 128 |
| Standard debt (warnings only because of the `0.8` pin) | 121 |
| Graded sha | `dbe71d8d54d845b877678fc8393e7a7260914393` |
| Registry pin at time of measurement | `9aab9f3d718d00d72f9a3f2f272f0c882e83e619` (diverged; the catalogue is between releases, which is normal) |

### The single error

```
G4 index-drift: INDEX.md is out of date with library.json + component frontmatter
                (a hand-edited generated file is an error at Gold, Standard sec 2.6 G4)  -> INDEX.md
```

### Warnings, by requirement

| reqId | Count | Held back by the `0.8` pin? |
|---|---|---|
| `G8` (folder-readme) | 71 | yes |
| `G9` (source-doc) | 39 | yes |
| `U5` (description-score) | 7 | no |
| `G7` (docs-frontmatter) | 6 | yes |
| `G10` (docs-presence) | 5 | yes |

121 of the 128 warnings are errors that the `0.8` pin holds back. They become gate-failing the moment
this plugin re-pins to a current Standard. That is not a hidden trap - it is what the pin is for - but
it is worth knowing before re-pinning: **the `G4` error is the small problem, and the 121 held-back
findings are the large one.**

## The `G4` error, diagnosed

**This is a migration consequence of a fix in this toolkit, not a defect introduced by this member.**

`INDEX.md` is generated, never authored. Before v1.10.0, the generator asserted a fixed repository
layout in two "boilerplate" sections, and the drift check compared a committed index against the same
generator that had written it - so an index naming files the plugin does not ship was wrong but
consistent, and passed forever. v1.10.0 made those sections filter by `existsSync`. Any consuming plugin
whose committed `INDEX.md` predates that fix is in `G4` drift until it regenerates.

**The exact drift, measured rather than described.** A dry-run regeneration removes exactly two lines
and adds none:

```diff
 ## Documentation and governance

-- [`STANDARD.md`](STANDARD.md) - the Advanced Skill Library Standard (normative).
 - [`README.md`](README.md) - overview, positioning, quickstart.
 - [`CHANGELOG.md`](CHANGELOG.md) - full technical history; [`RELEASE-NOTES.md`](RELEASE-NOTES.md) - curated, user-facing notes.
 - [`docs/`](docs/) - Diataxis docs (reference, how-to, explanation).
-- [`docs/internal/decisions/`](docs/internal/decisions/) - ADRs; [`docs/internal/backlog/`](docs/internal/backlog/) - backlog; [`docs/internal/STATUS.md`](docs/internal/STATUS.md) - live tracker.
 - [`agents/_chain-permitted.yaml`](agents/_chain-permitted.yaml) - the chain contract; [`templates/`](templates/) - scaffolder templates.
 - [`scripts/`](scripts/) - the Node validation spine (conformance checks, generators, gate, evaluate).
```

Those two lines link **four paths this repository does not have**, each verified absent on disk at
`dbe71d8`:

| Path linked by the committed `INDEX.md` | Exists? |
|---|---|
| `STANDARD.md` | no |
| `docs/internal/decisions/` | no |
| `docs/internal/backlog/` | no |
| `docs/internal/STATUS.md` | no |

So the committed index has been advertising four dead links to every reader since it was generated. The
regeneration removes them and changes nothing else.

## Recommended remediation

One command, then commit the result. Run it from wherever `agent-skills-toolkit` is checked out, with
this repository's root as a positional argument (nothing installs the generators into a consuming
plugin):

```bash
node /path/to/agent-skills-toolkit/scripts/generators/gen-index.mjs /path/to/thinking-framework-skills --write
```

This repository has its own `scripts/check.mjs` (its own repo checks, not this toolkit's gate) but **no
`scripts/generators/`**, verified on disk, so the generator has to come from outside its tree. The
regenerated index keeps its existing `Self-validating: node scripts/check.mjs` line unchanged for that
reason; the only lines that move are the two shown above.

Or, without a toolkit checkout, from the published package:

```bash
npm i -D agent-skills-toolkit
node node_modules/agent-skills-toolkit/scripts/generators/gen-index.mjs . --write
```

After that, `node scripts/check.mjs <root>` reports 0 errors and the plugin earns the `advanced` tier it
declares, which turns the family collection green on this member.

## What this report deliberately does not do

- **It does not touch that repository.** No file there was modified, and no pull request was opened.
- **It does not ask for the 121 held-back findings to be fixed.** They are legitimately deferred by the
  `0.8` pin under the Standard's own compatibility policy. They are reported here so that re-pinning is
  a decision made with the number in hand rather than a surprise.
- **It does not recommend changing the declared tier.** Declaring Silver would also turn the member
  green, and it is a defensible choice - but it is the maintainer's, and it is a different statement
  about the plugin than fixing the index.
