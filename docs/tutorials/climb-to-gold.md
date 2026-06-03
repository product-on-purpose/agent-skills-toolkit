---
title: "Climb a plugin from Bronze to Gold"
description: "Walk a plugin up all three tiers - declare targets, emit per-agent, add self-hosting CI and lifecycle - until tier-report prints advanced with an empty burndown."
audience: engineer
level: advanced
---

# Climb a plugin from Bronze to Gold

This is the full climb. You start with a Bronze plugin (a folder of agentskills.io skills carrying a minimal `library.json`) and finish with a self-proving Gold plugin: `tier-report` prints `advanced` and the burndown is empty. The whole walk is driven by one tool - the deterministic gate, which always tells you the next thing to fix.

The tiers are monotonic. Each rung is the floor the next one builds on, so nothing you do for Bronze or Silver is thrown away. The gate (`node scripts/check.mjs`) reports the highest tier the plugin actually satisfies and, for the tier above it, the exact blocking requirements keyed to their requirement IDs. That `blocked` list is your worklist, not a grade.

> **The one habit.** After every change in this tutorial, re-run the gate and read the burndown. The climb is "shrink the blocked list to empty, then raise the declared tier." Nothing more.

## What you need

- A Bronze plugin: a directory of valid skills under `skills/`, a root `AGENTS.md`, and a `library.json` carrying at least `name`, `version`, and `tier: "universal"`. If you do not have one yet, scaffold it with `askit-init-plugin`, or bring an existing repo to Bronze with `askit-migrate`, then come back here.
- Node 22.12 or newer (Node 24 recommended) to run the portable scripts.
- The two commands you will live in:

```bash
node scripts/check.mjs              # the tier + what blocks the next one, on a real exit code
node scripts/tier-report.mjs --json # the same result as JSON, with the blocked list keyed by reqId
```

Read the JSON form once so the shape is familiar:

```json
{ "tier": "universal",
  "satisfies": ["universal"],
  "blocked": { "convergent": ["S1: library.json is missing agent-targets"] } }
```

`blocked.convergent` is the to-do list for Silver. When it is empty you raise the declared tier; then `blocked.advanced` becomes the to-do list for Gold.

---

## Part 1 - Bronze to Silver (Convergent)

Silver certifies the multi-agent machinery: the plugin declares which agents it targets, carries a collision-proof name prefix, and provides every convergent component (subagents, commands, workflows, chain contracts) in the right format for each target. The Silver checks are `S1` through `S8`. This part walks them in the order it is easiest to satisfy them.

### Step 1 - Declare agent targets and a prefix (S1, S2)

Two single-line edits to `library.json` clear the first two Silver checks.

```jsonc
{
  "name": "my-plugin",
  "version": "0.2.0",
  "standard": "0.9",
  "tier": "universal",
  "agent-targets": ["claude", "codex"],
  "prefix": "myp-"
}
```

- `S1` wants `agent-targets` - the list of agents this plugin emits for (`claude`, `codex`, or both).
- `S2` wants a short, unique `prefix` carried by every component. Claude Code namespaces plugin skills automatically, but Codex and the broader ecosystem do not, so a generic name like `init` collides without it. Rename your skill directories to carry the prefix (for example `skills/myp-init/`), and remember the skill `name` in frontmatter MUST equal its directory name (`U4`), so update both together.

Re-run the gate. `S1` and `S2` should drop off `blocked.convergent`.

### Step 2 - Add a convergent component

A Silver plugin earns its grade by actually having the multi-agent machinery, not just declaring it. Add at least one convergent component with the matching `askit-build-*` skill:

- `askit-build-subagent` creates a Claude subagent in `agents/<name>.md`, declaring its narrowest tool set and its `chain`. Note the Standard's constraint: a distributed plugin cannot ship a Codex-ingested subagent (the Codex plugin manifest has no `agents` field), so a plugin subagent targets Claude (`agent-targets: [claude]`).
- `askit-build-command` creates a Claude slash command in `commands/<name>.md` that maps to exactly one skill, giving it an explicit `/command` entry point.
- `askit-build-workflow` formalizes a recurring multi-skill sequence as a `_workflows/<name>.md` file with ordered steps and exit criteria. Every skill a workflow references MUST exist - that is check `S5`.

Each `askit-build-*` skill writes the component in the right place and adds its frontmatter (`name`, `description`, `version`, and the type-specific keys). Run `askit-build-subagent` (or whichever fits your plugin) before moving on, because the next steps - the components index and chain contracts - need a real component to point at.

### Step 3 - Keep the components index honest (S3, S8)

At Convergent tier `library.json` carries a `components` index keyed by type (`skills`, `commands`, `subagents`, `workflows`, ...). Two checks guard it in both directions:

- `S3` (components-index) fails if an entry's `path`, `version`, or `status` disagrees with the component on disk.
- `S8` (components-mirror) fails if a component exists on disk but is missing from the index, or vice versa.

You do not hand-maintain this. Regenerate the index and native manifests from the authored `library.json` plus component frontmatter:

```bash
node scripts/generators/gen-manifest.mjs . --write --target=all
```

Then add or align each component entry as `{ name, path, version, tier, status }`. Re-run the gate until `S3` and `S8` clear.

### Step 4 - Make inter-component calls explicit (S4)

Chain contracts are a conditional MUST: required if and only if a component invokes another. If your subagent is invoked by a skill, or a workflow chains skills, that edge MUST appear in `agents/_chain-permitted.yaml`. A plugin with no inter-component invocation ships no contract and is not penalized for its absence - no empty governance files.

Use `askit-build-chain-contract` to declare the permitted edges. The `S4` check flags two failure modes:

- **Orphans** - an invocation in code that no contract entry permits.
- **Phantoms** - a contract entry pointing at a component that does not exist.

The contract is a map of caller to the list of callees it MAY invoke:

```yaml
# agents/_chain-permitted.yaml
myp-build-skill:
  - myp-skill-author
```

### Step 5 - Prove per-target emission (S6, S7)

Silver's headline guarantee is that the same intent ships to every declared target in that target's format. Two checks verify it:

- `S6` (per-target-presence) wants each convergent component present in the correct format for every declared target, and a native manifest for each (`.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`).
- `S7` (command-contract) wants a command contract present for each declared target.

The native manifests are generated, never hand-edited - the same `gen-manifest` run from Step 3 produces them from `library.json`. Use `askit-build-command` and the build family to emit each component per target, then regenerate. The how-to guide on emitting for multiple agents covers the target-by-target mechanics if you get stuck.

### Step 6 - Step governance up (HISTORY, CHANGELOG, semver)

Silver raises the governance bar. Each component MUST carry a co-located `HISTORY.md`, and when a `HISTORY.md` is present the frontmatter `version` MUST equal its latest entry (a Standard MUST, sec 7.3; note this is not the `version-match` check, which is `U9` and instead compares `package.json` to `library.json`, so the gate does not enforce the HISTORY rule today). The plugin maintains a `CHANGELOG.md`, and the plugin version is one semver number computed as the largest component bump since the last release (`askit-release` computes it for you; you do not need a release yet, just the discipline).

### Declare Convergent

When `blocked.convergent` is empty, raise the floor:

```jsonc
"tier": "convergent"
```

From here `node scripts/check.mjs` gates on Convergent errors too - the declared-tier ceiling has risen, so a regression now fails the gate instead of merely showing up as a Gold burndown item. Run the gate once more; it should exit 0 at Silver. You now have a genuinely cross-agent plugin with verified format parity and collision-proof names.

---

## Part 2 - Silver to Gold (Advanced)

Gold certifies that the plugin proves itself: deep lifecycle plus CI that runs the Standard against the plugin and passes. The Gold checks are `G1` through `G7` (the seventh, `docs-frontmatter`, landed in Standard v0.10); tier inclusion of all Bronze and Silver is a structural property, not a numbered check. That is the full 26-check spine: `U1-U11`, `S1-S8`, `G1-G7`.

Read the new worklist first:

```bash
node scripts/tier-report.mjs --json   # now read blocked.advanced
```

### Step 7 - Self-hosting CI (G2)

This is the keystone. "Self-hosting" means the plugin passes its own validators in CI. Add a workflow under `.github/workflows/` that runs the gate, directly or through an npm script that resolves to it:

```yaml
# .github/workflows/ci.yml
name: conformance
on: [push, pull_request]
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version-file: .nvmrc
      - run: npm ci
      - run: node scripts/check.mjs
```

The `G2` check (self-hosting) looks for a workflow that actually invokes `node scripts/check.mjs` (it strips YAML comments first, so a mere mention does not count). The CI configuration MUST contain no validation logic of its own - it only shells out to the portable scripts, which is what guarantees local and CI results are identical. Whether the GitHub run is green is a runtime concern; the check verifies the plugin is wired to validate itself.

### Step 8 - A regression case per chain edge and per hook (G3)

`G3` is the regression spine. Each chain edge in `agents/_chain-permitted.yaml` and each hook event in `hooks/hooks.json` MUST carry at least one eval case under `evals/`, and CI runs them. The point is structural: changing one component cannot silently break a chained consumer or a hook, because the dangling eval surfaces it.

Each eval set is an `evals/<name>.eval.json` file that declares what it covers. Use `askit-build-samples` to author them. The `covers` object names the edge, the hook, or the skill:

```jsonc
// evals/build-skill-author.eval.json
{
  "covers": { "chain": ["myp-build-skill", "myp-skill-author"] },
  "description": "build-skill delegates authoring to the skill-author subagent",
  "cases": [ /* ... */ ]
}
```

`G3` also catches staleness in the other direction: an eval that covers an edge the contract no longer permits, or a hook that is no longer registered, is a stale case - the exact signal that a component changed and a consumer's eval now dangles. Add a `covers.chain` eval for every edge in your contract; if you added hooks (next step), add a `covers.hook` eval for each event too. Use `askit-build-samples` to scaffold and validate, and see the how-to on adding eval coverage for the case format.

### Step 9 - A documented hook (G1)

`G1` requires that every hook present documents its event, trigger, matcher (when applicable), scope, and failure behavior. Author one with `askit-build-hook`: it asks for the event (for example `PreToolUse`), the matcher, the hook type (`command` / `http` / `mcp_tool` / `prompt` / `agent`), the scope, and the failure behavior, then scaffolds the hook plus its `hooks/hooks.json` registration. A blocking hook (a `PreToolUse` deny) MUST emit an actionable message and MUST be idempotent if its event can repeat (Standard sec 3.5, 9).

`G1` is satisfied vacuously by a plugin that ships no hooks, but a documented hook is the stronger proof. The toolkit itself ships a `PreToolUse` no-dashes hook (`hooks/hooks.json`) and so satisfies `G1` by documenting that hook (with its `G3` eval), not vacuously. Any hook you add must come with its `G3` eval from Step 8.

### Step 10 - Generated INDEX and manifests, drift-checked (G4)

`G4` keeps the human view and the agent view from drifting apart. `INDEX.md`, the native plugin manifests, and `manifest.generated.json` are generated from the authored `library.json` plus component frontmatter, and drift-checked - a hand-edited generated file is an `error`. Regenerate them rather than editing by hand:

```bash
node scripts/generators/gen-index.mjs . --write
node scripts/generators/gen-manifest.mjs . --write --target=all
```

The `index-drift` check (`G4`) compares `INDEX.md` against what `gen-index` would produce; `U8` already drift-checks the native manifests. After any component change, regenerate both and commit the result.

### Step 11 - Curated RELEASE-NOTES (G5)

`G5` requires a `RELEASE-NOTES.md` distinct from `CHANGELOG.md`. The changelog is the full technical history (Keep a Changelog style); the release notes are curated, user-facing highlights. They MUST NOT be conflated. `askit-release` (notes mode) writes the user-facing entry when you cut a release; for now, stand the file up so `G5` clears.

### Step 12 - A deprecation policy (G6)

`G6` requires the plugin to define and follow a deprecation policy that tooling recognizes: a component MAY be marked `status: deprecated` with `deprecated-by` (its replacement) and `remove-in` (the target plugin version for removal), and it MUST keep validating and functioning until removed. Removal is a plugin MAJOR announced in the `CHANGELOG`. Record a deprecation with `askit-deprecate`, which sets the frontmatter and mirrors it into the `library.json` component entry. Like `G1`, `G6` is satisfied when no component is deprecated - the policy and frontmatter handling are what is required, not having something deprecated right now.

### Declare Advanced and self-prove

When `blocked.advanced` is empty, raise the floor one last time:

```jsonc
"tier": "advanced"
```

Run the gate:

```bash
node scripts/check.mjs
```

```
Tier: Advanced (no blockers detected)

0 error(s), 0 warning(s).
```

And confirm the machine form agrees:

```bash
node scripts/tier-report.mjs --json
```

```json
{ "tier": "advanced", "satisfies": ["universal", "convergent", "advanced"], "blocked": {} }
```

That empty `blocked` object is the proof. The plugin satisfies every tier it claims, its CI runs the same gate against itself, and a regression in any chain, hook, manifest, or generated doc will now fail that gate. The plugin is self-proving - it is, by construction, an advanced skill library.

---

## You ended self-proving

You walked a plugin up all three rungs:

- **Bronze** made it portable - identical files that run unchanged on any agentskills.io agent.
- **Silver** made it genuinely cross-agent - declared targets, a collision-proof prefix, per-target emission, and explicit chain contracts.
- **Gold** made it self-proving - self-hosting CI, a regression case per chain edge and hook, drift-checked generated docs, curated release notes, and a deprecation policy.

The lever was always the same: run the gate, read the burndown, fix the next `reqId`, repeat, then raise the declared tier. The judgment-based evaluation in `askit-evaluate` (behavioral and qualitative modes) sits beside this gate as opt-in evidence; it never decided a pass or fail. The deterministic gate did, and now your plugin passes it.

## See also

- [Climb from Bronze to Silver](../how-to/climb-from-bronze-to-silver.md) - the focused Silver how-to.
- [Emit for multiple agents](../how-to/emit-for-multiple-agents.md) - per-target emission mechanics.
- [Build a hook](../how-to/build-a-hook.md), [Add eval coverage](../how-to/add-eval-coverage.md), [Cut a release](../how-to/cut-a-release.md), [Deprecate a component](../how-to/deprecate-a-component.md).
- [`STANDARD.md`](../../STANDARD.md) - the normative Standard, with the frozen Gold criteria (`G1-G7`) in section 2.6.
