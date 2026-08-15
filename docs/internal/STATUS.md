# STATUS - agent-skills-toolkit

> The single live source of truth for "where are we / what is next." This file stays compact:
> per-release detail belongs in [`RELEASE-HISTORY.md`](RELEASE-HISTORY.md) (the readable narrative
> through-line, engineer and non-engineer framing), [`CHANGELOG.md`](../../CHANGELOG.md) (the full
> technical history), and `docs/internal/release-plans/` (the per-release spec + implementation
> packets). Do not add accretive per-release paragraphs here; append them to those instead.
>
> Last updated: 2026-08-13.

## Current state

| Fact | Value |
|---|---|
| Version | 1.13.0 (cut 2026-08-13, shipped 2026-08-14) |
| Declared tier | Advanced (Gold) - `library.json` `tier: advanced` |
| Standard pin | 0.13 |
| Spine | 33 checks |
| Scopes | 3 (plugin, component, marketplace) |
| Skills | 24 |
| Tests | 1181, 0 failures (local suite run 2026-08-14; both halves confirmed by `npm run release-counts` exiting 0) |
| Self-proving | `node scripts/check.mjs .` exits 0 at Advanced, 0 errors, 0 warnings |

## What is open

- **ADR 0039 (marketplace-scope evaluation) is IMPLEMENTED** in v1.12.0: a third evaluation scope
  grading a `marketplace.json` catalogue as a whole, aggregated as self-consistency worst-member,
  with the collection report as the sixth report type. The spine did not move; every finding it
  emits is scope-local and carries no `reqId`. Two follow-ups are filed rather than done:
  **E33** (A6 restricted fields are detected in marketplace scope but not in plugin scope) and
  **E34** (whether any cross-member finding should become a numbered spine check at all). **They are
  now scheduled apart, and this line said otherwise until 2026-08-13:** E33 lands in the Standard 0.13
  cut (v1.13.0) as `U14` with its own ADR 0045; **E34 defers to v1.14.0**, because its prior question -
  whether a plugin can be held to a collision with a sibling it does not know it is catalogued beside -
  has no ADR, and no release should graduate the set wholesale merely because it happens to be carrying
  a Standard bump.
- **npm is CURRENT: the registry serves 1.13.0**, published 2026-08-14 via trusted publishing
  (OIDC) with **no stored credential of any kind** - the repository holds zero Actions secrets, and
  authentication is the runner's short-lived OIDC token alone. The published tarball carries an
  automatic SLSA provenance attestation and a registry signature; `--provenance` is not passed,
  because trusted publishing generates it for a public package from a public repository. The
  workflow asserts the npm >= 11.5.1 and Node >= 22.14.0 floors OIDC requires rather than
  inheriting whatever npm the pinned Node bundles.
  **1.12.0 was deliberately never published.** It carried the three high-severity defects v1.12.1
  fixed, and an npm publish is irreversible after 72 hours, so shipping it would have left a
  knowingly-defective version permanently installable by exact version. npm's version history is
  not required to be contiguous; `CHANGELOG.md` and the GitHub releases carry the full record.
  Verified from the consumer position after publishing, per `RELEASE.md`: installed from the live
  registry into a clean directory outside this repository and graded a plugin with `npx`, which
  returned `Tier: Advanced`, 0 errors, 0 warnings, exit 0.
  **Still outstanding, and blocking nothing:** the package is still owned by `jprisant` rather than
  the `product-on-purpose` org. The transfer must be done in the npmjs.com web UI, because
  `npm owner add product-on-purpose:developers` expects a username, not a team.
- **The validator-parity harness is GATING** as of v1.12.0, discharging ADR 0042's scheduled flip.
  Its stated condition was met by v1.11.0 and v1.11.1 completing real CI cycles green. One
  consequence was accepted knowingly: under gating, a run where `uvx` cannot be installed reds a
  required check rather than printing a line nobody reads.
- **E37 (the shell-probe timing budget) is FIXED, and the release-time counts gate now passes on this
  workstation.** It had been an escalation from how it was filed: `scripts/check-release-counts.mjs`
  compares both halves of a stated count (total AND failures), so while E37's two wall-clock cases failed
  locally, `npm run release-counts` reported drift against any truthful "N tests, 0 failures" claim and
  exited non-zero - and `RELEASE.md` names that command as non-negotiable. Landed 2026-08-13 as **W6 of
  v1.13.0** with the **two different fixes** the corrected entry called for, one per case. Now measured
  locally: `release-counts` exit 0 against a truthful count, both cases 5-of-5 under spawn-heavy load,
  and a full suite run leaving **zero** stray processes where it previously left about five.
  **Three things measurement corrected in the plan** and they are worth reading before writing a similar
  one: the accumulating orphan was the probe candidate, not the helper the plan named (the helper cannot
  outlive its parent on Windows); "30 s or more" was not enough on its own, since a bar derived from a
  30 s lifetime still failed 1 run in 5 under load; and asserting that the cleanup must succeed put the
  flakiness straight back, because the forced kill itself fails under load. Full entry in
  [`backlog/enhancements.md`](backlog/enhancements.md).
- **E13 (defect-rich model triple) is DONE.** Run 2026-08-04, recorded as batch 2026-08-04 runs
  12-14 in [`eval-runs.md`](eval-runs/eval-runs.md). Three real dispatches (Haiku 4.5, Sonnet 5,
  Opus 5, effort held at `high`) against the seeded-defect fixture. All three cells are
  **PROVISIONAL pending E16** (below) - the run is real, but the scoring rule underneath it has a
  known gap.
- **Measurement-instrument defects the E13 run raised, all open:**
  - **E16** (multi-entry credit gap) - a finding satisfying two planted-defect entries at once is
    credited to neither, which suppresses precision and recall together. Blocks publishing any
    E13 cell as final.
  - **E17** (no adjudication path) - the scoring harness cannot consume a hand-adjudicated
    resolution, so every published pair is hand-computed with nothing checking the arithmetic.
  - **E20** (key readable from inside the fixture tree) - the seeded-defect scoring key sits
    inside the directory an evaluating agent is pointed at, so a run that reads it produces a
    transcription rather than a measurement, undetectably.
  - **E15** (three eval-run runner defects) - a component-scope verdict taken from a plugin-scope
    grading, an aggregator that would append rows its own charter forbids, and one target's
    refusal aborting a whole multi-target batch.
- **Gate coverage gaps, all open:**
  - **E18** (U6 reference-links scans skills only) - link rot in a command or subagent is
    invisible to the check; ADR-gated (needs a warn-first burndown).
  - **E19** (nothing resolves `.claude-plugin/plugin.json` component paths) - a Claude manifest
    naming a file that does not exist on disk passes clean; ADR-gated.
  - **E22** (U3 frontmatter-valid never validates `agents/`) - the check iterates skills only, so
    a subagent's frontmatter is entirely unchecked. (The related G8 folder-readme defect this same
    dogfooding pass found - a phantom subagent registered from an `agents/README.md` - is already
    fixed; only the U3 gap remains open.)
- **Calibration, open, ADR-gated:** **E14** - U5 (description-score) is mathematically unpassable
  in a language its English trigger pattern does not know (0 of 346 on a French corpus). Needs a
  design ADR, not a patch that adds one more language's vocabulary.
- **Two gaps v1.13.0 shipped KNOWINGLY, both ADR-gated, both found by its own review rounds:**
  - **E42** (four checks read the agent REGISTRATION list) - `S2`, `S3`, `S4` and `S8` iterate
    `ctx.subagents`, which excludes `agents/README.md` and underscore-prefixed files. Claude Code loads
    them anyway, so `agents/_worker.md` bypasses the registration, prefix, metadata and chain checks while
    the gate awards Silver or Gold. `U14` was fixed to read `ctx.agentDocs`; these four were not, because
    widening them makes EXISTING checks emit findings on files they have never examined. That is a
    Standard tightening, and ADR 0044 - shipped in this very release - says tightenings get an ADR and a
    pin-gated migration window. The ADR must first decide whether an unregistered runtime-loaded agent
    file is a REGISTRATION defect or a SHIPPING defect; the vendor behaviour argues the second.
  - **E43** (`ctx.workflows` is read by `S7` and never built by the loader) - a command mapping to a real
    `_workflows/<name>.md` is reported unresolved, and `S3`/`S8` do not inspect workflows at all. An
    unfinished feature rather than a regression: the source comment says "ctx.workflows arrives in a later
    phase". Finishing it means wiring canonical discovery through four checks plus index generation.
- **Backlog from the competitive-comparison intake, all open:** **E4** (SARIF + GitHub
  annotations), **E9** (provenance as a first-class output contract), **E23** (surface check
  provenance in the report output), **E6** (prompt-injection + curl-pipe-bash content scan),
  **E2** (deeper MCP secret scanning), **E5** (semver-bump-vs-diff verification), **E7** (eval
  harness hardening), **E8** (published conformance suite), **E21** (`covers` has no shape for a
  cross-component eval), **E3** (gate-config follow-ups: autofix, custom profiles, fingerprint
  suppressions), **E10** (MCP-served-skill validation - watch only, no concrete target yet).

## Where this is going

One line per release; version numbers beyond v1.10.1 name a shape, not a promise. This
sequencing came from a dated internal audit (2026-08-10, held locally, not a followable link from
this file); the conclusions are stated here directly.

- **v1.10.1 "trust patch" (this cut):** promote the four held `[Unreleased]` changelog entries,
  this STATUS rewrite, a standards-watch re-run, the Windows argv path fix plus a
  `windows-latest` CI job, and a disposition for the component-version drift this release
  surfaced.
- **v1.11.0 "reach":** publish the gate as an npm package with an npx-runnable bin, `--json` on
  `check.mjs`, SARIF plus GitHub annotations (E4), provenance on every finding in every output
  (E9, E23), a GitHub Action wrapping the gate, a CI-generated sha-pinned tier badge, and a
  validator-parity CI harness running report-only.
- **v1.12.0 "marketplace scope" (this cut):** implement ADR 0039 (marketplace-scope evaluation), the
  collection report, new marketplace source kinds (`npm`, `archive`+`sha256`, `git-subdir`) and the
  `renames` field, the plugin-shipped-agent restricted-fields reading, the docs-site registry page,
  and the ADR 0042 parity flip to gating.
- **v1.13.0 "the contract you adopted" (SHIPPED 2026-08-14):** **the Standard 0.13 cut**, narrowed during planning
  on 2026-08-12 from the four-workstream scope this list previously assigned it. One post-resolution
  Standard ceiling over `since` and `until` (ADR 0044), which **closes E26 and E38**; `U13`'s warn-to-error
  graduation and ADR 0041's chain-migration cap graduation, both discharged through that ceiling;
  **E33** as `U14` with its own ADR 0045 (spine 30 to 31); **E35**'s `gen-index` fix carrying a
  migration; and **E37**, pulled in because it blocks the release-time counts gate. Packet at
  [`release-plans/plan_v1.13.0/RELEASE-PLAN.md`](release-plans/plan_v1.13.0/RELEASE-PLAN.md).
- **v1.14.0 "current with the vendors":** the ADR pack (commands-as-skills, frontmatter vocabulary
  strictness, `U5` scope per **E14**) followed by the code batch, plus standing up vendor-watch. It also
  inherits **E34** (which, if any, cross-member findings belong on the spine) and **E36** (malformed and
  mixed marketplace manifests), both of which need an ADR nobody has drafted. **Why it moved:** bundling three undrafted ADRs with a Standard bump made
  v1.13.0 a release-of-releases; the vendor work keeps its own name and its own cut.
- **v1.15.0 "evidence":** fix the measurement instrument (E16, E17, E20, E15), publish the E13
  readings as final, execute the live-hook behavioral evals.
- **v1.16.0 "graded cohort":** grade an external cohort on portable checks and publish the
  registry page.

**Not on this list:** manage-and-studio (a read-only studio dashboard) is deferred indefinitely -
a UI over a grade nothing yet consumes. See the dated note in
[`execution/EXEC-SUMMARY.md`](execution/EXEC-SUMMARY.md) for how it fell off the sequencing.

## Cross-repo dependency note

The `agent-plugins` standards program may relocate `STANDARD.md` and the checker
(`scripts/check.mjs`, `scripts/lib/`, `scripts/checks/`, `scripts/generators/`,
`tier-report.mjs`) into `agent-plugins/standards/`. This repo plans around that move: new
engine-adjacent code is built cleanly separable so only the `npm run check` seam repoints if the
checker moves. If that program's relocation package fires mid-program, **stop and reconcile**
against [`execution/relocation-addendum.md`](execution/relocation-addendum.md) before continuing
any of the above.
