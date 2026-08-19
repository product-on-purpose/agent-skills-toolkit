# Golden 1: a real finding that correctly stops at question three

The majority case. **Most findings are documentation, and a rubric that keeps promoting them is one nobody trusts by the third sweep.**

## The finding, from the survey record

> **[codex, no release entry] The documented plugin component list has no subagents, and names three
> types we may not model.** Verbatim: "A plugin can contain one or more of these parts: Skills,
> Connectors, MCP servers, Browser extensions, Hooks, [and] Scheduled task templates."

## Step 2: update the matrix first, because describing is not deciding

The matrix already records "Codex subagents are `config.toml` only; the plugin manifest has no `agents` field", derived from round-trip testing. The finding **corroborates it from the vendor's own words**, so the matrix gains a citation and a confirmed-against version. No ADR, no debate - the matrix describes the world.

## Step 3: the three questions, on the subagent half

1. **Real and stable?** Yes, it is published documentation.
2. **Plugin-distributable?** The question is inverted here - the finding is that subagents are *not*.
3. **Does anything break or become possible?** **No.** The matrix already said this, `askit-capability-advisor` already advises it, and no author behaviour changes.

**Stop.** Outcome: a matrix citation, and a candidate `quote` claim for `vendor-claims.json` - because knowledge that was probe-derived is now quotable, and a quote costs nothing recurring while a probe's age is its whole verification.

## Step 3 again, on the three unmodelled types

Connectors, Browser extensions, Scheduled task templates.

1. **Real and stable?** Documented, so yes.
2. **Plugin-distributable?** Yes - the sentence says a plugin may contain them.
3. **Does anything break or become possible?** **Something becomes possible**, so this one survives.

## Steps 4 and 5: assess our components, and count before recommending

26 skills, 7 subagents, 2 commands. **None declares or uses any of the three types**, and the Standard models none of them. So nothing is broken; the question is whether the Standard *should* model them.

The population that would benefit is **unmeasured** - we do not know how many real plugins ship Connectors - and the rubric requires saying so rather than omitting it.

## Step 6: route, and file the honest "not yet"

```markdown
### E46 - three Codex plugin component types this Standard does not model  [design, ADR-gated]

Codex documents that a plugin may contain Connectors, Browser extensions and Scheduled task
templates. This Standard models none. Nothing is broken: 0 of our 26 skills, 7 subagents and 2
commands use any of them.

NOT YET, and the trigger is stated: the population of real plugins shipping any of the three is
UNMEASURED. Re-measure across the pinned corpora; if any type appears, this becomes an ADR about
whether the component-type taxonomy is closed or open.

Precedent both ways: U17 shipped for a population of zero because it closed a SILENT routing hole,
while E44 is filed unbuilt at a measured population of 0 of 2435. The distinction is whether the
defect produces no signal, and an unmodelled component type produces no signal at all - which is an
argument for measuring rather than for waiting.
```

## Why stopping is the result

Two findings entered; one produced a matrix citation and a candidate claim, one produced a backlog entry with a trigger. **Neither produced a check, and neither should have.** The Standard grew by nothing, and the distance between what Codex does and what we model is now written down instead of unknown.
