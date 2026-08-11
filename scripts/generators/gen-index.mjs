// what-it-is:   the INDEX.md generator
// what-it-does: regenerates the navigational INDEX.md deterministically from library.json plus component frontmatter
// why:          a generated index that is drift-checked (G4) cannot silently disagree with the components it lists.
//               The Bronze/Silver/Gold tier label comes from TIER_NAME in scripts/lib/tier.mjs, the same mapping
//               report-render.mjs and check-readme-version.mjs read, rather than a local copy - round 4 of the
//               pre-release adversarial review found this file had kept its own independent TIER_LABEL even after
//               round 3 centralized the mapping for the other two consumers, so the generated index could have
//               drifted from the reports and the README guard without any test catching it. The values happen to
//               be byte-identical, so importing the shared mapping changed no generated output on this repository.
// used-by:      run by contributors and the per-phase cadence; its output is drift-checked by index-drift (G4)
import { loadPlugin } from "../lib/load-plugin.mjs";
import { writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { normalizeArgPath } from "../lib/fs-utils.mjs";
import { TIER_NAME } from "../lib/tier.mjs";

/**
 * The Manifests and Documentation rows, as data rather than fixed strings.
 *
 * Each row is a list of fragments; a fragment renders only when its `p` exists on disk. A row with
 * no surviving fragment is dropped, and a section with no surviving row loses its heading too.
 *
 * This is existence-filtered rather than hardcoded because these two sections describe the plugin
 * being indexed, not this toolkit. A plugin that ships no `.codex-plugin/`, no `templates/`, or no
 * `docs/internal/STATUS.md` previously received an INDEX.md asserting all three, and because
 * `index-drift` (G4) compares on-disk INDEX against this same generator, the dangling links passed
 * every drift check forever. Reported by critique-skills: seven dangling links out of twenty-four.
 *
 * Fragment text carries no trailing period; a row joins its survivors with "; " and adds one. A
 * plugin that does ship every artifact therefore renders byte-identically to the previous fixed
 * strings, so no existing INDEX.md changes unless it was asserting a path that is not there.
 */
const MANIFEST_ROWS = [
  [{ p: "library.json", t: "[`library.json`](library.json) - authored canonical cross-agent manifest (the source of truth)" }],
  [{ p: ".claude-plugin/plugin.json", t: "[`.claude-plugin/plugin.json`](.claude-plugin/plugin.json) - Claude Code native manifest (generated; do not hand-edit)" }],
  [{ p: ".codex-plugin/plugin.json", t: "[`.codex-plugin/plugin.json`](.codex-plugin/plugin.json) - Codex native manifest (generated; do not hand-edit)" }],
  [{ p: "manifest.generated.json", t: "[`manifest.generated.json`](manifest.generated.json) - agent index (generated)" }],
];

const DOC_ROWS = [
  [{ p: "STANDARD.md", t: "[`STANDARD.md`](STANDARD.md) - the Advanced Skill Library Standard (normative)" }],
  [{ p: "README.md", t: "[`README.md`](README.md) - overview, positioning, quickstart" }],
  [
    { p: "CHANGELOG.md", t: "[`CHANGELOG.md`](CHANGELOG.md) - full technical history" },
    { p: "RELEASE-NOTES.md", t: "[`RELEASE-NOTES.md`](RELEASE-NOTES.md) - curated, user-facing notes" },
  ],
  [{ p: "docs", t: "[`docs/`](docs/) - Diataxis docs (reference, how-to, explanation)" }],
  [
    { p: "docs/internal/decisions", t: "[`docs/internal/decisions/`](docs/internal/decisions/) - ADRs" },
    { p: "docs/internal/backlog", t: "[`docs/internal/backlog/`](docs/internal/backlog/) - backlog" },
    { p: "docs/internal/STATUS.md", t: "[`docs/internal/STATUS.md`](docs/internal/STATUS.md) - live tracker" },
  ],
  [
    { p: "agents/_chain-permitted.yaml", t: "[`agents/_chain-permitted.yaml`](agents/_chain-permitted.yaml) - the chain contract" },
    { p: "templates", t: "[`templates/`](templates/) - scaffolder templates" },
  ],
  [{ p: "scripts", t: "[`scripts/`](scripts/) - the Node validation spine (conformance checks, generators, gate, evaluate)" }],
];

/** Render the rows whose paths exist under root, dropping empty rows entirely. */
function renderRows(root, rows) {
  const out = [];
  for (const row of rows) {
    const parts = row.filter((f) => root && existsSync(path.join(root, f.p))).map((f) => f.t);
    if (parts.length) out.push(`- ${parts.join("; ")}.`);
  }
  return out;
}

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
  const label = TIER_NAME[tier];
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

  const manifestLines = renderRows(ctx.root, MANIFEST_ROWS);
  if (manifestLines.length) {
    lines.push("## Manifests");
    lines.push("");
    lines.push(...manifestLines);
    lines.push("");
  }

  const docLines = renderRows(ctx.root, DOC_ROWS);
  if (docLines.length) {
    lines.push("## Documentation and governance");
    lines.push("");
    lines.push(...docLines);
  }

  // Trim a trailing blank left when the docs section is absent, so the file still ends with
  // exactly one newline rather than a blank line.
  while (lines.length && lines[lines.length - 1] === "") lines.pop();

  return lines.join("\n") + "\n";
}

if (process.argv[1]?.endsWith("gen-index.mjs")) {
  // Normalized through normalizeArgPath so a Windows backslash root is not silently misread (the
  // historical defect: docs/how-to/troubleshoot-the-gate.md).
  const rawRoot = process.argv.find((a, i) => i >= 2 && !a.startsWith("--"));
  const root = rawRoot !== undefined ? normalizeArgPath(rawRoot) : process.cwd();
  const ctx = loadPlugin(root);
  const text = renderIndex(ctx);
  if (process.argv.includes("--write")) writeFileSync(path.join(root, "INDEX.md"), text);
  else process.stdout.write(text);
}
