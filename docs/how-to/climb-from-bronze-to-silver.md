---
title: "Climb from Bronze to Silver"
description: "Silver is a to-do list, not a judgement call. The toolkit prints exactly what is standing in your way."
audience: engineer
level: intermediate
---

# How to climb from Bronze to Silver

Silver is a to-do list, not a judgement call. The toolkit prints exactly what is standing in your way, and you work down the list.

## 1. Ask what is blocking you

Run this from your plugin's folder. It needs nothing installed:

```bash
npx agent-skills-toolkit tier-report . --json
```

The part you want is `blocked.convergent`. That is the **burndown**: the list of things that must be fixed before this plugin earns Silver. Each entry names the rule it comes from and tells you what to do.

Here is a real one, from a plugin that fails three checks:

```json
{
  "blocked": {
    "convergent": [
      "S4: chain-permitted contract entry \"sf-do-thing\" -> \"this-component-does-not-exist\" points at a missing component (phantom; Standard sec 3.6).",
      "S6: library.json declares agent-target \"claude\" but its native manifest .claude-plugin/plugin.json is missing on disk (REQUIRED at Convergent+). Generate it with: npx agent-skills-toolkit gen-manifest . --write --target=all",
      "S6: library.json declares agent-target \"codex\" but its native manifest .codex-plugin/plugin.json is missing on disk (REQUIRED at Convergent+). Generate it with: npx agent-skills-toolkit gen-manifest . --write --target=all"
    ]
  }
}
```

An empty `blocked.convergent` means nothing is standing in your way.

## 2. Fix them one at a time

Most fixes are small edits to `library.json`. The three most common:

- **`S1`, no agent targets.** Add `"agent-targets": ["claude", "codex"]` - the agents this plugin is built for.
- **`S2`, no prefix.** Add `"prefix": "<short>-"`. This stops a generic name like `init` colliding with someone else's.
- **`S3`, the index does not match what is on disk.** Regenerate the manifest so `components.skills` lists exactly the skills you actually ship.

For any other `S` number, [the Silver reference page](../reference/silver-checks.md) explains what it wants and how to satisfy it.

Re-run the command after each fix. The list gets shorter.

## 3. Say you are Silver

When `blocked.convergent` is empty, edit `library.json`:

```json
"tier": "convergent"
```

This is you making a claim, and the toolkit starts holding you to it. From here, `npx agent-skills-toolkit .` will fail on Silver problems, not just Bronze ones.

If something still flags after you change that line, the climb is not finished. Keep fixing until the check passes cleanly at the new level.

## What Silver actually certifies

Silver is about working properly on more than one agent. A plugin earns it by proving four things:

- It declares which agents it targets, and ships the right manifest file for each one (`S1`, `S6`).
- Its components carry a prefix, so their names cannot collide with another plugin's (`S2`).
- Its index matches what is really on disk, in both directions (`S3`, `S8`).
- If its components call each other, that is declared rather than implied (`S4`).

## See also

- [Silver checks](../reference/silver-checks.md) - every `S` rule, what it wants, and how to satisfy it.
- [Emit for multiple agents](emit-for-multiple-agents.md) - generating the per-agent manifests `S6` asks for.
- [Glossary](../explanation/glossary.md) - if a word here was new to you.
