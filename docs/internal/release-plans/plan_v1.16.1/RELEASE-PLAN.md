---
title: "v1.16.1 - the plan, written after the work rather than before it"
---

# v1.16.1 - release plan

**This plan is written after the work, and that is worth stating rather than disguising.**

Every prior release in this repository was planned first: a decision pack, workstreams, then code. v1.16.1 was not. Its contents are four defects found by looking at the repository from a reader's position, plus the documentation changes that looking produced. There was no forward plan because there was no forward intent - the work was reactive, and a plan document backfilled into the past tense would be a false record of how it happened.

What follows is therefore the scope as it settled, and the reasoning that kept it a patch.

## Scope

Four fixes and one addition, all listed in [`README.md`](README.md) and in full in `CHANGELOG.md`.

The release exists for one of them: **`G2` refused the only command a non-vendoring plugin can run**, so Gold was unreachable for anyone who installed the way the documentation says to. That is a user-facing bug with no workaround short of vendoring the whole toolkit, and it is the reason this is cut now rather than folded into v1.17.0.

## Why a patch and not a minor

The version rules for this repository put a Standard revision or a spine change into a minor. Neither happened:

- **No check added, none removed.** The spine stays at 34.
- **The Standard stays at 0.15**, unrevised. `STANDARD.md` sec 2.6 already asked for CI that runs the suite *via the portable scripts*; only the checker disagreed with its own Standard.
- **No requirement changes for any plugin.** The `G2` change is strictly loosening - it can move a plugin from failing to passing and never the reverse.

That last point was measured, not argued: five sibling plugins graded identically before and after.

The precedent is established - 1.12.1, 1.11.1, 1.10.1, 1.6.1, 1.5.1 and 1.4.1 are all patch cuts in this line.

## What is deliberately out

Three items carried over from v1.16.0 stay open, and none is a candidate for a patch:

- **E51** is ADR-gated. A decision comes first.
- **E48 and E49** land new vendor claims. That went wrong twice in v1.16.0, once in a way that would have blocked every future release the first time a vendor re-rendered a page. It needs a session with full claim discipline, not a corner of a patch cut.
- **E52** is a choreography ordering problem, and changing the choreography during a cut is the wrong moment.

## Acceptance

The standing pre-cut gate, unmodified: `npm test` and `node scripts/check.mjs .` both exit 0, `release-ready` reports every blocking gate green, the four-lens adversarial panel has been run over every substantive PR merged since `v1.16.0` with no finding left open, and `CHANGELOG.md` `## [Unreleased]` lists every merged change.

Publication is verified from published state only - the registry, the release page and a clean install outside this repository - never from the working tree.
