# standards-watch - the upstream pin

The recorded starting point for the tracking claim in [`STANDARD.md`](../../../STANDARD.md) sec 6:
**where agentskills.io evolves, the Universal tier MUST track it; higher tiers remain this Standard's
domain.**

Before this folder existed, that MUST had no implementation and no evidence. No upstream revision was
recorded anywhere, so "has the spec changed since we wrote the Universal tier?" was not a question the
repository could answer, let alone answer deterministically.

## What lives here

> **MOVED 2026-08-20 (v1.16.0 W2).** The pin now lives at
> [`../../../foundation/claims/upstream-pin.json`](../../../foundation/claims/upstream-pin.json), per
> ADR 0055 (the `foundation/` layout). This folder keeps the guide only.

- [`upstream-pin.json`](../../../foundation/claims/upstream-pin.json) - the pin. Schema `askit-upstream-pin/1`: which upstream
  artifacts are watched, the git blob SHA-1 of each at verification time, the extracted structural
  surface of the specification, and the map from an upstream field, directory, or section to the
  `reqId`s a change there lands on.

## Reading the pin

The one field that gets misread: `upstream.declaresOwnVersion` is `false`. The upstream publishes no
version number and cuts no git tags or GitHub releases, so there is no version string to pin and the
pin is content-addressed instead. Every `blobSha` is reproducible with `git hash-object` on the fetched
file, by anyone, without this toolkit.

`library.json` `standard` (`"0.12"`) is a **different number entirely**: it versions this Standard's own
ruleset and drives the sec 7.7 pinned-version gate. Nothing here changes it.

## Changing it

Not by hand, and not as a side effect of a run. `npm run standards-watch -- --emit-pin` prints the
proposed document to stdout; a human reviews it and saves it, normally in the same pull request as the
ADR that motivated the re-pin. The tooling is write-incapable by construction and a unit test enforces
that (`tests/unit/standards-watch.test.mjs`).

The skill that operates all of this is `skills/askit-standards-watch/`; its public page is
[`docs/reference/askit-standards-watch.md`](../../reference/askit-standards-watch.md).
