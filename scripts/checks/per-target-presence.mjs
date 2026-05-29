import path from "node:path";
import { finding, SEVERITY } from "../lib/findings.mjs";
import { fileExists } from "../lib/fs-utils.mjs";

export const meta = { id: "per-target-presence", tier: "convergent", reqId: "S6" };

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
  return out;
}
