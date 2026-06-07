# Release notes

Curated, user-facing highlights. For the full technical history see [`CHANGELOG.md`](CHANGELOG.md).

## 1.3.0 - 2026-06-06

The gate-evolution release. The deterministic gate gets two upgrades that make it legitimate to point at other people's plugins: it now honors the Standard version a plugin pins, and it is configurable like a real linter. No new requirement is added, so the spine stays **29 checks** and the Standard stays **v0.11**, and a plugin with no config grades exactly as before.

### What is new

- **The gate honors your pinned Standard (ADR 0027).** Every check records the Standard version it was introduced at, and the gate reads `library.json.standard`. A plugin pinned to an older Standard is graded against the ruleset it actually adopted: a requirement added after your pinned version shows up as a `warn`, never a build-failing error, until you raise your pin. The Standard can now evolve without silently breaking downstream plugins.
- **Configure how the gate grades, without forking it.** An optional `askit.config.json` lets you turn a rule down or off, grade against a lighter `plain-plugin` profile (the portable, vendor-grounded checks only, instead of the full askit library ladder), or durably waive a known finding with a recorded reason. Every check is tagged by provenance, so the report separates "real issues" (objective defects and vendor-backed rules) from "profile conformance" (askit conventions you may not have opted into). See `docs/reference/gate-config.md`.
- **Tamper-proof published verdicts.** When the toolkit grades and publishes a verdict about someone else's plugin (`--mode published-verdict`), a subject cannot disable an objective check to dodge it: such a finding is surfaced as a warning with a notice, never silently dropped.

### Upgrade

Already installed? Update from the marketplace as usual. Nothing breaks: with no `askit.config.json` and a current pin, your gate result is identical to 1.2.0. The new behavior is opt-in (a config file) or only matters for older pins.

## 1.2.0 - 2026-06-06

A scope correction. The `U10` no-em-dash / no-en-dash check is retired from the conformance spine: it was a stylistic house preference with no portability or vendor basis (agentskills.io, Claude Code, and Codex impose no such rule), so grading other people's plugins against it was outside what a skill and plugin standard should decide. The spine is now **29 checks** (`U1-U9`, `U11-U12`, `S1-S8`, `G1-G10`) and the Standard moves to **v0.11**.

### What changed

- **`U10` (no-dashes) is gone from the gate.** Your plugin is no longer flagged for em-dashes or en-dashes. If you want a dash-free house style for yourself, the toolkit still ships an opt-in `PreToolUse` hook in `hooks/` you can adopt; it is no longer imposed on anything the gate grades.
- **Standard v0.11, a 29-check spine.** This is a relaxation: every plugin that passed before still passes, and nothing newly fails.
- **A refined report sample.** A Command Dashboard v2 evaluation-report template with cleaner typography and wrapping.

### Upgrade

Already installed? Update from the marketplace as usual; nothing breaks, and re-running the gate can only remove findings (the retired `U10`), never add them.

## 1.1.0 - 2026-06-03

The documentation-depth release. `agent-skills-toolkit` now grades a plugin's documentation as rigorously as its code, and the toolkit proves it on itself: a dual-audience Diataxis docs set, a generated docs site, folder-by-folder and file-by-file self-documentation, and **Standard v0.10**.

### What is new

- **Five new checks, a 30-check spine.** The deterministic gate grows from 25 to **30 checks** (`U1-U12` + `S1-S8` + `G1-G10`): `mermaid-valid` (Bronze - every diagram is structurally valid), and at Gold `docs-frontmatter`, `folder-readme` (every folder's README inventory matches its contents), `source-doc` (every source file carries a four-field header docblock), and `docs-presence` (the Diataxis quadrants are non-empty, every decision record has a TL;DR, and the architecture overview links its detail).
- **A real documentation site.** The Astro Starlight site is now a generated view of the repository's public docs, with a curated landing on top - so the docs you read on GitHub and the docs you browse on the web never drift apart.
- **The full Diataxis set.** Tutorials, how-to guides, reference, and explanation, each with a typed audience and level, plus a quickstart, glossary, FAQ, and troubleshooting.
- **A demonstrative hook.** The toolkit ships a portable `PreToolUse` no-dash guard, so the Gold "hooks are documented" check grades a real hook instead of passing on an empty surface.
- **Standard v0.10.** The Standard adds the five new requirements and pins the docs frontmatter taxonomy.

### Upgrade

Already installed? Update from the marketplace as usual; nothing in your plugin breaks. If you run the gate, note the spine is now 30 checks and a Gold plugin is expected to carry the documentation surface above (each new Gold check is conditional - it only binds once you have the thing it grades).

## 1.0.0 - 2026-06-02

The first Gold-tagged release, and the one that makes the toolkit **installable**. `agent-skills-toolkit` is now a plugin you can add from the `product-on-purpose` marketplace, and it self-validates at the Gold (Advanced) tier - it passes its own Bronze, Silver, and Gold checks (G1-G7) in CI, a self-proving example of the Standard it defines.

### Install

```bash
# Add the marketplace once (by repo path)
/plugin marketplace add product-on-purpose/agent-plugins

# Install the toolkit (by marketplace identity)
/plugin install agent-skills-toolkit@product-on-purpose
```

### What you can do

- **Start a plugin** from a single skill (`askit-build-skill`) or from scratch (`askit-init-plugin`), stand up a marketplace (`askit-init-marketplace`), or bring an existing skills repo to the Standard with a staged plan (`askit-migrate`).
- **Grow it** with every component type - subagents, slash commands, MCP servers, hooks, workflows, chain contracts, output styles, status lines, settings - through the `askit-build-*` authoring family, emitted in the right format for each agent.
- **Govern it** over its lifetime with `askit-backlog`, `askit-decision`, `askit-release`, `askit-deprecate`, and `askit-template-manager`.
- **Grade any plugin** against the Advanced Skill Library Standard and see the exact tier it earns with a burndown to the next: `node scripts/check.mjs`, or the `askit-evaluate` skill for a richer report.
- **Level up** by climbing Bronze to Silver to Gold; the tier report names exactly what blocks the next rung.

### Highlights

- The full v1 builder catalog: 23 skills plus 7 Claude-only delegate subagents and 2 commands.
- A 26-check deterministic validation spine (Bronze `U1-U11`, Silver `S1-S8`, Gold `G1-G7`) that runs in CI with no model in the loop, so the grade is trustworthy. Judgment-based evaluation sits beside the gate as opt-in evidence, never inside it.
- Genuinely cross-agent (Claude Code and Codex) from one canonical `library.json`, with the native per-agent manifests generated from it so the two never drift.
- A live documentation site with brand-colored diagrams and a CI link-integrity guard, so no browser-broken link or silently dropped page ever ships.
- Adopts the v0.9 Standard (runner Node baseline `>=22.12.0`) in `library.json`, and ships standardized release CI: a tag push mints this release behind a version-consistency guard.

This release repositions the README around the plugin lifecycle - start, grow, govern, and level up an advanced cross-agent plugin - and makes the tier model scannable. It carries forward everything since `v0.2.0`: the full catalog, the Gold self-conformance gate, and full Astro site conformance.
