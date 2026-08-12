# Release plan - v1.12.0 "marketplace scope"

- **Type:** MINOR. New evaluation scope, no new spine check, no Standard bump.
- **Baseline:** `main` @ `f57aa3f` (tag `v1.11.1`), gate Advanced 0/0, 948 tests 0 failures, spine 30, Standard 0.12, 24 skills.
- **Branch:** `release/v1.12.0`.
- **Thesis:** the gate can grade a plugin. It cannot grade a **catalogue**. Everything that exists only *between* members - a skill name two members both claim, an entry that resolves to nothing, a registry version that disagrees with the member's own manifest - is structurally invisible to a loop a person runs by hand. ADR 0039 (marketplace-scope evaluation) settled the design and was accepted with zero implementing code. This release writes it.

> **How this document is written.** This file states **intent and acceptance criteria**. It is not a
> status report and will not be edited into one. State belongs in `README.md` in this folder, written
> **last, from the code**. If you are reading this mid-release, every line is "what we set out to do",
> not "what is".

## The governing invariant

**No existing verdict moves, and the spine stays at 30.**

A marketplace run is an aggregation of per-member verdicts the gate already computes, plus deterministic
comparisons over data the resolve step already loads. It introduces no new per-member semantics, no new
tier requirement, and no numbered check. A plugin graded alone before this release grades identically
after it. If that is ever untrue, this stopped being a new scope and became a Standard change, which is
a different release with a different ADR.

## Two things this release will surface that look like failures and are not

**1. The family marketplace will go red the first time this runs.** `thinking-framework-skills`
declares `advanced` and earns Convergent, its single error being `G4` (index-drift) caused by *this
toolkit's own* v1.10.0 `gen-index` fix. Under ADR 0039's self-consistency worst-member rule that reds
the collection. That is the scope working. The tempting repairs - lowering that member's declared tier,
adding an exemption, or tuning the aggregation to a threshold - are all the failure ADR 0039 Question 2
option C rejected by name. The release ships red-on-the-family and says so.

**2. The collection verdict is not the published-truth verdict.** Question 1 grades local checkouts.
The pin sha, entry version, graded sha and divergence marker are unconditional report columns precisely
so a reader cannot mistake one for the other. Remote fetch-at-sha stays deferred.

## A deliberate narrowing, stated up front

`docs/internal/STATUS.md` and the divergence-resolution plan (sec 9.5) both assign **A6, the
plugin-shipped-subagent restricted-fields check**, to this release. It ships here as a
**marketplace-scope-local finding over each member, not as a numbered plugin-scope check**, for a
reason the repository's own rules force:

ADR 0027 (Standard versioning and compatibility policy) says a new tier requirement ships as a `warn`
for one Standard minor before it can gate. A new numbered check is therefore a Standard 0.12 to 0.13
bump. Standard 0.13 also graduates `U13` (skill-registration) from `warn` to `error` and graduates
ADR 0041's string-shaped-chain migration cap, and it belongs to v1.13.0's alignment batch, which the
roadmap already reserves for exactly that cut. Dragging the Standard bump into this release to carry one
new check would tighten the contract for every existing plugin as a side effect of a marketplace
feature. The tests enforce this rather than trusting it: `tests/unit/registry-sync.test.mjs` asserts the
spine is exactly 30 and that `provenanceByReq()` covers every registered check, so a null-reqId module
in `CHECKS` fails CI by construction.

So A6's *detection* ships now, where a collection run can see it across every member at once, and its
*graduation* to a numbered plugin-scope requirement is filed for the Standard 0.13 cut.

## Workstreams

### W1 - Flip the validator-parity harness to gating

- **Why:** ADR 0042 (validator parity is report-only and checks parsed values) scheduled the flip and
  named the evidence that releases it: "the mechanism completing at least one real release cycle in
  actual CI with no new undocumented disagreement left unresolved at the point of the flip - not a fixed
  calendar date". Two release cycles (v1.11.0, v1.11.1) have now completed with `validator-parity` green
  on GitHub-hosted runners.
- **Note the conflict, resolved:** `_local/audit/2026-08-10_fable/09-divergence-resolution-plan.md`
  sec 9.5 maps this flip to v1.13.0. That document is a recommendation packet whose own header says
  every criterion in it is proposed, not ratified. ADR 0042 is the ratified decision and it replaced the
  release-number rule with an evidence condition. The evidence condition governs.
- **Scope:** `PARITY_MODE` changes from `"report-only"` to `"gating"` in `scripts/check-parity.mjs`, its
  docblock and header comment are updated to describe the shipped state rather than the pending one, and
  the discharge is recorded with a captured run.
- **The consequence being accepted, named rather than discovered:** under gating,
  `metadataParityUnavailableResult()` fails closed. A CI run where the `uv`/`uvx` install fails now reds
  a required check rather than printing a line nobody reads. That is the correct behavior for a harness
  built because silence hid a defect for two releases, and it is a new failure mode taken on knowingly.
- **Acceptance:** `node scripts/check-parity.mjs .` exits 0 on a clean tree with the one documented
  ADR 0043 exception annotated; a seeded metadata-parity mismatch exits 1 without the `--mode=` override;
  the `validator-parity` job is green on the PR before merge.

### W2 - The marketplace scope itself (ADR 0039 core)

- **Why:** the accepted design, unbuilt.
- **Scope:** a delimited module home under `scripts/lib/marketplace/` plus a third branch in
  `evaluate()`. Detection is a directory carrying `.claude-plugin/marketplace.json` whose entries
  resolve to member **plugins** rather than under `skills/`; the marketplace-of-skills shape stays with
  `U13` and the two scopes must be provably disjoint. Per-member config resolves through `loadConfig`
  then CLI override then `resolveFindings`, rooted at that member's own directory (ADR 0034's invariant
  extended to a third scope). Aggregation is self-consistency worst-member.
- **The unresolvable-versus-absent split, which is the subtle part:** a catalogue entry that is broken
  (no source, malformed source, or a source naming a member that does not exist) **reds** the
  collection. A well-formed entry whose member simply is not cloned on this machine is reported
  `not-graded` and does **not** red, with the coverage count carried unconditionally on the verdict
  line. The first is a defect in the artifact; the second is a gap in the environment reading it.
- **Deterministic finding classes, all scope-local and unnumbered:** manifest shape, entry
  resolvability, duplicate catalogue names, cross-member skill-directory collision, cross-member
  command-name collision, registry-versus-member version agreement.
- **Advisory analyses, which can never move the verdict or the exit code:** cross-member trigger-surface
  collision, command-versus-skill enumerated-content divergence, and embed/content-duplication lineage.
- **Acceptance:** a malformed manifest is a finding, never a crash; a test asserts marketplace scope and
  `resolveRegistrationSource`'s declined branch stay disjoint; the family marketplace grades in one run
  with all six members accounted for; a fixture collection with a seeded collision, a seeded dead entry
  and a seeded version disagreement produces exactly those three findings and no others.

### W3 - The collection report

- **Why:** a verdict nobody can read is not a verdict. This is the sixth report type.
- **Scope:** `scripts/lib/report-render.mjs` gains a marketplace type, factored per report type with the
  existing golden snapshots as the safety rail. Every member row carries, unconditionally: registry pin
  sha, registry entry version, graded sha, divergence marker, declared tier, earned tier, and Standard
  debt. The verdict line carries the coverage count unconditionally. Tier distribution across members is
  shown.
- **Why unconditional columns:** a report that shows the pin only when it disagrees teaches a reader to
  assume agreement from silence, which is the failure ADR 0038 corrected at plugin scale.
- **Acceptance:** the five existing golden snapshots regenerate byte-identical or diff purely
  additively; terminal, JSON, Markdown and HTML all render the collection; a member that is
  `not-graded` is visibly distinct from one that failed.

### W4 - New source kinds and the `renames` field

- **Why:** the catalogue vocabulary has moved past `url` + `sha` and local paths.
- **Scope:** `npm`, `archive` + `sha256`, and `git-subdir` source kinds, plus the `renames` field,
  accepted in both `askit-init-marketplace` and the new scope. Accepting a source kind means
  classifying and reporting it correctly, including reporting honestly that a kind cannot be resolved
  to a local checkout. It does **not** mean fetching it: remote fetch stays deferred per ADR 0039.
- **Acceptance:** a catalogue using each kind parses, classifies, and reports without a crash and
  without a false "unresolvable entry" red for a kind that is simply not locally resolvable.

### W5 - A6, restricted fields on plugin-shipped subagents

- **Why:** `hooks`, `mcpServers` and `permissionMode` are silently ignored in plugin-distributed
  agents. Same silent-no-op class as the v1.10.0 phantom-subagent discovery: objective, vendor
  documented, and invisible today.
- **Scope:** detection over each member's `agents/*.md`, run inside marketplace scope, with the vendor
  documentation cited in the finding. `askit-build-subagent` guidance updated. See the narrowing note
  above for why this is not a numbered check in this release.
- **Acceptance:** a fixture agent carrying a forbidden field produces a finding naming the field and
  citing the vendor doc; an agent without one produces nothing; the spine is still 30.

### W6 - The registry page

- **Why:** the collection report rendered to the docs site is the first public artifact that shows a
  whole portfolio graded at once, and it is the prototype the v1.15.0 external cohort page grows from.
- **Scope:** a docs-site page rendering the collection report. Four tracked files, per the house rule
  this repository has already been bitten by: the page, its folder README, the route manifest, and the
  CHANGELOG entry. The site must be **built** before route parity is checked or the check fails as
  "baseline route removed".
- **Honesty constraint:** the page shows the graded-local verdict with its pin columns and coverage
  count intact. It must not read as a published-truth registry, because it is not one yet.
- **Acceptance:** the site builds; route parity passes after a build; the page carries G7 frontmatter;
  no quadrant is emptied.

### W7 - A graded findings report for `thinking-framework-skills`

- **Scope:** re-measure all six family members first, because ADR 0039's evidence table has been
  measured three times in five days and moved on two of them, and the catalogue has since gained a sixth
  member the table does not list. Then produce a findings report for `thinking-framework-skills`
  **without editing that repository**. The report is the deliverable; the remediation is that
  repository's maintainer's call.
- **Acceptance:** every number in the report is reproducible by a stated command; nothing in the
  `thinking-framework-skills` working tree is modified.

### W8 - Records

- `docs/internal/execution/relocation-addendum.md` gains the packing-list delta for every new file, per
  ADR 0039's implementation-sites requirement, so the Standard's eventual relocation stays a mechanical
  diff.
- `docs/internal/RELEASE.md` gains the **npm publish step**, which has been missing since v1.11.0 made
  the package real. A checklist that omits a step the release actually has is the drift class this
  repository keeps rediscovering.
- `STATUS.md`, `RELEASE-HISTORY.md`, `CHANGELOG.md`, `RELEASE-NOTES.md`, `README.md`.

## Verification protocol

Unchanged from v1.11.0 and non-negotiable:

- `node scripts/check.mjs .` and `npm test` before and after.
- `npm run release-counts` after any test count is written, and **counts written last, from the code**.
- Any instruction published for a consumer is executed once from the consumer's position.
- No report claims a tier nobody declared.
- Do not run two full suites concurrently. A first run of the suite during this release's own
  reconnaissance reported one failure while `release-counts` was running its own suite in parallel; a
  clean solo re-run was 948 tests, 947 pass, 0 fail, 1 skipped. Treat a concurrent-run failure as
  unmeasured, not as a result.

## Out of scope, deliberately

- Remote fetch-at-sha (ADR 0039 defers it; the pin columns disclose the limit).
- Graduating any cross-member finding to a numbered spine check (its own ADR, with a burndown).
- The Standard 0.13 cut, `U13`'s graduation, and ADR 0041's cap graduation (v1.13.0).
- Editing any family member repository.
