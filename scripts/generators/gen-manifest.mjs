import { loadPlugin } from "../lib/load-plugin.mjs";
import { writeFileSync } from "node:fs";
import path from "node:path";

/** manifest.generated.json = the resolved/expanded form of library.json + on-disk skills (Q1.3). */
export function renderManifest(ctx) {
  const lib = ctx.library.data ?? {};
  const obj = {
    name: lib.name ?? null,
    version: lib.version ?? null,
    tier: lib.tier ?? null,
    standard: lib.standard ?? null,
    skills: ctx.skills.map((s) => ({
      name: s.name,
      path: path.relative(ctx.root, s.skillMdPath).split(path.sep).join("/"),
      description: s.frontmatter?.description ?? null,
    })),
  };
  return JSON.stringify(obj, null, 2) + "\n";
}

if (process.argv[1]?.endsWith("gen-manifest.mjs")) {
  const root = process.argv.find((a, i) => i >= 2 && !a.startsWith("--")) ?? process.cwd();
  const ctx = loadPlugin(root);
  const text = renderManifest(ctx);
  if (process.argv.includes("--write")) writeFileSync(path.join(root, "manifest.generated.json"), text);
  else process.stdout.write(text);
}
