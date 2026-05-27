import { loadPlugin } from "../lib/load-plugin.mjs";
import { writeFileSync } from "node:fs";
import path from "node:path";

export function renderIndex(ctx) {
  const lines = [`# INDEX - ${ctx.library.data?.name ?? "plugin"}`, "", "## Skills", ""];
  if (ctx.skills.length === 0) lines.push("- none yet");
  for (const s of ctx.skills) lines.push(`- **${s.name}** - ${s.frontmatter?.description ?? ""}`);
  return lines.join("\n") + "\n";
}

if (process.argv[1]?.endsWith("gen-index.mjs")) {
  const root = process.argv.find((a, i) => i >= 2 && !a.startsWith("--")) ?? process.cwd();
  const ctx = loadPlugin(root);
  const text = renderIndex(ctx);
  if (process.argv.includes("--write")) writeFileSync(path.join(root, "INDEX.md"), text);
  else process.stdout.write(text);
}
