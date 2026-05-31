# agent-skills-toolkit: Architectural Approach Options

> **RESOLVED / ARCHIVAL (2026-05-25):** Approach B was chosen. Authoritative design: [`agent-skills-toolkit-DESIGN.md`](../agent-skills-toolkit-DESIGN.md) §4 (v0.6). Retained for provenance (the A/B/C comparison). Index: [`../README.md`](../README.md).
> **Terminology note:** the canonical docs now use a strict two-axis model ("plugin" = artifact/release unit; "skill library" = the grade a plugin earns). Where this doc says "library" structurally, read "plugin."
>
> Decision-support document (brainstorming session, 2026-05-23). Working material, not the committed design spec.

## 1. What we are deciding

`agent-skills-toolkit` is a standalone, public-from-day-one plugin in the `product-on-purpose` marketplace. Its job is to let anyone author, maintain, iterate, and scale a best-in-class agent skill library, one that goes beyond a bag of standalone skills by using session lifecycle hooks, chained skills and workflows, formal chaining contracts, sub-agents, and CI.

The reference implementation of "best-in-class" already exists in this workspace: `pm-skills` (63 skills, companion commands, sub-agents with `_chain-permitted.yaml` / `_pairing.yaml` contracts, `_workflows/` arcs, a ~40-script validation suite as `.md`/`.ps1`/`.sh` triplets, a `pre-tag-validate` aggregator, AGENTS.md sync, generators, and `agentskills.io` spec compliance). That apparatus was hand-grown and is PM-specific. The toolkit's mission is to **generalize that apparatus into a domain-agnostic, batteries-included product.**

The scope is settled (everything: author + validate + patterns + release + best-practice subagents + examples + knowledge + instructions). The open question is **structure**: how to package a comprehensive toolkit without producing the monolith the portfolio philosophy explicitly warns against ("composable over monolithic," "every line of context earns its place," "ship the smallest useful thing").

The three approaches below are not different feature sets. They are three different **centers of gravity** for the same feature set, and they imply very different build orders, risk profiles, and first-release shapes.

---

## 2. Approach A: Monolithic flagship

### Concept
Treat `pm-skills` as the template and build a generalized twin. One plugin, one layout, everything shipped together. The toolkit is "pm-skills, but for building any skill library."

### Concrete shape
```
agent-skills-toolkit/
  .claude-plugin/plugin.json
  skills/
    author-new-library/        # scaffold a whole plugin
    author-new-skill/           # scaffold one skill
    validate-frontmatter/
    validate-structure/
    score-description/
    audit-library/
    package-release/
    ... (15-25 skills)
  commands/                     # companion slash command per skill
  agents/
    skill-author.md
    skill-critic.md
    library-auditor.md
    release-conductor.md
    _chain-permitted.yaml
  _workflows/
    scaffold-advanced-library.md
    pre-release.md
  scripts/                      # generalized triplet suite (.md/.ps1/.sh)
    lint-frontmatter.*
    check-counts.*
    validate-chain-contracts.*
    pre-tag-validate.*
    ... (~30-40 scripts)
  hooks/                        # session start/end, pre-commit examples
  docs/                         # Astro/Starlight site
  AGENTS.md, CHANGELOG.md, README.md
```

### Build path to v1
Everything is v1. You cannot ship a credible "flagship" with half the validators missing, so the first release is large. Realistically: generalize the script suite (the hard part), write 15-25 skills, wire subagents and workflows, stand up docs, then release.

### Outcome
- **What the world gets:** a single install that visibly matches `pm-skills` in completeness. Familiar to anyone who has seen your other libraries.
- **What it feels like to use:** install once, get the whole kit. No decisions about which piece to take.
- **What it feels like to maintain:** every change touches a large surface. The script suite is OS-specific and brittle (you already maintain triplets by hand in pm-skills). Version bumps move the whole thing.

### Strengths
- Lowest conceptual novelty: you already know this shape works.
- Cohesive single artifact; one version number.

### Weaknesses
- Highest time-to-first-release. The thing cannot ship until most of it exists.
- Directly courts the monolith the philosophy warns against.
- The script suite, the most fragile part, is on the critical path to v1.
- Hard to let a user "take just the validators" without the rest.

### Risks
- Scope fatigue before first release.
- The generalized scripts become a maintenance tax with no clean module seams to contain it.

### Best when
You want a fast conceptual decision and are comfortable with a long, large first release and ongoing monolith maintenance.

---

## 3. Approach B: Self-hosting reference + modular capability bundles  (recommended)

### Concept
One plugin, but internally organized into four cleanly-bounded **capability bundles** along the lifecycle, each usable on its own, glued by a top-level chained workflow. The knowledge core is a single versioned document, the **Advanced Skill Library Standard**, that every tool enforces. The decisive move: the plugin is **self-hosting**. It is built to its own Standard and runs its own hooks, validators, and CI on itself. It is therefore simultaneously the toolkit and the canonical worked example of the thing it teaches.

### Concrete shape
```
agent-skills-toolkit/
  .claude-plugin/plugin.json
  STANDARD.md                   # the versioned "Advanced Skill Library Standard" (knowledge core)
  skills/
    author/                     # bundle 1: scaffolding
      scaffold-library/
      scaffold-skill/
      scaffold-workflow/
    validate/                   # bundle 2: linting + auditing
      lint-frontmatter/
      check-structure/
      score-description/
      audit-library/
    patterns/                   # bundle 3: the "advanced" reference, dogfooded
      add-session-hooks/
      add-chained-workflow/
      add-chain-contract/
    release/                    # bundle 4: packaging + scaling
      package-marketplace/
      curate-changelog/
      release-gates/
  commands/                     # companion command per skill
  agents/
    skill-author.md
    skill-critic.md             # adversarial review (generalized pm-critic)
    library-auditor.md          # generalized pm-skill-auditor
    release-conductor.md        # generalized pm-release-conductor
    _chain-permitted.yaml
  _workflows/
    scaffold-advanced-library.md   # author -> patterns -> validate -> release, chained
  scripts/                      # enforcement, derived from STANDARD.md
  hooks/                        # real session-start/-end + pre-commit, used BY this repo
  .github/workflows/ci.yml      # runs the toolkit's own validators on the toolkit
  docs/                         # Standard + per-bundle guides + the self-host case study
  AGENTS.md, CHANGELOG.md, README.md
```

### Build path to v1
The architecture is whole, but the bundles are independent enough to land in sequence. A credible minimum-but-real v1 = `STANDARD.md` + the **author** bundle + a thin slice of **validate** (frontmatter + structure) + the `scaffold-advanced-library` workflow stub + self-hosting CI proving the toolkit passes its own checks. `patterns` and `release` bundles follow as minor versions. Because the toolkit dogfoods itself, each bundle is tested against a real library (this one) from the first commit.

### Outcome
- **What the world gets:** a toolkit that is also a living example. "Want to see an advanced library? This plugin is one, and here is the Standard it follows, and here is the CI proving it." For a public product, that is the single most persuasive artifact you can ship.
- **What it feels like to use:** run `scaffold-advanced-library` and get a repo pre-wired with hooks, a workflow, chain contracts, validators, and CI. Or pull just the `validate` bundle into an existing library.
- **What it feels like to maintain:** changes are scoped to a bundle. The Standard is the one place truth lives; tooling and docs derive from it, so drift is caught by the toolkit's own CI on itself.

### Strengths
- Comprehensive (satisfies "include everything") and composable (honors the philosophy) at once.
- Self-hosting is free credibility, free regression testing, and the best possible documentation.
- Clean module seams keep files focused and keep your context-window edits reliable.
- Can ship incrementally without the architecture feeling half-built.
- Absorbs C's "Standard as single source of truth" and A's completeness.

### Weaknesses
- Requires up-front discipline: bundle boundaries and a chain-contract format must be designed deliberately.
- Self-hosting adds CI complexity early (you must make the toolkit pass its own gates from the start).

### Risks
- Boundary creep: a skill that belongs in two bundles. Mitigation: the Standard defines bundle ownership rules.
- Self-host bootstrapping: chicken-and-egg where a validator must exist before the repo can pass it. Mitigation: land validators in dependency order, allow a documented "not yet enforced" list.

### Best when
The product is public and the example matters as much as the tooling, and you value composability and incremental shipping. (This is the stated situation.)

---

## 4. Approach C: Standard-first, tooling-as-enforcement

### Concept
The primary product is the **Advanced Skill Library Standard** itself: a versioned, citable specification plus reference set describing how to build advanced skill libraries (lifecycle hooks, chaining contracts, workflow conventions, CI expectations, frontmatter rules, naming, family contracts). All tooling is a deliberately thin layer that enforces or scaffolds the Standard. The spec leads; code follows.

### Concrete shape
```
agent-skills-toolkit/
  STANDARD/
    00-overview.md
    01-skill-anatomy.md
    02-chaining-and-workflows.md
    03-session-lifecycle-hooks.md
    04-ci-and-release.md
    05-conformance-levels.md      # Bronze/Silver/Gold conformance
  skills/
    check-conformance/            # grade a library against the Standard
    scaffold-from-standard/
  scripts/                        # thin enforcement, pinned to STANDARD version
  examples/
    minimal-conformant-library/   # tiny reference repo
  docs/
  README.md, CHANGELOG.md
```

### Build path to v1
Write the Standard first (the bulk of the effort), then a conformance checker and one scaffolder, plus one minimal reference example. v1 is "the Standard plus enough tooling to check conformance."

### Outcome
- **What the world gets:** a durable, portable specification others can cite and target, independent of any one stack or CI provider. Conformance levels (e.g., Bronze/Silver/Gold) give libraries a badge to aim for.
- **What it feels like to use:** read the Standard, target a conformance level, run the checker. Less "generate everything for me," more "here is the bar; here is how to measure yourself."
- **What it feels like to maintain:** the Standard is versioned and changes deliberately; tooling tracks the Standard version. Low brittle-script burden because tooling is intentionally thin.

### Strengths
- Most principled and longest-lived. A good spec outlives any tool.
- Stack-portable; not tied to your Astro/PowerShell/bash specifics.
- Strong public positioning as the definitional reference.
- Avoids over-investing in fragile scripts.

### Weaknesses
- Heaviest writing up front; slowest to feel "batteries-included."
- v1 tooling is thin, which conflicts with your "include everything" ask.
- Risk that the spec is admired but not adopted if generation is too thin.

### Risks
- Spec-reality drift if the example library is too small to exercise the Standard.
- Adoption friction: specs require the user to do more work than a scaffolder does.

### Best when
You prioritize a durable, citable standard and are willing to grow tooling slowly behind it.

---

## 5. Side-by-side

| Dimension | A: Monolithic | B: Self-hosting modular | C: Standard-first |
|---|---|---|---|
| Center of gravity | The bundled toolkit | The Standard + the self-hosted example | The Standard spec |
| Time to first real release | Long | Medium (ships bundle by bundle) | Medium-long (spec heavy) |
| Composability | Low | High | High (spec), thin tooling |
| Honors anti-monolith philosophy | Weak | Strong | Strong |
| "Include everything" satisfied at v1 | Yes, but slowly | Mostly; rest as minor versions | No; tooling thin at v1 |
| Public-product credibility | Familiar | Highest (it is its own proof) | High (definitional) |
| Maintenance burden | High, undifferentiated | Contained per bundle | Low tooling, deliberate spec |
| Key risk | Scope fatigue, brittle scripts | Boundary creep, self-host bootstrap | Spec admired but unadopted |
| Best fit for stated goal | Weak | Strong | Partial |

---

## 6. Recommendation

**Approach B.** It is the only option that delivers the "include everything, best-in-class, public day one" ask while honoring the portfolio's composability and anti-bloat principles. The self-hosting property is the decisive advantage: for a public product whose claim is "build libraries this good," the most convincing artifact is a toolkit that is itself a conformant, CI-verified example of its own Standard. B also folds in C's strongest idea (a single versioned Standard as the source of truth) and A's completeness, while the bundle seams let it ship incrementally instead of as one heavy drop.

A sensible v1 slice under B: `STANDARD.md` + the **author** bundle + a frontmatter/structure slice of **validate** + the `scaffold-advanced-library` workflow + self-hosting CI. `patterns` and `release` bundles follow as 0.x minor releases.

## 7. Open questions to resolve next (regardless of approach)

1. **Stack of the tooling.** Match pm-skills (PowerShell + bash + Node `.mjs` triplets) for portability, or standardize on one runtime (e.g., Node) for a public product? The triplet approach is portable but triples maintenance.
2. **Conformance levels.** Adopt C's Bronze/Silver/Gold idea inside B's Standard, so libraries can target a tier?
3. **Relationship to `agentskills.io`.** Treat that spec as an upstream input the Standard extends, or stay independent?
4. **Docs surface.** Reuse the Astro/Starlight doc-stack from pm-skills, or ship docs-as-markdown only for v1?
5. **Marketplace registration.** Add to `agent-plugins/.claude-plugin/marketplace.json` now (as `Discovery`) or at first tagged release?
