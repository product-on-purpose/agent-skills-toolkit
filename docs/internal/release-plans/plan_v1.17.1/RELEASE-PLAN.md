---
title: "v1.17.1 release plan - the records patch"
---

# v1.17.1 - release plan

**Class: patch.** Cut 1 of the resolution plan ratified 2026-08-31. Precedent for shipping internal
guards in a patch: v1.10.1.

## Scope, as ratified

| Spec | Item | State |
| --- | --- | --- |
| RS-A1 | Accept the `command` marketplace source kind | shipped |
| RS-A2 | Repair four phantom claim citations, and E52's Status bullet | shipped |
| RS-B4 | The claim-id reference guard (same change as RS-A2, by hard ordering) | shipped |
| RS-A3 | Regenerate the family registry at the pins | shipped; live-page criterion open until deploy |
| RS-A4 | Nine execution files stop calling E4 and E9 "stretch" | shipped |
| RS-F1 | ADR 0057, no forward version numbers | shipped |
| RS-F2 | The audit-intake index | shipped |

Deliberately NOT in this cut, per the ratified plan: RS-D2's Marketplace listing, which the 2026-08-31
ruling moved to cut 2 so that it lands AFTER RS-D1 gives the Action a consumer-position test. RS-C1 owns
the Codex event-count content in the same three synthesis files this cut edited; only the citation was
touched here.

## Gates

- Suite green (1446, 0 failures, 1 skipped).
- Gate Advanced 0/0.
- `release-ready` green across all five of its gates.
- Codex round-trip run and passing (`codex-cli 0.144.5`).
- Adversarial review completed, its three gating defects fixed before merge.

## The tag route

Pushed tag fires `publish-npm.yml`, which stops at the `npm-publish` environment's required reviewer.
Both environment rules are load-bearing: remove the reviewer and tags auto-publish; remove the `v*`
type:tag policy and every tag-triggered publish fails with zero steps and no log.
