# Golden 1: the upstream has not moved

The common case, and the one the skill is designed to make cheap. Captured 2026-07-27 against the live
upstream with the committed pin.

## Command

    npm run standards-watch

## Output

    upstream standards watch - agentskills.io
    pin verified 2026-07-27 | run 2026-07-27

    VERDICT: unchanged

    Watched artifacts
      unchanged docs/specification.mdx  (20cf9f6b6723)
      unchanged skills-ref/src/skills_ref/validator.py  (22cf6f8ae5f9)
      unchanged skills-ref/src/skills_ref/models.py  (77fa89ed2ccc)
      unchanged skills-ref/src/skills_ref/parser.py  (690c14e27b61)

    Limits
      - Detection is deterministic; materiality of a prose change is not. A section-body change is reported, never classified.
      - The reference implementation (skills-ref) is watched by content hash only; its diff is not parsed.
      - This tool proposes. Amending a check or STANDARD.md requires an ADR and the sec 7.7 warn-first burndown.

    No proposal to make. Re-run after the next upstream release, or refresh the verified date with --emit-pin.

Exit code `0`.

## What the operator does

Nothing. Report "unchanged since 2026-07-27" and stop.

Optionally refresh the verification date so the next run's "unchanged since" is honest about when the
claim was last checked:

    npm run standards-watch -- --emit-pin --by "your name" > /tmp/pin.json

Then review `/tmp/pin.json` and save it over the committed pin yourself. The only field that changes is
`verified.date`. The command prints; it does not write.

## Why the limits block is printed even on a clean run

So that a clean run cannot be quoted as a stronger claim than it is. "Unchanged" means every watched
artifact hashes to its pinned value. It does not mean the upstream ecosystem is unchanged, and it says
nothing about artifacts nobody thought to watch.
