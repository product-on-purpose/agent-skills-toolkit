---
title: Vendor watch
---

# Vendor watch

This repository asserts vendor behaviour as **fact**, in normative text and in shipped findings. `U14`
quotes a Claude Code sentence in every finding it emits. `U15`'s provenance is `vendor-cited` because it
rests on how the runtime discovers subagents. `STANDARD.md` sec 3.2 explains itself by reference to how
commands are invoked. Each of those was, until now, a page somebody read once and a date they wrote down.

## Why it exists

On **2026-08-15**, ADR 0048 was found to rest on a premise Claude Code's own documentation contradicts:
it asserted that a command is not a skill, and the vendor says *"Custom commands have been merged into
skills."* The decision survived on better reasoning, but the premise was false for the whole day it was
ratified - and a **2026-08-10 internal audit had already found it.** The evidence existed. Nothing was
re-reading it.

A watch turns "somebody should re-check that" into a scheduled, failing signal.

## What it checks, and what it deliberately cannot

Claims come in two kinds, and the difference is honest rather than cosmetic.

- **`quote`** - a sentence that MUST still appear on a named page. The watch fetches and checks it.
- **`probe`** - an empirical behaviour that **no page states**, established by running something. No fetch
  can confirm it. The watch reports its AGE and names its reproduction, and never claims to have verified
  it. `U15`'s "Claude Code registers every `.md` under `agents/`" is a probe claim: it was established by
  installing a plugin and looking at what registered.

  **Every probe now ships its experiment.** [`probes/`](probes/) holds installable fixtures, tested
  commands, and a per-probe run log of what each execution observed. A reproduction described in one
  sentence is enough to remember what was done and not enough to do it again in five minutes, which is
  what a task recurring every thirty days actually needs.

It pins **claims, not pages**. A page hash would fire on every navigation and CSS change and be ignored
within a month; what this repository depends on is specific sentences, so those are what is pinned.

## Running it

```bash
npm run vendor-watch                       # against the live pages
node scripts/vendor-watch.mjs . --json     # the machine report
node scripts/vendor-watch.mjs . --snapshot-dir <dir> --today 2026-08-15   # offline and reproducible
```

**Exit codes:** `0` every claim holds and none is stale. `1` a human must look. `2` **refused** - a page
could not be read, so the run proved nothing about it. Refusal outranks a clean result, deliberately: a
watch that passes because it could not reach the page is worse than no watch.

## What to do when a claim fails

**Do not update `vendor-claims.json` first.** Every claim carries a `dependsOn` list and an `onChange`
instruction, because the answer differs per claim: some vendor changes are green-ward and are a silent
re-read, others are a Standard revision that needs an ADR and a pin-gated migration window (ADR 0044).
`U14`'s entry states the asymmetry explicitly.

The watcher is **write-incapable by construction** - it imports only `readFileSync` and emits to stdout,
and [a test](../../../tests/unit/vendor-watch.test.mjs) fails the build if any write API appears in
either module. A watcher that can amend the claim it watches turns a governed decision into a silent one.

## Inventory

- `vendor-claims.json` - the pinned claims, their sources, what depends on each, and what to do when one
  fails.
