# Golden example: command with maps-to pointing to a real skill

**Demonstrates:** authoring `commands/askit-build-docs.md` with the required `description` and `maps-to` frontmatter, showing exactly what the S7 command-contract check enforces and why a command MUST map to exactly one skill.
**Provenance:** authored by `askit-build-command` create mode on 2026-07-26 during the SP2b metered authoring pass; raw run artifact under the gitignored `_local/audit/eval-runs/2026-07-26/`.

## Input

The user asked:

> Create a /askit-build-docs command that invokes the askit-build-docs skill. It should accept an optional doc-type and path argument.

| Interview question | Answer |
|---|---|
| Command name (kebab-case)? | `askit-build-docs` (produces `/askit-build-docs`) |
| Backing skill? | `askit-build-docs` (exists at `skills/askit-build-docs/SKILL.md`) |
| Optional arguments? | `[doc-type] [path-or-skill-name]` |
| Description (what + when)? | Creates or improves a plugin's documentation; use when authoring tutorials, how-to guides, reference pages, or explanation pages |
| Claude-native only? | Yes - commands are Claude-native; Codex realizes the backing skill directly (sec 3.2 parity) |

## Output

### `commands/askit-build-docs.md`

```markdown
---
description: Creates or improves a plugin's documentation. Use when authoring tutorials, how-to guides, reference pages, or explanation pages, or when the docs tree needs refreshing against the component index.
maps-to: askit-build-docs
argument-hint: "[doc-type] [path-or-skill-name]"
metadata:
  version: 0.1.0
---

Invoke the `askit-build-docs` skill to create or improve documentation: $ARGUMENTS
```

### `library.json` registration (the `components.commands` entry to add)

```json
{ "name": "askit-build-docs", "path": "commands/askit-build-docs.md", "version": "0.1.0", "tier": "convergent", "status": "active" }
```

## Why this is golden

- **S7 contract satisfied** (S7, `authoring-commands.md`, `scripts/checks/command-contract.mjs`): both `description` and `maps-to` are present and non-empty. The check errors on either being absent. The `maps-to` value resolves to an on-disk skill (`skills/askit-build-docs/SKILL.md`); a value naming a non-existent skill is also an S7 error.
- **Description is what + when** (sec 8.1, U5): the description states the concrete action ("Creates or improves") AND the trigger condition ("Use when authoring..."), satisfying the `description-score` rubric at >= 0.7. The filename is the command name - there is no `name` key in the frontmatter (the reference doc states this explicitly).
- **One-to-many caveat respected** (sec 3.2, S7): the `maps-to` field points to exactly one skill. The S7 check does not support a list; a command mapping to multiple targets would be a design error and is not possible in the schema.
- **Codex parity declared implicitly** (sec 3.2): the command emits no Codex artifact because on Codex the backing skill (`askit-build-docs`) is the invocable form. The builder notes this rather than silently emitting nothing - aligning with the F-06 expectation-setting principle.
- **Thin body** (`authoring-commands.md`): the body is one line that delegates entirely to the backing skill via `$ARGUMENTS`. Commands are wrappers, not reimplementations.

## Verification

Verify the builder skill exists:

```
$ ls skills/askit-build-command/SKILL.md
skills/askit-build-command/SKILL.md
```

Verify the backing skill targeted by `maps-to` exists:

```
$ ls skills/askit-build-docs/SKILL.md
skills/askit-build-docs/SKILL.md
```

Parse the authored command frontmatter (run from the worktree root):

```
$ node -e "import('./scripts/lib/frontmatter.mjs').then(m=>{const fs=require('fs');const t=fs.readFileSync('C:/Users/jpris/AppData/Local/Temp/claude/E--Projects-product-on-purpose-agent-skills-toolkit/07613de3-e6c0-404f-8ba0-4dadbc201dd3/scratchpad/cmd-test.md','utf8');console.log(JSON.stringify(m.parseFrontmatter(t).frontmatter,null,2));})"
{
  "description": "Creates or improves a plugin's documentation. Use when authoring tutorials, how-to guides, reference pages, or explanation pages, or when the docs tree needs refreshing against the component index.",
  "maps-to": "askit-build-docs",
  "argument-hint": "[doc-type] [path-or-skill-name]",
  "metadata": {
    "version": "0.1.0"
  }
}
```

Measure the description score (U5 applies to SKILL.md descriptions, but the same rubric confirms quality here):

```
$ node -e "import('./scripts/checks/description-score.mjs').then(m=>console.log(m.scoreDescription(\"Creates or improves a plugin's documentation. Use when authoring tutorials, how-to guides, reference pages, or explanation pages, or when the docs tree needs refreshing against the component index.\")))"
0.9999999999999999
```

Score is 1.0 (displayed as floating-point); well above the 0.7 threshold.
