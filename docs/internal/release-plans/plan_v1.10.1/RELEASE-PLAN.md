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
- **Do:** run `npm run standards-watch`, record the result, draft the ADR as **Proposed**.
- **What it found:** `docs/specification.mdx` moved; `metadata` tightened to "a map from string keys to
  string values"; two section bodies changed and were deliberately left unclassified; all three
  `skills-ref` blobs unchanged.
- **Disposition:** the pin is **not** moved. The watcher proposes, and a re-pin lands beside the ADR
  that motivated it. ADR 0040 is Proposed and routed to the vendor-alignment batch, where the U3
  vocabulary-strictness work already sits. This respects the audit's dependency spine: fix the
  instances, then tighten the rule, so the tightening lands with zero self-findings.
- **Acceptance:** watch run recorded; ADR 0040 present, status Proposed, carrying its TL;DR and
  Implementation sites; `upstream-pin.json` unchanged.

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

- Re-pinning `upstream-pin.json` (rides ADR 0040's acceptance).
- Changing `S8` (E24 filed, not implemented).
- The `templates/seed-plugin` manifest fix (v1.11.0, needs its companion Standard decision).
- Any new check, any Standard bump, anything that moves a third-party verdict.
