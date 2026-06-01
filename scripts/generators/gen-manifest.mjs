import { loadPlugin } from "../lib/load-plugin.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
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
    commands: (ctx.commands || []).map((c) => ({
      name: c.name,
      path: path.relative(ctx.root, c.file).split(path.sep).join("/"),
      description: c.frontmatter?.description ?? null,
      mapsTo: c.frontmatter?.["maps-to"] ?? null,
    })),
  };
  if ((ctx.mcpServers || []).length) {
    obj.mcpServers = ctx.mcpServers.map((s) => ({
      name: s.name,
      transport: typeof s.def?.url === "string" ? "http" : "stdio",
    }));
  }
  return JSON.stringify(obj, null, 2) + "\n";
}

/** Shared spine fields both native manifests carry, sourced from library.json. */
function nativeSpine(lib) {
  return {
    name: lib.name ?? null,
    version: lib.version ?? null,
    description: lib.description ?? null,
    ...(lib.license ? { license: lib.license } : {}),
    author: lib.author ?? null,
    homepage: lib.homepage ?? null,
    repository: lib.repository ?? null,
    keywords: Array.isArray(lib.keywords) ? lib.keywords : [],
  };
}

/** .claude-plugin/plugin.json (Claude native manifest), generated from library.json. */
export function renderClaudeNativeManifest(ctx) {
  const lib = ctx.library.data ?? {};
  const obj = nativeSpine(lib);
  if (ctx.mcpPath) obj.mcpServers = "./.mcp.json";
  return JSON.stringify(obj, null, 2) + "\n";
}

/** Title-case a kebab name for the Codex marketplace displayName. */
function displayNameFor(lib) {
  if (typeof lib.displayName === "string" && lib.displayName) return lib.displayName;
  return String(lib.name ?? "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * .codex-plugin/plugin.json (Codex native manifest), generated from library.json.
 * Codex format (CLI v0.135, Standard sec 3.2/10.1): shared spine + a "skills"
 * pointer + an "interface" marketplace block. Minimal accepted interface is
 * { displayName, category }; no commands field, no URL fields. displayName/category
 * derive from library.json unless explicitly declared.
 */
export function renderCodexNativeManifest(ctx) {
  const lib = ctx.library.data ?? {};
  const obj = {
    ...nativeSpine(lib),
    skills: "./skills/",
    interface: {
      displayName: displayNameFor(lib),
      category: typeof lib.category === "string" && lib.category ? lib.category : "Engineering",
    },
  };
  if (ctx.mcpPath) obj.mcpServers = "./.mcp.json";
  return JSON.stringify(obj, null, 2) + "\n";
}

const RENDERERS = {
  resolved: { file: "manifest.generated.json", render: renderManifest },
  claude: { file: ".claude-plugin/plugin.json", render: renderClaudeNativeManifest },
  codex: { file: ".codex-plugin/plugin.json", render: renderCodexNativeManifest },
};

if (process.argv[1]?.endsWith("gen-manifest.mjs")) {
  const root = process.argv.find((a, i) => i >= 2 && !a.startsWith("--")) ?? process.cwd();
  const targetArg = process.argv.find((a) => a.startsWith("--target="));
  const target = targetArg ? targetArg.slice("--target=".length) : "all";
  const write = process.argv.includes("--write");
  if (target === "all" && !write) {
    process.stderr.write("--target=all requires --write (it generates multiple files)\n");
    process.exit(2);
  }
  const ctx = loadPlugin(root);

  const keys = target === "all" ? ["resolved", "claude", "codex"] : [target];
  for (const k of keys) {
    const r = RENDERERS[k];
    if (!r) {
      process.stderr.write(`unknown --target "${k}" (use resolved|claude|codex|all)\n`);
      process.exit(2);
    }
    const text = r.render(ctx);
    if (write) {
      const abs = path.join(root, r.file);
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(abs, text);
    } else {
      process.stdout.write(text);
    }
  }
}
