---
title: "Source record - Claude Code"
---

# Claude Code

The surface most of this Standard's Claude-side requirements rest on.

| | |
| --- | --- |
| **Surveyed through** | `2.1.235` (verbatim vendor label) |
| **Surveyed on** | 2026-08-18, by jprisant |
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
