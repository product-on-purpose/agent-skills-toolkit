# Golden 1: a survey that finds nothing material

The most common result, and the one this skill exists to make cheap and honest. **It still writes a record.**

## The situation

Claude Code shipped eleven releases since the pin. Ten are bug fixes and one adds a spellcheck setting. Nothing touches a component type, a manifest field, a discovery rule, or a sentence `vendor-claims.json` pins.

## What the surveyor does

Reads all eleven. Confirms the spellcheck setting is an editor preference and models nothing this repository grades. Classifies ten as `not relevant`, one as `not relevant`. Finds no capability entry to confirm against documentation.

Then, having found nothing, **writes the section anyway:**

```markdown
## Survey 2026-09-01 (claude-code 2.1.235 to 2.1.246)

Surveyed by: <name>. Entries examined: 11. Not relevant: 11.

**No capability, claim-bearing or environmental findings.**

The one feature entry (2.1.240, an optional spellcheck setting) is an editor preference and models
nothing this Standard grades. Checked the plugin and skills documentation pages for silent additions;
none.

### Nothing found for

- cowork: no entries since v1.32885.1.
- codex: no entries since <version>.
- agentskills.io spec: `npm run standards-watch` reports unchanged.
```

Then proposes the pin move to `2.1.246` and stops.

## Why the empty section is the point

**A survey that only writes when it finds something is indistinguishable, later, from a survey that never ran.** Six months on, the absence of a September section answers no question: did nobody look, or did somebody look and find nothing? The second is a fact worth having, and it costs four lines.

It also makes the counts load-bearing. "Entries examined: 11, not relevant: 11" is a claim that can be checked against the vendor's changelog by anyone. A section listing only findings cannot be distinguished from a sweep that stopped at entry three.

## What would be wrong here

Skipping the record because "nothing happened." Advancing the pin without writing anything - the pin would then assert that everything through `2.1.246` had been read, with no evidence that anyone read it.
