# P3 - README hero rewrite + mermaid diagrams + mermaid-valid (U12) - PRD

> Rewrite the README hero to the pm-skills / product-on-purpose family pattern, add the four canonical mermaid diagrams (architecture, tier-climb, eval-boundary, build-evaluate-improve), and land the Bronze `U12 mermaid-valid` check so every fenced mermaid block in the repo is structurally validated by the deterministic gate and rendered at build time by `astro-mermaid`. Normative source: [`SPEC.md`](../SPEC.md) (R-CONTENT, R-CHECK-U12), [`CHECKS-SPEC.md`](../CHECKS-SPEC.md) section "U12 - mermaid-valid", and [ADR 0024 (documentation depth and discoverability)](../../../decisions/0024-documentation-depth-and-discoverability.md) (D4, D6).

## Problem / motivation

ADR 0024's driver is depth + discoverability delivered through non-vacuous tiers: every visible win must be backed by a deterministic requirement, and the toolkit must dogfood that requirement as the reference implementation. P3 closes two gaps against that driver.

First, the **discoverability gap at the front door.** The README is the single highest-traffic artifact in the repo and the first thing a plugin author or marketplace browser reads. ADR 0024's Provenance records that the maintainer's brief explicitly asked for "a more visually appealing, instructional, comprehensive README matching the pm-skills and product-on-purpose standards" with "mermaid diagrams added thoughtfully throughout." The current README is already strong prose, but its hero and diagram set are not yet aligned to the family pattern the portfolio standardizes on (a centered hero block, a one-line value statement, a consistent nav strip, and a small set of purpose-built diagrams that teach the mental model before the prose does). A reader who never scrolls past the fold should still grasp what the toolkit is, the tier ladder it sells, where the deterministic gate ends and behavioral evidence begins, and the build-evaluate-improve loop the skills drive. Diagrams carry that load faster than paragraphs.

Second, the **depth gap behind the diagrams.** Mermaid diagrams are prose that silently rots: an unbalanced bracket, an unknown diagram keyword, or a tab character renders as a broken box on the live site and nobody notices until a reader hits it. ADR 0021 D6 decided a `mermaid-valid` check "in v1" but it was never built and is not among the existing checks. P3 ships it. Crucially, it is a **Bronze (Universal)** check, the same content-hygiene class as `U10 no-dashes`: it applies to every plugin the toolkit grades, not just the toolkit, so any downstream author who pastes a malformed diagram gets a gate failure instead of a broken render. It never penalizes a diagram-free plugin (vacuous pass).

Why both matter to the toolkit as the reference implementation: a conformance toolkit whose own front-page diagrams could render broken, with no check to catch it, undercuts its own thesis. P3 makes the visible win (a polished, diagram-rich README) and the deterministic backing (U12) land together, author-before-enforce, so the check ships green on the toolkit's own dogfood.

## Goals

- Rewrite the README hero block to the pm-skills / product-on-purpose family pattern: centered title, a single bold value line, a consistent nav strip, badges, and a table of contents, with no stale check-count or tier-label claim.
- Author exactly four canonical mermaid diagrams, each a fenced ` ```mermaid ` block, each teaching one mental model: **architecture** (plugin -> checks -> findings -> tier), **tier-climb** (loose -> Bronze -> Silver -> Gold), **eval-boundary** (deterministic gate vs behavioral evidence), and **build-evaluate-improve** (the authoring loop).
- Land `scripts/checks/mermaid-valid.mjs` as Bronze `U12`: a synchronous, zero-dependency structural validator (non-empty, recognized first keyword from a named constant, balanced brackets ignoring quotes, no tabs), registered in the tier registry, with golden + anti fixtures and unit tests.
- Make U12 pass over **every tracked mermaid block in the repo** (the existing diagrams in README, `docs/explanation/**`, `docs/how-to/**`, `docs/internal/**`, plus the four new ones and the curated site `.mdx`), swept and confirmed green before the check is flipped on.
- Ensure the site renders every diagram via `astro-mermaid` (the build-time second validation layer) with no broken render.

## Non-goals

- **No quality judgment.** U12 asserts structure only (does the block parse-as-shaped); whether a diagram is clear, well-labeled, or pedagogically good routes to the behavioral `askit-evaluate` path, never the deterministic gate (Design Principle 3). U12 deliberately does **not** do a full Mermaid parse.
- **No new Mermaid runtime dependency.** The portable gate is structural; the full parse is the `astro-mermaid` build. This preserves the one-runtime-dependency spine (`yaml` only).
- **No renumber, no Standard bump, no version bump.** The `G7`-inclusion renumber, `STANDARD.md v0.10`, and the `1.0.0 -> 1.1.0` version bump are P6, not P3. P3 must not move the version or the Standard line.
- **No new content quadrants.** The Diataxis content (`tutorials/`, glossary, faq, troubleshooting, architecture pair) is P1; the site generator is P2. P3 touches the README and adds diagrams; it does not author new docs pages (beyond placing diagrams where the family pattern calls for them in the README).
- **No new prefix skills.** Diagram authoring uses the existing `askit-build-docs` `readme` mode (ADR 0024 D5); P3 adds no `askit-` entry.
- **No `.mdx` diagram authoring beyond what the family pattern needs.** U12 must *scan* `.mdx` (the curated `site/src/content/docs/index.mdx` is tracked); P3 is not obligated to add a diagram there, only to ensure any block that exists is valid.

## Users and value

- **The plugin author / marketplace browser** reading the README cold: the rewritten hero and four diagrams let them grasp the toolkit's identity, the tier ladder, the gate-vs-evidence boundary, and the build loop in seconds, before committing to the prose. The eval-boundary diagram in particular answers the most common skepticism ("is this just another LLM opinion?") visually.
- **Any downstream plugin author** who ships mermaid diagrams: U12 is Bronze, so their diagrams get the same structural gate, catching a broken render before it ships, on any agentskills.io agent.
- **The toolkit maintainer**: a single named constant of recognized diagram keywords makes the check trivially extensible; the two-layer design (portable structural gate + build-time render) means a diagram cannot both pass CI and render broken on the live site without one of the layers flagging it.
- **The toolkit as the reference implementation**: a polished, diagram-rich front page that is itself gate-verified is the proof the toolkit exists to be.

## Scope

What lands in this phase (one PR vs protected `main`):

- The README hero rewrite to the family pattern (hero block, value line, nav strip, badges, TOC), with no stale count/tier wording introduced.
- The four canonical mermaid diagrams as fenced ` ```mermaid ` blocks, placed in the README where the family pattern calls for them.
- `scripts/checks/mermaid-valid.mjs` (Bronze `U12`), exporting the recognized-keyword set as a named constant, reusing the shared `SKIP_DIRS` by basename, scanning `.md` AND `.mdx`.
- Registration of the module in `scripts/lib/registry.mjs` (the `CHECKS` array + the import line).
- Golden fixture `tests/fixtures/golden/mermaid-ok/` and anti fixture `tests/fixtures/anti/mermaid-bad/`.
- Unit test `tests/unit/mermaid-valid.test.mjs` (valid passes, each structural rule's violation fails naming the file + rule, no-diagram passes).
- A pre-flip repo-wide sweep confirming U12 is green over all existing tracked mermaid blocks before the check is registered.
- Regenerated `INDEX.md` / manifests only if the README change alters a generated input (it should not; the README is hand-authored, but the cadence runs the generators defensively).

## Success metrics / definition of done

- [ ] `node scripts/check.mjs` -> Advanced, 0 errors / 0 warnings, with `U12` now in the spine and green over the whole repo.
- [ ] `npm test` green, including the new `mermaid-valid` unit test and the unchanged `registry-sync` test.
- [ ] The anti fixture (`anti/mermaid-bad`) makes U12 fail with a message naming the file and the violated structural rule; removing the defect makes it pass.
- [ ] A plugin with no mermaid blocks (e.g. the `golden/minimal-skill` fixture) passes U12 with zero findings (vacuous pass).
- [ ] The four new diagrams render correctly in `(cd site && npm run build)`; the 14.11 link + route guards pass on the built `dist`.
- [ ] The README hero matches the family pattern and carries no stale "25 checks" / mismatched-count claim; counts in the README remain internally consistent (P3 does not move them to 30; that is P6).
- [ ] A repo-wide grep confirms U12 has no false negatives: every tracked ` ```mermaid ` block parses under the structural rules.
- [ ] No em-dash (U+2014) or en-dash (U+2013) anywhere in the diff.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| **U12 is repo-wide and an existing diagram in `docs/internal/**` or an audit file fails the structural rules at flip time, turning `main` red.** | Author-before-enforce extended to existing artifacts: sweep ALL tracked mermaid blocks (including `docs/internal/**`, which U12 does not exclude) with the new validator BEFORE registering it; fix any pre-existing defect in the same PR. The flip only happens once the sweep is green. |
| **`SKIP_DIRS` is a non-exported `const` in `no-dashes.mjs`, so "reuse by basename" cannot import it as written.** | P3 exports `SKIP_DIRS` from `no-dashes.mjs` (a one-line `export` keyword addition, no behavior change) and `U12` imports it, so both checks share one skip set. Maintainer may relocate it to `scripts/lib/` later; not required for P3. (Flagged for maintainer confirmation.) |
| **The structural validator is too strict and false-fails a legitimate diagram (e.g. a bracket inside a quoted label, a recognized keyword with a `-v2` suffix).** | The bracket-balance rule ignores characters inside quotes; the keyword set includes `stateDiagram-v2` and is matched as a prefix-aware recognized set; golden fixtures include a quoted-bracket case; the anti fixture isolates one defect at a time. |
| **The structural validator is too loose and passes a diagram that renders broken.** | The build-time `astro-mermaid` render is the second layer; the site build is part of the P3 verification, so a diagram that passes structural but fails render is caught before merge. |
| **`.mdx` is missed (U10's scanner has no `.mdx` branch), so a broken diagram in `index.mdx` slips the gate.** | U12 uses its own file walk that scans `.md` AND `.mdx`; a test asserts an `.mdx` diagram is scanned. |
| **The hero rewrite introduces a stale check count or tier label out of sync with the real spine.** | The README sweep checks counts for internal consistency; P3 keeps whatever count/label the repo is at when P3 runs (P6 owns the move to 30 / G1-G10), and the adversarial gate verifies no contradictory number was introduced. |
| **House no-dash rule slips into the new hero prose.** | The P0 PreToolUse hook + `U10` + the adversarial gate; the write tool itself rejects U+2014 / U+2013. |

## Dependencies and sequencing

- **Already on `main` before P3 starts:** the existing check spine and registry pattern; the existing tracked mermaid blocks in README / `docs/**`; the `astro-mermaid` integration in `site/astro.config.mjs` (present); the curated site landing pages. P0 (the demonstrative hook) and ideally P1/P2 land first per the program order, but P3 is independent enough to parallelize across worktrees (PROGRAM-PLAN sec 5; IMPL-PLAN cross-phase deps) because it touches the README + a new check + its fixtures, not the docs content or the site generator.
- **Author-before-enforce order within P3:** (1) write `mermaid-valid.mjs` and run it read-only over the repo to find any pre-existing structural defect; (2) author the four new diagrams + the hero rewrite and fix any swept defect so the whole tree is clean; (3) only then register the check in the registry so it binds; (4) gate + tests + site build green; (5) adversarial gate; (6) squash-merge. The check is flipped on last, after its conforming artifacts (the diagrams) exist and the repo is swept clean, so it ships green on its own dogfood (R-SEQ-1).
- **Downstream:** U12 being Bronze means it now grades any downstream plugin's diagrams from the moment it merges; no later phase depends on P3, and P3 depends on no later phase. P6 will recount the spine to 30 and renumber; P3 leaves the count where it found it.
