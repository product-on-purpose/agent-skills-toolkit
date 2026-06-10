// what-it-is:   the reference-links check (U6)
// what-it-does: asserts every relative link in a component resolves on disk (the no-dangling-reference discipline)
// why:          enforces the Standard requirement U6 deterministically, one module per reqId, so the gate stays model-free
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import { finding, SEVERITY } from "../lib/findings.mjs";
import { statSync, existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { relPath } from "../lib/fs-utils.mjs";

export const meta = { id: "reference-links", tier: "universal", reqId: "U6", since: "0.x", provenance: "objective" };

const LINK = /\[[^\]]*\]\(([^)]+)\)/g;

// External or non-filesystem schemes (and protocol-relative // and pure #anchors) are never relative
// repo paths, so U6 does not try to resolve them. Mirrors gen-docs-site.mjs SKIP_SCHEME, plus the
// Cowork `computer:` local-artifact scheme and `file:`; both appear in real, well-built official plugins.
const SKIP_SCHEME = /^(https?:|mailto:|tel:|ftp:|ws:|wss:|data:|javascript:|computer:|file:|#|\/\/)/i;

// Strip fenced code blocks before scanning: a markdown link inside a ``` or ~~~ example is an
// illustration, not a live reference (official plugins embed example SKILL.md links in fenced docs).
// Mirrors the fence handling gen-docs-site.mjs / folder-readme.mjs already use in-repo.
function stripFences(text) {
  return (text || "").replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, "");
}

/** Flag every relative markdown link in `text` that does not resolve from `baseDir`. */
function scanLinks(text, baseDir, fileRel, out) {
  let m;
  LINK.lastIndex = 0;
  const scanText = stripFences(text);
  while ((m = LINK.exec(scanText))) {
    let target = m[1].trim();
    if (SKIP_SCHEME.test(target)) continue;
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
