---
title: "Adopting Standard 0.13"
description: "What changes when you raise library.json standard to 0.13, what it costs, and why an unpinned plugin gets no migration window at all."
audience: engineer
level: intermediate
tags: [standard, migration, pinning, gate, published-verdict]
---

# Adopting Standard 0.13

Standard 0.13 is the first release where **a tightening happens when you adopt it, not when the toolkit ships it.** Nothing in this page takes effect for your plugin until you raise `standard` in your own `library.json`.

If you do nothing, you keep the contract you pinned. That is the whole point of pinning, and 0.13 is the release that makes it true for tightenings as well as for new checks.

## The one thing to check first: are you pinned at all?

**An unpinned plugin gets no migration window.** If your `library.json` has no `standard` field, or its value is not a `MAJOR.MINOR` string, every requirement applies to you at full strength immediately - including the ones introduced in this release.

This is not an oversight and it is not new in 0.13. A plugin that never declared which contract it adopted cannot be graded against the one it adopted, so the tooling grades it against the current one. The fix is one line:

```json
{ "standard": "0.12" }
```

Pin the version you actually target. You can adopt 0.13 later, deliberately, having read the rest of this page.

## What adopting 0.13 costs you

Four things become effective the moment you pin `0.13`. Each is a `warn` until then.

### 1. `U13` - every skill on disk must be registered

A skill directory that your manifest does not list ships but is invisible to installers; a registered skill with no directory cannot be delivered. This was introduced at 0.12 as a warning, on a published schedule, and 0.13 is the version it was scheduled to gate at.

**Cost:** register every `skills/<name>/` in `library.json` `components.skills[]` (or in your `.claude-plugin/marketplace.json` catalog), and remove entries that point at nothing.

### 2. `S4` - a string-shaped chain declaration is held to the same bar as an array

If a component declares `metadata.chain` as a **string**, the resulting chain-contract findings were capped at `warn` while the string shape was newly readable. At 0.13 the cap lifts and they are errors like any other chain-contract failure.

**Cost:** make sure `agents/_chain-permitted.yaml` exists and permits every edge your components declare, whichever shape they declare it in.

### 3. `U14` - plugin-shipped agents may not declare `hooks`, `mcpServers` or `permissionMode`

Claude Code refuses these three fields on an agent shipped inside a plugin, **for security reasons**, in the vendor's own words. The field is refused rather than ignored, and nothing tells the author - so an agent carrying one has configured something that is simply not in effect.

**Cost:** remove the field from the agent's frontmatter under `agents/`. If you genuinely need the behaviour, move it to a surface the runtime supports for plugins - a hook file, an MCP server declaration, or the consuming project's own settings - rather than the agent.

### 4. `library.json` gains an optional `selfValidation` field, and an unrecognised value is a finding

`selfValidation` is a closed enum of `"vendored"` or `"npx"`, and **absent means `"npx"`**. It selects which self-validation command a generated `INDEX.md` names. Before 0.13 an unknown `library.json` field was simply ignored, so an arbitrary value was harmless; from 0.13 an unrecognised value is a finding.

**Cost:** none, unless you already wrote a `selfValidation` value that is neither of the two. Most plugins should omit the field entirely.

## What does NOT change when you adopt 0.13

- **Your own local gate stays your own.** `askit.config.json` still scopes how the gate grades your repository. Per-rule severities, profiles and suppressions all work exactly as before in local mode.
- **A relaxation never needs a migration.** Removing a requirement cannot make a passing plugin fail, so relaxations ship without a window.

## Two things that change WITHOUT a pin change, and are outside the promise

Stated plainly, because a guarantee whose exceptions are buried is not a guarantee:

1. **`--strict` grades you against the newest spine by definition**, so it ignores your pin - and from 0.13 it also ignores the ceilings that would otherwise hold a tightening back. If you run `--strict` in your own CI at pin 0.12, `U13` and `S4` will fail there. That is the flag doing what it has always said it does; if you want your pin honoured, do not pass `--strict`.

2. **A published verdict can now fail where it passed.** In `published-verdict` mode, a setting the graded subject wrote about itself can no longer weaken an objective or vendor-cited finding. Through 0.12 such a setting was merely clamped up to a `warn`, which meant turning the mode on could never fail a passing gate. From 0.13 it is discarded, and a subject-owned suppression is cleared rather than merely surfaced.

   You can still be **stricter** about yourself, and any setting the **grader** supplied is honoured in full. What changed is that a subject cannot grade itself leniently in the one mode built to publish a verdict about it.

## How to tell what it will cost you before you commit

Grade yourself against the new spine without changing your pin:

```
npx agent-skills-toolkit . --strict
```

Every finding that appears only under `--strict` is a finding that adopting 0.13 would make real. Fix those, then raise the pin.

If you would rather see the debt without the strictness, the ordinary run already reports it: any finding held back by your pin is listed as **Standard debt**, with the version at which it comes due.

## Related

- [`the-standard`](../../STANDARD.md) - the normative Standard, sec 7.7 for the versioning policy itself.
- [`gate-config`](gate-config.md) - what `askit.config.json` can and cannot do, including published-verdict mode.
