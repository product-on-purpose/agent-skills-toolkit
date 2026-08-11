# Release plan - v1.10.1 "trust patch"

- **Type:** PATCH. No new capability, no new check, no Standard movement.
- **Baseline at branch:** `main` @ `bf2745f`, gate Advanced 0/0, 613 tests, spine 30, Standard 0.12,
  24 skills, 9 commits ahead of tag `v1.10.0`.
- **Branch:** `release/v1.10.1`.
- **Invariant for the whole cut:** no third-party plugin's verdict moves. Anything that would move one
  is out of scope by definition, and there are two such items, both filed rather than done (E24, ADR 0040).

## Items

### T1 - Promote the four held `[Unreleased]` entries

- **Why:** merged fixes reach nobody until tagged. Two of the four repair consumer-affecting promises.
- **Do:** promote `[Unreleased]` to `[1.10.1]` dated 2026-08-11, leave a fresh empty `[Unreleased]`,
  curate a user-facing `RELEASE-NOTES.md` entry distinct from the changelog, bump `library.json` and
  `package.json` to 1.10.1.
- **Acceptance:** dated `[1.10.1]` section present; `RELEASE-NOTES.md` carries a `## 1.10.1` entry;
  version equal across `library.json`, `package.json`, the CHANGELOG section, and the tag; `G5`
  (curated release notes) green; `U9` (version agreement) green.

### T2 - Rewrite `docs/internal/STATUS.md`

- **Why:** the file calls itself "the single live source of truth for where are we / what is next"
  and had become a 151-line accretive log. It carried its own indictment from the 2026-07-27
  reconciliation: four roadmap rows described shipped work as open, and the note concluded "a roadmap
  is a document asserting facts about a repo, and nothing was checking it."
- **Do:** rewrite as compact live state. Delete the per-release paragraphs (duplicated in
  `CHANGELOG.md` and `RELEASE-HISTORY.md`), the `Phase progress` and `DoD burndown` tables (that build
  finished at v1.0.0, every row reads `done`), the 2026-05-30 scope decision, and the `Next action`
  section frozen at 2026-06-02. Keep current state, the open set, the forward roadmap, and the
  cross-repo relocation note.
- **Constraint:** the source audit is at a gitignored path. `docs/internal/` is tracked, so
  conclusions are stated inline rather than linked to a path a reader cannot open.
- **Acceptance:** every fact in "Current state" verifiable against the repo; every backlog ID checked
  against `enhancements.md`; every internal link resolves (`U6`); no reference to a gitignored path.
- **Result:** 151 lines to 104.

### T3 - `RELEASE-HISTORY.md` and `EXEC-SUMMARY.md` currency

- **Why:** `RELEASE-HISTORY.md`'s "Where we are now" footer is frozen at 1.9.0 with no v1.10.0 entry.
  `docs/internal/execution/EXEC-SUMMARY.md` carries pre-renumbering release labels.
- **Do:** add the v1.10.0 and v1.10.1 sections and refresh the footer; correct the stale labels and
  record the renumbering with a date so nobody re-derives it. Marketplace scope is now v1.12.0;
  manage-and-studio is deferred indefinitely.
- **Acceptance:** the footer states the current version; no stale release label remains.

### T4 - Windows argv path normalization + `windows-latest` CI

- **Why:** a backslash path was silently read as a different directory, so the gate could report a
  clean pass having graded nothing. The repository had documented this in two places
  (`docs/how-to/troubleshoot-the-gate.md`, and a comment in `tests/unit/eval-run.test.mjs` reading
  "a backslash path once graded nothing and printed a clean pass") and left the cause in place.
- **Do:** add `normalizeArgPath` to `scripts/lib/fs-utils.mjs` and apply it at every CLI entry point
  that takes a path from argv: `check.mjs`, `evaluate.mjs`, `tier-report.mjs`, `standards-watch.mjs`,
  `eval-run.mjs`, and the three generators, covering path-valued flags as well as positionals. Add a
  `validate-windows` job to `.github/workflows/ci.yml`.
- **The trap, stated so it is not re-introduced:** normalization must be guarded on `path.sep`. On
  POSIX a backslash is a **legal filename character**, so unconditional replacement is the identical
  defect in the opposite direction. The pre-existing `resolvePosix` in `scripts/lib/eval-run.mjs`
  replaces unconditionally.
- **Acceptance:** unit coverage for both platform branches, exercised deterministically rather than
  skipped on the host OS; an integration test proving a backslash-spelled path grades the same plugin
  as its forward-slash spelling; gate green; `troubleshoot-the-gate.md` updated to say when the
  behavior changed rather than deleting the entry.
- **Follow-up the maintainer must do:** `validate-windows` is a new job and is **not** automatically a
  required status check. Until it is added to branch protection, a green PR implies Windows coverage
  it does not have.

### T5 - Component-version drift

- **Why:** `library.json` disagreed with component frontmatter. Entered the release as a two-component
  finding; a sweep of all 33 registered components found **five**, in two directions from two causes.
- **Do:** bump the five instances into agreement; add a repo-local test failing the build on any
  disagreement; file the Standard question as backlog E24.
- **Boundary that matters:** the test is repo-local, in the family of `scripts/check-readme-version.mjs`.
  It carries **no Standard implication and moves no third-party verdict**. Whether `S8`
  (components-mirror) should mirror `version` for everyone is ADR-gated under ADR 0027 (Standard
  versioning and compatibility policy) and is filed, not decided.
- **Acceptance:** zero drift across all 33 components; the guard fails when drift is reintroduced;
  E24 recorded with the measurement table.

### T6 - standards-watch re-run + ADR 0040

- **Why:** pin 15 days stale; the freshness invariant wants a run under 30 days old at release time.
- **Do:** run `npm run standards-watch`, record the result, read the upstream diff, and write the ADR.
- **What it found:** `docs/specification.mdx` moved; `metadata` tightened to "a map from string keys to
  string values"; two section bodies changed and were deliberately left unclassified; all three
  `skills-ref` blobs unchanged.
- **Disposition, as shipped (this row was rewritten on 2026-08-11; the plan's first draft deferred the
  decision, and reading the diff resolved it):** the delta is **editorial**, so ADR 0040 is **Accepted
  as re-pin only** and the pin **has moved**. The parenthetical the upstream added to its summary table
  already existed verbatim in the pinned revision's own `#### metadata field` subsection,
  byte-identical, and upstream's own commit is titled `issue-474-clarify-metadata`. There is no
  requirement to track, so no check changes, no Standard bump, and no ADR 0027 burndown is owed.
  Deferring a resolved question would only have left an alarm on: every future watch run would
  re-report the same delta forever.
- **What investigating it found, which is the part that mattered:** our own `metadata.chain` violated a
  value-type rule that predates the pin. That is fixed separately in T8 below and is not a Standard
  change.
- **Acceptance:** watch run recorded; ADR 0040 present, status **Accepted**, carrying its TL;DR and
  Implementation sites; `upstream-pin.json` re-pinned to `d9a2db099d90` with `verified.date`
  2026-08-11; `npm run standards-watch` reports `VERDICT: unchanged`.

### T8 - `metadata.chain` value type, and warn-first for reading it

- **Why:** `skills-ref` coerces every `metadata` value through `str()`, so the nested list PR #204
  introduced survived as the string `"['askit-skill-author', 'askit-reviewer']"` while
  `agentskills validate` reported "Valid skill" for all 24 skills. A loud failure had become a silent
  corruption.
- **Do:** migrate to a comma-separated string in both flagship skills and `agents/askit-skill-author.md`;
  teach `S4` (chain contracts) to read string, array and legacy top-level shapes.
- **The compatibility problem, and why it needed its own ADR:** teaching `S4` to see the string form
  makes the check newly able to fire, which is a tightening, and a patch may not tighten. ADR 0041
  (warn-first string-shaped chain declarations) ships string-derived findings as `warn`, graduating to
  `error` at Standard 0.13. Severity is decided by the value's **shape**, not by which key it came from.
- **And why that was not sufficient on its own:** `askit.config.json` per-rule overrides are applied
  after a check emits severity, so `rules: { "S4": "error" }` escalated the warning straight back to a
  failing error. A finding-level migration cap now applies last in `resolveFindings`, as a ceiling and
  never a floor, with suppression and `off` still winning and a `migrationNotice` surfaced to the
  terminal, the JSON and both report formats.
- **Acceptance:** the reference parser round-trips the declaration unchanged; 24/24 skills still
  validate; a plugin whose only chaining signal is a string declaration, with `rules.S4` set to
  `error`, exits 0; the array-shaped equivalent still exits 1; a capped finding that is suppressed
  stays suppressed.

### T7 - Validator-parity baseline

- **Why:** the 09-plan asks that the live validator evidence be recorded in `docs/internal/` rather
  than living only in an audit run.
- **Do:** record the measured results of `claude plugin validate` and `skills-ref` at this tag, with
  tool versions, the prior baseline for the delta, and the reproduction commands.
- **Acceptance:** results measured live at this branch, not copied from the audit; the seed-plugin
  failure recorded as a known open tension with its v1.11.0 resolution named.

## Verification gate before tagging

| Check | Required |
|---|---|
| `node scripts/check.mjs .` | Advanced, 0 errors, 0 warnings |
| `npm test` | all pass, count recorded |
| `uvx --from skills-ref agentskills validate` across `skills/*/` | 24/24 |
| `claude plugin validate . --strict` | pass |
| Version equality across `library.json`, `package.json`, CHANGELOG, tag | equal |
| `INDEX.md` and native manifests regenerated, drift-free | `G4` green |
| No em-dash or en-dash in committed text | zero |
| Codex adversarial review | run, findings dispositioned |
| CI, including the new `validate-windows` job | green |

## Explicitly out of scope

- Changing `S8` (E24 filed, not implemented): whether components-mirror should require version
  agreement from everyone moves third-party verdicts and is ADR-gated.
- Changing `U13` (E26 filed): it carries the same config-escalation exposure the migration cap closes
  for the new case. Lowering a severity is always safe under ADR 0027, so this is scope-bound rather
  than policy-bound.
- Rendering `clampNotice` in the designed reports (E28 filed): a pre-existing gap in an untouched code
  path, found while fixing the same gap for `migrationNotice`. A release four review rounds deep is the
  wrong place for an unreviewed behavior change.
- Automating the test-count claim (E27 filed): the count is quoted by hand in two places and nothing
  verifies it, which this release proved by publishing a wrong one.
- The `templates/seed-plugin` manifest fix (v1.11.0, needs its companion Standard decision).
- Any new check, any Standard bump, anything that moves a third-party tier or exit code.

*(Re-pinning `upstream-pin.json` was listed here in the first draft, on the assumption ADR 0040 would
land Proposed. Reading the upstream diff resolved the question instead, so the pin moved inside this
release. The row is left here as a correction rather than deleted, because a plan that quietly changes
its own scope is the thing this release is about.)*
