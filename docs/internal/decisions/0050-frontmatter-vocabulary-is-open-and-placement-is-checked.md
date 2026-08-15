# 0050 - The frontmatter vocabulary stays open, and placement is what gets checked

## TL;DR
- **Decision:** An unknown frontmatter key is **not** a finding, at any level, at any tier. The vocabulary is OPEN. What ships instead is a new Universal check, **`U16` (`metadata-placement`)**: a key that Standard sec 3.7 places under `metadata` is a finding when it is declared at the **top level**, because nothing reads it there. Introduced at Standard **0.14**, held at `warn` for anyone pinned below by ADR 0044's ceiling.
- **Why strictness was rejected:** across **2342 skills in thirteen sources** (seven pinned corpora plus all six family members), **44.9%** carry a top-level key the Standard does not name and **58.2%** carry a `metadata.*` key it does not name. Three family members are at 100 percent on one axis or the other. And `metadata` is an **explicitly arbitrary map** in the agentskills.io spec this Standard conforms to, so rejecting unknown keys inside it would contradict the upstream contract while failing most of every population measured.
- **Why placement is the real defect:** the same census found **22 occurrences of a sec 3.7 key written at top level**, and of the ones the gate actually loads, **all 6 shipped `critique-skills` skills declare `version` at the top level with no `metadata` block at all.** Sec 3.7 says `version` is REQUIRED on every component at every tier. Nothing in the spine reads `metadata.version`, so `critique-skills` grades **Convergent, 0 errors**, while six of its six components fail a REQUIRED rule invisibly.
- **Measured:** the prototype puts 6 findings on `critique-skills`, emitted `error`, resolved to `warn` by its 0.12 pin against the check's 0.14 introduction, Standard debt 1 to 7, **tier unchanged, verdict unchanged, no other member moved.**
- **Status:** Accepted (ratified 2026-08-14).

- **Date:** 2026-08-14
- **Deciders:** maintainer (jprisant), with Claude (Opus 5)

## Builds on
- **ADR 0045 (restricted fields on plugin-shipped agents)** - the defect class this ADR extends. `U14` exists because an author writes a field the runtime refuses and gets no signal. A sec 3.7 key at the top level is the same shape one layer over: the author writes a declaration our own tooling does not read, and nothing tells them.
- **ADR 0044 (one post-resolution Standard ceiling)** - the migration mechanism. `U16` is a NEW check, so `since: "0.14"` alone is its window, and the measurement below confirms the ceiling holds it back for a member pinned at 0.12.
- **ADR 0041 (warn-first string-shaped chain declarations)** - the precedent that this project has already met this defect once and solved it locally. `chain-contract.mjs` reads `metadata.chain` "and falling back to a legacy top-level `chain:` key so a third-party plugin still using the old location is still read". One check compensates for misplacement privately; `U16` is the general version of that observation.
- **ADR 0027 (Standard versioning and compatibility policy)** - `U16` is a new tier requirement, so the spine and the Standard minor both move.
- **ADR 0046 (the agents/ directory holds only registered subagents)** - claims `U15`. `U16` is the next free Universal number and the two ADRs must land in that order or the numbers collide.
- **Standard sec 3.7** (conventional `metadata` keys) and **sec 3.8** (frontmatter contract) - the sections this ADR amends.

## Context and problem statement

Standard sec 3.8 lists the keys each component type carries and states three rules: frontmatter MUST be valid YAML, required keys MUST be present, and `description` MUST satisfy the discoverability bar. **It never says what an unknown key is.** `U3` (`frontmatter-valid`) checks the presence and format of `name` and `description` and nothing else. So today every key beyond those two is unconstrained, in both directions: an author can add anything, and an author can put a Standard key anywhere.

The v1.14.0 pack carried "frontmatter vocabulary strictness" as the open question: which keys are permitted, and what is an unknown key. Measuring the vocabulary answered it, and then pointed somewhere else.

### What is actually in the wild

Every `SKILL.md` in seven pinned corpora at their recorded shas, plus all six family members: **2342 frontmatter blocks.**

| Source | n | carries an unknown TOP-LEVEL key | carries an unknown `metadata.*` key |
|---|---|---|---|
| `anthropics/skills` | 18 | 0.0% | 0.0% |
| `RefoundAI/lenny-skills` | 86 | 0.0% | 0.0% |
| `deanpeters/Product-Manager-Skills` | 49 | **100.0%** | 0.0% |
| `phuryn/pm-skills` | 68 | 0.0% | 0.0% |
| `TerminalSkills/skills` | 1018 | **95.5%** | **99.9%** |
| `khalilbenaz/claude-skills-collection` | 692 | 2.0% | 0.0% |
| `nimadorostkar/Claude-Skills-collection` | 137 | 0.0% | **100.0%** |
| `pm-skills` | 142 | 3.5% | **98.6%** |
| `thinking-framework-skills` | 68 | 0.0% | **100.0%** |
| `writing-style-catalog` | 3 | **100.0%** | 0.0% |
| `agent-skills-toolkit` | 53 | 1.9% | 0.0% |
| `critique-skills` | 7 | **100.0%** | 0.0% |
| `product-lifecycle-templates` | 1 | 0.0% | **100.0%** |
| **All** | **2342** | **44.9%** | **58.2%** |

The most common unknown keys are entirely ordinary: `compatibility` (971 top-level), `metadata.author` (1158), `metadata.tags` (1154), `metadata.frameworks` (140), `metadata.use-cases` (136). Nothing here is abuse. This is what an extension point looks like when people use it.

**And `metadata` is an extension point by definition, upstream.** Sec 3.7's own first sentence reads: *"Within the agentskills.io **arbitrary** `metadata` map, this Standard defines these keys."* A rule rejecting unknown keys inside an arbitrary map would put this Standard in contradiction with the spec it claims conformance to, on a field whose whole purpose is to be open.

### The defect the census found instead

Scanning for the opposite condition - a key the Standard **does** name, written where the Standard does **not** place it - returned **22 occurrences across 2342 skills**, of which 8 are shadowed (declared in both places, where at least the nested copy is read) and 14 are silently lost.

Narrowing to what `loadPlugin` actually returns, so fixtures and nested reference copies are excluded and the number is what the gate would see:

> **6 of 6 shipped `critique-skills` skills declare `version` at the top level, and none of them has a `metadata` block at all.**

`critique-clarity`'s frontmatter, read on disk, is `name`, `description`, `version`, `license`, `rubric_sources`. Sec 3.7 states `version` is **REQUIRED on every component at every tier**. Nothing in the 31-check spine reads `metadata.version`, so the requirement is unenforced in both directions: `critique-skills` neither satisfies it nor is told. It declares Convergent and grades **Convergent with 0 errors.**

This is `U14`'s defect class exactly. The author wrote a version. It is not where anything reads. Nothing says so.

## Decision drivers

- A rule that most of every measured population violates is a rule about the measurer, not the measured. This is the second time in this pack that the numbers have said so.
- The Standard must not contradict the upstream spec it conforms to on a field upstream defines as arbitrary.
- A REQUIRED field that nothing checks is a promise the Standard is not keeping.
- A high-precision finding is worth more than a broad one. 22 in 2342 is 0.9 percent, and every instance is a real misplacement.
- Any new check needs a migration window, and this one must not knock a family member out of its declared tier the day it lands.

## Considered options

**Option A - closed vocabulary: an unknown key is an error.** Rejected on measurement. It fails 44.9 percent of skills at the top level and 58.2 percent inside `metadata`, including 100 percent of three family members. It also contradicts sec 3.7's own description of `metadata` as arbitrary.

**Option B - closed vocabulary at the top level, open inside `metadata`.** The defensible half of Option A, and it is closer to right, but still rejected on measurement: 44.9 percent of skills carry an unknown top-level key, driven by `compatibility` at 971 occurrences in one corpus and a long tail of `intent`, `type`, `best_for`, `scenarios`, `triggers`, `when_to_use`. None of it is wrong; agentskills.io does not forbid it, and a Standard that does would be narrowing the spec rather than profiling it.

**Option C - a vendor-cited closed vocabulary: reject only keys the RUNTIME is known to ignore.** Attractive, because it is `U14`'s exact shape and would carry `vendor-cited` provenance. **Rejected as undeliverable today.** `vendor-agent-fields.mjs` exists because Claude Code publishes an explicit supported-field list for plugin-shipped agents; there is no equivalent published list for skill frontmatter, and inventing one and calling it vendor-cited would be the worst of both - a house convention wearing an authority it does not have. Recorded as the right shape **if** such a list is published, and this is exactly what `askit-standards-watch` should be watching for.

**Option D - a warn on unknown keys, never an error.** Rejected: at 44.9 percent it is noise, and a warning that fires on half of everything trains readers to ignore the warning channel. The project already carries `thinking-framework-skills` at 128 warnings and knows what that costs.

**Option E (chosen) - keep the vocabulary open, and check PLACEMENT.** The census's own asymmetry is the argument: unknown keys are 44.9 percent and benign; misplaced known keys are 0.9 percent and every one is a silent loss of a declaration the author meant. Checking the second costs nothing to the first.

## Decision outcome

**1. The frontmatter vocabulary is OPEN and the Standard says so explicitly.** Sec 3.8 gains a rule stating that a key beyond those it names is permitted at every tier and is neither validated nor interpreted. Silence today reads as an unfinished thought; the next reviewer proposing strictness should find the numbers.

**2. A new Universal check, `U16` (`metadata-placement`).** For each key sec 3.7 names - `version`, `updated`, `tier`, `audience`, `category`, `agent-targets`, `status`, `deprecated-by`, `remove-in`, `chain` - a declaration at the top level of a component's frontmatter is a finding.

**3. Two messages, because two situations.** Where the key is ONLY at the top level, the finding says the declaration is silently lost and names the destination (`Move it to metadata.<key>`). Where it appears in BOTH places, the finding says the top-level copy is not read and the two can disagree. A single message would be wrong for one of them.

**4. `since: "0.14"`, severity `error`, no `migration` metadata,** per ADR 0044 point 3.

**5. Provenance is `house`, not `vendor-cited`.** Sec 3.7's placement is this Standard's convention. Option C is the version that would earn `vendor-cited`, and it is not available.

**6. The check reads `ctx.skills` only, deliberately, and this is stated rather than left ambiguous.** Extending frontmatter checks to `agents/` is **E22**'s open question, and this ADR does not pre-empt it. The same note ADR 0048 requires on the three skills-only checks applies here: a `for (const s of ctx.skills)` loop must say whether it is a decision or a gap, or ADR 0046's finding gets rediscovered as a bug every review round.

**7. `chain-contract.mjs`'s legacy top-level `chain` fallback stays.** It keeps reading a misplaced `chain`, and `U16` now tells the author it is misplaced. Removing the fallback would be a red-ward behaviour change bundled into an unrelated ADR; the two can be reconciled when the fallback's own window is decided.

## Consequences

- **Blast radius: 6 findings on `critique-skills`, no verdict moved, measured.** Emitted `U16` errors 0 to 6; resolved `U16` warnings 0 to 6; Standard debt 1 to 7; ceiling due 0.14; tier, error count, exit code and `failsOwnClaim` all unchanged. Every other member: nothing. `critique-skills` pins 0.12, so the ceiling does the work with no hand-written migration metadata, which is the second confirmation in this pack that ADR 0044 point 3 behaves as specified.
- **`critique-skills` gets a real bill when it re-pins.** At 0.14 those six become errors and it loses Convergent until it moves `version` under `metadata`. The fix is six one-line edits and it is the correct outcome: a REQUIRED field that is currently declared where nothing reads it.
- **The spine moves again.** With ADR 0046's `U15`, `U16` takes it to **33** and the Standard to 0.14. Both ADRs must be ratified together or the numbering has to be redone; if only one lands, the survivor takes `U15`.
- **A REQUIRED rule remains unchecked in the other direction.** `U16` catches `version` in the wrong place; nothing yet catches `version` being absent entirely, which sec 3.7 also requires at every tier. That is a separate check with a much larger blast radius - it would fire on every component of every plugin that never adopted the convention - and it is deliberately not bundled here. Filed as a consequence rather than done, so the gap is on the record rather than implied by this ADR's existence.
- **The open-vocabulary rule is a commitment, not an omission.** A plugin adding `compatibility`, `triggers` or `best_for` is conformant and stays conformant. That is the correct reading of a Standard that profiles an upstream spec rather than replacing it.
- **`askit-standards-watch` gains a target.** If agentskills.io ever publishes a closed skill-frontmatter field list, Option C becomes available and this decision should be revisited with `vendor-cited` provenance. Until then, watching for it is the whole of the follow-up.
- **The prototype's own G8 and G9 failures recur.** As in ADR 0046, adding a file under `scripts/checks/` fails `G8` until `scripts/checks/README.md` lists it and `G9` until it carries the four-field header docblock. Both were tripped again, and they are the only reason the family diff was not confined to `critique-skills`.

## Implementation sites
- `scripts/checks/metadata-placement.mjs` - **new check**. `meta = { id: "metadata-placement", tier: "universal", reqId: "U16", since: "0.14", provenance: "house" }`. `SEC_37_KEYS` is the sec 3.7 list; a top-level `Object.hasOwn` per key, with the shadowed and lost branches producing different messages. `Object.hasOwn`, not `?? null`, so an explicit `version: null` at top level is still reported - the presence-not-nullishness rule ADR 0044's round-8 fix established.
- `scripts/lib/registry.mjs` - the import and the `CHECKS` entry, beside `agentRestrictedFields`.
- `STANDARD.md` sec 3.8 - the open-vocabulary rule, stated as a rule so a reader can cite it.
- `STANDARD.md` sec 3.7 - a sentence that these keys live under `metadata` and are not read at the top level, plus the `U16` reference. The 0.14 version note records the introduction and the spine moving to 33.
- `scripts/checks/frontmatter-valid.mjs` (`U3`) - a docblock line stating that unknown keys are permitted by decision, so its narrow scope is not read as unfinished.
- `tests/unit/metadata-placement.test.mjs` - **new**: a top-level `version` with no `metadata` reports the lost message; a top-level `version` alongside `metadata.version` reports the shadowed message; a correct `metadata.version` reports nothing; an unknown top-level key such as `compatibility` reports nothing; an explicit top-level `version: null` still reports.
- `tests/unit/registry-sync.test.mjs`, `tests/unit/compatibility-matrix.test.mjs` - the count, and a matrix row naming the wrong implementation it kills: rejecting unknown keys, which fails 44.9 percent of 2342 measured skills.
- `docs/reference/frontmatter-taxonomy.md` - a pointer distinguishing the docs-page taxonomy (`G7`) from the component frontmatter contract, since the file already warns against conflating them and this ADR adds a second component-frontmatter check.

Grep anchor: `SEC_37_KEYS` in `scripts/checks/metadata-placement.mjs`.
