# Golden 3: a new required frontmatter field (constructed scenario)

**This scenario is constructed.** The upstream has not added a `schema-version` field. It is built by
running the watcher with `--snapshot-dir` against a locally modified copy of the specification, which
is how the material path is exercised without waiting for the upstream to change. Golden 2 is the real
change; this one shows the class of delta the tool can decide on its own.

## Setup

A local mirror at `/tmp/snap/` holding `docs/specification.mdx` with two edits (a new required
`schema-version` row in the frontmatter table, a reworded `metadata` constraint, a new required
`evals/` entry in the directory tree) plus the four unmodified upstream files.

## Command

    node scripts/standards-watch.mjs . --snapshot-dir /tmp/snap

## Output

    VERDICT: material-change

    Watched artifacts
      CHANGED   docs/specification.mdx  (20cf9f6b6723 -> f29445ecac1b)
      unchanged skills-ref/src/skills_ref/validator.py  (22cf6f8ae5f9)
      unchanged skills-ref/src/skills_ref/models.py  (77fa89ed2ccc)
      unchanged skills-ref/src/skills_ref/parser.py  (690c14e27b61)

    Material deltas (3) - decided structurally, no judgment applied
      - [field-constraint-changed] metadata
        `metadata` constraints changed
            was: Arbitrary key-value mapping for additional metadata.
            now: Arbitrary key-value mapping. Max 32 keys.
        touches: U3
      - [field-added] schema-version
        new frontmatter field `schema-version` (required: true); constraints: Must be `1`.
        touches: no check encodes this today
      - [directory-added] evals/
        new component entry `evals/` (required: true)
        touches: no check encodes this today

    Needs a human read (2) - located, deliberately NOT classified
      - [section-body-changed] ## Directory structure
      - [section-body-changed] ### Frontmatter

Exit code `1`.

## Reading it

Three material deltas, decided without judgment:

- `metadata` gained a cap. It lands on `U3`, which today validates only that `metadata` parses. A cap
  is a new constraint, so this is a candidate tightening.
- `schema-version` is **required** and lands on nothing. `touches: no check encodes this today` is the
  gap list: the Universal tier would need a new check to enforce a field the upstream now requires.
- `evals/` is a new required component type, likewise unencoded.

The two review-class section changes are the same edits seen from the prose side. They are listed
because the section bodies moved, and they add nothing here; that redundancy is deliberate, since the
structural layer is the thing that might miss something, never the other way round.

## The proposal, and the shape of the burndown

    node scripts/standards-watch.mjs . --snapshot-dir /tmp/snap --adr-draft --adr-number 0040 \
      > docs/internal/decisions/0040-track-upstream-schema-version.md

Two of these three deltas would be new requirements at the Universal tier. Per `STANDARD.md` sec 7.7,
each ships as a `warn` for the Standard MINOR that introduces it and becomes a gate-failing `error` at
the next, which is the migration window a downstream library is owed. The ADR names that schedule; the
skill does not implement it.
