---
title: "Source record - Codex"
---

# Codex

| | |
| --- | --- |
| **Surveyed through** | **`null` - NOT YET PINNED.** See below |
| **Surveyed on** | 2026-08-18, by jprisant |
| **Method** | `read`, partial |
| **Release feed** | `https://developers.openai.com/codex/changelog`, plus `https://github.com/openai/codex/releases` |
| **Docs** | pages serve `.md` variants |

## The pin is null on purpose, and that is the most useful line in this record

**The changelog and the GitHub releases were both confirmed to exist, but the version range was not read end to end in the 2026-08-18 pass** - only the plugins documentation page was.

**Recorded as unpinned rather than guessed**, so the next survey has an honest floor instead of a false one. A pin advanced by a survey that skipped a surface, or that read a release note without opening the page, is the same defect as a version comment nobody re-checked: it converts "unknown" into "checked", which is the one transformation this folder exists to prevent.

**So the next survey's first job is here**, not on the surfaces that are already pinned. An unpinned surface is where the unmeasured risk is.

## The host moved, and that is a documentation edit

`developers.openai.com/codex/plugins.md` returned a **308** to `learn.chatgpt.com/docs/plugins.md` on 2026-08-18.

**A host move is a documentation edit, not a change of meaning.** Record it, follow the redirect, update the surface table in the same change. The equivalent Claude Code move (`docs.claude.com` to `code.claude.com`, a 301) carries the same note.

## Known asymmetries this surface establishes

Recorded here because they are the load-bearing Codex facts, and because two of them are why several tier boundaries sit where they do.

- **Codex ingests components ONLY via `.codex-plugin/plugin.json`.** Listing a component is not ingesting it, which is why round-trip tests must verify discovery rather than presence.
- **Codex plugins ship skills, hooks and MCP servers, but NOT subagents.** Subagents are `config.toml` only; the plugin manifest has no `agents` field. **Established by round-trip experiment, then corroborated by a vendor list that contains no subagents** - so a knowledge that rested on a probe became quotable, which is a strict improvement: a quote costs nothing recurring, while a probe's age is its whole verification.
- **Hooks are a subset of Claude Code's events.** **The subset itself is pinned NOWHERE and its confirmation date is unknown.** The Advanced tier requires hooks, so this is exactly the kind of boundary `tier-basis.md` (W3) must record as `unverified` rather than fill in from memory.
- **Three component types Codex documents and this Standard does not model:** Connectors, Browser extensions, Scheduled task templates. Found by the v1.15.0 survey. Deliberately not modelled: the population of real plugins shipping any of them is unmeasured, and measure-first applies.

## What this surface holds up

The `.codex-plugin/plugin.json` emitter, `S6` (per-target presence), `U8` (manifest drift), and the Codex column of [`../synthesis/capability-matrix.md`](../synthesis/capability-matrix.md).
