// what-it-is:   the per-target-presence check (S6)
// what-it-does: asserts each convergent component is present in the correct format for every declared target agent
// why:          enforces the Standard requirement S6 deterministically, one module per reqId, so the gate stays model-free
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import path from "node:path";
import { finding, SEVERITY } from "../lib/findings.mjs";
import { fileExists } from "../lib/fs-utils.mjs";

export const meta = { id: "per-target-presence", tier: "convergent", reqId: "S6", since: "0.x" };

/** Each declared agent-target requires its native manifest on disk. */
const MANIFEST_FOR = {
  claude: ".claude-plugin/plugin.json",
  codex: ".codex-plugin/plugin.json",
};

export function check(ctx) {
  const lib = ctx.library?.data;
  if (!lib) return []; // U1 owns missing library.json
  const targets = lib["agent-targets"];
  if (!Array.isArray(targets) || targets.length === 0) return []; // S1 owns missing/invalid agent-targets
  const out = [];
  for (const t of targets) {
    const rel = MANIFEST_FOR[t];
    if (!rel) continue; // S1 owns invalid target names
    if (!fileExists(path.join(ctx.root, rel))) {
      out.push(
        finding(
          meta.id,
          SEVERITY.ERROR,
          `library.json declares agent-target "${t}" but its native manifest ${rel} is missing on disk (REQUIRED at Convergent+; Standard sec 5.1, sec 10.1). Generate it with: node scripts/generators/gen-manifest.mjs . --write --target=all`,
          { file: rel, reqId: meta.reqId }
        )
      );
    }
  }
  // Component-level: if the plugin ships MCP servers (.mcp.json), each declared
  // target's native manifest MUST carry the "mcpServers" pointer (Standard sec 3.9).
  if ((ctx.mcpServers || []).length > 0) {
    const MANIFEST_OBJ = { claude: ctx.claudeManifest, codex: ctx.codexManifest };
    for (const t of targets) {
      const rel = MANIFEST_FOR[t];
      if (!rel || !fileExists(path.join(ctx.root, rel))) continue; // a missing manifest is owned by the plugin-level loop above
      const m = MANIFEST_OBJ[t];
      if (!m || m.mcpServers !== "./.mcp.json") {
        out.push(
          finding(
            meta.id,
            SEVERITY.ERROR,
            `plugin ships MCP servers (.mcp.json) but ${rel} does not carry "mcpServers": "./.mcp.json" for target "${t}" (Standard sec 3.9). Regenerate: node scripts/generators/gen-manifest.mjs . --write --target=all`,
            { file: rel, reqId: meta.reqId }
          )
        );
      }
    }
  }
  return out;
}
