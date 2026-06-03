---
title: "Troubleshoot the gate"
description: "Map a failing reqId from check.mjs to its cause and the exact fix - a generator command or an askit-build-* skill."
audience: engineer
level: intermediate
---

# How to troubleshoot the gate

The deterministic gate (`node scripts/check.mjs`) reports the highest tier a plugin satisfies and lists what blocks the next one. Every finding carries a `reqId` (for example `U5`, `S3`, `G2`) and an inline `Standard sec` pointer. This page maps the findings you hit most often to their cause and the exact remediation, so you can read a failing reqId off the gate and go straight to the fix.

The gate is judgment-free: it never decides quality, only conformance to the Standard. Description scoring and behavioral evaluation sit beside it (`askit-evaluate` / `/askit-evaluate`) and never gate pass/fail.

## First, read the findings

```
node scripts/check.mjs
```

Each line is `[severity] check (reqId): message -> file`. Two things matter:

- **Severity.** An `error` can fail the gate; a `warn` never does (warnings are surfaced, not blocking - Standard sec 4.5). `U5`, `U7`, and `U8` are warnings; most others are errors.
- **The declared-tier ceiling.** The gate only fails on errors at or below the tier you declared in `library.json` (`tier`). A `convergent` error on a plugin that declares `universal` does not fail the gate - it shows up in the burndown to the next tier instead. See it as a to-do list:

```
node scripts/tier-report.mjs --json
```

`blocked.convergent` and `blocked.advanced` each list the unmet `reqId: <message>` entries standing between this plugin and the next grade. The fix tables below are keyed to those same reqIds.

Re-run the gate after each fix; the error count and the `blocked` lists shrink.

## Universal (Bronze) findings

These gate any plugin that declares `universal` or higher.

### U1 - library.json missing or not valid

- **Symptom:** `library.json is missing...` or `...is not valid JSON` or `...missing required field "<key>"`.
- **Cause:** the manifest that makes a directory a plugin is absent, malformed, or missing one of the five required fields: `name`, `version`, `description`, `standard`, `tier` (Standard sec 5.1). A bare folder of skills with no `library.json` is loose components, not a Bronze plugin.
- **Fix:** scaffold one with `askit-init-plugin`, or add the missing field by hand. `version` must be semver; `tier` must be `universal`, `convergent`, or `advanced`; `standard` is the Standard version you target (currently `"0.9"`).

### U2 - AGENTS.md missing

- **Symptom:** `AGENTS.md is required at the repository root at every tier`.
- **Cause:** no root `AGENTS.md`, the agent navigation entrypoint required at every tier (Standard sec 3.10).
- **Fix:** generate one with `askit-build-agents-md`. Keep its component counts in sync with the manifest - drift there is its own error class.

### U3 - frontmatter invalid

- **Symptom:** `frontmatter does not parse...`, `missing required string "name"`, or a `name`/`description` length violation.
- **Cause:** a `SKILL.md` has malformed YAML, or `name`/`description` is missing or out of bounds (`name` 1-64 chars kebab-case; `description` 1-1024 chars - Standard sec 3.1).
- **Fix:** correct the YAML. If you are authoring the skill, `askit-build-skill` writes conformant frontmatter for you.

### U4 - name does not match directory

- **Symptom:** `frontmatter name "<x>" must equal the directory name "<y>"`.
- **Cause:** the skill's frontmatter `name` differs from its parent directory name (Standard sec 3.1).
- **Fix:** rename one to match the other. The directory name is usually the one to keep, since it carries the plugin `prefix`.

### U5 - weak description (warn)

- **Symptom:** `description scores 0.NN (< 0.7)...`.
- **Cause:** the description does not clearly state **what** the component does and **when** to use it, or it leans on anti-pattern verbs ("helps with", "handles"), or it uses first person, angle brackets, or ALL-CAPS (Standard sec 8.1). This is a heuristic 0-1 score; below `0.7` it warns, never errors - description quality is judgment, so it must not hard-gate.
- **Fix:** rewrite to lead with an action verb (creates, validates, generates...), add an explicit trigger ("use when..."), and include concrete keywords a user would actually say. `askit-build-skill` includes a description pass. To see the score and rationale beside the gate, run `askit-evaluate`.

### U6 - reference link does not resolve

- **Symptom:** `reference link "<text>(<path>)" does not resolve`.
- **Cause:** a relative markdown link in a `SKILL.md` body or a `references/*.md` file points at a path that does not exist. A `references/` file sits one directory deeper than `SKILL.md`, which is exactly where a copied `../../` prefix silently breaks (Standard sec 3.1).
- **Fix:** correct the path (links resolve relative to the file they live in), or create the missing target. External `https:`/`mailto:`/anchor links are not checked.

### U7 - instruction budget (warn)

- **Symptom:** `SKILL.md body is N lines (> ...); move deep content into references/`.
- **Cause:** the `SKILL.md` body is long enough to spend context that progressive disclosure should defer (Standard sec 1, 3.1).
- **Fix:** move deep procedural detail into `references/` (one level deep) and link to it. The body should carry the instructions; the references carry the depth.

### U8 - native-manifest drift (warn)

- **Symptom:** `.claude-plugin/plugin.json <field> "<x>" differs from library.json "<y>"...`.
- **Cause:** a generated native manifest (`.claude-plugin/plugin.json` or `.codex-plugin/plugin.json`) has a `name` or `version` that no longer matches `library.json`, which is the single source of truth those files are generated from (Standard sec 5, G4). This usually means someone hand-edited a generated file, or bumped `library.json` without regenerating.
- **Fix:** regenerate, never hand-edit:

```
node scripts/generators/gen-manifest.mjs . --write --target=all
```

### U9 - package.json version drift

- **Symptom:** `package.json version (<x>) must equal library.json version (<y>)`.
- **Cause:** a `package.json` with a `version` field disagrees with `library.json`, which is the version source of truth (Standard sec 5). This is conditional: no `package.json`, or no `version` field, means it does not apply.
- **Fix:** set `package.json` `version` to match `library.json`. When you cut a release, bump in `library.json` first (or use `askit-release`, which keeps them aligned) and regenerate the native manifests (U8).

### U10 - em-dash / en-dash present

- **Symptom:** a `no-dashes` finding naming a file containing U+2014 or U+2013.
- **Cause:** an em-dash or en-dash slipped into a tracked file.
- **Fix:** replace with " - " (space hyphen space) or restructure the sentence; use plain hyphens for numeric ranges.

### U11 - .mcp.json invalid

- **Symptom:** an `mcp-valid` finding against `.mcp.json`.
- **Cause:** the portable MCP server definitions file is malformed or a server entry is not well-formed (Standard sec 3.9). Conditional: only fires when `.mcp.json` is present.
- **Fix:** correct the `{ "mcpServers": { ... } }` shape, or regenerate the server entry with `askit-build-mcp`. Never commit secrets - use `env` indirection (Standard sec 9).

## Silver (Convergent) findings

These appear in `blocked.convergent` until you declare `convergent`, then they gate.

### S1 - missing agent-targets

- **Symptom:** `library.json is missing "agent-targets"` or `...must be a non-empty array`.
- **Cause:** a Convergent plugin must declare which agents it emits for (Standard sec 5.1, 2.2).
- **Fix:** add `"agent-targets": ["claude", "codex"]` (or just one). If you are unsure which to claim, see [choose-agent-targets](choose-agent-targets.md).

### S2 - missing prefix

- **Symptom:** `library.json is missing "prefix"` or `...must be lowercase kebab-case ending in "-"`.
- **Cause:** generic component names collide across plugins on agents that do not namespace; the Standard requires a short unique prefix declared once in the manifest (Standard sec 8.2).
- **Fix:** add `"prefix": "<short>-"` (this repo uses `"askit-"`). The same check also flags individual components whose names do not carry the prefix - rename them to match.

### S3 - components index drift

- **Symptom:** `library.json components.skills declares "<x>" but it is not on disk` (phantom entry), or `skills/<x> exists on disk but is not declared` (undeclared component). The same applies to `subagents`, `commands`, and `mcpServers`.
- **Cause:** the manifest's `components` index no longer mirrors what is on disk (Standard sec 5.1, 10.3). An undeclared component and a dangling declaration both fail.
- **Fix:** add or remove the entry so the index matches disk, each entry carrying `{ name, path, version, tier, status }`. Regenerating the manifest keeps the index honest:

```
node scripts/generators/gen-manifest.mjs . --write --target=all
```

### S8 - components entry does not mirror frontmatter

- **Symptom:** `library.json components.<type> entry "<x>" declares status/tier "<a>" but the component's frontmatter declares metadata.status/tier "<b>"...`.
- **Cause:** S3 checks that entries exist; S8 checks that an existing entry's `status` and `tier` match the component's own frontmatter (Standard sec 5.1). A component marked `deprecated` in its frontmatter while the manifest entry still says `active` is the exact drift that would let a deprecation slip past the G6 contract.
- **Fix:** align the `library.json` entry's `status`/`tier` with the component frontmatter (or regenerate the manifest). If you are deprecating, drive it through `askit-deprecate` so both sides move together.

### S4 - chain contract orphan or phantom

- **Symptom:** `"<caller>" declares (frontmatter chain) that it may invoke "<callee>" but ... does not permit` it (orphan), or `chain-permitted contract ... points at a missing component` (phantom), or `chaining is used ... but agents/_chain-permitted.yaml is missing`.
- **Cause:** chain contracts are a conditional MUST - required exactly when one component invokes another (Standard sec 3.6). An **orphan** is an invocation declared in a component's frontmatter `chain:` that the contract does not permit. A **phantom** is a contract entry naming a caller or callee that matches no on-disk component.
- **Fix:** use `askit-build-chain-contract` to author or repair `agents/_chain-permitted.yaml`. For an orphan, add the `<caller>: [<callee>]` edge. For a phantom, remove the stale entry or create the missing component. A plugin that does no inter-component invocation ships no contract at all - no empty governance files. See [build-a-chain-contract](build-a-chain-contract.md).

### S5 - workflow references a missing skill

- **Symptom:** `workflow "<x>" references skill "<y>" which does not exist on disk`.
- **Cause:** a `_workflows/` step names a skill that is not present (Standard sec 3.4). Conditional: only fires when workflows exist.
- **Fix:** correct the step's skill name, or create the skill. `askit-build-workflow` validates step references as it writes.

### S6 - native manifest missing for a declared target

- **Symptom:** a `per-target-presence` finding that a declared `agent-targets` entry has no native manifest on disk.
- **Cause:** you declared `claude` and/or `codex` but the matching `.claude-plugin/plugin.json` / `.codex-plugin/plugin.json` is absent (Standard sec 5.1, 10.1).
- **Fix:** generate the missing manifest:

```
node scripts/generators/gen-manifest.mjs . --write --target=all
```

### S7 - command contract incomplete

- **Symptom:** `commands/<x>.md is missing a non-empty "description"`, or `...must declare "maps-to"`, or `maps-to "<y>" but no skill or workflow by that name exists`.
- **Cause:** a command must carry a description meeting the 8.1 bar and a `maps-to` resolving to exactly one on-disk skill or workflow (Standard sec 3.2). Conditional: only fires when commands exist.
- **Fix:** add the `description` and a `maps-to` naming the backing skill or workflow. `askit-build-command` writes both and checks the target resolves. See [build-a-command](build-a-command.md).

## Gold (Advanced) findings

These appear in `blocked.advanced` until you declare `advanced`, then they gate. The full per-rule table is in [gold-checks](../reference/gold-checks.md).

### G2 - no self-hosting CI

- **Symptom:** `no CI workflow under .github/workflows/`, or `a CI workflow is present but none runs the conformance gate`.
- **Cause:** Gold requires the plugin to ship CI that runs its own validators and passes (Standard sec 2.6 G2, sec 4). "Self-hosting" means the plugin proves itself with the same gate it ships.
- **Fix:** add a workflow under `.github/workflows/` that runs `node scripts/check.mjs` (directly or via an npm script that resolves to it), and `npm test`. The CI config must only shell out to the portable scripts - it must contain no validation logic of its own (Standard sec 4.4), so any contributor reproduces a CI failure locally with the same command.

### G3 - a chain or hook has no eval

- **Symptom:** `chain "<caller> -> <callee>" has no eval/regression case under evals/`, or `hook event "<x>" has no eval/regression case`, or `covers chain "<...>" but agents/_chain-permitted.yaml does not permit that edge` (a stale eval - the regression signal).
- **Cause:** at Gold every permitted chain edge and every registered hook must carry at least one eval/regression case, executed in CI; and an eval covering an edge the contract no longer permits is the deterministic signal that a component or contract changed underneath it (Standard sec 2.6 G3, sec 8.3).
- **Fix:** add `evals/<name>.eval.json` declaring `"covers": { "chain": ["<caller>", "<callee>"] }` (or `{ "hook": "<event>" }`) for each uncovered edge; remove or update a stale eval whose covered edge is gone. `templates/eval-set.json` scaffolds the shape. See [add-eval-coverage](add-eval-coverage.md). G3 is presence-and-execution only; the multi-tier judging engine sits beside the gate, not inside it.

### Other Gold findings, in brief

- **G1 - hook documentation:** a hook in `hooks/hooks.json` is missing a `type` per action or a `matcher` on a `PreToolUse`/`PostToolUse` event (Standard sec 2.6 G1, sec 3.5). Fix with `askit-build-hook`, which writes documented hook entries. See [build-a-hook](build-a-hook.md).
- **G4 - INDEX drift:** `INDEX.md` no longer matches what `gen-index` produces (a hand-edited generated file). Regenerate: `node scripts/generators/gen-index.mjs . --write` - edit the source frontmatter or `library.json`, never `INDEX.md`.
- **G5 - RELEASE-NOTES missing:** add a curated, user-facing `RELEASE-NOTES.md`, distinct from `CHANGELOG.md` (Standard sec 10.6). `askit-release` curates it. See [cut-a-release](cut-a-release.md).
- **G6 - deprecation policy:** a component with `status: deprecated` must also declare `deprecated-by` and `remove-in`, and all `status` values must be valid (Standard sec 3.7, 7.5). Drive it through `askit-deprecate`. See [deprecate-a-component](deprecate-a-component.md).

## General workflow

1. Run `node scripts/check.mjs` (or `tier-report --json` for the burndown).
2. For each finding, find its `reqId` above and apply the fix - usually an `askit-build-*` skill or a generator under `scripts/generators/`.
3. Re-run the gate. When the error count at your declared tier is zero, the gate exits `0`.
4. To climb a tier, clear its `blocked.<tier>` list, then raise `tier` in `library.json`. The [Bronze-to-Silver](climb-from-bronze-to-silver.md) how-to walks that move; the same pattern climbs to Gold.

If a finding cites a `Standard sec` you want to read in full, open [STANDARD.md](../../STANDARD.md) at that section - every message points at the rule it enforces.
