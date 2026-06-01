# Release notes

Curated, user-facing highlights. For the full technical history see [`CHANGELOG.md`](CHANGELOG.md).

## Unreleased - public Gold-grade preview

The first public preview of `agent-skills-toolkit`. The toolkit self-validates at the Gold (Advanced) tier - it passes its own Bronze, Silver, and Gold checks (G1-G7) in CI, a self-proving example of the Standard it defines.

### What you can do today

- **Grade any plugin** against the Advanced Skill Library Standard and see the exact tier it earns, with a burndown to the next: `node scripts/check.mjs`, or the `askit-evaluate` skill for a richer report.
- **Adopt an existing repo** into a conformant plugin with `askit-migrate` (assess the gap, get a staged Bronze-to-Silver plan, make it gradeable).
- **Build any component** conformant by construction with the `askit-build-*` skills (skills, subagents, commands, MCP, hooks, chain contracts, AGENTS.md, output styles, workflows, docs, samples, statuslines, settings).
- **Start a new plugin** with `askit-init-plugin`, and govern it with `askit-backlog`, `askit-decision`, `askit-release`, and `askit-deprecate`.

### Highlights

- The full v1 builder catalog: 23 skills + 7 Claude-only delegate subagents.
- A 21-check deterministic validation spine (Bronze, Silver, and the first Gold checks) that runs in CI with no model in the loop, so the grade is trustworthy.
- Genuinely cross-agent (Claude Code and Codex), honest about each agent's limits.
- An eval engine: a deterministic chain/hook regression check plus an opt-in behavioral and review layer beside the gate.
- A live documentation site.

This is a Gold-grade `0.x` preview; the formal `v1.0.0` Gold release tag is pending.
