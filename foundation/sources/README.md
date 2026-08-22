---
title: "foundation/sources - one record per first-party surface, and the method that produced it"
---

# foundation/sources

**Layer 1.** One record per first-party surface this Standard reads: what was read, which version, when, and **by what means**.

## `method` is a first-class field, and this release has the example that settles it

**"Confirmed 2026-08-19" describes a page-read and a probe-run identically while distinguishing neither**, and a reader deciding whether to trust a six-week-old entry needs to know which one it was.

That is not a hypothetical. The probe `agents-dir-registers-every-md` (does every `.md` in an agents directory register as a subagent) was established on **2026-08-06** by listing registered subagents in a live session, and re-verified on **2026-08-19** with `claude plugin details`, the runtime's own inventory command. Both are legitimate readings. They have **opposite weaknesses**, and the date alone hides that.

| `method` | Means | Strength | Weakness |
| --- | --- | --- | --- |
| `read` | a first-party page was read | states what the vendor says | says nothing about what the runtime does |
| `probe` | an experiment was run | an observation of real behaviour | needs a fresh environment; expires |
| `tool` | a first-party tool reported it | reproducible in seconds | reports what a tool says it *will* do, not that it did |

**A record whose method is absent is `unknown`, and `unknown` is not `stale`** ([ADR 0054](../../docs/internal/decisions/0054-a-component-records-what-agent-version-it-was-checked-against.md)). It is a prompt to go and look, never a defect cleared by deleting the row.

**The vocabulary is open, not closed.** On 2026-08-20 the probe `components-share-one-namespace` was discharged headlessly with `claude -p --output-format stream-json --verbose`, which records the **actual tool calls** - so "the skill was invoked" and "no file was read" became receipts rather than assertions. That is stronger than a plain `probe`, and the three values above cannot express the difference. Add a value rather than flattening a distinction.

## Verified reachable, and why that is stated separately

Every URL in these records **was reached by search or redirect and then fetched**; none is constructed by pattern. Last confirmed reachable across all four surfaces: **2026-08-18**.

This matters because hosts move. `developers.openai.com/codex/plugins.md` returned a **308** to `learn.chatgpt.com/docs/plugins.md` on 2026-08-18, and the older `docs.claude.com` Claude Code paths 301-redirect to `code.claude.com`. **A host move is a documentation edit, not a change of meaning** - record it and move on.

## What a record does NOT do

It does not decide what a vendor change *means* for this Standard. That is `askit-capability-gap-analysis`, and ratifying it is an ADR. A source record holds the reading and the date, and routes everything else elsewhere.

## Inventory

- `agentskills-io.md` - the upstream specification the Universal tier tracks. No version and no release feed, so it is pinned by content hash.
- `claude-code.md` - the surface most of this Standard's Claude-side checks rest on.
- `claude-cowork.md` - Claude Desktop and Cowork, whose two load-bearing behaviours are both undocumented.
- `codex.md` - the surface behind the `.codex-plugin/plugin.json` emitter and the matrix's Codex column.
