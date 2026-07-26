<!--
  SAMPLE TEMPLATE (Markdown twin of the "Editorial Wide" HTML evaluation report).
  This is the complementary Markdown surface the askit-evaluate renderer would emit
  for PR review and for agents to read. The subject below is HYPOTHETICAL and exists
  only to exercise every section of the information architecture.
  Reflects the current 30-check spine (Standard v0.10).
  See docs/internal/backlog/enhancements.md E1.
-->
---
title: "acme-content-skills - Skill Library Evaluation (Sample)"
description: "Markdown twin of the Editorial Wide evaluation report. Whole-library tier compliance against the Advanced Skill Library Standard v0.10. Hypothetical subject."
---

# acme-content-skills - Skill Library Evaluation

> Sample report. The subject is hypothetical. The HTML twin of this file is the "Editorial Wide" variant; this Markdown surface carries the same data and verdict for PR review and for agents.

**How to read this report.** Read top to bottom. Each section opens with a one-line summary, then gives the detail. The verdict is decided by one layer only: the deterministic conformance gate (section 04). Behavioral and review notes are advisory and never move the grade. Status markers used throughout: PASS, FAIL, WARN, N/A.

**What each tier guarantees.** Bronze (Universal) means the library is portable and self-describing on any agentskills.io agent. Silver (Convergent) means it converges cleanly across every declared agent, with matching native manifests and honest contracts. Gold (Advanced) means it is self-proving: it builds, checks, documents, and releases itself in CI.

---

## 01 Masthead / verdict

**Summary: acme-content-skills v0.4.0 earns Silver (Convergent). 27 of 30 checks pass, 3 block Gold, 2 advisory warnings, gate exit code 0.**

| Field | Value |
| --- | --- |
| Subject | acme-content-skills |
| Version | 0.4.0 |
| Report type | Whole-library tier-compliance evaluation |
| Evaluated | 2026-06-03 |
| Standard | v0.10 (30-check spine) |
| Declared tier | Convergent (Silver) |
| Grade earned | **Silver (Convergent)** |
| Climb to Gold | 3 blockers remain (G2, G3, G5) |

Key stats:

| Metric | Value |
| --- | --- |
| Checks passed | 27 of 30 |
| Blockers to Gold | 3 |
| Advisory warnings | 2 |
| Deterministic gate exit code | 0 |

The library clears Bronze and Silver outright. The climb indicator reads "Silver, three steps from Gold." Closing G2, G3, and G5 (estimated combined effort about 65 minutes) would lift the verdict to Gold on the next gate run.

---

## 02 Executive summary

**Summary: a healthy, well-scoped content-marketing library that is genuinely portable and cross-agent clean. It stops short of Gold only because it does not yet prove itself in CI, cover all its chains with regression evals, or publish curated release notes.**

acme-content-skills is a content-marketing skill library aimed at Claude Code and Codex. It bundles twelve skills, two Claude-only subagents, one slash command, and three chain edges that wire the writing skills to the review subagents. We evaluated the whole library as a unit against the Advanced Skill Library Standard v0.10, declared tier Convergent. The headline result: it earns Silver cleanly and sits three concrete steps below Gold.

On the strengths. Every universal check that decides portability passes. The anatomy is valid, frontmatter parses across all components, names match directories in kebab-case, references resolve, and the native manifests for both Claude and Codex are generated rather than hand-edited, so there is no drift. The convergent layer is a clean sweep: all eight Silver checks pass, the acme- prefix is consistent, the components index mirrors disk in both directions, the chain contract is honest with no orphan or phantom edges, and the single command maps to exactly one skill. This is a library you could drop onto a fresh agent and trust to behave.

On the gaps. Three Gold requirements block the higher tier, and all three are about self-proving rather than correctness. G2 (self-hosting) fails because there is no CI workflow that runs the portable gate, so the library cannot demonstrate its own conformance on every push. G3 (library-regression) fails because two of the three chain edges have no regression eval, leaving the delegation from the writing skills to the style critic unverified. G5 (release-notes) fails because there is no curated, user-facing RELEASE-NOTES.md distinct from the changelog. Separately, two advisory warnings surfaced: one skill description scores below the clarity bar (U5), and one skill body runs over the instruction budget (U7), which risks its later steps being dropped at runtime.

The recommended next move is to treat the three Gold blockers as a single short worklist, roughly an hour of focused work, and address the two warnings opportunistically while in those files. Section 06 orders the climb, and section 07 gives a copy-paste prompt for each item that drives the matching askit- builder and then re-runs the gate to confirm the fix. Nothing here requires redesign; the library is one focused session away from Gold.

---

## 03 What was evaluated / component breakdown

**Summary: one library, fifteen components, two agent targets, evaluated as a whole against Standard v0.10.**

Subject identity:

| Property | Value |
| --- | --- |
| Library | acme-content-skills |
| Version | 0.4.0 |
| Declared tier | Convergent (Silver) |
| Agent targets | claude, codex |
| Prefix | acme- |
| Root files | library.json, AGENTS.md |
| Top-level folders | skills/, agents/, commands/, docs/ |
| Native manifests | both emitted (Claude and Codex) |
| Hooks | 0 |
| MCP servers | 0 |
| Chain edges | 3 |

Full component inventory (all 15, nothing truncated):

| # | Name | Type | Targets | What it does |
| --- | --- | --- | --- | --- |
| 1 | acme-write-blog-post | skill | claude, codex | Draft a long-form post from a brief, outline-first, with an SEO pass. (Over instruction budget, about 240 instructions. See U7.) |
| 2 | acme-repurpose-thread | skill | claude, codex | Turn one post into a set of platform-tuned social threads. |
| 3 | acme-content-calendar | skill | claude, codex | Build a dated calendar from a campaign goal and cadence. (Weak description, 0.62. See U5.) |
| 4 | acme-seo-audit | skill | claude, codex | Audit a draft or URL for on-page SEO and propose fixes. |
| 5 | acme-newsletter | skill | claude, codex | Draft an email newsletter issue from a topic and the back catalog. |
| 6 | acme-headline-lab | skill | claude, codex | Generate and score headline variants for a draft. |
| 7 | acme-brief-builder | skill | claude, codex | Turn a rough idea into a structured content brief. |
| 8 | acme-repurpose-video | skill | claude, codex | Turn a transcript into a blog post and a clips list. |
| 9 | acme-tone-tuner | skill | claude, codex | Rewrite a draft to a target voice and reading level. |
| 10 | acme-meta-pack | skill | claude, codex | Produce title tags, meta descriptions, and Open Graph fields. |
| 11 | acme-link-suggester | skill | claude, codex | Suggest internal links across the content set. |
| 12 | acme-cta-writer | skill | claude, codex | Draft calls-to-action tuned to funnel stage. |
| 13 | acme-style-critic | subagent | claude | Review drafts for voice and clarity; the delegate behind the writing skills. |
| 14 | acme-fact-checker | subagent | claude | Flag unsupported claims in a draft for human review. |
| 15 | /acme-write | command | claude | Slash entry point that maps to acme-write-blog-post. |

Chain edges (3 declared, all permitted, no orphans or phantoms):

| Caller | Callee |
| --- | --- |
| acme-write-blog-post | acme-style-critic |
| acme-repurpose-thread | acme-style-critic |
| acme-write-blog-post | acme-fact-checker |

---

## 04 Methodology and scope

**Summary: three layers, kept strictly separate so the verdict stays honest. Only the deterministic gate decides the tier.**

Layer 1, deterministic conformance, decides the tier. The portable Node gate runs all 30 checks with real exit codes and no model in the loop. It is the single source of the pass or fail verdict. Re-running it reproduces the result exactly.

Layer 2, behavioral, is advisory. Each skill is run against its triggering eval set, and the outcome is surfaced as evidence. It never changes a gate result.

Layer 3, review, is advisory. A qualitative pass over scoping, descriptions, and chain design. Like the behavioral layer, it informs but does not decide.

Status legend:

| Marker | Meaning |
| --- | --- |
| PASS | The requirement is satisfied. |
| FAIL | The requirement is not satisfied and, at Gold, blocks the tier. |
| WARN | Advisory finding. Does not block the declared tier; worth fixing. |
| N/A | Vacuous pass. The thing being checked does not exist in this library. |

Confidence and limitations. Conformance findings are exact and reproducible; re-run the gate to verify any row in section 05. Behavioral and review findings reflect judgment over sampled cases and should be read as evidence, not as gate outcomes. Three checks pass vacuously here: G1 (no hooks), G6 (no deprecations), and U11 (no MCP servers). A vacuous pass means there was nothing to validate, not that a feature was exercised.

---

## 05 Tier compliance - evidence ledger

**Summary: Bronze passes with 2 warnings, Silver is a clean 8 of 8, Gold is 7 satisfied with 3 blocking. Every one of the 30 checks is itemized below, one row each.**

### Bronze / Universal (12 checks) - PASS, with 2 advisory warnings

| Req | Status | Evidence |
| --- | --- | --- |
| U1 library-json | PASS | Valid library.json (name, version 0.4.0, tier convergent). Module: checks/library-json. |
| U2 anatomy | PASS | AGENTS.md at root; skills/ agents/ commands/ present; valid agentskills.io anatomy. Module: checks/anatomy. |
| U3 frontmatter-valid | PASS | Every SKILL.md frontmatter parses; required name and description present. Module: checks/frontmatter-valid. |
| U4 name-matches-dir | PASS | Every component name equals its directory; kebab-case throughout. Module: checks/name-matches-dir. |
| U5 description-score | WARN | acme-content-calendar scores 0.62, below the 0.70 bar. "Helps with content planning" states neither a concrete action nor a use-when trigger. Module: checks/description-score. |
| U6 reference-links | PASS | All references/ links resolve. Module: checks/reference-links. |
| U7 instruction-budget | WARN | acme-write-blog-post body is about 240 instructions, over the roughly 200 guidance. Module: checks/instruction-budget. |
| U8 manifest-drift | PASS | Native manifests agree with library.json (generated, not hand-edited). Module: checks/manifest-drift. |
| U9 version-match | PASS | Component versions agree with library.json. Module: checks/version-match. |
| U10 no-dashes | PASS | No em or en dashes found anywhere. Module: checks/no-dashes. |
| U11 mcp-valid | N/A | The library ships no MCP servers, so nothing to validate (vacuous pass). Module: checks/mcp-valid. |
| U12 mermaid-valid | PASS | The 3 mermaid diagrams in docs parse and render. Module: checks/mermaid-valid. |

> Why U5 matters: a description below the clarity bar makes a skill hard for an agent to select for the right job. With no concrete action and no use-when trigger, acme-content-calendar may fail to fire when it should, or fire when it should not.

> Why U7 matters: a body over the instruction budget risks the model dropping later steps. For acme-write-blog-post the SEO pass sits near the end, so the exact step that differentiates the skill is the one most likely to be lost at runtime.

### Silver / Convergent (8 checks) - PASS (8 of 8)

| Req | Status | Evidence |
| --- | --- | --- |
| S1 agent-targets | PASS | agent-targets ["claude","codex"] declared. Module: checks/agent-targets. |
| S2 prefix | PASS | Every component carries the acme- prefix. Module: checks/prefix. |
| S3 components-index | PASS | The components index lists what is on disk. Module: checks/components-index. |
| S4 chain-contract | PASS | 3 edges in agents/_chain-permitted.yaml; no orphan or phantom edges. Module: checks/chain-contract. |
| S5 workflow-skills | PASS | Workflow steps reference real skills (no dangling refs). Module: checks/workflow-skills. |
| S6 per-target-presence | PASS | Both native manifests present and complete. Module: checks/per-target-presence. |
| S7 command-contract | PASS | /acme-write maps to exactly one skill. Module: checks/command-contract. |
| S8 components-mirror | PASS | The index mirrors disk in both directions (no orphan, no phantom). Module: checks/components-mirror. |

### Gold / Advanced (10 checks) - 7 satisfied, 3 BLOCK the tier

| Req | Status | Evidence |
| --- | --- | --- |
| G1 hook-documentation | N/A | The library ships no hooks (vacuous pass). Module: checks/hook-documentation. |
| G2 self-hosting | FAIL | No workflow under .github/workflows/ runs node scripts/check.mjs, so the library cannot prove itself in CI. Module: checks/self-hosting. |
| G3 library-regression | FAIL | 2 of the 3 chain edges have no regression eval under evals/ (acme-write-blog-post -> acme-style-critic and acme-repurpose-thread -> acme-style-critic are uncovered). Module: checks/library-regression. |
| G4 index-drift | PASS | INDEX.md is generated and drift-free. Module: checks/index-drift. |
| G5 release-notes | FAIL | No RELEASE-NOTES.md distinct from CHANGELOG.md (no curated user-facing release surface). Module: checks/release-notes. |
| G6 deprecation | N/A | The library deprecates nothing yet (vacuous pass). Module: checks/deprecation. |
| G7 docs-frontmatter | PASS | Published docs pages carry the audience/level/doc-role frontmatter taxonomy. Module: checks/docs-frontmatter. |
| G8 folder-readme | PASS | Every component and top-level folder has a README guide. Module: checks/folder-readme. |
| G9 source-doc | PASS | Script files carry what-it-is / what-it-does / why docblocks. Module: checks/source-doc. |
| G10 docs-presence | PASS | A docs/ tree with the required Diataxis quadrants (tutorials, how-to, reference, explanation) exists. Module: checks/docs-presence. |

> Why G2 matters: without CI running the gate, conformance is a claim, not a proof. Any change can silently regress the library, and a consumer cannot point to a green badge that says the standard held on the latest commit.

> Why G3 matters: chain edges are where delegation can break quietly. Two uncovered edges to the style critic mean a refactor could sever the handoff and no eval would catch it. Regression coverage turns the chain contract from a declaration into a tested guarantee.

> Why G5 matters: a changelog is for maintainers; release notes are for users. Without a curated RELEASE-NOTES.md, adopters have no human-readable summary of what changed and why they should upgrade.

---

## 06 The climb / burndown

**Summary: three blockers stand between Silver and Gold. Ordered shortest-first, the whole climb is about 65 minutes.**

This is the worklist to reach Gold. Clearing all three flips the verdict on the next gate run. The two warnings (U5, U7) do not block any tier but are cheap to fix while in the same files.

| Order | Blocker | Check | Effort | Outcome when done |
| --- | --- | --- | --- | --- |
| 1 | Add a CI workflow that runs the portable gate | G2 self-hosting | ~20 min | Library proves its own conformance on every push. |
| 2 | Cover the two uncovered chain edges with regression evals | G3 library-regression | ~30 min | All 3 chain edges have regression coverage; delegation is tested. |
| 3 | Publish curated release notes distinct from the changelog | G5 release-notes | ~15 min | Users get a human-readable release surface. |

Advisory follow-ups (optional, do not block Gold):

| Item | Check | Effort | Outcome when done |
| --- | --- | --- | --- |
| Rewrite the weak description | U5 description-score | ~10 min | acme-content-calendar scores at or above 0.70. |
| Bring the over-budget body under the limit | U7 instruction-budget | ~10 min | acme-write-blog-post body drops under about 200 instructions; the SEO step is safe. |

---

## 07 Improvement path

**Summary: one card per gap. Each gives the issue, the fix, priority, and effort, then a copy-paste prompt that drives the matching askit- builder and re-runs the gate to confirm.**

### G2 - self-hosting (Gold blocker)

- Issue: no CI workflow runs the portable gate, so the library cannot prove itself.
- Fix: add a CI workflow that shells out to node scripts/check.mjs as a required step.
- Priority: High (Gold blocker).
- Effort: about 20 minutes.

```text
Use askit-build-settings (CI mode) on this plugin: add .github/workflows/ci.yml that checks out the repo, sets up Node from .nvmrc, runs npm ci, then runs node scripts/check.mjs as a required step. Keep the YAML free of validation logic - it only shells out to the portable script. Then run node scripts/check.mjs and confirm G2 (self-hosting) now passes.
```

### G3 - library-regression (Gold blocker)

- Issue: two of the three chain edges have no regression eval, leaving delegation to the style critic untested.
- Fix: add an eval per uncovered edge with covers.chain set and at least one delegation case.
- Priority: High (Gold blocker).
- Effort: about 30 minutes.

```text
Use askit-build-samples to add G3 chain coverage: create evals/acme-write-to-style-critic.eval.json and evals/acme-repurpose-to-style-critic.eval.json, each with covers.chain set to the caller and callee and at least one case describing the expected delegation. Then run node scripts/check.mjs and confirm G3 (library-regression) reports no uncovered chains.
```

### G5 - release-notes (Gold blocker)

- Issue: no curated, user-facing release surface distinct from the changelog.
- Fix: add RELEASE-NOTES.md summarizing the current version highlights for users.
- Priority: High (Gold blocker).
- Effort: about 15 minutes.

```text
Use askit-release (notes mode) to create RELEASE-NOTES.md for acme-content-skills: a curated, user-facing summary of the current version highlights, distinct from CHANGELOG.md. Then run node scripts/check.mjs and confirm G5 (release-notes) passes.
```

### U5 - description-score (advisory warning)

- Issue: acme-content-calendar scores 0.62; the description states neither a concrete action nor a use-when trigger.
- Fix: rewrite the description with a concrete action and a real use-when trigger.
- Priority: Medium (advisory).
- Effort: about 10 minutes.

```text
Use askit-build-skill (improve mode) on skills/acme-content-calendar: rewrite the description to state the concrete action and the use-when trigger with real keywords, no colon-space, under 1024 chars. Then run node scripts/check.mjs and confirm U5 scores at or above 0.70.
```

### U7 - instruction-budget (advisory warning)

- Issue: acme-write-blog-post body is about 240 instructions, risking dropped later steps.
- Fix: extract the SEO checklist to a reference and point to it with progressive disclosure.
- Priority: Medium (advisory).
- Effort: about 10 minutes.

```text
Use askit-build-skill (improve mode) on skills/acme-write-blog-post: extract the SEO checklist from SKILL.md into references/seo-checklist.md and reference it with a progressive-disclosure pointer, bringing the body under ~200 instructions. Then run node scripts/check.mjs and confirm U7 no longer warns.
```

---

## 08 Insights

**Summary: five qualitative notes beyond pass-fail, on shape, risk, and where the next investment pays off.**

1. The library is correctness-clean and only proof-incomplete. All three Gold failures are about self-proving (CI, regression coverage, release notes), not about whether the skills work. That is the easiest kind of gap to close and the cheapest to keep closed once CI is in place.

2. The chain design is conservative and legible. Three edges, all routed through two review subagents, with no orphan or phantom edges. Adding regression evals (G3) is the natural next step precisely because the chain is small and well-defined; coverage here is high-value and low-cost.

3. The two warnings cluster on the writing path. Both U5 (a calendar description) and U7 (the blog-post body) sit in the authoring surface, which is the library's center of gravity. Tightening these improves both selection accuracy and runtime reliability for the most-used skills.

4. Cross-agent hygiene is already solid. Generated manifests, a consistent prefix, and a two-way mirror between index and disk mean the Convergent guarantees are real, not aspirational. This is the part that is expensive to retrofit and the library already has it.

5. The fastest path to Gold is a single session. The three blockers are independent and total about an hour. Sequencing them shortest-first (G5, G2, G3) gives early green checks and leaves the one substantive task (regression coverage) for last.

---

## 09 Evidence and sources

**Summary: every finding above is grounded in a check module, a Standard clause, or a file in the subject. At least eight citations follow.**

1. checks/library-json - validates library.json shape and the declared tier (U1).
2. checks/anatomy - validates root AGENTS.md and the skills/ agents/ commands/ layout against agentskills.io anatomy (U2).
3. checks/description-score - scores each description against the 0.70 clarity bar; flagged acme-content-calendar at 0.62 (U5).
4. checks/instruction-budget - counts instruction units per body against the ~200 guidance; flagged acme-write-blog-post at ~240 (U7).
5. checks/self-hosting - looks for a .github/workflows/ job running node scripts/check.mjs; none found (G2).
6. checks/library-regression - cross-references chain edges against evals/ coverage; two edges uncovered (G3).
7. checks/release-notes - requires a RELEASE-NOTES.md distinct from CHANGELOG.md; not present (G5).
8. checks/chain-contract and checks/components-mirror - confirm the 3 edges in agents/_chain-permitted.yaml and the two-way index mirror (S4, S8).
9. Advanced Skill Library Standard v0.10 - the 30-check spine and the tier definitions (Bronze/Silver/Gold) cited throughout.
10. Subject files: library.json, AGENTS.md, skills/, agents/, commands/, docs/, and the generated INDEX.md (G4).

---

## 10 Report metadata

**Summary: versions, evaluator, gate result, timestamp, the legend, and the sample disclaimer.**

| Field | Value |
| --- | --- |
| Subject | acme-content-skills v0.4.0 |
| Standard | v0.10 (30-check spine) |
| Declared tier | Convergent (Silver) |
| Grade earned | Silver (Convergent) |
| Evaluator | askit-evaluate (deterministic gate + advisory layers) |
| Deterministic gate exit code | 0 |
| Checks | 27 PASS, 3 FAIL, 2 WARN, with G1/G6/U11 vacuous |
| Evaluated | 2026-06-03 |
| Report variant | Editorial Wide (Markdown twin) |

Status and severity legend:

| Marker | Meaning | Blocks tier? |
| --- | --- | --- |
| PASS | Requirement satisfied | No |
| FAIL | Requirement not satisfied | Yes, at the tier that owns the check |
| WARN | Advisory finding | No |
| N/A | Vacuous pass (nothing to validate) | No |

Note: this is a SAMPLE report with a HYPOTHETICAL subject (acme-content-skills does not exist). It reflects the current 30-check spine under Standard v0.10 and exists to exercise the full information architecture of the askit-evaluate renderer. See docs/internal/backlog/enhancements.md E1.
