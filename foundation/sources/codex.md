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
| **Docs** | pages serve `.md` variants. `hooks.md` is pinned as of 2026-08-22 |

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
- **Codex plugins ship skills, hooks and MCP servers, but NOT subagents.** Subagents are `config.toml` only; the plugin manifest has no `agents` field. **Established by round-trip experiment, then corroborated by a vendor list that contains no subagents.**
  **E49 was to pin this as a `quote` claim. It CANNOT be, and the check that says so ran 2026-09-04 (RS-C1/RS-C3).** The spec's own instruction was to verify the enumeration is prose "before landing", and verification refuses it. Read from `https://learn.chatgpt.com/docs/plugins.md`: the lead-in *"A plugin can contain one or more of these parts:"* is prose, but the parts themselves are a **bullet list** of six - Skills, Connectors, MCP servers, Browser extensions, Hooks, Scheduled task templates. The lead-in sentence asserts nothing about subagents; the fact we want is their **ABSENCE from a list**, and an absence in a rendered list is precisely what `E48` says cannot be a quote. It is the same structure that got three Codex claims landed and removed on 2026-08-22, differing only in the bullet rather than the pipe.
  **So this stays a DATED READ and enters no ledger** - re-verified 2026-09-04, six parts, zero mentions of `subagent` or `agents/` anywhere on the page (measured, not skimmed). It therefore does not age-block a release, which is the correct outcome for a fact whose evidence is an absence: a claim that can only be checked by re-reading a list has no failing state a machine can detect.
- **Hooks are a subset of Claude Code's events, and that subset is a DATED READ, not a pin.** (Headline corrected 2026-09-01: it read "the subset is now PINNED", which contradicted the body of its own line and the ledger, which holds zero Codex claims. The RS-A2 repair fixed the body and left the headline standing - the same heading-versus-content shape as the E52 defect this cut also repairs.) Read 2026-08-22 from `https://developers.openai.com/codex/hooks.md`, `method: read`. **The enumeration is a TABLE, and a table row cannot safely be a `quote` claim** - the pipe is rendering rather than vendor prose, so a re-render blanks the claim and `MISSING` blocks every release. Three such claims landed on 2026-08-22 and were removed the same day. **NO claim is pinned against this source** (corrected 2026-08-31): a prose candidate for SessionEnd was drafted and rejected, because the available sentence asserts a timeout budget rather than the event, and the `cx-hooks` source note records that absence deliberately. The set below is this record's own dated reading.
  **RE-READ 2026-09-04 (RS-C1). The count is now TWELVE, and the page has MOVED.** `https://developers.openai.com/codex/hooks.md` returns a **308** to `https://learn.chatgpt.com/docs/hooks.md` - the same migration line 25 recorded for the plugins page on 2026-08-18, so the whole `developers.openai.com/codex/*` namespace is moving to `learn.chatgpt.com/docs/*` and every pin against the old host should be read as a redirect, not a live URL.
  The twelve, read from the new URL: `SessionStart`, `SessionEnd`, `SubagentStart`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`, `PostCompact`, `UserPromptSubmit`, `SubagentStop`, `Stop`, `Interrupt`. **`Interrupt` is the new one** since the 2026-08-22 read; `SessionEnd` was already caught then.
  **The count was nearly recorded as THIRTEEN, and the near-miss is the useful part.** The page's `## Hooks` section carries one `###` per event, and a heading count returns 13 - because the thirteenth is `### Plain-text aliases`, which is not an event. That is `E48`'s trap in a new costume: counting the RENDERING STRUCTURE rather than the content. The count here was taken by enumerating the per-event sections and subtracting the non-event, not by trusting a summary.
  **`SessionEnd` was missing from our record entirely** on the 2026-08-22 read - the drift `E48` predicted, found by reading rather than by arguing, and corroborated four ways on the page (the event table, a config example, the timeout rules, and the parameters table). **Claude Code's own "31 events" remains an unpinned count.**
- **Handler types are NOT the Claude five, and the difference is quotable prose (read 2026-09-04).** The page states: *"`command` and `mcp_tool` handlers are supported. `prompt` and `agent` handlers are parsed but skipped."* This is running prose in a bullet, not a table row, so it CAN carry a `quote` claim - unlike the event enumeration. It is pinned as `cx-hook-handler-support` and is **the ledger's first live Codex claim**, retiring the "zero Codex claims" line above. The consequence it names is a silent one: a plugin shipping a `prompt`- or `agent`-type hook to Codex gets no error, just a hook that never runs.
- **Three component types Codex documents and this Standard does not model:** Connectors, Browser extensions, Scheduled task templates. Found by the v1.15.0 survey. Deliberately not modelled: the population of real plugins shipping any of them is unmeasured, and measure-first applies.

## What this surface holds up

The `.codex-plugin/plugin.json` emitter, `S6` (per-target presence), `U8` (manifest drift), and the Codex column of [`../synthesis/capability-matrix.md`](../synthesis/capability-matrix.md).
