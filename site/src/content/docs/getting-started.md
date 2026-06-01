---
title: Getting started
description: Grade an existing plugin, or scaffold a new one, with the toolkit.
---

The toolkit is a Claude Code and Codex plugin. Its validation spine is plain Node (the only runtime dependency is a YAML parser), so the gate runs anywhere Node 20+ does.

## Grade what you have

From a plugin repo, run the conformance gate:

```bash
node scripts/check.mjs
```

It prints the tier your plugin earns and the burndown to the next one. For a richer report (per-rule findings, remediation), use the `askit-evaluate` skill, which runs the same deterministic core and presents it.

## Adopt an existing repo

Point `askit-migrate` at a foreign or ad-hoc skills repo. Its `assess` mode inventories the components and reports the gap by tier; `plan` produces a staged Bronze-to-Silver roadmap naming the skill or check that closes each step; `adopt` writes the minimal `library.json` + `AGENTS.md` so the conformance core can grade it.

## Start a new plugin

Run `askit-init-plugin` to onboard and scaffold a Bronze-anatomy starting point (interview, questionnaire, or hybrid mode), then add components with the `askit-build-*` skills and climb tiers as you go.

## Where the full docs live

This site is the overview. The complete reference and how-to documentation lives with the source in the [repository's `docs/` tree](https://github.com/product-on-purpose/agent-skills-toolkit/tree/main/docs), and the normative spec is [`STANDARD.md`](https://github.com/product-on-purpose/agent-skills-toolkit/blob/main/STANDARD.md).
