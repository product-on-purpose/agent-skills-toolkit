# plan_v1.1.0 - the ADR 0024 documentation depth + discoverability build-out

> The planning packet for the **v1.1.0** milestone: execute [ADR 0024 (documentation depth, discoverability, and the full docs-site build-out)](../../decisions/0024-documentation-depth-and-discoverability.md), take the validation spine from **25 to 30 checks**, and pair in the demonstrative hook that makes Gold check `G1` non-vacuous.
> Created 2026-06-02. Status (2026-06-03): **P0-P2 merged to `main`** (the hook, the Diataxis content + frontmatter, `G7 docs-frontmatter` + Standard v0.10, the generated Pattern S site); **P3-P6 in progress** (per-phase packets below). Source of truth: ADR 0024 (Accepted 2026-06-01). Live status: [`docs/internal/STATUS.md`](../../STATUS.md).

## Read order

1. **[`PROGRAM-PLAN.md`](./PROGRAM-PLAN.md)** - scope, the version reconciliation (v0.9 is taken, so this lands as **v0.10**), the six-phase author-before-enforce map, the demonstrative-hook pairing, risks, and Definition of Done. **Start here.**
2. **[`SPEC.md`](./SPEC.md)** - the requirements with IDs and testable acceptance criteria (`R-CONTENT`, `R-FM`, `R-SITE`, `R-CONV`, `R-CHECK`, `R-G7FIX`, `R-HOOK`, `R-STD`, `R-SEQ`), each traced to an ADR 0024 decision.
3. **[`CHECKS-SPEC.md`](./CHECKS-SPEC.md)** - the per-check normative spec: how each of the five new checks works as a portable zero-model module (incl. why `mermaid-valid` is a structural check, not a full parse), the `G7` renumber, and the demonstrative hook's `G1`/`G3` contract.
4. **[`IMPL-PLAN.md`](./IMPL-PLAN.md)** - the phase-by-phase (P0-P6) execution order, file-by-file, with the cross-phase dependency graph and the marketplace re-pin.

## Per-phase detail packets (P3-P6)

Each remaining phase has a verbose sub-packet (PRD + SPEC + IMPL-PLAN) expanding the relevant `SPEC.md` / `CHECKS-SPEC.md` rows into a from-cold executable plan:

- **[`P3-readme-mermaid/`](./P3-readme-mermaid/)** - README hero rewrite + four mermaid diagrams + `mermaid-valid` (`U12`, Bronze structural check).
- **[`P4-folder-readme/`](./P4-folder-readme/)** - folder-READMEs (inventory-matched) + `folder-readme` (`G8`, Gold).
- **[`P5-source-docblock/`](./P5-source-docblock/)** - four-field source docblocks + `source-doc` (`G9`, Gold).
- **[`P6-docs-presence-release/`](./P6-docs-presence-release/)** - `docs-presence` (`G10`, Gold) + STANDARD v0.10 completion + the `G7`-inclusion renumber close-out + the `1.1.0` release + marketplace re-pin.

(P0-P2 shipped before these packets were written; their detail lives in `IMPL-PLAN.md` and the merged PRs #88-#93.)

## What this delivers

| Theme | Deliverable |
|---|---|
| **Content** | the missing Diataxis set: `docs/tutorials/`, `QUICKSTART`, glossary, faq, troubleshooting, architecture overview+detailed |
| **Discoverability** | a normative frontmatter taxonomy (`title`/`description`/`audience`/`level`/`tags`) across `docs/**`; the docs site becomes a generated Pattern S view of `docs/` |
| **Self-documentation** | folder-READMEs (inventory-matched) + four-field source docblocks, each with a check |
| **Gate depth** | five new checks: `U12 mermaid-valid` (Bronze), `G7 docs-frontmatter`, `G8 folder-readme`, `G9 source-doc`, `G10 docs-presence` (Gold); spine `25 -> 30` |
| **Cleanup** | the `G7 = inclusion` labeling error fixed (unnumbered tier-inclusion statement); "25-check / G1-G7" wording corrected everywhere |
| **Credibility** | the demonstrative hook (P0) makes `G1` non-vacuous |
| **Normative** | `STANDARD.md` -> **v0.10**; `library.json` `standard 0.10`, version `1.1.0` |

## The phase map at a glance (author-before-enforce)

| Phase | Lands | Check turned on |
|---|---|---|
| P0 | demonstrative hook (+ G1 docs + G3 eval) | none (G1 now non-vacuous) |
| P1 | Diataxis content + frontmatter everywhere | none |
| P2 | `docs-frontmatter` + generated Pattern S site | `G7` |
| P3 | README hero + four diagrams | `U12` |
| P4 | folder READMEs | `G8` |
| P5 | source docblocks | `G9` |
| P6 | `docs-presence` + renumber + STANDARD v0.10 + bump to 1.1.0 | `G10` |

P0-P3 are the must-ship visible win; P4-P6 are the careful repo-wide tail. No phase leaves `main` red.

## Key decisions captured here (so the build does not re-litigate them)

- **Version:** lands as Standard **v0.10**, toolkit **v1.1.0** - because v0.9 was already consumed by ADR 0025 (Node baseline). ADR 0024's "v0.9" wording is superseded by this packet (PROGRAM-PLAN sec 2).
- **`mermaid-valid` is a portable structural check** (recognized diagram keyword + balanced delimiters + no tabs), with the full render-time validation handled by the site build (`astro-mermaid`) - deterministic gate plus build-time evidence, no heavy dependency.
- **`docs-frontmatter` (G7) is distinct from the component `frontmatter-valid` check** - different module, scope (`docs/**` pages vs component `SKILL.md`), and tier.
- **The demonstrative hook is this program's addition, not ADR 0024's** - bundled because ADR 0024's own "non-vacuous tier" driver argues for closing the `G1` hole as the Gold surface grows.

## Relationship to other packets

- Supersedes the "v0.9 delta / bump to v0.9" wording in ADR 0024 (version only; every decision stands).
- Sits beside [`plan_v1.0.0/`](../plan_v1.0.0/) (the v1 program) and its [`marketplace-launch/`](../plan_v1.0.0/marketplace-launch/) packet (the shipped v1.0.0 launch). The marketplace re-pin in `IMPL-PLAN.md` reuses that launch's registry mechanics.
- Out of scope (v1.x): the samples/threads build-out, the interactive capability matrix, `starlight-versions`, the shared family Astro preset/workflow, and the Gemini emitter.
