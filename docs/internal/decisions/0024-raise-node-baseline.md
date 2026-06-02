# 0024 - Raise the runner Node baseline from EOL Node 20 to Node 22.12 (pin 24)

## TL;DR
- **Decision:** The portable check-runner Node baseline (STANDARD.md sec 4.1) moves from `>=20` to `>=22.12.0`; the recommended pinned runtime (`.nvmrc` / `.node-version`) is `24`.
- **Why:** Node 20 reached end-of-life (2026-04-30) and Astro 6, the basis of every family documentation site, requires `>=22.12.0`, so the published `>=20` baseline points downstream plugins at an unsupported, sub-Astro-floor runtime.
- **Status:** Proposed (lands with Standard v0.9).

- **Status:** Proposed
- **Date:** 2026-06-01
- **Deciders:** maintainer (governance)

## Builds on
- STANDARD.md sec 4.1 (CI-agnostic runner) - the clause this amends.
- The forthcoming documentation-site clauses (proposed Section 14, not yet landed in STANDARD.md): every family site is built on Astro 6, which requires Node `>=22.12.0`, and the principle that a co-located plugin core's runtime floor follows sec 4.1 (the documentation site does not dictate it).

## Context and problem statement
STANDARD.md sec 4.1 specifies that the portable check-runner targets a "baseline Node >= 20 (LTS)," chosen to maximize install base rather than chase new built-ins. That baseline, the engines example (Section 5), and the resolution log (Appendix A) all still read `>=20`. Two facts have since invalidated it:

1. **Node 20 reached end-of-life on 2026-04-30**, so it no longer receives security or maintenance updates.
2. **Astro 6**, which every family documentation site is built with (the proposed Section 14 site clauses), requires Node `>=22.12.0` and dropped Node 18 and 20.

So the published Standard recommends an EOL, sub-Astro-floor runtime as its baseline. This was surfaced during the agent-skills-toolkit site rollout, which correctly declined to amend a normative doc inside a scoped site PR and deferred it to this deliberate change.

## Decision drivers
- The published baseline must not recommend an end-of-life runtime.
- The baseline must satisfy the floor the family's own documentation sites (Astro 6) require.
- The Standard sets a floor; requiring stricter is already allowed, so this corrects a stale floor rather than introducing a new kind of constraint.
- Reproducibility: a single pinned version (engines plus a committed `.nvmrc`) ends resolved-version drift.

## Considered options
1. **Raise the baseline to `>=22.12.0`, pin `24`.** (chosen)
2. **Leave sec 4.1 at `>=20`.** Rejected: because stricter-than-floor is allowed there is no formal conformance break, but the published Standard keeps recommending an EOL runtime, which is a real defect that misleads new plugins.
3. **Raise to `>=22.12.0` but pin `22`.** Rejected: Node 22 reaches EOL in April 2027 (under a year), whereas Node 24 is Active LTS to April 2028, so `24` buys more runway at no cost; Astro supports even-numbered majors.

## Decision outcome
Chosen: **option 1.** STANDARD.md sec 4.1, the engines example, and the resolution log change from `>=20` to `>=22.12.0`; the recommended pinned runtime is `24`, declared via a committed `.nvmrc` / `.node-version`. This lands as **Standard v0.9**. A co-located plugin core and its site share this floor: the core's runtime floor follows sec 4.1, not the site build (the principle the forthcoming Section 14 site clauses will state).

## Consequences
- **Positive:** the published baseline matches reality (the Astro 6 floor) and a supported runtime; new plugins target a non-EOL Node; resolved-version drift ends.
- **Negative (breaking-ish):** raising a floor is a breaking change for any consumer pinned below 22.12. Pre-1.0 this is acceptable and is why the Standard moves to 0.9. Downstream plugins re-pin `library.json` `standard: "0.9"` on their own cadence.
- **Neutral:** plugins already requiring stricter (for example Node 24 documentation sites) were conformant before and remain so.
