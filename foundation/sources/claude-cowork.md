---
title: "Source record - Claude Cowork / Desktop"
---

# Claude Cowork / Desktop

| | |
| --- | --- |
| **Surveyed through** | `v1.32885.1` (verbatim vendor label) |
| **Surveyed on** | 2026-08-18, by jprisant |
| **Method** | `read` |
| **Release feed** | `https://claude.com/docs/cowork/changelog` |
| **Docs index** | `https://claude.com/docs/llms.txt` |

Release notes for Claude Desktop, covering both Cowork and Claude Code sessions. **31 entries in the window were read.**

## The record that matters most here is a gap

**Two checks in this Standard bend around Cowork behaviours, and both behaviours are undocumented by the vendor.**

| Check | The accommodation | Grounded in |
| --- | --- | --- |
| `U6` | skips Cowork's `computer:` local-artifact scheme | **nothing first-party. `unverified`** |
| `U11` | tolerates the managed-connector pattern, where the host supplies an endpoint at run time | **nothing first-party. `unverified`** |

**These rows say `unverified` rather than being omitted, and that is the whole discipline.** An absent row would read as "no accommodation here." An `unverified` row reads as "two shipped checks bend around behaviour nobody can cite", which is a finding.

**What that means in practice.** Both accommodations are almost certainly correct - they were derived from real artifacts that real users produced. But neither can be defended by pointing at a page, so if the vendor changes either behaviour, nothing in this repository will notice. There is no quote to re-read and no probe whose age expires.

**The honest options are two**, and this record does not choose between them: write a probe with a reproduction so the claims acquire an expiry, or find a first-party page that states the behaviour and pin a quote. Doing neither leaves the accommodation resting on memory.

## Cadence, and why this is a human survey rather than an automated diff

Measured 2026-08-18: Cowork's changelog carried **31 entries** in a single window, while Claude Code moved from `2.1.206` to `2.1.235` in the same period.

**An alarm firing weekly on entries that almost never matter trains its reader to close it unread**, and then the existence of the alarm is itself false assurance. That is the same reasoning behind pinning sentences in [`../claims/vendor-claims.json`](../claims/vendor-claims.json) rather than hashing whole pages.

## What this surface holds up

`U6`'s `computer:` scheme exemption, `U11`'s managed-connector tolerance, and the Cowork-relevant rows of [`../synthesis/capability-matrix.md`](../synthesis/capability-matrix.md).
