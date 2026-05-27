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
