# STATUS - agent-skills-toolkit

> The single live source of truth for "where are we / what is next." This file stays compact:
> per-release detail belongs in [`RELEASE-HISTORY.md`](RELEASE-HISTORY.md) (the readable narrative
> through-line, engineer and non-engineer framing), [`CHANGELOG.md`](../../CHANGELOG.md) (the full
> technical history), and `docs/internal/release-plans/` (the per-release spec + implementation
> packets). Do not add accretive per-release paragraphs here; append them to those instead.
>
> Last updated: 2026-08-11.

## Current state

| Fact | Value |
|---|---|
| Version | 1.10.1 (being cut now; v1.10.0 was cut 2026-08-07) |
| Declared tier | Advanced (Gold) - `library.json` `tier: advanced` |
| Standard pin | 0.12 |
| Spine | 30 checks |
| Skills | 24 |
| Tests | 673, 0 failures (measured at the v1.10.1 cut, 2026-08-11) |
| Self-proving | `node scripts/check.mjs .` exits 0 at Advanced, 0 errors, 0 warnings |

## What is open

- **ADR 0039 (marketplace-scope evaluation) is Accepted** (2026-08-10), with zero implementing
  code. This is the largest accepted-but-unbuilt capability on the books: a third evaluation
  scope that grades a `marketplace.json` catalogue as a whole (cross-member skill/command
  collisions, catalogue-entry resolvability, registry-vs-member version agreement), aggregated as
  self-consistency worst-member. Implementation is targeted at **v1.12.0**.
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
- **v1.12.0 "marketplace scope":** implement ADR 0039 (marketplace-scope evaluation) - accept new
  marketplace source kinds and the `renames` field, add the plugin-shipped-subagent
  restricted-fields check.
- **v1.13.0 "current with the vendors":** the ADR pack (commands-as-skills, frontmatter
  vocabulary strictness, U5 scope per E14) followed by the code batch, plus standing up
  vendor-watch.
- **v1.14.0 "evidence":** fix the measurement instrument (E16, E17, E20, E15), publish the E13
  readings as final, execute the live-hook behavioral evals.
- **v1.15.0 "graded cohort":** grade an external cohort on portable checks and publish the
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
