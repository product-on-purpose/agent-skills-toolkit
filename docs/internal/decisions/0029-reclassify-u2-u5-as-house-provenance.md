# 0029 - Reclassify U2 (AGENTS.md anatomy) and U5 (description-score) from portable to house provenance

## TL;DR
- **Decision:** Change `U2` (the repo-root `AGENTS.md` anatomy requirement) from `objective` to `house` provenance, and `U5` (the description-quality scorer) from `vendor-cited` to `house`, and add both to the `plain-plugin` profile's off-set. Both still fire under the default `askit-library` profile, so no plugin's conformance grade changes; the spine stays 29 and the Standard stays 0.11. What changes: `plain-plugin` now drops U2 and U5, the report counts them as profile conformance rather than real issues, and a published verdict no longer clamps them (a consumer may opt out of an askit convention).
- **Why:** The first eval-target corpus run pointed the gate at real third-party plugins and found both checks fire on well-built official targets on convention, not defect. Anthropic's own `skills` repo ships no root `AGENTS.md` (and 66 of 82 `wshobson/agents` sub-plugins inherit one from their marketplace root); the U5 scorer rates good `use-when` descriptions (including Anthropic's and superpowers') at 0.65, just under its 0.7 bar. Neither is a portable defect, so grading a third-party plain plugin on them is the same illegitimacy ADR 0028 corrected for U10.
- **Status:** Accepted.

- **Status:** Accepted
- **Date:** 2026-06-09
- **Deciders:** maintainer (jprisant), with Claude (Opus 4.8)

## Builds on
- ADR 0028 (retire U10 from the spine) - established that house preferences belong in an opt-in profile or hook, not the universal grade. This ADR applies the same legitimacy test to two checks that survived in the portable set, now that the F3 profile mechanism and the `--profile` CLI flag (PR #118) make `plain-plugin` the reachable opt-in home ADR 0028 anticipated.
- The eval-target corpus run, `_local/audit/anchor-runs/2026-06-09/FINDINGS.md` - the evidence (findings A-2 for U2, A-3 for U5).
- ADR 0027 (Standard versioning and compatibility policy) - provenance is consumer-side grading semantics, declared non-normative for conformance (STANDARD.md, consumer-side configuration). Reclassifying it changes no conformance requirement, so no Standard version bump and no warn-then-error burndown applies.

## Context and problem statement
The provenance taxonomy (`objective` / `vendor-cited` / `house`) drives three behaviors: the report's real-issues vs profile-conformance split, the published-verdict clamp (only objective and vendor-cited findings cannot be disabled), and the `plain-plugin` profile (which turns off exactly the house checks). The first corpus run graded `anthropics/skills`, `obra/superpowers`, `wshobson/agents`, and `lst97/claude-code-sub-agents`; two findings recurred on well-built targets:

- **U2** (`objective`, "AGENTS.md required at the repository root") blocked Anthropic's reference `skills` repo and was the single error on 66 of 82 `wshobson` marketplace sub-plugins, which carry one `AGENTS.md` at the marketplace root. `AGENTS.md` is an emerging cross-agent convention the toolkit values, not a malfunction whose absence breaks a plugin; tagging it `objective` was wrong.
- **U5** (`vendor-cited`, the description scorer) warned on good `use-when` descriptions across every target, clustering them at 0.65 against a 0.7 bar. The description-quality principle is vendor-backed, but this specific scorer and threshold are a house heuristic, and the corpus showed it does not discriminate good descriptions.

## Decision drivers
- Legitimacy (the ADR 0028 test): a check graded against a plugin you do not own must proxy a real, portable outcome grounded in objective correctness or cited vendor authority. Neither U2's root-`AGENTS.md` requirement nor U5's scorer meets that bar.
- Coherence of the model: `plain-plugin` is documented as "the portable, vendor-grounded checks only" and the real-issues count is meant to be "what is actually broken." Leaving U2/U5 portable made both untrue.
- No conformance churn: the change must not alter any plugin's pass/fail under the default profile. Reclassifying provenance and adding to `plain-plugin` does exactly that - the default `askit-library` ladder still requires both.

## Considered options
1. **Reclassify U2 and U5 to house; add both to plain-plugin's off-set.** (chosen) The honest classification. Both stay required under the full askit ladder; `plain-plugin` drops them; the report and clamp treat them as house. A new `house-provenance.test.mjs` invariant asserts the `plain-plugin` off-set equals the house-provenance set, so the two representations never drift.
2. **Downgrade U2 to warn and lower U5's threshold, keep both portable.** Rejected: still imposes an askit convention on third-party grading (a warn is still a finding in a published report), and a threshold tweak does not fix that U5's scorer is house, not vendor.
3. **Special-case a marketplace-root AGENTS.md to satisfy sub-plugins.** Addresses only the wshobson shape; leaves single-repo plugins (and Anthropic's `skills`) still failed and does not touch U5. A useful loader refinement, but orthogonal.
4. **Leave as-is.** Rejected: the corpus showed the default outward-grading experience is dominated by non-portable findings, the exact friction the `--profile` work set out to remove.

## Decision outcome
Option 1. `scripts/checks/anatomy.mjs` U2 `objective -> house` (docblock corrected to the root-`AGENTS.md` + no-skills-warn reality); `scripts/checks/description-score.mjs` U5 `vendor-cited -> house`; `scripts/lib/profiles.mjs` `HOUSE_REQIDS` gains `U2` and `U5`; `tests/unit/house-provenance.test.mjs` adds the reclassification assertions and the plain-plugin-equals-house invariant; `docs/reference/gate-config.md` lists U2/U5 in the `plain-plugin` profile. Spine unchanged at 29; Standard unchanged at 0.11; suite 358; gate Advanced 0/0. Ships in the next release alongside the `--profile` flag.

## Consequences
- **Positive:** under `--profile plain-plugin`, third-party grading now surfaces only portable defects (anthropics/skills drops to its single real U3 finding, a description over the Agent Skills spec cap, once the U2 convention is no longer imposed); the real-issues count and published verdict are honest; the provenance model is internally consistent and guarded against drift.
- **Negative:** the gate no longer treats a missing root `AGENTS.md` as an objective defect for a plain plugin; mitigated because the askit-library profile (and the toolkit's own Gold self-grade) still require it, and `AGENTS.md` remains a documented anatomy expectation.
- **Follow-up (not in this change):** the U5 scorer itself warrants recalibration - the 0.65 clustering suggests it saturates and does not reward strong descriptions; tracked separately, since reclassifying U5 as house already removes it from third-party grading.
