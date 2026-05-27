import { finding, SEVERITY } from "../lib/findings.mjs";
import { existsSync, statSync } from "node:fs";
import path from "node:path";

export const meta = { id: "reference-links", tier: "universal", reqId: "U6" };

const LINK = /\[[^\]]*\]\(([^)]+)\)/g;

export function check(ctx) {
  const out = [];
  for (const s of ctx.skills) {
    const rel = path.relative(ctx.root, s.skillMdPath).split(path.sep).join("/");
    let m;
    LINK.lastIndex = 0;
    while ((m = LINK.exec(s.body || ""))) {
      let target = m[1].trim();
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      target = target.split("#")[0];
      if (!target) continue;
      const resolved = path.resolve(s.dir, target);
      const ok = existsSync(resolved) && (statSync(resolved).isFile() || statSync(resolved).isDirectory());
      if (!ok) out.push(finding(meta.id, SEVERITY.ERROR, `reference link "${m[1]}" does not resolve.`, { file: rel, reqId: "U6" }));
    }
  }
  return out;
}
