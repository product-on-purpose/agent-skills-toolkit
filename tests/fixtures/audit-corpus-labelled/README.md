# audit-corpus-labelled - the 2026-09-04 audit corpus's labels, made reproducible

W6 finding 7 (pre-merge adversarial review of ADR 0063): the health number's calibration method reads
label counts from `scripts/lib/health-calibration.mjs`'s `CATEGORY_LABEL_COUNTS`, and until this
directory existed those counts were hand-asserted against a gitignored, untracked corpus nobody but
the original audit could re-run. This directory is the reconciliation - not a re-audit, and not a
re-labelling: every `deserves` / `categories` / justification value here is transcribed verbatim from
`docs/reference/health-score.md`'s own table, which is itself fixed before any measurement, per ADR
0063 sec 4's ordering requirement.

**Do not improve these trees.** Their defects are the evidence `inventory.json`'s labels describe. A
test that goes red here means either a real behaviour change worth reading, or that someone tidied a
fixture; check which before touching anything - the same rule `tests/fixtures/audit-corpus/README.md`
states for its own two trees.

## What is here, and what is not

The 2026-09-04 audit's manifest (`_local/audit/2026-09-04_fable-5-1-max/corpus/manifest.json`,
gitignored, read-only) lists 46 trees. Of those:

- **2 are already tracked** under `tests/fixtures/audit-corpus/` (`potemkin-gold`, `pin-abuse`) -
  the two falsifiable-test hold-outs ADR 0063 sec 4 names, held out of every count below for the same
  reason sec 4 gives: "to avoid calibrating the cut points to the test that grades them."
- **23 are copied byte-for-byte into this directory**, one subdirectory per tree, named after the
  manifest's own `id`. These are every other tree whose manifest `root` actually exists on disk under
  `_local/audit/2026-09-04_fable-5-1-max/corpus/plugins/`.
- **1 (`17-secret-in-skill-and-hook`) is reproduced by a tmpdir builder**
  (`17-secret-in-skill-and-hook.builder.mjs`), never committed as static files. Its skill body carries
  an AWS-style access key - AWS's own published documentation placeholder, not a real credential - but
  its AKIA-prefixed, 20-character shape matches what GitHub's secret scanning and push protection look
  for structurally. The builder's own header explains how it avoids ever writing that shape as one
  contiguous literal into a committed file.
- **The remaining 20 trees are not materialized here, but they are not lost** (corrected 2026-10-31;
  this bullet first said 21 trees that were never available to copy). The audit's builder
  (`_local/audit/2026-09-04_fable-5-1-max/corpus/build.mjs`, gitignored, read-only) registers them as
  `local: true` items. It generates them under `corpus/_local/` on every run and never stores them,
  because they are large or hostile by design. They are `04-budget-gaming`, the three
  `09b`/`09c`/`09d` pin-state variants, and all sixteen `h01`-`h16` hardening cases. None is on disk
  today because the builder's path resolution predates the audit's move under a dated folder. A
  2026-10-31 run of the builder in a scratch copy reproduced two stored trees (`03-description-gaming`,
  `11-malformed-grader-config`) identically apart from line endings, so the other 20 are regenerable.
  `docs/reference/health-score.md` records what W6 measured on the six that carry a calibration label.
  `inventory.json` lists all 20 with `materialized: false` and `path: null` rather than omitting them,
  so a reader sees the full 46-tree set and exactly which part of it is tracked here.

See `inventory.json` for the machine-readable form (`id`, `deserves`, `categories`, `justification`,
`materialized`, `path` per tree) and `tests/unit/audit-corpus-labelled.test.mjs` for what is actually
checked against these trees: that every declared path is real, that the label tally this inventory
produces matches `health-calibration.mjs`'s pre-committed constant, and a real, measured confusion
count (does the category's own measurement agree with the label) over every tree now materialized -
not just a count of how many labelled examples exist.

## One surprising, honestly-reported result

`11-malformed-grader-config` is labelled `deserves: true` (its undeserving reason is an unparseable
`askit.config.json`, an operator defect never charged to the plugin). Its three skill bodies, however,
are the audit's own shared placeholder content - the same `"Do nothing."` text `01-potemkin-gold` uses
- because the fixture's point was never skill-body quality. Measured against ADV4, every one of its
skills reads as placeholder content: a real false positive against this one tree's `deserves: true`
label, for the substance category specifically. `tests/unit/audit-corpus-labelled.test.mjs` asserts
this plainly, rather than picking a different negative example to avoid reporting it, per finding 6's
own instruction: "if a category penalises this repository, report it and fix the tree, never the
threshold" generalizes to any tree, not only this repository's own.

Tree 11 is not a one-off. The five `h05`-`h09` hardening controls are also labelled `deserves: true`,
and the builder gives each of them a placeholder body: its default `"Do nothing."` for `h05` to `h08`,
and the single word `body` for `h09`. Regenerated and graded on 2026-10-31, all five score substance 0
for that reason (see `docs/reference/health-score.md`). The labels stand, because ADR 0063 sec 4 fixes
them before any measurement.
