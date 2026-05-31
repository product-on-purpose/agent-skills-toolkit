# agent-skills-toolkit: Decision Guide

> **ARCHIVAL / SUPERSEDED (2026-05-25).** Authoritative: [`agent-skills-toolkit-DESIGN.md`](../agent-skills-toolkit-DESIGN.md) (v0.6) + [`STANDARD.draft.md`](../STANDARD.draft.md) (v0.5). Retained only as the *decision-journey record* (how we got there); the DESIGN doc holds the final state. Index: [`../README.md`](../README.md).
> **Terminology has since evolved:** "plugin" = the artifact / unit of release (holds the one version); "skill library" = the quality grade a plugin earns (Bronze/Silver/Gold), not a separate artifact. Where this doc uses "library" structurally, read "plugin." (Internal cross-links below may be relative-stale after archiving; navigate via the README or the canonical docs.)
>
> Working draft v0.1 (2026-05-24). The master navigational document for the project's decisions and approaches.
> Purpose: walk you through every decision in dependency order, with options, tradeoffs, my recommendation, and status.

---

## How to use this guide

- Decisions are grouped: **Part A** (settled foundation), **Part B** (the live strategic forks - your input needed), **Part C** (design decisions - leaning, quick to confirm), **Part D** (the recommended path to close everything).
- Each decision shows: **the question**, **options/approaches**, **recommendation + why**, **status**, and **what it affects**.
- Status legend: `LOCKED` decided | `LEANING` recommended, unconfirmed | `OPEN` needs your call.

---

## The decision map

```
FOUNDATION (locked)
  vision -> architecture B -> separation -> audience -> agentskills.io -> build-vs-interop
        |
        v
STRATEGIC FORKS (open, decide first)
  D15 sequencing/blend  ──drives──>  D2 v1 cut  <──shapes── families-vs-modes
        |                                  |
        | (optional, parallel)             |
   coalition path                    conformance-tiers-in-v1?
        |
        v
DESIGN DECISIONS (leaning, confirm after forks)
  D4 tiers · D5 Node stack · D6 bundles · D7 docs · D8 marketplace ·
  D10 audience tags · D16 dual-layer navigability
        |
        v
EXECUTION
  finalize Standard -> write design spec -> writing-plans -> build thin v1
```

The single most important open decision is **D15 (sequencing/blend)**, because it sets the size of **D2 (the v1 cut)**, which sets how much of the catalog is built vs. documented.

---

## Part A: Settled foundation (LOCKED)

These are decided; listed so the guide is self-contained. Change only with cause.

| # | Decision | Resolution |
|---|---|---|
| Vision | What it is | Standalone public plugin in product-on-purpose: a toolkit to author, maintain, iterate, scale best-in-class, advanced, multi-agent skill libraries. |
| Arch | Architecture | **Approach B**: self-hosting modular toolkit; a versioned Standard is the spine; the plugin is built to its own Standard as the reference example. |
| D3 | Relationship to pm-skills etc. | Completely separate; prior art to study, never a dependency. |
| D9 | agentskills.io | Hard compliance requirement; anchors the Universal tier; wrap `skills-ref`, do not rebuild it. |
| D11 | Cross-agent support | Load-bearing constraint. Concept-convergent, format-divergent across Claude Code + Codex; scaffolders emit per `--agent-target`. |
| D12 | Build vs interop | **Self-contained and portable.** Learn from skill-creator/skills-ref; depend on neither (they are Claude-only; we are multi-agent). |
| D13 | Lifecycle governance | Backlog (new vs enhancement), samples bar, per-component history, versioning policy, deprecation - in the Standard (Section 7). |
| D14 | Frontmatter/quality/security | Cross-component frontmatter contract, CI parity, description/discoverability bar, security/least-privilege - in the Standard (3.8, 4.4-4.5, 8, 9). |
| - | History location | Frontmatter `version` + co-located `HISTORY.md`. |
| - | Backlog format | Structured markdown in-repo (`_backlog/`). |

---

## Part B: The live strategic forks (OPEN - your call)

### B1 - D15: Sequencing and ambition  (the keystone decision)
**Question:** Ship a comprehensive toolkit at v1, or lead with the methodology (Standard/Handbook) and ship thin tooling, scaling after validation?

**Context:** The commissioned strategy brief argues methodology-first (publish the Handbook, defer most tooling; convention-as-deliverable precedent; tooling is the burnout/obsolescence risk). Your stated direction was comprehensive-and-public day 1.

**Options:**

| Option | What ships at v1 | Pros | Cons |
|---|---|---|---|
| Comprehensive toolkit | Broad builder catalog as code | Biggest initial surface; feels complete | High effort/burnout; competes with free official tools on breadth; unvalidated |
| **Blend (recommended)** | Standard (as Handbook) + self-hosting reference + thin author/validate/audit slice; rest documented as roadmap | Durable methodology + working proof; honors "comprehensive" via the Standard + catalog; burnout-safe; reception-validated scaling | Fewer installable skills at launch |
| Pure methodology-first | Standard only, almost no tooling | Fastest; lowest maintenance | No working proof; weak for a public *product*; self-hosting needs some tooling anyway |

**Recommendation: the Blend.** Reframe "comprehensive" to describe the **Standard + catalog/roadmap**, and "thin" to describe **shipped v1 code**. Our Approach B already centers the Standard, and self-hosting forces a minimal real tooling slice, so the blend is the natural shape. The unit of credibility is "does this define and prove how to build advanced libraries," not skill count.

**Affects:** D2 (v1 cut size), how much of the catalog is built vs. documented, the build timeline.

**Status:** LOCKED (2026-05-24) - **Blend**, as the reversible default; ambition (how comprehensive / coalition) revisited after v1 ships and reception is known. Chosen precisely because it does not require resolving ambition now.

---

### B2 - Coalition path (optional, parallel)
**Question:** Solo-build, or recruit 3-5 cross-domain skill-library maintainers to co-author/review?

**Options:** Solo (full control, faster, bus-factor risk) · Coalition (cross-domain credibility, distributed maintenance, de-PM-bias, slower, coordination overhead) · **Lightweight parallel outreach (recommended)** - send a few low-cost "want to review?" notes while building; let responses decide whether to deepen into a coalition.

**Recommendation:** Lightweight parallel outreach. It is a cheap validation signal that does not block any building and hedges the brief's "PM-bias" and sustainability risks.

**Affects:** Sustainability, credibility, timeline. Non-blocking.

**Status:** OPEN.

---

### B3 - Families vs. modes  (structural; shapes skill count)
**Question:** Are builder lifecycles (`brainstorm`/`create`/`validate`/`improve`) separate skills per area (~60 skills) or modes of one skill per area (~22 skills)?

**Options:**

| Option | Skill count | Pros | Cons |
|---|---|---|---|
| Separate skills | ~60 | More discoverable; each triggers precisely; finer permissions | Larger surface; more frontmatter to maintain; risk of bloat |
| **Modes of one skill (recommended)** | ~22 | Leaner; mirrors skill-creator's Create/Eval/Improve/Benchmark; less context cost | Modes less discoverable than distinct descriptions |
| Hybrid | varies | Create as a skill; eval/improve as modes; brainstorm only where it earns it | Needs a rule for which gets which |

**Recommendation:** **Modes for the lifecycle verbs, a skill per component type** (so ~22 component skills, each with create/validate/improve modes), with standalone skills only where discoverability clearly wins (e.g., `audit-library`, `scaffold-advanced-library`). Leaner aligns with the instruction-budget philosophy.

**Affects:** D2 inventory size, the Standard's component-vs-skill mapping.

**Status:** LOCKED (2026-05-24) - **B (modes + a few standalone)** as the principle. The exact mode-vs-standalone boundary per skill is finalized at build time, when triggering can be tested empirically.

---

### B4 - D2: The v1 cut
**Question:** What exactly ships in v1?

**Recommended v1 (Blend + modes + full anatomy + self-proving completeness):**
- **The Standard** published as the citable Handbook (`STANDARD.md`), incl. library anatomy (S10) + output contracts (S11).
- **Toolkit's own docs (D):** README + QUICKSTART + the published Handbook, so users can learn it on day 1.
- **Skills:**
  - `init` - onboarding/interview front door (SHOULD-level).
  - `skill`, `subagent`, `plugin` (modes: create/validate) - **emitting both Claude and Codex formats (B)**.
  - `audit-library` (standalone) - checks the **full anatomy** (HISTORY/backlog/INDEX-manifest drift/output-contracts/dual-layer duplication) and **reports the conformance tier (E)**; runs on **existing** libraries (C).
  - `adopt-library` - assess an existing repo and recommend bring-to-conformance steps (C).
  - `capability-advisor` - what to build / where it lives / which agents support it (G).
  - `scaffold-advanced-library` (workflow) - scaffolds the full anatomy: `_backlog/`, `HISTORY.md`, `templates/`, committed `docs/decisions/` (MADR) + `docs/rfcs/` + root `_backlog/`, gitignored `_LOCAL/` (scratch only), `INDEX.md`, `AGENTS.md`, `manifest.generated.json`, `CHANGELOG.md` + `RELEASE-NOTES.md`, CI.
- **Subagents (Gold-tier example):** `skill-author`, `skill-critic`, `library-auditor`, with `_chain-permitted.yaml`.
- **Self-hosting at Gold (A, B):** the toolkit repo IS a Gold-tier, multi-agent library - it ships its own hooks + chain contracts + CI that validates itself, and emits/validates Codex format. It passes its own Standard.
- **Conventions locked:** agent vs human single-source-of-truth; gitignored `_internal/` + committed `decisions/` (MADR) + `rfcs/`; Diataxis docs; release-notes vs changelog.
- **Deferred to post-validation:** eval/iterate tiers (F), command/hook/MCP/LSP/monitors/channels/themes builders, deprecation tooling, docs site, conformance badges - specified in the catalog as roadmap.

~8 skills + 3 subagents + the Standard + self-hosting. Thin in count, complete in proof: it scaffolds, audits, adopts, advises, multi-agent, and is itself a Gold example.

**Status:** LOCKED (2026-05-24) - depends on B1 [locked] + B3 [locked]; expanded with self-proving completeness (A,B,C,D,E,G); eval (F) deferred.

---

### B5 - Conformance tiers in v1?
**Question:** Ship Bronze/Silver/Gold conformance tiers in the v1 Standard, or define the 3-layer model now and add formal tier *grading/badges* later?

**Recommendation:** Define the **3-layer model (Universal/Convergent/Advanced) now** (it is load-bearing for the whole Standard) but defer formal **tier badges/reporting tooling** to post-v1. The model is conceptual and free; the tooling is the cost.

**Status:** OPEN (lean: model now, badges later).

---

## Part C: Design decisions (LEANING - confirm after the forks)

These have clear recommendations; confirm them in a batch.

| # | Decision | Recommendation | Why |
|---|---|---|---|
| D4 | Standard structure | Tiered (Universal/Convergent/Advanced) + component specs + governance + quality + security | Tiers do triple duty: audience ladder, cross-agent portability, conformance |
| D5 | Tooling stack | **Node, single runtime, no triplets; CI-agnostic** | Claude-first/Codex-second, token-efficient, portable, no GitHub lock-in; wrap `skills-ref` |
| D6 | Bundles | author / validate / patterns / iterate / release + advise | Maps the lifecycle; advise serves cross-agent support |
| D7 | Docs | **Markdown-first for v1, Diataxis-structured**; defer a docs site | Light, portable, no build dependency; Diataxis is the adopted convention |
| D8 | Marketplace | Register at first tagged release (v0.1.0) | Do not surface a half-built public plugin |
| D10 | Dual audience | Tag every skill beginner/intermediate/advanced; beginner on-ramp = skill/references/plugin/instructions/docs | Audience split falls along the tier boundary |
| D16 | Dual-layer navigability | **Adopt it** (plugin-level vs skill-level truth; `AGENTS.md` + `INDEX.md` + generated manifest; single-source-of-truth, no-orphan, no-duplication rules) | The holistic version of per-component governance; agent + human navigable; from discovery-questions doc |

**New capability layers to fold into the Standard + catalog** (from discovery review): LSP servers, monitors, channels, themes, output styles, CLAUDE.md-as-layer, and richer skill frontmatter (`disable-model-invocation`, `user-invocable`, `context: fork`, `agent`, `arguments`). Config scopes (user/project/local/managed). Enrichments: multi-tier eval (Static/LLM-Judge/Monte-Carlo), description-craft specifics, 4-phase security lifecycle, AAIF upstream-tracking.

**Status:** LEANING (all).

---

## Part D: Recommended path to close everything

A short, ordered sequence. Each step is a quick decision or a confirm.

1. **Close B1 (sequencing/blend).** Everything downstream sizes from this. Recommended: the Blend.
2. **Decide B3 (families vs modes).** Recommended: modes per component + a few standalone skills. This fixes the inventory shape.
3. **Lock B4 (the v1 cut)** using B1 + B3. Recommended: the ~11-skill + 3-subagent thin slice above.
4. **Confirm Part C in a batch** (D4/D5/D6/D7/D8/D10/D16) - all leaning, low-controversy.
5. **Decide B5** (tiers: model now, badges later) and **B2** (parallel coalition outreach: yes/no).
6. **Fold the discovery additions** (capability layers, dual-layer navigability, frontmatter, enrichments) into the Standard + catalog.
7. **Finalize the Standard** (resolve its Appendix A open items: sample count, version-propagation wording, description rubric).
8. **Write the committed design spec** (the brainstorming deliverable) summarizing the locked decisions and the v1 cut.
9. **Invoke writing-plans** to turn the spec into an implementation plan for the thin v1.
10. **Build the thin v1**, dogfooding the Standard; let reception drive the roadmap.

---

## Consolidated decision status

| ID | Decision | Status | Recommendation |
|---|---|---|---|
| Vision/Arch/D3/D9/D11/D12/D13/D14 | Foundation | LOCKED | (see Part A) |
| History location / Backlog format | Governance specifics | LOCKED | frontmatter version + HISTORY.md; `_backlog/` markdown |
| **D15** | Sequencing / ambition | LOCKED | Blend (default; ambition revisited post-v1) |
| **B2** | Coalition | OPEN | Lightweight parallel outreach |
| **B3** | Families vs modes | LOCKED | B: modes + few standalone (boundary tuned at build time) |
| **D2** | v1 cut | LOCKED | ~8 skills + 3 subagents + Standard + self-hosting; multi-agent, adopts existing libs, self-proving Gold |
| **B5** | Conformance tiers in v1 | OPEN | Model now, badges later |
| **D17** | Skill name prefix | DEFERRED | Avoid `ast-` (AST = abstract syntax tree); lean `askit-` (placeholder); maintainer to finalize |
| - | Governance docs layout | LOCKED | `docs/decisions/` (MADR) + `docs/rfcs/`; `_backlog/` at root; `_LOCAL/` gitignored scratch |
| D4 | Standard structure | LEANING | Tiered + specs + governance + quality + security |
| D5 | Tooling stack | LEANING | Node single-runtime, CI-agnostic |
| D6 | Bundles | LEANING | author/validate/patterns/iterate/release + advise |
| D7 | Docs | LEANING | Markdown-first, Diataxis; defer site |
| D8 | Marketplace timing | LEANING | At first tagged release |
| D10 | Audience | LEANING | Tag all skills; clear beginner on-ramp |
| D16 | Dual-layer navigability | LEANING | Adopt |

---

## Change log
- 2026-05-24 v0.1: Created as the master decision guide consolidating all five working docs.
