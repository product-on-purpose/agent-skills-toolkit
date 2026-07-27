# Golden example: how-to guide with Diataxis placement decision and G7 frontmatter

**Demonstrates:** authoring a how-to guide page for a plugin's docs tree, showing the Diataxis placement decision (how-to vs tutorial) and the correct G7 frontmatter taxonomy including the "no colon-space in description" rule.
**Provenance:** authored by `askit-build-docs` create mode on 2026-07-26 during the SP2b metered authoring pass; raw run artifact under the gitignored `_local/audit/eval-runs/2026-07-26/`.

## Input

The user asked:

> Write a docs page explaining how to add a new conformance check to the validation spine. The audience is engineers contributing to the toolkit. Should it be a tutorial or a how-to?

| Interview question | Answer |
|---|---|
| Topic? | Adding a new deterministic check to `scripts/checks/` |
| Audience? | Engineers already familiar with the Standard - contributors, not beginners |
| Goal of the page? | Walk through the concrete steps to write, register, and test a new check |
| Does the reader need to understand the WHY, or just do the task? | Just do the task - they already know the context |
| Diataxis placement? | **How-to** (see placement decision below) |

### Diataxis placement decision

The four Diataxis shapes and this content's fit:

| Shape | Purpose | Reader's state | This content? |
|---|---|---|---|
| Tutorial | Learning-oriented; hand-held walkthrough building understanding | Beginner with no context | No - the reader already knows the Standard |
| How-to | Task-oriented; concrete steps to achieve a specific goal | Practitioner who knows what they want | **Yes** - "add a check" is a specific, bounded goal |
| Reference | Information-oriented; authoritative lookup, no narrative | Practitioner who needs precise facts | No - this is procedural, not a lookup table |
| Explanation | Understanding-oriented; background and rationale | Anyone seeking conceptual depth | No - this page does not explain why checks exist |

A tutorial would re-teach concepts the reader already has and would feel patronizing. A reference page would list API facts without procedure. This page belongs in the how-to quadrant because the reader arrives knowing what they want and needs the ordered steps to get there.

## Output

The page lives here as a fenced block rather than on disk: writing it for real would add a graded page to this repository's own `docs/` tree. The path below is where the run would write it.

### `docs/how-to/write-a-conformance-check.md`

```markdown
---
title: "How to write a conformance check"
description: "Step-by-step guide for adding a new deterministic check to the validation spine and registering it in the gate"
audience: engineer
level: intermediate
tags:
  - checks
  - validation
  - contributing
doc-role: how-to
---

# How to write a conformance check

A conformance check is a single-file ES module in `scripts/checks/` that the
gate (`check.mjs`) and `evaluate.mjs` both run. This guide walks through
writing a new one from scratch and making it pass in CI.

## Prerequisites

- Node >= 22.12.0 installed.
- Familiarity with the Standard section you are targeting (see `STANDARD.md`).
- The check does not need to call any model: the spine is deterministic
  (Design Principle 3).

## Steps

### 1. Create the check file

Copy the simplest existing check as a starting point:

```
cp scripts/checks/description-score.mjs scripts/checks/my-check.mjs
```

### 2. Fill in the module header

Every check module exports `meta` and `check`:

```js
// what-it-is:   the my-check check (SX)
// what-it-does: asserts ...
// why:          enforces Standard sec ... deterministically
// used-by:      registered in scripts/lib/registry.mjs; run by check.mjs
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = {
  id: "my-check",
  tier: "convergent",  // bronze | convergent | advanced
  reqId: "SX",
  since: "0.12",
  provenance: "house",
};

export function check(ctx) {
  // ctx carries: root, skills, subagents, commands, workflows, ...
  // Return [] for a clean pass.
  return [];
}
```

`tier` controls which gate pass runs the check (U = universal/bronze,
S = convergent/silver, G = advanced/gold). Use the lowest tier that makes
sense for the requirement.

### 3. Register the check

Open `scripts/lib/registry.mjs` and add your check to the appropriate tier
array. The gate imports every entry in this file; an unregistered check is
never run.

### 4. Write a failing test first

Add a test in `tests/` that provides a minimal `ctx` matching the violation
your check detects, and asserts the expected finding is returned. Run it:

```
npm test
```

### 5. Implement until the test passes

Fill in the `check` body, re-run `npm test` after each change. Keep the
logic deterministic - no network calls, no model calls.

### 6. Run the full gate

```
node scripts/check.mjs .
```

The gate must still report 0 errors after your change. If your new check
finds violations in the existing codebase, fix them or add suppressions
in `askit.config.json` before shipping.

## What to avoid

- Calling external services or a model inside `check()`.
- Emitting findings with a severity higher than the violation warrants
  (`SEVERITY.WARN` for style issues, `SEVERITY.ERROR` for hard requirements).
- Registering the check at a tier higher than needed (this blocks plugins
  that are not trying to reach that tier).
```

## Why this is golden

- **Diataxis placement justified explicitly** (`askit-build-docs` create mode, `authoring-agents-md.md` context): the Input section includes a decision table showing which Diataxis shape fits and why, demonstrating that "one purpose per page" is a deliberate choice, not a default. Tutorial vs how-to is the most common confusion; naming the distinction is the hardest part of this builder.
- **G7 frontmatter correct and complete** (G7, `scripts/checks/docs-frontmatter.mjs`): all required fields are present (`title`, `description`, `audience`, `level`), the optional `tags` and `doc-role` are included for a complete taxonomy, and the description contains no colon-space (the gate checks `desc.includes(': ')` and errors if found).
- **Description passes the no-colon-space rule** (G7): "Step-by-step guide for adding a new deterministic check to the validation spine and registering it in the gate" has no `: ` substring - verified programmatically in the Verification section below.
- **Audience and level set correctly** (G7, sec 8.4): `engineer` and `intermediate` are the exact enum values the check accepts; a how-to for contributors is not `beginner` (assumes Standard familiarity) and not `advanced` (no architectural depth).
- **Cross-links reference specific files** (U6 discipline): the page body references `scripts/checks/`, `scripts/lib/registry.mjs`, `STANDARD.md`, and `askit.config.json` as inline code (not as relative markdown links), so there is no U6 link-rot surface inside the example prose.

## Verification

Verify the builder skill exists:

```
$ ls skills/askit-build-docs/SKILL.md
skills/askit-build-docs/SKILL.md
```

Verify the docs-frontmatter check script exists:

```
$ ls scripts/checks/docs-frontmatter.mjs
scripts/checks/docs-frontmatter.mjs
```

Parse the authored docs page frontmatter:

```
$ node -e "import('./scripts/lib/frontmatter.mjs').then(m=>{const fs=require('fs');const t=fs.readFileSync('C:/Users/jpris/AppData/Local/Temp/claude/E--Projects-product-on-purpose-agent-skills-toolkit/07613de3-e6c0-404f-8ba0-4dadbc201dd3/scratchpad/docs-test.md','utf8');console.log(JSON.stringify(m.parseFrontmatter(t).frontmatter,null,2));})"
{
  "title": "How to write a conformance check",
  "description": "Step-by-step guide for adding a new deterministic check to the validation spine and registering it in the gate",
  "audience": "engineer",
  "level": "intermediate",
  "tags": [
    "checks",
    "validation",
    "contributing"
  ],
  "doc-role": "how-to"
}
```

Confirm no colon-space in description:

```
$ node -e "const desc='Step-by-step guide for adding a new deterministic check to the validation spine and registering it in the gate';console.log('contains colon-space:', desc.includes(': '));"
contains colon-space: false
```
