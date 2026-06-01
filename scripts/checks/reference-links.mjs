import { finding, SEVERITY } from "../lib/findings.mjs";
import { statSync, existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { relPath } from "../lib/fs-utils.mjs";

export const meta = { id: "reference-links", tier: "universal", reqId: "U6" };

const LINK = /\[[^\]]*\]\(([^)]+)\)/g;

/** Flag every relative markdown link in `text` that does not resolve from `baseDir`. */
function scanLinks(text, baseDir, fileRel, out) {
  let m;
  LINK.lastIndex = 0;
  while ((m = LINK.exec(text || ""))) {
    let target = m[1].trim();
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    target = target.split("#")[0];
    if (!target) continue;
    const resolved = path.resolve(baseDir, target);
    let ok = false;
    try {
      const st = statSync(resolved);
      ok = st.isFile() || st.isDirectory();
    } catch {
      ok = false;
    }
    if (!ok) out.push(finding(meta.id, SEVERITY.ERROR, `reference link "${m[1]}" does not resolve.`, { file: fileRel, reqId: "U6" }));
  }
}

export function check(ctx) {
  const out = [];
  for (const s of ctx.skills) {
    // The SKILL.md body (links resolved relative to the skill directory).
    scanLinks(s.body || "", s.dir, relPath(ctx.root, s.skillMdPath), out);
    // The skill's references/*.md (links resolved relative to each file's own directory), so link
    // rot in progressive-disclosure docs fails the gate too, not only in the SKILL.md body. A
    // references/ file sits one directory deeper than SKILL.md, which is exactly where a copied
    // "../../" prefix silently breaks; this closes that class.
    const refDir = path.join(s.dir, "references");
    if (existsSync(refDir)) {
      let entries = [];
      try { entries = readdirSync(refDir); } catch { entries = []; }
      for (const name of entries) {
        if (!name.endsWith(".md")) continue;
        const file = path.join(refDir, name);
        let text;
        try {
          if (!statSync(file).isFile()) continue;
          text = readFileSync(file, "utf8");
        } catch {
          continue;
        }
        scanLinks(text, refDir, relPath(ctx.root, file), out);
      }
    }
  }
  return out;
}
