# Golden 2: a real upstream change, reproducible today

This example uses a **genuine past change to the agentskills.io specification**, not a fabricated one.
`pin-historical-2026-05-15.json` in this directory records the upstream exactly as it stood at commit
`2d3e01f`, the parent of `6868401` ("docs: fix name field character range to include digits",
2026-05-16). Running the watcher against that pin reproduces the detection of that real change.

## Command

    node scripts/standards-watch.mjs . --pin skills/askit-standards-watch/examples/pin-historical-2026-05-15.json

## Output (captured 2026-07-27)

    upstream standards watch - agentskills.io
    pin verified 2026-05-15 | run 2026-07-27

    VERDICT: needs-review

    Watched artifacts
      CHANGED   docs/specification.mdx  (a45ead394920 -> 20cf9f6b6723)
      unchanged skills-ref/src/skills_ref/validator.py  (22cf6f8ae5f9)
      unchanged skills-ref/src/skills_ref/models.py  (77fa89ed2ccc)
      unchanged skills-ref/src/skills_ref/parser.py  (690c14e27b61)

    Needs a human read (1) - located, deliberately NOT classified
      - [section-body-changed] #### `name` field
        the body of "#### `name` field" changed (a1044f25ca27d099 -> 5f781114ba5da147); read the diff and decide whether it is normative
        touches: U3, U4

    Checks a delta lands on (resolved from docs/reference/universal-checks.md)
      U3  scripts/checks/frontmatter-valid.mjs
          Every component's frontmatter parses and carries a `name` and a `description`
          Standard sec 3.1 | tier universal | since 0.x | vendor-cited
      U4  scripts/checks/name-matches-dir.mjs
          A component's declared `name` equals its directory in kebab-case
          Standard sec 3.1 | tier universal | since 0.x | vendor-cited

Exit code `1`.

## The upstream diff the operator then reads

    gh api "repos/agentskills/agentskills/commits/6868401b64f791e9ff565f29beb6338826b73a2b"

One line, inside the `#### name field` section:

    - May only contain unicode lowercase alphanumeric characters (`a-z`) and hyphens (`-`)
    + May only contain unicode lowercase alphanumeric characters (`a-z`, `0-9`) and hyphens (`-`)

## The finding, and why this example is the important one

The frontmatter **table** did not change: its `name` row already read "Lowercase letters, numbers, and
hyphens only". A watcher that only diffed the table would have reported nothing. The per-section body
hash caught it and, correctly, refused to say whether it mattered.

A human then opens `scripts/checks/frontmatter-valid.mjs` and reads the actual expression:

    const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

Digits were already permitted. The outcome is **re-pin only**: the upstream clarified its prose, no
requirement of ours changed, `U3` and `U4` stay as they are. That conclusion is a person's, reached by
reading two files, and it is exactly the conclusion the tool declined to reach on its own.

## Note on reproducibility

Re-running this after the upstream changes again will show additional deltas on top of this one. That
is correct behavior, not drift in the example: the historical pin is a fixed point, and the distance
from it grows.
