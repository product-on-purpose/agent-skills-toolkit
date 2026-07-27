# 0036 - Calibrate U12 (mermaid-valid) for diagram-type grammar and U6 (reference-links) for template slots

## TL;DR
- **Decision:** Three precision calibrations from the 2026-07-19 coupled portfolio audit, all under the ADR 0032 principle that **a check validates only LIVE content, and only against the grammar that actually governs it**. (1) **U12** no longer counts a bracket character that is Mermaid GRAMMAR in the block's own diagram type: `-)` and `--)` async message arrows in `sequenceDiagram`, and `||--o{`-family cardinality tokens in `erDiagram`. The allowance is **scoped by diagram type**, so a stray `-)` in a flowchart is still the unmatched paren it looks like. (2) **U6** skips a link whose TARGET carries a substitution token (`{{docs_path}}/guide.md`, `{release-url}`), because a template slot is filled in by a generator and has nothing on disk to resolve. (3) Two presentation fixes ship alongside: the gate now **sections above-declared-tier findings** under a header stating they cannot affect the grade, and prints a **Standard-debt line** when a pin is holding findings back. Provenance stays `objective` for both checks; spine stays 30, Standard stays 0.12.
- **Why:** The audit pointed the shipped v1.6.0 grader at five real product-on-purpose repositories. **11 of the 14 U12 errors it produced across the portfolio (79 percent) were the checker's fault**, and Phase D confirmed both mechanisms at code level in `bracketsBalanced`: it walks characters, so the `)` in `-)` pops an empty stack and the `{` in `||--o{` is pushed and never closed. An outward-facing grader that over-flags valid notation on its very first third-party-shaped corpus is spending trust it has not banked.
- **Scope and honesty (measured, not estimated):** re-grading the same five targets under `--profile plain-plugin` takes pm-skills from **56 to 43** errors and pm-skills-mcp from **18 to 14**, and portfolio U12 errors from **14 to 3**. Those post-fix numbers land exactly on the audit's independent hand-verified real-defect counts (~43 and 14 respectively; 3 real U12), which is the strongest available evidence that the calibration removed false positives and nothing else. The 3 surviving U12 errors are comment-only template blocks, deliberately NOT exempted (see Consequences).
- **Status:** Accepted.

- **Date:** 2026-07-25
- **Deciders:** maintainer (jprisant), with Claude (Opus 5)

## Builds on
- ADR 0032 (calibrate U6 inline code / U12 non-live mermaid) - the direct predecessor. It exempted pure `{{PLACEHOLDER}}` mermaid bodies and named "a genuinely malformed LIVE erDiagram that uses crow's-foot `||--o{` cardinality" as a separate latent question, explicitly out of scope at the time. This ADR answers it, plus the sequence-arrow sibling the corpus surfaced later.
- ADR 0030 (calibrate U6/U11), ADR 0031 (U3/U4 display labels), ADR 0033 (recalibrate U5) - the same legitimacy test, applied here to Mermaid grammar and template link targets.
- ADR 0027 (Standard versioning) - a calibration of HOW two checks fire, not a change to WHAT the Standard requires (a malformed live diagram is still a U12 error; a dangling live link is still a U6 error). No spine change, no Standard bump, no warn-then-error burndown.
- The 2026-07-19 coupled audit: `_local/audit/2026-07-19_fable_pop/SENSOR-READINGS.md` (PSR-1, PSR-2, PSR-3, PSR-6, PSR-7), the per-plugin plans that recorded the raw observations, and `_local/audit/2026-07-19_fable_agent/VERIFICATION.md` (the Phase D code-level confirmation).

## Context and problem statement
`bracketsBalanced` in `scripts/checks/mermaid-valid.mjs` is a generic bracket walk: push on `[ ( {`, pop on `] ) }`, ignore quoted spans. That model is correct for `flowchart` and `graph`, which is where U12's coverage was built and validated. It is wrong for two diagram types whose grammar OVERLOADS the bracket characters:

- **`sequenceDiagram` async arrows.** Mermaid's message arrows include `-)` (solid, open arrowhead) and `--)` (dotted). The `)` is an arrowhead glyph, not a delimiter. The walk pops an empty stack and fails immediately. Corroborated independently by two planners on two repos (pm-skills, and pm-skills-mcp `EXAMPLE.md`, a sequenceDiagram flagged "unbalanced brackets" with zero square or curly brackets and balanced parens on manual count).
- **`erDiagram` cardinality.** Relationship tokens are `<left cardinality><line><right cardinality>`: left is one of `|o || }o }|`, right is one of `o| || o{ |{`, and the line is `--` (identifying) or `..` (non-identifying). So `USERS ||--o{ ORDERS : places` introduces a `{` that is a crow's-foot glyph and is never closed, and `}o--o{` additionally opens with a `}` on an empty stack. Attribute blocks in the same diagram use real, balanced braces, so a blanket brace exemption would be wrong.

Separately, `TEMPLATE.md`-shaped files fire **U6** on placeholder hrefs (`{{path}}` double-brace, `{release-url}` single-brace). ADR 0032 gave U12 a template exemption but nothing covered LINKS, so the same authoring convention was treated inconsistently by two checks in the same family.

Finally, three independent assessors misread the gate's OUTPUT in a single day (PSR-6, PSR-7): above-declared-tier findings print as an undifferentiated `[error]` stream ahead of a "0 error(s)" summary, and a plugin pinned to an old Standard prints "Tier: Advanced (no blockers detected)" with exit 0 while carrying 122 post-pin findings that all become gate-failing the moment it re-pins. The machinery was honest; the display was not.

## Decision drivers
- **Trust is the currency of outward grading.** A 79 percent false-positive rate on a check class, measured on the first real third-party-shaped corpus, is the single highest-priority defect in the shipped release.
- **Grammar, not heuristics.** The fix must model what Mermaid actually parses. Diagram-type scoping is not extra caution, it is the correct model: Mermaid runs a different grammar per diagram type, so the same characters legitimately mean different things.
- **One-directional safety (the ADR 0032 invariant).** A calibration should only ever REMOVE findings. Anything that can turn a passing target into a failing one is a breaking change dressed as a precision fix.
- **Do not over-fit to the corpus.** Exempt only what is unambiguously non-live or unambiguously grammar; leave the murkier classes flagged.
- **No conformance churn.** The toolkit's own self-grade stays Advanced 0/0; spine and Standard untouched.

## Considered options
1. **Diagram-type-scoped, rescue-only syntax-token handling in U12; brace-token skip in U6; presentation-only display pair.** (chosen) Detailed below.
2. **Pre-strip the syntax tokens from the body before counting.** The obvious implementation, and rejected on soundness: blanking the `-)` in `Alice->>Bob: (step 1-)` orphans a real `(` and creates a NEW false positive. It violates the one-directional invariant, which is the exact property that makes a calibration safe to ship to third parties.
3. **Skip bracket balancing entirely for `sequenceDiagram` and `erDiagram`.** Rejected: it discards real coverage on two common diagram types to fix two narrow tokens. The audit corpus contained genuinely unbalanced sequence and ER diagrams the check should still catch.
4. **Reclassify U12 to `house` so plain-plugin drops it** (the ADR 0029 move). Rejected: a malformed live diagram is a real, portable defect that renders as a broken box. The problem is precision, not provenance.
5. **Also exempt comment-only mermaid blocks as templates** (the third leg of PSR-3). Rejected, see Consequences: a body containing only `%%` comments has no diagram type, and Mermaid itself errors with "No diagram type detected". It genuinely fails to render. The template author's supported path already exists and is clearer: a `{{PLACEHOLDER}}` token body, exempt since ADR 0032.
6. **Mark template intent by filename convention (`TEMPLATE.md`) or a frontmatter flag.** Rejected as the answer to PSR-3's "what marks template intent" question. A filename convention silently disables real link checking on any file someone happens to name TEMPLATE.md, and a frontmatter flag requires the graded plugin to adopt an askit convention, which is useless for grading third parties. The token AT THE POINT OF USE is self-evident, local, and portable.

## Decision outcome
Option 1, in three parts.

**1. U12 syntax-token handling (`scripts/checks/mermaid-valid.mjs`).** A new `syntaxTokenMask(s, diagramType)` marks the character indices belonging to a Mermaid syntax token, driven by a per-diagram-type table (`sequenceDiagram: /--?\)/g`, `erDiagram: /[|}][o|](?:--|\.\.)[o|][|{]/g`). `bracketsBalanced` takes the diagram type (resolved from the same `diagramLine()` result the keyword rule uses, so an unrecognized block gets NO allowance at all) and consults the mask **rescue-only**:

- A masked OPENER (`{`, only ever the right-hand cardinality glyph of `o{` / `|{`) is not pushed; it has no matching `}` by construction.
- A masked CLOSER is ignored **only when the stack is already empty**, meaning there is nothing it could legitimately be closing. A `)` with a real `(` waiting still pops it, exactly as before.

That rescue-only rule is what preserves the one-directional invariant: every bracket that balanced before still balances, so no previously-passing diagram can newly fail on this path.

**2. U6 template slots (`scripts/checks/reference-links.mjs`).** After the existing scheme skip, a target matching `/[{}]/` is skipped as a template slot. A brace is not a character any real relative repo path carries, so this is a self-evident marker requiring nothing of the graded plugin. Like every strip in this check it can only remove findings.

**3. The display pair (`scripts/check.mjs`), presentation only.** `sectionFindings(findings, declaredTier)` splits printable findings by the same declared-tier ceiling `gateExitFromFindings` uses, and `format` prints the above-tier group under "Above your declared tier (informational; these cannot affect the grade or the exit code):". `standardDebtLine(findings)` returns one line naming how many findings the pin is holding back and the Standard version at which they all come due (the highest `since` among them, compared numerically so 0.10 outranks 0.9). Neither function feeds a severity, a count, or the exit code.

**Tests (TDD, RED first).** `tests/unit/mermaid-valid.test.mjs` +11 (9 calibration and scoping, 2 characterizing the reviewed trade-offs): the two async-arrow shapes, `||--o{`, all four cardinality shapes across both line types, cardinality alongside a real attribute block, and **four scoping guards** proving the allowance does not leak (a `-)` and a `||--o{` in a flowchart still fail; a genuinely unbalanced `[` in a sequenceDiagram and an unclosed attribute brace in an erDiagram still fail). `tests/unit/reference-links.test.mjs` +3. New `tests/unit/gate-display.test.mjs` +10. Suite **418 -> 442**; gate Advanced 0/0; spine 30; Standard 0.12.

**Verified against the audit corpus** (`_local/audit/2026-07-19_fable_pop/verify-v1.6.1/`), plain-plugin profile:

| Target | Before | After | Audit's hand-verified real count |
|---|---|---|---|
| pm-skills | 56 errors | **43** | ~43 |
| pm-skills-mcp | 18 errors | **14** | 14 |
| writing-style-catalog | 0 | 0 | 0 |
| agent-config-toolkit | 0 | 0 | 0 |
| thinking-framework-skills | 0 | 0 | 0 |
| Portfolio U12 errors | 14 | **3** | 3 real |

The post-fix counts were produced by the checker; the right-hand column was produced independently by hand verification during the audit, before this fix existed. They agree.

## Consequences
- **Positive:** the shipped grader stops over-flagging valid Mermaid on the two diagram types where it was wrong, template-slot links are no longer counted as link rot, and the same template principle now applies consistently across U6 and U12. The gate output can no longer be read as "46 errors" when the summary says zero, and a pinned plugin's latent Standard debt is stated rather than inferred.
- **Negative / accepted (false negatives, the safe direction).** In a `sequenceDiagram`, ANY `)` preceded by a hyphen is now read as an arrowhead when nothing is open. That is exactly the intended calibration in arrow position, and it unavoidably also covers free message text: `Alice->>Bob: done -)` no longer fails, and an unclosed `(` immediately followed by an async arrow (`Alice(x -) Bob: hi`) now balances against the arrow's `)`. Both were previously caught, by accident. Accepted deliberately, and the trade is explicit: the alternative (mask-first, ignoring the token unconditionally) buys those catches at the price of a NEW false positive on `Bob: (step 1-)`. For a grader whose measured problem is over-flagging on its first real third-party corpus, a rare missed defect is strictly preferable to a new wrong accusation. The render-time layer (the astro-mermaid build, Design Principle 3) remains the second net for both.
- **One accepted directional exception.** In an `erDiagram`, a stray `}` that previously balanced against a cardinality `{` (two errors cancelling) now fails, because the cardinality `{` is no longer pushed. This is a previously-passing input that now fails, so it technically breaks the one-directional invariant. It is accepted because the input is genuinely malformed Mermaid that was only passing by accident, and because no such case exists in any corpus graded to date. Recorded explicitly rather than left silent.
- **Comment-only mermaid blocks stay errors (the PSR-3 leg deliberately not taken).** The 3 surviving portfolio U12 errors are blocks whose body is only `%%` comments. Mermaid emits "No diagram type detected" for these, so they are real render failures, and the exempt, clearer alternative (a `{{PLACEHOLDER}}` body) already exists. Action instead: document the supported template-slot form on the U12 reference page.
- **U6's brace skip is broad by design.** Any target containing a brace is skipped, not just `{{...}}` and `{...}`. A literal brace in a real filename is legal but absurd, and narrowing the pattern would trade a vanishing false-negative risk for a real false-positive risk on the many templating dialects in the wild (`{{x}}`, `{x}`, `${x}`, `{% x %}`). Stated so the breadth is a decision, not an oversight.
- **No Standard implication.** Spine stays 30 (U1-U9, U11-U13, S1-S8, G1-G10), Standard stays 0.12, both checks keep `objective` provenance, and the house-provenance invariant is untouched. Anything the Standard REQUIRED before, it still requires.

## Implementation sites
- `scripts/checks/mermaid-valid.mjs` - `SYNTAX_TOKEN_RE` table and `syntaxTokenMask(s, diagramType)`: the per-diagram-type regex map and the function that marks character indices of Mermaid syntax tokens; the rescue-only logic in `bracketsBalanced()` consults the mask to decide which characters to ignore.
- `scripts/checks/mermaid-valid.mjs` - `bracketsBalanced(s, diagramType)`: now takes a `diagramType` argument; the mask/rescue interaction is here; a future refactor that drops the argument would silently reintroduce the false positives.
- `scripts/checks/reference-links.mjs` - brace-skip clause (the `if (/[{}]/.test(target)) continue` after the scheme skip): the U6 template-slot skip; a target containing a brace is treated as a substitution token and skipped.
- `scripts/check.mjs` - `sectionFindings(findings, declaredTier)`: the presentation function that splits findings into grading vs. above-tier, introduced here for the display pair.
- `scripts/check.mjs` - `standardDebtLine(findings)`: returns a one-line summary of how many post-pin findings exist and at what Standard version they become gate-failing.

Grep anchor: `syntaxTokenMask` and `SYNTAX_TOKEN_RE` (mermaid grammar scoping); `sectionFindings` and `standardDebtLine` (display pair in check.mjs).
