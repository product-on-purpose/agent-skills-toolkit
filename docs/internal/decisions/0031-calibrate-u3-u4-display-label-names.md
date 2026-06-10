# 0031 - Calibrate U3 (frontmatter-valid) and U4 (name-matches-dir) for display-label and namespaced skill names

## TL;DR
- **Decision:** The batch-2 corpus run's Finding 4. A third-party plugin that uses the skill `name` field as a human display label (`name: "Writing Hookify Rules"`) or a namespaced command (`name: "gsd:add-backlog"`) was double-flagged: `U3` (frontmatter-valid) errored on the kebab-case format AND `U4` (name-matches-dir) errored on the name-vs-directory mismatch, on the same field. Two surgical calibrations: (1) **U3** now only format-checks `name` when it equals the directory (the canonical-identifier case); when `name != dir` the name is a label and U4 owns the divergence, so U3 no longer also flags the characters. A non-kebab name that DOES equal its directory is still a U3 error, and the description checks are unchanged. (2) **U4** is downgraded to a **warning under the `plain-plugin` profile** (not turned off), because real third-party plugins deliberately use `name` as a label or namespaced command; under the default `askit-library` ladder it stays a hard error. Both checks keep `vendor-cited` provenance. Spine stays 29; Standard stays 0.11.
- **Why:** Under `--profile plain-plugin` the gate graded the official and community targets, and the U3+U4 pair fired on convention, not portable defect: `hookify` (display-label name) and `gsd` (83 colon-namespaced skills, 165 errors = 83 U3 + 82 U4) are well-formed Claude Code plugins whose authors use `name` exactly as the Claude Code extension permits. The base skill spec (agentskills.io) requires a kebab `name` equal to the directory; the Claude Code extension treats `name` as an optional display label. Grading a vanilla Claude Code plugin against the strict base spec is the same illegitimacy ADR 0028 (U10), ADR 0029 (U2/U5), and ADR 0030 (U6/U11) corrected: a check graded against a plugin you do not own must proxy a real, portable defect, not fail the platform author's own deliberate convention.
- **Status:** Accepted.

- **Date:** 2026-06-10
- **Deciders:** maintainer (jprisant), with Claude (Opus 4.8)

## Builds on
- ADR 0028 (retire U10), ADR 0029 (reclassify U2/U5 as house), ADR 0030 (calibrate U6/U11) - the same legitimacy test, now applied to the U3/U4 name pair that ADR 0030 explicitly deferred as Finding 4.
- The batch-2 eval-target corpus run, `_local/audit/anchor-runs/2026-06-10/FINDINGS.md` (Finding 4 plus the C4 `gsd` 165-error observation, the colon-namespace flavor at scale).
- ADR 0027 (Standard versioning and compatibility policy) - this is a grading calibration of HOW two checks fire, not a change to WHAT the Standard requires (a malformed canonical name is still a U3 error; a name-vs-dir mismatch is still surfaced everywhere and is still an error under the default ladder), so no spine change, no Standard version bump, no warn-then-error burndown.
- `docs/internal/research/tool-profiles/skills-ref.md` - documents the base-spec-vs-Claude-Code-extension `name` divergence this ADR resolves.

## Context and problem statement
The base skill specification (agentskills.io) defines `name` as a portable identifier: 1-64 chars, lowercase `a-z0-9` with single internal hyphens, and equal to the skill's directory name. Two checks enforce that: `U3` (frontmatter-valid) checks the character format, `U4` (name-matches-dir) checks the equality. Claude Code's own extension to the format relaxes this: `name` may be a human-readable display label, and Claude Code does not require it to match the directory.

Real, well-built third-party plugins use the relaxed reading:

- **`hookify`** (A3/A4): `skills/writing-rules/SKILL.md` declares `name: "Writing Hookify Rules"` - a prose display label with spaces and capitals.
- **`gsd`** (C4 `buildwithclaude`, 165 errors, the single largest error count in the run): 83 skills named with a `gsd:<command>` namespace (`gsd:add-backlog`, etc.). The 165 errors decompose as 83 U3 (the colon fails the kebab regex) plus 82 U4 (the namespaced name differs from the bare directory). This is the same Finding-4 territory as hookify, a second flavor (colon-namespace) at scale.

Under `--profile plain-plugin` - the profile whose entire purpose is to grade a vanilla Claude Code or Codex plugin as itself, not against the askit library contract - both checks still fired, because both are `vendor-cited` provenance and stay on under plain-plugin. The result: a single divergent name produced two errors on the same field, and the gate failed plugins that are correct in their target runtime.

The double-flag is also structurally wrong independent of profile: U3 asks "is this a valid identifier?" and U4 asks "does it match the directory?". When the name is a label (does not match the directory), only U4's question is meaningful; U3 should not also assert that a label has bad identifier characters.

## Decision drivers
- **Legitimacy (the ADR 0028/0029/0030 test):** a display label or namespaced command is not a portable defect when grading a Claude Code plugin under its own rules; erroring on it fails well-built plugins on convention.
- **No double jeopardy:** one divergent field should produce one finding, owned by the check whose question actually applies (U4), not two.
- **Surgical, not blunt:** a genuinely malformed canonical name (a non-kebab string that IS the directory name) is still a real defect and must still error. The default `askit-library` ladder must keep name-vs-dir a hard error, because an askit library commits to the portable canonical-name contract.
- **Respect the two profiles' meaning:** plain-plugin = grade a Claude Code/Codex plugin as itself (follow the lenient extension: divergence informs); askit-library = the portable library contract (divergence fails).
- **Invariant safety:** the house-provenance invariant (the plain-plugin OFF-set must equal the house-provenance set) must stay intact; U4 is vendor-cited, so it must not be turned OFF under plain-plugin.

## Considered options
1. **U3 format-checks only when `name == dir`; U4 downgraded to `warn` under plain-plugin (kept `error` under askit-library).** (chosen) Removes the double-flag universally (U3) and makes the name-vs-dir convention advisory for vanilla plugins while keeping it strict for askit libraries (U4). TDD: failing tests first (U3 ignores a display-label and a colon-namespace name, still errors on a malformed canonical name, still validates description; U4 resolves to warn under plain-plugin and error under askit-library), then minimal code.
2. **Reclassify U3/U4 to house provenance and drop them under plain-plugin (the ADR 0029 move).** Rejected: both checks DO proxy real, portable defects (a name that cannot be addressed; a name that does not match its directory). The problem is over-strictness on the lenient platform reading, not illegitimate provenance. Reclassifying would stop grading real name defects on third-party plugins and would also drop them from house-style consumers who want them.
3. **Turn U4 fully OFF under plain-plugin.** Rejected: it would break the house-provenance invariant (which requires the plain-plugin OFF-set to equal the house set, and U4 is vendor-cited), and it would discard a genuinely useful signal. A warning keeps the information without blocking.
4. **Make U3 emit a warning (instead of skipping) when `name != dir`.** Rejected: under the default ladder a display-label name would then produce a U3 warning plus a U4 error on the same field - still double-counting, just at mixed severities. Skipping in U3 and letting U4 be the single owner is cleaner.
5. **Leave as-is.** Rejected: the U3/U4 pair was the largest residual false-positive source after the ADR 0030 fixes (165 errors on `gsd` alone), and it is exactly the friction the `--profile plain-plugin` work set out to remove.

## Decision outcome
Option 1.

- `scripts/checks/frontmatter-valid.mjs`: the name-format branch is gated on `fm.name === s.name`, so the kebab/length check runs only for a canonical name that equals its directory. A divergent name (display label or namespaced command) is left to U4; a malformed canonical name still errors; the description checks are untouched.
- `scripts/lib/profiles.mjs`: the `plain-plugin` profile's rules become `{ ...offMap(HOUSE_REQIDS), U4: "warn" }`. U4 resolves to a warning under plain-plugin and keeps its declared `error` under askit-library. Because the entry is `"warn"` and not `"off"`, the house-provenance invariant (`tests/unit/house-provenance.test.mjs`, which compares the OFF-set to the house-provenance set) is unaffected, and U4 stays vendor-cited.

TDD added 6 tests: 4 in `tests/unit/frontmatter-valid.test.mjs` (display-label skip, colon-namespace skip, malformed-canonical still errors, display-label still gets the description check) and 2 in `tests/unit/name-matches-dir.test.mjs` (U4 warn under plain-plugin, U4 error under askit-library). Suite 366 -> 372; gate Advanced 0/0; spine 29; Standard 0.11.

Verified against the corpus under `--profile plain-plugin`: `hookify` goes from 2 name errors to 0 (one U4 warning), and `gsd` from 165 errors to 0 (82 U4 warnings, 0 U3). The toolkit's own skills are unaffected (every askit skill name is kebab and equals its directory).

## Consequences
- **Positive:** the gate stops failing vanilla Claude Code/Codex plugins for using `name` as the extension permits; a divergent name produces one finding (U4), owned by the check whose question applies, instead of two; outward grading under plain-plugin is honest (a name-vs-dir divergence informs, it does not block); and the askit-library ladder is unchanged (name-vs-dir is still a hard error, a malformed canonical name is still a U3 error).
- **Negative / accepted coupling:** U3's format check now depends on U4 to own the divergent-name case. If a future profile turned U4 fully off, a divergent name with genuinely garbage characters (for example `"!@#$"`) would pass both checks silently. This is acceptable: the checks are designed to run together as a spine, no shipped profile turns U4 off (it is vendor-cited and not in the house OFF-set), and turning U4 off would itself be a deliberate "do not grade names" choice. The coupling is documented here and in the U3 source comment.
- **Follow-up (not in this change):** the C1 `levnikolaevich` residual errors (documentation-pipeline 20, agile-workflow 12, codebase-audit-suite 7, community-engagement 4) remain to be triaged for false-positive-vs-real-defect; the C4 `gsd` count is now resolved by this ADR. The publish-a-token-usage-dossier idea and the `/evaluation-reports/` public showcase are separate, open threads in the session log.
