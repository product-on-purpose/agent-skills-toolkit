# Golden example: a multi-section skill with references

**Demonstrates:** Decision 4 of [the authoring guide](../references/authoring-guide.md) - a procedure with branch points stays in `SKILL.md` while the consulted material moves to `references/`, and the same relative link changes depth when it is written from one directory deeper.
**Provenance:** authored by `askit-build-skill` create mode on 2026-07-26 during the SP2b metered authoring pass; raw run artifact under the gitignored `_local/audit/eval-runs/2026-07-26/`.

## Input

> "Our incident writeups are inconsistent and half of them have action items nobody owns. Build a skill that produces the postmortem from the incident timeline."

| Interview question | Answer |
|---|---|
| Skill name (kebab-case) | `incident-postmortem` |
| What does it do? | Turns an incident timeline into a blameless postmortem with owned, dated action items. |
| When should it fire? | "write the postmortem", "incident review", "RCA", "writeup for yesterday's outage". |
| Trigger keywords | postmortem, incident review, RCA, outage, blameless |
| Decision 1: is this one skill? | Yes. One output, a postmortem document. The severity table and the section spec are inputs to that one output, not second and third outputs. |
| Decision 3 and 4: what splits? | Two blocks split. See the split table below. |

### The split decision, block by block

The test is the guide's: **would an agent executing this procedure need this sentence in front of it on every run?**

| Block | Verdict | Why |
|---|---|---|
| The six numbered steps and their order | body | It is the procedure. A procedure hidden in a reference is a procedure that never runs. |
| The severity branch (short form vs full form) | body | It is a decision point. The agent must know a branch exists before it knows to go looking for the rubric. |
| The SEV1 to SEV4 table | `references/severity-rubric.md` | Consulted, one row at a time. Four rows are read once per incident, not per step. |
| The section order and heading names | `references/postmortem-format.md` | A format specification. It is looked up while writing, and it changes without the procedure changing. |
| The "never write an uncited cause" rule | body | It is the exit condition on step 4 and the failure the skill exists to prevent. |
| Retention and publication rules | plugin `docs/`, linked | It is policy, shared with components that are not this skill, so it lives once at the plugin level. |

## Output

```
skills/incident-postmortem/
  SKILL.md
  references/
    postmortem-format.md
    severity-rubric.md
```

### `skills/incident-postmortem/SKILL.md`

```markdown
---
name: incident-postmortem
description: Drafts a blameless incident postmortem from an event timeline, producing the narrative, the contributing factors, and owned action items with due dates. Use when the user asks to write a postmortem, an incident review, an RCA, or a writeup after an outage.
metadata:
  version: 0.1.0
  tier: universal
  audience: intermediate
---

# incident-postmortem

## Purpose
Turn a timeline of what happened into the document a team can act on: one narrative, the factors that
contributed, and action items that each have an owner and a date. Severity decides how much of the
document gets written.

## When to use
When the user asks for a postmortem, an incident review, an RCA, or a writeup after an outage.

## Steps
1. Get the timeline. Ask for the incident channel export, the alert history, or the deploy log. If
   there is no timeline, build one and have the user confirm it before writing. A postmortem written
   from memory records the story people remember, not the one that happened.
2. Classify severity against the table in
   [references/severity-rubric.md](references/severity-rubric.md). Read one row, not the page.
   - SEV3 or lower: write the short form (summary, timeline, action items) and skip to step 5.
   - SEV2 or higher: write the full form, all sections.
3. Write the sections in the order given by
   [references/postmortem-format.md](references/postmortem-format.md), which also fixes the heading
   names the incident index parses. Blameless means naming systems and decisions, never people: "the
   deploy job skipped the migration gate", not "Sam skipped the gate".
4. Settle the cause.
   - If a cause is confirmed, state it and cite the timeline entry that proves it.
   - If it is not confirmed, write `cause not yet established` and open an investigation action item.
     Never write a plausible cause you cannot cite; a confident wrong cause closes the investigation.
5. Write the action items. Each one carries an owner, a due date, and a class of `prevent`, `detect`,
   or `mitigate`. Reject any item without a named owner. An unowned action item is a wish.
6. Check the retention and publication rules in [../../docs/incident-policy.md](../../docs/incident-policy.md)
   before sharing the draft outside the responding team, then hand the draft to the incident owner.

## Exit condition
Done when the draft carries every section the format requires for its severity, every action item has
an owner and a date, and the cause is either cited or explicitly open.
```

### `skills/incident-postmortem/references/severity-rubric.md`

```markdown
# Severity rubric (reference)

Read one row. Severity is assigned from the worst row the incident satisfies, not from how it felt at
the time.

| SEV | Trigger | Postmortem form | Review |
|---|---|---|---|
| SEV1 | Total outage, data loss, or a security breach of customer data. | Full | Exec review within 5 business days |
| SEV2 | A core workflow unavailable or degraded past its SLO for more than 30 minutes. | Full | Team review within 10 business days |
| SEV3 | A non-core feature degraded, or a core workflow degraded under 30 minutes. | Short | Async, no meeting |
| SEV4 | Internal-only impact, or a near miss caught before customers saw it. | Short | Async, optional |

## Assignment rules

- Assign from customer-visible effect, not from the size of the fix. A one-character fix that took
  the checkout flow down for an hour is SEV2.
- A near miss is worth writing up. Reclassify to SEV4 rather than skipping the document.
- When two rows both fit, take the worse one and say why in the summary.
```

### `skills/incident-postmortem/references/postmortem-format.md`

```markdown
# Postmortem format (reference)

The section order and heading names. The incident index parses these headings, so they are fixed
strings, not suggestions. Short form is the first three sections only.

| # | Heading | Contents | Short form |
|---|---|---|---|
| 1 | `## Summary` | Two sentences: what broke, who it affected, for how long. | yes |
| 2 | `## Timeline` | UTC timestamps, one line per event, first alert to all clear. | yes |
| 3 | `## Action items` | Table of owner, due date, class (prevent/detect/mitigate). | yes |
| 4 | `## Impact` | Requests, users, revenue, and the SLO burn, with the query used. | no |
| 5 | `## Contributing factors` | Every factor, not the single first cause found. | no |
| 6 | `## Detection` | How it was noticed, and how long that took. | no |
| 7 | `## What went well` | Kept deliberately: it is what the team should protect. | no |

## Field rules

- Timestamps are UTC and absolute. "20 minutes later" breaks when the timeline is reordered.
- Impact numbers carry the query or dashboard that produced them, so the next reader can re-run them.
- A contributing factor is a condition that had to hold for the incident to happen. If removing it
  would not have prevented or shortened the incident, it is context, not a factor.

## Publication

Retention, redaction, and who may read the draft are set by the plugin's policy page at
[../../../docs/incident-policy.md](../../../docs/incident-policy.md). Note the depth: this file sits one
directory below `SKILL.md`, so the same target needs one more `../` than the body's link uses.
```

### The same target, linked from two depths

Both files above link to the plugin's policy page. It is the same file, and the two links are not the same string, because a relative link resolves against the directory of the file that contains it:

| Written in | Link to the plugin's `docs/incident-policy.md` |
|---|---|
| `skills/incident-postmortem/SKILL.md` | `../../docs/incident-policy.md` |
| `skills/incident-postmortem/references/postmortem-format.md` | `../../../docs/incident-policy.md` |

Copying the body's link into the reference file is the trap. It looks right, it points at a file that genuinely exists, and it 404s when clicked, because CommonMark and GitHub both resolve from the containing file. `U6` catches it; the transcript is in the verification section below.

## Why this is golden

- **The split follows Decision 4's consulted-versus-executed test, block by block,** and the split table is part of the deliverable rather than an afterthought: the procedure and both branch points stayed in the body, the format spec and the severity table left it.
- **Each reference is linked at the moment of need** (step 2 links the rubric, step 3 links the format), which is rubric dimension 4's requirement. A reference listed only at the bottom of the file is reached after the agent has already guessed.
- **Nesting is exactly one level** (sec 3.1 and sec 10.2). `U6` scans `SKILL.md` and `references/*.md` at the top level only, so a file at `references/sub/deep.md` would fall outside both the Standard and the link check.
- **The link trap is demonstrated, not described:** the same target appears at two depths, and the wrong depth is shown failing under the real checker.
- **The decision points are branch conditions, not adjectives.** Step 2 branches on severity, step 4 branches on whether the cause is cited, and step 5 states an outright rejection rule, which is what rubric dimension 2 grades.

## Verification

The skill was authored inside a scratch plugin so the plugin-level link had something real to resolve to, then graded at component scope:

```
$ node scripts/evaluate.mjs _local/audit/eval-runs/2026-07-26/incident-plugin/skills/incident-postmortem --json
{
  "scope": "component",
  "target": "_local/audit/eval-runs/2026-07-26/incident-plugin/skills/incident-postmortem",
  "findings": [],
  "byRule": {},
  "summary": {
    "errors": 0,
    "warns": 0
  },
  "profile": "askit-library",
  "mode": "local"
}
```

The link trap, reproduced: the body's `../../docs/incident-policy.md` was pasted into `references/postmortem-format.md` unchanged, and the same command was re-run.

```
$ sed -i 's|](../../../docs/incident-policy.md)|](../../docs/incident-policy.md)|' postmortem-format.md
$ node scripts/evaluate.mjs _local/audit/eval-runs/2026-07-26/incident-plugin/skills/incident-postmortem --json
  "byRule": {
    "U6": [
      {
        "check": "reference-links",
        "severity": "error",
        "message": "reference link \"../../docs/incident-policy.md\" does not resolve (resolves relative to the containing file).",
        "file": "references/postmortem-format.md",
        "reqId": "U6",
        "provenance": "objective",
        "effectiveSeverity": "error",
        "downgradedFrom": null,
        "suppressed": false,
        "suppressionReason": null,
        "clampNotice": null
      }
    ]
  },
  "summary": {
    "errors": 1,
    "warns": 0
  },
```

An error, not a warning, and `provenance: objective`: the file really is not there. Restoring the third `../` returns the component to 0 errors, 0 warnings.

The `U5` score of the authored description:

```
$ node -e "import('./scripts/checks/description-score.mjs').then(m=>console.log(m.scoreDescription('Drafts a blameless incident postmortem from an event timeline, producing the narrative, the contributing factors, and owned action items with due dates. Use when the user asks to write a postmortem, an incident review, an RCA, or a writeup after an outage.')))"
0.9999999999999999
```

Create-mode step 5 (`gen-manifest.mjs`) was not run: this artifact is an example, not a component registered in a plugin manifest.
