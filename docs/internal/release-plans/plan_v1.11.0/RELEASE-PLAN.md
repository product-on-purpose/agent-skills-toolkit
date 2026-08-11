# Release plan - v1.11.0 "reach"

- **Type:** MINOR. New capability, no new spine check, no Standard bump intended.
- **Baseline:** `main` @ `ad507e2` (tag `v1.10.1`), gate Advanced 0/0, 743 tests 0 failures, spine 30, Standard 0.12, 24 skills.
- **Branch:** `release/v1.11.0`.
- **Thesis:** the project finished building a grade worth trusting. Everything here is about making that grade **reachable, legible and consequential outside this repository.** A stranger should be able to run it in one minute and see it on a pull request.

> **A note on how this document is written, because the last release earned it.**
> This file states **intent and acceptance criteria**. It does not describe current state, and it will
> not be edited into a status report. v1.10.1's packet README was written as a description, the work
> moved underneath it, and three separate review rounds found it asserting things that were no longer
> true. State belongs in `README.md` in this folder, written **last, from the code**. If you are
> reading this mid-release, treat every line as "what we set out to do", not "what is".

## The governing invariant

**Every output added in this release is a pure serialization of data the gate already computes.**

No verdict moves. No severity changes. No new computation enters the gate path. If a field cannot be
filled from what the gate already knows, it is not emitted, and the gap is documented rather than
guessed at. The one place this bites is line numbers (W2 below), and the answer there is to emit
nothing rather than to invent a `startLine: 1`.

## Workstreams

### W1 - Publish the gate (npm, npx-runnable)

- **Why:** the grade is consumed nowhere outside this repository. Reach is the bottleneck, and every
  later phase compounds on it.
- **Scope:** `private: false`; a `files` **allowlist** (without one, publishing ships the whole
  monorepo including `site/`, `tests/` and every fixture); a single `bin`; an intentional `exports`
  surface; `prepublishOnly` running the suite and gate; a `workflow_dispatch`-gated publish workflow
  with a dry-run mode and a version-agreement guard mirroring `release.yml`.
- **Naming, settled before implementation:** package `agent-skills-toolkit` (verified available on
  npm). **Exactly one bin, of the same name.** No `askit` alias: that package exists on npm and belongs
  to someone else, so `npx askit` from a clean environment would fetch and execute their code while the
  failure looked like ours. Four saved keystrokes is not worth an execution-confusion footgun.
- **Excluded from the tarball deliberately:** `scripts/eval-run.mjs`, `scripts/lib/eval-run-aggregate.mjs`,
  `scripts/lib/advisory-score.mjs` and `scripts/standards-watch.mjs`. These read paths relative to
  **this** repository, including a default scoring key inside `tests/fixtures/`. Shipping them
  half-working inside someone else's `node_modules` is worse than not shipping them.
- **Acceptance:** the consumer-position proof. `npm pack`, install the tarball into a clean temp
  directory outside this checkout, copy a fixture plugin to a second temp directory so nothing resolves
  back here, run the binary against it, and confirm the grade and exit code. Transcript recorded
  verbatim. **Anything less is a claim, not a proof**, and this repository's hardest-won rule is that
  an instruction published for consumers gets executed once from the consumer's position.
- **Not in scope:** the actual `npm publish`. The maintainer runs it. The workflow exists to make that
  one command safe and repeatable, not to fire on its own.

### W2 - Machine-readable output

- **Why:** backlog E4 (SARIF and GitHub annotations), E9 (provenance as a consumable output contract),
  E23 (provenance in the report). Findings that land in the Security tab and inline on a diff are the
  difference between a grade and a gate.
- **Scope:** `--json` on `check.mjs` emitting a **gate-only** object (not `evaluate.mjs`'s report,
  whose `byRule` and `dispositions` are analysis the gate does not compute); SARIF 2.1.0 with
  provenance carried as a rule property so a consumer can filter to portable objective failures only;
  GitHub Actions annotation output; and provenance made visible in the terminal, Markdown and HTML.
- **The line-number constraint, and the rule for it:** no finding carries a line number anywhere in the
  repository today. An optional `line` field establishes the contract, SARIF emits a `region` **only**
  when one is present, and exactly one check is given a real line to prove the path end to end.
  Emitting `startLine: 1` to fill the field would be inventing evidence, which is the one thing this
  gate exists not to do. Retrofitting thirty check modules is a separate release.
- **Acceptance:** identical findings, counts and exit code before and after on a fixture with real
  findings; `--json` parseable and carrying provenance; a real SARIF document with structural
  assertions and **no new runtime dependency**; golden snapshots regenerated with the diff confirmed to
  be only the intended addition.

### W3 - GitHub Action and a generated tier badge

- **Why:** the Action is how a stranger adopts the gate without reading anything. The badge retires the
  front-door drift class permanently: a badge computed in CI at a sha cannot go stale the way a
  hand-maintained one did for two releases.
- **Scope:** a published Action wrapping the gate, and CI publishing a tier report plus a shields
  endpoint so the README badge reads tier at sha, with the Standard pin and date.
- **Known plumbing gap:** there is no existing artifact-publishing step to ride. `deploy-pages.yml`
  uploads only `site/dist` from the site's own build. Either the badge JSON is written where the site
  build will serve it, or a new job is added. Decide deliberately and record why.
- **Acceptance:** the badge reflects a real graded sha, and a deliberately-broken fixture changes it.

### W4 - Validator-parity harness, report-only

- **Why:** the parity evidence recorded in v1.10.1 is a dated one-off. Making it structural is what
  turns "the gate never disagrees with a first-party validator" from a claim into a property.
- **Scope:** a CI job running `claude plugin validate --strict` on the repo and the seed template, and
  `skills-ref` across `skills/*`. **Report-only for one release**, then gating, matching the warn-first
  precedent. Needs a small ADR defining the parity contract and the documented-exception path.
- **The requirement that makes it worth building, from ADR 0040:** the harness must assert on **parsed
  values**, not only exit codes. `agentskills validate` passed all 24 skills while `metadata.chain`
  was being silently mangled, because the validator never inspects `metadata` contents. A harness that
  checks exit codes reproduces that blind spot in CI and calls it coverage.
- **Risk to resolve during the work:** whether the `claude` CLI is installable and runs offline on a
  runner. If not, the fallback is a vendored manifest-schema check plus a documented local-run
  requirement in the release gate.

### W5 - Bronze installability

- **Why:** `claude plugin validate templates/seed-plugin --strict` fails with "No manifest found in
  directory", while the README promises a Bronze plugin "is installable and behaves the same on Claude
  Code, Codex, and the broader agentskills.io ecosystem." One of those has to move.
- **Scope:** `askit-init-plugin` and the seed template emit a minimal `.claude-plugin/plugin.json` by
  default. Since Codex 0.146.0 reads `.claude-plugin/*` directly, that single file buys install
  recognition on **both** vendors, which is the cheapest possible resolution.
- **The Standard question is separate and deliberately deferred:** does Bronze itself *require* a native
  manifest (a spine change, warn-first), or does the tier stay silent while the tooling defaults it? A
  companion ADR decides tooling-default now and defers the spine decision to evidence.
- **Acceptance, corrected during the work.** The criterion first written here was "the seed passes
  `claude plugin validate --strict`", inherited unqualified from the audit's A4 item. **That criterion
  is wrong, and the implementation is what proved it.** The vendor requires a real `author` object for
  `--strict`, and a template has no author to declare. Satisfying it would mean shipping
  `"author": {"name": "REPLACE - your name"}` in every scaffolded plugin, which is the same defect
  `U5` (description-score) already penalizes as a placeholder under ADR 0033 (recalibrate U5
  description scorer): a `TODO` that scores well is the scorer being fooled, and a fabricated
  attribution that satisfies a validator is that with a different hat on.
  The corrected criterion is a **two-state split**:
  - the raw `templates/seed-plugin` passes plain `claude plugin validate` and **warns** under
    `--strict`, because a template genuinely has no author and the vendor is right to say so;
  - a plugin scaffolded through `askit-init-plugin`'s interview, where the author is asked for and
    supplied, passes `--strict`;
  - an interview where the author is **declined** emits no `author` key at all rather than an empty or
    placeholder one. A missing optional field is honest; a fabricated one is not.
  Plus: the seed still grades Universal with 0 errors, `U8` (manifest-drift) never compares `author`
  in either direction (locked by new tests), and QUICKSTART and the Bronze tutorial describe **both**
  states rather than asserting one. All of it re-run from a consumer position.
- **Known gap, disclosed rather than left inconsistent:** `questionnaire` and `hybrid` onboarding modes
  do not ask for an author yet; only `interview` does.

## Riders

Cheap items from the v1.10.1 backlog that belong with work already being touched:

- **E28** (`clampNotice` never reaches the Markdown or HTML reports). W2 is already in the renderer and
  now has `migrationNotice` as the pattern to copy.
- **E29** (the count guard cannot tell a quoted example from a live claim; needs `stripCode`, currently
  private to a graded check module). Only if W2's renderer work makes the shared-helper move safe with
  `U6` characterization tests pinned first. **Drop it rather than rush it.**

## Explicitly out of scope

- The actual `npm publish` and any marketplace listing. The maintainer's call.
- **E26** (`U13` carries the same config-escalation exposure the migration cap closed). Lowering a
  severity is always safe under ADR 0027, so this is scope-bound, not policy-bound, and it belongs with
  the vendor-alignment batch.
- Any new spine check, any Standard bump, anything that moves a third-party tier or exit code.
- Line numbers on findings generally (see W2).

## Process changes carried from v1.10.1

Six adversarial review rounds produced seventeen findings, sixteen introduced by that release. Two
mechanisms recurred, and both have a countermeasure that worked:

1. **A document written from the plan goes stale as the plan moves.** Countermeasure: claims are
   written **last, from the code.** This file is the plan and says so; the packet README is written at
   the end.
2. **A defect is fixed at the reported instance while the identical defect one file away is left
   standing**, sometimes created in the same commit. Countermeasure: **shared helper from the first
   commit**, plus an existence-only invariant test so a second private copy cannot be added quietly.
   Applied here to any parsing or mapping rule W2 or W3 introduces.

Third change: **adversarial review runs per workstream as it lands**, not once before the tag. In
v1.10.1 rounds 2 through 6 were all reviewing corrections, which is the expensive way to find this
class.
