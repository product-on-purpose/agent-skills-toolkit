---
title: "foundation/claims - the machine-checkable subset, and which gates read it"
---

# foundation/claims

The machine-checkable subset of [`../sources/`](../sources/README.md): facts about the outside world in a format a gate can parse.

**Membership here is a FORMAT, not a readership.** A file belongs in this folder because it is machine-checkable data recording facts about the outside world, not because something currently reads it. That distinction is [ADR 0055](../../docs/internal/decisions/0055-the-evidence-gets-an-address-and-gate-readership-is-recorded-not-inferred.md) D1a, and it exists because the obvious alternative was already false.

## Which gates read what

**This table is the point of the folder.** The question "can editing this break a gate?" used to be answered by inference from where a file sat. Measured on 2026-08-20, that inference was **wrong for one of the three files here** - so the answer is recorded per file instead, where it can be checked.

| File | Read by gate code | Also read at run time by |
| --- | --- | --- |
| `vendor-claims.json` | `scripts/vendor-watch.mjs` (`CLAIMS_REL`), `tests/unit/vendor-watch.test.mjs` | - |
| `upstream-pin.json` | `scripts/lib/standards-watch.mjs` (`PIN_REL`), **`scripts/check-parity.mjs`**, `tests/unit/check-parity.test.mjs`, `tests/unit/standards-watch.test.mjs` | `askit-standards-watch` |
| `surveyed-pin.json` | **none. No gate reads this file.** | `askit-capability-whats-new`, `askit-capability-gap-analysis` |

**`none` is a legal value and not a deletion notice.** `surveyed-pin.json` is read by skills at run time, and an agent following a skill is a reader; it simply cannot break a build. Whether it should gain a gate reader, or move to `sources/` as a human-read record, is an open question that ADR 0055 deliberately left open.

**`check-parity.mjs` is bold because it is the one this repository nearly lost.** It assembles its path from separate segments:

```js
path.join(root, "foundation", "claims", "upstream-pin.json")
```

A grep for the directory string cannot match that, which is exactly how ADR 0055's own "complete list" came to omit it. **A path assembled from segments is invisible to a path-string search.**

**And there is a third shape, which adversarial wave 1 found after both of those searches had been run.** `tests/unit/standards-watch.test.mjs` reaches the pin through the **exported `PIN_REL` constant**:

```js
const pin = readPin(REPO_ROOT, PIN_REL);
```

That names no path at all, so it is invisible to a search for the path string **and** to a search for `path.join` segments - the two techniques added precisely to stop missing readers. **A reader can reach a file by literal, by assembled segments, or by an exported constant.** Only a search for the constant's own name finds the third. **Anyone adding a reader should add it to this table by hand rather than trusting any grep to find it later.**

**And it would have failed silently.** `check-parity.mjs` falls back to *"upstream-pin.json not found or unparseable; pin-skew comparison skipped"* and exits 0. A wrong path there does not turn the build red; it quietly switches off the comparison. Verify a change here by confirming the tool **prints the pin's verified date**, not by confirming it exited 0.

## Two asymmetries worth knowing before you edit anything

**A probe's age IS its verification, and it blocks releases.** `vendor-claims.json` holds two kinds of claim. A `quote` is a sentence that must still appear on a vendor's page, re-read on every `npm run vendor-watch` run, so it never goes stale silently and never blocks while it holds. A **`probe`** is an empirical behaviour no page states; there is nothing to re-read, so past the 30-day freshness window it exits 1 and blocks every release until a human re-runs the experiment. Reproductions are at [`../../docs/internal/vendor-watch/probes/`](../../docs/internal/vendor-watch/probes/).

**A survey's age blocks nothing, deliberately.** An old `surveyed-pin.json` means work is waiting, not that a claim expired. Collapsing the two would either jam releases on something nobody re-read, or quietly weaken the probes.

**Never advance a date without re-running the thing it dates.** The date is the entire verification; a date nobody earned is a false claim in a file whose only job is to hold true ones.

## Inventory

- `surveyed-pin.json` - per surface, the last release a human has actually READ, as a verbatim vendor version string. No gate reads it.
- `upstream-pin.json` - the agentskills.io pin, content-addressed by git blob SHA-1 per artifact because the upstream publishes no version and cuts no tags.
- `vendor-claims.json` - eight pinned claims (6 `quote`, 2 `probe`) across three vendor pages, each carrying what depends on it and what to do when it changes.
