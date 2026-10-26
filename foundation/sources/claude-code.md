---
title: "Source record - Claude Code"
---

# Claude Code

The surface most of this Standard's Claude-side requirements rest on.

| | |
| --- | --- |
| **Surveyed through** | `2.1.261` (verbatim vendor label) |
| **Surveyed on** | 2026-09-05, by jprisant (previously 2026-08-18 through `2.1.235`) |
| **Method** | `read` |
| **Release feed** | `https://code.claude.com/docs/en/changelog` (append `.md` for plain markdown) |
| **Docs index** | `https://claude.com/docs/llms.txt` |

**The version is a string, not a date, and it is copied verbatim.** A reader must be able to search the vendor's own changelog for this exact string and find the entry the survey stopped at. A date pin silently loses anything published out of order and gives two readers different answers to the same question.

## Pages read, and what each one holds up

| Page | `method` | Claims it pins, and each claim's `verifiedOn` | What depends on it |
| --- | --- | --- | --- |
| `https://code.claude.com/docs/en/plugins/components` | `read` | `plugin-agent-supported-fields` **2026-10-23**. Both probes below also name this page as their source. **Until 2026-09-28 this row was `https://code.claude.com/docs/en/plugins-reference`**, which now serves only the manifest reference; see the 2026-09-28 section below | `U14`'s remediation list. The older `docs.claude.com` host 301-redirects to `code.claude.com` |
| `https://code.claude.com/docs/en/skills` | `read` | `commands-merged-into-skills` **2026-10-23**, `invocation-control-frontmatter` **2026-10-23** | `STANDARD.md` sec 3.2's commands-into-skills premise, and the invocation-control frontmatter |
| `https://code.claude.com/docs/en/sub-agents` | `read` | `agents-scanned-recursively` **2026-10-23**, `plugin-agents-outside-skip-list` **2026-10-23** (retired `agent-filename-colon-excluded` **2026-08-16**, GONE from the page on 2026-10-13; see [E81 (the colon rule now names the frontmatter `name`, not the filename)](../../docs/internal/backlog/enhancements.md)), `plugin-agent-unsupported-fields` **2026-10-23** (moved here from the plugins reference) | `U14` (restricted fields on plugin-shipped agents): the whole check, and the vendor sentence every `U14` finding quotes. Subagent discovery: recursion, scoped identifiers, and the skip-list's scope (project/user/managed/`--add-dir` only, never a plugin's). **Added 2026-08-15**, after review wave 1 found `U15` had been built on a flat-directory assumption nothing was watching |

**The dates are the claims' own `verifiedOn` values, not this file's.** They are copied here so a reader can judge age without opening the JSON, and they are the one thing in this table that will go stale: if they disagree with `../claims/vendor-claims.json`, the JSON wins and this table is wrong.

Each is pinned as a `quote` claim in [`../claims/vendor-claims.json`](../claims/vendor-claims.json) and re-read on every `npm run vendor-watch` run, so a quote never goes stale silently.

## The 2026-09-05 re-survey (RS-C4), and what 26 versions changed

The record had been surveyed through `2.1.235` on 2026-08-18. `claude --version` read **`2.1.261`** on 2026-09-05 - a 26-version gap, wider than the item that commissioned this survey estimated. **That gap is the reason the acceptance criterion for this work was written as "the version current at survey time, with that version recorded" rather than naming a fixed version:** a criterion that hard-codes a number can pass while its purpose, vendor currency, fails.

**All four pinned quote claims still hold**, confirmed live by `npm run vendor-watch` on the survey date: 9 claims, 7 hold, 0 MISSING, 0 stale, 2 unchecked (the two probes, which have nothing to fetch).

### What changed, and what it means here

- **The plugin-agent SUPPORTED field list has grown**; the RESTRICTED list has not. The page now reads: *"Plugin agents support `name`, `description`, `model`, `effort`, `maxTurns`, `tools`, `disallowedTools`, `skills`, `memory`, `background`, and `isolation` frontmatter fields. The only valid `isolation` value is `"worktree"`. For security reasons, `hooks`, `mcpServers`, and `permissionMode` are not supported for plugin-shipped agents."* `U14` is a **denylist** over exactly those three refused fields, so a growing supported list cannot make it fire falsely - the growth is recorded because a future reader comparing the page to this record should not have to wonder whether it was missed.
- **`experimental.cacheTtl` exists, is documented for SUBAGENTS, and is absent from the plugin-agent supported list.** The sub-agents page documents it (*"Set its `cacheTtl` key to `5m` or `1h` to choose the prompt cache lifetime for this subagent's requests"*, requiring `2.1.248` or later, and *"Write `cacheTtl` inside the `experimental` map, not at the top level of the frontmatter"*). The plugin-agent field list quoted above does not name `experimental`. **Whether a plugin-shipped agent may declare it is therefore still vendor-undocumented at `2.1.261`**, which is the same state the previous survey recorded. No check moves either way: `U14`'s denylist names three fields and `experimental` is not one of them, so the toolkit is structurally neutral to the answer. **Watch line: re-check at the next survey.** If the vendor ever states that plugin agents ignore `experimental`, an author writing a cache TTL into a plugin agent is configuring something that will not be honoured, which is the `U14` hazard shape and would become a finding.
- **The marketplace `relevance` block is real, fully specified, and DELIBERATELY NOT MODELLED.** Ruled a dated no on 2026-09-05 and filed as an OPEN backlog entry with its re-measurement instrument and its reopening trigger, per the E44 precedent: [E59 (model the marketplace relevance block, or keep the dated no)](../../docs/internal/backlog/enhancements.md). The decisive fact is that the block is **inert by default** - *"No marketplace's `relevance` declarations produce suggestions until an administrator adds it to the allowlist, including the official Anthropic marketplace"* - and that unknown keys under it are *"ignored ... at load time"*, so a malformed block degrades rather than breaking anything. The vendor's own `claude plugin validate` already checks it. Measured population on the survey date: **7 plugin entries across every reachable marketplace manifest, 0 carrying a relevance block.**
- **No new source kind, and the two string-shaped ones were already handled.** The marketplace page lists `github`, `url`, `git-subdir`, `npm`, `archive`, `command`, a relative path string, and a bare name string resolved under `metadata.pluginRoot`. `command` was the one that produced a false RED and was fixed in v1.17.1. **The two string forms were checked rather than assumed**: `scripts/lib/marketplace/manifest.mjs` line 54 returns `kind: "local-path"` for any non-empty string before the object switch, so both are handled and neither is a latent false RED of the `command` class.
## 2026-09-16 pin refresh - one page re-read, not a survey

`https://code.claude.com/docs/en/plugins-reference` was re-read on 2026-09-16 to refresh two pinned quotes whose wording had moved. **This was not a survey.** The version pin above stays at `2.1.261` and the survey date stays 2026-09-05, because nobody read a version range - one page was re-read to keep two quotes matchable. The 2026-09-05 quote in the section above is left exactly as it was read then, and should not be edited to match today's wording.

- **The restricted sentence was reworded and refuses the same three fields.** It now reads *"For security reasons, plugin-shipped agents don't support `hooks`, `mcpServers`, or `permissionMode`."* - passive to active, same three fields, no semantic change. `U14` is a denylist over exactly those three, so no plugin's verdict moves and the reword cannot produce a finding.
- **The supported list gained one field, `omitClaudeMd`, between `background` and `isolation`.** That list is read only to build `U14`'s remediation prose, so this is green-ward under [ADR 0045 (restricted fields on plugin-shipped agents)](../../docs/internal/decisions/0045-restricted-fields-on-plugin-shipped-agents.md): a pin refresh and a constant update, not a Standard minor.
- **The pinned claim for the supported list carries markdown link syntax, and that is deliberate.** The page serves `text/markdown` and links `omitClaudeMd` to `/docs/en/sub-agents#supported-frontmatter-fields`. `normalizeForMatch` folds case, quotes, dashes, backticks, asterisks, underscores and whitespace, but **not** link syntax, so a claim storing the bare field name reports MISSING. Measured against the live page before the pin was written, not assumed.
- **The `experimental` watch line above still holds.** The grown supported list still does not name `experimental`, so whether a plugin-shipped agent may declare `experimental.cacheTtl` remains vendor-undocumented, exactly as the 2026-09-05 survey recorded. Re-check at the next survey, not at the next pin refresh.

## 2026-09-28 pin refresh - the agent sentences left the plugins reference

`vendor-watch` reported both plugin-agent claims GONE on 2026-09-27, which blocked the next release. Three pages were re-read on 2026-09-28 from the raw `text/markdown` the watch itself fetches. **This was not a survey either.** The version pin and the survey date above do not move, and the two earlier sections keep the wording they recorded.

- **The GONE report was real, not a link artifact.** The 2026-09-16 pin carried markdown link syntax that a moved link could have broken. That was checked first and was not the cause: `https://code.claude.com/docs/en/plugins-reference` still answers `200`, but it now serves only the **plugin manifest reference**, and no agent sentence remains on it.
- **The supported list moved to `https://code.claude.com/docs/en/plugins/components`**, under "Frontmatter fields in plugin agents". It now reads *"Supported fields: `name`, `description`, `model`, `effort`, `maxTurns`, `tools`, `disallowedTools`, `skills`, `memory`, `background`, `omitClaudeMd`, `isolation`, `color`, and the `cacheTtl` key of `experimental`."* It gained `color` and `experimental.cacheTtl`. That list only builds `U14`'s remediation prose, so this is green-ward under [ADR 0045 (restricted fields on plugin-shipped agents)](../../docs/internal/decisions/0045-restricted-fields-on-plugin-shipped-agents.md).
- **The `experimental` watch line in the 2026-09-05 section is ANSWERED.** The vendor now states that a plugin agent supports the `cacheTtl` key of `experimental`, and names no other key of that map. No check moved, because `U14`'s denylist never named `experimental`.
- **The security sentence survives only on `https://code.claude.com/docs/en/sub-agents`**: *"For security reasons, plugin subagents don't support the `hooks`, `mcpServers`, or `permissionMode` frontmatter fields. These fields are ignored when loading agents from a plugin."* It names the same three fields as before, so `plugin-agent-unsupported-fields` was re-pinned to that page and no plugin's verdict moves.
- **The components page lists a FOURTH ignored field, and it was deliberately not adopted.** Its next bullet reads *"Ignored fields: `permissionMode`, `hooks`, `mcpServers`, and `initialPrompt`."* It gives no security rationale. The sub-agents frontmatter table agrees that `initialPrompt` is *"Ignored for plugin subagents"*, and explains that the field only takes effect when an agent runs as the main session agent. Adding a field to `U14`'s denylist is red-ward under ADR 0045, so it needs a Standard minor with finding-level migration metadata and a maintainer ruling. It is filed as [E70 (`initialPrompt` on plugin agents)](../../docs/internal/backlog/enhancements.md). **Measured blast radius on 2026-09-28: zero agent files declare `initialPrompt` anywhere under the product-on-purpose family, including gitignored copies and worktrees.**
- **The vendor now says "ignored" where this repository said "refused".** `STANDARD.md` sec 2.1 used to say the field "is refused rather than ignored". The vendor's own sentence says the fields "are ignored when loading agents from a plugin", so that contrast was dropped from the Standard's rationale. The requirement itself did not change.
- **The source record was re-pointed rather than a fifth source added.** The ledger's source for the plugins reference page was renamed `cc-plugins-components` and pointed at the components page, and the two probes moved with it, because they named the old page only for its `agents/` discovery text. Nothing pinned depended on the manifest page itself.

## 2026-10-23 readings

Three separate readings, done the same day for the same release. None of them is a survey: the version pin and survey date above stay as recorded in the 2026-09-05 section.

**autoCompactWindow joins the plugin-agent supported list (E83, the supported-fields list gained autoCompactWindow).** `https://code.claude.com/docs/en/plugins/components` now reads: *"Supported fields: `name`, `description`, `model`, `effort`, `maxTurns`, `autoCompactWindow`, `tools`, `disallowedTools`, `skills`, `memory`, `background`, `omitClaudeMd`, `isolation`, `color`, and the `cacheTtl` key of `experimental`."* The new field sits between `maxTurns` and `tools`. This list only builds `U14`'s remediation prose, so the change is green-ward under [ADR 0045 (restricted fields on plugin-shipped agents)](../../docs/internal/decisions/0045-restricted-fields-on-plugin-shipped-agents.md): a pin refresh and a constant update, not a Standard minor. `plugin-agent-supported-fields` was re-pinned to the new sentence and measured against the watch's own fetch and normaliser (`npm run vendor-watch`) before this was written. Filed as [E83 (the supported-fields list gained autoCompactWindow)](../../docs/internal/backlog/enhancements.md).

**E81 (the colon rule now names the frontmatter `name`, not the filename), the two-agent fixture run.** [E81](../../docs/internal/backlog/enhancements.md) was ruled 2026-10-14: measure, then change. The fixture ran today in a `node:24` Linux container (NTFS cannot hold a colon, so this could not run on Windows), Claude Code 2.1.309, plugin installed with `--scope local`. Fixture `probe-colon`, `agents/`: `colon:file.md` (colon in the filename; frontmatter `name: plain-name-in-colon-file`), `plain-file.md` (no colon in the filename; frontmatter `name: "colon:in-name"`), `control.md` (no colon anywhere; `name: control-agent`).

```
$ claude plugin details probe-colon
probe-colon 0.0.1
  Description: E81 colon fixture
  Source: probe-colon@askit-e81-fixture

Component inventory
  Skills (0)
  Agents (3)  plain-file, control, colon:file
  Hooks (0)
  MCP servers (0)
  LSP servers (0)

Projected token cost
  Always-on:   ~51 tok   added to every session

Per-component (rounded)
  component   always-on  on-invoke
  plain-file        ~20       < 20
  control          < 20       < 20
  colon:file        ~20       < 20
```

**Reading.** A colon in the FILENAME does not stop the plugin loader: `colon:file` is inventoried and costed like any other agent. A colon in the frontmatter `name` also does not remove the file from the inventory: `plain-file` is listed under its filename stem, not under its `name` field's value - plugin agents are identified by filename stem, matching the 2026-10-13 `agents-dir-registers-every-md` run. **Not measured:** whether a live, logged-in session refuses to invoke the `colon:in-name` agent; `claude agents` in 2.1.309 is the background-agent manager, not a subagent listing, so it could not answer this. The marketplace `add` and plugin `install` subcommands needed no login.

This reading, together with the sub-agents page's own scoping sentence (pinned as `plugin-agents-outside-skip-list`, replacing `agent-filename-colon-excluded`), is why `isRuntimeAgentFile` in `scripts/lib/fs-utils.mjs` stopped excluding colon-named files: Claude Code 2.1.309 loads a plugin agent file with a colon in its filename, measured 2026-10-23, and the page's own scoping sentence, read the same day, names only project/user/managed/`--add-dir` `agents` directories, never a plugin's. `U14`, `U15`, and the registration checks that read `isRuntimeAgentFile`'s result (`S2`'s prefix check, `S3`'s components-index check, `S4`'s chain-contract check, and the components-mirror check) now see a colon-named plugin agent file that they did not before.

**Three further facts from today's reading of the same pages, none changing a check.** First, the skip list (`https://code.claude.com/docs/en/sub-agents`, "Subagent files Claude Code skips") is explicitly scoped to "a project, user, or managed `agents` directory, or ... a directory you add with `--add-dir`" - never a plugin directory. Second, that same sub-agents page states its own exception for plugins: "A plugin subagent whose frontmatter has no `name` or doesn't parse still loads, under its filename." This corroborates `plugin-agents-outside-skip-list`'s antecedent from the plugin's own side of the scope, rather than only the skip list's side. Third, the plugins/components page states that a plugin agent whose frontmatter does not parse "still loads with every field ignored. It's named after the file, and its description reads `Agent from my-plugin plugin`," which drops EVERY field, while a `name` longer than 256 characters is narrower: "Claude Code ignores it and names the agent after its file, as it does when the field is missing" - only the `name` field is dropped, not the rest of the frontmatter. None of this is modelled by any check today; recorded here so a future reader does not have to re-discover it.

**Family blast radius, measured with `git ls-tree origin/HEAD` on 2026-10-23: zero colon paths under `agents/`** in `pm-skills` (6 agent `.md` files), `thinking-framework-skills` (3), `writing-style-catalog` (0), `product-lifecycle-templates` (1), `critique-skills` (1), and `agent-skills-toolkit` itself (18). Widening `isRuntimeAgentFile` moves no family member's verdict today.

**E87 extension, the dash and length rules, read the same day as E81.** [E87 (plugin-agent loading asymmetries this Standard does not model)](../../docs/internal/backlog/enhancements.md) asked whether the same page's leading-dash and 257-character-name skip-list rules also spare a plugin agent from exclusion, the same question E81 answers above for the colon rule. A five-agent fixture at `docs/internal/vendor-watch/one-time/agent-name-rules/` ran in the same kind of Linux container the same day, on Claude Code 2.1.310: a plugin agent whose frontmatter `name` is `"-dash-prefixed-name"`, and one whose `name` is 257 characters long, both stayed in `claude plugin details`' component inventory, listed by their filename stem (`dash-name`, `long-name`) rather than by `name`. That is the identical result E81 found for the colon cases: neither rule excludes a plugin agent. **This is a one-time reading, not a third `probe` claim** - the release-blocking probe budget stays at two; see that folder's own `README.md` for why.

**Five quote claims re-read and found still accurate: `commands-merged-into-skills`, `invocation-control-frontmatter`, `agents-scanned-recursively`, `plugin-agent-unsupported-fields`, and (on the Codex `cx-hooks` source) `cx-hook-handler-support`.** Each sentence and its surrounding section still mean what their `dependsOn` assumes; `verifiedOn` was refreshed to 2026-10-23 for all five. No wording changed on any of them.

## Two behaviours no page states, established by experiment

These are `probe` claims. **There is nothing to re-read, so their age IS the verification**, and past 30 days they block every release until a human runs the experiment again. Reproductions ship at [`../../docs/internal/vendor-watch/probes/`](../../docs/internal/vendor-watch/probes/).

**`agents-dir-registers-every-md`** - every `.md` in an `agents/` directory registers as a subagent, including `README.md` and `_README.md`; only a non-`.md` extension is skipped.

- 2026-08-06, `method: probe` - registered subagents listed in a live session. An actual observation, not reproducible on demand.
- 2026-08-19, `method: tool` - `claude plugin details`, the runtime's own inventory command. Reproducible in 30 seconds, but reports what the runtime says it will load rather than an observation of it having loaded.
- **Blocks from 2026-09-19.** (Superseded: the 2026-08-24 and 2026-09-17 re-runs are recorded in the fixture's `EXPECTED.md`, and the line below is the current one.)
- 2026-10-13, `method: tool` - `claude plugin details` on Claude Code 2.1.296: `Agents (3) README, real-agent, _README`, unchanged. **Blocks from 2026-11-13.**
- 2026-10-23, `method: tool` - `claude plugin details` on Claude Code 2.1.310, after a fresh `askit-probe-fixtures` marketplace add: `Agents (3) README, real-agent, _README`, unchanged. Blocks from 2026-11-23, measured with `node scripts/vendor-watch.mjs . --today`: 2026-11-22 reports 0 stale and 2026-11-23 reports 2.
- 2026-10-25, `method: tool` - `claude plugin details` on Claude Code 2.1.310, after a fresh `askit-probe-fixtures` marketplace add: `Agents (3) README, real-agent, _README`, unchanged. **Blocks from 2026-11-25**, measured with `node scripts/vendor-watch.mjs . --today`: 2026-11-24 reports 0 stale and 2026-11-25 reports 2.

**This pair is the worked example behind the `method` field.** Both readings are legitimate, they have opposite weaknesses, and "confirmed 2026-08-19" describes both while distinguishing neither.

**`components-share-one-namespace`** - **SUPERSEDED 2026-09-17, see the entry at the end of this list.** As read through 2026-08-24: two plugins shipping an identically named skill share one pool for bare-name invocation, and which one wins is undefined.

- 2026-08-12, `method: probe` - shared pool observed. Which side won was not recorded.
- 2026-08-19 - **PARTIAL, and the date was deliberately not advanced.** Install-refusal was ruled out; which side wins was still open. Advancing a date on evidence that does not exist is the one thing this mechanism exists to prevent.
- 2026-08-20, `method: probe` (headless `claude -p --output-format stream-json --verbose`) - **discharged.** The bare name resolves silently to one winner, and the winner **follows install order**: A-then-B gave side A, B-then-A gave side B. Alphabetical ordering is ruled out. Two runs where opposite sides win is the direct evidence for the word *undefined*.
- **2026-09-17, `method: probe` (headless, same instrument) - THE CLAIM ABOVE NO LONGER HOLDS.** On Claude Code **2.1.275** the bare name does not resolve at all. It is refused: `<tool_use_error>Unknown skill: probe-duplicate. Several skills match that name: probe-collision-a:probe-duplicate, probe-collision-b:probe-duplicate - invoke one by its full name.</tool_use_error>` Reproduced with the install order reversed, so the install-order refinement the 2026-08-20 run established has nothing left to refine - there is no winner to follow the order. **Nothing wins, so "which one wins is undefined" is now false and is kept above only as the dated record of what was true through 2026-08-24.** Ruled by [ADR 0060 (a runtime that refuses a collision downgrades the check, it does not retire it)](../../docs/internal/decisions/0060-a-runtime-that-refuses-a-collision-downgrades-the-check-it-does-not-retire-it.md): the two collision checks drop to `warn` rather than being retired, because only **Claude Code** was measured and Codex is the other emit target.
- 2026-10-13, `method: probe` (headless, same instrument) - **unchanged** on Claude Code 2.1.296, in both install orders: the bare name is refused with the same `tool_use_error`, and only the listing order of the two candidates follows install order. **Blocks from 2026-11-13.**
- 2026-10-23, `method: probe` (headless, same instrument) - **unchanged** on Claude Code 2.1.310, in both install orders: the bare name is refused with the same `tool_use_error`, and only the listing order of the two candidates follows install order. Blocks from 2026-11-23, measured with `node scripts/vendor-watch.mjs . --today`: 2026-11-22 reports 0 stale and 2026-11-23 reports 2.
- 2026-10-25, `method: probe` (headless, same instrument) - **unchanged** on Claude Code 2.1.310, in both install orders: the bare name is refused with the same `tool_use_error`, and only the listing order of the two candidates follows install order. **Blocks from 2026-11-25**, measured with `node scripts/vendor-watch.mjs . --today`: 2026-11-24 reports 0 stale and 2026-11-25 reports 2.
- **Blocks from 2026-09-20.**

**The 2026-08-20 instrument is stronger than `probe` can express.** The event stream records the actual tool calls, so "the skill was invoked" and "no file was read" are receipts rather than assertions. That second one mattered: the fixtures live inside this repository, so a session left alone can read the answer off disk and sound certain.

## What this surface holds up, in total

`U14` restricted fields, `U15` agents-dir-registerable, `STANDARD.md` sec 3.2's commands-into-skills premise, ADR 0051's stated reopening condition for the two marketplace-collision checks, and most of the Claude column of [`../synthesis/capability-matrix.md`](../synthesis/capability-matrix.md).
