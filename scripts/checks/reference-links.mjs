import { finding, SEVERITY } from "../lib/findings.mjs";
import { statSync } from "node:fs";
import path from "node:path";
import { relPath } from "../lib/fs-utils.mjs";

export const meta = { id: "reference-links", tier: "universal", reqId: "U6" };

const LINK = /\[[^\]]*\]\(([^)]+)\)/g;

export function check(ctx) {
  const out = [];
  for (const s of ctx.skills) {
    const rel = relPath(ctx.root, s.skillMdPath);
    let m;
    LINK.lastIndex = 0;
    while ((m = LINK.exec(s.body || ""))) {
      let target = m[1].trim();
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      target = target.split("#")[0];
      if (!target) continue;
      const resolved = path.resolve(s.dir, target);
      let ok = false;
      try {
        const st = statSync(resolved);
        ok = st.isFile() || st.isDirectory();
      } catch {
        ok = false;
      }
      if (!ok) out.push(finding(meta.id, SEVERITY.ERROR, `reference link "${m[1]}" does not resolve.`, { file: rel, reqId: "U6" }));
    }
  }
  return out;
}
