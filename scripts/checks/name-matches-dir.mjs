import { finding, SEVERITY } from "../lib/findings.mjs";
import path from "node:path";

export const meta = { id: "name-matches-dir", tier: "universal", reqId: "U4" };

export function check(ctx) {
  const out = [];
  for (const s of ctx.skills) {
    if (s.parseError || !s.frontmatter || typeof s.frontmatter.name !== "string") continue;
    if (s.frontmatter.name !== s.name) {
      const file = path.relative(ctx.root, s.skillMdPath).split(path.sep).join("/");
      out.push(finding(meta.id, SEVERITY.ERROR, `frontmatter name "${s.frontmatter.name}" must equal the directory name "${s.name}" (Standard sec 3.1).`, { file, reqId: "U4" }));
    }
  }
  return out;
}
