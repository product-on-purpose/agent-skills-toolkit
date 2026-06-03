---
title: The tiers
description: Bronze, Silver, and Gold - what each tier requires and how the gate reports them.
---

A plugin earns the highest tier it actually satisfies. The gate reports that tier plus a `blocked` burndown: the exact requirement ids standing between it and the next tier. The burndown is the to-do list, not just a grade.

## Bronze (Universal)

The plugin parses and self-describes. A `library.json` with the required fields, a root `AGENTS.md`, valid skill frontmatter, names that match directories, resolvable reference links, an instruction budget, and house style (no em-dashes or en-dashes). Checks `U1` through `U11`.

## Silver (Convergent)

Cross-agent shape. Declared `agent-targets`, a component `prefix` carried by every component, a `components` index that mirrors disk in both directions, a chain contract when chaining is used, workflow steps that reference real skills, and a native manifest for each declared target. Checks `S1` through `S8`.

## Gold (Advanced)

The self-proving bar. Hooks documented, self-hosting CI that passes, eval and regression coverage for chains and hooks, generated INDEX and manifests that are drift-checked, RELEASE-NOTES, and a deprecation policy. Checks `G1` through `G10`.

## The milestone-validity model

A plugin declares a tier; the gate enforces errors only up to that declared ceiling. A Gold-tier check on a plugin that declares Silver does not fail CI - it appears in the burndown as a Gold to-do. That is how a library climbs tiers without ever shipping a red gate: it satisfies its declared tier today, and the burndown shows the road up.
