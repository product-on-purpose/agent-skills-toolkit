---
title: "v1.16.1 - a patch that unblocks Gold for anyone who did not vendor the gate"
---

# v1.16.1 - the packet

**Written 2026-08-24 at `f419575`.** Six commits since `v1.16.0`; **66 files changed, 574 insertions, 152 deletions.**

This is a patch, not a minor. No check is added, none is removed, the spine stays at 34 and the Standard stays at 0.15. What changed is that one existing check stopped refusing a command it should always have accepted.

## Numbers, measured at `f419575` and not inherited

| | |
| --- | --- |
| Version manifests | **`1.16.1`** across all four |
| Standard | **0.15**, unchanged. No Standard revision in this release |
| Spine | **34**, unchanged. **No check added, none removed** |
| Skills | **26**, unchanged. One skill's own version moves, `askit-build-docs` 0.1.0 to 0.2.0 |
| Suite | **1399 tests, 0 failures**, 1 skipped (POSIX-only). It read **1388** at the `v1.16.0` tag; the eleven added are five for `G2`'s new accepted forms, four for the `vendor-watch` undeclared-source rule, and two for `readPin`'s three states |
| Gate on this repository | **Advanced, 0 errors, 0 warnings** |
| Sibling plugins | **5 graded before and after the `G2` change. None moved** |

## Why this release exists

**A plugin that installed the way the documentation says to could not reach Gold.**

`G2` (`self-hosting`) recognised one spelling of the conformance gate: the literal path `scripts/check.mjs`, or an npm script resolving to it. Both require a vendored copy of this toolkit. The install documentation sends people to npm or the plugin marketplace, where no `scripts/` directory exists, so the only command those users can run in CI was the one `G2` refused.

That was proven before it was fixed. A minimal plugin whose workflow runs `npx agent-skills-toolkit .`, declaring the default `selfValidation`, returned exactly one `G2` error.

**It is an implementation narrower than the rule it enforces.** `STANDARD.md` sec 2.6 asks for CI that runs the tier-applicable suite *via the portable scripts*, and `npx` runs precisely those scripts from the published package. `library.json` already carries `selfValidation`, whose absent value means `"npx"` and which the Standard documents as correct for every plugin that consumes a conformance toolkit rather than vendoring one. `gen-index` honours that setting; `G2` never read it.

So it is **E35 one level up**: the same "a remediation naming a command its reader does not have" defect that was fixed for `gen-index` at v1.13.0 and never swept into the check.

## What is in it

Four fixes and one addition. Full detail in `CHANGELOG.md`.

- **`G2` accepts five spellings of the same gate** - the npx form, the installed bin invoked directly, an `agent-skills-toolkit` GitHub Action from any owner, the vendored path, and an npm script running any of them. The last two were undocumented until the four-lens review found the contract narrower than the behaviour. Each requires the gate to be invoked rather than named, so `npm install agent-skills-toolkit` still fails and a fixture pins that.
- **`vendor-watch` no longer exits 0 on a claim nothing can check** (E54). A typo'd `source` id made a claim permanently uncheckable while the gate reported success, in one of the five gates `release-ready` blocks a tag on.
- **`check-parity`'s `readPin` distinguishes an absent pin from a corrupt one** (E55, in part). E55's central claim was wrong and its backlog entry now says so.
- **A golden example no longer labels a reconstruction `Verbatim`** (E53).
- **Four writing rules in `askit-build-docs`**, each traceable to a defect found in this repository's own public documentation.

Plus two plain-language documentation passes: 88 commands across 37 pages made runnable from the reader's position, a page that had been false for three months corrected, and glossary routing fixed in navigation rather than on 74 pages.

## What no plugin has to do

**Nothing.** No check is added or removed, and no requirement changes. The `G2` change can only move a plugin from failing to passing, never the reverse, and that was measured rather than assumed: five sibling plugins graded identically before and after.

## What this release does not fix

The three items left open from v1.16.0 remain open, deliberately.

- **E51** (`G8` silently passes an unreadable README) is ADR-gated and needs a decision before any code moves.
- **E48 and E49** would land new vendor claims. Claim-landing went wrong twice during v1.16.0, once in a way that would have blocked every future release, and it deserves a session with full claim discipline rather than a corner of a patch cut.
- **E52** (a shipped release's packet is rewritten by in-flight work) recurred twice more during this cycle and is recorded on its entry each time. It is a choreography ordering problem, not a numbers problem.
