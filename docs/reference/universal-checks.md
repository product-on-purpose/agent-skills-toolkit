---
title: "Universal (Bronze) conformance checks"
description: "Sixteen checks (U1-U9, U11-U17) form the portable Bronze floor every plugin must pass."
audience: engineer
level: intermediate
tags: [conformance, bronze, universal, standard, checks]
---

# Reference: Universal (Bronze) conformance checks

The Universal tier is the **portable floor**: every plugin must pass it, on any agentskills.io agent, regardless of house style. Each check fires findings tagged `reqId: "U<n>"`; `tier-report` buckets them into the `universal` tier, and a Universal error fails the gate at **every** tier (Bronze gates Silver and Gold). `U10` (`no-dashes`) was retired from the spine in Standard v0.11 (ADR 0028, a stylistic house preference, not a portability rule), so the Universal set is `U1-U9` and `U11-U17`: **sixteen checks**.

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
| U14 | `scripts/checks/agent-restricted-fields.mjs` | A plugin-shipped agent declares none of `hooks`, `mcpServers` or `permissionMode`. Claude Code refuses these on plugin-shipped agents **for security reasons**, in the vendor's own words, so an author who writes one has configured something the runtime will not honour and gets no signal it was refused | sec 3.3 | yes (agents present) | Remove the refused field from the agent's frontmatter; move a hook or MCP server to the plugin level where the runtime reads it |
| U15 | `scripts/checks/agents-dir-registerable.mjs` | Every `.md` under `agents/` is a registered subagent. A probe established that Claude Code registers **every** file it finds there, including `README` and `_README`, so a file excluded from the plugin's own registration is still live and escapes every check that reads the registration list | sec 3.3 | yes (agents present) | Register the file in `library.json` `components.subagents`, or move it out of `agents/` if it is not a subagent |
| U16 | `scripts/checks/metadata-placement.mjs` | A sec 3.7 governance key sits inside `metadata`, not at the frontmatter top level where nothing reads it. The frontmatter **vocabulary itself is open** (44.9 percent of 2342 measured skills carry a key the Standard does not name); only PLACEMENT is checked | sec 3.7 | no | Move the governance key under `metadata:` |
| U17 | `scripts/checks/catalogue-manifest-shape.mjs` | A present `.claude-plugin/marketplace.json` is readable by exactly one scope: it parses, it carries a `plugins` array, and its entries do not MIX skill sources with plugin sources. A mixed catalogue is claimed entirely by the first reader, so its other half is examined by nothing | sec 12 | yes (catalogue manifest present) | Split the catalogue into one manifest per kind, or repair the JSON |

**Three of these arrived under a burndown, and all three have now graduated.** `STANDARD.md` sec 7.7 ships a new or tightened requirement as a `warn` for one minor before it becomes a gate-failing `error`, so no plugin takes a new failure without raising its own `standard` pin. `U13` was introduced at 0.12 (ADR 0035) and gates from 0.13. `U17` was introduced at 0.14 (ADR 0052) and **gates from 0.15**, alongside the workflow half of the components mirror (`S3`, ADR 0047), which is a Convergent check rather than a Universal one. `U14`, `U15` and `U16` carry a `since` and no cap, so they are a `warn` for any plugin pinned below their introduction and an `error` once it re-pins. **Nothing here moves red-ward without a pin change**, and a plugin carrying no `standard` pin at all has declared no floor, so every requirement applies to it immediately.

**Provenance.** Most Universal checks are `objective` (a defect true regardless of any standard - a dead link, malformed JSON, manifest drift) or `vendor-cited`. Two are `house` conventions: `U2` (root `AGENTS.md`) and `U5` (description scorer), which `--profile plain-plugin` drops when grading a third-party plugin you do not own. The provenance split is recorded per check in `scripts/lib/registry.mjs`; see [`gate-config.md`](./gate-config.md).

### Known limitation: `U5` currently assumes English

`U5` decides whether a description says *when to use* the skill by matching English trigger phrasing. Measured against a 349-skill French library, that pattern matched **0 of 346** descriptions, while **341 of them carried an explicit French trigger clause**. Because that signal is worth 0.35 of a 1.0 score against a 0.7 threshold, **a description written in a language the pattern does not know cannot score above 0.65, and therefore cannot pass, however good it is.**

Read the scope precisely, because it is narrower than "the toolkit is English-only":

- It is **one check of thirty**. Every other check is language-neutral: a link resolves or it does not, a diagram parses or it does not, a manifest matches disk or it does not.
- `U5` is **`house` provenance**, so **`--profile plain-plugin` drops it entirely**. Grading a library you do not own, in the honest third-party mode, never applies this check at all.
- It is **warn-only**. It has never blocked a tier.

So it bites in one situation: a library that adopts this Standard, declares a tier, and writes its descriptions in a language other than English. If that is you, suppress `U5` in `askit.config.json` (see [`gate-config.md`](./gate-config.md)) until this is fixed, and read its warnings as noise rather than signal.

The fix is deliberately not "add more languages to the pattern", which would move the same cliff one language over. It is tracked as an ADR-gated backlog item requiring a design answer: language detection, a pluggable lexicon, or a language-independent structural signal.

One related constraint that is **not** ours: the agentskills.io specification requires a skill `name` to be lowercase ASCII with hyphens, which independently limits non-Latin-script naming. That rule is upstream's, and `askit-standards-watch` now tracks the file that states it.

The Silver and Gold reference pages are [`silver-checks.md`](./silver-checks.md) and [`gold-checks.md`](./gold-checks.md). For how the tiers compose and the burndown reads, see [`../explanation/conformance-and-tiers.md`](../explanation/conformance-and-tiers.md).
