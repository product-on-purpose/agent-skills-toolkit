---
title: "Universal (Bronze) conformance checks"
description: "Twelve checks (U1-U9, U11-U13) form the portable Bronze floor every plugin must pass."
audience: engineer
level: intermediate
tags: [conformance, bronze, universal, standard, checks]
---

# Reference: Universal (Bronze) conformance checks

The Universal tier is the **portable floor**: every plugin must pass it, on any agentskills.io agent, regardless of house style. Each check fires findings tagged `reqId: "U<n>"`; `tier-report` buckets them into the `universal` tier, and a Universal error fails the gate at **every** tier (Bronze gates Silver and Gold). `U10` (`no-dashes`) was retired from the spine in Standard v0.11 (ADR 0028, a stylistic house preference, not a portability rule), so the Universal set is `U1-U9` and `U11-U13`.

| reqId | Module | What it checks | Standard | Conditional? | Example fix |
|---|---|---|---|---|---|
| U1 | `scripts/checks/library-json.mjs` | `library.json` is present and valid JSON with the identity fields a tool needs (`name`, `version`, `tier`, `standard`) | sec 5, sec 5.1 | no | Add or repair `library.json` (use `askit-build-settings`), then re-run `node scripts/check.mjs`. |
| U2 | `scripts/checks/anatomy.mjs` | The agentskills.io anatomy is present: a root `AGENTS.md` and the standard component folders | sec 3.10 | no | Scaffold the anatomy with `askit-init-plugin` (a root `AGENTS.md` and the `skills/` `agents/` `commands/` folders). |
| U3 | `scripts/checks/frontmatter-valid.mjs` | Every component's frontmatter parses and carries a `name` and a `description` | sec 3.1 | no | Repair the `SKILL.md` frontmatter so it parses and carries a name and a description (`askit-build-skill` improve mode). |
| U4 | `scripts/checks/name-matches-dir.mjs` | A component's declared `name` equals its directory in kebab-case | sec 3.1 | no | Make the component `name` equal its directory in kebab-case (`askit-build-skill` improve mode). |
| U5 | `scripts/checks/description-score.mjs` | Each skill description clears the clarity floor (a concrete action plus a use-when trigger, under the length cap). Warn-only; house provenance (dropped under `--profile plain-plugin`) | sec 8.1 | no (warn) | Rewrite the description to state the action and the use-when trigger with real keywords, under 1024 chars. |
| U6 | `scripts/checks/reference-links.mjs` | Every `references/` link resolves to a file that exists (broken progressive-disclosure links fail) | sec 3.1 | no | Fix or remove the broken `references/` link so every reference resolves. |
| U7 | `scripts/checks/instruction-budget.mjs` | A component body stays under the instruction budget (a longer body risks the model dropping later steps). Warn-only | sec 1 | no (warn) | Extract the longest section into `references/` and point to it, bringing the body under the budget. |
| U8 | `scripts/checks/manifest-drift.mjs` | The committed native manifests (`.claude-plugin/`, `.codex-plugin/plugin.json`) match what `gen-manifest` produces from `library.json` (version drift is an error, the release-tag invariant) | sec 5 | no | Regenerate the native manifests: `node scripts/generators/gen-manifest.mjs . --write --target=all`. |
| U9 | `scripts/checks/version-match.mjs` | `package.json` version equals `library.json` version (the source of truth) | sec 5 | no | Align every component version with `library.json` (`askit-release` version mode). |
| U11 | `scripts/checks/mcp-valid.mjs` | Every MCP server definition is well-formed and commits no inline secret | sec 3.9 | yes (MCP servers present) | Repair the MCP server definition and move any inline secret to an env reference (`askit-build-mcp` improve mode). |
| U12 | `scripts/checks/mermaid-valid.mjs` | Every fenced `mermaid` block is structurally valid (a recognized keyword, balanced brackets, no tabs) so it renders rather than showing a broken box | sec 2.1, sec 8.4 | yes (diagrams present) | Fix the mermaid block so it parses (`askit-build-docs` improve mode). |
| U13 | `scripts/checks/skill-registration.mjs` | Every skill on disk is registered in the plugin's enumerating manifest (`library.json` `components.skills`, else a `.claude-plugin/marketplace.json` `plugins[]` catalog), and every registered skill exists on disk. Distinct from `U8`, which compares generated manifests to `library.json` | sec 2.1 | yes (enumerating manifest present) | Register the unregistered skill in `library.json` `components.skills[]` (or the marketplace `plugins[]` catalog), or remove a registration entry that has no `skills/<name>/` directory. |

**U13 ships under a burndown.** Introduced at Standard v0.12 (ADR 0035), `U13` is a `warn` for the 0.12 minor and becomes a gate-failing `error` at v0.13 (the warn-for-one-minor policy of `STANDARD.md` sec 7.7). It is the first requirement to exercise that policy.

**Provenance.** Most Universal checks are `objective` (a defect true regardless of any standard - a dead link, malformed JSON, manifest drift) or `vendor-cited`. Two are `house` conventions: `U2` (root `AGENTS.md`) and `U5` (description scorer), which `--profile plain-plugin` drops when grading a third-party plugin you do not own. The provenance split is recorded per check in `scripts/lib/registry.mjs`; see [`gate-config.md`](./gate-config.md).

The Silver and Gold reference pages are [`silver-checks.md`](./silver-checks.md) and [`gold-checks.md`](./gold-checks.md). For how the tiers compose and the burndown reads, see [`../explanation/conformance-and-tiers.md`](../explanation/conformance-and-tiers.md).
