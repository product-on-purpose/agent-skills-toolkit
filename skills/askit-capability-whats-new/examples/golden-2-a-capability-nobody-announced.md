# Golden 2: a real capability finding that no release note announced

Taken from the live verification pass of 2026-08-18. **It is the strongest argument for step 4 of the procedure**, and the reason this skill is not named after release feeds.

## What the release feeds said

Nothing. No Codex release entry announced anything about which component types a plugin may contain.

## What the documentation page said

Fetching the Codex plugins page - **via a 308 redirect from `developers.openai.com/codex/plugins.md` to `learn.chatgpt.com/docs/plugins.md`** - produced this, verbatim:

> "A plugin can contain one or more of these parts: Skills, Connectors, MCP servers, Browser extensions, Hooks, [and] Scheduled task templates."

## Why that one sentence is worth a survey

It carries three separate findings, and a release-note-only sweep would have caught none of them.

**It corroborates something this repository knew only by experiment.** The list contains **no subagents**. That matches what round-trip testing established and what `capability-matrix.md` records as "Codex subagents are `config.toml` only; the plugin manifest has no `agents` field" - but until now that rested on a probe. It is now a **quotable sentence**, so it can become a `quote` claim in `vendor-claims.json` and stop costing a recurring re-verification.

**It names three component types this Standard may not model at all**: Connectors, Browser extensions, Scheduled task templates. Whether any of them should be modelled is not this skill's call - it routes to `askit-capability-gap-analysis` - but nothing would have raised the question otherwise.

**The host had moved**, and nothing in the repository would have noticed.

## What the surveyor records

```markdown
### Capability findings

- **[codex, no release entry] The documented plugin component list has no subagents, and names three
  types we may not model.** Verbatim: "A plugin can contain one or more of these parts: Skills,
  Connectors, MCP servers, Browser extensions, Hooks, [and] Scheduled task templates."
  Source: learn.chatgpt.com/docs/plugins.md, read 2026-08-18.
  Touches: capability-matrix Codex column (subagent row corroborated); three unmodelled types.
  -> gap analysis.

### Claim-bearing findings

- **The subagent absence is now QUOTABLE.** Candidate `quote` claim to replace probe-derived knowledge.
  -> vendor-claims.json.

### Environmental findings

- **Codex documentation host moved**: developers.openai.com/codex/plugins.md 308s to
  learn.chatgpt.com/docs/plugins.md. references/surfaces.md updated in this change.
```

## The lesson, stated once

**Release notes announce; documentation specifies; and some things are only ever specified.** A skill that read only the feeds would have reported "nothing new from Codex" on the same day this sentence was sitting on a public page contradicting nothing and clarifying three things.

That is also why the surveyor does **not** decide here. Whether a Connector belongs in the Standard is a real question with a real answer, and this record's job is to make sure somebody gets asked it.
