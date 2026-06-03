// what-it-is:   the INDEX.md generator
// what-it-does: regenerates the navigational INDEX.md deterministically from library.json plus component frontmatter
// why:          a generated index that is drift-checked (G4) cannot silently disagree with the components it lists
// used-by:      run by contributors and the per-phase cadence; its output is drift-checked by index-drift (G4)
import { loadPlugin } from "../lib/load-plugin.mjs";
import { writeFileSync } from "node:fs";
import path from "node:path";

const TIER_LABEL = { universal: "Bronze", convergent: "Silver", advanced: "Gold" };

const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
// Collapse internal whitespace/newlines so a multi-line frontmatter description renders as one
// stable single-line bullet (keeps the generated INDEX well-formed and the drift check stable).
const desc = (c) => {
  const d = c.frontmatter && c.frontmatter.description;
  return typeof d === "string" ? d.replace(/\s+/g, " ").trim() : "";
};

/**
 * Render INDEX.md, the human navigation map, deterministically from library.json + component
 * frontmatter. INDEX is a generated artifact at Gold (G4): edit the source (frontmatter,
 * library.json, or this generator), not the output. Editorial narrative lives in README.md
 * (overview) and AGENTS.md (agent guidance), not here. Components are name-sorted and rendered
 * as links to their on-disk paths so the map stays click-through; the output is stable for the
 * drift check.
 */
export function renderIndex(ctx) {
  const data = ctx.library?.data ?? {};
  const name = data.name ?? "plugin";
  const tier = data.tier;
  const label = TIER_LABEL[tier];
  const skills = [...(ctx.skills ?? [])].sort(byName);
  const subagents = [...(ctx.subagents ?? [])].sort(byName);
  const commands = [...(ctx.commands ?? [])].sort(byName);

  const lines = [];
  lines.push(`# INDEX - ${name}`);
  lines.push("");
  lines.push("> Generated from `library.json` + component frontmatter by `gen-index` and");
  lines.push("> drift-checked (G4). Edit the source, not this file. Overview and positioning are");
  lines.push("> in [`README.md`](README.md); agent guidance is in [`AGENTS.md`](AGENTS.md).");
  lines.push("");
  const tierBits = [];
  if (label) tierBits.push(`**Tier:** ${label} (${tier}).`);
  if (data.standard) tierBits.push(`Standard ${data.standard}.`);
  if (data.version) tierBits.push(`Version ${data.version}.`);
  tierBits.push("Self-validating: `node scripts/check.mjs`.");
  lines.push(tierBits.join(" "));
  lines.push("");

  lines.push("## Components");
  lines.push("");
  lines.push(`### Skills (${skills.length})`);
  lines.push("");
  if (skills.length === 0) lines.push("- none yet");
  for (const s of skills) lines.push(`- [\`${s.name}\`](skills/${s.name}/) - ${desc(s)}`);
  lines.push("");

  lines.push(`### Subagents (${subagents.length}, Claude-only)`);
  lines.push("");
  if (subagents.length === 0) lines.push("- none");
  for (const s of subagents) lines.push(`- [\`${s.name}\`](agents/${s.name}.md) - ${desc(s)}`);
  lines.push("");

  lines.push(`### Commands (${commands.length})`);
  lines.push("");
  if (commands.length === 0) lines.push("- none");
  for (const c of commands) lines.push(`- [\`/${c.name}\`](commands/${c.name}.md) - ${desc(c)}`);
  lines.push("");

  lines.push("## Manifests");
  lines.push("");
  lines.push("- [`library.json`](library.json) - authored canonical cross-agent manifest (the source of truth).");
  lines.push("- [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json) - Claude Code native manifest (generated; do not hand-edit).");
  lines.push("- [`.codex-plugin/plugin.json`](.codex-plugin/plugin.json) - Codex native manifest (generated; do not hand-edit).");
  lines.push("- [`manifest.generated.json`](manifest.generated.json) - agent index (generated).");
  lines.push("");

  lines.push("## Documentation and governance");
  lines.push("");
  lines.push("- [`STANDARD.md`](STANDARD.md) - the Advanced Skill Library Standard (normative).");
  lines.push("- [`README.md`](README.md) - overview, positioning, quickstart.");
  lines.push("- [`CHANGELOG.md`](CHANGELOG.md) - full technical history; [`RELEASE-NOTES.md`](RELEASE-NOTES.md) - curated, user-facing notes.");
  lines.push("- [`docs/`](docs/) - Diataxis docs (reference, how-to, explanation).");
  lines.push("- [`docs/internal/decisions/`](docs/internal/decisions/) - ADRs; [`docs/internal/backlog/`](docs/internal/backlog/) - backlog; [`docs/internal/STATUS.md`](docs/internal/STATUS.md) - live tracker.");
  lines.push("- [`agents/_chain-permitted.yaml`](agents/_chain-permitted.yaml) - the chain contract; [`templates/`](templates/) - scaffolder templates.");
  lines.push("- [`scripts/`](scripts/) - the Node validation spine (conformance checks, generators, gate, evaluate).");

  return lines.join("\n") + "\n";
}

if (process.argv[1]?.endsWith("gen-index.mjs")) {
  const root = process.argv.find((a, i) => i >= 2 && !a.startsWith("--")) ?? process.cwd();
  const ctx = loadPlugin(root);
  const text = renderIndex(ctx);
  if (process.argv.includes("--write")) writeFileSync(path.join(root, "INDEX.md"), text);
  else process.stdout.write(text);
}
