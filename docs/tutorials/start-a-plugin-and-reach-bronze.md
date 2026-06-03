---
title: Start a plugin and reach Bronze
description: Scaffold a plugin from scratch, add a skill, and earn the Bronze (Universal) grade with the deterministic gate.
audience: both
level: beginner
---

# Start a plugin and reach Bronze

This is a hands-on tutorial. By the end you will have a real plugin on disk, one or two working skills inside it, and a gate that prints `Tier: Universal` with zero errors. That is the Bronze grade: the smallest commitment that turns a loose pile of skills into a gradeable, portable plugin.

You do not need to memorize the Standard first. You will meet each Universal check (`U1` through `U11`) at the moment it matters, as the tooling brings it up. The path here is the one the toolkit is built around: loose components, into a plugin, into a graded skill library.

## What you are building, and why Bronze

A folder full of `SKILL.md` files is just **loose components**. The skills may work fine one at a time, but the collection is not yet a plugin: nothing names it, versions it, or lets tooling grade it. Bronze is the line that crosses over. A Bronze plugin:

- carries a `library.json` manifest, so it is a release unit with a version, not just a directory;
- contains valid, agentskills.io-compliant skills with descriptions that clear a quality bar;
- ships a root `AGENTS.md` so an agent knows how to navigate it;
- runs **unchanged** on Claude Code, Codex, and the broader agentskills.io ecosystem at once.

Bronze is the **Universal** tier: identical, portable files, no per-agent emission yet. That comes later at Silver. Start here.

A note on terminology, kept strict throughout: a *component* (a skill, command, subagent, and so on) is the unit of reuse; a *plugin* is the unit of release that carries the one version; *Bronze / Silver / Gold* is the **grade** a plugin earns, not a separate artifact you install.

## Before you start

You need:

- The toolkit installed (see [Install](https://product-on-purpose.github.io/agent-skills-toolkit/)), so the `askit-` skills are available to your agent.
- **Node 22.12 or newer** to run the gate directly. Check with `node --version`. The validators have a single runtime dependency (a YAML parser); they run anywhere Node does.

You will reach Bronze entirely by talking to your agent. The direct `node scripts/check.mjs` commands are shown so you can see the same gate the skill runs and, later, wire it into CI.

## Step 1 - Scaffold the plugin

Start a new plugin from scratch by invoking the **`askit-init-plugin`** skill. Just ask your agent something like "start a new plugin with askit-init-plugin." It onboards you in one of three modes:

- **interview** - it asks you a few questions live (theme and scope, target agents, target tier, first components), then scaffolds.
- **questionnaire** - it hands you a structured template to fill in async, then processes your answers.
- **hybrid** - it pre-fills that questionnaire with suggestions drawn from your conversation, leaving you to correct it.

Pick **interview** for your first plugin; it is the fastest when you can answer on the spot. Tell it a name and a one-line purpose. For target tier, say **Universal (Bronze)** - that is exactly what we are aiming for.

What you get is a Bronze **seed** copied from the toolkit's `templates/seed-plugin/`: a `library.json` with its five required fields, a root `AGENTS.md`, and README and CHANGELOG starters. It is gradeable from the very first commit, by design.

> If you have an **existing** skills repo instead of a blank slate, use `askit-migrate`, not `askit-init-plugin`. It assesses what you already have, writes the minimal manifest, and produces a staged plan to conformance.

## Step 2 - Look at `library.json`, the file that makes it a plugin

Open the `library.json` the scaffold wrote. The seed looks like this:

```json
{
  "name": "REPLACE-with-plugin-name",
  "version": "0.1.0",
  "description": "REPLACE - what this plugin does and when to use it, with concrete trigger keywords.",
  "standard": "0.8",
  "tier": "universal"
}
```

This single file is the difference between a reusable folder and a plugin. It is **check `U1`** - the very first thing the gate looks for. The Standard requires five fields at every tier:

- **`name`** - kebab-case, and it equals the plugin's directory name.
- **`version`** - the one plugin version, as semver (`0.1.0` is a fine starting point). This is the version the whole plugin carries.
- **`description`** - what the plugin is and when to use it. Same quality bar a skill description must meet (you will meet that bar again in Step 4).
- **`standard`** - which version of the Standard you are targeting, so tooling validates you against the right ruleset.
- **`tier`** - your declared target. For Bronze this is `"universal"`.

Replace the `REPLACE-...` placeholders with your real name and description. `name` must match your plugin folder. The `interview` mode usually fills `name` and `description` for you; confirm they are real and not still placeholders.

One subtlety worth knowing: `tier` here is what you *declare*, not what you have *proven*. The gate independently reports the highest tier you actually satisfy and will flag a claim above what you meet. Declaring `universal` keeps the gate focused on the Bronze checks while you build.

`library.json` is the **single source of truth** for the plugin's cross-agent metadata. At Silver and above, the agent-native manifests (Claude's `.claude-plugin/plugin.json`, Codex's `plugin.json`) are *generated* from it rather than hand-written. At Bronze you do not need those yet.

## Step 3 - Look at the root `AGENTS.md`

The scaffold also wrote an `AGENTS.md` at the plugin root. Open it. This is **check `U2`**, part of the required Bronze anatomy: a root `AGENTS.md` must exist at every tier.

`AGENTS.md` is the agent navigation entrypoint - the first thing an agent reads. It is the agent-facing counterpart to the human-facing `INDEX.md`. The seed version has placeholder sections for what the plugin is and a Components list. You do not have to perfect it now; you will point it at your first skill in Step 5. Both Claude Code and Codex read the same root `AGENTS.md`, which is part of what keeps a Bronze plugin portable.

## Step 4 - Add your first skill

Now add a real capability. Invoke **`askit-build-skill`** (or run the `/askit-build-skill` command) and tell it what the skill should do. Ask for **create** mode to scaffold a new skill directory.

A skill is one `SKILL.md` inside a directory named for the skill, optionally with `references/`, `scripts/`, and `assets/`. As you author it, you are walking straight into the heart of the Universal checks:

- **`U3` - frontmatter is valid.** The `SKILL.md` frontmatter must parse and carry a `name` (1-64 chars, lowercase `a-z`/`0-9`/`-`, no leading, trailing, or consecutive hyphens) and a `description` (1-1024 chars).
- **`U4` - name equals directory.** The frontmatter `name` must equal the skill's directory name. If you put `name: format-invoice` in `skills/format-invoice/SKILL.md`, you are good; a mismatch is an error.
- **`U5` - the description clears the quality bar.** This is the one signal an agent uses to decide whether your skill is relevant, so it has its own check. State **what** the skill does (an action) **and when** to use it (the trigger condition), with concrete keywords a user would actually say. Avoid vague verbs like "helps with" or "handles." The gate scores the description from 0 to 1 and emits a **warning** below 0.7 - never a hard error, because description quality is a judgment call - but a good description is the difference between a skill that fires and one that sits unused. `askit-build-skill` is built to clear this bar; let it help.

A description that passes reads like an action plus a trigger, for example: "Converts a CSV of invoices into a formatted summary table. Use when the user pastes raw invoice rows and asks for a clean total or breakdown." It says what, says when, and names words a real request would contain.

Add a second skill the same way if you like. Two small, focused skills make a more honest Bronze plugin than one sprawling one - and "each component does one thing" is the first principle of the Standard.

## Step 5 - Point `AGENTS.md` at what you built

Go back to `AGENTS.md` and replace the placeholder "what this is" line with a real sentence, and list your new skill(s) under Components. If you would rather not hand-edit it, ask the **`askit-build-agents-md`** skill to author or sync it against the components now on disk.

Keeping this honest matters for two more reasons you will hit as you grade:

- **`U6` - reference links resolve.** Any relative markdown link in a `SKILL.md` body or its `references/` files must point at a file that actually exists. A copied `../../` prefix that no longer resolves is an error. (External `http(s)` links and `#anchors` are not checked.)
- **`U7` - instruction budget.** Frontier models reliably follow on the order of 150 to 200 instructions, so context is scarce. If a `SKILL.md` body runs past about 500 lines, the gate warns you to move deep content into `references/` (progressive disclosure - load detail on demand, not up front).

## Step 6 - Run the gate and read the grade

Now prove it. You can do this two ways, and they run the **same checks**:

- Ask your agent to grade the plugin - invoke **`askit-evaluate`**, run the **`/askit-evaluate`** command, or just say "grade this plugin against the Standard." This is the friendly door.
- Run the portable script yourself from the plugin root - this is the engine, the same one that runs in CI:

```bash
node scripts/check.mjs
```

When everything passes, you will see the grade and a clean count:

```
Tier: Universal (no blockers detected)

0 error(s), 0 warning(s).
```

That line is Bronze. `Tier: Universal` means every Bronze check passed and nothing above your declared tier is blocking. The script also exits with code `0`, which is what lets it gate a commit or a CI run later.

If you want the same result as structured data for tooling, ask for JSON:

```bash
node scripts/tier-report.mjs --json
```

```json
{ "tier": "universal", "satisfies": ["universal"], "blocked": {} }
```

`satisfies` lists the tiers you have actually earned; `blocked` is empty because nothing stands between you and your declared ceiling.

## Step 7 - Read and clear any findings

If the gate is not clean yet, it tells you precisely what to fix. Each finding names its severity, the check, the requirement ID, the message, and the offending file:

```
  [error] library-json (U1): library.json is missing required field "standard" (Standard sec 5.1).  -> library.json
  [warn] description-score (U5): description scores 0.45 (< 0.7); state what it does AND when to use it, with concrete trigger keywords (Standard sec 8.1).  -> skills/format-invoice/SKILL.md
```

Two rules make this easy to triage:

- An **error** must be fixed to pass; the gate fails on any error and exits non-zero.
- A **warning** is surfaced but does not block - warnings are advice, not a gate. The `U5` description score and the `U7` budget are warnings; you can reach Bronze with them present, but clearing them makes a genuinely better plugin.

Work the list top to bottom. The remaining Universal checks you might meet here:

- **`U8`** flags a plugin with no skills yet (a warning - conformance is only meaningful once skills exist) and native-manifest drift, which you will not have at Bronze.
- **`U9`** wants any `package.json` version to agree with `library.json` - they must not disagree about the most basic fact of the plugin.
- **`U10`** enforces the house style: no em-dashes or en-dashes in authored text. Use " - " (space hyphen space) or restructure the sentence.
- **`U11`** validates MCP server entries if you ship any, and refuses committed secrets. No MCP server, nothing to check.

Re-run the gate after each fix. When it prints `Tier: Universal (no blockers detected)` with `0 error(s)`, you have a real Bronze plugin.

## You reached Bronze

You scaffolded a plugin, gave it the `library.json` manifest that makes it a release unit, added at least one valid skill with a description that earns its keep, kept the `AGENTS.md` entrypoint honest, and proved the whole thing with a deterministic gate that any CI can run. The same files install and behave the same way on Claude Code, Codex, and the wider agentskills.io ecosystem. Write once, run anywhere.

Because the tiers are **monotonic**, none of this work is throwaway. Bronze is the exact foundation Silver and Gold build on - the bar rises, and everything you just did still counts.

## Where to go next

- **Climb to Silver** - take the plugin genuinely cross-agent: declare `agent-targets` and a component `prefix`, add subagents, commands, and workflows, and emit each in the right format per agent. Start with [Climb from Bronze to Silver](../how-to/climb-from-bronze-to-silver.md).
- **Aim for Gold eventually** - the self-proving summit adds hooks, self-hosting CI, regression coverage, and a release and deprecation story. See [The tier model](https://product-on-purpose.github.io/agent-skills-toolkit/) for the full ladder and the [Gold checks reference](../reference/gold-checks.md) for what `G1` through `G10` certify.
- **Keep building components** - the `askit-build-*` family scaffolds every component type to the Standard; `askit-evaluate` (or `node scripts/check.mjs`) tells you, at any point, the highest tier you satisfy and exactly what blocks the next one.
