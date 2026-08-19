# Surfaces (reference)

The static index of what a survey reads. **Every URL here was reached by search or redirect and then fetched; none is constructed by pattern.** If a surface is not listed, it is not surveyed - add it here in its own change, with the date you confirmed it, before relying on it.

Last confirmed reachable: **2026-08-18**.

## The four surfaces

| Surface | Release feed | Docs index | What in this repository depends on it |
|---|---|---|---|
| **Claude Code** | `https://code.claude.com/docs/en/changelog` (append `.md` for plain markdown) | `https://claude.com/docs/llms.txt` | `U14` restricted fields, `U15` agents-dir-registerable, `STANDARD.md` sec 3.2's commands-into-skills premise, ADR 0051's namespacing condition, most of the capability matrix's Claude column |
| **Claude Cowork / Desktop** | `https://claude.com/docs/cowork/changelog` | `https://claude.com/docs/llms.txt` | `U6` skips its `computer:` local-artifact scheme; `U11` tolerates the managed-connector pattern where the host supplies an endpoint at runtime. **Both behaviours are currently undocumented** - see the warning below |
| **Codex** | `https://developers.openai.com/codex/changelog`, plus `https://github.com/openai/codex/releases` | docs pages serve `.md` variants | the `.codex-plugin/plugin.json` emitter, `S6` per-target-presence, `U8` manifest-drift, the capability matrix's Codex column |
| **agentskills.io spec** | tracked by blob pin, not by a feed | - | the entire Universal tier (`STANDARD.md` sec 6) |

## Three things to know before you read any of them

**The version labels are the pin.** Claude Code entries carry a label such as `2.1.235` with a date; Cowork carries `v1.32885.1`. Those strings are what `surveyed-pin.json` stores. Codex releases are versioned on GitHub. The spec surface has no versioned feed at all, which is why `askit-standards-watch` pins a git blob SHA-1 instead and stays a separate skill.

**`llms.txt` is a documentation INDEX, and it is the reason step 4 of the procedure is possible.** It enumerates the available pages, so a survey can discover the documentation surface rather than guessing at paths - and a page appearing or disappearing is itself an observable event.

**Hosts move.** `developers.openai.com/codex/plugins.md` returned a **308** to `learn.chatgpt.com/docs/plugins.md` on 2026-08-18. Follow redirects, record the move as an `environmental` finding, and update this table in the same change. A host move is a documentation edit, not a change of meaning - the same note `vendor-claims.json` already carries for the equivalent Claude Code move.

## The volume, so nobody designs an alarm around it

Measured 2026-08-18: Claude Code moved from `2.1.206` to `2.1.235` inside one changelog window, and Cowork's changelog carried 31 entries. **That cadence is why this is a periodic human-driven survey and not an automated diff.** An alarm firing weekly on entries that almost never matter trains its reader to close it unread, and then the existence of the alarm is itself false assurance. The same reasoning is why `vendor-claims.json` pins sentences instead of hashing pages.

## The Cowork warning, stated because it costs

`U6` and `U11` both accommodate Cowork behaviour, and **a search of Cowork's changelog on 2026-08-18 found no mention of the `computer:` URI scheme at all.** The connector language present there is about settings and UI, not the endpoint-supplied-at-runtime pattern `U11` tolerates.

So two shipped checks currently rest on behaviour with no quotable source. When surveying Cowork, **spend the search for a documented statement before concluding there is none** - a documented behaviour becomes a `quote` claim and costs nothing recurring, whereas a `probe` claim's age is its whole verification and blocks releases on a 30-day window. Never file a probe whose reproduction nobody will actually re-run.

## Adding a surface

Three things, or do not add it: the feed URL confirmed by fetching it, the docs index or a note that there is none, and **a named thing in this repository that depends on it.** A surface nothing depends on is a subscription, not a watch, and it will be surveyed once and then ignored.
