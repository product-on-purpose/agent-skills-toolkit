# Reference: askit-evaluate

Assesses a known, local skill or plugin against the Standard.

- **Scope:** auto-detected. `library.json` present (or an `AGENTS.md`/`skills/`
  directory) -> plugin scope; a lone `SKILL.md` with no `library.json` -> component
  scope; neither -> an `unknown`-scope error naming what was expected.
- **Command:** `node scripts/evaluate.mjs <path> [--json]`
- **Output:** per-rule findings (`error`/`warn`), and for plugin scope the tier +
  `blocked` list. `--json` emits the full report object; see the skill's
  `references/report-format.md` for the shape.
- **Exit code:** non-zero when there is at least one error.
- **Out of scope (v1):** behavioral evaluation (running a skill against expected
  outputs) and qualitative review. Those arrive in a later phase.
