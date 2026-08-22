---
title: "Source record - the agentskills.io specification"
---

# agentskills.io specification

The upstream the Universal tier tracks. `STANDARD.md` sec 6 states as normative text that **where agentskills.io evolves, the Universal tier MUST track it**; higher tiers remain this Standard's domain.

| | |
| --- | --- |
| **Surveyed through** | **no versioned feed.** Tracked by content hash, not by version |
| **Verified on** | 2026-08-11, by an `askit-standards-watch` run reviewed under ADR 0040 |
| **Method** | `tool` - GitHub API (`git/trees` and `contents`) for the blob SHAs, **re-derived locally with `git hash-object` on the fetched bytes**; the published page at `https://agentskills.io/specification.md` was read alongside and matches `docs/specification.mdx` in substance |
| **Repository** | `https://github.com/agentskills/agentskills`, ref `main` |
| **Published spec** | `https://agentskills.io/specification` |
| **Upstream HEAD at verification** | `69ef37e9424c0a7ea9dd2293b559e43ec8176379` |

**That `method` value is the strongest in this folder, and it is worth saying why.** It does not merely report what an API returned: the blob SHAs were **re-derived locally from the fetched bytes**, so the pin does not depend on trusting GitHub's own hash, and the published page was read alongside the repository source to confirm the two agree in substance. Two independent identities, both checked.

## Why this surface is pinned by hash rather than by version

**The upstream publishes NO version number and cuts NO git tags or GitHub releases.** Verified 2026-07-27: `gh api repos/agentskills/agentskills/tags` and `.../releases` are both empty.

There is therefore no upstream version string to pin, which is why [`../claims/upstream-pin.json`](../claims/upstream-pin.json) pins **content hashes** instead. **If the upstream ever starts versioning itself, re-pinning to that version is strictly better** and the pin file should record the change.

This is also why `askit-standards-watch` is a separate skill from `askit-capability-whats-new`: every other surface has a release feed and this one does not.

## The four pinned artifacts

| Path | Role | Touches |
| --- | --- | --- |
| `docs/specification.mdx` | normative prose | `U3`, `U4`, `U5`, `U6`, `U7` |
| `skills-ref/src/skills_ref/validator.py` | reference implementation | validator parity |
| plus two further `skills-ref` sources | reference implementation | validator parity |

`docs/specification.mdx` is the complete format specification for Agent Skills: what `STANDARD.md` sec 3.1 restates, and what the Universal tier claims to be a strict superset of. Its last upstream commit at pin time was `217be548` (2026-08-04, *"clarify metadata"*), re-pinned under [ADR 0040](../../docs/internal/decisions/0040-re-pin-agentskills-after-an-editorial-metadata-clarification.md).

## A measured skew that is expected, not a defect

The pin tracks the `skills-ref` files by **git blob SHA-1 of their source bytes on the default branch.** `scripts/check-parity.mjs` runs a **different identity**: the currently-installed PyPI release.

**These are not expected to agree.** A release is cut at one point in history and does not follow the upstream branch. So the harness **reports both and flags skew rather than asserting equality** - all three reference-implementation files were skewed when last measured, and that is the system working.

## What this surface holds up

The entire Universal tier (`STANDARD.md` sec 6), and through validator parity, the claim that a conforming plugin is accepted by the upstream's own reference implementation.
