# Release notes

Curated, user-facing highlights. For the full technical history see [`CHANGELOG.md`](CHANGELOG.md).

## 1.0.0 - 2026-06-02

The first Gold-tagged release, and the one that makes the toolkit **installable**. `agent-skills-toolkit` is now a plugin you can add from the `product-on-purpose` marketplace, and it self-validates at the Gold (Advanced) tier - it passes its own Bronze, Silver, and Gold checks (G1-G6) in CI, a self-proving example of the Standard it defines.

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
- A 25-check deterministic validation spine (Bronze `U1-U11`, Silver `S1-S8`, Gold `G1-G6`) that runs in CI with no model in the loop, so the grade is trustworthy. Judgment-based evaluation sits beside the gate as opt-in evidence, never inside it.
- Genuinely cross-agent (Claude Code and Codex) from one canonical `library.json`, with the native per-agent manifests generated from it so the two never drift.
- A live documentation site with brand-colored diagrams and a CI link-integrity guard, so no browser-broken link or silently dropped page ever ships.
- Adopts the v0.9 Standard (runner Node baseline `>=22.12.0`) in `library.json`, and ships standardized release CI: a tag push mints this release behind a version-consistency guard.

This release repositions the README around the plugin lifecycle - start, grow, govern, and level up an advanced cross-agent plugin - and makes the tier model scannable. It carries forward everything since `v0.2.0`: the full catalog, the Gold self-conformance gate, and full Astro site conformance.
