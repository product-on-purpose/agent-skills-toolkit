# Skill authoring guide

See [STANDARD.md](../../../STANDARD.md) for the full Standard text.

## The description bar (Standard sec 8.1)
A description MUST state what the skill does AND when to use it, and SHOULD include concrete trigger keywords. Tooling scores it 0-1 and warns below 0.7.
- State the action/output ("Converts ...", "Generates ...").
- State the trigger ("Use when ...").
- Use words a user would actually say.
- Third person; no "helps with", no vague verbs; no angle brackets or ALL-CAPS.

## Layout (Standard sec 10.2)
`skills/<name>/SKILL.md` (canonical), optional `references/` (lazy depth, one level), `examples/` (>= 3 golden + 1 anti, recommended), `HISTORY.md` (recommended at Bronze).

## Budget
Keep `SKILL.md` lean (well under 500 lines); push depth into `references/`.
