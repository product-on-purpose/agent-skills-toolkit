# v1.1.0 program plan - the ADR 0024 documentation depth + discoverability build-out

> The plan for the **v1.1.0** milestone: execute [ADR 0024 (documentation depth, discoverability, and the full docs-site build-out)](../../decisions/0024-documentation-depth-and-discoverability.md), plus pair in the demonstrative hook that makes Gold check `G1` non-vacuous.
> Created 2026-06-02. Owner: maintainer. Source of truth: ADR 0024 (Accepted 2026-06-01). Live status: [`docs/internal/STATUS.md`](../../STATUS.md).
> Packet: [`README.md`](./README.md) (index) | [`SPEC.md`](./SPEC.md) | [`CHECKS-SPEC.md`](./CHECKS-SPEC.md) | [`IMPL-PLAN.md`](./IMPL-PLAN.md).

## 1. Goal

Finish the dual-audience Diataxis documentation set ADR 0021 only half-shipped, make the docs site a true **generated Pattern S view** of `docs/`, and deepen the self-proving Gold reference with **five new deterministic checks** - delivered as small, individually-green PRs under an author-before-enforce discipline. Bundle one **demonstrative hook** so the credibility loop closes (`G1` stops passing vacuously) as the Gold surface grows.

The spine goes from **25 checks (U1-U11 / S1-S8 / G1-G6)** to **30 checks (U1-U12 / S1-S8 / G1-G10)**, and the long-standing "G7 = inclusion" labeling error is corrected.

## 2. Version reconciliation (read this first)

ADR 0024 was written against a pre-0.9 Standard and says its normative additions land as **"STANDARD.md v0.9."** That number is **already taken**: the Node-baseline amendment ([ADR 0025](../../decisions/0025-raise-node-baseline.md)) bumped `STANDARD.md` to v0.9, and the v1.0.0 marketplace launch made `library.json` adopt `standard: "0.9"`. Therefore:

- **The ADR 0024 checks land as Standard `v0.10`, not `v0.9`.** Every "v0.9 delta" in ADR 0024 reads as `v0.10` for this program.
- `library.json` `standard` moves `0.9 -> 0.10` at the phase that flips the last new check (P6).
- This is a documentation reconciliation only; it changes no decision in ADR 0024. It is recorded here and in [`SPEC.md`](./SPEC.md) R-STD so the build does not re-collide the version line.

## 3. Scope

**In (per ADR 0024 sec "Scope and R6"):**
- The missing ADR 0021 D1 content: the whole `docs/tutorials/` quadrant, a root `QUICKSTART`, `glossary`, `faq`, `troubleshooting`, and the architecture overview+detailed pair.
- The frontmatter taxonomy (`title` / `description` / `audience` / `level` / `tags`) across `docs/**` (excluding `docs/internal/`).
- The generated Pattern S docs site (the public `docs/` tree emitted into gitignored `site/src/content/docs/`, read by the stock `docsLoader()`), with the curated landing on top.
- Five new checks: `U12 mermaid-valid` (Bronze), `G7 docs-frontmatter`, `G8 folder-readme`, `G9 source-doc`, `G10 docs-presence` (Gold), and the `G7`-inclusion renumber.
- Conventions: folder-README inventory + four-field source docblocks.
- One new `askit-build-docs` mode (`folder-readme`); **no new prefix skills**.
- The README hero rewrite + the architecture / tier-climb / eval-boundary / build-evaluate-improve diagrams.
- **The demonstrative hook** (this program's addition, not in ADR 0024): one real hook so `G1` grades something. See sec 6.

**Out (deferred to v1.x, per ADR 0024):**
- The example "threads" / samples build-out (ADR 0021 D5), the interactive capability matrix, `starlight-versions`, video casts.
- The shared family Astro reusable workflow + `@product-on-purpose/astro-docs-preset` (the local 14.11 guards migrate when those exist; ROADMAP Phase 1 in `agent-plugins/standards/`).
- The Gemini emitter (named v1.x cross-agent target).

## 4. The five new checks (summary; full spec in CHECKS-SPEC.md)

| reqId | Check module | Tier | Asserts (one line) |
|---|---|---|---|
| `U12` | `mermaid-valid` | Bronze | every fenced `mermaid` block parses (vacuous when none) |
| `G7` | `docs-frontmatter` | Gold | the D3 taxonomy present + controlled-vocabulary across `docs/**` |
| `G8` | `folder-readme` | Gold | folder README present + frontmatter `title` + inventory matches actual children |
| `G9` | `source-doc` | Gold | header docblock with the four fields under the in-scope source roots |
| `G10` | `docs-presence` | Gold | Diataxis dirs non-empty + ADR TL;DR block + architecture overview-to-detailed link |

The former `G7 = "all Bronze + Silver by inclusion"` becomes an **unnumbered tier-inclusion statement** in STANDARD.md sec 2.6 (it is the monotonic-tier property, never a module), freeing `G7-G10` for the real checks above.

## 5. Phase map (author-before-enforce)

The ordering principle: **author the artifacts in one PR (the gate stays green because no new check exists yet), then turn the corresponding check on in the next PR (it ships green on its own dogfood).** No phase leaves `main` red. Each phase is its own PR with an adversarial gate before merge.

| Phase | Lands | New check enforced | Standard | Visible win |
|---|---|---|---|---|
| **P0** | the demonstrative hook (`hooks/hooks.json` + script + G1 docs + a G3 eval) | none (makes `G1` non-vacuous) | - | credibility |
| **P1** | frontmatter taxonomy doc; `title/description/audience/level` added to all `docs/**`; author QUICKSTART, `tutorials/`, glossary, faq, troubleshooting, architecture overview+detailed | none | - | content |
| **P2** | `docs-frontmatter` (`G7`) + generate the full `docs/` tree into `site/src/content/docs/` (the Pattern S view) | `G7` | - | site |
| **P3** | README hero rewrite + the four diagrams | `U12` (`mermaid-valid`) | - | visual |
| **P4** | folder READMEs authored (via the new `folder-readme` mode) | `G8` (`folder-readme`) | - | self-doc |
| **P5** | source docblocks under the in-scope roots | `G9` (`source-doc`) | - | self-doc |
| **P6** | `docs-presence` (`G10`) + the `G7`-inclusion renumber + **STANDARD.md v0.10** + version bump to **1.1.0**; regenerate INDEX/manifest; confirm gate green at advanced with the 30-check spine | `G10` | **v0.10 / v1.1.0** | release |

**P0-P3 are the must-ship visible win** (credibility + content + site + README + diagrams). **P4-P6 are the careful repo-wide tail** (folder READMEs, docblocks, the final renumber + release). Default release cadence is a **single `v1.1.0` cut at P6** (ADR 0024 D6); the maintainer MAY cut an interim release after P3 if the visible win should ship sooner (see sec 8).

## 6. The demonstrative hook (the G1 pairing)

ADR 0024 leans on **non-vacuous tier discipline**, yet `G1` (hook-documentation) passes only because the toolkit ships no hooks. P0 closes that: a `PreToolUse` hook on `Write|Edit|NotebookEdit` enforcing the house no-em-dash / no-en-dash rule (the toolkit's own `U10`, now also guarded at author-time), shipped as the toolkit's reference hook. It:

- flips `G1` from vacuous to proven (a real hook whose event/matcher/scope/failure-behavior `G1` grades);
- dogfoods the component type `askit-build-hook` teaches (the toolkit currently ships no hook to point at);
- requires a `G3` (library-regression) eval for the hook event, which P0 includes;
- is content-hygiene, thematically aligned with a docs build-out that authors a flood of prose.

Full design + the `G1`/`G3` contract in [`CHECKS-SPEC.md`](./CHECKS-SPEC.md) sec "P0 demonstrative hook". `G6` (deprecation) stays vacuous until a component is first deprecated; that is out of scope here and noted as a standing follow-up.

## 7. Risks and mitigations

| Risk | Mitigation |
|---|---|
| **R6 (scope / burnout)** - five new checks is the largest gate addition since the Gold spine | The phase map is the mitigation: six small individually-green PRs, P0-P3 deliver the visible win early, the monotonic-tier model keeps the toolkit shippable at every phase exit. |
| **Gate red between steps** | Author-before-enforce: each new artifact lands (green) before its check turns on (green on its own dogfood). No phase enforces a check whose artifacts are not already present. |
| **Version line re-collision (v0.9 already taken)** | Sec 2: the additions land as `v0.10`; recorded in SPEC R-STD and IMPL P6. |
| **`docs-frontmatter` (G7) vs the existing `frontmatter-valid` (component check)** | Distinct modules and scopes: `frontmatter-valid` checks component `SKILL.md`/agent frontmatter; `docs-frontmatter` checks `docs/**` page frontmatter. Named and documented to avoid conflation (CHECKS-SPEC). |
| **Generated site output drifting / committed by accident** | The generated `site/src/content/docs/**` is gitignored and rebuilt every build (D2); no committed generated output, so no drift surface. A `.gitignore` entry + a CI check that the tree is not tracked. |
| **`source-doc` / `folder-readme` over-reaching into fixtures** | The "meaningful folder" predicate (ADR 0024 D1) excludes `tests/fixtures/**`, generated dirs, lockfiles, `node_modules`, `dist`, `.astro`, `site/node_modules`. Encoded as an explicit allowlist in the checks. |
| **A new check is unsound (false pass/fail)** | Each check ships with golden + anti fixtures and an adversarial gate before merge, the same discipline that found 5 soundness bugs in the Gold checks at the Phase-5 gate. |
| **House no-dash rule slips into the new prose** | The PreToolUse hook (P0) plus `U10` plus the per-phase adversarial gate. |

## 8. Versioning and rollback

- **Default:** one `v1.1.0` tag at P6 (Standard `v0.10`), then re-pin the `agent-plugins` marketplace entry to the new tag (`version 1.0.0 -> 1.1.0`, new sha, registry `metadata` minor bump) - the same registry mechanics as the launch, now a one-line sha+version update.
- **Optional interim:** after P3, the maintainer may cut `v1.0.1` (or `v1.1.0-beta`) for the visible win; the new checks are not yet enforced, so it remains a clean Gold release at the 25-check spine plus the demonstrative hook.
- **Rollback:** each phase is an independent PR; revert the phase PR if a check proves unsound. Pre-tag, nothing is released. Post-tag, fix forward with `v1.1.1` (tags immutable). The Standard version only advances at P6, so a P1-P5 revert never strands the Standard.

## 9. Definition of Done

- [ ] All six phases merged; `main` green at every phase exit.
- [ ] `node scripts/check.mjs` -> Advanced, 0/0, with the **30-check spine** (`U1-U12 / S1-S8 / G1-G10`); `tier-report` advanced, empty burndown.
- [ ] `npm test` green (each new check has golden + anti fixtures + tests).
- [ ] `docs/tutorials/` non-empty; `QUICKSTART`, `glossary`, `faq`, `troubleshooting`, architecture overview+detailed present; all `docs/**` carry the D3 frontmatter.
- [ ] The docs site builds as a generated Pattern S view of `docs/`; generated output is gitignored; the 14.11 link/route guards pass.
- [ ] `G1` is non-vacuous (the demonstrative hook ships with G1 docs + a G3 eval).
- [ ] `STANDARD.md` is `v0.10` with `U12` + `G7-G10` normative requirements and the `G7`-inclusion reclassification; `library.json` `standard: "0.10"`, version `1.1.0`; generated INDEX/manifest regenerated.
- [ ] The "25-check / G1-G7" wording is corrected to "30-check / G1-G10" across README, AGENTS.md, STATUS, and the docs.
- [ ] (If shipping) `v1.1.0` tagged + released; the marketplace entry re-pinned.

See [`SPEC.md`](./SPEC.md) for the requirement-level acceptance criteria, [`CHECKS-SPEC.md`](./CHECKS-SPEC.md) for the per-check normative specs, and [`IMPL-PLAN.md`](./IMPL-PLAN.md) for the phase-by-phase execution order.
