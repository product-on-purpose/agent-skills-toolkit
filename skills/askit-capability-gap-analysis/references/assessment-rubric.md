# Assessment rubric (reference)

How to decide what a capability finding is worth, and how to avoid the two failure modes this repository has already paid for.

## The gate, in order. Stop at the first NO.

| # | Question | NO means |
|---|---|---|
| 1 | Is the capability **real and stable**? | a research preview or an alpha flag is a **watch item**. Record it with its trigger; stop. |
| 2 | Is it **plugin-distributable**? | it belongs in the matrix's notes and nowhere else. The standing example: Codex has subagents, but its plugin manifest has no `agents` field, so they are not plugin-distributable. |
| 3 | Does anything **break or become possible** for a plugin author? | it is documentation. Update the matrix; stop. |

**Most findings stop at 3, and that is the skill working correctly.** A rubric that promotes most findings is a rubric nobody trusts by the third sweep.

## The two failure modes, both with receipts

### Adopting on plausibility instead of on measurement

This repository ratified seven decisions in one release after measuring each against its whole reference family first, and **three of the seven were overturned by that measurement**:

- a frontmatter strictness rule would have failed **44.9 percent of 2342** measured skills
- a language-independent description signal fired on **99.9 percent of 2068** descriptions, including **94.4 percent of Anthropic's own**, so it could not discriminate at all
- a proposal to widen four checks turned out to instruct authors to create the exact phantom another check exists to prevent

Each looked obviously right before it was measured. **If a recommendation depends on a population, count the population before writing the recommendation** - and if you cannot, say the number is unmeasured rather than omitting that it is.

### Building for a population of zero

The counterweight, and it cuts the other way. `E44` records a capability finding that is real, correctly analysed, and **deliberately not built**: `U5` should key off invocation control rather than component type, and the measured population declaring the relevant frontmatter is **0 of 2435 skills**. It is filed with a stated trigger - re-measure when either field appears in a corpus - rather than closed.

A preventive rule is sometimes still right. `U17` shipped for a population of zero because it closed a routing hole where an author's file was read by nothing. **The distinction is whether the defect is silent**: a hole that produces no signal is worth pre-empting, and a capability nobody uses yet is worth waiting on.

## Severity, and why it is deliberately coarse

Three levels, because finer grades invite argument that changes no outcome:

| Level | Means | Route |
|---|---|---|
| **breaks** | a plugin conformant today stops working, or the gate now reports something untrue | ADR draft, and say so in the release notes |
| **enables** | authors can do something new that the Standard does not model | backlog entry, with the population measured |
| **describes** | the matrix was incomplete or wrong; author behaviour is unchanged | matrix update only |

**`breaks` is rare and must be argued, not asserted.** A vendor changing behaviour our checks assert as fact is the shape that produced this repository's worst near-misses, and it is exactly what `vendor-claims.json` exists to catch - so a `breaks` finding should usually also produce a candidate claim.

## The three questions that kill a bad proposal fastest

**Who is worse off if we do nothing?** If the answer is "nobody, yet", it is a backlog entry with a trigger, not an ADR.

**What would this check report on a plugin that has never heard of the capability?** If the answer is a finding, the proposal is a Standard tightening and needs a migration window under the post-resolution ceiling, not a new check smuggled in as a bug fix.

**Can the author fix it alone?** A defect no single plugin can remedy is never a plugin requirement. That is settled policy - the unilateral-remedy test - and it has already stopped one class of finding from graduating to a numbered check.

## What this rubric will not do

Score, rank, or total anything. Its output is a routed proposal with its reasoning attached, and a human ratifies it. **The deterministic gate takes no judgment**, and a capability assessment is judgment by construction - which is exactly why it produces an ADR draft and not a check.
