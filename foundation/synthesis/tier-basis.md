---
title: "tier-basis - which vendor fact each tier boundary rests on"
---

# tier basis

One row per tier boundary, naming the capability it depends on and the source record that establishes it. Contract fixed by [ADR 0055](../../docs/internal/decisions/0055-the-evidence-gets-an-address-and-gate-readership-is-recorded-not-inferred.md) D3.

**The rule that makes this file worth having:**

> **A boundary with no evidence gets a row reading `unverified`, never an omitted row.**

An absent row reads as "no boundary here." An `unverified` row reads as "a boundary nobody has grounded", which is the finding. **`unverified` does not mean wrong.** Most rows below are almost certainly correct; they are simply not traceable to a first-party source with a date and a method, so if the vendor changed one, nothing here would notice.

First written 2026-08-20 (v1.16.0 W3). **Nothing in this file was filled in from memory**; every `pinned` row cites either a live claim **or** the upstream pin, and everything else says `unverified`.

## The headline finding, and it was not expected

> **UPDATE 2026-08-22: this finding drove a fix, and is now PARTLY SUPERSEDED.** A `quote` claim for a Codex hook event landed that day against a new `cx-hooks` source, so the file now holds **9 claims across two vendors** rather than 8 across one. The asymmetry is narrowed, barely: **Codex has ONE claim to Claude Code's eight, and Cowork still has none.**
>
> **Three claims landed first and were removed the same day**, because they pinned the event table by quoting its rows - pipes and all - which pins rendering rather than prose. A re-render would have blanked all three at once, and `MISSING` is exit 1 with no soft path. The full eleven-event enumeration is recorded as a dated `read` in `../sources/codex.md` instead. The paragraph below is the finding as first written.

**All eight pinned claims in [`../claims/vendor-claims.json`](../claims/vendor-claims.json) source from Claude Code pages** - `cc-plugins-reference`, `cc-skills`, `cc-sub-agents`. There is **no pinned claim for any Codex fact, and none for any Cowork fact.**

**The Convergent tier is defined by cross-agent parity.** `STANDARD.md` sec 2.2: *"Concepts both CC and CX support, but in different formats."* So the tier whose entire definition is a statement about two agents has **pinned evidence for one of them.**

This is not an argument that the Codex readings are wrong. They were made carefully, and several were established by round-trip experiment rather than by reading. It is an argument that **they have no expiry**: a quote is re-read on every `vendor-watch` run and a probe blocks a release when it ages out, while an unpinned reading simply persists.

## Universal (Bronze)

Component types the tier adds: skills, references and assets, `AGENTS.md`, MCP.

| Boundary | The vendor fact it rests on | Status | Pinned where | Confirmed |
| --- | --- | --- | --- | --- |
| Skills are portable to both agents | both read the agentskills.io `SKILL.md` format | **pinned (partial)** | `upstream-pin.json` `docs/specification.mdx` (blob `d9a2db09`) for the format; `cc-skills` for the Claude half | 2026-08-11 / 2026-08-15 |
| ...the **Codex** half of the same row | Codex reads the same skill format | **`unverified`** | nothing. The plugins page was read 2026-08-18 but no sentence is pinned | 2026-08-18, `method: read`, unpinned |
| References and assets bundle with a skill | progressive disclosure is in the spec | **pinned** | `upstream-pin.json` `docs/specification.mdx` | 2026-08-11 |
| Both agents read a root `AGENTS.md` | identical format, both read root | **`unverified`** | nothing | - |
| One portable `.mcp.json` serves both | each native manifest carries an `mcpServers` pointer | **`unverified`** | nothing | - |
| `U14` - agents must not declare `hooks`, `mcpServers`, `permissionMode` | the runtime refuses these fields for plugin-shipped agents | **pinned, quote** | `plugin-agent-unsupported-fields` | 2026-08-15 |
| `U14`'s remediation list | which fields the runtime *does* support | **pinned, quote** | `plugin-agent-supported-fields` | 2026-08-16 |
| `U15` - every `.md` under `agents/` registers | the runtime loads every `.md`, including `README.md` | **pinned, PROBE** | `agents-dir-registers-every-md`. **Blocks from 2026-09-19** | 2026-08-19 |
| `U15`'s recursion invariant | `agents/` is scanned recursively with scoped identifiers | **pinned, quote** | `agents-scanned-recursively` | 2026-08-15 |
| `isRuntimeAgentFile`'s width | a filename containing a colon is excluded | **pinned, quote** | `agent-filename-colon-excluded` | 2026-08-16 |

## Convergent (Silver)

Component types the tier adds: subagents, commands, workflows, chain contracts, plugin packaging, the prefix, native manifests.

| Boundary | The vendor fact it rests on | Status | Pinned where | Confirmed |
| --- | --- | --- | --- | --- |
| Commands exist on Claude Code as `commands/<name>.md` | commands merged into skills; invocation control is frontmatter | **pinned, quote** | `commands-merged-into-skills`, `invocation-control-frontmatter` | 2026-08-15 / 2026-08-16 |
| ...and realize on **Codex** as the backing skill | Codex has no separate command component; the skill is the invocable form | **`unverified`** | nothing | 2026-08-18, `method: read`, unpinned |
| **Subagents are Claude-only for plugin distribution** | the Codex plugin manifest has **no `agents` field** | **`unverified`, and it is the most consequential row here** | **not pinned - but NOT uncited.** A verbatim first-party quote is in the repo at `skills/askit-capability-whats-new/examples/golden-2-a-capability-nobody-announced.md`. See below | 2026-08-18 |
| Workflows are a convention | none - `_workflows/<name>.md` is this Standard's own convention | **n/a, house** | - | - |
| Chain contracts are agent-agnostic | none - a single file this Standard defines | **n/a, house** | - | - |
| Codex ingests components ONLY via `.codex-plugin/plugin.json` | listing is not ingestion | **`unverified`** | nothing. Established by round-trip experiment | 2026-08-18 |
| Two plugins' identically named components share one pool | bare-name invocation resolves silently to one winner, by install order | **pinned, PROBE** | `components-share-one-namespace`. **Blocks from 2026-09-20** | 2026-08-20 |

### The subagent row deserves its own paragraph

**It is `unverified` and it is one sentence away from being pinned.** The fact was established by round-trip experiment, and then *corroborated by a vendor list that contains no subagents* - which is precisely what makes a probe-derived fact **quotable**. `askit-capability-whats-new`'s own golden example records that transition and routes it to a candidate claim.

**The candidate was never landed.** So a Convergent boundary that tells authors to declare `agent-targets: [claude]` for every subagent they ship rests on a reading with no expiry, when a quote costing nothing recurring is available.

**Recommendation: land it as a `quote` claim.** This is the cheapest row in the file to fix and the highest-value: a quote is re-read on every run and never blocks while it holds.

## Advanced (Gold)

Component types the tier adds: hooks, output styles, statusline, self-hosting CI.

| Boundary | The vendor fact it rests on | Status | Pinned where | Confirmed |
| --- | --- | --- | --- | --- |
| **Hooks: Codex supports a SUBSET of Claude Code's events** | Claude Code has 31 events; **Codex has 11**, enumerated on the vendor's hook reference | **partly pinned.** One event pinned by quote; the SET is a dated `read` | `codex-sessionend-hook-exists` pins `SessionEnd`. The eleven-event enumeration is recorded in [`../sources/codex.md`](../sources/codex.md), `method: read` | 2026-08-22 |
| Output styles are Claude-only | Codex has no output-style feature | **`unverified`** | nothing | - |
| Statusline differs | Codex configures a built-in picker via `config.toml` `tui.status_line`, not a shipped script | **`unverified`** | nothing | - |
| Self-hosting CI | none - this Standard's own requirement | **n/a, house** | - | - |

### The hooks row is the one this release was written to expose, and it is now CLOSED

**The Advanced tier REQUIRES hooks.** `STANDARD.md` sec 2.3 makes documenting every hook, its event and its scope a MUST. So the top tier of this ladder rests on a claim about which events Codex supports - and **that list is written in the capability matrix, sourced from nothing, dated never.**

Both halves are unverified in different ways. Claude Code's "31 events" is a count nobody pinned. Codex's nine are enumerated in the matrix with no citation and no date.

**PARTLY RESOLVED 2026-08-22, by doing exactly that: opening the reference, counting, and pinning - and then learning what can and cannot be pinned.** The eleven events are enumerated on the vendor's page **only as a table.** Three claims quoting those rows landed and were removed the same day: a pipe is rendering, not prose, and a re-render would have reported all three `MISSING` at once, which is exit 1 with no soft path. **One event, `SessionEnd`, is pinned by a prose sentence** that would disappear if the event did. The set itself is a dated `read` in [`../sources/codex.md`](../sources/codex.md) - real evidence, without an automatic re-check. **The reading found real drift:** this file and the capability matrix both recorded **nine or ten** events; the vendor documents **eleven**. `SessionEnd` was missing from our record, confirmed in the vendor's own event table, its timeout rules, its parameters table and a config example.

**Claude Code's "31 events" is still `unverified`** - a count nobody pinned. Half a row closed is still half a row open.

## Cowork: two shipped checks bending around undocumented behaviour

Cowork is not a tier boundary and is deliberately not a matrix column, but two checks accommodate it, so it belongs in a file about what the gate rests on.

| Check | The accommodation | Status |
| --- | --- | --- |
| `U6` `reference-links` | `SKIP_SCHEME` includes `computer:`, treating it as a local-artifact scheme | **`unverified`** |
| `U11` `mcp-valid` | a typed `http` server with no `url` is a warning, not an error, for the managed-connector pattern | **`unverified`** |

**Neither behaviour is documented by the vendor**, confirmed against `v1.32885.1` on 2026-08-18. There is no quote to re-read and no probe whose age expires, so if either behaviour changed, nothing here would notice. See [`../sources/claude-cowork.md`](../sources/claude-cowork.md).

## Summary: what is grounded and what is not

| | Count |
| --- | --- |
| Boundaries resting on a **pinned** claim | **10** |
| Boundaries **not pinned** (`unverified`, so no expiry) | **10** |
| Boundaries that are this Standard's own convention (`n/a, house`) | **3** |

**Every one of the eight pinned claims is a Claude Code fact.** Every `unverified` row is a Codex fact, a Cowork fact, or a cross-agent portability claim.

> **`unverified` here means NOT PINNED, and that is not the same as uncited.** An earlier wording said
> these eleven rest on "nothing first-party", which adversarial wave 2 showed is false for at least one
> of them: the subagent row is backed by a **verbatim quote of the Codex plugins page**, read 2026-08-18
> and recorded in `askit-capability-whats-new`'s golden example 2, listing every plugin part with no
> subagents among them.
>
> **The distinction is the whole point of the column.** A citation sitting in an example file establishes
> the fact today. A **pinned claim** re-reads it on every `vendor-watch` run, or expires and blocks a
> release. `unverified` in this table means the second thing is absent, so **nothing will notice if the
> vendor changes it** - not that nobody ever looked.

> **Two different counts, both nearly "eight", and this file said the wrong one until 2026-08-22.**
> There are **8 pinned CLAIMS** in `vendor-claims.json`, and **9 pinned BOUNDARIES** in the tables above.
> The summary row read **8** on first writing, which was the claim count wearing the boundary count's
> clothes. **Corrected by counting the rows, not by re-reading them.**
>
> **The arithmetic, which took two attempts.** The first correction said the counts differ because
> "several boundaries cite the same claim, and one cites `upstream-pin.json`". **Both halves were
> wrong**, and adversarial wave 2 caught it. The truth:
>
> - **No claim id is shared between rows.** Each of the eight is cited exactly once.
> - **Seven rows are backed by `vendor-claims.json`**, and they cover all eight claims because the
>   commands row cites **two** (`commands-merged-into-skills` and `invocation-control-frontmatter`).
> - **Two rows, not one, are backed by `upstream-pin.json`**: skills-are-portable and
>   references-and-assets. Neither cites a vendor claim id at all.
>
> So **7 + 2 = 9 boundaries over 8 claims** as first counted. **Now 10 pinned**, after the Advanced hooks row was pinned on 2026-08-22 by three Codex claims.
>
> **A counting trap this file then created for itself.** The hooks row's status briefly read
> "**pinned, quote** (was `unverified` until 2026-08-22)" - which contains BOTH words, so any script
> classifying rows by substring counted it twice and produced 10 + 11 + 3 = 24 over 23 rows. **A status
> cell must name one state.** The history belongs in the notes, not in the field being counted. A correction that is itself wrong is worse than the error
> it replaced, because it carries the authority of having been checked.

**None of these is a defect to fix in this release.** ADR 0055 D4 and the v1.16.0 plan are explicit: where a boundary rests on nothing, that is a **finding to file**, and reassigning a tier is its own ADR with a migration window. This file's job is to make the eleven visible for the first time.

**Ordered by value, the three worth closing first:**

1. **The Codex hook subset** - the Advanced tier requires hooks and the subset is dated never.
2. **The Codex subagent absence** - already quotable, never landed, one candidate claim away.
3. **The two Cowork accommodations** - either probe them so they acquire an expiry, or find a page and pin a quote. Doing neither leaves two shipped checks resting on memory.
