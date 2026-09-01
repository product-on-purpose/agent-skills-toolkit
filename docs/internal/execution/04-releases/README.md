---
title: "askit uplift program - release plans"
description: "The four release plans of the uplift program, v1.7.0 through v1.10.0"
status: draft
last-updated: "2026-07-06"
---

# Release plans

One plan per release of the askit uplift program. Each carries its feature specs, acceptance criteria, TDD notes, PR slicing, and exit gate. Ordering and gates live in [../03-execution-plan.md](../03-execution-plan.md); the cut runbook is [../06-release-choreography.md](../06-release-choreography.md).

**What this delivers and why it matters (plain language).** Each of the four releases has its own complete plan here. A reader can open any one of them and see, in its opening section, what that release delivers and why it matters in plain terms, before the engineering detail begins. Because each release stands alone, these plans double as the program's stopping points: finish any one of them and the product is complete and better than before.

## Inventory

- [R1-v1.7.0-trust-and-craft.md](R1-v1.7.0-trust-and-craft.md) - H1 (hygiene batch), SP1 (builder craft pass), F2 (eval-run pipeline).
- [R2-v1.8.0-deep-builders-measured-advisory.md](R2-v1.8.0-deep-builders-measured-advisory.md) - SP2 (deepen the builders), F3 (advisory quality measurement), F5 (authoring token measurements), corpus batch 3, evals/ fixtures.
- [R3-v1.9.0-marketplace-scope.md](R3-v1.9.0-marketplace-scope.md) - marketplace-scope evaluation (the headline), SP3 (coherent-plugin authoring journey).
- [R4-v1.10.0-manage-and-studio.md](R4-v1.10.0-manage-and-studio.md) - SP4 (Manage gaps), the GUI read-only studio slice, optional riders E4 (SARIF output) and E9 (provenance contract), both SHIPPED in v1.11.0, 2026-08-11.


## Renumbered 2026-07-27

**R3 is now v1.10.0 and R4 is now v1.11.0.** Maintainer-approved work outside this program (`askit-standards-watch` plus the ADR implementation-sites convention) shipped as **v1.9.0**, because adding a skill is a MINOR under semver and the version is a promise to anyone installing from the marketplace. Renumbering an internal plan is cheaper than misnumbering a public release.

Release CONTENT is unchanged. Only the version labels move. Where this packet's prose says "v1.9.0 marketplace scope" or "v1.10.0 manage and studio", read v1.10.0 and v1.11.0 respectively.
