---
title: Overview
description: What the agent-skills-toolkit is and the value it provides.
---

`agent-skills-toolkit` is two things at once:

- **The Standard** - a normative spec (the Advanced Skill Library Standard) for what a conformant skill *plugin* looks like: its components, the conformance tiers that make it portable across agents, and the CI and release discipline that keeps it healthy at scale.
- **The toolkit that builds and grades against it** - a catalog of `askit-*` builder skills plus a deterministic validation spine that any plugin (including this one) runs to learn its tier.

## The problem it solves

A folder of skills is not a library. As a collection grows, the questions that matter are no longer "is this one skill good?" but "does the whole thing hang together?" - do the components agree with the manifest, do the chains resolve, do deprecated components carry a migration path, does it work the same on a second agent? The toolkit answers those questions mechanically and tells you the tier your plugin earns.

## The wedge

Cross-agent emission alone is crowded. The defensible position is the combination of three things:

1. **Library-scale grading.** Most tools assess a skill in isolation. This grades the plugin as a *system* and reports the tier it actually satisfies.
2. **A deterministic, CI-safe gate.** Objective conformance is checked by portable scripts with no model in the loop, so the grade can be trusted and enforced.
3. **Honest cross-agent support.** It emits for Claude Code and Codex and encodes each agent's real limits, so a plugin cannot claim portability it does not have.

## How you use it

- Point `askit-migrate` at an existing repo to get a staged Bronze-to-Silver plan.
- Run `askit-evaluate` to see your tier and exactly what blocks the next one.
- Use the `askit-build-*` skills to author each missing component, conformant by construction.
- Let the gate (`node scripts/check.mjs`) travel with the repo and enforce it in CI.

See [Getting started](/agent-skills-toolkit/getting-started/), [the Standard](/agent-skills-toolkit/the-standard/), and [the catalog](/agent-skills-toolkit/catalog/).
