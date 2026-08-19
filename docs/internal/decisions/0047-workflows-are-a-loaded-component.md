# 0047 - Workflows become a loaded component, and the mirror half waits behind a window

## TL;DR
- **Decision:** E43 is two changes with opposite risk, and they ship separately. (1) **The loader builds `ctx.workflows`** from `_workflows/*.md` (excluding `README.md` and `_`-prefixed control files, mirroring `listCommandFiles`), so `S7` (`command-contract`) stops reporting a command that maps to a real workflow as unresolved. This can only REMOVE a finding, so it ships as a bug fix with **no migration window**. (2) **`S3` (`components-index`) gains the workflow half of the components mirror**, which can only ADD findings, so it ships as a subrule tightening with finding-level `migration` metadata: introduced at Standard **0.14**, gating at **0.15**.
- **Why:** `command-contract.mjs` reads `ctx.workflows` and the loader has never built it. The source comment says "ctx.workflows arrives in a later phase". The consequence is a published gate finding that states something untrue about the consumer's filesystem: `maps-to "fx-arc" but no skill or workflow by that name exists on disk`, against a repository containing `_workflows/fx-arc.md`.
- **Measured, both halves.** Part 1 moved **nothing** on the family. Part 2 without a window cost `thinking-framework-skills` a tier (Convergent to Universal, +9 `S3` errors). Part 2 **with** the ADR 0044 window moved **no verdict**: the check emits `error`, the ceiling resolves it to `warn`, and the nine findings land in Standard debt due at 0.15.
- **Status:** Accepted (ratified 2026-08-14).

- **Date:** 2026-08-14
- **Deciders:** maintainer (jprisant), with Claude (Opus 5)

## Builds on
- **ADR 0044 (one post-resolution Standard ceiling and config provenance)** - point 4 is the whole basis for splitting this ADR in two: *a new or tightened SUBRULE under an existing reqId needs finding-level `migration` metadata*, because `meta.since` describes when the CHECK appeared and says nothing about when a rule inside it did. `S3`'s `since` is `0.x`, so without finding-level metadata the workflow subrule would arrive with no window at all. This ADR is the first live use of that provision, and it was verified against the family rather than trusted.
- **ADR 0027 (Standard versioning and compatibility policy)** - the tightening half is a Standard change and takes the 0.14 minor with it.
- **ADR 0046 (the agents/ directory holds only registered subagents)** - the sibling. Both ADRs contain a green-ward correction to a check that asserts a shipped file is absent, and both conclude that such a correction is not a tightening and needs no window. The two were found the same way, one week apart, by building a fixture rather than by reading the code.
- **E43** (`backlog/enhancements.md`), filed 2026-08-14 from round 8 of the v1.13.0 adversarial review.
- **Standard sec 3.4** (Workflow, Convergent) - the component this ADR finally loads: *"`_workflows/<name>.md` defining ordered steps, the skill invoked at each step, inputs/outputs handed between steps, and exit criteria."*

## Context and problem statement

A workflow is a first-class Convergent component in the Standard, with a defined location and format. The loader has never known about it. `loadPlugin()` builds `skills`, `subagents`, `agentDocs`, `commands`, `mcpServers` and the two native manifests, and no `workflows`.

Three checks and one absence result:

- **`S5` (`workflow-skills`)** hand-rolls its own read of `_workflows/`: `readdirSync`, a `.md` filter, a `statSync().isFile()` guard, then `parseFrontmatter` per file. It does not exclude `README.md`; the file simply has no `steps` array, so it falls through.
- **`S4` (`chain-contract`)** hand-rolls a different read: `isDir(_workflows)`, used only as a boolean "is chaining in use".
- **`S7` (`command-contract`)** reads `ctx.workflows`, which is `undefined`, so `workflowNames` is always empty and `known` is only skill names.
- **`S3` and `S8`** do not consider workflows at all. `S3` shape-checks every key under `components` for array-ness, so a malformed `components.workflows` fails closed, but nothing ever mirrors it against disk.

**The live consequence, reproduced on a fixture.** A plugin with `_workflows/fx-arc.md` on disk and `commands/fx-run.md` declaring `maps-to: fx-arc` is told:

> `[error/house] command-contract (S7): commands/fx-run.md maps-to "fx-arc" but no skill or workflow by that name exists on disk (Standard sec 3.2).`

It is on disk. This is the same defect class as the `S3` false claim in ADR 0046: a gate finding making a false statement about the consumer's filesystem, in a check the consumer cannot argue with. The remediation it implies - delete the mapping, or rename the workflow to a skill - is destructive advice derived from a wrong premise.

**Why nobody hit it.** Of the six family members, two ship `_workflows/`. `thinking-framework-skills` has nine workflows and one command, whose `maps-to` names a skill. `pm-skills` has twelve workflows and ten `commands/workflow-*.md` files, none of which declares `maps-to` at all, so all ten fail on the missing-declaration branch before the resolution branch is reached. The defect has been latent for as long as the field has been read.

There is a second-order fact worth recording, because it will surprise the author who fixes the ten pm-skills commands: the command names and the workflow names do not correspond. `commands/workflow-design-sprint.md` would have to declare `maps-to: design-sprint`, not `maps-to: workflow-design-sprint`. Building `ctx.workflows` does not make those ten commands pass; it makes them *able* to pass.

## Decision drivers

- A check that states a falsehood about the filesystem must be corrected at once, not held behind a window sized for a rule change.
- One reading of `_workflows/` in the loader, not three in three checks, for the same reason the loader owns every other component list: three readers drift, and here they already have (`S5` includes `README.md`, a correct loader must not).
- A tightening that costs a family member a tier is exactly what ADR 0044's window exists for, and shipping it without one would violate the rule v1.13.0 was built to establish.
- `_workflows/` is a HOUSE construct, not a vendor one. No runtime scans it. This is the load-bearing difference from `agents/` and it decides the `README.md` question.

## Considered options

**Option A - build `ctx.workflows` and stop there.** Fixes the false claim. Rejected as the complete answer, not as a step: it leaves workflows the only Convergent component with no mirror between manifest and disk, so a plugin can ship nine workflows, declare none, and be told nothing. That asymmetry is the `U13` skill-registration argument (a component on disk but unregistered ships invisibly) applied to a component type that was simply forgotten. Adopted as **part 1**.

**Option B - build `ctx.workflows` and extend `S3` and `S8` in one change, unwindowed.** Rejected on measurement, not on principle. Prototyped and graded: `thinking-framework-skills` fell from Convergent to Universal on nine new `S3` errors for the nine workflows it ships and does not declare. A member losing a tier is precisely the outcome the run's own limits name as a stop-and-report.

**Option C - make the mirror conditional on the plugin already declaring `components.workflows`.** This is `U13`'s conditional shape ("where the plugin's manifest enumerates skills"). Rejected here: under it, a plugin that declares nothing is never told anything, which is the same silence as Option A wearing a rule. `U13`'s conditionality earns its keep because a manifest that enumerates *some* skills is evidence the author intended enumeration; a plugin with no `components.workflows` key has expressed no such intent, so the conditional would exempt exactly the population the check is for.

**Option D (chosen) - part 1 unwindowed as a bug fix, part 2 windowed as a subrule tightening.** The two halves have opposite risk directions and there is no reason they should share a release gate. Part 1 can only remove findings; holding a false statement behind a migration window would apply the rule against the interest it exists to protect (the same argument as ADR 0046 point 6). Part 2 can only add them, so it takes finding-level `migration` metadata per ADR 0044 point 4.

**`S8` (`components-mirror`) is deliberately NOT extended in this ADR.** Its subject is status and tier fields mirrored between a manifest entry and a component's frontmatter. Workflows in the wild carry `title:` and `steps:`, not `metadata.status` or `metadata.tier`, so extending `S8` today would add a rule with no population. It is deferred until the Standard says what a workflow's frontmatter contains, which is a question this ADR does not answer.

## Decision outcome

**1. `listWorkflowFiles(root)` is added to `scripts/lib/fs-utils.mjs`,** mirroring `listCommandFiles`: `_workflows/*.md`, excluding `README.md` and `_`-prefixed files.

**2. The `README.md` exclusion is correct here and would have been wrong in `agents/`, for a stated reason.** No runtime scans `_workflows/`; it is a Standard construct that only this toolkit reads. A folder guide there creates no phantom in any runtime, so excluding it from the workflow list is a naming convention rather than a concealment. In `agents/` the identical exclusion hides a file the vendor loads, which is why ADR 0046 goes the other way. The two decisions look contradictory and are not, and the code must say so or the next reviewer will "harmonise" them.

**3. `loadPlugin()` returns `workflows`,** loaded through the same `loadSubagent` shape (`{ name, file, raw, frontmatter, body, parseError }`), with `name` taken from the filename basename. Frontmatter is not consulted for identity: workflows in the wild carry `title`, not `name`, and the basename is what `maps-to` and the Standard's `_workflows/<name>.md` both refer to.

**4. `S7` resolves `maps-to` against skills and workflows,** which is what it was written to do. Its `// ctx.workflows arrives in a later phase` comment is deleted rather than updated, because the phase has arrived.

**5. `S5` and `S4` are repointed at `ctx.workflows`,** so one list serves all three checks. This is behaviour-preserving for `S4` (a non-empty list is the same signal as a present directory, except for a `_workflows/` holding only a README, where the new answer is the better one). For `S5` it is a strict narrowing: `_workflows/README.md` is no longer parsed at all, where today it is parsed and discarded.

**6. `S3` gains the workflow half of the mirror, with finding-level `migration` metadata,** `{ capAt: "warn", until: "0.15" }`, and the subrule is introduced at Standard 0.14. Both directions are covered: a declared workflow not on disk, and a workflow on disk not declared.

**7. Part 1 ships without any version metadata.** It is a bug fix whose only possible effect is to withdraw a finding, at any pin, in any mode.

## Consequences

- **Part 1's blast radius on the family is ZERO, measured before and after.** No member's verdict, tier, error count, warning count, per-check census or Standard debt moved.
- **Part 2 without a window costs a tier, measured.** `thinking-framework-skills`: Convergent to Universal, errors 1 to 10, `S3` gated errors 0 to 9. This is recorded here because it is the number that justifies the window, and because a future reader deciding whether to graduate the subrule at 0.15 needs to know what graduation will do.
- **Part 2 WITH the window moves no verdict, measured.** Emitted `S3` errors 0 to 9; resolved `S3` warnings 0 to 9; Standard debt 121 to 130; ceiling due 0.15; tier, error count and exit code unchanged. **This is the first live exercise of ADR 0044 point 4** (a subrule under an existing reqId), and it behaved exactly as that ADR specified.
- **`thinking-framework-skills` pins Standard 0.8 and carries 121 findings of Standard debt already.** Nine more is a 7 percent increase in a number that is already the largest in the family. The debt is the intended signal, but a member this far behind will not experience the graduation at 0.15 as a migration; it will experience it as a cliff, whenever it re-pins. That is a conversation for the family, not a reason to change the mechanism.
- **The Standard gains a mirror obligation for workflows** and the 0.14 version note must state the 0.15 graduation, because a tightening whose graduation is not written down is the `U13` situation ADR 0044 was written after.
- **`S5`'s inline `_workflows/` reader disappears**, and with it the third copy of "what is a workflow file". `S5` keeps its own frontmatter `steps` parsing, which is its subject matter.
- **The ten `pm-skills` workflow commands remain failing after part 1**, on the missing-`maps-to` branch, and their names do not match their workflows. Anyone reading "E43 is fixed" should not expect that member's `S7` count to move.
- **`components.workflows` becomes a manifest key with a meaning.** It was already shape-validated by `S3`'s array check over every key; now it is also mirrored. A plugin that had been using it as free-form documentation will be told about the disagreement at 0.15.

## Implementation sites
- `scripts/lib/fs-utils.mjs` - **new** `listWorkflowFiles(root)`, beside `listCommandFiles`, with a docblock stating why `README.md` is excluded here and included by `listRuntimeAgentDocs` (ADR 0046). The two exclusions must be explained together or they read as an inconsistency.
- `scripts/lib/load-plugin.mjs` - the import, `const workflows = ...`, and `workflows` on the returned context. The header comment's component list gains it.
- `scripts/checks/command-contract.mjs` (`S7`) - the `// ctx.workflows arrives in a later phase` comment is removed. No other change; the code was already correct.
- `scripts/checks/workflow-skills.mjs` (`S5`) - the inline `readdirSync` / `statSync` / `parseFrontmatter` loop is replaced by iteration over `ctx.workflows`, reading `w.frontmatter.steps`.
- `scripts/checks/chain-contract.mjs` (`S4`) - `hasWorkflows` becomes `(ctx.workflows || []).length > 0`.
- `scripts/checks/components-index.mjs` (`S3`) - the workflow mirror, both directions, each finding carrying `WORKFLOW_MIRROR_MIGRATION = { capAt: "warn", until: "0.15", reason: ... }`.
- `STANDARD.md` - sec 3.4 gains the mirror rule; sec 5.1's components list gains `workflows`; the 0.14 version note records the introduction and names 0.15 as the graduation.
- `tests/unit/command-contract.test.mjs` - a regression test that `maps-to` naming an existing `_workflows/<name>.md` produces no finding, and that a `maps-to` naming nothing still does.
- `tests/unit/load-plugin.test.mjs` - `ctx.workflows` excludes `README.md` and `_`-prefixed files and includes everything else; a missing `_workflows/` yields `[]`, not `undefined`.
- `tests/unit/components-index.test.mjs` - both mirror directions, and that each is held at `warn` below pin 0.15 and gates at 0.15.
- `tests/unit/compatibility-matrix.test.mjs` - a row naming the wrong implementation it kills: shipping the `S3` workflow mirror without finding-level migration metadata, which costs a real family member a tier.

Grep anchor: `listWorkflowFiles` in `scripts/lib/fs-utils.mjs`, and `WORKFLOW_MIRROR_MIGRATION` in `scripts/checks/components-index.mjs`.

## Correction, 2026-08-18: the graduation no longer costs `thinking-framework-skills` nine errors

**The decision above is unchanged and is not amended. Nothing is reverted.** This note corrects one
FORWARD-LOOKING claim in the Consequences section, which said, in the ADR's own words, that a future
reader deciding whether to graduate the subrule at 0.15 *"needs to know what graduation will do"* and
then told that reader it costs `thinking-framework-skills` a tier: Convergent to Universal, errors 1 to
10, `S3` gated errors 0 to 9.

**That is no longer true, and the reason is the best possible one: the member fixed it.**

| | At the sha the family registry graded (`dbe71d8`) | At `thinking-framework-skills` HEAD (`60aa2a0`) |
| --- | --- | --- |
| `_workflows/*.md` on disk | 9 | 9 |
| `library.json` `components.workflows` | **absent** | **9, names matching disk exactly** |
| `S3` workflow-mirror findings | 9 | **0** |

The commit is **`fd343dd`, 2026-08-15**: *"feat(workflows): declare the nine recipes, and gate the mirror
locally."* That is **one day after this ADR was ratified**, and inside the window this ADR created.

**Why this correction matters more than its size.** The nine-error figure was recorded here precisely so
that the 0.15 graduation decision would be made against a real number rather than a guess. Left standing,
it would have argued for extending the window to protect a member that no longer needs protecting. Read
correctly, it argues the opposite and is the strongest evidence available: **a member saw a warning,
understood it, and discharged it before the deadline.** That is the entire designed behaviour of a
warn-first migration under sec 7.7, observed end to end for the first time in this repository. Extending a
window whose subject has already discharged it protects nobody and teaches the next member that the date
is negotiable.

**Measured 2026-08-18 across the whole family, not just this member:** zero `S3` workflow-mirror findings
and zero `U17` findings at every member's own pin. The graduation cannot move a verdict anywhere.

**What is deliberately NOT corrected.** `docs/internal/STATUS.md`'s v1.14.0 ADR-pack row still records
*"9 warns on `thinking-framework-skills`, no verdict moved"*. That is a correctly-dated historical
measurement of what was true on 2026-08-14 and it stays as written. This ADR's claim needed correcting
because it was written in the future tense about a decision not yet taken; that row was written in the
past tense about a measurement already taken.

**Reproduction.** Compare `library.json` `components.workflows` against `_workflows/*.md` at both shas,
then grade the member with the real gate and filter findings to `reqId` `S3`. Do **not** measure this by
mutating the pin in memory: `INDEX.md` embeds the Standard pin, so a mutated pin fires `G4` and looks like
a verdict move that has nothing to do with either graduating check.
