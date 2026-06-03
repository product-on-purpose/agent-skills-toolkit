// what-it-is:   the AGENTS.md component-map generator
// what-it-does: regenerates the component map in the root AGENTS.md from library.json plus component frontmatter
// why:          keeps the agent navigation entrypoint honest with the actual component set
// used-by:      run by contributors and the cadence
import { loadPlugin } from "../lib/load-plugin.mjs";

/** Returns the generated component-list block AGENTS.md should contain. Wiring into AGENTS.md is Silver. */
export function renderAgentsComponentBlock(ctx) {
  const items = ctx.skills.length
    ? ctx.skills.map((s) => `- ${s.name}`).join("\n")
    : "- (no skills yet)";
  return `<!-- generated:components -->\n${items}\n<!-- /generated:components -->\n`;
}

if (process.argv[1]?.endsWith("sync-agents-md.mjs")) {
  const root = process.argv.find((a, i) => i >= 2 && !a.startsWith("--")) ?? process.cwd();
  process.stdout.write(renderAgentsComponentBlock(loadPlugin(root)));
}
