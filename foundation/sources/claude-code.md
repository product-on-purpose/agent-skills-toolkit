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
| `https://code.claude.com/docs/en/plugins-reference` | `read` | `plugin-agent-unsupported-fields` **2026-08-15**, `plugin-agent-supported-fields` **2026-08-16**. Both probes below also name this page as their source | `U14` (restricted fields on plugin-shipped agents). The older `docs.claude.com` path 301-redirects here |
| `https://code.claude.com/docs/en/skills` | `read` | `commands-merged-into-skills` **2026-08-15**, `invocation-control-frontmatter` **2026-08-16** | `STANDARD.md` sec 3.2's commands-into-skills premise, and the invocation-control frontmatter |
| `https://code.claude.com/docs/en/sub-agents` | `read` | `agents-scanned-recursively` **2026-08-15**, `agent-filename-colon-excluded` **2026-08-16** | Subagent discovery: recursion, scoped identifiers, the colon exclusion. **Added 2026-08-15**, after review wave 1 found `U15` had been built on a flat-directory assumption nothing was watching |

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
## Two behaviours no page states, established by experiment

These are `probe` claims. **There is nothing to re-read, so their age IS the verification**, and past 30 days they block every release until a human runs the experiment again. Reproductions ship at [`../../docs/internal/vendor-watch/probes/`](../../docs/internal/vendor-watch/probes/).

**`agents-dir-registers-every-md`** - every `.md` in an `agents/` directory registers as a subagent, including `README.md` and `_README.md`; only a non-`.md` extension is skipped.

- 2026-08-06, `method: probe` - registered subagents listed in a live session. An actual observation, not reproducible on demand.
- 2026-08-19, `method: tool` - `claude plugin details`, the runtime's own inventory command. Reproducible in 30 seconds, but reports what the runtime says it will load rather than an observation of it having loaded.
- **Blocks from 2026-09-19.**

**This pair is the worked example behind the `method` field.** Both readings are legitimate, they have opposite weaknesses, and "confirmed 2026-08-19" describes both while distinguishing neither.

**`components-share-one-namespace`** - two plugins shipping an identically named skill share one pool for bare-name invocation, and which one wins is undefined.

- 2026-08-12, `method: probe` - shared pool observed. Which side won was not recorded.
- 2026-08-19 - **PARTIAL, and the date was deliberately not advanced.** Install-refusal was ruled out; which side wins was still open. Advancing a date on evidence that does not exist is the one thing this mechanism exists to prevent.
- 2026-08-20, `method: probe` (headless `claude -p --output-format stream-json --verbose`) - **discharged.** The bare name resolves silently to one winner, and the winner **follows install order**: A-then-B gave side A, B-then-A gave side B. Alphabetical ordering is ruled out. Two runs where opposite sides win is the direct evidence for the word *undefined*.
- **Blocks from 2026-09-20.**

**The 2026-08-20 instrument is stronger than `probe` can express.** The event stream records the actual tool calls, so "the skill was invoked" and "no file was read" are receipts rather than assertions. That second one mattered: the fixtures live inside this repository, so a session left alone can read the answer off disk and sound certain.

## What this surface holds up, in total

`U14` restricted fields, `U15` agents-dir-registerable, `STANDARD.md` sec 3.2's commands-into-skills premise, ADR 0051's stated reopening condition for the two marketplace-collision checks, and most of the Claude column of [`../synthesis/capability-matrix.md`](../synthesis/capability-matrix.md).
