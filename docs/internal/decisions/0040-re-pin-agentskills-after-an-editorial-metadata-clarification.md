# 0040 - Re-pin agentskills.io after an editorial metadata clarification, and fix the value-type defect it exposed

## TL;DR

- **Decision:** Re-pin only. The 2026-08-11 upstream change is **editorial**, so no check changes, no Standard bump, and no burndown. Separately, investigating it exposed a real conformance defect of ours (`metadata.chain` was a YAML list where the spec defines string values, and the reference implementation silently rewrote it), which is fixed in v1.10.1.
- **Why:** The clarifying text the upstream added to its summary table already existed **verbatim** in the pinned revision's own `#### metadata field` subsection. Nothing upstream requires changed. What did change is our understanding of what we were already required to do.
- **Status:** Accepted.

- **Status:** Accepted
- **Date:** 2026-08-11
- **Deciders:** maintainer (jprisant), with Claude (Opus 5)

## Builds on

- ADR 0027 (Standard versioning and compatibility policy) - defines the warn-first burndown that a tightening would have triggered, and which this decision establishes is **not** owed here.
- PR #204 (the chain frontmatter migration) - moved `chain` from a top-level key to `metadata.chain`, which is the change this decision finds incomplete.
- `docs/internal/standards-watch/upstream-pin.json` - the pin this decision moves.

## Context and problem statement

`STANDARD.md` sec 6 states, normatively, that where agentskills.io evolves the Universal tier MUST track it. `askit-standards-watch` implements that by pinning a git blob SHA-1 per normative upstream artifact. A watch run on 2026-08-11, against a pin verified 2026-07-27, returned `VERDICT: material-change`.

Watched artifacts:

| Artifact | Role | Pinned blob | Observed blob | Changed |
|---|---|---|---|---|
| `docs/specification.mdx` | normative-prose | `20cf9f6b6723` | `d9a2db099d90` | yes |
| `skills-ref/src/skills_ref/validator.py` | reference-implementation | `22cf6f8ae5f9` | `22cf6f8ae5f9` | no |
| `skills-ref/src/skills_ref/models.py` | reference-implementation | `77fa89ed2ccc` | `77fa89ed2ccc` | no |
| `skills-ref/src/skills_ref/parser.py` | reference-implementation | `690c14e27b61` | `690c14e27b61` | no |

Three deltas were reported: one classified `material` structurally, two located and deliberately left unclassified for a human read. This ADR is that read.

### What the diff actually is

Both blobs were fetched and diffed in full. The file went from 245 to 247 lines in **exactly two hunks**. A heading-structure comparison confirms every `##` and `###` heading is identical in name, count and order; only line numbers shift by two.

**Delta 1, the `### Frontmatter` table row (classified `material`, lands on U3).**

| | Text |
|---|---|
| Before | `` | `metadata` | No | Arbitrary key-value mapping for additional metadata. | `` |
| After | `` | `metadata` | No | Arbitrary key-value mapping for additional metadata (a map from string keys to string values). | `` |

The appended parenthetical is **not new to the specification.** The pinned revision already contained, in its dedicated `#### metadata field` subsection:

```
The optional `metadata` field:
- A map from string keys to string values
- Clients can use this to store additional properties not defined by the Agent Skills spec
- We recommend making your key names reasonably unique to avoid accidental conflicts
```

That subsection is **byte-identical between the two revisions**. The upstream synced its summary table to prose that was already published. The constraint did not change; its visibility did.

The upstream says so itself. The commit that carries this change is `217be548` (2026-08-04), *"Merge pull request #479 from jonathanhefner/issue-474-clarify-metadata"*. The branch name is the upstream author's own classification, and it agrees with the diff: a clarification, not a new rule. That is corroboration from a second, independent source rather than this decision resting on one reading of one diff.

**Delta 2, the `## Optional directories` section body (unclassified, no check encodes it).**

One introductory sentence was added: "A skill directory may contain any files and directories beyond the required `SKILL.md`. The conventions below are recommendations for organizing common types of content."

No subsection was added, removed or renamed. The three recognized directories remain `scripts/`, `references/`, `assets/`, unchanged. **No new required or recognized directory exists, so there is no coverage gap on our side.** The sentence makes explicit what `## Directory structure` already implied with its `└── ...  # Any additional files or directories` line.

**Delta 3, the `### Frontmatter` section body (unclassified).** This is the same table row as Delta 1, seen at section granularity rather than field granularity. Not an independent change.

### The defect this investigation exposed

The important finding is not upstream's. It is ours.

The spec defines `metadata` values as strings. `skills-ref` enforces that by **coercion rather than rejection**. From the installed `skills_ref/parser.py`, in `parse_frontmatter`:

```python
if "metadata" in metadata and isinstance(metadata["metadata"], dict):
    metadata["metadata"] = {str(k): str(v) for k, v in metadata["metadata"].items()}
```

`validator.py` never inspects the contents of `metadata` at all: it checks that top-level frontmatter keys are in `ALLOWED_FIELDS` and format-checks `name`, `description` and `compatibility`. So a non-string value under `metadata` is silently rewritten at parse time and the validator reports success, because nothing looked.

PR #204 moved `chain` under `metadata` as a YAML list. Measured on the shipped file:

```
$ uvx --from skills-ref python -c "from skills_ref.parser import parse_frontmatter; ..."
chain value : "['askit-skill-author', 'askit-reviewer']"
chain type  : str
```

The declaration a consumer reads through the reference implementation is a string containing a Python list repr. **PR #204 traded a loud failure for a silent corruption**, which is strictly the worse of the two: `agentskills validate` reported "Valid skill" for all 24 skills throughout.

This is the same defect class as the phantom `agents/README.md` subagent and the self-concealing `gen-index` drift, both found in v1.10.0: a thing that passes because nothing inspected it.

## Decision drivers

- sec 6: the Universal tier MUST track agentskills.io. Tracking a change that did not happen is not tracking.
- sec 7.7 and ADR 0027 (Standard versioning and compatibility policy): a new or tightened requirement ships as a `warn` for one Standard MINOR. A burndown that answers no real tightening is cost with no safety.
- The pin's own stated rule: the reference implementation's behavior "defines conformance even when the prose does not move." Here the prose moved and the implementation did not, which by that rule settles it.
- A stale pin makes every future watch run re-report the same delta, and alarm fatigue is how a freshness instrument stops being read.

## Considered options

1. **Track the change** - treat the parenthetical as a new constraint, amend U3 (frontmatter-valid) to reject non-string `metadata` values, bump the Standard MINOR, ship warn-first.
2. **Re-pin only** - record the new upstream revision, change no requirement.
3. **Defer** - leave the pin and revisit.

## Decision outcome

**Option 2, re-pin only.**

Option 1 fails on the evidence: there is no new constraint to track. Amending U3 and bumping the Standard on an editorial sync would move third-party verdicts for a rule the upstream did not add, and would spend ADR 0027's burndown budget on nothing. Whether U3 should learn strict `metadata` value typing at all remains open and belongs with the vocabulary-strictness work already scoped to the vendor-alignment batch, where it can be decided on its own merits with a corpus re-run behind it.

Option 3 fails because the delta is now fully understood. Deferring a resolved question is just leaving an alarm on.

Per delta, explicitly:

| Delta | Requirement change? |
|---|---|
| `metadata` table row synced to existing prose | **No.** Editorial. |
| `## Optional directories` clarifying sentence | **No.** No directory added, removed or re-constrained. |
| `### Frontmatter` section body | **No.** Same row as above at coarser granularity. |

**The defect is handled separately and is not a Standard change.** `metadata.chain` migrates to a delimited string in `askit-build-skill`, `askit-evaluate` and `agents/askit-skill-author.md`, and `S4` (chain contracts) learns to read the string form while continuing to read the array form and the legacy top-level key. That reader change is **purely additive**: no third-party plugin's `S4` verdict moves, which is what keeps this out of ADR 0027's burndown, on exactly the reasoning that made PR #204 itself ADR-free.

> **Correction, 2026-08-11, same day: the paragraph above is wrong and is superseded by ADR 0041 (warn-first string-shaped chain declarations).** The reader change is **not** purely additive. Teaching `S4` to read a string-shaped declaration makes the check newly able to fire on a plugin it was previously blind to: a plugin with a scalar `chain: some-agent` and no contract file would have gone from passing to erroring by upgrading a patch release. Round 1 of the pre-release adversarial review caught it, and ADR 0041 ships the string-derived findings warn-first with graduation to `error` at Standard 0.13. Round 2 then found that the warn-first fix itself did not hold, because `askit.config.json` per-rule overrides are applied after a check emits severity, which is what the finding-level migration cap now closes. Left in place rather than edited away, because the claim is the evidence: it was written, reviewed, and believed, and only an outside pass reading the code against the claim found it false.

## Consequences

- `docs/internal/standards-watch/upstream-pin.json` re-pins `docs/specification.mdx` from `20cf9f6b672391e3295733c7863480905de6b887` to `d9a2db099d905da8b879a5c6f996728073985279`, with `verified.date` 2026-08-11. The three `skills-ref` blobs are unchanged and keep their pinned values.
- No check changes. No Standard bump. Spine stays 30, Standard stays 0.12.
- The next watch run returns clean, so the next non-clean run means something.
- **A limit of the instrument is now on record.** The watcher classified this `material` because it compares the field-constraint text at one site and cannot know the same sentence already existed at another. That is the designed behavior, not a defect: the watcher decides structurally and refuses judgment, and an ADR is where judgment happens. This run is evidence the split works. It is also a reminder that `material` means "structurally decidable", never "important".
- **The re-pin surfaced a defect in the re-pinning tool.** `emitPin()` in `scripts/lib/standards-watch.mjs` takes `repoHeadSha = null` by default and the CLI never supplies it, so the emitted document **carries the previous pin's `repoHeadSha` forward unchanged** while updating the blob SHAs around it. The proposal for this re-pin offered `38a2ff82` (the 2026-07-27 value) when actual upstream HEAD was `69ef37e9`. Saving it verbatim would have written a `verified` block asserting a verification that never happened at that commit, inside the one file whose entire purpose is being auditable by hand. The documented human-review step caught it and the correct value was written, but this repository's standing principle is that nothing should depend on someone remembering. Filed as backlog E25, with the preferred fix being that `emitPin` **drops** a verification fact it cannot establish rather than inheriting a stale one.

> **Update, 2026-08-11: fixed in this same release, and it was worse than described above.** `emitPin` now drops any verification fact the caller did not supply. Round 1 of the pre-release adversarial review then found that the identical rule was being broken **one field over**: `lastUpstreamCommit` was also carried forward untouched while `blobSha` and `surface` were refreshed around it, so a re-pinned artifact named the commit that produced the **previous** bytes. The pin committed alongside this very decision record proved it, carrying blob `d9a2db099d90` beside commit `6868401b` from 2026-05-16 while this document names `217be548` from 2026-08-04 as the commit that actually moved it. Both fields now follow one rule: provenance for an artifact whose bytes moved is dropped unless supplied through the new `artifactCommits` option, and an artifact whose bytes did not move keeps its provenance because that fact is still true. The pin is corrected against the upstream API. **The lesson worth keeping is that fixing the first field did not prompt anyone to look at the second**, and the second was sitting in the same object literal.
- **A limit of first-party validation is now on record, and it is the durable lesson.** Passing `agentskills validate` is weaker evidence than it reads as. The validator does not inspect `metadata` contents, so conformance of anything inside that namespace has to be established by parsing, not by validating. The parity harness scoped for v1.11.0 should therefore assert on parsed values and not only on exit codes, or it will reproduce this blind spot in CI and call it coverage.

## Implementation sites

- `docs/internal/standards-watch/upstream-pin.json` - the re-pinned blob SHA-1 and `verified` block.
- `scripts/checks/chain-contract.mjs` - `check(ctx)`, the `declared` resolution that reads `metadata.chain` as string or array with the legacy top-level fallback.
- `skills/askit-build-skill/SKILL.md`, `skills/askit-evaluate/SKILL.md`, `agents/askit-skill-author.md` - the migrated declarations.
- `tests/unit/chain-contract.test.mjs` - coverage for all three accepted shapes.
- `docs/internal/release-plans/plan_v1.10.1/validator-parity-baseline.md` - the recorded first-party validator results and the reproduction commands.
