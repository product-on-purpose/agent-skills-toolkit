# P6 - docs-presence (G10) + G7 renumber + STANDARD v0.10 + v1.1.0 release - PRD

> The final phase of the ADR 0024 build-out: land the `docs-presence` Gold check (`G10`), close out the `G7`-inclusion renumber, advance `STANDARD.md` to v0.10 with the full `U12` + `G7-G10` requirement set and the required-checks-by-tier list, bump the version to `1.1.0`, regenerate every generated artifact, correct the stale "26-check / G1-G7" wording to "30-check / G1-G10", and cut the `v1.1.0` release plus the marketplace re-pin. Read with [`../SPEC.md`](../SPEC.md) (R-CHECK-G10, R-G7FIX-1/2, R-STD-1/2), [`../CHECKS-SPEC.md`](../CHECKS-SPEC.md) ("G10 docs-presence" + "The G7 inclusion renumber"), and [ADR 0024 (documentation depth and discoverability)](../../../decisions/0024-documentation-depth-and-discoverability.md) (D4, D6).

## Problem / motivation

ADR 0024's driver is three-fold: **depth** (a real dual-audience Diataxis set, not a half-shipped one), **discoverability** (a generated docs site, frontmatter taxonomy, folder READMEs), and **non-vacuous tiers** (every Gold requirement is backed by a deterministic module the toolkit passes against itself). Phases P0-P5 author the artifacts and flip four of the five new checks (`U12`, `G7`, `G8`, `G9`). Two pieces remain, and they are exactly the pieces that make the build-out a release:

1. **The last lifecycle-rigor check is missing.** `docs-presence` (`G10`) is the check that asserts the documentation set is actually *complete and coherent*, not merely well-formed page by page: the four Diataxis quadrants exist and are non-empty, every Architecture Decision Record carries the mandatory `## TL;DR` summary, and the architecture overview page links to its detailed companion. Without `G10`, a Gold-claiming library could ship an empty `tutorials/` quadrant, an ADR with no decision summary, or an orphaned architecture overview and still pass the gate - precisely the "greenlight a hollow stub" failure the toolkit exists to prevent (Design Principle 3). `G10` closes that gap as a *presence and linkage* check, never a quality judgment.

2. **The Standard, the version, and the wording are mid-flight.** P2a already advanced `STANDARD.md` to v0.10 with `G7` reclassified to `docs-frontmatter` and the spine recorded as **26** (`G1-G7`). That is a way-station, not the destination: the v0.10 text still says "Further docs-depth checks (`U12`, `G8-G10`) land across the v1.1.x build-out" and the spine count is **26**, not the **30** the program targets. P6 finishes the job - `U12` and `G8-G10` become normative requirements, the spine count moves to **30 (`U1-U12` / `S1-S8` / `G1-G10`)**, `library.json`/`package.json` move to `1.1.0`, and every stale count is corrected.

Why it matters to a **plugin author**: `G10` ships as reusable Gold capability, so any library a user grades is held to the same documentation-completeness bar the toolkit holds itself to, with a deterministic, zero-model, copy-anywhere check. Why it matters to the **toolkit as the reference implementation**: a conformance toolkit that ships an incomplete docs tree, a TL;DR-less decision record, or a stale "26 checks" claim undercuts its own thesis. P6 is the phase that makes the 30-check spine real, self-proving, and released.

## Goals

- Add `scripts/checks/docs-presence.mjs` (Gold, `reqId: G10`): a synchronous, deterministic, zero-model module asserting the three facts in R-CHECK-G10, with golden + anti fixtures and unit tests, registered in the tier registry.
- Finish the `G7`-inclusion renumber close-out (R-G7FIX-1): confirm `STANDARD.md` sec 2.6 states tier inclusion as an **unnumbered** structural property and `G7` denotes `docs-frontmatter` (largely done in P2a; verify and finish any residue).
- Advance `STANDARD.md` to the final **v0.10** surface (R-STD-1): `U12` + `G8-G10` added as normative requirements alongside the already-present `G7`; the required-checks-by-tier list in sec 4.2 updated; the docs frontmatter taxonomy confirmed in sec 8.4; a version-history note recording the completion; the spine count corrected from `26` to `30`.
- Bump `library.json` `version 1.0.0 -> 1.1.0` (standard already `0.10`) and `package.json` `version -> 1.1.0` (R-STD-2); regenerate native manifests, `manifest.generated.json`, and `INDEX.md`.
- Add `G8`, `G9`, `G10` rows to `docs/reference/gold-checks.md` and correct its `G1-G7` header to `G1-G10`.
- Correct every stale "26-check / G1-G7" (and any residual "25-check") claim to "30-check / G1-G10" across `README.md`, `AGENTS.md`, `docs/internal/STATUS.md`, badges, and docs (R-G7FIX-2): a repo grep finds no stale count in tracked human docs.
- Move `CHANGELOG.md` `[Unreleased] -> [1.1.0] - 2026-06-03`; add the `RELEASE-NOTES.md` 1.1.0 section.
- Leave `main` green: `node scripts/check.mjs` -> Advanced 0/0 with the **30-check spine** (`U1-U12` + `S1-S8` + `G1-G10`); `npm test` green; the site builds; the 14.11 guards pass.
- Cut the release: tag `v1.1.0` (minted by `release.yml` behind the version-consistency guard) and re-pin the `agent-plugins` marketplace entry (`sha -> v1.1.0` commit, `version 1.0.0 -> 1.1.0`, registry `metadata` minor bump, `validate-registry` green).

## Non-goals

- **No quality judgment in the gate.** `G10` asserts *presence and linkage* only: a Diataxis dir is non-empty, an ADR has a `## TL;DR` heading, the overview page contains a resolvable link to the detailed page. Whether the tutorial teaches well, the TL;DR is a good summary, or the architecture prose is clear routes to the behavioral `askit-evaluate` path, never the deterministic gate (Design Principle 3, ADR 0024 D4).
- **No new content authoring.** The Diataxis quadrants, the architecture overview+detailed pair with its `doc-role` markers and the cross-link, and the ADR TL;DRs are authored in P1 (and already present on `main` for the toolkit's own tree). P6 *enforces* what P1 authored; it does not write new docs. If a probe shows missing content, that is a P1 regression to fix, not new P6 scope.
- **No re-litigation of the version line.** The v0.9-vs-v0.10 reconciliation is settled (PROGRAM-PLAN sec 2; v0.9 is taken by ADR 0025). P6 lands v0.10; it does not reopen the number.
- **No marketplace mechanics invention.** The re-pin reuses the v1.0.0 launch mechanics verbatim (a one-line sha+version update); P6 does not redesign the registry flow.
- **No `G6` de-vacuuming.** `G6` (deprecation) stays vacuous until a component is first deprecated; that is a standing follow-up, out of scope here (PROGRAM-PLAN sec 6).
- **No new prefix skills, no new `askit-` entries** (ADR 0024 D5).

## Users and value

- **The plugin author / library maintainer** gains `G10`: a portable, deterministic check that catches an incomplete Diataxis tree, a decision record with no summary, or an orphaned architecture overview - before a Gold claim is made. It ships as reusable capability, gradeable against any library.
- **The toolkit maintainer** gets a self-proving 30-check spine, a single coherent `STANDARD.md` v0.10, consistent version stamps across all five version-bearing files, and a clean grep with no stale counts - the credibility surface the whole build-out exists to produce.
- **The downstream consumer** (anyone who installs `agent-skills-toolkit@product-on-purpose`) gets the `v1.1.0` release and the re-pinned marketplace entry, so the install resolves to the documentation build-out.
- **The reader of the docs site** benefits indirectly: `G10` guarantees the Diataxis quadrants the site generates from are all populated, so no quadrant renders empty.

## Scope

What lands in this phase (one PR against protected `main`, plus the post-merge tag and the separate marketplace PR):

- **The check:** `scripts/checks/docs-presence.mjs` + `tests/fixtures/golden/docs-presence-ok/` + three anti fixtures (`docs-presence-empty-tutorials`, `docs-presence-adr-no-tldr`, `docs-presence-arch-unlinked`) + `tests/unit/docs-presence.test.mjs` + the registry registration line + the import.
- **Numbering integrity:** confirm/add the reqId-uniqueness assertion so `G10` cannot collide; update the spine-count expectation wherever a test or doc asserts it (`26 -> 30`).
- **The renumber close-out:** verify `STANDARD.md` sec 2.6 inclusion statement is unnumbered (done in P2a) and finish any residue.
- **STANDARD.md v0.10 completion:** sec 2.6 `G8-G10` rows + the `U12` Bronze row (sec 2.5/the Universal list); sec 4.2 required-checks-by-tier additions; sec 8.4 confirm; the spine-count line `26 -> 30`; a version-history note for the completion (keep header at v0.10).
- **Version bump + regeneration:** `library.json` `version -> 1.1.0`; `package.json` `version -> 1.1.0`; `gen-manifest` + `gen-index` regenerate the native manifests, `manifest.generated.json`, and `INDEX.md`.
- **Reference + wording sweep:** `docs/reference/gold-checks.md` gains `G8/G9/G10` rows and the header moves to `G1-G10`; the "26-check / G1-G7" (and any "25-check") wording corrected to "30-check / G1-G10" across README, AGENTS.md, STATUS, badges, docs.
- **Release docs:** `CHANGELOG.md` `[Unreleased] -> [1.1.0] - 2026-06-03` (fresh empty `[Unreleased]` scaffold above); `RELEASE-NOTES.md` 1.1.0 section.
- **Release (post-merge, maintainer-gated):** tag `v1.1.0`; the `agent-plugins` marketplace re-pin PR.

## Success metrics / definition of done

Testable, in the order the executor verifies them:

- [ ] `node scripts/check.mjs` -> `Tier: Advanced (no blockers detected)`, 0 errors / 0 warnings, with the **30-check spine** (`U1-U12` + `S1-S8` + `G1-G10`).
- [ ] `node scripts/tier-report.mjs --json` -> `"tier":"advanced"`, `"blocked":{}` (empty burndown).
- [ ] `npm test` -> all green, including: the three new `docs-presence` cases (golden passes; each anti bites naming its specific gap), the synchronous-return guard (`registry-sync`), the reqId-uniqueness assertion, and the spine-count expectation now reading `30`.
- [ ] Each anti fixture fails for the *right* reason: `docs-presence-empty-tutorials` flags the empty Diataxis dir; `docs-presence-adr-no-tldr` flags the ADR missing `## TL;DR`; `docs-presence-arch-unlinked` flags the overview that does not link the detailed page.
- [ ] `STANDARD.md` header reads **v0.10**; sec 2.6 lists `G1-G10` with the unnumbered inclusion statement; sec 4.2 names the new Advanced checks; sec 8.4 carries the frontmatter taxonomy; the spine-count line reads **30**; a version-history note records the completion.
- [ ] `library.json` `version: "1.1.0"`, `standard: "0.10"`; `package.json` `version: "1.1.0"`; `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `manifest.generated.json`, `INDEX.md` all regenerated and consistent (`U8`/`U9`/`G4` green); `gen-manifest`/`gen-index` are idempotent (re-run -> no diff).
- [ ] `docs/reference/gold-checks.md` documents `G1-G10`.
- [ ] A repo grep over tracked human docs finds **no** "25 checks", "26 checks", "G1-G6", or "G1-G7" stale claim (only intended historical references inside version-history notes / ADR text remain, and those are explicitly historical).
- [ ] `(cd site && npm run build)` builds; the two `site/scripts/` 14.11 guards (rendered-links + route-parity) pass on `dist`.
- [ ] No em-dash (U+2014) or en-dash (U+2013) anywhere in the diff (the P0 hook + `U10` both enforce it).
- [ ] (Release, maintainer-gated) `v1.1.0` tagged; `release.yml` mints the GitHub release behind the version guard; the marketplace entry re-pinned (`sha`, `version 1.1.0`, registry `metadata` minor bump); `validate-registry` green; `STATUS.md` updated to v1.1.0 shipped.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| `G10` false-passes (e.g. treats a dir with only a `.gitkeep` as non-empty, or matches `## TL;DR` inside a code fence) | The anti fixtures force the failure paths; "non-empty" means at least one tracked `*.md` page (not a placeholder); the TL;DR match is an anchored heading line, not a substring. Adversarial gate before merge (the discipline that found 5 soundness bugs at the Phase-5 gate). |
| `G10` false-fails the toolkit's own tree (e.g. the architecture link is relative and the resolver mis-normalizes it) | Author-before-enforce: P1 authored the arch pair + the cross-link and the ADR TL;DRs; P6 runs the gate against the real tree *before* flipping the check. The link rule resolves the markdown link target relative to the overview page and checks the target page carries `doc-role: architecture-detailed`. |
| Stale-count sweep misses a spot or over-corrects a legitimate historical reference | A repo grep is the acceptance gate; version-history notes and ADR text that *describe the past* keep their historical numbers and are explicitly historical; only present-tense claims are corrected. |
| Version drift across the five version-bearing files | The `release.yml` guard reads `version` from `package.json`, `library.json`, both native manifests, and fails on any mismatch; `version-match` (`U9`) + `manifest-drift` (`U8`) + `index-drift` (`G4`) catch it locally before tag. |
| The spine-count test is hard-coded to `26` and silently passes after the bump because no test asserts `30` | P6 adds/updates an explicit spine-count expectation (`30`) and a reqId-uniqueness assertion, so a future miscount or duplicate reqId is caught. |
| Concurrent phase agents writing the same tree corrupt the build | P6 is the *last* phase and runs after P0-P5 are merged; it does not parallelize with them. This packet is authoring-only (no build/git ops) per the run constraints. |
| The pushed tag + public release is irreversible | The release + marketplace re-pin is maintainer-gated and forced-order (merge -> tag -> fill sha -> registry PR); P6 drives the PR to green and hands the maintainer the exact runbook (mirrors the v1.0.0 launch boundary). |

## Dependencies and sequencing

**Must already be on `main` before P6 starts (author-before-enforce, R-SEQ-1):**

- **P1 content:** the four Diataxis quadrants non-empty; the architecture **overview + detailed** pair, each carrying its `doc-role` marker (`architecture-overview` / `architecture-detailed`), with the overview linking to the detailed page; every ADR carrying a `## TL;DR` block. (Verified present on `main`: `docs/explanation/architecture.md` + `architecture-internals.md` carry the markers and the cross-link; all seven ADRs `0020-0026` carry `## TL;DR`.)
- **P2a:** `G7` is `docs-frontmatter`; `STANDARD.md` is already at v0.10 with the inclusion statement unnumbered and the spine recorded as 26; `library.json` `standard: "0.10"`.
- **P3-P5:** `U12`, `G8`, `G9` enforced and green (so the spine is at 29 before P6 adds `G10`).

**The author-before-enforce order within P6:** `G10`'s artifacts (Diataxis content, arch link, ADR TL;DRs) are already authored upstream, so P6's micro-order is: (1) write the module + fixtures + tests and confirm the gate is green against the real tree *before* registering it; (2) register it (the flip); (3) finish the `STANDARD.md` v0.10 surface and the version bump; (4) regenerate; (5) sweep counts/wording; (6) gate + test + site build; (7) adversarial gate; (8) squash-merge. The release (tag + marketplace re-pin) is a separate, maintainer-gated step after merge. P6 MUST be last because it bumps the Standard and the version.
